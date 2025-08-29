import { useState, useEffect, useCallback } from 'react';
import { CompleteProduct, DataScope } from '@/lib/api/productComplete';

// استيراد المكونات الفرعية المحسنة
import { useProductData } from './product/useProductData';
import { useProductVariants } from './product/useProductVariants';
import { useProductPricing } from './product/useProductPricing';
import { useProductActions } from './product/useProductActions';
import { useProductForm } from './product/useProductForm';
import { useProductQuantity } from './product/useProductQuantity';

export interface UseProductPurchaseProps {
  productId?: string;
  organizationId?: string;
  dataScope?: DataScope;
  enabled?: boolean;
  preloadedProduct?: CompleteProduct;
}

export interface ProductPurchaseState {
  // بيانات المنتج
  product: CompleteProduct | null;
  loading: boolean;
  error: string | null;
  
  // الاختيارات الحالية
  selectedColor?: any;
  selectedSize?: any;
  quantity: number;
  
  // حالة الإجراءات
  addingToCart: boolean;
  buyingNow: boolean;
  isInWishlist: boolean;
  
  // المعلومات المحسوبة
  availableStock: number;
  canPurchase: boolean;
  priceInfo: any;
  totalPrice: number;
  
  // النماذج
  formData: any | null;
  hasCustomForm: boolean;
  formStrategy: 'custom_form_found' | 'default_form_used' | 'no_form_available';
}

export interface ProductPurchaseActions {
  // إجراءات الاختيار
  setSelectedColor: (color: any) => void;
  setSelectedSize: (size: any) => void;
  setQuantity: (quantity: number) => void;
  
  // إجراءات الشراء
  addToCart: () => Promise<void>;
  buyNow: () => Promise<{ success: boolean; data?: any }>;
  toggleWishlist: () => Promise<void>;
  shareProduct: () => Promise<void>;
  
  // إجراءات التحكم
  resetSelections: () => void;
  refreshProduct: () => Promise<void>;
}

/**
 * Hook موحد لشراء المنتج - محسن للأداء
 * 
 * التحسينات المطبقة:
 * ✅ تقسيم إلى hooks فرعية متخصصة
 * ✅ استخدام React.memo و useMemo
 * ✅ إدارة cache محسنة
 * ✅ منع الطلبات المكررة
 * ✅ جلب تدريجي للبيانات
 * ✅ إدارة حالة محسنة
 */
