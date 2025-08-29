import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase-client';
import { Product, Order, User as AppUser, Service, OrderItem, ServiceBooking } from '@/types';
import { logOrderSubmit, logStockUpdate, logProductAdd } from '@/utils/inventoryLogger';
import { createPOSOrder, POSOrderData } from '@/context/shop/posOrderService';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { v4 as uuidv4 } from 'uuid';

// واجهة مخصصة لبيانات الطلب من POS
interface POSOrderDetails extends Partial<Order> {
  discountType?: 'percentage' | 'fixed';
  amountPaid?: number;
  remainingAmount?: number;
  considerRemainingAsPartial?: boolean;
}

export interface PartialPayment {
  amountPaid: number;
  remainingAmount: number;
  method: string;
}

export interface POSOrderFormData {
  customerId?: string;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'partial';
  notes?: string;
  partialPayment?: PartialPayment;
  considerRemainingAsPartial?: boolean;
}

// Interface لعنصر السلة (متوافق مع usePOSCart)
interface CartItem {
  product: Product;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
  customPrice?: number;
  variant_info?: {
    colorId?: string;
    colorName?: string;
    colorCode?: string;
    sizeId?: string;
    sizeName?: string;
    variantImage?: string;
  };
}

interface UsePOSOrderProps {
  cartItems: CartItem[];
  selectedServices: Service[];
  selectedSubscriptions: any[];
  currentUser: AppUser | null;
  addOrder: (order: Order) => Promise<Order | null>;
  users: AppUser[];
  orders: Order[];
  products: Product[];
  updateProductStockInCache: (productId: string, colorId: string | null, sizeId: string | null, quantityChange: number) => void;
  refreshProducts: () => Promise<void>;
  refreshPOSData: () => Promise<void>;
  clearCart: () => void;
}

