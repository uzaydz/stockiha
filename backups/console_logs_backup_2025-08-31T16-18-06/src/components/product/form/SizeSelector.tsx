import React, { memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TagIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ProductSize, BaseFormComponentProps } from '@/types/productForm';
import { useProductPurchaseTranslation } from '@/hooks/useProductPurchaseTranslation';
import { useTranslation } from 'react-i18next';

interface SizeSelectorProps extends BaseFormComponentProps {
  sizes: ProductSize[];
  selectedValue: string;
  onSelect: (sizeId: string) => void;
  className?: string;
  compact?: boolean;
  showPrices?: boolean;
}

const SizeSelector = memo<SizeSelectorProps>(({
  sizes,
  selectedValue,
  onSelect,
  disabled = false,
  loading = false,
  className,
  compact = false,
  showPrices = true
}) => {
  const { productFormRenderer } = useProductPurchaseTranslation();
  const { t } = useTranslation();

  // تحسين البيانات مع memoization
  const processedSizes = useMemo(() => {
    return sizes.map(size => {
      const isSelected = selectedValue === size.id;
      const isOutOfStock = size.quantity !== undefined && (size.quantity || 0) <= 0;
      const isLowStock = size.quantity !== undefined && (size.quantity || 0) > 0 && (size.quantity || 0) <= 5;
      
      return {
        ...size,
        isSelected,
        isOutOfStock,
        isLowStock,
        isAvailable: !isOutOfStock
      };
    });
  }, [sizes, selectedValue]);

  // معالج اختيار المقاس - محسن لتجنب إعادة الإنشاء
  const handleSizeSelect = useCallback((sizeId: string, isAvailable: boolean) => {
    if (!disabled && !loading && isAvailable) {
      onSelect(sizeId);
    }
  }, [disabled, loading, onSelect]);

  // تحديد الأنماط الأساسية
  const getSizeButtonClass = useCallback((size: typeof processedSizes[0]) => {
    return cn(
      "relative group flex items-center justify-center gap-2 rounded-lg border transition-all duration-200",
      compact ? "px-2 py-1.5 min-w-[60px]" : "px-3 py-2 min-w-[80px]",
      size.isAvailable && !disabled && "cursor-pointer hover:shadow-md",
      size.isSelected 
        ? "border-primary bg-primary text-primary-foreground shadow-sm" 
        : size.isAvailable && !disabled
        ? "border-border hover:border-primary/50 bg-card text-foreground"
        : "border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-60 dark:border-red-800 dark:bg-red-900/20"
    );
  }, [compact, disabled]);

  // رندر محتوى المقاس
  const renderSizeContent = useCallback((size: typeof processedSizes[0]) => (
    <div className="flex flex-col items-center gap-1">
      {/* اسم المقاس */}
      <span className={cn(
        "font-semibold",
        compact ? "text-xs" : "text-sm",
        size.isOutOfStock && "line-through"
      )}>
        {size.size_name}
      </span>

      {/* السعر (إن وجد) */}
      {showPrices && size.price && !size.isOutOfStock && (
        <span className={cn(
          "opacity-75",
          compact ? "text-xs" : "text-xs"
        )}>
          {size.price.toLocaleString()} د.ج
        </span>
      )}

      {/* كمية المخزون (في الوضع المضغوط) */}
      {compact && size.quantity !== undefined && size.isAvailable && (
        <span className="text-xs opacity-60">
          {size.quantity}
        </span>
      )}
    </div>
  ), [compact, showPrices]);

  // رندر المؤشرات
  const renderIndicators = useCallback((size: typeof processedSizes[0]) => (
    <>
      {/* مؤشر نفاد المخزون للمقاسات */}
      {size.isOutOfStock && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
          <div className="w-6 h-0.5 bg-red-500 -rotate-45 rounded-full absolute"></div>
        </div>
      )}

      {/* مؤشر المخزون المنخفض */}
      {size.isLowStock && !size.isOutOfStock && (
        <div className={cn(
          "absolute bg-orange-500 rounded-full animate-pulse",
          compact ? "-top-0.5 -right-0.5 w-1.5 h-1.5" : "-top-1 -right-1 w-2 h-2"
        )} />
      )}

      {/* مؤشر الاختيار */}
      {size.isSelected && !size.isOutOfStock && (
        <div className={cn(
          "absolute bg-primary-foreground rounded-full flex items-center justify-center",
          compact ? "-top-0.5 -right-0.5 w-2.5 h-2.5" : "-top-1 -right-1 w-3 h-3"
        )}>
          <CheckIcon className={cn("text-primary", compact ? "w-1.5 h-1.5" : "w-2 h-2")} />
        </div>
      )}
    </>
  ), [compact]);

  // رندر شارات الحالة
  const renderStatusBadges = useCallback((size: typeof processedSizes[0]) => (
    <>
      {size.isOutOfStock && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
          <Badge variant="destructive" className={cn(
            "px-1 py-0 h-4",
            compact ? "text-xs" : "text-xs"
          )}>
            نفد
          </Badge>
        </div>
      )}
      {size.isLowStock && !size.isOutOfStock && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
          <Badge variant="outline" className={cn(
            "px-1 py-0 h-4 border-orange-500 text-orange-600",
            compact ? "text-xs" : "text-xs"
          )}>
            قليل
          </Badge>
        </div>
      )}
    </>
  ), [compact]);

  if (sizes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5"> {/* تقليل المسافة من space-y-2 إلى space-y-1.5 */}
      {/* عنوان القسم */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/40 flex items-center justify-center",
          compact ? "w-6 h-6" : "w-8 h-8"
        )}>
          <TagIcon className={cn("text-secondary", compact ? "w-3 h-3" : "w-4 h-4")} />
        </div>
        <Label className={cn(
          "font-semibold text-foreground",
          compact ? "text-sm" : "text-base"
        )}>
          {productFormRenderer.selectSize()}
        </Label>
        {processedSizes.some(s => s.isSelected) && (
          <Badge variant="secondary" className="text-xs">
            {processedSizes.find(s => s.isSelected)?.size_name}
          </Badge>
        )}
      </div>
      
      {/* شبكة المقاسات */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"> {/* تقليل gap من gap-3 إلى gap-2 */}
        {processedSizes.map((size) => (
          <motion.button
            key={size.id}
            type="button"
            className={getSizeButtonClass(size)}
            onClick={() => handleSizeSelect(size.id, size.isAvailable)}
            whileHover={size.isAvailable && !disabled ? { scale: 1.02 } : {}}
            whileTap={size.isAvailable && !disabled ? { scale: 0.98 } : {}}
            title={size.isOutOfStock ? `${size.size_name} - نفد المخزون` : size.size_name}
            disabled={disabled || loading || size.isOutOfStock}
            aria-label={`اختيار المقاس ${size.size_name}`}
            aria-pressed={size.isSelected}
          >
            {/* محتوى المقاس */}
            {renderSizeContent(size)}

            {/* المؤشرات */}
            {renderIndicators(size)}

            {/* شارات الحالة */}
            {renderStatusBadges(size)}
          </motion.button>
        ))}
      </div>

      {/* معلومات إضافية */}
      <div className="space-y-2">
        {/* معلومات المخزون */}
        {!compact && processedSizes.some(s => s.isLowStock || s.isOutOfStock) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {processedSizes.some(s => s.isLowStock) && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span>{t('featuredProducts.storeProducts.stock.lowStock')}</span>
              </div>
            )}
            {processedSizes.some(s => s.isOutOfStock) && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>{t('featuredProducts.storeProducts.stock.outOfStock')}</span>
              </div>
            )}
          </div>
        )}

        {/* معلومات الأسعار المتنوعة */}
        {!compact && showPrices && processedSizes.some(s => s.price) && (
          <div className="text-xs text-muted-foreground">
            <span>{t('featuredProducts.storeProducts.pricing.pricesMayVary')}</span>
          </div>
        )}
      </div>
    </div>
  );
});

SizeSelector.displayName = 'SizeSelector';

export default SizeSelector;
