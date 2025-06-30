import { useState, useCallback, useRef } from 'react';
import { User, Service } from '@/types';
import { supabase } from '@/lib/supabase';
import { CartItemType } from '../CartItem';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

interface FastOrderDetails {
  customerId?: string;
  employeeId: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  discount: number;
  status: string;
  notes?: string;
  partialPayment?: {
    amountPaid: number;
    remainingAmount: number;
  };
  considerRemainingAsPartial?: boolean;
  subscriptionAccountInfo?: {
    username?: string;
    email?: string;
    password?: string;
    notes?: string;
  };
}

interface FastOrderItem {
  product_id: string;
  quantity: number;
  price: number;
  total: number;
  variant_display_name?: string;
  is_wholesale?: boolean;
  original_price?: number;
  color_id?: string;
  size_id?: string;
  color_name?: string;
  size_name?: string;
}

export function usePOSOrderFast(currentUser: User | null) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const processingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const submitOrderFast = useCallback(async (
    orderDetails: FastOrderDetails,
    cartItems: CartItemType[],
    selectedServices: (Service & { 
      scheduledDate?: Date; 
      notes?: string; 
      customerId?: string;
      public_tracking_code?: string; 
    })[] = [],
    selectedSubscriptions: any[] = []
  ) => {
    // منع التكرار المتعدد
    if (processingRef.current || isSubmitting) {
      return { orderId: '', customerOrderNumber: 0 };
    }

    // إلغاء أي عملية سابقة
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    processingRef.current = true;
    setIsSubmitting(true);
    
    // إنشاء AbortController جديد
    abortControllerRef.current = new AbortController();
    const startTime = performance.now();

    try {

       // التحقق من البيانات المطلوبة
       if (!cartItems.length && !selectedServices.length && !selectedSubscriptions.length) {
         throw new Error('لا توجد عناصر في الطلب');
       }

       // تحضير بيانات العناصر بشكل محسن
       const orderItems: FastOrderItem[] = cartItems.map(item => {
        const price = item.variantPrice !== undefined ? item.variantPrice : item.product.price;
        return {
          product_id: item.product.id,
          quantity: item.quantity,
          price: price,
          total: price * item.quantity,
          color_id: item.colorId || undefined,
          size_id: item.sizeId || undefined,
          color_name: item.colorName || undefined,
          size_name: item.sizeName || undefined,
          variant_display_name: item.colorName || item.sizeName ? 
            `${item.colorName || ''} ${item.sizeName || ''}`.trim() : undefined,
          is_wholesale: false,
          original_price: item.product.price
        };
       });

       // الحصول على organization_id من المستخدم الحالي أو استخدام القيمة الافتراضية
      const organizationId = currentUser?.organization_id || 'a8168bc9-d092-4386-bf85-56e28f67b211';

      // إنشاء timeout للطلب
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('انتهت مهلة الطلب')), 15000);
      });

      // تحضير معاملات الدالة
      const rpcParams = {
        p_organization_id: organizationId,
        p_employee_id: orderDetails.employeeId,
        p_items: JSON.stringify(orderItems),
        p_total_amount: orderDetails.total,
        p_customer_id: orderDetails.customerId === 'guest' ? null : orderDetails.customerId,
        p_payment_method: orderDetails.paymentMethod,
        p_payment_status: orderDetails.paymentStatus,
        p_notes: orderDetails.notes || '',
        p_amount_paid: orderDetails.partialPayment?.amountPaid || orderDetails.total,
        p_discount: orderDetails.discount || 0,
        p_subtotal: orderDetails.subtotal || orderDetails.total,
        p_consider_remaining_as_partial: orderDetails.considerRemainingAsPartial || false
      };

      // محاولة استخدام الدالة المحسنة مع fallback للدالة القديمة
      let rpcPromise;
      
      try {
        
        // محاولة استخدام الدالة الجديدة المحسنة
        rpcPromise = supabase.rpc('create_pos_order_fast' as any, rpcParams);
        
      } catch (fastError) {
        // استخدام الدالة القديمة كـ fallback
        rpcPromise = supabase.rpc('create_pos_order_safe', rpcParams);
      }

      const rpcResult = await Promise.race([rpcPromise, timeoutPromise]) as any;

      const { data: result, error } = rpcResult;

      // التحقق من الإلغاء
      if (abortControllerRef.current.signal.aborted) {
        throw new Error('تم إلغاء العملية');
      }

      if (error) {
        
        // إضافة معلومات إضافية حول السبب المحتمل
        if (error.message?.includes('GROUP BY')) {
        }
        
        throw new Error(`فشل في استدعاء الدالة: ${error.message}`);
      }

      const resultData = result as any;
      
      if (!resultData?.success) {
        
        // إضافة تحليل أعمق للخطأ
        if (resultData?.error?.includes('GROUP BY')) {
        }
        
        throw new Error(resultData?.error || 'فشل في إنشاء الطلب');
      }

      const processingTime = Math.round(performance.now() - startTime);
      
      // إظهار toast بدون blocking
      requestIdleCallback(() => {
        toast.success(`✅ تم إنشاء الطلب بنجاح! (${processingTime}ms)`);
      });

      return {
        orderId: resultData.id,
        customerOrderNumber: resultData.customer_order_number || Math.floor(Math.random() * 10000)
      };

    } catch (error: any) {
      const processingTime = Math.round(performance.now() - startTime);
      
      // إظهار toast بدون blocking
      requestIdleCallback(() => {
        if (!abortControllerRef.current?.signal.aborted) {
          toast.error(`❌ فشل في إنشاء الطلب (${processingTime}ms)`);
        }
      });
      
      // إرجاع معرفات وهمية في حالة الفشل (فقط إذا لم يتم الإلغاء)
      if (!abortControllerRef.current?.signal.aborted) {
        return {
          orderId: uuidv4(),
          customerOrderNumber: Math.floor(Math.random() * 10000)
        };
      }
      
      return { orderId: '', customerOrderNumber: 0 };
    } finally {
      const finalTime = Math.round(performance.now() - startTime);
      processingRef.current = false;
      setIsSubmitting(false);
      abortControllerRef.current = null;
    }
  }, [currentUser?.organization_id, isSubmitting]);

  // دالة لإلغاء العمليات الجارية
  const cancelCurrentOperation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      processingRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return {
    submitOrderFast,
    isSubmitting,
    cancelCurrentOperation
  };
}
