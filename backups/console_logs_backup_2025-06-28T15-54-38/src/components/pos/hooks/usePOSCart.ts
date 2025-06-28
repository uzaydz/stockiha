import { useCallback } from 'react';
import { toast } from 'sonner';
import { Product } from '@/types';
import { useCartTabs } from '@/hooks/useCartTabs';

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
    getTabSummary
  } = useCartTabs({
    autoSave: true,
    maxTabs: 8
  });

  // للتوافق مع الكود الحالي
  const cartItems = activeTab?.cartItems || [];
  const selectedServices = activeTab?.selectedServices || [];
  const selectedSubscriptions = activeTab?.selectedSubscriptions || [];

  // إضافة منتج أساسي للسلة
  const addItemToCart = useCallback((product: Product) => {
    // استخدام المخزون من المنتج نفسه أولاً
    let currentStock = product.stockQuantity || product.stock_quantity || 0;
    
    // محاولة الحصول على المخزون المحدث
    try {
      const stockFromContext = getProductStock(product.id);
      const productExistsInContext = products.some(p => p.id === product.id);
      if (productExistsInContext) {
        currentStock = stockFromContext;
      }
    } catch (error) {
      // استخدام المخزون من المنتج نفسه في حالة الخطأ
    }
    
    // البحث عن منتج مشابه في السلة
    const existingItem = activeTab?.cartItems.find(item => 
      item.product.id === product.id && 
      !item.colorId && 
      !item.sizeId
    );
    
    if (existingItem) {
      if (existingItem.quantity >= currentStock) {
        toast.error(`لا يمكن إضافة المزيد من "${product.name}". الكمية المتاحة: ${currentStock}`);
        return;
      }
    } else {
      if (currentStock <= 0) {
        toast.error(`المنتج "${product.name}" غير متوفر في المخزون`);
        return;
      }
    }
    
    // إضافة المنتج للتبويب النشط
    addItemToCartTab(product, 1);
    
    // تحديث المخزون في cache فوراً
    updateProductStockInCache(
      product.id,
      null,
      null,
      1
    );
    
    toast.success(`تمت إضافة "${product.name}" إلى السلة`);
  }, [activeTab, addItemToCartTab, getProductStock, products, updateProductStockInCache]);

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
    
    // المتغير هو لون ومقاس
    if (colorId && sizeId) {
      const color = product.colors?.find(c => c.id === colorId);
      const size = color?.sizes?.find(s => s.id === sizeId);
      
      if (size) {
        availableQuantity = size.quantity;
        variantName = `${product.name} - ${colorName || 'لون'} - ${sizeName || 'مقاس'}`;
      }
    }
    // المتغير هو لون فقط
    else if (colorId) {
      const color = product.colors?.find(c => c.id === colorId);
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
    
    // تحديث المخزون في cache فوراً
    updateProductStockInCache(
      product.id,
      colorId || null,
      sizeId || null,
      1
    );
    
    toast.success(`تمت إضافة "${variantName || product.name}" إلى السلة`);
  }, [activeTab, addItemToCartTab, updateProductStockInCache]);

  // إزالة منتج من السلة
  const removeItemFromCart = useCallback((index: number) => {
    const item = cartItems[index];
    
    // إرجاع المخزون
    updateProductStockInCache(
      item.product.id, 
      item.colorId || null, 
      item.sizeId || null, 
      -item.quantity
    );
    
    removeItemFromCartTab(activeTabId, index);
    toast.success('تم حذف المنتج وإرجاع المخزون');
  }, [cartItems, removeItemFromCartTab, activeTabId, updateProductStockInCache]);

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
          const color = item.product.colors?.find(c => c.id === item.colorId);
          if (color) {
            if (item.sizeId && color.sizes) {
              const size = color.sizes.find(s => s.id === item.sizeId);
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
      
      // تحديث المخزون
      updateProductStockInCache(
        item.product.id,
        item.colorId || null,
        item.sizeId || null,
        totalAvailable - oldQuantity
      );
      return;
    }
    
    // تحديث المخزون بناءً على الفرق
    if (quantityDiff !== 0) {
      updateProductStockInCache(
        item.product.id,
        item.colorId || null,
        item.sizeId || null,
        quantityDiff
      );
    }
    
    updateItemQuantityTab(activeTabId, index, quantity);
  }, [cartItems, updateItemQuantityTab, activeTabId, getProductStock, products, updateProductStockInCache]);

  // مسح السلة
  const clearCart = useCallback(() => {
    // إرجاع المخزون لجميع المنتجات
    cartItems.forEach(item => {
      updateProductStockInCache(
        item.product.id, 
        item.colorId || null, 
        item.sizeId || null, 
        -item.quantity
      );
    });
    
    clearCartTab(activeTabId);
    toast.success('تم مسح السلة وإرجاع المخزون');
  }, [cartItems, clearCartTab, activeTabId, updateProductStockInCache]);

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
    assignCustomerToTab
  };
}; 