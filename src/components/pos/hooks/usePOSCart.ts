import { useCallback, useMemo, useRef, useEffect } from 'react';
import { usePowerSync } from '@powersync/react';
import { toast } from 'sonner';
import { Product } from '@/types';
import { useCartTabs } from '@/hooks/useCartTabs';
import { ensureArray } from '@/context/POSDataContext';
import {
  calculateProductPrice,
  toProductPricingInfo,
  isSaleTypeAvailable,
  getAvailablePricingOptions,
  getAvailableSellingUnits,
  getDefaultSellingUnit,
  calculateWeightPrice,
  calculateBoxPrice,
  calculateMeterPrice,
  type SaleType,
  type SellingUnit,
  type PricingResult
} from '@/lib/pricing/wholesalePricing';
import { LocalSerialService } from '@/services/local';

// ⚡ دالة مساعدة للتحقق من المخزون المتقدم
interface AdvancedStockCheckResult {
  isAvailable: boolean;
  availableAmount: number;
  unit: string;
  type: 'piece' | 'weight' | 'box' | 'meter';
  message?: string;
}

function checkAdvancedStock(product: Product, sellingUnit?: SellingUnit): AdvancedStockCheckResult {
  const availableUnits = getAvailableSellingUnits(product as any);
  const targetUnit = sellingUnit || (availableUnits[0] !== 'piece' ? availableUnits[0] : 'piece');

  switch (targetUnit) {
    case 'weight':
      if (product.sell_by_weight && (product as any).available_weight !== undefined) {
        const available = (product as any).available_weight || 0;
        return {
          isAvailable: available > 0,
          availableAmount: available,
          unit: product.weight_unit === 'g' ? 'غرام' : product.weight_unit === 'lb' ? 'رطل' : 'كغ',
          type: 'weight',
          message: available <= 0 ? 'لا يوجد وزن متاح' : undefined
        };
      }
      break;

    case 'meter':
      if (product.sell_by_meter && (product as any).available_length !== undefined) {
        const available = (product as any).available_length || 0;
        return {
          isAvailable: available > 0,
          availableAmount: available,
          unit: 'متر',
          type: 'meter',
          message: available <= 0 ? 'لا توجد أمتار متاحة' : undefined
        };
      }
      break;

    case 'box':
      if (product.sell_by_box && (product as any).available_boxes !== undefined) {
        const available = (product as any).available_boxes || 0;
        return {
          isAvailable: available > 0,
          availableAmount: available,
          unit: 'صندوق',
          type: 'box',
          message: available <= 0 ? 'لا توجد صناديق متاحة' : undefined
        };
      }
      break;
  }

  // الافتراضي: القطعة
  const stock = product.stock_quantity || product.stockQuantity || 0;
  return {
    isAvailable: stock > 0,
    availableAmount: stock,
    unit: 'قطعة',
    type: 'piece',
    message: stock <= 0 ? 'المنتج غير متوفر في المخزون' : undefined
  };
}

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
  /** نوع البيع (تجزئة/جملة/نصف جملة) */
  saleType?: SaleType;
  /** هل هذا سعر جملة؟ */
  isWholesale?: boolean;
  /** السعر الأصلي قبل خصم الجملة */
  originalPrice?: number;
  // === حقول أنواع البيع المتقدمة ===
  /** وحدة البيع (قطعة/وزن/علبة/متر) */
  sellingUnit?: SellingUnit;
  /** الوزن (للبيع بالوزن) */
  weight?: number;
  /** وحدة الوزن */
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  /** السعر لكل وحدة وزن */
  pricePerWeightUnit?: number;
  /** عدد الصناديق (للبيع بالعلبة) */
  boxCount?: number;
  /** عدد الوحدات في الصندوق */
  unitsPerBox?: number;
  /** سعر الصندوق */
  boxPrice?: number;
  /** الطول (للبيع بالمتر) */
  length?: number;
  /** السعر لكل متر */
  pricePerMeter?: number;
  // === حقول الدفعات والأرقام التسلسلية ===
  /** معرف الدفعة */
  batchId?: string;
  /** رقم الدفعة */
  batchNumber?: string;
  /** تاريخ انتهاء الصلاحية */
  expiryDate?: string;
  /** الأرقام التسلسلية المحددة */
  serialNumbers?: string[];
  /** ⚡ معرفات الأرقام التسلسلية (للحجز/التحرير) */
  serialIds?: string[];
}

interface UsePOSCartOptions {
  updateProductStockInCache: (
    productId: string,
    colorId: string | null,
    sizeId: string | null,
    quantityChange: number
  ) => void;
  getProductStock: (productId: string, colorId?: string, sizeId?: string) => number;
  products: Product[];
}

