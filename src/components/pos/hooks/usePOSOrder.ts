import { useState, useCallback, useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';
import { useToast } from '@/components/ui/use-toast';
import { Product, Order, User as AppUser, Service, OrderItem, ServiceBooking } from '@/types';
import { logOrderSubmit, logStockUpdate, logProductAdd } from '@/utils/inventoryLogger';
import { createPOSOrder, POSOrderData, initializePOSOfflineSync, buildPOSItemsFromCart, type UnifiedCartItem } from '@/context/shop/posOrderService';
import { unifiedProductService } from '@/services/UnifiedProductService';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useWorkSession } from '@/context/WorkSessionContext';
import { v4 as uuidv4 } from 'uuid';
import { usePowerSync } from '@powersync/react';
// 📦 استيراد خدمات الدفعات والأرقام التسلسلية المحلية (Offline-First)
import {
  LocalBatchService,
  LocalSerialService,
  getWarrantyMonths
} from '@/services/local';
// Legacy imports للتوافق (سيتم إزالتها لاحقاً)
// import { consumeFromBatches } from '@/api/batchService';
// import { sellSerial, findBySerialNumber } from '@/api/serialNumberService';

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

import type { SaleType } from '@/lib/pricing/wholesalePricing';

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
  /** نوع البيع (تجزئة/جملة/نصف جملة) */
  saleType?: SaleType;
  /** هل هذا سعر جملة؟ */
  isWholesale?: boolean;
  /** السعر الأصلي قبل خصم الجملة */
  originalPrice?: number;
  // === حقول الدفعات والأرقام التسلسلية ===
  /** معرف الدفعة المختارة */
  batchId?: string;
  /** رقم الدفعة */
  batchNumber?: string;
  /** تاريخ انتهاء صلاحية الدفعة */
  expiryDate?: string;
  /** الأرقام التسلسلية المختارة */
  serialNumbers?: string[];
  // === ⚡ حقول البيع المتقدم ===
  /** وحدة البيع (قطعة/وزن/صندوق/متر) */
  sellingUnit?: 'piece' | 'weight' | 'box' | 'meter';
  /** الوزن (للبيع بالوزن) */
  weight?: number;
  /** وحدة الوزن */
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  /** السعر لكل وحدة وزن */
  pricePerWeightUnit?: number;
  /** عدد الصناديق (للبيع بالصندوق) */
  boxCount?: number;
  /** عدد الوحدات في الصندوق */
  unitsPerBox?: number;
  /** سعر الصندوق */
  boxPrice?: number;
  /** الطول (للبيع بالمتر) */
  length?: number;
  /** السعر لكل متر */
  pricePerMeter?: number;
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
  updateProductStockInCache: (productId: string, colorId: string | null, sizeId: string | null, quantityChange: number, advancedStockUpdate?: {
    type: 'weight' | 'meter' | 'box' | 'piece';
    weightChange?: number;
    lengthChange?: number;
    boxChange?: number;
  }) => void;
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
  const { currentStaff } = useStaffSession();
  const { activeSession, resumeSession } = useWorkSession();

  // ⚡ خدمات محلية (Offline-First)
  const powerSync = usePowerSync();
  const localBatchService = new LocalBatchService(powerSync);
  const localSerialService = new LocalSerialService(powerSync);
  
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // الحصول على المنتجات المفضلة
  const favoriteProducts = (products || []).filter(product => 
    (product as any).isFavorite || (product as any).is_favorite
  );

  useEffect(() => {
    initializePOSOfflineSync();
  }, []);

  const handleOpenOrder = useCallback((order: Order) => {
    setCurrentOrder(order);
  }, []);

  const submitOrder = useCallback(async (orderDetails: POSOrderDetails): Promise<{orderId: string, customerOrderNumber: number}> => {

    if (!user) {
      sonnerToast.error('يجب تسجيل الدخول لإتمام الطلب');
      throw new Error('المستخدم غير مسجل الدخول');
    }

    if (!currentOrganization?.id) {
      sonnerToast.error('خطأ في تحديد المؤسسة. يرجى تحديث الصفحة');
      throw new Error('معرف المؤسسة مطلوب');
    }

    if (cartItems.length === 0 && selectedServices.length === 0 && selectedSubscriptions.length === 0) {
      sonnerToast.warning('السلة فارغة! أضف منتجات أولاً');
      throw new Error('لا يمكن إنشاء طلب فارغ');
    }

    // ✅ استئناف الجلسة تلقائياً إذا كانت متوقفة
    if (activeSession?.status === 'paused') {
      try {
        console.log('🔄 [usePOSOrder] الجلسة متوقفة - استئناف تلقائي...');
        await resumeSession();
        toast({
          title: '▶️ تم استئناف الجلسة تلقائياً',
          description: 'تم استئناف جلسة العمل لإتمام عملية البيع',
        });
      } catch (error) {
        console.error('❌ فشل استئناف الجلسة:', error);
        // نستمر في البيع حتى لو فشل الاستئناف
      }
    }

    setIsSubmittingOrder(true);

    try {
      // ⚡ معالجة الاشتراكات محلياً (Local-First)
      if (selectedSubscriptions.length > 0) {
        const { createLocalSubscriptionTransaction } = await import('@/api/localSubscriptionTransactionService');
        
        // معالجة كل اشتراك منفصل
        for (const subscription of selectedSubscriptions) {
          try {
            // ⚡ حفظ الاشتراك محلياً - لا نرمي خطأ إذا فشل
            await createLocalSubscriptionTransaction({
              organizationId: currentOrganization.id,
              serviceId: subscription.id,
              serviceName: subscription.name,
              provider: subscription.provider || 'غير محدد',
              logoUrl: subscription.logo_url || null,
              amount: subscription.final_price || subscription.selling_price || 0,
              cost: subscription.selectedPricing?.purchase_price || subscription.purchase_price || 0,
              profit: (subscription.final_price || subscription.selling_price || 0) - (subscription.selectedPricing?.purchase_price || subscription.purchase_price || 0),
              customerId: orderDetails.customerId === 'guest' ? undefined : orderDetails.customerId,
              customerName: orderDetails.customerId === 'guest' ? 'زائر' : 'عميل',
              paymentMethod: orderDetails.paymentMethod || 'cash',
              paymentStatus: orderDetails.paymentStatus === 'paid' ? 'completed' : orderDetails.paymentStatus,
              description: `${subscription.name} - ${subscription.duration_label || 'خدمة رقمية'}`,
              notes: `كود التتبع: ${subscription.tracking_code || 'غير محدد'}`,
              trackingCode: subscription.tracking_code || null,
              publicTrackingCode: subscription.public_tracking_code || subscription.tracking_code || null,
              processedBy: user.id,
            });

            console.log(`[usePOSOrder] ✅ تم حفظ الاشتراك محلياً: ${subscription.name}`);

            // ⚡ تحديث المخزون سيحدث لاحقاً عبر المزامنة
            // لا نحتاج لتحديث subscription_service_pricing هنا - سيحدث عبر SyncManager

          } catch (subscriptionError: any) {
            // ⚡ لا نرمي خطأ - نكتفي بتسجيل الخطأ
            // الطلب نفسه سيُنشأ بنجاح حتى لو فشل حفظ الاشتراك
            console.error(`[usePOSOrder] ⚠️ فشل حفظ الاشتراك محلياً: ${subscription.name}`, subscriptionError);
            // يمكن إضافة الاشتراك إلى metadata للطلب لمعالجته لاحقاً
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

          // ✅ لا حاجة لـ refreshPOSData - البيانات تُحدث محلياً تلقائياً
          // React Query سيحدث البيانات عند الحاجة (staleTime: 5 دقائق)

          return {
            orderId: subscriptionOrderId,
            customerOrderNumber: subscriptionOrderNumber
          };
        }
      }

      // معالجة المنتجات والخدمات العادية إذا وجدت
      if (cartItems.length > 0 || selectedServices.length > 0) {

        // ⚡ حساب المجموع الفرعي والإجمالي (مع دعم البيع المتقدم)
        const cartSubtotal = cartItems.reduce((total, item) => {
          const sellingUnit = item.sellingUnit || 'piece';

          switch (sellingUnit) {
            case 'weight':
              // البيع بالوزن
              const weight = item.weight || 0;
              const pricePerWeight = item.pricePerWeightUnit || item.product.price_per_weight_unit || 0;
              return total + (weight * pricePerWeight);

            case 'box':
              // البيع بالصندوق
              const boxCount = item.boxCount || 0;
              const boxPrice = item.boxPrice || item.product.box_price || 0;
              return total + (boxCount * boxPrice);

            case 'meter':
              // البيع بالمتر
              const length = item.length || 0;
              const pricePerMeter = item.pricePerMeter || item.product.price_per_meter || 0;
              return total + (length * pricePerMeter);

            case 'piece':
            default:
              // البيع بالقطعة (الافتراضي)
              const price = item.customPrice || item.variantPrice || item.product.price || 0;
              return total + (price * item.quantity);
          }
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
        const computedTotal = Math.max(0, subtotal - discountAmount + tax);
        const resolvedTotal = Math.max(0, orderDetails.total !== undefined ? orderDetails.total : computedTotal);

        // إضافة logging للتشخيص

        // تحضير بيانات الطلب للدالة المحسنة

        const resolvedCustomerName =
          orderDetails.customerId === 'guest'
            ? 'زائر'
            : users.find(customer => customer.id === orderDetails.customerId)?.name;

        // 🔍 تشخيص: طباعة معلومات الموظف
        console.log('🔍 [usePOSOrder] معلومات الموظف:', {
          currentStaff,
          staffId: currentStaff?.id,
          staffName: currentStaff?.staff_name,
          employeeId: userProfile?.id || user.id,
          userProfileName: (userProfile as any)?.name,
          userMetadataName: (user as any)?.user_metadata?.name
        });

        // ✅ إصلاح: استخدام user.id كـ staffId إذا لم يكن هناك موظف
        const resolvedCreatedByStaffId = currentStaff?.id ?? user.id;
        // ✅ إصلاح: استخدام اسم المستخدم من userProfile أو user_metadata
        const resolvedCreatedByStaffName = currentStaff?.staff_name ?? (userProfile as any)?.name ?? (user as any)?.user_metadata?.name ?? (user as any)?.email?.split('@')[0] ?? 'موظف';

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
          customPrice: item.customPrice,
          saleType: item.saleType,
          isWholesale: item.isWholesale,
          originalPrice: item.originalPrice,
          variant_info: item.variant_info,
          // ⚡ حقول البيع المتقدم
          sellingUnit: item.sellingUnit,
          weight: item.weight,
          weightUnit: item.weightUnit,
          pricePerWeightUnit: item.pricePerWeightUnit,
          boxCount: item.boxCount,
          unitsPerBox: item.unitsPerBox,
          boxPrice: item.boxPrice,
          length: item.length,
          pricePerMeter: item.pricePerMeter,
          // ⚡ حقول التتبع
          batchId: item.batchId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          serialNumbers: item.serialNumbers
        }));

        // بناء عناصر الطلب باستخدام الدالة الموحدة
        const orderItems = buildPOSItemsFromCart(
          unifiedCartItems,
          selectedServices,
          selectedSubscriptions
        );

        const orderData: POSOrderData = {
          organizationId: currentOrganization.id,
          employeeId: userProfile?.id || user.id,
          createdByStaffId: resolvedCreatedByStaffId, // ✅ دائماً موجود (user.id على الأقل)
          createdByStaffName: resolvedCreatedByStaffName, // ✅ دائماً موجود
          items: orderItems,
          // استخدام القيم من orderDetails مباشرة (محسوبة من usePOSAdvancedState) - تبسيط
          total: resolvedTotal,
          customerId: orderDetails.customerId,
          customerName: resolvedCustomerName,
          paymentMethod: orderDetails.paymentMethod || 'cash',
          paymentStatus: orderDetails.paymentStatus || 'paid',
          notes: orderDetails.notes || '',
          amountPaid: orderDetails.partialPayment?.amountPaid || resolvedTotal,
          discount: orderDetails.discount || 0,
          subtotal: orderDetails.subtotal || subtotal,
          remainingAmount: orderDetails.partialPayment?.remainingAmount || 0,
          considerRemainingAsPartial: orderDetails.considerRemainingAsPartial || false,
          metadata: selectedSubscriptions.length > 0
            ? { subscriptions: selectedSubscriptions }
            : undefined
        };

        // 🔍 DEBUG: طباعة cartItems الأصلية لتتبع حقول البيع المتقدم
        console.log('[usePOSOrder] 🔍 DEBUG cartItems قبل إنشاء الطلب:', cartItems.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          sellingUnit: item.sellingUnit,
          length: item.length,
          weight: item.weight,
          boxCount: item.boxCount,
          quantity: item.quantity,
          pricePerMeter: item.pricePerMeter,
          pricePerWeightUnit: item.pricePerWeightUnit,
          boxPrice: item.boxPrice
        })));

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

        // عمل deep copy للبيانات لمنع mutation
        const orderDataCopy = JSON.parse(JSON.stringify(orderData));

        // استخدام الدالة المحسنة مع النسخة المحمية
        const result = await createPOSOrder(orderDataCopy);

        if (result.success) {
          // ⚡ حساب الإجمالي للعرض
          const displayTotal = result.total || orderData.total || 0;

          if (result.isOffline) {
            sonnerToast.warning(
              `📡 تم حفظ الطلب محلياً - ${displayTotal.toLocaleString()} د.ج`,
              { description: 'سيتم المزامنة عند عودة الاتصال', duration: 5000 }
            );
          } else {
            sonnerToast.success(
              `✅ تم إنشاء الطلب #${result.customerOrderNumber}`,
              { description: `المبلغ: ${displayTotal.toLocaleString()} د.ج`, duration: 4000 }
            );
          }

          // ⚡ تحديث المخزون في الكاش (مع دعم البيع المتقدم)
          console.log('🔍 [usePOSOrder] بدء تحديث المخزون لـ', cartItems.length, 'عنصر');
          cartItems.forEach((item, index) => {
            const sellingUnit = item.sellingUnit || 'piece';

            // حساب التغيير في المخزون حسب نوع البيع
            let quantityChange = 0;
            let advancedStockUpdate: {
              type: 'weight' | 'meter' | 'box' | 'piece';
              weightChange?: number;
              lengthChange?: number;
              boxChange?: number;
            } | undefined;

            switch (sellingUnit) {
              case 'weight':
                // للبيع بالوزن: نخصم من available_weight
                quantityChange = 0; // لا نخصم من stock_quantity
                advancedStockUpdate = {
                  type: 'weight',
                  weightChange: -(item.weight || 0)
                };
                break;

              case 'box':
                // للبيع بالصندوق: نخصم عدد الوحدات من stock_quantity + عدد الصناديق
                quantityChange = -(item.boxCount || 0) * (item.unitsPerBox || item.product.units_per_box || 1);
                advancedStockUpdate = {
                  type: 'box',
                  boxChange: -(item.boxCount || 0)
                };
                break;

              case 'meter':
                // للبيع بالمتر: نخصم من available_length
                quantityChange = 0; // لا نخصم من stock_quantity
                advancedStockUpdate = {
                  type: 'meter',
                  lengthChange: -(item.length || 0)
                };
                break;

              case 'piece':
              default:
                // للبيع بالقطعة: نخصم من stock_quantity
                quantityChange = -item.quantity;
                advancedStockUpdate = { type: 'piece' };
                break;
            }

            console.log(`🔍 [usePOSOrder] تحديث المخزون [${index + 1}/${cartItems.length}]:`, {
              productId: item.product.id,
              productName: item.product.name,
              sellingUnit,
              colorId: item.colorId || item.variant_info?.colorId || null,
              sizeId: item.sizeId || item.variant_info?.sizeId || null,
              quantityChange,
              advancedStockUpdate,
              weight: item.weight,
              boxCount: item.boxCount,
              length: item.length,
              currentStock: item.product.stock_quantity
            });

            // ⚡ تحديث الكاش مع دعم المخزون المتقدم
            updateProductStockInCache(
              item.product.id,
              item.colorId || item.variant_info?.colorId || null,
              item.sizeId || item.variant_info?.sizeId || null,
              quantityChange,
              advancedStockUpdate
            );
          });
          console.log('🔍 [usePOSOrder] ✅ انتهى تحديث المخزون');

          // ========================================
          // 📦 معالجة الدفعات والأرقام التسلسلية (Offline-First)
          // ========================================
          console.log('📦 [usePOSOrder] بدء معالجة الدفعات والأرقام التسلسلية محلياً...');

          // معالجة كل عنصر يحتوي على دفعة أو أرقام تسلسلية
          for (const item of cartItems) {
            // تحديد نوع وحدة البيع
            const sellingUnit = item.sellingUnit || 'piece';
            let quantityToConsume = item.quantity;

            // للبيع بالوزن/المتر، استخدم الكمية العشرية
            if (sellingUnit === 'weight') {
              quantityToConsume = item.weight || 0;
            } else if (sellingUnit === 'meter') {
              quantityToConsume = item.length || 0;
            } else if (sellingUnit === 'box') {
              quantityToConsume = (item.boxCount || 0) * (item.unitsPerBox || item.product.units_per_box || 1);
            }

            // 1️⃣ معالجة استهلاك الدفعات (FEFO - محلياً)
            const shouldTrackBatch = item.product.track_batches || item.batchId;
            if (shouldTrackBatch && quantityToConsume > 0) {
              try {
                console.log(`📦 [usePOSOrder] استهلاك دفعة للمنتج: ${item.product.name} (${quantityToConsume} ${sellingUnit})`);

                const consumeResult = await localBatchService.consumeFromBatches({
                  product_id: item.product.id,
                  organization_id: currentOrganization.id,
                  quantity: quantityToConsume,
                  unit_type: sellingUnit,
                  order_id: result.orderId,
                  reason: 'sale',
                  notes: `بيع من الطلب #${result.customerOrderNumber}`,
                  color_id: item.colorId || item.variant_info?.colorId,
                  size_id: item.sizeId || item.variant_info?.sizeId,
                  specific_batch_id: item.batchId
                });

                if (consumeResult.remaining > 0) {
                  console.warn(`⚠️ [usePOSOrder] تبقى ${consumeResult.remaining} ${sellingUnit} غير مستهلكة للمنتج: ${item.product.name}`);
                } else {
                  console.log(`✅ [usePOSOrder] تم استهلاك ${quantityToConsume} ${sellingUnit} من ${consumeResult.consumed.length} دفعة محلياً`);
                }
              } catch (batchError) {
                console.error(`❌ [usePOSOrder] خطأ في استهلاك الدفعة محلياً:`, batchError);
                // لا نوقف العملية - الطلب تم بنجاح
              }
            }

            // 2️⃣ معالجة بيع الأرقام التسلسلية (محلياً)
            const shouldTrackSerial = item.product.track_serial_numbers && item.serialNumbers && item.serialNumbers.length > 0;
            if (shouldTrackSerial) {
              try {
                console.log(`🔢 [usePOSOrder] بيع ${item.serialNumbers!.length} رقم تسلسلي للمنتج: ${item.product.name}`);

                for (const serialNumber of item.serialNumbers!) {
                  // البحث عن الرقم التسلسلي محلياً
                  const serialInfo = await localSerialService.findBySerialNumber(serialNumber, currentOrganization.id);

                  if (serialInfo && (serialInfo.status === 'available' || serialInfo.status === 'reserved')) {
                    const unitPrice = item.customPrice || item.variantPrice || item.product.price || 0;

                    // استخدام الدالة الموحدة للضمان
                    const warrantyMonths = getWarrantyMonths(item.product);

                    const sellResult = await localSerialService.sellSerial({
                      serial_id: serialInfo.id,
                      order_id: result.orderId,
                      customer_id: orderDetails.customerId !== 'guest' ? orderDetails.customerId : undefined,
                      sold_price: unitPrice,
                      sold_by_user_id: user.id,
                      warranty_months: warrantyMonths
                    });

                    if (sellResult.success) {
                      console.log(`✅ [usePOSOrder] تم بيع الرقم التسلسلي محلياً: ${serialNumber}`);
                    } else {
                      console.warn(`⚠️ [usePOSOrder] فشل بيع الرقم التسلسلي ${serialNumber}: ${sellResult.error}`);
                    }
                  } else {
                    console.warn(`⚠️ [usePOSOrder] الرقم التسلسلي ${serialNumber} غير متاح للبيع (حالته: ${serialInfo?.status || 'غير موجود'})`);
                  }
                }
              } catch (serialError) {
                console.error(`❌ [usePOSOrder] خطأ في بيع الرقم التسلسلي محلياً:`, serialError);
                // لا نوقف العملية - الطلب تم بنجاح
              }
            }
          }

          console.log('📦 [usePOSOrder] ✅ انتهت معالجة الدفعات والأرقام التسلسلية محلياً');

          // مسح السلة
          clearCart();

          // ✅ لا حاجة لـ refreshPOSData - البيانات تُحدث محلياً تلقائياً
          // updateProductStockInCache حدّث الكاش بالفعل + React Query سيحدث عند الحاجة

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
              total: result.total,
              isOffline: result.isOffline ?? false,
              syncStatus: result.syncStatus
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

      // ⚡ رسائل خطأ محسنة حسب نوع الخطأ
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء الطلب';

      if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('offline')) {
        sonnerToast.error('❌ خطأ في الاتصال', {
          description: 'تحقق من اتصال الإنترنت وحاول مرة أخرى',
          duration: 6000
        });
      } else if (errorMessage.includes('stock') || errorMessage.includes('المخزون')) {
        sonnerToast.error('❌ خطأ في المخزون', {
          description: errorMessage,
          duration: 6000
        });
      } else if (errorMessage.includes('permission') || errorMessage.includes('الصلاحية')) {
        sonnerToast.error('❌ لا تملك الصلاحية', {
          description: 'تواصل مع المسؤول للحصول على الصلاحيات المطلوبة',
          duration: 6000
        });
      } else {
        sonnerToast.error(`❌ ${errorMessage}`, { duration: 5000 });
      }

      throw error;
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [
    user,
    currentOrganization,
    currentStaff,
    activeSession,
    resumeSession,
    cartItems,
    selectedServices,
    selectedSubscriptions,
    updateProductStockInCache,
    clearCart,
    refreshPOSData,
    toast,
    userProfile,
    users
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
