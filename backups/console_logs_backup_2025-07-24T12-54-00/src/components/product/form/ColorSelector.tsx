import React, { memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SwatchIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ProductColor, BaseFormComponentProps } from '@/types/productForm';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';

interface ColorSelectorProps extends BaseFormComponentProps {
  colors: ProductColor[];
  selectedValue: string;
  onSelect: (colorId: string) => void;
  className?: string;
  compact?: boolean;
}

const ColorSelector = memo<ColorSelectorProps>(({
  colors,
  selectedValue,
  onSelect,
  disabled = false,
  loading = false,
  className,
  compact = false
}) => {
  const { productFormRenderer } = useProductPurchaseTranslation();

  // تحسين البيانات مع memoization
  const processedColors = useMemo(() => {
    return colors.map(color => {
      const isSelected = selectedValue === color.id;
      const isOutOfStock = color.quantity !== undefined && (color.quantity || 0) <= 0;
      const isLowStock = color.quantity !== undefined && (color.quantity || 0) > 0 && (color.quantity || 0) <= 5;
      
      return {
        ...color,
        isSelected,
        isOutOfStock,
        isLowStock,
        isAvailable: !isOutOfStock
      };
    });
  }, [colors, selectedValue]);

  // معالج اختيار اللون - محسن لتجنب إعادة الإنشاء
  const handleColorSelect = useCallback((colorId: string, isAvailable: boolean) => {
    if (!disabled && !loading && isAvailable) {
      onSelect(colorId);
    }
  }, [disabled, loading, onSelect]);

  // تحديد الأنماط الأساسية
  const getColorButtonClass = useCallback((color: typeof processedColors[0]) => {
    return cn(
      "relative group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200",
      compact && "px-2 py-1.5 text-sm",
      color.isAvailable && !disabled && "cursor-pointer hover:shadow-md",
      color.isSelected 
        ? "border-primary bg-primary/10 text-primary shadow-sm" 
        : color.isAvailable && !disabled
        ? "border-border hover:border-primary/50 bg-card text-foreground"
        : "border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-60 dark:border-red-800 dark:bg-red-900/20"
    );
  }, [compact, disabled]);

  // رندر أيقونة اللون
  const renderColorIcon = useCallback((color: typeof processedColors[0]) => {
    const iconClass = cn(
      "rounded-full border-2 border-white shadow-sm",
      compact ? "w-4 h-4" : "w-6 h-6",
      color.isOutOfStock && "grayscale opacity-50"
    );

    if (color.image_url) {
      return (
        <img 
          src={color.image_url} 
          alt={color.name}
          className={cn(iconClass, "object-cover")}
          loading="lazy"
        />
      );
    }
    
    if (color.color_code) {
      return (
        <div 
          className={iconClass}
          style={{ backgroundColor: color.color_code }}
        />
      );
    }
    
    return (
      <div className={cn(
        iconClass,
        "bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center"
      )}>
        <SwatchIcon className={cn("text-primary", compact ? "w-2 h-2" : "w-3 h-3")} />
      </div>
    );
  }, [compact]);

  // رندر المؤشرات
  const renderIndicators = useCallback((color: typeof processedColors[0]) => (
    <>
      {/* مؤشر نفاد المخزون */}
      {color.isOutOfStock && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
          <div className="w-4 h-0.5 bg-red-500 -rotate-45 rounded-full absolute"></div>
        </div>
      )}

      {/* مؤشر المخزون المنخفض */}
      {color.isLowStock && !color.isOutOfStock && (
        <div className={cn(
          "absolute bg-orange-500 rounded-full animate-pulse",
          compact ? "-top-0.5 -right-0.5 w-1.5 h-1.5" : "-top-1 -right-1 w-2 h-2"
        )} />
      )}

      {/* مؤشر الاختيار */}
      {color.isSelected && !color.isOutOfStock && (
        <div className={cn(
          "absolute bg-primary rounded-full flex items-center justify-center",
          compact ? "-top-0.5 -right-0.5 w-2.5 h-2.5" : "-top-1 -right-1 w-3 h-3"
        )}>
          <CheckIcon className={cn("text-white", compact ? "w-1.5 h-1.5" : "w-2 h-2")} />
        </div>
      )}
    </>
  ), [compact]);

  if (colors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5"> {/* تقليل المسافة من space-y-2 إلى space-y-1.5 */}
      {/* عنوان القسم */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "rounded-lg bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center",
          compact ? "w-6 h-6" : "w-8 h-8"
        )}>
          <SwatchIcon className={cn("text-primary", compact ? "w-3 h-3" : "w-4 h-4")} />
        </div>
        <Label className={cn(
          "font-semibold text-foreground",
          compact ? "text-sm" : "text-base"
        )}>
          {productFormRenderer.selectColor()}
        </Label>
        {processedColors.some(c => c.isSelected) && (
          <Badge variant="secondary" className="text-xs">
            {processedColors.find(c => c.isSelected)?.name}
          </Badge>
        )}
      </div>
      
      {/* شبكة الألوان */}
      <div className={cn(
        "flex flex-wrap gap-2",
        compact && "gap-1.5"
      )}>
        {processedColors.map((color) => (
          <motion.button
            key={color.id}
            type="button"
            className={getColorButtonClass(color)}
            onClick={() => handleColorSelect(color.id, color.isAvailable)}
            whileHover={color.isAvailable && !disabled ? { scale: 1.02 } : {}}
            whileTap={color.isAvailable && !disabled ? { scale: 0.98 } : {}}
            title={color.isOutOfStock ? `${color.name} - نفد المخزون` : color.name}
            disabled={disabled || loading || color.isOutOfStock}
            aria-label={`اختيار اللون ${color.name}`}
            aria-pressed={color.isSelected}
          >
            {/* حاوي أيقونة اللون */}
            <div className="relative">
              {renderColorIcon(color)}
              {renderIndicators(color)}
            </div>
            
            {/* اسم اللون */}
            <span className={cn(
              "font-medium",
              compact ? "text-xs" : "text-sm",
              color.isOutOfStock && "line-through"
            )}>
              {color.name}
            </span>

            {/* حالة المخزون */}
            {color.isOutOfStock && (
              <Badge variant="destructive" className={cn(
                "px-1 py-0 h-4",
                compact ? "text-xs" : "text-xs"
              )}>
                نفد
              </Badge>
            )}
          </motion.button>
        ))}
      </div>

      {/* معلومات المخزون */}
      {!compact && processedColors.some(c => c.isLowStock || c.isOutOfStock) && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {processedColors.some(c => c.isLowStock) && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span>مخزون قليل</span>
            </div>
          )}
          {processedColors.some(c => c.isOutOfStock) && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span>نفد المخزون</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ColorSelector.displayName = 'ColorSelector';

export default ColorSelector; 