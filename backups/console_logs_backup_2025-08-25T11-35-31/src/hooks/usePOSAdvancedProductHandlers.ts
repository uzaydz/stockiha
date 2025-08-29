import { useCallback } from 'react';
import { Product } from '@/types';

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

    if (product.has_variants && product.colors && product.colors.length > 0) {
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
