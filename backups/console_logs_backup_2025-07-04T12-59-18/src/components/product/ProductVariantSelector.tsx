import React, { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CompleteProduct, ProductColor, ProductSize } from '@/lib/api/productComplete';
import { cn } from '@/lib/utils';

interface ProductVariantSelectorProps {
  product: CompleteProduct;
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  onColorSelect: (color: ProductColor) => void;
  onSizeSelect: (size: ProductSize) => void;
  className?: string;
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
  className
}) => {
  
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

  // تحسين معالج اختيار اللون
  const handleColorSelect = useCallback((color: ProductColor) => {
    onColorSelect(color);
    // إعادة تعيين المقاس إذا لم يعد متاحاً مع اللون الجديد
    if (selectedSize && color.sizes && !color.sizes.find(s => s.id === selectedSize.id)) {
      // يمكن إضافة منطق لإعادة تعيين المقاس هنا
    }
  }, [onColorSelect, selectedSize]);

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
            اللون
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
            
            return (
              <motion.button
                key={color.id}
                onClick={() => handleColorSelect(color)}
                className={cn(
                  "relative group p-1 rounded-2xl transition-all duration-300",
                  "hover:shadow-lg hover:-translate-y-1",
                  isSelected 
                    ? "bg-primary/20 shadow-lg scale-105" 
                    : "hover:bg-muted/50"
                )}
                variants={colorVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={color.name}
              >
                <div className={cn(
                  "relative flex items-center justify-center w-14 h-14 rounded-xl",
                  "border-2 transition-all duration-300 overflow-hidden",
                  isSelected 
                    ? "shadow-lg scale-105" 
                    : "border-border/30 group-hover:border-primary/50"
                )}
                style={{
                  borderWidth: isSelected ? '3px' : '2px',
                  borderColor: isSelected && color.color_code 
                    ? color.color_code 
                    : isSelected 
                    ? 'hsl(var(--primary))' 
                    : undefined
                }}>
                  {color.image_url ? (
                    <img
                      src={color.image_url}
                      alt={color.name}
                      className="w-full h-full rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : color.color_code ? (
                    <div 
                      className="w-10 h-10 rounded-lg shadow-sm"
                      style={{ backgroundColor: color.color_code }}
                    />
                  ) : (
                    <span className="text-xs font-medium text-center px-1 text-foreground">
                      {color.name.slice(0, 3)}
                    </span>
                  )}
                  
                  {/* تأثير التحديد - إضاءة لطيفة */}
                  {isSelected && (
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
                </div>
                
                {/* اسم اللون */}
                <div className={cn(
                  "absolute -bottom-8 left-1/2 -translate-x-1/2",
                  "px-2 py-1 rounded-md bg-background/90 backdrop-blur-sm",
                  "border border-border/50 shadow-sm",
                  "text-xs font-medium text-foreground",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  "whitespace-nowrap z-10"
                )}>
                  {color.name}
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
              المقاس
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
              
              return (
                <motion.button
                  key={size.id}
                  onClick={() => onSizeSelect(size)}
                  className={cn(
                    "relative px-4 py-3 min-w-[3rem] rounded-xl border-2 font-medium text-sm",
                    "transition-all duration-300 ease-out",
                    "hover:shadow-md hover:-translate-y-0.5",
                    isSelected 
                      ? "border-primary bg-primary text-primary-foreground shadow-lg scale-105" 
                      : "border-border/50 bg-background hover:border-primary/50 hover:bg-primary/5 text-foreground"
                  )}
                  variants={colorVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {size.size_name}
                  
                  {/* تأثير التحديد */}
                  {isSelected && (
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

        </motion.div>
      )}
    </motion.div>
  );
});

ProductVariantSelector.displayName = 'ProductVariantSelector';

export default ProductVariantSelector;
