/**
 * مكون اختيار نوع البيع (تجزئة/جملة/نصف جملة)
 *
 * تصميم مبسط بأزرار صغيرة متناسقة مع السلة
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { SaleType } from '@/lib/pricing/wholesalePricing';
import {
  calculateProductPrice,
  toProductPricingInfo,
  isSaleTypeAvailable,
  getMinQuantityForSaleType,
} from '@/lib/pricing/wholesalePricing';
import type { Product } from '@/types';

interface SaleTypeSelectorProps {
  /** المنتج */
  product: Product;
  /** الكمية الحالية */
  quantity: number;
  /** نوع البيع الحالي */
  currentSaleType: SaleType;
  /** عند تغيير نوع البيع */
  onSaleTypeChange: (saleType: SaleType) => void;
  /** الحجم */
  size?: 'sm' | 'default';
  /** تعطيل */
  disabled?: boolean;
  /** إظهار التفاصيل */
  showDetails?: boolean;
}

const SALE_TYPE_CONFIG = {
  retail: {
    label: 'فرد',
    activeClass: 'bg-primary text-primary-foreground',
    inactiveClass: 'bg-muted/50 text-muted-foreground hover:bg-muted'
  },
  partial_wholesale: {
    label: 'ن.جملة',
    activeClass: 'bg-amber-500 text-white',
    inactiveClass: 'bg-muted/50 text-muted-foreground hover:bg-muted'
  },
  wholesale: {
    label: 'جملة',
    activeClass: 'bg-green-600 text-white',
    inactiveClass: 'bg-muted/50 text-muted-foreground hover:bg-muted'
  }
};

export const SaleTypeSelector: React.FC<SaleTypeSelectorProps> = ({
  product,
  quantity,
  currentSaleType,
  onSaleTypeChange,
  size = 'default',
  disabled = false,
}) => {
  const pricingInfo = useMemo(() => toProductPricingInfo(product), [product]);

  // حساب الخيارات المتاحة
  const availableOptions = useMemo(() => {
    const types: SaleType[] = ['retail', 'partial_wholesale', 'wholesale'];
    return types
      .filter(type => isSaleTypeAvailable(pricingInfo, type))
      .map(type => ({
        type,
        minQuantity: getMinQuantityForSaleType(pricingInfo, type),
        meetsMinQuantity: quantity >= getMinQuantityForSaleType(pricingInfo, type),
        pricing: calculateProductPrice(pricingInfo, quantity, type)
      }));
  }, [pricingInfo, quantity]);

  // إذا لم يكن هناك خيارات متعددة، نعرض شارة فقط
  if (availableOptions.length <= 1) {
    const config = SALE_TYPE_CONFIG[currentSaleType];
    return (
      <span className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
        config.activeClass
      )}>
        {config.label}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-muted/30 border border-border/50">
      {availableOptions.map(option => {
        const config = SALE_TYPE_CONFIG[option.type];
        const isActive = option.type === currentSaleType;
        const canUse = option.meetsMinQuantity;

        return (
          <button
            key={option.type}
            onClick={() => canUse && onSaleTypeChange(option.type)}
            disabled={disabled || !canUse}
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all",
              isActive ? config.activeClass : config.inactiveClass,
              !canUse && "opacity-40 cursor-not-allowed",
              canUse && !isActive && "cursor-pointer"
            )}
            title={!canUse ? `يتطلب ${option.minQuantity}+ وحدة` : config.label}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
};

/**
 * مكون مصغر لعرض نوع البيع فقط (بدون تغيير)
 */
export const SaleTypeBadge: React.FC<{
  saleType: SaleType;
  size?: 'sm' | 'default';
}> = ({ saleType, size = 'sm' }) => {
  const config = SALE_TYPE_CONFIG[saleType];

  return (
    <span className={cn(
      "inline-flex items-center rounded font-medium",
      size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
      config.activeClass
    )}>
      {config.label}
    </span>
  );
};

/**
 * مكون لعرض ملخص التوفير
 */
export const SavingsSummary: React.FC<{
  originalPrice: number;
  currentPrice: number;
  quantity: number;
}> = ({ originalPrice, currentPrice, quantity }) => {
  const savings = (originalPrice - currentPrice) * quantity;
  const savingsPercentage = originalPrice > 0 ? ((originalPrice - currentPrice) / originalPrice) * 100 : 0;

  if (savings <= 0) return null;

  return (
    <span className="inline-flex items-center text-[10px] text-green-600 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded font-medium">
      -{savingsPercentage.toFixed(0)}%
    </span>
  );
};

export default SaleTypeSelector;
