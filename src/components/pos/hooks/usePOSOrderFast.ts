import { useState, useCallback, useRef, useEffect } from 'react';
import { User, Service, OrderItem } from '@/types';
import { CartItemType } from '../CartItem';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { dispatchAppEvent } from '@/lib/events/eventManager';
import { createPOSOrder, POSOrderData, initializePOSOfflineSync, buildPOSItemsFromCart, type UnifiedCartItem } from '@/context/shop/posOrderService';
import { unifiedOrderService } from '@/services/UnifiedOrderService';

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

  useEffect(() => {
    initializePOSOfflineSync();
  }, []);

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

       // التحقق من البيانات المطلوبة
       if (!cartItems.length && !selectedServices.length && !selectedSubscriptions.length) {
         throw new Error('لا توجد عناصر في الطلب');
       }

       const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

       if (isOffline) {
         if (!cartItems.length) {
           throw new Error('لا توجد منتجات يمكن حفظها في وضع الأوفلاين');
         }

         // ⚡ استخدام الدالة الموحدة لبناء عناصر الطلب
         const unifiedCartItems: UnifiedCartItem[] = cartItems.map(item => ({
           product: item.product,
           quantity: item.quantity,
           colorId: item.colorId,
           colorName: item.colorName,
           colorCode: item.colorCode,
           sizeId: item.sizeId,
           sizeName: item.sizeName,
           variantPrice: item.variantPrice,
           variantImage: item.variantImage,
           customPrice: item.variantPrice !== undefined ? item.variantPrice : item.product.price,
           isWholesale: false,
           originalPrice: item.product.price,
           variant_info: {
             colorId: item.colorId,
             colorName: item.colorName,
             colorCode: item.colorCode,
             sizeId: item.sizeId,
             sizeName: item.sizeName,
             variantImage: item.variantImage
           }
         }));

         const offlineItems = buildPOSItemsFromCart(
           unifiedCartItems,
           selectedServices,
           selectedSubscriptions
         );

         const offlineOrderData: POSOrderData = {
           organizationId,
           employeeId: orderDetails.employeeId,
           items: offlineItems,
           total: orderDetails.total,
           customerId: orderDetails.customerId,
           customerName: orderDetails.customerId === 'guest' ? 'زائر' : undefined,
           paymentMethod: orderDetails.paymentMethod,
           paymentStatus: orderDetails.paymentStatus,
           notes: orderDetails.notes || '',
           amountPaid: orderDetails.partialPayment?.amountPaid || orderDetails.total,
           discount: orderDetails.discount || 0,
           subtotal: orderDetails.subtotal || orderDetails.total,
           remainingAmount: orderDetails.partialPayment?.remainingAmount || 0,
           considerRemainingAsPartial: orderDetails.considerRemainingAsPartial || false,
           metadata: selectedSubscriptions.length > 0
             ? { subscriptions: selectedSubscriptions }
             : undefined
         };

         const offlineResult = await createPOSOrder(offlineOrderData);
         const processingTime = Math.round(performance.now() - startTime);

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

         requestIdleCallback(() => {
           toast.success(`💾 تم حفظ الطلب للأوفلاين وسيتم مزامنته تلقائياً! (${processingTime}ms)`);
         });

         dispatchAppEvent('pos-order-created', { orderId: offlineResult.orderId });

         return {
           orderId: offlineResult.orderId,
           customerOrderNumber: offlineResult.customerOrderNumber || Math.floor(Math.random() * 10000)
         };
       }

       // ⚡ استخدام UnifiedOrderService لإنشاء الطلب (Offline-First)
       unifiedOrderService.setOrganizationId(organizationId);

       // تحضير عناصر الطلب
       const unifiedCartItems: UnifiedCartItem[] = cartItems.map(item => ({
         product: item.product,
         quantity: item.quantity,
         colorId: item.colorId,
         colorName: item.colorName,
         colorCode: item.colorCode,
         sizeId: item.sizeId,
         sizeName: item.sizeName,
         variantPrice: item.variantPrice,
         variantImage: item.variantImage,
         customPrice: item.variantPrice !== undefined ? item.variantPrice : item.product.price,
         isWholesale: false,
         originalPrice: item.product.price,
         variant_info: {
           colorId: item.colorId,
           colorName: item.colorName,
           colorCode: item.colorCode,
           sizeId: item.sizeId,
           sizeName: item.sizeName,
           variantImage: item.variantImage
         }
       }));

       const orderItems = buildPOSItemsFromCart(
         unifiedCartItems,
         selectedServices,
         selectedSubscriptions
       );

       // ⚡ إنشاء الطلب باستخدام UnifiedOrderService (Offline-First)
       const orderInput = {
         customer_id: orderDetails.customerId === 'guest' ? undefined : orderDetails.customerId,
         items: orderItems.map(item => ({
           product_id: item.product_id,
           quantity: item.quantity,
           unit_price: item.unit_price,
           product_name: item.product_name || item.name || 'منتج',
           color_id: item.color_id,
           size_id: item.size_id,
           color_name: item.color_name,
           size_name: item.size_name,
           sale_type: item.is_wholesale ? 'wholesale' : 'retail' as 'retail' | 'wholesale' | 'partial_wholesale'
         })),
         payment_method: orderDetails.paymentMethod as 'cash' | 'card' | 'transfer' | 'mixed' | 'credit',
         amount_paid: orderDetails.partialPayment?.amountPaid || orderDetails.total,
         discount: orderDetails.discount || 0,
         tax: 0,
         shipping_cost: 0,
         notes: orderDetails.notes || '',
         staff_id: orderDetails.employeeId,
         staff_name: currentUser?.name || 'موظف',
         pos_order_type: 'retail' as 'retail' | 'wholesale' | 'partial_wholesale'
       };

       const createdOrder = await unifiedOrderService.createPOSOrder(orderInput);

       // التحقق من الإلغاء
       if (abortControllerRef.current.signal.aborted) {
         throw new Error('تم إلغاء العملية');
       }

       const resultData = createdOrder;

        const processingTime = Math.round(performance.now() - startTime);

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
          
          // ⚡ تحديث فوري من PowerSync (لا حاجة لـ Supabase)
          // المخزون يتم تحديثه تلقائياً في createPOSOrder
        } catch (inventoryUpdateError) {
          // لا نرمي خطأ هنا لأن الطلب نجح فعلياً
        }
        
        // إظهار toast بدون blocking
        requestIdleCallback(() => {
          toast.success(`✅ تم إنشاء الطلب وتحديث المخزون بنجاح! (${processingTime}ms)`);
        });

        // ✅ تحديث قائمة الطلبيات فوراً
        dispatchAppEvent('pos-order-created', { orderId: resultData.id });

        return {
          orderId: resultData.id,
          customerOrderNumber: resultData.customer_order_number || Math.floor(Math.random() * 10000)
        };
      }

      // إذا لم تكن هناك منتجات ووصلنا هنا، فهذا يعني أن كل شيء تم بنجاح
      return {
        orderId: '',
        customerOrderNumber: 0
      };

    } catch (error: any) {
      const processingTime = Math.round(performance.now() - startTime);

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
