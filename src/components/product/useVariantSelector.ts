import { useMemo, useCallback, useEffect, useRef } from 'react';
import { CompleteProduct, ProductColor, ProductSize } from '@/lib/api/productComplete';

interface UseVariantSelectorProps {
  product: CompleteProduct;
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  onColorSelect: (color: ProductColor) => void;
  onSizeSelect: (size: ProductSize) => void;
}

interface VariantData {
  hasVariants: boolean;
  colors: ProductColor[];
  availableSizes: ProductSize[];
}

interface ValidationErrors {
  [key: string]: string;
}

export const useVariantSelector = ({
  product,
  selectedColor,
  selectedSize,
  onColorSelect,
  onSizeSelect
}: UseVariantSelectorProps) => {

  // تتبع الاختيار التلقائي لتجنب التكرار
  const autoSelectedColorsRef = useRef<Set<string>>(new Set());

  // تحسين فحص المتغيرات بـ useMemo
  const variantData = useMemo((): VariantData => {
    if (!product?.variants?.has_variants || !product.variants.colors || product.variants.colors.length === 0) {
      return { hasVariants: false, colors: [], availableSizes: [] };
    }

    const colors = product.variants.colors;
    const availableSizes = (selectedColor?.sizes && selectedColor.sizes.length > 0)
      ? selectedColor.sizes
      : [];

    return {
      hasVariants: true,
      colors,
      availableSizes
    };
  }, [product, selectedColor]);

  // منطق الاختيار التلقائي للمقاس عند التحميل الأولي
  useEffect(() => {
    // إذا كان هناك لون محدد لكن لا يوجد مقاس، اختر مقاس تلقائي
    if (selectedColor && !selectedSize && selectedColor.sizes && selectedColor.sizes.length > 0) {
      // تحقق من أننا لم نختار مقاس لهذا اللون من قبل
      if (!autoSelectedColorsRef.current.has(selectedColor.id)) {

        // البحث عن مقاسات متوفرة فقط
        const availableSizes = selectedColor.sizes.filter(size => (size.quantity || 0) > 0);

        if (availableSizes.length > 0) {

          // أضف اللون إلى مجموعة الألوان التي تم اختيار مقاس لها
          autoSelectedColorsRef.current.add(selectedColor.id);

          onSizeSelect(availableSizes[0]);
        }
      }
    }
  }, [selectedColor, selectedSize, onSizeSelect]);

  // منطق التحقق من الصحة
  const getValidationErrors = useCallback((showValidation: boolean): ValidationErrors => {
    if (!showValidation || !variantData.hasVariants) return {};

    const errors: ValidationErrors = {};

    // التحقق من اختيار اللون
    if (variantData.colors.length > 0 && !selectedColor) {
      errors.color = 'يرجى اختيار اللون';
    }

    // التحقق من اختيار المقاس
    if (selectedColor?.has_sizes && variantData.availableSizes.length > 0 && !selectedSize) {
      errors.size = 'يرجى اختيار المقاس';
    }

    return errors;
  }, [variantData, selectedColor, selectedSize]);

  // تحسين معالج اختيار اللون مع فحص المخزون
  const handleColorSelect = useCallback((color: ProductColor) => {

    // تحقق من التحديث بعد استدعاء onSizeSelect
    setTimeout(() => {
    }, 200);

    // منع اختيار اللون إذا لم يكن متوفر في المخزون
    if ((color.quantity || 0) <= 0) {
      return;
    }

    onColorSelect(color);

    // منطق اختيار المقاس الافتراضي عند اختيار اللون
    if (color.sizes && color.sizes.length > 0) {

      // البحث عن مقاسات متوفرة فقط (تحتوي على كمية أكبر من 0)
      const availableSizes = color.sizes.filter(size => (size.quantity || 0) > 0);

      if (availableSizes.length > 0) {
        // إذا لم يكن هناك مقاس مختار مسبقاً، اختر أول مقاس متوفر
        if (!selectedSize) {

          // أضف اللون إلى مجموعة الألوان التي تم اختيار مقاس لها
          autoSelectedColorsRef.current.add(color.id);

          onSizeSelect(availableSizes[0]);
        } else {
          // التحقق إذا كان المقاس المختار الحالي متاح في اللون الجديد
          const currentSizeStillAvailable = availableSizes.find(s => s.id === selectedSize.id);

          // إذا لم يكن المقاس الحالي متاحاً، اختر أول مقاس متوفر
          if (!currentSizeStillAvailable) {

            // أضف اللون إلى مجموعة الألوان التي تم اختيار مقاس لها
            autoSelectedColorsRef.current.add(color.id);

            onSizeSelect(availableSizes[0]);
          }
        }
      }
    }
  }, [onColorSelect, onSizeSelect, selectedSize]);

  // معالج اختيار المقاس مع فحص المخزون
  const handleSizeSelect = useCallback((size: ProductSize) => {
    // منع اختيار المقاس إذا لم يكن متوفر في المخزون
    if ((size.quantity || 0) <= 0) {
      return;
    }

    onSizeSelect(size);
  }, [onSizeSelect]);

  return {
    variantData,
    validationErrors: getValidationErrors,
    handleColorSelect,
    handleSizeSelect
  };
};
