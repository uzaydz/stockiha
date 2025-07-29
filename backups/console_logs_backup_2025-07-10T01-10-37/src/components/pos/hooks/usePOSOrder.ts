import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase-client';
import { Product, Order, User as AppUser, Service, OrderItem, ServiceBooking } from '@/types';
import { logOrderSubmit, logStockUpdate, logProductAdd } from '@/utils/inventoryLogger';
import { createPOSOrder, POSOrderData } from '@/context/shop/posOrderService';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { v4 as uuidv4 } from 'uuid';

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
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // الحصول على المنتجات المفضلة
  const favoriteProducts = products.filter(product => 
    (product as any).isFavorite || (product as any).is_favorite
  );

  const handleOpenOrder = useCallback((order: Order) => {
    setCurrentOrder(order);
  }, []);

  const submitOrder = useCallback(async (orderDetails: Partial<Order>) => {
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
      // تحضير بيانات الطلب للدالة المحسنة
      const orderData: POSOrderData = {
        organizationId: currentOrganization.id,
        employeeId: user.id,
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
        total: orderDetails.total || 0,
        customerId: orderDetails.customerId,
        paymentMethod: orderDetails.paymentMethod || 'cash',
        paymentStatus: orderDetails.paymentStatus || 'paid',
        notes: orderDetails.notes || '',
        amountPaid: orderDetails.partialPayment?.amountPaid,
        discount: orderDetails.discount || 0,
        subtotal: orderDetails.subtotal
      };

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

      // استخدام الدالة المحسنة
      const result = await createPOSOrder(orderData);

      // 🔍 تتبع مصدر الرقم 666 - نقطة 4: في usePOSOrder بعد استقبال النتيجة
      console.log('🔍 [DEBUG-4] تتبع customer_order_number في usePOSOrder بعد استقبال النتيجة:', {
        resultSuccess: result.success,
        resultCustomerOrderNumber: result.customerOrderNumber,
        resultOrderId: result.orderId,
        resultSlug: result.slug,
        timestamp: new Date().toISOString(),
        location: 'usePOSOrder.submitOrder - after createPOSOrder'
      });

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

        // 🔍 تتبع مصدر الرقم 666 - نقطة 5: في usePOSOrder قبل إرجاع النتيجة النهائية
        console.log('🔍 [DEBUG-5] تتبع customer_order_number في usePOSOrder قبل إرجاع النتيجة النهائية:', {
          resultCustomerOrderNumber: result.customerOrderNumber,
          finalReturnValue: result.customerOrderNumber,
          resultOrderId: result.orderId,
          resultSlug: result.slug,
          timestamp: new Date().toISOString(),
          location: 'usePOSOrder.submitOrder - before return'
        });

        return {
          orderId: result.orderId,
          customerOrderNumber: result.customerOrderNumber,
          slug: result.slug,
          status: result.status,
          paymentStatus: result.paymentStatus,
          total: result.total,
          message: result.message
        };
      } else {
        throw new Error(result.message || 'فشل في إنشاء الطلب');
      }
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
