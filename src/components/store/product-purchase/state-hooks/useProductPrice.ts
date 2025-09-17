import { useEffect } from 'react';
import type { Product, ProductColor, ProductSize } from '@/lib/api/products';

interface UseProductPriceOptions {
  product: Product | null;
  selectedSize: ProductSize | null;
  selectedColor: ProductColor | null;
  effectiveProduct: Product | null;
  setEffectivePrice: (price: number | null) => void;
}

interface UseProductPriceReturn {
  calculatePrice: () => number;
  getAvailableQuantity: () => number;
}

export const useProductPrice = ({
  product,
  selectedSize,
  selectedColor,
  effectiveProduct,
  setEffectivePrice
}: UseProductPriceOptions): UseProductPriceReturn => {

  // تحديث السعر الفعلي عند تغيير المنتج أو المتغيرات
  useEffect(() => {
    const targetProduct = effectiveProduct || product;
    if (!targetProduct) {
      setEffectivePrice(null);
      return;
    }

    // حساب السعر بناءً على المتغيرات المختارة
    let calculatedPrice = 0;

    // أولوية السعر: المقاس > اللون > المنتج الأساسي
    if (selectedSize?.price != null && selectedSize.price > 0) {
      calculatedPrice = selectedSize.price;
    } else if (selectedColor?.price != null && selectedColor.price > 0) {
      calculatedPrice = selectedColor.price;
    } else {
      // استخدام سعر المنتج (مع الأولوية للسعر المخفض)
      calculatedPrice = targetProduct.discount_price ?? targetProduct.price ?? 0;
    }

    setEffectivePrice(calculatedPrice);
  }, [effectiveProduct, product, selectedSize, selectedColor, setEffectivePrice]);

  const calculatePrice = () => {
    const targetProduct = effectiveProduct || product;
    if (!targetProduct) return 0;

    // أولوية السعر: المقاس > اللون > المنتج الأساسي
    if (selectedSize?.price != null && selectedSize.price > 0) {
      return selectedSize.price;
    }
    if (selectedColor?.price != null && selectedColor.price > 0) {
      return selectedColor.price;
    }

    // استخدام سعر المنتج (مع الأولوية للسعر المخفض)
    return targetProduct.discount_price ?? targetProduct.price ?? 0;
  };

  const getAvailableQuantity = () => {
    // أولوية الكمية: المقاس > اللون > المنتج الأساسي
    if (selectedSize?.quantity != null) return selectedSize.quantity;
    if (selectedColor?.quantity != null) return selectedColor.quantity;

    const targetProduct = effectiveProduct || product;
    return targetProduct?.stock_quantity ?? 0;
  };

  return {
    calculatePrice,
    getAvailableQuantity
  };
};