export const usePOSCart = ({
  updateProductStockInCache,
  getProductStock,
  products
}: UsePOSCartOptions) => {

  // ⚡ خدمة الأرقام التسلسلية المحلية (للحجز/التحرير)
  const powerSync = usePowerSync();
  const localSerialServiceRef = useRef<LocalSerialService | null>(null);

  // تهيئة الخدمة مرة واحدة
  if (!localSerialServiceRef.current) {
    localSerialServiceRef.current = new LocalSerialService(powerSync);
  }
  const localSerialService = localSerialServiceRef.current;

  // إدارة التبويبات
  const {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    addTab,
    removeTab,
    updateTab,
    addItemToCart: addItemToCartTab,
    updateItemQuantity: updateItemQuantityTab,
    removeItemFromCart: removeItemFromCartTab,
    clearCart: clearCartTab,
    addService,
    removeService: removeServiceTab,
    updateServicePrice: updateServicePriceTab,
    addSubscription,
    removeSubscription: removeSubscriptionTab,
    updateSubscriptionPrice: updateSubscriptionPriceTab,
    assignCustomerToTab,
    duplicateTab,
    clearEmptyTabs,
    getTabSummary,
    updateItemSaleType: updateItemSaleTypeTab
  } = useCartTabs({
    autoSave: true,
    maxTabs: 8
  });

  // للتوافق مع الكود الحالي - محسن للتحديث التلقائي
  const cartItems = useMemo(() => {
    const items = activeTab?.cartItems || [];
    return items;
  }, [activeTab?.cartItems, activeTab?.id]);
  
  const selectedServices = useMemo(() => {
    const services = activeTab?.selectedServices || [];
    return services;
  }, [activeTab?.selectedServices, activeTab?.id]);
  
  const selectedSubscriptions = useMemo(() => {
    const subscriptions = activeTab?.selectedSubscriptions || [];
    return subscriptions;
  }, [activeTab?.selectedSubscriptions, activeTab?.id]);

  // إضافة منتج أساسي للسلة
  const addItemToCart = useCallback((product: Product) => {
    if (!activeTabId) {
      console.error('[usePOSCart] ❌ لا يوجد تبويب نشط!');
      toast.error('خطأ: لا يوجد تبويب نشط. يرجى تحديث الصفحة.');
      return;
    }

    // ⚡ التحقق من المخزون المتقدم
    const availableUnits = getAvailableSellingUnits(product as any);
    const defaultUnit = availableUnits.includes('weight') ? 'weight' :
                        availableUnits.includes('meter') ? 'meter' :
                        availableUnits.includes('box') ? 'box' : 'piece';

    const stockCheck = checkAdvancedStock(product, defaultUnit);

    // التحقق من توفر المخزون
    if (!stockCheck.isAvailable) {
      toast.warning(`المنتج "${product.name}" غير متوفر في المخزون حالياً`);
      return;
    }

    // التحقق من الكمية الموجودة في السلة
    const existingItem = activeTab?.cartItems.find(item =>
      item.product.id === product.id && !item.colorId && !item.sizeId
    );

    // ⚡ التحقق حسب نوع البيع
    if (stockCheck.type === 'piece') {
      if (existingItem && existingItem.quantity >= stockCheck.availableAmount) {
        toast.warning(`لا يمكن إضافة المزيد. الكمية المتاحة: ${stockCheck.availableAmount} ${stockCheck.unit}`);
        return;
      }
    } else if (stockCheck.type === 'box') {
      const existingBoxCount = existingItem?.boxCount || 0;
      if (existingBoxCount >= stockCheck.availableAmount) {
        toast.warning(`لا يمكن إضافة المزيد. المتاح: ${stockCheck.availableAmount} ${stockCheck.unit}`);
        return;
      }
    }
    // للوزن والمتر: سيتم التحقق عند إدخال الكمية في النموذج

    // ⚡ تعيين القيم الافتراضية حسب نوع البيع
    const defaultOptions: any = {
      sellingUnit: defaultUnit
    };

    switch (defaultUnit) {
      case 'weight':
        // قيمة افتراضية: 1 كغ أو الحد الأدنى للوزن
        defaultOptions.weight = (product as any).min_weight_per_sale || 1;
        defaultOptions.weightUnit = (product as any).weight_unit || 'kg';
        defaultOptions.pricePerWeightUnit = (product as any).price_per_weight_unit || product.price;
        break;
      case 'meter':
        // قيمة افتراضية: 1 متر أو الحد الأدنى للأمتار
        defaultOptions.length = (product as any).min_meters_per_sale || (product as any).min_meters || 1;
        defaultOptions.pricePerMeter = (product as any).price_per_meter || product.price;
        break;
      case 'box':
        // قيمة افتراضية: 1 صندوق
        defaultOptions.boxCount = 1;
        defaultOptions.unitsPerBox = (product as any).units_per_box || 1;
        defaultOptions.boxPrice = (product as any).box_price || product.price;
        break;
    }

    // 🔍 DEBUG: طباعة القيم قبل إضافتها للسلة
    console.log('[usePOSCart] 🔍 DEBUG addItemToCart - defaultOptions:', {
      productId: product.id,
      productName: product.name,
      defaultUnit,
      defaultOptions
    });

    // إضافة المنتج للسلة مع وحدة البيع الافتراضية والقيم الافتراضية
    addItemToCartTab(product, 1, defaultOptions);

    // ⚡ رسالة مخصصة حسب نوع البيع
    if (stockCheck.type !== 'piece') {
      const unitValue = defaultUnit === 'weight' ? `${defaultOptions.weight} ${defaultOptions.weightUnit}` :
                        defaultUnit === 'meter' ? `${defaultOptions.length} متر` :
                        defaultUnit === 'box' ? `${defaultOptions.boxCount} صندوق` : '';
      toast.success(`تمت إضافة "${product.name}" للسلة (${unitValue})`, {
        description: 'يمكنك تعديل الكمية بالنقر على العنصر'
      });
    } else {
      toast.success(`تمت إضافة "${product.name}" للسلة`);
    }

  }, [activeTabId, activeTab, addItemToCartTab]);

  // إضافة منتج مع متغيرات للسلة
  const addVariantToCart = useCallback((
    product: Product, 
    colorId?: string, 
    sizeId?: string, 
    variantPrice?: number,
    colorName?: string,
    colorCode?: string,
    sizeName?: string,
    variantImage?: string
  ) => {
    // تحديد الكمية المتاحة بناءً على المتغير المحدد
    let availableQuantity = product.stock_quantity;
    let variantName = "";
    
    // ✅ استخدام ensureArray للتعامل مع JSON strings من SQLite
    const productColors = ensureArray(product.colors) as any[];
    // المتغير هو لون ومقاس
    if (colorId && sizeId) {
      const color = productColors.find(c => c.id === colorId);
      const colorSizes = ensureArray(color?.sizes) as any[];
      const size = colorSizes.find(s => s.id === sizeId);

      if (size) {
        availableQuantity = size.quantity;
        variantName = `${product.name} - ${colorName || 'لون'} - ${sizeName || 'مقاس'}`;
      }
    }
    // المتغير هو لون فقط
    else if (colorId) {
      const color = productColors.find(c => c.id === colorId);
      if (color) {
        availableQuantity = color.quantity;
        variantName = `${product.name} - ${colorName || 'لون'}`;
      }
    }
    
    // التحقق من توفر المخزون
    if (availableQuantity <= 0) {
      toast.error(`المنتج "${variantName || product.name}" غير متوفر في المخزون`);
      return;
    }
    
    // البحث عن نفس المتغير في السلة
    const existingItem = activeTab?.cartItems.find(item => 
      item.product.id === product.id && 
      item.colorId === colorId && 
      item.sizeId === sizeId
    );
    
    // التحقق من المخزون
    if (existingItem && existingItem.quantity >= availableQuantity) {
      toast.error(`لا يمكن إضافة المزيد من "${variantName || product.name}". الكمية المتاحة: ${availableQuantity}`);
      return;
    }
    
    // إضافة المنتج مع المتغيرات للتبويب النشط
    addItemToCartTab(product, 1, {
      colorId,
      colorName,
      colorCode,
      sizeId,
      sizeName,
      variantPrice: variantPrice || product.price,
      variantImage
    });
    
    // ✅ تم إصلاح المشكلة: لا يتم تحديث المخزون عند إضافة المنتج للسلة
    // المخزون سيتم تحديثه فقط عند إتمام الطلب الفعلي
    
    toast.success(`تمت إضافة "${variantName || product.name}" إلى السلة`);
  }, [activeTab, addItemToCartTab, updateProductStockInCache]);

  // إزالة منتج من السلة
  const removeItemFromCart = useCallback(async (index: number) => {
    const item = cartItems[index];

    // ✅ تم إصلاح المشكلة: لا يتم تحديث المخزون عند حذف المنتج من السلة
    // المخزون سيتم تحديثه فقط عند إتمام/إلغاء الطلب الفعلي

    // ⚡ تحرير حجوزات الأرقام التسلسلية عند إزالة المنتج
    if (item?.serialIds && item.serialIds.length > 0) {
      console.log(`🔓 [usePOSCart] تحرير ${item.serialIds.length} حجز serial عند إزالة المنتج`);
      for (const serialId of item.serialIds) {
        try {
          await localSerialService.releaseSerial(serialId);
        } catch (error) {
          console.error('❌ خطأ في تحرير حجز serial:', error);
        }
      }
    }

    // أو إذا كان لديه serialNumbers (البحث والتحرير)
    if (item?.serialNumbers && item.serialNumbers.length > 0 && !item.serialIds) {
      console.log(`🔓 [usePOSCart] تحرير ${item.serialNumbers.length} حجز serial بالأرقام`);
      for (const serialNumber of item.serialNumbers) {
        try {
          const product = item.product;
          const orgId = (product as any).organization_id;
          if (orgId) {
            await localSerialService.releaseSerial(serialNumber, orgId);
          }
        } catch (error) {
          console.error('❌ خطأ في تحرير حجز serial:', error);
        }
      }
    }

    removeItemFromCartTab(activeTabId, index);
    toast.success('تم حذف المنتج من السلة');
  }, [cartItems, removeItemFromCartTab, activeTabId, localSerialService]);

  // تحديث كمية المنتج في السلة
  const updateItemQuantity = useCallback((index: number, quantity: number) => {
    if (quantity < 1) return;
    
    const item = cartItems[index];
    const oldQuantity = item.quantity;
    const quantityDiff = quantity - oldQuantity;
    
    // الحصول على المخزون المتاح
    let availableQuantity = item.product.stockQuantity || item.product.stock_quantity || 0;
    
    try {
      const productExistsInContext = products.some(p => p.id === item.product.id);
      if (productExistsInContext) {
        availableQuantity = getProductStock(item.product.id, item.colorId, item.sizeId);
      } else {
        // للمنتجات مع متغيرات
        if (item.colorId) {
          // ✅ استخدام ensureArray للتعامل مع JSON strings من SQLite
          const itemProductColors = ensureArray(item.product.colors) as any[];
          const color = itemProductColors.find(c => c.id === item.colorId);
          if (color) {
            if (item.sizeId) {
              const colorSizes = ensureArray(color.sizes) as any[];
              const size = colorSizes.find(s => s.id === item.sizeId);
              availableQuantity = size?.quantity || 0;
            } else {
              availableQuantity = color.quantity || 0;
            }
          }
        }
      }
    } catch (error) {
      // استخدام المخزون الافتراضي
    }
    
    // إضافة الكمية الحالية للمخزون المتاح
    const totalAvailable = availableQuantity + oldQuantity;
    
    if (quantity > totalAvailable) {
      toast.error(`الكمية المطلوبة غير متوفرة. الكمية المتاحة: ${totalAvailable}`);
      
      // تعيين الكمية بالحد الأقصى المتاح
      updateItemQuantityTab(activeTabId, index, totalAvailable);
      return;
    }
    
    // ✅ تم إصلاح المشكلة: لا يتم تحديث المخزون عند تغيير الكمية في السلة
    // المخزون سيتم تحديثه فقط عند إتمام الطلب الفعلي
    
    updateItemQuantityTab(activeTabId, index, quantity);
  }, [cartItems, updateItemQuantityTab, activeTabId, getProductStock, products, updateProductStockInCache]);

  // تحديث سعر منتج في السلة
  const updateItemPrice = useCallback((index: number, price: number) => {
    if (price < 0) return;
    
    const item = cartItems[index];
    if (!item) return;
    
    // تحديث السعر في التبويب النشط
    const updatedItems = [...cartItems];
    updatedItems[index] = {
      ...item,
      variantPrice: price
    };
    
    // تحديث التبويب بالعناصر المحدثة
    updateTab(activeTabId, {
      cartItems: updatedItems
    });
    
    toast.success('تم تحديث السعر بنجاح');
  }, [cartItems, activeTabId, updateTab]);

  // مسح السلة - محسن مع تنظيف شامل
  const clearCart = useCallback(async () => {

    // ✅ تم إصلاح المشكلة: لا يتم تحديث المخزون عند مسح السلة
    // المخزون سيتم تحديثه فقط عند إتمام/إلغاء الطلب الفعلي

    // ⚡ تحرير جميع حجوزات الأرقام التسلسلية
    const serialReleasePromises: Promise<any>[] = [];

    for (const item of cartItems) {
      // تحرير بالمعرفات
      if (item.serialIds && item.serialIds.length > 0) {
        for (const serialId of item.serialIds) {
          serialReleasePromises.push(
            localSerialService.releaseSerial(serialId).catch(err => {
              console.error('❌ خطأ في تحرير حجز serial:', err);
            })
          );
        }
      }
      // تحرير بالأرقام
      else if (item.serialNumbers && item.serialNumbers.length > 0) {
        const orgId = (item.product as any).organization_id;
        if (orgId) {
          for (const serialNumber of item.serialNumbers) {
            serialReleasePromises.push(
              localSerialService.releaseSerial(serialNumber, orgId).catch(err => {
                console.error('❌ خطأ في تحرير حجز serial:', err);
              })
            );
          }
        }
      }
    }

    if (serialReleasePromises.length > 0) {
      console.log(`🔓 [usePOSCart] تحرير ${serialReleasePromises.length} حجز serial عند مسح السلة`);
      await Promise.all(serialReleasePromises);
    }

    clearCartTab(activeTabId);

    toast.success('تم مسح السلة');
  }, [clearCartTab, activeTabId, cartItems, localSerialService]);

  // إضافة اشتراك للسلة
  const handleAddSubscription = useCallback((subscription: any, pricing?: any) => {
    let selectedPricing = pricing;
    
    if (!selectedPricing) {
      if (subscription.pricing_options && subscription.pricing_options.length > 0) {
        selectedPricing = subscription.pricing_options.find((p: any) => p.is_default) || subscription.pricing_options[0];
      } else {
        selectedPricing = {
          id: `legacy-${subscription.id}`,
          duration_months: 1,
          duration_label: 'شهر واحد',
          selling_price: subscription.selling_price || 0,
          purchase_price: subscription.purchase_price || 0,
          available_quantity: subscription.available_quantity || 1,
          discount_percentage: 0,
          promo_text: ''
        };
      }
    }

    const subscriptionWithPricing = {
      ...subscription,
      selectedPricing,
      cart_id: `${subscription.id}-${selectedPricing.id}-${Date.now()}`,
      tracking_code: `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      duration_months: selectedPricing.duration_months,
      duration_label: selectedPricing.duration_label,
      final_price: selectedPricing.selling_price * (1 - (selectedPricing.discount_percentage || 0) / 100),
      original_price: selectedPricing.selling_price,
      discount_percentage: selectedPricing.discount_percentage || 0,
      promo_text: selectedPricing.promo_text || ''
    };

    const existingIndex = selectedSubscriptions.findIndex(s => 
      s.cart_id === subscriptionWithPricing.cart_id
    );

    if (existingIndex >= 0) {
      toast.error('هذا الاشتراك موجود بالفعل في السلة');
      return;
    }

    addSubscription(subscriptionWithPricing);
    toast.success(`تمت إضافة اشتراك "${subscription.name}" (${selectedPricing.duration_label}) للسلة`);
  }, [selectedSubscriptions, addSubscription]);

  // تغيير نوع البيع لعنصر في السلة (تجزئة/جملة/نصف جملة)
  const updateItemSaleType = useCallback((index: number, saleType: SaleType) => {
    const item = cartItems[index];
    if (!item) {
      toast.error('العنصر غير موجود في السلة');
      return;
    }

    const product = item.product;
    const pricingInfo = toProductPricingInfo(product);

    // التحقق من توفر نوع البيع
    if (!isSaleTypeAvailable(pricingInfo, saleType)) {
      const typeLabels = {
        retail: 'التجزئة',
        wholesale: 'الجملة',
        partial_wholesale: 'نصف الجملة'
      };
      toast.error(`نوع البيع "${typeLabels[saleType]}" غير متاح لهذا المنتج`);
      return;
    }

    // حساب السعر الجديد
    const pricing = calculateProductPrice(pricingInfo, item.quantity, saleType);

    // التحقق من الحد الأدنى للكمية
    if (pricing.minRequiredQuantity && item.quantity < pricing.minRequiredQuantity) {
      toast.warning(pricing.message || `يجب طلب ${pricing.minRequiredQuantity} وحدة على الأقل`);
      return;
    }

    // تحديث نوع البيع
    updateItemSaleTypeTab(activeTabId, index, saleType, pricing.unitPrice, pricing.originalPrice);

    const typeLabels = {
      retail: 'تجزئة',
      wholesale: 'جملة',
      partial_wholesale: 'نصف جملة'
    };

    if (pricing.savings > 0) {
      toast.success(`تم التغيير إلى ${typeLabels[saleType]} - توفير ${pricing.savings.toLocaleString()} دج`);
    } else {
      toast.success(`تم التغيير إلى ${typeLabels[saleType]}`);
    }
  }, [cartItems, activeTabId, updateItemSaleTypeTab]);

  // الحصول على خيارات التسعير المتاحة لعنصر
  const getItemPricingOptions = useCallback((index: number) => {
    const item = cartItems[index];
    if (!item) return [];

    const pricingInfo = toProductPricingInfo(item.product);
    return getAvailablePricingOptions(pricingInfo);
  }, [cartItems]);

  // حساب سعر عنصر مع نوع البيع الحالي
  const calculateItemPrice = useCallback((index: number): PricingResult | null => {
    const item = cartItems[index];
    if (!item) return null;

    const pricingInfo = toProductPricingInfo(item.product);
    const saleType = item.saleType || 'retail';
    return calculateProductPrice(pricingInfo, item.quantity, saleType);
  }, [cartItems]);

  // === دوال أنواع البيع المتقدمة ===

  // تحديث وحدة البيع (قطعة/وزن/علبة/متر)
  const updateItemSellingUnit = useCallback((index: number, sellingUnit: SellingUnit) => {
    const item = cartItems[index];
    if (!item) return;

    const product = item.product;
    const availableUnits = getAvailableSellingUnits(product);

    if (!availableUnits.includes(sellingUnit)) {
      toast.error('وحدة البيع هذه غير متاحة لهذا المنتج');
      return;
    }

    // تحديث العنصر مع القيم الافتراضية لوحدة البيع الجديدة
    const updatedItems = [...cartItems];
    const updates: Partial<CartItem> = {
      sellingUnit,
    };

    // إعداد القيم الافتراضية حسب وحدة البيع
    switch (sellingUnit) {
      case 'weight':
        updates.weight = item.weight || 1;
        updates.weightUnit = item.weightUnit || product.weight_unit || 'kg';
        updates.pricePerWeightUnit = product.price_per_weight_unit || 0;
        break;
      case 'box':
        updates.boxCount = item.boxCount || 1;
        updates.unitsPerBox = product.units_per_box || 1;
        updates.boxPrice = product.box_price || 0;
        break;
      case 'meter':
        updates.length = item.length || 1;
        updates.pricePerMeter = product.price_per_meter || 0;
        break;
      case 'piece':
      default:
        // للقطعة، نستخدم الكمية العادية
        break;
    }

    updatedItems[index] = { ...item, ...updates };
    updateTab(activeTabId, { cartItems: updatedItems });

    const unitLabels = {
      piece: 'القطعة',
      weight: 'الوزن',
      box: 'الكرتون',
      meter: 'المتر'
    };
    toast.success(`تم التغيير إلى البيع بـ${unitLabels[sellingUnit]}`);
  }, [cartItems, activeTabId, updateTab]);

  // تحديث الوزن
  const updateItemWeight = useCallback((index: number, weight: number) => {
    const item = cartItems[index];
    if (!item) return;

    if (weight <= 0) {
      toast.error('الوزن يجب أن يكون أكبر من صفر');
      return;
    }

    const product = item.product;

    // ⚡ التحقق من المخزون المتقدم
    const availableWeight = (product as any).available_weight || 0;
    if (availableWeight > 0 && weight > availableWeight) {
      toast.error(`الوزن المتاح: ${availableWeight.toFixed(2)} ${product.weight_unit || 'كغ'}`);
      return;
    }

    if (product.max_weight && weight > product.max_weight) {
      toast.error(`الحد الأقصى للوزن هو ${product.max_weight}`);
      return;
    }

    const updatedItems = [...cartItems];
    updatedItems[index] = { ...item, weight };
    updateTab(activeTabId, { cartItems: updatedItems });
  }, [cartItems, activeTabId, updateTab]);

  // تحديث عدد الصناديق
  const updateItemBoxCount = useCallback((index: number, boxCount: number) => {
    const item = cartItems[index];
    if (!item) return;

    if (boxCount < 1) {
      toast.error('عدد الكراتين يجب أن يكون 1 على الأقل');
      return;
    }

    const product = item.product;

    // ⚡ التحقق من المخزون المتقدم
    const availableBoxes = (product as any).available_boxes || 0;
    if (availableBoxes > 0 && boxCount > availableBoxes) {
      toast.error(`عدد الصناديق المتاحة: ${availableBoxes}`);
      return;
    }

    const updatedItems = [...cartItems];
    updatedItems[index] = { ...item, boxCount };
    updateTab(activeTabId, { cartItems: updatedItems });
  }, [cartItems, activeTabId, updateTab]);

  // تحديث الطول (المتر)
  const updateItemLength = useCallback((index: number, length: number) => {
    const item = cartItems[index];
    if (!item) return;

    if (length <= 0) {
      toast.error('الطول يجب أن يكون أكبر من صفر');
      return;
    }

    const product = item.product;

    // ⚡ التحقق من المخزون المتقدم
    const availableLength = (product as any).available_length || 0;
    if (availableLength > 0 && length > availableLength) {
      toast.error(`الطول المتاح: ${availableLength.toFixed(2)} متر`);
      return;
    }

    if (product.roll_length && length > product.roll_length) {
      toast.error(`الحد الأقصى للطول هو ${product.roll_length} متر`);
      return;
    }

    const updatedItems = [...cartItems];
    updatedItems[index] = { ...item, length };
    updateTab(activeTabId, { cartItems: updatedItems });
  }, [cartItems, activeTabId, updateTab]);

  // تحديث إعدادات البيع كاملة (للاستخدام من Modal)
  const updateItemFullConfig = useCallback((index: number, config: {
    sellingUnit: SellingUnit;
    quantity?: number;
    weight?: number;
    weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
    boxCount?: number;
    length?: number;
  }) => {
    const item = cartItems[index];
    if (!item) return;

    const product = item.product;
    const { sellingUnit } = config;

    // تحقق من توفر وحدة البيع
    const availableUnits = getAvailableSellingUnits(product);
    if (!availableUnits.includes(sellingUnit)) {
      toast.error('وحدة البيع هذه غير متاحة لهذا المنتج');
      return;
    }

    // ⚡ التحقق من المخزون المتقدم
    const stockCheck = checkAdvancedStock(product, sellingUnit);

    // بناء التحديثات
    const updates: Partial<CartItem> = {
      sellingUnit,
    };

    switch (sellingUnit) {
      case 'weight':
        const requestedWeight = config.weight || 1;
        const availableWeight = (product as any).available_weight || 0;
        if (availableWeight > 0 && requestedWeight > availableWeight) {
          toast.error(`الوزن المتاح: ${availableWeight.toFixed(2)} ${product.weight_unit || 'كغ'}`);
          return;
        }
        updates.weight = requestedWeight;
        updates.weightUnit = config.weightUnit || product.weight_unit || 'kg';
        updates.pricePerWeightUnit = product.price_per_weight_unit || 0;
        break;
      case 'box':
        const requestedBoxes = config.boxCount || 1;
        const availableBoxes = (product as any).available_boxes || 0;
        if (availableBoxes > 0 && requestedBoxes > availableBoxes) {
          toast.error(`عدد الصناديق المتاحة: ${availableBoxes}`);
          return;
        }
        updates.boxCount = requestedBoxes;
        updates.unitsPerBox = product.units_per_box || 1;
        updates.boxPrice = product.box_price || 0;
        break;
      case 'meter':
        const requestedLength = config.length || 1;
        const availableLength = (product as any).available_length || 0;
        if (availableLength > 0 && requestedLength > availableLength) {
          toast.error(`الطول المتاح: ${availableLength.toFixed(2)} متر`);
          return;
        }
        updates.length = requestedLength;
        updates.pricePerMeter = product.price_per_meter || 0;
        break;
      case 'piece':
      default:
        const requestedQuantity = config.quantity || 1;
        if (stockCheck.availableAmount > 0 && requestedQuantity > stockCheck.availableAmount) {
          toast.error(`الكمية المتاحة: ${stockCheck.availableAmount}`);
          return;
        }
        updates.quantity = requestedQuantity;
        break;
    }

    const updatedItems = [...cartItems];
    updatedItems[index] = { ...item, ...updates };
    updateTab(activeTabId, { cartItems: updatedItems });
  }, [cartItems, activeTabId, updateTab]);

  // الحصول على وحدات البيع المتاحة لمنتج
  const getItemSellingUnits = useCallback((index: number): SellingUnit[] => {
    const item = cartItems[index];
    if (!item) return ['piece'];
    return getAvailableSellingUnits(item.product);
  }, [cartItems]);

  // حساب السعر الإجمالي لعنصر مع أنواع البيع المتقدمة
  const calculateItemTotal = useCallback((index: number): number => {
    const item = cartItems[index];
    if (!item) return 0;

    const sellingUnit = item.sellingUnit || 'piece';
    const product = item.product;

    switch (sellingUnit) {
      case 'weight':
        if (item.weight && (item.pricePerWeightUnit || product.price_per_weight_unit)) {
          return item.weight * (item.pricePerWeightUnit || product.price_per_weight_unit || 0);
        }
        break;
      case 'box':
        if (item.boxCount && (item.boxPrice || product.box_price)) {
          return item.boxCount * (item.boxPrice || product.box_price || 0);
        }
        break;
      case 'meter':
        if (item.length && (item.pricePerMeter || product.price_per_meter)) {
          return item.length * (item.pricePerMeter || product.price_per_meter || 0);
        }
        break;
      default:
        // piece - السعر العادي
        return (item.variantPrice || product.price || 0) * item.quantity;
    }

    // الافتراضي
    return (item.variantPrice || product.price || 0) * item.quantity;
  }, [cartItems]);

  // === دوال الدفعات والأرقام التسلسلية ===

  // تحديث الدفعة لعنصر في السلة
  const updateItemBatch = useCallback((index: number, batchId: string, batchNumber: string, expiryDate?: string) => {
    const item = cartItems[index];
    if (!item) return;

    const updatedItems = [...cartItems];
    updatedItems[index] = {
      ...item,
      batchId,
      batchNumber,
      expiryDate
    };
    updateTab(activeTabId, { cartItems: updatedItems });

    toast.success(`تم تحديد الدفعة: ${batchNumber}`);
  }, [cartItems, activeTabId, updateTab]);

  // تحديث الأرقام التسلسلية لعنصر في السلة
  const updateItemSerialNumbers = useCallback((
    index: number,
    serialNumbers: string[],
    serialIds?: string[]
  ) => {
    const item = cartItems[index];
    if (!item) return;

    const updatedItems = [...cartItems];
    updatedItems[index] = {
      ...item,
      serialNumbers,
      serialIds: serialIds || item.serialIds
    };
    updateTab(activeTabId, { cartItems: updatedItems });
  }, [cartItems, activeTabId, updateTab]);

  // ⚡ تحرير حجز serial محدد من عنصر (عند إزالة serial من القائمة)
  const releaseSerialFromItem = useCallback(async (
    index: number,
    serialIdOrNumber: string,
    organizationId?: string
  ) => {
    const item = cartItems[index];
    if (!item) return;

    // تحرير الحجز
    try {
      await localSerialService.releaseSerial(serialIdOrNumber, organizationId);
      console.log(`🔓 [usePOSCart] تم تحرير حجز serial: ${serialIdOrNumber}`);
    } catch (error) {
      console.error('❌ خطأ في تحرير حجز serial:', error);
    }

    // إزالة من القائمة
    const updatedSerialNumbers = item.serialNumbers?.filter(s => s !== serialIdOrNumber) || [];
    const updatedSerialIds = item.serialIds?.filter(s => s !== serialIdOrNumber) || [];

    const updatedItems = [...cartItems];
    updatedItems[index] = {
      ...item,
      serialNumbers: updatedSerialNumbers,
      serialIds: updatedSerialIds
    };
    updateTab(activeTabId, { cartItems: updatedItems });
  }, [cartItems, activeTabId, updateTab, localSerialService]);

  // التحقق من اكتمال متطلبات العنصر (الدفعات والأرقام التسلسلية)
  const validateItemRequirements = useCallback((index: number): { valid: boolean; errors: string[] } => {
    const item = cartItems[index];
    if (!item) return { valid: false, errors: ['العنصر غير موجود'] };

    const errors: string[] = [];
    const product = item.product;

    // التحقق من الدفعة
    if (product.track_batches && !item.batchId) {
      errors.push('يجب تحديد الدفعة');
    }

    // التحقق من الأرقام التسلسلية
    if (product.track_serial_numbers && product.require_serial_on_sale !== false) {
      const requiredSerials = item.quantity;
      const providedSerials = item.serialNumbers?.length || 0;
      if (providedSerials < requiredSerials) {
        errors.push(`يجب إدخال ${requiredSerials - providedSerials} رقم تسلسلي`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }, [cartItems]);

  // التحقق من اكتمال متطلبات كل عناصر السلة
  const validateCartRequirements = useCallback((): { valid: boolean; itemErrors: { index: number; errors: string[] }[] } => {
    const itemErrors: { index: number; errors: string[] }[] = [];

    cartItems.forEach((item, index) => {
      const validation = validateItemRequirements(index);
      if (!validation.valid) {
        itemErrors.push({ index, errors: validation.errors });
      }
    });

    return {
      valid: itemErrors.length === 0,
      itemErrors
    };
  }, [cartItems, validateItemRequirements]);

  return {
    // حالة التبويبات
    tabs,
    activeTab,
    activeTabId,
    cartItems,
    selectedServices,
    selectedSubscriptions,
    
    // دوال إدارة التبويبات
    setActiveTabId,
    addTab,
    removeTab,
    updateTab,
    duplicateTab,
    clearEmptyTabs,
    getTabSummary,
    
    // دوال إدارة السلة
    addItemToCart,
    addVariantToCart,
    removeItemFromCart,
    updateItemQuantity,
    updateItemPrice,
    clearCart,
    
    // دوال إدارة الخدمات
    addService,
    removeService: removeServiceTab,
    updateServicePrice: updateServicePriceTab,
    
    // دوال إدارة الاشتراكات
    handleAddSubscription,
    removeSubscription: removeSubscriptionTab,
    updateSubscriptionPrice: updateSubscriptionPriceTab,
    
    // دوال أخرى
    assignCustomerToTab,

    // دوال الجملة والتسعير
    updateItemSaleType,
    getItemPricingOptions,
    calculateItemPrice,

    // دوال أنواع البيع المتقدمة
    updateItemSellingUnit,
    updateItemWeight,
    updateItemBoxCount,
    updateItemLength,
    updateItemFullConfig,
    getItemSellingUnits,
    calculateItemTotal,

    // دوال الدفعات والأرقام التسلسلية
    updateItemBatch,
    updateItemSerialNumbers,
    releaseSerialFromItem,
    validateItemRequirements,
    validateCartRequirements
  };
};
