import React, { memo, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CompleteProduct, ProductColor, ProductSize } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';
import { getCdnImageUrl } from '@/lib/image-cdn';

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

const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.3
    }
  }
};

const colorVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: "spring" as const,
      stiffness: 300,
      damping: 30
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

  // تسجيل معلومات البيانات الواردة للتشخيص

  // تتبع الاختيار التلقائي لتجنب التكرار
  const autoSelectedColorsRef = useRef<Set<string>>(new Set());

  // ✅ تم تحديث النظام لتحميل جميع صور الألوان دائماً
  
  // تحسين فحص المتغيرات بـ useMemo
  const variantData = useMemo(() => {
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

  // تقليل الانميشن في التطوير/عناصر كثيرة/تفضيل تقليل الحركة
  const disableMotion = useMemo(() => {
    try {
      const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return Boolean(import.meta.env.DEV) || reduce || (variantData.colors.length > 12);
    } catch {
      return Boolean(import.meta.env.DEV) || (variantData.colors.length > 12);
    }
  }, [variantData.colors.length]);

  // تتبع تغييرات selectedSize (لا شيء هنا لتقليل الأثر)
  useEffect(() => {}, [selectedSize]);

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
        } else {
        }
      } else {
      }
    } else if (selectedColor && selectedSize) {
    } else if (!selectedColor) {
    }
  }, [selectedColor, selectedSize, onSizeSelect]);

  // منطق التحقق من الصحة
  const validationErrors = useMemo(() => {
    if (!showValidation || !variantData.hasVariants) return {};
    
    const errors: Record<string, string> = {};
    
    // التحقق من اختيار اللون
    if (variantData.colors.length > 0 && !selectedColor) {
      errors.color = 'يرجى اختيار اللون';
    }
    
    // التحقق من اختيار المقاس
    if (selectedColor?.has_sizes && variantData.availableSizes.length > 0 && !selectedSize) {
      errors.size = 'يرجى اختيار المقاس';
    }
    
    return errors;
  }, [showValidation, variantData, selectedColor, selectedSize]);

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
          } else {
          }
        }
      } else {
      }
    } else {
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
      <motion.div 
        className="space-y-4"
        variants={disableMotion ? undefined : sectionVariants}
      >
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold text-foreground dark:text-white">
            {productVariantSelector.color()}
          </Label>
          {selectedColor?.name && (
            <Badge 
              variant="secondary" 
              className={cn(
                "px-3 py-1 text-xs font-medium",
                "bg-primary/10 text-primary border-primary/20",
                "dark:bg-primary/20 dark:text-primary-foreground"
              )}
            >
              {selectedColor.name}
            </Badge>
          )}
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* تم تقليل اللوج الثقيل لتحسين الأداء */}

          {variantData.colors.map((color) => {
            const isSelected = selectedColor?.id === color.id;
            const isOutOfStock = (color.quantity || 0) <= 0;
            const isLowStock = (color.quantity || 0) > 0 && (color.quantity || 0) <= 5;
            
            return (
              <motion.button
                key={color.id}
                onClick={() => handleColorSelect(color)}
                disabled={isOutOfStock}
                className={cn(
                  "relative flex items-center justify-center p-3 rounded-xl border-2",
                  "transition-all duration-300 ease-out min-w-[4rem]",
                  !isOutOfStock && "hover:shadow-lg hover:-translate-y-1",
                  isSelected 
                    ? "border-primary bg-primary/10 shadow-lg scale-105" 
                    : !isOutOfStock
                    ? "border-border/50 bg-background hover:border-primary/50 hover:bg-primary/5"
                    : "border-red-200 bg-red-50 cursor-not-allowed opacity-50 dark:border-red-800 dark:bg-red-900/20"
                )}
                variants={disableMotion ? undefined : colorVariants}
                whileHover={disableMotion || isOutOfStock ? {} : { scale: 1.05 }}
                whileTap={disableMotion || isOutOfStock ? {} : { scale: 0.95 }}
                title={isOutOfStock ? `${color.name} - نفد المخزون` : color.name}
              >
                {/* عرض الصورة إذا متوفرة */}
                {color.image_url ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={getCdnImageUrl(color.image_url, { width: 48, height: 48, quality: 80 })}
                        alt={color.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-xs font-medium text-center leading-tight">
                      {color.name}
                    </span>
                  </div>
                ) : (
                  /* عرض اللون إذا لم تكن هناك صورة */
                  <div className="flex flex-col items-center gap-2">
                    <div 
                      className="w-12 h-12 rounded-lg border-2 border-gray-200"
                      style={{ backgroundColor: color.color_code || '#f3f4f6' }}
                    />
                    <span className="text-xs font-medium text-center leading-tight">
                      {color.name}
                    </span>
                  </div>
                )}
                
                {/* مؤشر نفاد المخزون */}
                {isOutOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
                    <div className="w-8 h-0.5 bg-red-500 -rotate-45 rounded-full absolute"></div>
                  </div>
                )}

                {/* مؤشر المخزون المنخفض */}
                {isLowStock && !isOutOfStock && !isSelected && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                )}
                
                {/* تأثير التحديد */}
                {isSelected && !isOutOfStock && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-primary/20 border-2 border-primary"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* قسم اختيار المقاس */}
      {variantData.availableSizes.length > 0 && (
        <motion.div 
          className="space-y-4"
          variants={sectionVariants}
        >
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold text-foreground dark:text-white">
              {productVariantSelector.size()}
            </Label>
            {selectedSize?.size_name && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "px-3 py-1 text-xs font-medium",
                  "bg-secondary/80 text-secondary-foreground border-secondary/30"
                )}
              >
                {selectedSize.size_name}
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            {variantData.availableSizes.map((size) => {
              const isSelected = selectedSize?.id === size.id;
              const isOutOfStock = (size.quantity || 0) <= 0;
              const isLowStock = (size.quantity || 0) > 0 && (size.quantity || 0) <= 5;
              
              return (
                <motion.button
                  key={size.id}
                  onClick={() => handleSizeSelect(size)}
                  disabled={isOutOfStock}
                  className={cn(
                    "relative px-4 py-3 min-w-[3rem] rounded-xl border-2 font-medium text-sm",
                    "transition-all duration-300 ease-out",
                    !isOutOfStock && "hover:shadow-md hover:-translate-y-0.5",
                    isSelected 
                      ? "border-primary bg-primary text-primary-foreground shadow-lg scale-105" 
                      : !isOutOfStock
                      ? "border-border/50 bg-background hover:border-primary/50 hover:bg-primary/5 text-foreground"
                      : "border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-500"
                  )}
                  variants={disableMotion ? undefined : colorVariants}
                  whileHover={disableMotion || isOutOfStock ? {} : { scale: 1.05 }}
                  whileTap={disableMotion || isOutOfStock ? {} : { scale: 0.95 }}
                  title={isOutOfStock ? `${size.size_name} - نفد المخزون` : size.size_name}
                >
                  {size.size_name}
                  
                  {/* مؤشر نفاد المخزون للمقاسات */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
                      <div className="w-6 h-0.5 bg-red-500 -rotate-45 rounded-full absolute"></div>
                    </div>
                  )}

                  {/* مؤشر المخزون المنخفض للمقاسات */}
                  {isLowStock && !isOutOfStock && !isSelected && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  )}
                  
                  {/* تأثير التحديد */}
                  {isSelected && !isOutOfStock && (
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-primary/10 border-2 border-primary"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* رسالة خطأ للمقاسات */}
          {validationErrors.size && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{validationErrors.size}</span>
            </motion.div>
          )}

        </motion.div>
      )}
      
      {/* رسالة خطأ للألوان */}
      {validationErrors.color && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium mt-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{validationErrors.color}</span>
        </motion.div>
      )}
    </motion.div>
  );
});

ProductVariantSelector.displayName = 'ProductVariantSelector';

export default ProductVariantSelector;
