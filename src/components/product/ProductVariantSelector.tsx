import React, { memo, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { CompleteProduct, ProductColor, ProductSize } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';
import { useVariantSelector } from './useVariantSelector';
import { ColorSelector } from './ColorSelector';
import { SizeSelector } from './SizeSelector';
import { ValidationErrors } from './ValidationErrors';

interface ProductVariantSelectorProps {
  product: CompleteProduct;
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  onColorSelect: (color: ProductColor) => void;
  onSizeSelect: (size: ProductSize) => void;
  className?: string;
  // إضافة props جديدة للتحقق من الصحة
  showValidation?: boolean;
  hasValidationError?: boolean;
}

// تحسين الانميشن للأداء
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1
    }
  }
};

const ProductVariantSelector = memo<ProductVariantSelectorProps>(({
  product,
  selectedColor,
  selectedSize,
  onColorSelect,
  onSizeSelect,
  className,
  showValidation = false,
  hasValidationError = false
}) => {

  // استخدام الترجمة المخصصة
  const { productVariantSelector } = useProductPurchaseTranslation();

  // 🔍 Debug: تسجيل محدود لحالة المكوّن
  const renderCount = useRef(0);
  renderCount.current++;

  if (process.env.NODE_ENV === 'development' && renderCount.current <= 3) {
    try {
      // سجل موجز فقط (مرة مبكرة) لتقليل الضوضاء
      console.log('🎨 [ProductVariantSelector] component render', {
        hasProduct: !!product,
        hasVariants: !!(product?.variants?.colors?.length),
        colorsLength: product?.variants?.colors?.length || 0,
        selectedColorId: selectedColor?.id,
        selectedSizeId: selectedSize?.id
      });
    } catch {}
  }

  // استخدام custom hook للمنطق الأعمال
  const { variantData, validationErrors, handleColorSelect, handleSizeSelect } = useVariantSelector({
    product,
    selectedColor,
    selectedSize,
    onColorSelect,
    onSizeSelect
  });

  // تقليل الانميشن في التطوير/عناصر كثيرة/تفضيل تقليل الحركة
  const disableMotion = useMemo(() => {
    try {
      const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return Boolean(import.meta.env.DEV) || reduce || (variantData.colors.length > 12);
    } catch {
      return Boolean(import.meta.env.DEV) || (variantData.colors.length > 12);
    }
  }, [variantData.colors.length]);

  if (!variantData.hasVariants) {
    return null;
  }

  return (
    <motion.div
      className={cn("space-y-8", className)}
      variants={disableMotion ? undefined : containerVariants}
      initial={disableMotion ? undefined : 'hidden'}
      animate={disableMotion ? undefined : 'visible'}
    >
      {/* قسم اختيار اللون */}
      <ColorSelector
        colors={variantData.colors}
        selectedColor={selectedColor}
        disableMotion={disableMotion}
        translation={(key: string) => productVariantSelector[key as keyof typeof productVariantSelector]?.() || key}
        onColorSelect={handleColorSelect}
      />

      {/* قسم اختيار المقاس */}
      {variantData.availableSizes.length > 0 && (
        <SizeSelector
          sizes={variantData.availableSizes}
          selectedSize={selectedSize}
          disableMotion={disableMotion}
          translation={(key: string) => productVariantSelector[key as keyof typeof productVariantSelector]?.() || key}
          onSizeSelect={handleSizeSelect}
        />
      )}

      {/* رسائل الأخطاء */}
      <ValidationErrors
        errors={validationErrors(showValidation)}
        className="mt-4"
      />
    </motion.div>
  );
});

ProductVariantSelector.displayName = 'ProductVariantSelector';

export default ProductVariantSelector;
