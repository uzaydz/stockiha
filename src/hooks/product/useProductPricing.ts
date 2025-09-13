import { useMemo, useCallback } from 'react';
import { 
  getFinalPrice,
  isProductAvailable,
  getVariantStock
} from '@/lib/api/productComplete';
import { CompleteProduct, ProductColor, ProductSize } from '@/lib/api/productComplete';

interface UseProductPricingProps {
  product: CompleteProduct | null;
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  quantity: number;
}

interface ProductPricingState {
  availableStock: number;
  canPurchase: boolean;
  priceInfo: ReturnType<typeof getFinalPrice>;
  totalPrice: number;
  originalTotalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  isWholesale: boolean;
  hasCompareAtPrice: boolean;
}

interface ProductPricingActions {
  calculatePrice: (qty?: number, colorId?: string, sizeId?: string) => ReturnType<typeof getFinalPrice>;
  getAvailableStock: (colorId?: string, sizeId?: string) => number;
  canPurchaseQuantity: (qty: number) => boolean;
  getMaxQuantity: () => number;
}

/**
 * Hook لحساب أسعار ومخزون المنتج - محسن للأداء
 * - يحسب الأسعار والمخزون باستخدام useMemo
 * - يدعم المتغيرات (الألوان والمقاسات)
 * - يحسب الخصومات والنسب المئوية
 * - يتحقق من إمكانية الشراء
 */
export const useProductPricing = ({
  product,
  selectedColor,
  selectedSize,
  quantity
}: UseProductPricingProps): [ProductPricingState, ProductPricingActions] => {
  
  // حساب المخزون المتاح
  const availableStock = useMemo(() => {
    if (!product) return 0;
    return getVariantStock(product, selectedColor?.id, selectedSize?.id);
  }, [product, selectedColor?.id, selectedSize?.id]);

  // حساب معلومات السعر
  const priceInfo = useMemo(() => {
    if (!product) {
      return {
        price: 0,
        originalPrice: 0,
        isWholesale: false,
        hasCompareAtPrice: false
      };
    }
    return getFinalPrice(product, quantity, selectedColor?.id, selectedSize?.id);
  }, [product, quantity, selectedColor?.id, selectedSize?.id]);

  // حساب السعر الإجمالي (priceInfo.price يحتوي على الإجمالي بالفعل)
  const totalPrice = useMemo(() => {
    return priceInfo.price;
  }, [priceInfo.price]);

  // حساب السعر الأصلي الإجمالي (originalPrice هو الإجمالي)
  const originalTotalPrice = useMemo(() => {
    return priceInfo.originalPrice;
  }, [priceInfo.originalPrice]);

  // حساب مبلغ الخصم
  const discountAmount = useMemo(() => {
    return originalTotalPrice - totalPrice;
  }, [originalTotalPrice, totalPrice]);

  // حساب نسبة الخصم
  const discountPercentage = useMemo(() => {
    if (originalTotalPrice === 0) return 0;
    return Math.round((discountAmount / originalTotalPrice) * 100);
  }, [discountAmount, originalTotalPrice]);

  // فحص إذا كان السعر بالجملة
  const isWholesale = useMemo(() => {
    return priceInfo.isWholesale;
  }, [priceInfo.isWholesale]);

  // فحص إذا كان هناك سعر مقارنة
  const hasCompareAtPrice = useMemo(() => {
    return priceInfo.hasCompareAtPrice;
  }, [priceInfo.hasCompareAtPrice]);

  // تحديد إمكانية الشراء
  const canPurchase = useMemo(() => {
    if (!product) return false;
    if (!isProductAvailable(product)) return false;
    if (availableStock <= 0) return false;
    if (quantity <= 0 || quantity > availableStock) return false;
    if (product.variants?.has_variants && !selectedColor) return false;
    if (selectedColor?.has_sizes && !selectedSize) return false;
    return true;
  }, [product, availableStock, quantity, selectedColor, selectedSize]);

  // حساب السعر لمتغيرات محددة
  const calculatePrice = useCallback((qty: number = quantity, colorId?: string, sizeId?: string) => {
    if (!product) {
      return {
        price: 0,
        originalPrice: 0,
        isWholesale: false,
        hasCompareAtPrice: false
      };
    }
    
    const colorIdToUse = colorId || selectedColor?.id;
    const sizeIdToUse = sizeId || selectedSize?.id;
    
    return getFinalPrice(product, qty, colorIdToUse, sizeIdToUse);
  }, [product, quantity, selectedColor?.id, selectedSize?.id]);

  // الحصول على المخزون المتاح لمتغيرات محددة
  const getAvailableStock = useCallback((colorId?: string, sizeId?: string): number => {
    if (!product) return 0;
    
    const colorIdToUse = colorId || selectedColor?.id;
    const sizeIdToUse = sizeId || selectedSize?.id;
    
    return getVariantStock(product, colorIdToUse, sizeIdToUse);
  }, [product, selectedColor?.id, selectedSize?.id]);

  // فحص إمكانية شراء كمية محددة
  const canPurchaseQuantity = useCallback((qty: number): boolean => {
    if (!product) return false;
    if (!isProductAvailable(product)) return false;
    if (availableStock <= 0) return false;
    if (qty <= 0 || qty > availableStock) return false;
    if (product.variants?.has_variants && !selectedColor) return false;
    if (selectedColor?.has_sizes && !selectedSize) return false;
    return true;
  }, [product, availableStock, selectedColor, selectedSize]);

  // الحصول على أقصى كمية يمكن شراؤها
  const getMaxQuantity = useCallback((): number => {
    if (!product) return 0;
    if (!isProductAvailable(product)) return 0;
    if (availableStock <= 0) return 0;
    
    // حد أقصى للكمية (100 قطعة)
    return Math.min(availableStock, 100);
  }, [product, availableStock]);

  const state: ProductPricingState = {
    availableStock,
    canPurchase,
    priceInfo,
    totalPrice,
    originalTotalPrice,
    discountAmount,
    discountPercentage,
    isWholesale,
    hasCompareAtPrice
  };

  const actions: ProductPricingActions = {
    calculatePrice,
    getAvailableStock,
    canPurchaseQuantity,
    getMaxQuantity
  };

  return [state, actions];
};
