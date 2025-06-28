import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import type { CartItem, Service, Order, User } from '@/types';

interface OrderData {
  customerId?: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  paymentStatus: string;
  notes: string;
  isOnline: boolean;
  employeeId: string;
  partialPayment?: {
    amountPaid: number;
    remainingAmount: number;
  };
  considerRemainingAsPartial?: boolean;
  subscriptionAccountInfo?: {
    username: string;
    email: string;
    password: string;
    notes: string;
  };
}

interface OrderResult {
  orderId: string;
  customerOrderNumber: number;
  success: boolean;
}

export function usePOSOrderOptimized() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { currentUser } = useAuth();
  const { currentTenant } = useTenant();
  const processingRef = useRef(false);

  const submitOrderOptimized = useCallback(async (
    cartItems: CartItem[],
    selectedServices: Service[],
    selectedSubscriptions: any[],
    orderData: OrderData
  ): Promise<OrderResult> => {
    // منع المعالجة المتعددة المتزامنة
    if (processingRef.current) {
      throw new Error('جاري معالجة طلب آخر، يرجى الانتظار');
    }

    try {
      processingRef.current = true;
      setIsProcessing(true);

      if (!currentTenant?.organization?.id) {
        throw new Error('معرف المؤسسة غير موجود');
      }

      if (!currentUser?.id) {
        throw new Error('معرف الموظف غير موجود');
      }

      // تحضير بيانات عناصر السلة بتنسيق محسن
      const orderItems = cartItems.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.isWholesale ? 
          (item.product.wholesale_price || item.product.price) : 
          item.product.price,
        total_price: item.total,
        original_price: item.product.price,
        is_wholesale: item.isWholesale || false,
        variant_info: item.colorId || item.sizeId ? {
          color_id: item.colorId,
          size_id: item.sizeId,
          color_name: item.colorName,
          size_name: item.sizeName
        } : {},
        color_id: item.colorId || '',
        size_id: item.sizeId || '',
        color_name: item.colorName || '',
        size_name: item.sizeName || '',
        variant_display_name: item.variantDisplayName || ''
      }));

      // معالجة الخدمات (إذا وجدت)
      if (selectedServices.length > 0) {
        const serviceItems = selectedServices.map(service => ({
          product_id: service.id,
          quantity: 1,
          unit_price: service.price,
          total_price: service.price,
          original_price: service.price,
          is_wholesale: false,
          variant_info: {
            service_type: 'repair',
            scheduled_date: service.scheduledDate?.toISOString(),
            notes: service.notes,
            tracking_code: service.public_tracking_code
          },
          color_id: '',
          size_id: '',
          color_name: '',
          size_name: '',
          variant_display_name: ''
        }));
        orderItems.push(...serviceItems);
      }

      // معالجة الاشتراكات (إذا وجدت)
      if (selectedSubscriptions.length > 0) {
        const subscriptionItems = selectedSubscriptions.map(subscription => ({
          product_id: subscription.id,
          quantity: 1,
          unit_price: subscription.price,
          total_price: subscription.price,
          original_price: subscription.price,
          is_wholesale: false,
          variant_info: {
            subscription_type: 'digital',
            duration: subscription.duration,
            features: subscription.features
          },
          color_id: '',
          size_id: '',
          color_name: '',
          size_name: '',
          variant_display_name: ''
        }));
        orderItems.push(...subscriptionItems);
      }

      // استدعاء الدالة المحسنة
      const { data: result, error } = await supabase.rpc('create_pos_order_optimized', {
        p_organization_id: currentTenant.organization.id,
        p_customer_id: orderData.customerId === 'guest' ? null : orderData.customerId,
        p_employee_id: currentUser.id,
        p_items: orderItems,
        p_payment_method: orderData.paymentMethod,
        p_payment_status: orderData.paymentStatus,
        p_total_amount: orderData.total,
        p_subtotal: orderData.subtotal,
        p_discount: orderData.discount,
        p_tax: 0, // الضريبة محسوبة في الإجمالي
        p_amount_paid: orderData.partialPayment?.amountPaid,
        p_remaining_amount: orderData.partialPayment?.remainingAmount,
        p_consider_remaining_as_partial: orderData.considerRemainingAsPartial,
        p_notes: orderData.notes,
        p_subscription_account_info: orderData.subscriptionAccountInfo || null
      });

      if (error) {
        throw new Error(`فشل في إنشاء الطلبية: ${error.message}`);
      }

      if (!result?.success) {
        throw new Error(result?.error || 'فشل في إنشاء الطلبية');
      }

      // معالجة الخدمات منفصلة (تحديث حالتها)
      if (selectedServices.length > 0) {
        const servicePromises = selectedServices.map(async (service) => {
          if (service.id && service.scheduledDate) {
            const { error: serviceError } = await supabase
              .from('repair_orders')
              .update({
                status: 'confirmed',
                order_id: result.orderId,
                updated_at: new Date().toISOString()
              })
              .eq('id', service.id);
              
            if (serviceError) {
            }
          }
        });

        // تنفيذ تحديثات الخدمات بالتوازي
        await Promise.allSettled(servicePromises);
      }

      toast.success(`تم إنشاء الطلبية بنجاح - رقم: ${result.customerOrderNumber}`);

      return {
        orderId: result.orderId,
        customerOrderNumber: result.customerOrderNumber,
        success: true
      };

    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في معالجة الطلبية');
      throw error;
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [currentTenant, currentUser]);

  // دالة لإلغاء الطلبية (للطوارئ)
  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      setIsProcessing(true);

      const { data, error } = await supabase.rpc('cancel_pos_order', {
        p_order_id: orderId,
        p_organization_id: currentTenant?.organization?.id
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success('تم إلغاء الطلبية بنجاح');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'فشل في إلغاء الطلبية');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [currentTenant]);

  // دالة للحصول على آخر الطلبيات (للتحقق السريع)
  const getRecentOrders = useCallback(async (limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          customer_order_number,
          total,
          payment_status,
          created_at,
          customer:users(name)
        `)
        .eq('organization_id', currentTenant?.organization?.id)
        .eq('is_online', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      return [];
    }
  }, [currentTenant]);

  return {
    submitOrderOptimized,
    cancelOrder,
    getRecentOrders,
    isProcessing
  };
}
