import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useStaffSession } from '@/context/StaffSessionContext';
import type { Service, Order, User } from '@/types';

// تعريف CartItem محلياً إذا لم يكن موجوداً في types
interface CartItem {
  product: any;
  quantity: number;
  total: number;
  isWholesale?: boolean;
  colorId?: string;
  sizeId?: string;
  colorName?: string;
  sizeName?: string;
  variantDisplayName?: string;
  [key: string]: any;
}

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
  const { user: currentUser, userProfile } = useAuth(); // تصحيح: user بدلاً من currentUser
  const { tenant: currentTenant } = useTenant(); // تصحيح: tenant بدلاً من currentTenant
  const { currentStaff } = useStaffSession();
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

      const organizationId = currentTenant?.id; // استخدام id مباشرة من tenant
      if (!organizationId) {
        throw new Error('معرف المؤسسة غير موجود');
      }

      const employeeId = userProfile?.id || currentUser?.id;
      if (!employeeId) {
        throw new Error('معرف الموظف غير موجود');
      }

      // تحضير بيانات عناصر السلة بتنسيق OfflinePOSOrderItemPayload
      const itemsPayload: any[] = cartItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.isWholesale ?
          (item.product.wholesale_price || item.product.price) :
          item.product.price,
        totalPrice: item.total,
        originalPrice: item.product.price,
        isWholesale: item.isWholesale || false,
        colorId: item.colorId || null,
        sizeId: item.sizeId || null,
        colorName: item.colorName || null,
        sizeName: item.sizeName || null,
        variant_info: item.colorId || item.sizeId ? {
          color_id: item.colorId,
          size_id: item.sizeId,
          color_name: item.colorName,
          size_name: item.sizeName,
          variant_display_name: item.variantDisplayName
        } : null
      }));

      // معالجة الخدمات
      if (selectedServices.length > 0) {
        const serviceItems = selectedServices.map(service => ({
          productId: service.id,
          productName: service.name || 'خدمة',
          quantity: 1,
          unitPrice: service.price,
          totalPrice: service.price,
          originalPrice: service.price,
          isWholesale: false,
          variant_info: {
            service_type: 'repair',
            scheduled_date: (service as any).scheduledDate?.toISOString(),
            notes: (service as any).notes,
            tracking_code: (service as any).public_tracking_code,
            is_service: true
          }
        }));
        itemsPayload.push(...serviceItems);
      }

      // معالجة الاشتراكات
      if (selectedSubscriptions.length > 0) {
        const subscriptionItems = selectedSubscriptions.map(subscription => ({
          productId: subscription.id,
          productName: subscription.name || 'اشتراك',
          quantity: 1,
          unitPrice: subscription.price,
          totalPrice: subscription.price,
          originalPrice: subscription.price,
          isWholesale: false,
          variant_info: {
            subscription_type: 'digital',
            duration: subscription.duration,
            features: subscription.features,
            is_subscription: true
          }
        }));
        itemsPayload.push(...subscriptionItems);
      }

      // استيراد createLocalPOSOrder ديناميكياً لتجنب مشاكل الدورة (Circular Dependency) إذا وجدت
      const { createLocalPOSOrder } = await import('@/api/localPosOrderService');

      // إنشاء الطلب محلياً (Offline-First)
      const localOrder = await createLocalPOSOrder({
        organizationId,
        customerId: orderData.customerId === 'guest' ? undefined : orderData.customerId,
        customerName: undefined, // يمكن إضافته إذا كان متاحاً في orderData
        employeeId,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus as any,
        subtotal: orderData.subtotal,
        discount: orderData.discount,
        total: orderData.total,
        amountPaid: orderData.partialPayment?.amountPaid,
        remainingAmount: orderData.partialPayment?.remainingAmount,
        considerRemainingAsPartial: orderData.considerRemainingAsPartial,
        notes: orderData.notes,
        metadata: {
          subscriptionAccountInfo: orderData.subscriptionAccountInfo,
          created_by_staff_id: currentStaff?.id,
          created_by_staff_name: currentStaff?.staff_name
        },
        items: itemsPayload // تمرير العناصر هنا أيضاً لتلبية متطلبات النوع
      } as any, itemsPayload);

      // معالجة الخدمات منفصلة (تحديث حالتها) - محاولة فقط
      if (selectedServices.length > 0) {
        // نترك هذه العملية في الخلفية ولا ننتظرها
        (async () => {
          try {
            const servicePromises = selectedServices.map(async (service) => {
              if (service.id && (service as any).scheduledDate) {
                await supabase
                  .from('repair_orders')
                  .update({
                    status: 'confirmed',
                    // order_id: localOrder.id, // TODO: نحتاج ربطها بالطلب عند المزامنة
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', service.id);
              }
            });
            await Promise.allSettled(servicePromises);
          } catch (e) {
            console.warn('Failed to update repair orders status in background', e);
          }
        })();
      }

      toast.success(`تم إنشاء الطلبية بنجاح - رقم: ${localOrder.local_order_number}`);

      return {
        orderId: localOrder.id,
        customerOrderNumber: localOrder.local_order_number,
        success: true
      };

    } catch (error: any) {
      console.error('Submit Order Error:', error);
      toast.error(error.message || 'حدث خطأ في معالجة الطلبية');
      throw error;
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  }, [currentTenant, currentUser, currentStaff, userProfile]);

  // دالة لإلغاء الطلبية (للطوارئ)
  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      setIsProcessing(true);

      const { data, error } = await supabase.rpc('cancel_pos_order', {
        p_order_id: orderId,
        p_organization_id: currentTenant?.id
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
        .eq('organization_id', currentTenant?.id)
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
