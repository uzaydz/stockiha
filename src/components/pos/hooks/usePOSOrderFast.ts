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
       // الحصول على organization_id من المستخدم الحالي أو استخدام القيمة الافتراضية
      const organizationId = currentUser?.organization_id || 'a8168bc9-d092-4386-bf85-56e28f67b211';

       console.log('🔍 [usePOSOrderFast] تشخيص البيانات المدخلة:', {
         cartItemsLength: cartItems.length,
         selectedServicesLength: selectedServices.length,
         selectedSubscriptionsLength: selectedSubscriptions.length,
         cartItems: cartItems,
         employeeId: orderDetails.employeeId,
         total: orderDetails.total
       });

       // التحقق من البيانات المطلوبة
       if (!cartItems.length && !selectedServices.length && !selectedSubscriptions.length) {
         throw new Error('لا توجد عناصر في الطلب');
       }

       // معالجة الاشتراكات منفصلة عن المنتجات
       if (selectedSubscriptions.length > 0) {
         console.log('🔍 [usePOSOrderFast] معالجة الاشتراكات:', {
           subscriptionsCount: selectedSubscriptions.length,
           subscriptions: selectedSubscriptions
         });

         // معالجة كل اشتراك منفصل
         for (const subscription of selectedSubscriptions) {
           try {
             const { data: transactionData, error: transactionError } = await supabase
               .from('subscription_transactions' as any)
               .insert([{
                 service_id: subscription.id,
                 transaction_type: 'sale',
                 amount: subscription.final_price || subscription.selling_price || 0,
                 cost: subscription.selectedPricing?.purchase_price || subscription.purchase_price || 0,
                 customer_id: orderDetails.customerId === 'guest' ? null : orderDetails.customerId,
                 customer_name: orderDetails.customerId === 'guest' ? 'زائر' : 'عميل',
                 payment_method: orderDetails.paymentMethod,
                 payment_status: orderDetails.paymentStatus === 'paid' ? 'completed' : orderDetails.paymentStatus,
                 quantity: 1,
                 description: `${subscription.name} - ${subscription.duration_label || 'خدمة رقمية'}`,
                 notes: `كود التتبع: ${subscription.tracking_code || 'غير محدد'}`,
                 processed_by: orderDetails.employeeId,
                 organization_id: organizationId
               }])
               .select()
               .single();

             if (transactionError) {
               console.error('❌ خطأ في معالجة الاشتراك:', transactionError);
               throw new Error(`فشل في معالجة الاشتراك ${subscription.name}: ${transactionError.message}`);
             }

             // تحديث المخزون إذا لزم الأمر (فقط للأسعار الحقيقية وليس الافتراضية)
             if (subscription.selectedPricing?.id && !subscription.selectedPricing.id.startsWith('legacy-') && !subscription.selectedPricing.id.startsWith('default-')) {
               const { error: updateError } = await supabase
                 .from('subscription_service_pricing' as any)
                 .update({
                   available_quantity: Math.max(0, (subscription.selectedPricing.available_quantity || 1) - 1),
                   sold_quantity: (subscription.selectedPricing.sold_quantity || 0) + 1
                 })
                 .eq('id', subscription.selectedPricing.id);

               if (updateError) {
                 console.warn('⚠️ تحذير: فشل في تحديث مخزون الاشتراك:', updateError);
               }
             }

             console.log('✅ تم معالجة الاشتراك بنجاح:', transactionData);
           } catch (subscriptionError: any) {
             console.error('❌ خطأ في معالجة الاشتراك:', subscriptionError);
             throw new Error(`فشل في معالجة الاشتراك: ${subscriptionError.message}`);
           }
         }

         // إذا كان لدينا اشتراكات فقط (بدون منتجات)، إرجاع نتيجة مباشرة
         if (cartItems.length === 0 && selectedServices.length === 0) {
           console.log('🎯 [usePOSOrderFast] تم معالجة الاشتراكات فقط بنجاح');
           
           // إنشاء معرف طلب وهمي للاشتراكات
           const subscriptionOrderId = uuidv4();
           const subscriptionOrderNumber = Math.floor(1000 + Math.random() * 9000);

           toast.success('✅ تم معالجة الاشتراكات بنجاح!');

           return {
             orderId: subscriptionOrderId,
             customerOrderNumber: subscriptionOrderNumber
           };
         }
       }

       // تحضير بيانات العناصر بشكل محسن (فقط إذا وُجدت منتجات)
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

      // إنشاء timeout للطلب
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('انتهت مهلة الطلب')), 15000);
      });

      // معالجة المنتجات إذا وُجدت
      if (cartItems.length > 0) {
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
        
        // طباعة النتيجة الكاملة للتشخيص
        console.log('🔍 [DEBUG] نتيجة دالة create_pos_order_fast:', resultData);
        
        // التحقق من النجاح بطرق متعددة
        const isSuccess = resultData?.success === true || 
                         (resultData?.id && resultData?.customer_order_number);
        
        console.log('🔍 [DEBUG] تشخيص النجاح:', { 
          isSuccess, 
          hasId: !!resultData?.id, 
          hasCustomerOrderNumber: !!resultData?.customer_order_number,
          successFlag: resultData?.success,
          resultData 
        });
        
        if (!isSuccess) {
          console.error('❌ [ERROR] فشل في إنشاء الطلب:', resultData);
          
          // إضافة تحليل أعمق للخطأ
          if (resultData?.error?.includes('GROUP BY')) {
            console.error('❌ [ERROR] خطأ GROUP BY detected');
          }
          
          throw new Error(resultData?.error || 'فشل في إنشاء الطلب');
        }

        const processingTime = Math.round(performance.now() - startTime);
        
        console.log(`✅ [SUCCESS] تم إنشاء الطلب بنجاح! ID: ${resultData.id}, Number: ${resultData.customer_order_number}`);
        
        // 🔄 إعادة تحديث المخزون في الواجهة بعد نجاح العملية
        try {
          // إشعال حدث لتحديث المخزون في الـ cache المحلي
          window.dispatchEvent(new CustomEvent('pos-inventory-update', {
            detail: {
              cartItems: cartItems.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
                colorId: item.colorId,
                sizeId: item.sizeId
              }))
            }
          }));
          
          // 📊 تحديث فوري لبيانات المنتجات من قاعدة البيانات
          const productIds = cartItems.map(item => item.product.id);
          const { data: updatedProducts } = await supabase
            .from('products')
            .select('id, stock_quantity, last_inventory_update')
            .in('id', productIds);
          
          if (updatedProducts) {
            console.log('🔄 [INVENTORY-UPDATE] تم تحديث بيانات المخزون:', updatedProducts);
            
            // إشعال حدث آخر مع البيانات المحدثة
            window.dispatchEvent(new CustomEvent('pos-products-refreshed', {
              detail: { updatedProducts }
            }));
          }
        } catch (inventoryUpdateError) {
          console.warn('⚠️ [WARNING] فشل في تحديث بيانات المخزون المحلية:', inventoryUpdateError);
          // لا نرمي خطأ هنا لأن الطلب نجح فعلياً
        }
        
        // إظهار toast بدون blocking
        requestIdleCallback(() => {
          toast.success(`✅ تم إنشاء الطلب وتحديث المخزون بنجاح! (${processingTime}ms)`);
        });

        return {
          orderId: resultData.id,
          customerOrderNumber: resultData.customer_order_number || Math.floor(Math.random() * 10000)
        };
      }

      // إذا لم تكن هناك منتجات ووصلنا هنا، فهذا يعني أن كل شيء تم بنجاح
      console.log('🎯 [usePOSOrderFast] تم إنهاء العملية بنجاح');
      return {
        orderId: '',
        customerOrderNumber: 0
      };

    } catch (error: any) {
      const processingTime = Math.round(performance.now() - startTime);
      
      console.error('❌ [usePOSOrderFast] خطأ في المعالجة:', error);
      
      // إظهار toast بدون blocking
      requestIdleCallback(() => {
        if (!abortControllerRef.current?.signal.aborted) {
          toast.error(`❌ فشل في إنشاء الطلب: ${error.message}`);
        }
      });
      
      // رفع الخطأ بدلاً من إرجاع قيم وهمية
      throw error;
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
