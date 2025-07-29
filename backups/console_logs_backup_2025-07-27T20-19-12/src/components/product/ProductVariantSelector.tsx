import React, { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CompleteProduct, ProductColor, ProductSize } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';

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
      ease: [0.25, 0.46, 0.45, 0.94],
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
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const colorVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: "spring",
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
    // منع اختيار اللون إذا لم يكن متوفر في المخزون
    if ((color.quantity || 0) <= 0) {
      return;
    }
    
    onColorSelect(color);
    // إعادة تعيين المقاس إذا لم يعد متاحاً مع اللون الجديد
    if (selectedSize && color.sizes && !color.sizes.find(s => s.id === selectedSize.id)) {
      // يمكن إضافة منطق لإعادة تعيين المقاس هنا
    }
  }, [onColorSelect, selectedSize]);

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
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* قسم اختيار اللون */}
      <motion.div 
        className="space-y-4"
        variants={sectionVariants}
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
                  "relative group p-1 rounded-2xl transition-all duration-300",
                  !isOutOfStock && "hover:shadow-lg hover:-translate-y-1",
                  isSelected 
                    ? "bg-primary/20 shadow-lg scale-105" 
                    : !isOutOfStock && "hover:bg-muted/50",
                  isOutOfStock && "cursor-not-allowed opacity-40"
                )}
                variants={colorVariants}
                whileHover={!isOutOfStock ? { scale: 1.05 } : {}}
                whileTap={!isOutOfStock ? { scale: 0.95 } : {}}
                title={isOutOfStock ? `${color.name} - نفد المخزون` : color.name}
              >
                <div className={cn(
                  "relative flex items-center justify-center w-14 h-14 rounded-xl",
                  "border-2 transition-all duration-300 overflow-hidden",
                  isSelected 
                    ? "shadow-lg scale-105" 
                    : !isOutOfStock 
                    ? "border-border/30 group-hover:border-primary/50"
                    : "border-red-200 dark:border-red-800",
                  isOutOfStock && "bg-gray-100 dark:bg-gray-800"
                )}
                style={{
                  borderWidth: isSelected ? '3px' : '2px',
                  borderColor: isOutOfStock 
                    ? 'rgb(239 68 68 / 0.3)' 
                    : isSelected && color.color_code 
                    ? color.color_code 
                    : isSelected 
                    ? 'hsl(var(--primary))' 
                    : undefined
                }}>
                  {color.image_url ? (
                    <img
                      src={color.image_url}
                      alt={color.name}
                      className={cn(
                        "w-full h-full rounded-lg object-cover",
                        isOutOfStock && "grayscale opacity-50"
                      )}
                      loading="lazy"
                    />
                  ) : color.color_code ? (
                    <div 
                      className={cn(
                        "w-10 h-10 rounded-lg shadow-sm",
                        isOutOfStock && "grayscale opacity-50"
                      )}
                      style={{ backgroundColor: color.color_code }}
                    />
                  ) : (
                    <span className={cn(
                      "text-xs font-medium text-center px-1",
                      isOutOfStock ? "text-gray-400" : "text-foreground"
                    )}>
                      {color.name.slice(0, 3)}
                    </span>
                  )}
                  
                  {/* تأثير التحديد - إضاءة لطيفة */}
                  {isSelected && !isOutOfStock && (
                    <motion.div 
                      className="absolute inset-0 rounded-xl"
                      style={{
                        boxShadow: `0 0 0 2px ${color.color_code || 'hsl(var(--primary))'}, 0 0 20px ${color.color_code || 'hsl(var(--primary))'}33`
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}

                  {/* مؤشر نفاد المخزون */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-red-50/80 dark:bg-red-900/20">
                      <div className="w-8 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
                      <div className="w-8 h-0.5 bg-red-500 -rotate-45 rounded-full absolute"></div>
                    </div>
                  )}

                  {/* مؤشر المخزون المنخفض */}
                  {isLowStock && !isOutOfStock && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white dark:border-gray-900">
                      <div className="w-full h-full bg-orange-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
                
                {/* اسم اللون مع حالة المخزون */}
                <div className={cn(
                  "absolute -bottom-8 left-1/2 -translate-x-1/2",
                  "px-2 py-1 rounded-md bg-background/90 backdrop-blur-sm",
                  "border border-border/50 shadow-sm",
                  "text-xs font-medium",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  "whitespace-nowrap z-10",
                  isOutOfStock ? "text-red-500" : "text-foreground"
                )}>
                  {color.name}
                  {isOutOfStock && (
                    <span className="block text-red-500">نفد المخزون</span>
                  )}
                  {isLowStock && !isOutOfStock && (
                    <span className="block text-orange-500">مخزون منخفض ({color.quantity})</span>
                  )}
                </div>
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
                  variants={colorVariants}
                  whileHover={!isOutOfStock ? { scale: 1.05 } : {}}
                  whileTap={!isOutOfStock ? { scale: 0.95 } : {}}
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
