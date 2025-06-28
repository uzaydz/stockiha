import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Product, Order, User as AppUser, Service, OrderItem, ServiceBooking } from '@/types';
import { supabase } from '@/lib/supabase';

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
}

interface UsePOSOrderOptions {
  cartItems: CartItem[];
  selectedServices: any[];
  selectedSubscriptions: any[];
  currentUser?: AppUser | null;
  addOrder: (order: Order) => Promise<Order>;
  users: AppUser[];
  orders: Order[];
  products: Product[];
  updateProductStockInCache: (
    productId: string,
    colorId: string | null,
    sizeId: string | null,
    quantityChange: number
  ) => void;
  refreshProducts: () => Promise<void>;
  refreshPOSData?: () => Promise<void>;
  clearCart: () => void;
  onOrderSuccess?: (orderId: string, customerOrderNumber: number) => void;
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
  clearCart,
  onOrderSuccess
}: UsePOSOrderOptions) => {
  
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // جلب الطلبات الأخيرة والمنتجات المفضلة
  useEffect(() => {
    if (products.length > 0 && orders.length > 0) {
      // آخر 10 طلبات في المتجر
      const posOrders = orders
        .filter(order => !order.isOnline)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
      
      setRecentOrders(posOrders);
      
      // المنتجات الأكثر مبيعاً
      const productFrequency: Record<string, number> = {};
      
      orders.forEach(order => {
        order.items.forEach(item => {
          productFrequency[item.productId] = (productFrequency[item.productId] || 0) + item.quantity;
        });
      });
      
      // ترتيب المنتجات حسب المبيعات
      const sortedProducts = Object.entries(productFrequency)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => products.find(p => p.id === id))
        .filter((p): p is Product => !!p)
        .slice(0, 6);
      
      setFavoriteProducts(sortedProducts);
    }
  }, [orders, products]);

  // فتح طلب موجود
  const handleOpenOrder = useCallback((order: Order) => {
    // التحقق من توفر المنتجات
    const hasAllProducts = order.items.every(item => {
      return products.some(p => p.id === item.productId);
    });

    if (!hasAllProducts) {
      toast.error("لا يمكن فتح الطلب. بعض المنتجات غير متوفرة حاليًا.");
      return;
    }

    // تحويل عناصر الطلب إلى عناصر السلة
    const newCartItems = order.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        throw new Error(`المنتج غير موجود: ${item.productId}`);
      }
      
      return {
        product,
        quantity: item.quantity
      };
    });

    // استبدال السلة الحالية وتعيين الطلب الحالي
    // Note: هذا يتطلب تعديل في الكود الرئيسي لاستخدام دالة setCartItems
    setCurrentOrder(order);
    toast.success(`تم فتح الطلب #${order.id}`);
  }, [products]);

  // إنشاء طلب جديد محسن
  const submitOrder = useCallback(async (orderDetails: Partial<Order>): Promise<{orderId: string, customerOrderNumber: number}> => {
    if (isSubmittingOrder) {
      toast.warning('جاري معالجة طلب آخر، يرجى الانتظار...');
      return Promise.reject('Order submission in progress');
    }

    if (cartItems.length === 0 && selectedServices.length === 0 && selectedSubscriptions.length === 0) {
      toast.error("لا يمكن إنشاء طلب فارغ");
      return Promise.reject('Empty order');
    }

    setIsSubmittingOrder(true);
    toast.info("جاري معالجة الطلب...", { duration: 1000 });

    try {
      // إنشاء خريطة محلية للمنتجات لتحسين الأداء
      const productMap = new Map(products.map(p => [p.id, p]));
      
      const startProcessing = Date.now();
      
      // معالجة عناصر السلة مع حساب محلي للأسعار
      const cartItemsWithWholesale = cartItems.map(item => {
        const product = productMap.get(item.product.id);
        
        let finalPrice = item.variantPrice || item.product.price;
        let isWholesale = false;
        
        // فحص محلي لأسعار الجملة
        if (product?.allow_wholesale && 
            product.wholesale_price && 
            product.min_wholesale_quantity && 
            item.quantity >= product.min_wholesale_quantity) {
          finalPrice = product.wholesale_price;
          isWholesale = true;
        } else if (product?.allow_partial_wholesale && 
                   product.partial_wholesale_price && 
                   product.min_partial_wholesale_quantity && 
                   item.quantity >= product.min_partial_wholesale_quantity) {
          finalPrice = product.partial_wholesale_price;
          isWholesale = true;
        }
        
        return {
          ...item,
          wholesalePrice: finalPrice,
          isWholesale
        };
      });

      // إنشاء عناصر الطلب
      const orderItems: OrderItem[] = cartItemsWithWholesale.map((item, index) => {
        const itemId = uuidv4();
        const timestamp = Date.now();
        
        const unitPrice = item.isWholesale 
          ? item.wholesalePrice 
          : (item.variantPrice || item.product.price);
        
        const productName = item.colorName || item.sizeName
          ? `${item.product.name} ${item.colorName ? `- ${item.colorName}` : ''}${item.sizeName ? ` - ${item.sizeName}` : ''}`
          : item.product.name;
        
        return {
          id: itemId,
          productId: item.product.id,
          productName: productName,
          quantity: item.quantity,
          price: unitPrice,
          unitPrice: unitPrice,
          totalPrice: unitPrice * item.quantity,
          isDigital: item.product.isDigital,
          isWholesale: item.isWholesale,
          originalPrice: item.product.price,
          slug: `item-${timestamp}-${index}`,
          name: item.product.name,
          variant_info: {
            colorId: item.colorId,
            colorName: item.colorName,
            colorCode: item.colorCode,
            sizeId: item.sizeId,
            sizeName: item.sizeName,
            variantImage: item.variantImage
          }
        };
      });
      
      // إنشاء حجوزات الخدمات
      const serviceBookings: ServiceBooking[] = selectedServices.map((service, index) => {
        const serviceId = uuidv4();
        const orderPrefix = Math.floor(1000 + Math.random() * 9000);
        const serviceIndex = 1001 + index;
        const publicTrackingCode = `SRV-${orderPrefix}-${serviceIndex}`;
        
        const customerName = service.customerId 
          ? users.find(u => u.id === service.customerId)?.name || "زائر"
          : (orderDetails.customerId && orderDetails.customerId !== 'walk-in' && orderDetails.customerId !== 'guest'
              ? users.find(u => u.id === orderDetails.customerId)?.name || "زائر"
              : "زائر");
        
        return {
          id: serviceId,
          serviceId: service.id,
          serviceName: service.name,
          price: service.price,
          scheduledDate: service.scheduledDate,
          notes: service.notes,
          customerId: service.customerId || orderDetails.customerId,
          customer_name: customerName,
          status: 'pending',
          assignedTo: currentUser?.id || "",
          public_tracking_code: publicTrackingCode
        };
      });
      
      // حساب المجاميع
      const productsSubtotal = cartItemsWithWholesale.reduce(
        (sum, item) => sum + (item.wholesalePrice * item.quantity), 
        0
      );
      
      const servicesSubtotal = selectedServices.reduce(
        (sum, service) => sum + service.price, 
        0
      );
      
      const subscriptionsSubtotal = selectedSubscriptions.reduce(
        (sum, subscription) => sum + (subscription.final_price || subscription.selling_price || 0), 
        0
      );
      
      const subtotal = productsSubtotal + servicesSubtotal + subscriptionsSubtotal;
      const discountAmount = orderDetails.discount || 0;
      const taxableAmount = subtotal - discountAmount;
      const tax = 0;
      const total = taxableAmount + tax;
      
      // معالجة الاشتراكات بالتوازي إذا وُجدت
      if (selectedSubscriptions.length > 0) {
        toast.info("جاري معالجة الاشتراكات...", { duration: 800 });
        
        await Promise.all(
          selectedSubscriptions.map(async (subscription) => {
            try {
              const { data: transactionData, error: transactionError } = await supabase
                .from('subscription_transactions' as any)
                .insert([{
                  service_id: subscription.id,
                  transaction_type: 'sale',
                  amount: subscription.final_price || subscription.selling_price || 0,
                  cost: subscription.selectedPricing?.purchase_price || subscription.purchase_price || 0,
                  customer_id: (orderDetails.customerId === 'walk-in' || orderDetails.customerId === 'guest') ? null : orderDetails.customerId,
                  customer_name: (orderDetails.customerId === 'walk-in' || orderDetails.customerId === 'guest') ? 'زائر' : users.find(u => u.id === orderDetails.customerId)?.name || 'غير محدد',
                  payment_method: orderDetails.paymentMethod || 'cash',
                  payment_status: orderDetails.paymentStatus === 'paid' ? 'completed' : orderDetails.paymentStatus || 'completed',
                  quantity: 1,
                  description: `${subscription.name} - ${subscription.duration_label}`,
                  notes: `كود التتبع: ${subscription.tracking_code}`,
                  processed_by: currentUser?.id,
                  organization_id: currentUser?.user_metadata?.organization_id || localStorage.getItem('bazaar_organization_id') || 'fed872f9-1ade-4351-b020-5598fda976fe'
                }])
                .select()
                .single();

              if (transactionError) {
                console.error('خطأ في معاملة الاشتراك:', transactionError);
                return null;
              }

              // تحديث المخزون للاشتراك
              if (subscription.selectedPricing?.id) {
                const { data: currentPricing } = await supabase
                  .from('subscription_service_pricing' as any)
                  .select('available_quantity, sold_quantity')
                  .eq('id', subscription.selectedPricing.id)
                  .single();

                if (currentPricing) {
                  await supabase
                    .from('subscription_service_pricing' as any)
                    .update({
                      available_quantity: Math.max(0, (currentPricing as any).available_quantity - 1),
                      sold_quantity: ((currentPricing as any).sold_quantity || 0) + 1
                    })
                    .eq('id', subscription.selectedPricing.id);
                }
              }

              return transactionData;
            } catch (error) {
              console.error('خطأ في معالجة اشتراك:', error);
              return null;
            }
          })
        );
      }

      toast.info("جاري حفظ الطلب...", { duration: 800 });

      // إنشاء الطلب الجديد
      const newOrder: Order = {
        id: uuidv4(),
        customerId: orderDetails.customerId || "walk-in",
        items: orderItems,
        services: serviceBookings,
        subtotal,
        tax,
        discount: discountAmount,
        total,
        status: "completed",
        paymentMethod: orderDetails.paymentMethod || "cash",
        paymentStatus: orderDetails.paymentStatus || "paid",
        notes: orderDetails.notes,
        isOnline: false,
        employeeId: currentUser?.id || "",
        partialPayment: orderDetails.partialPayment,
        createdAt: new Date(),
        updatedAt: new Date(),
        subscriptionAccountInfo: orderDetails.subscriptionAccountInfo
      };

      // حفظ الطلب
      setCurrentOrder(newOrder);
      const createdOrder = await addOrder(newOrder);
      
      if (!createdOrder) {
        throw new Error('فشل في إنشاء الطلب');
      }

      // تحديث المخزون في cache لكل منتج
      cartItems.forEach(item => {
        updateProductStockInCache(
          item.product.id,
          item.colorId || null,
          item.sizeId || null,
          item.quantity
        );
      });

      // تحديث فوري من قاعدة البيانات
      try {
        await refreshProducts();
      } catch (error) {
        console.error('خطأ في تحديث المنتجات:', error);
      }
      
      // مسح السلة
      clearCart();
      
      const totalTime = Date.now() - startProcessing;
      toast.success(`تم إنشاء الطلب بنجاح (${totalTime}ms)`);
      
      // تحديث البيانات في الخلفية
      if (refreshPOSData) {
        refreshPOSData().catch(() => {
          // تجاهل أخطاء التحديث
        });
      }

      // استدعاء callback النجاح
      if (onOrderSuccess) {
        onOrderSuccess(createdOrder.id, (createdOrder as any).customer_order_number || 0);
      }
      
      return {
        orderId: createdOrder.id,
        customerOrderNumber: (createdOrder as any).customer_order_number || 0
      };
      
    } catch (error) {
      console.error('خطأ في إنشاء الطلب:', error);
      toast.error("حدث خطأ أثناء إنشاء الطلب");
      throw error;
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [
    isSubmittingOrder,
    cartItems,
    selectedServices,
    selectedSubscriptions,
    products,
    users,
    currentUser,
    addOrder,
    updateProductStockInCache,
    refreshProducts,
    refreshPOSData,
    clearCart,
    onOrderSuccess
  ]);

  return {
    // حالة الطلبات
    currentOrder,
    recentOrders,
    favoriteProducts,
    isSubmittingOrder,
    
    // دوال إدارة الطلبات
    setCurrentOrder,
    handleOpenOrder,
    submitOrder
  };
}; 