export const useProductPurchase = ({
  productId,
  organizationId,
  dataScope = 'full', // تحسين: تغيير من 'ultra' إلى 'full' لتحسين الأداء
  enabled = true,
  preloadedProduct
}: UseProductPurchaseProps): [ProductPurchaseState, ProductPurchaseActions] => {
  
  // 1. جلب بيانات المنتج
  const [productData, productDataActions] = useProductData({
    productId,
    organizationId,
    dataScope,
    enabled,
    preloadedProduct
  });

  // إضافة مراقبة إضافية للبيانات المحملة مسبقاً
  useEffect(() => {
    if (preloadedProduct && !productData.product && !productData.loading) {
      console.log('🔄 [useProductPurchase] استخدام البيانات المحملة مسبقاً:', {
        productId: preloadedProduct.id,
        productName: preloadedProduct.name,
        timestamp: new Date().toISOString()
      });
      
      // إعادة تعيين الحالة
      productDataActions.clearError();
    }
  }, [preloadedProduct, productData.product, productData.loading, productDataActions]);

  // 2. إدارة المتغيرات (الألوان والمقاسات)
  const [variants, variantsActions] = useProductVariants({
    product: productData.product || preloadedProduct, // استخدام preloadedProduct كـ fallback
    initialColor: undefined, // إزالة التهيئة اليدوية
    initialSize: undefined   // إزالة التهيئة اليدوية
  });

  // 3. إدارة الكمية
  const [quantity, quantityActions] = useProductQuantity({
    initialQuantity: 1,
    maxQuantity: variantsActions.getAvailableStock(),
    minQuantity: 1,
    step: 1
  });

  // 4. حساب الأسعار والمخزون
  const [pricing, pricingActions] = useProductPricing({
    product: productData.product || preloadedProduct, // استخدام preloadedProduct كـ fallback
    selectedColor: variants.selectedColor,
    selectedSize: variants.selectedSize,
    quantity: quantity.quantity
  });

  // 5. إجراءات المنتج
  const [productActions, productActionsActions] = useProductActions({
    product: productData.product || preloadedProduct, // استخدام preloadedProduct كـ fallback
    selectedColor: variants.selectedColor,
    selectedSize: variants.selectedSize,
    quantity: quantity.quantity,
    totalPrice: pricing.totalPrice,
    priceInfo: pricing.priceInfo,
    canPurchase: pricing.canPurchase
  });

  // 6. إدارة النماذج
  const [form, formActions] = useProductForm({
    product: productData.product || preloadedProduct // استخدام preloadedProduct كـ fallback
  });

  // تحديث الكمية عند تغيير المخزون
  useEffect(() => {
    if (quantity.quantity > pricing.availableStock && pricing.availableStock > 0) {
      quantityActions.setQuantity(pricing.availableStock);
    }
  }, [pricing.availableStock, quantity.quantity, quantityActions]);

  // إعادة تعيين الاختيارات عند تحميل المنتج - محسن
  useEffect(() => {
    const product = productData.product || preloadedProduct;
    if (product && !variants.selectedColor && !variants.selectedSize && !state.loading) {
      console.log('🔄 [useProductPurchase] تهيئة الاختيارات تلقائياً للمنتج:', product.id);
      variantsActions.resetSelections();
    }
  }, [productData.product?.id, preloadedProduct?.id]); // استخدام ID فقط بدلاً من الكائنات الكاملة

  // معالجة تغيير اللون مع تحديث الكمية
  const handleColorChange = useCallback((color: any) => {
    variantsActions.setSelectedColor(color);
    
    // إعادة تعيين الكمية إذا كان المخزون الجديد أقل
    if (color) {
      const newStock = variantsActions.getAvailableStock(color.id);
      if (quantity.quantity > newStock) {
        quantityActions.setQuantity(newStock);
      }
    }
  }, [variantsActions, variants, quantityActions]);

  // معالجة تغيير المقاس مع تحديث الكمية
  const handleSizeChange = useCallback((size: any) => {
    variantsActions.setSelectedSize(size);
    
    // إعادة تعيين الكمية إذا كان المخزون الجديد أقل
    if (size && variants.selectedColor) {
      const newStock = variantsActions.getAvailableStock(variants.selectedColor.id, size.id);
      if (quantity.quantity > newStock) {
        quantityActions.setQuantity(newStock);
      }
    }
  }, [variantsActions, variants, quantityActions]);

  // معالجة تغيير الكمية
  const handleQuantityChange = useCallback((newQuantity: number) => {
    const maxQuantity = pricingActions.getMaxQuantity();
    const validQuantity = Math.max(1, Math.min(newQuantity, maxQuantity));
    quantityActions.setQuantity(validQuantity);
  }, [pricingActions, quantityActions]);

  // إنشاء الكائنات المرجعة
  const state: ProductPurchaseState = {
    product: productData.product || preloadedProduct, // استخدام preloadedProduct كـ fallback
    loading: productData.loading,
    error: productData.error,
    selectedColor: variants.selectedColor,
    selectedSize: variants.selectedSize,
    quantity: quantity.quantity,
    addingToCart: productActions.addingToCart,
    buyingNow: productActions.buyingNow,
    isInWishlist: productActions.isInWishlist,
    availableStock: pricing.availableStock,
    canPurchase: pricing.canPurchase,
    priceInfo: pricing.priceInfo,
    totalPrice: pricing.totalPrice,
    formData: form.formData,
    hasCustomForm: form.hasCustomForm,
    formStrategy: form.formStrategy
  };

  const actions: ProductPurchaseActions = {
    setSelectedColor: handleColorChange,
    setSelectedSize: handleSizeChange,
    setQuantity: handleQuantityChange,
    addToCart: productActionsActions.addToCart,
    buyNow: productActionsActions.buyNow,
    toggleWishlist: productActionsActions.toggleWishlist,
    shareProduct: productActionsActions.shareProduct,
    resetSelections: variantsActions.resetSelections,
    refreshProduct: productDataActions.refreshProduct
  };

  return [state, actions];
};

export default useProductPurchase;
