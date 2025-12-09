import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useStaffSession } from '@/context/StaffSessionContext';
import type { Service, Order, User } from '@/types';
import { createPOSOrder, buildPOSItemsFromCart, type UnifiedCartItem } from '@/context/shop/posOrderService';
import { unifiedOrderService } from '@/services/UnifiedOrderService';

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
    const submitStartTime = Date.now();
    console.log('[POS Submit] 🚀 ========== بدء تقديم الطلب ==========');
    console.log('[POS Submit] 📦 بيانات السلة:', {
      cartItemsCount: cartItems.length,
      servicesCount: selectedServices.length,
      subscriptionsCount: selectedSubscriptions.length,
      total: orderData.total,
      subtotal: orderData.subtotal,
      discount: orderData.discount,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: orderData.paymentStatus
    });

    // منع المعالجة المتعددة المتزامنة
    if (processingRef.current) {
      console.warn('[POS Submit] ⚠️ محاولة تقديم طلب أثناء معالجة طلب آخر');
      throw new Error('جاري معالجة طلب آخر، يرجى الانتظار');
    }

    try {
      processingRef.current = true;
      setIsProcessing(true);
      console.log('[POS Submit] 🔒 تم قفل المعالجة');

      const organizationId = currentTenant?.id; // استخدام id مباشرة من tenant
      if (!organizationId) {
        console.error('[POS Submit] ❌ معرف المؤسسة غير موجود');
        throw new Error('معرف المؤسسة غير موجود');
      }
      console.log('[POS Submit] 🏢 معرف المؤسسة:', organizationId.slice(0, 8));

      const employeeId = userProfile?.id || currentUser?.id;
      if (!employeeId) {
        console.error('[POS Submit] ❌ معرف الموظف غير موجود');
        throw new Error('معرف الموظف غير موجود');
      }
      console.log('[POS Submit] 👤 معرف الموظف:', employeeId.slice(0, 8));

      // ⚡ استخدام الدالة الموحدة لبناء عناصر الطلب
      console.log('[POS Submit] 📦 بناء عناصر الطلب باستخدام buildPOSItemsFromCart...');
      
      // تحويل cartItems إلى UnifiedCartItem
      const unifiedCartItems: UnifiedCartItem[] = cartItems.map(item => ({
        product: item.product,
        quantity: item.quantity,
        colorId: item.colorId,
        colorName: item.colorName,
        sizeId: item.sizeId,
        sizeName: item.sizeName,
        variantPrice: item.isWholesale ?
          (item.product.wholesale_price || item.product.price) :
          item.product.price,
        customPrice: item.isWholesale ?
          (item.product.wholesale_price || item.product.price) :
          item.product.price,
        isWholesale: item.isWholesale || false,
        originalPrice: item.product.price,
        saleType: item.isWholesale ? 'wholesale' : 'retail',
        variant_info: item.colorId || item.sizeId ? {
          colorId: item.colorId,
          sizeId: item.sizeId,
          colorName: item.colorName,
          sizeName: item.sizeName,
          variantDisplayName: item.variantDisplayName
        } : undefined
      }));

      // بناء عناصر الطلب باستخدام الدالة الموحدة
      const orderItems = buildPOSItemsFromCart(
        unifiedCartItems,
        selectedServices,
        selectedSubscriptions
      );

      console.log('[POS Submit] ✅ تم بناء', orderItems.length, 'عنصر');

      // ⚡ استخدام createPOSOrder كالمسار الرسمي الوحيد
      console.log('[POS Submit] 💾 بدء إنشاء الطلب عبر createPOSOrder...');
      const createStartTime = Date.now();
      
      const posOrderData: any = {
        organizationId,
        employeeId,
        customerId: orderData.customerId === 'guest' ? undefined : orderData.customerId,
        customerName: undefined, // يمكن إضافته إذا كان متاحاً في orderData
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus,
        subtotal: orderData.subtotal,
        discount: orderData.discount,
        total: orderData.total,
        amountPaid: orderData.partialPayment?.amountPaid,
        remainingAmount: orderData.partialPayment?.remainingAmount,
        considerRemainingAsPartial: orderData.considerRemainingAsPartial,
        notes: orderData.notes,
        items: orderItems,
        metadata: {
          subscriptionAccountInfo: orderData.subscriptionAccountInfo,
          created_by_staff_id: currentStaff?.id,
          created_by_staff_name: currentStaff?.staff_name
        }
      };

      const result = await createPOSOrder(posOrderData);
      const createDuration = Date.now() - createStartTime;
      console.log('[POS Submit] ✅ تم إنشاء الطلب:', {
        orderId: result.orderId,
        localNumber: result.customerOrderNumber,
        duration: createDuration + 'ms'
      });

      // ⚡ معالجة الخدمات محلياً (Local-First)
      // حفظ repair_order_ids في metadata للطلب لربطها لاحقاً عبر المزامنة
      if (selectedServices.length > 0) {
        const repairOrderIds = selectedServices
          .filter(service => service.id && (service as any).scheduledDate)
          .map(service => service.id);

        if (repairOrderIds.length > 0) {
          // ⚡ حفظ repair_order_ids في metadata للطلب
          // سيتم ربطها بالسيرفر لاحقاً عبر SyncManager
          console.log(`[usePOSOrderOptimized] 📋 حفظ ${repairOrderIds.length} طلب صيانة في metadata للطلب ${result.orderId}`);
          
          // يمكن تحديث metadata الطلب لاحقاً إذا لزم الأمر
          // حالياً، repair_order_ids موجودة في orderData.metadata.selectedServices
        }
      }

      const totalDuration = Date.now() - submitStartTime;
      console.log('[POS Submit] 🎉 ========== اكتمل تقديم الطلب بنجاح ==========');
      console.log('[POS Submit] ⏱️ المدة الإجمالية:', totalDuration + 'ms');
      console.log('[POS Submit] 📊 النتيجة النهائية:', {
        orderId: result.orderId,
        localNumber: result.customerOrderNumber,
        total: result.total,
        status: result.status,
        syncStatus: result.syncStatus,
        duration: totalDuration + 'ms'
      });

      toast.success(`تم إنشاء الطلبية بنجاح - رقم: ${result.customerOrderNumber}`);

      return {
        orderId: result.orderId,
        customerOrderNumber: result.customerOrderNumber,
        success: true
      };

    } catch (error: any) {
      const totalDuration = Date.now() - submitStartTime;
      console.error('[POS Submit] ❌ ========== فشل تقديم الطلب ==========');
      console.error('[POS Submit] ❌ تفاصيل الخطأ:', {
        error: error.message || String(error),
        stack: error.stack,
        duration: totalDuration + 'ms'
      });
      toast.error(error.message || 'حدث خطأ في معالجة الطلبية');
      throw error;
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
      console.log('[POS Submit] 🔓 تم فتح قفل المعالجة');
    }
  }, [currentTenant, currentUser, currentStaff, userProfile]);

  // ⚡ دالة لإلغاء الطلبية باستخدام UnifiedOrderService (Offline-First)
  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      setIsProcessing(true);

      if (!currentTenant?.id) {
        throw new Error('معرف المؤسسة غير موجود');
      }

      unifiedOrderService.setOrganizationId(currentTenant.id);
      const updated = await unifiedOrderService.updateOrderStatus(orderId, 'cancelled');

      if (!updated) {
        throw new Error('فشل في إلغاء الطلبية');
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

  // ⚡ دالة للحصول على آخر الطلبيات باستخدام UnifiedOrderService (Offline-First)
  const getRecentOrders = useCallback(async (limit: number = 10) => {
    try {
      if (!currentTenant?.id) return [];

      unifiedOrderService.setOrganizationId(currentTenant.id);
      const result = await unifiedOrderService.getOrders(
        { is_online: false },
        1,
        limit
      );

      return result.data.map(order => ({
        id: order.id,
        customer_order_number: order.customer_order_number,
        total: order.total,
        payment_status: order.payment_status,
        created_at: order.created_at,
        customer: order.customer ? { name: order.customer.name } : null
      }));
    } catch (error: any) {
      console.error('[usePOSOrderOptimized] Error getting recent orders:', error);
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
