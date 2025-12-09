import { useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
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
  setIsVariantDialogOpen: (open: boolean) => void,
  // ⚡ وضع الخسائر (اختياري)
  isLossMode?: boolean,
  addItemToLossCart?: (product: Product) => void,
  addVariantToLossCart?: (
    product: Product,
    colorId?: string,
    sizeId?: string,
    variantPrice?: number,
    colorName?: string,
    colorCode?: string,
    sizeName?: string,
    variantImage?: string
  ) => void
) => {
  // ⚡ استخدام refs لتجنب مشكلة closure القديمة
  const isLossModeRef = useRef(isLossMode);
  const isReturnModeRef = useRef(isReturnMode);
  const addItemToLossCartRef = useRef(addItemToLossCart);
  const addVariantToLossCartRef = useRef(addVariantToLossCart);

  // تحديث refs عند تغيير القيم
  useEffect(() => {
    isLossModeRef.current = isLossMode;
    isReturnModeRef.current = isReturnMode;
    addItemToLossCartRef.current = addItemToLossCart;
    addVariantToLossCartRef.current = addVariantToLossCart;
  }, [isLossMode, isReturnMode, addItemToLossCart, addVariantToLossCart]);

  // معالجة اختيار المنتجات مع المتغيرات
  const handleProductWithVariants = useCallback((product: Product) => {
    // ⚡ قراءة القيم الحالية من refs
    const currentIsLossMode = isLossModeRef.current;
    const currentIsReturnMode = isReturnModeRef.current;
    const currentAddItemToLossCart = addItemToLossCartRef.current;

    // ✅ استخدام ensureArray للتعامل مع JSON strings من SQLite
    const productColors = ensureArray(product.colors);
    const productColorsAlt = ensureArray((product as any).product_colors);

    const colors = productColors.length > 0 ? productColors : productColorsAlt;
    const hasVariants = (product.has_variants || colors.length > 0) && colors.length > 0;

    // 🔍 DEBUG
    console.log('[ProductHandlers] 🎨 Product check:', {
      name: product.name,
      isLossMode: currentIsLossMode,
      isReturnMode: currentIsReturnMode,
      hasVariants,
      hasLossCartFn: !!currentAddItemToLossCart
    });

    // ⚡ وضع الخسائر أولاً
    if (currentIsLossMode && currentAddItemToLossCart) {
      console.log('[ProductHandlers] 🔶 LOSS MODE - Adding:', product.name);

      if (hasVariants) {
        toast.info(`اختر اللون والمقاس لـ "${product.name}"`, { icon: '⚠️' });
        setSelectedProductForVariant(product);
        setIsVariantDialogOpen(true);
        return;
      }

      try {
        currentAddItemToLossCart(product);
        toast.success(`تمت إضافة "${product.name}" لسلة الخسائر`, { icon: '🔶' });
      } catch (error) {
        console.error('[ProductHandlers] ❌ خطأ:', error);
        toast.error('حدث خطأ أثناء إضافة المنتج للخسائر');
      }
      return;
    }

    // وضع الإرجاع
    if (currentIsReturnMode) {
      if (hasVariants) {
        toast.info(`اختر اللون والمقاس لـ "${product.name}"`);
        setSelectedProductForVariant(product);
        setIsVariantDialogOpen(true);
        return;
      }
      addItemToReturnCart(product);
      return;
    }

    // وضع البيع العادي
    if (hasVariants) {
      toast.info(`اختر اللون والمقاس لـ "${product.name}"`);
      setSelectedProductForVariant(product);
      setIsVariantDialogOpen(true);
      return;
    }

    try {
      addItemToCart(product);
    } catch (error) {
      console.error('[ProductHandlers] ❌ خطأ:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج');
    }
  }, [addItemToCart, addItemToReturnCart, setSelectedProductForVariant, setIsVariantDialogOpen]);

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
    // ⚡ قراءة القيم الحالية من refs
    const currentIsLossMode = isLossModeRef.current;
    const currentIsReturnMode = isReturnModeRef.current;
    const currentAddVariantToLossCart = addVariantToLossCartRef.current;

    console.log('[ProductHandlers] 🎨 Variant add:', {
      isLossMode: currentIsLossMode,
      isReturnMode: currentIsReturnMode
    });

    if (currentIsLossMode && currentAddVariantToLossCart) {
      currentAddVariantToLossCart(product, colorId, sizeId, variantPrice, colorName, colorCode, sizeName, variantImage);
      toast.success(`تمت إضافة المتغير لسلة الخسائر`, { icon: '🔶' });
    } else if (currentIsReturnMode) {
      addVariantToReturnCart(product, colorId, sizeId, variantPrice, colorName, colorCode, sizeName, variantImage);
    } else {
      addVariantToCart(product, colorId, sizeId, variantPrice, colorName, colorCode, sizeName, variantImage);
    }

    setIsVariantDialogOpen(false);
    setSelectedProductForVariant(null);
  }, [addVariantToCart, addVariantToReturnCart, setIsVariantDialogOpen, setSelectedProductForVariant]);

  return {
    handleProductWithVariants,
    handleAddVariantToCart
  };
};
