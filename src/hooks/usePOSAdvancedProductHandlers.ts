import { useCallback } from 'react';
import { Product } from '@/types';
import { ensureArray } from '@/context/POSDataContext';

export const usePOSAdvancedProductHandlers = (
  isReturnMode: boolean,
  addItemToCart: (product: Product) => void,
  addItemToReturnCart: (product: Product) => void,
  addVariantToCart: (
    product: Product,
    colorId?: string,
    sizeId?: string,
    variantPrice?: number,
    colorName?: string,
    colorCode?: string,
    sizeName?: string,
    variantImage?: string
  ) => void,
  addVariantToReturnCart: (
    product: Product,
    colorId?: string,
    sizeId?: string,
    variantPrice?: number,
    colorName?: string,
    colorCode?: string,
    sizeName?: string,
    variantImage?: string
  ) => void,
  setSelectedProductForVariant: (product: Product | null) => void,
  setIsVariantDialogOpen: (open: boolean) => void
) => {
  // معالجة اختيار المنتجات مع المتغيرات
  const handleProductWithVariants = useCallback((product: Product) => {
    // قراءة حالة isReturnMode مباشرة من DOM أو من usePOSReturn hook مباشرة
    const isCurrentlyReturnMode = document.body.classList.contains('return-mode') || isReturnMode;

    // ✅ استخدام ensureArray للتعامل مع JSON strings من SQLite
    const productColors = ensureArray(product.colors);
    const productColorsAlt = ensureArray((product as any).product_colors);

    // 🐛 Debug: طباعة معلومات المنتج
    console.log('[POS] Product clicked:', {
      name: product.name,
      has_variants: product.has_variants,
      colors_field: !!product.colors,
      product_colors_field: !!(product as any).product_colors,
      colors_length: productColors.length || 0,
      product_colors_length: productColorsAlt.length || 0,
      first_color: productColors[0],
      first_product_color: productColorsAlt[0]
    });

    const colors = productColors.length > 0 ? productColors : productColorsAlt;
    if (product.has_variants && colors && colors.length > 0) {
      console.log('[POS] Opening variant dialog for:', product.name);
      setSelectedProductForVariant(product);
      setIsVariantDialogOpen(true);
      return;
    }

    // استخدام القيمة الحقيقية
    if (isCurrentlyReturnMode) {
      addItemToReturnCart(product);
    } else {
      try {
        addItemToCart(product);
      } catch (error) {
        // معالجة الخطأ إذا لزم الأمر
      }
    }
  }, [isReturnMode, addItemToCart, addItemToReturnCart, setSelectedProductForVariant, setIsVariantDialogOpen]);

  // معالجة إضافة متغير للسلة
  const handleAddVariantToCart = useCallback((
    product: Product,
    colorId?: string,
    sizeId?: string,
    variantPrice?: number,
    colorName?: string,
    colorCode?: string,
    sizeName?: string,
    variantImage?: string
  ) => {
    if (isReturnMode) {
      addVariantToReturnCart(product, colorId, sizeId, variantPrice, colorName, colorCode, sizeName, variantImage);
    } else {
      addVariantToCart(product, colorId, sizeId, variantPrice, colorName, colorCode, sizeName, variantImage);
    }
    setIsVariantDialogOpen(false);
    setSelectedProductForVariant(null);
  }, [isReturnMode, addVariantToCart, addVariantToReturnCart, setIsVariantDialogOpen, setSelectedProductForVariant]);

  return {
    handleProductWithVariants,
    handleAddVariantToCart
  };
};