export const usePOSOrder = ({
  cartItems,
  selectedServices,
  selectedSubscriptions,
  currentUser,
  addOrder,
  users,
  orders,
  products,
  updateProductStockInCache,
  refreshProducts,
  refreshPOSData,
  clearCart
}: UsePOSOrderProps) => {
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // الحصول على المنتجات المفضلة
  const favoriteProducts = (products || []).filter(product => 
    (product as any).isFavorite || (product as any).is_favorite
  );

  const handleOpenOrder = useCallback((order: Order) => {
    setCurrentOrder(order);
  }, []);

  const submitOrder = useCallback(async (orderDetails: POSOrderDetails): Promise<{orderId: string, customerOrderNumber: number}> => {
    console.log('🚨 [usePOSOrder] submitOrder استُدعي مع orderDetails:', {
      total: orderDetails.total,
      discount: orderDetails.discount,
      subtotal: orderDetails.subtotal,
      partialPayment: orderDetails.partialPayment,
      paymentStatus: orderDetails.paymentStatus,
      orderDetailsType: typeof orderDetails,
      orderDetailsKeys: Object.keys(orderDetails),
      fullOrderDetails: orderDetails
    });

    if (!user) {
      throw new Error('المستخدم غير مسجل الدخول');
    }

    if (!currentOrganization?.id) {
      throw new Error('معرف المؤسسة مطلوب');
    }

    if (cartItems.length === 0 && selectedServices.length === 0 && selectedSubscriptions.length === 0) {
      throw new Error('لا يمكن إنشاء طلب فارغ');
    }

    setIsSubmittingOrder(true);

    try {
      // معالجة الاشتراكات منفصلة أولاً (مثل POS القديم)
      if (selectedSubscriptions.length > 0) {

        // معالجة كل اشتراك منفصل
        for (const subscription of selectedSubscriptions) {
          try {
            const { data: transactionData, error: transactionError } = await supabase
              .from('subscription_transactions' as any)
              .insert([{
                service_id: subscription.id,
                service_name: subscription.name,
                provider: subscription.provider || 'غير محدد',
                logo_url: subscription.logo_url || null,
                transaction_type: 'sale',
                amount: subscription.final_price || subscription.selling_price || 0,
                cost: subscription.selectedPricing?.purchase_price || subscription.purchase_price || 0,
                profit: (subscription.final_price || subscription.selling_price || 0) - (subscription.selectedPricing?.purchase_price || subscription.purchase_price || 0),
                customer_id: orderDetails.customerId === 'guest' ? null : orderDetails.customerId,
                customer_name: orderDetails.customerId === 'guest' ? 'زائر' : 'عميل',
                payment_method: orderDetails.paymentMethod || 'cash',
                payment_status: orderDetails.paymentStatus === 'paid' ? 'completed' : orderDetails.paymentStatus,
                quantity: 1,
                description: `${subscription.name} - ${subscription.duration_label || 'خدمة رقمية'}`,
                notes: `كود التتبع: ${subscription.tracking_code || 'غير محدد'}`,
                tracking_code: subscription.tracking_code || null,
                public_tracking_code: subscription.public_tracking_code || subscription.tracking_code || null,
                processed_by: user.id,
                organization_id: currentOrganization.id
              }])
              .select()
              .single();

            if (transactionError) {
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
              }
            }

          } catch (subscriptionError: any) {
            throw new Error(`فشل في معالجة الاشتراك: ${subscriptionError.message}`);
          }
        }

        // إذا كان لدينا اشتراكات فقط (بدون منتجات)، إرجاع نتيجة مباشرة
        if (cartItems.length === 0 && selectedServices.length === 0) {
          
          // إنشاء معرف طلب وهمي للاشتراكات
          const subscriptionOrderId = uuidv4();
          const subscriptionOrderNumber = Math.floor(1000 + Math.random() * 9000);

          toast({
            title: "تم إنشاء الطلب بنجاح",
            description: `تم معالجة ${selectedSubscriptions.length} اشتراك بنجاح`,
          });

          // مسح السلة
          clearCart();

          // تحديث البيانات
          await refreshPOSData();

          return {
            orderId: subscriptionOrderId,
            customerOrderNumber: subscriptionOrderNumber
          };
        }
      }

      // معالجة المنتجات والخدمات العادية إذا وجدت
      if (cartItems.length > 0 || selectedServices.length > 0) {

        // حساب المجموع الفرعي والإجمالي
        const cartSubtotal = cartItems.reduce((total, item) => {
          const price = item.customPrice || item.variantPrice || item.product.price || 0;
          return total + (price * item.quantity);
        }, 0);
        
        const servicesTotal = selectedServices.reduce((total, service) => total + (service.price || 0), 0);
        const subscriptionsTotal = selectedSubscriptions.reduce((total, subscription) => {
          const price = subscription.price || subscription.selling_price || subscription.purchase_price || 0;
          return total + price;
        }, 0);
        
        const subtotal = cartSubtotal + servicesTotal + subscriptionsTotal;
        
        // استخدام القيم من orderDetails مباشرة إذا كانت موجودة
        const discountAmount = orderDetails.discount || 0;
        const tax = 0;
        const total = Math.max(0, orderDetails.total || (subtotal - discountAmount + tax));

        // إضافة logging للتشخيص
        console.log('🔥 [usePOSOrder] تحديث جديد - حساب المبالغ:', {
          cartItems: cartItems.map(item => ({
            name: item.product.name,
            price: item.product.price,
            variantPrice: item.variantPrice,
            customPrice: item.customPrice,
            quantity: item.quantity,
            calculatedPrice: item.customPrice || item.variantPrice || item.product.price || 0
          })),
          cartSubtotal,
          servicesTotal,
          subscriptionsTotal,
          subtotal,
          discountAmount,
          total,
          orderDetailsDiscount: orderDetails.discount,
          orderDetailsDiscountType: orderDetails.discountType,
          orderDetailsKeys: Object.keys(orderDetails),
          orderDetailsFull: orderDetails
        });

        console.log('🚨 [usePOSOrder] قبل تحضير orderData مباشرة:', {
          orderDetails_total: orderDetails.total,
          orderDetails_discount: orderDetails.discount,
          orderDetails_subtotal: orderDetails.subtotal,
          calculated_total: total,
          calculated_discountAmount: discountAmount,
          calculated_subtotal: subtotal
        });

        // تحضير بيانات الطلب للدالة المحسنة
        console.log('🚨 [usePOSOrder] BEFORE creating orderData:', {
          orderDetails_total: orderDetails.total,
          orderDetails_discount: orderDetails.discount,
          orderDetails_subtotal: orderDetails.subtotal,
          calculated_total: total,
          calculated_discountAmount: discountAmount,
          calculated_subtotal: subtotal
        });

        const orderData: POSOrderData = {
          organizationId: currentOrganization.id,
          employeeId: userProfile?.id || user.id, // استخدام userProfile.id إذا كان متاحاً
          items: cartItems.map(item => {
            const unitPrice = item.customPrice || item.variantPrice || item.product.price || 0;
            const totalPrice = unitPrice * item.quantity;

            return {
              id: uuidv4(),
              productId: item.product.id,
              productName: item.product.name,
              name: item.product.name,
              slug: item.product.slug || `product-${item.product.id}`,
              quantity: item.quantity,
              price: unitPrice,
              unitPrice: unitPrice,
              totalPrice: totalPrice,
              isDigital: item.product.isDigital || false,
              colorId: item.colorId || item.variant_info?.colorId || null,
              colorName: item.colorName || item.variant_info?.colorName || null,
              sizeId: item.sizeId || item.variant_info?.sizeId || null,
              sizeName: item.sizeName || item.variant_info?.sizeName || null,
              variant_info: {
                colorId: item.colorId || item.variant_info?.colorId,
                colorName: item.colorName || item.variant_info?.colorName,
                colorCode: item.colorCode || item.variant_info?.colorCode,
                sizeId: item.sizeId || item.variant_info?.sizeId,
                sizeName: item.sizeName || item.variant_info?.sizeName,
                variantImage: item.variantImage || item.variant_info?.variantImage
              }
            } as OrderItem;
          }),
          // استخدام القيم من orderDetails مباشرة (محسوبة من usePOSAdvancedState) - تبسيط
          total: orderDetails.total || 0,
          customerId: orderDetails.customerId,
          paymentMethod: orderDetails.paymentMethod || 'cash',
          paymentStatus: orderDetails.paymentStatus || 'paid',
          notes: orderDetails.notes || '',
          amountPaid: orderDetails.partialPayment?.amountPaid || orderDetails.total || 0,
          discount: orderDetails.discount || 0,
          subtotal: orderDetails.subtotal || 0,
          remainingAmount: orderDetails.partialPayment?.remainingAmount || 0,
          considerRemainingAsPartial: orderDetails.considerRemainingAsPartial || false
        };

        console.log('🔥 [usePOSOrder] AFTER creating orderData:', {
          orderData_total: orderData.total,
          orderData_discount: orderData.discount,
          orderData_subtotal: orderData.subtotal,
          orderData_amountPaid: orderData.amountPaid,
          orderData_remainingAmount: orderData.remainingAmount
        });

        console.log('🔍 [usePOSOrder] بيانات الطلب قبل الإرسال إلى createPOSOrder:', {
          orderDetailsFromAdvanced: orderDetails,
          calculatedValues: {
            subtotal,
            total,
            discountAmount
          },
          finalOrderData: {
            total: orderData.total,
            discount: orderData.discount,
            subtotal: orderData.subtotal,
            amountPaid: orderData.amountPaid,
            remainingAmount: orderData.remainingAmount
          },
          fullOrderData: orderData
        });

        logOrderSubmit(
          'pending',
          cartItems, // تمرير cartItems بدلاً من orderData.total
          'usePOSOrder.submitOrder.start',
          {
            operation: 'ORDER_SUBMIT',
            itemsCount: cartItems.length,
            organizationId: currentOrganization.id,
            employeeId: user.id,
            paymentMethod: orderData.paymentMethod,
            paymentStatus: orderData.paymentStatus,
            total: orderData.total // إضافة total في details
          }
        );

        console.log('🔍 [usePOSOrder] البيانات مباشرة قبل استدعاء createPOSOrder:', {
          total: orderData.total,
          discount: orderData.discount,
          subtotal: orderData.subtotal,
          amountPaid: orderData.amountPaid,
          remainingAmount: orderData.remainingAmount,
          orderDataType: typeof orderData,
          orderDataKeys: Object.keys(orderData)
        });

        console.log('🔥 [usePOSOrder] البيانات قبل JSON.parse(JSON.stringify):', {
          orderData_total: orderData.total,
          orderData_discount: orderData.discount,
          orderData_subtotal: orderData.subtotal,
          orderDataType: typeof orderData,
          orderDataJSON: JSON.stringify(orderData).substring(0, 500)
        });

        // عمل deep copy للبيانات لمنع mutation
        const orderDataCopy = JSON.parse(JSON.stringify(orderData));
        
        console.log('🔍 [usePOSOrder] البيانات بعد deep copy:', {
          original: {
            total: orderData.total,
            discount: orderData.discount,
            subtotal: orderData.subtotal
          },
          copy: {
            total: orderDataCopy.total,
            discount: orderDataCopy.discount,
            subtotal: orderDataCopy.subtotal
          }
        });

        // استخدام الدالة المحسنة مع النسخة المحمية
        const result = await createPOSOrder(orderDataCopy);

        if (result.success) {
          // تحديث المخزون في الكاش
          cartItems.forEach(item => {
            const quantityChange = -item.quantity; // سالب لأنه تم البيع
            updateProductStockInCache(
              item.product.id,
              item.colorId || item.variant_info?.colorId || null,
              item.sizeId || item.variant_info?.sizeId || null,
              quantityChange
            );
          });

          // مسح السلة
          clearCart();

          // تحديث البيانات
          await refreshPOSData();

          logOrderSubmit(
            result.orderId,
            cartItems, // تمرير cartItems بدلاً من result.total
            'usePOSOrder.submitOrder.success',
            {
              operation: 'ORDER_SUCCESS',
              processingTime: result.processingTime,
              databaseProcessingTime: result.databaseProcessingTime,
              fifoResults: result.fifoResults,
              totalFifoCost: result.totalFifoCost,
              total: result.total // إضافة total في details
            }
          );

          return {
            orderId: result.orderId,
            customerOrderNumber: result.customerOrderNumber
          };
        } else {
          throw new Error(result.message || 'فشل في إنشاء الطلب');
        }
      }

      // هذا لا يجب أن يحدث، لكن كإجراء احترازي
      throw new Error('لا توجد عناصر صالحة للمعالجة');

    } catch (error) {
      logOrderSubmit(
        'error',
        cartItems, // تمرير cartItems بدلاً من NaN
        'usePOSOrder.submitOrder.error',
        {
          operation: 'ORDER_SUBMIT',
          error: error instanceof Error ? error.message : 'خطأ غير معروف',
          total: orderDetails.total || 0,
          itemsCount: cartItems.length,
          organizationId: currentOrganization?.id,
          employeeId: user?.id
        }
      );

      throw error;
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [
    user,
    currentOrganization,
    cartItems,
    selectedServices,
    selectedSubscriptions,
    updateProductStockInCache,
    clearCart,
    refreshPOSData,
    toast
  ]);

  return {
    currentOrder,
    favoriteProducts,
    isSubmittingOrder,
    setCurrentOrder,
    handleOpenOrder,
    submitOrder
  };
};
