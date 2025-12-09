/**
 * 🔄 Selling Unit Selector Component
 *
 * مكون اختيار نوع وحدة البيع
 * يعرض الخيارات المتاحة للمنتج: قطعة، وزن، علبة، متر
 */

import { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Package, Scale, Box, Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SellingUnit } from '@/lib/pricing/wholesalePricing';
import { getSellingUnitLabel, getAvailableSellingUnits } from '@/lib/pricing/wholesalePricing';

interface ProductForSelling {
  price: number;
  sell_by_weight?: boolean;
  weight_unit?: 'kg' | 'g' | 'lb' | 'oz';
  price_per_weight_unit?: number;
  sell_by_box?: boolean;
  units_per_box?: number;
  box_price?: number;
  sell_by_meter?: boolean;
  price_per_meter?: number;
}

interface SellingUnitSelectorProps {
  product: ProductForSelling;
  value: SellingUnit;
  onChange: (unit: SellingUnit) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

const unitIcons: Record<SellingUnit, React.ElementType> = {
  piece: Package,
  weight: Scale,
  box: Box,
  meter: Ruler,
};

const unitColors: Record<SellingUnit, string> = {
  piece: 'text-slate-600 bg-slate-100 border-slate-300 hover:bg-slate-200',
  weight: 'text-emerald-600 bg-emerald-100 border-emerald-300 hover:bg-emerald-200',
  box: 'text-blue-600 bg-blue-100 border-blue-300 hover:bg-blue-200',
  meter: 'text-purple-600 bg-purple-100 border-purple-300 hover:bg-purple-200',
};

const unitActiveColors: Record<SellingUnit, string> = {
  piece: 'bg-slate-600 text-white border-slate-600',
  weight: 'bg-emerald-600 text-white border-emerald-600',
  box: 'bg-blue-600 text-white border-blue-600',
  meter: 'bg-purple-600 text-white border-purple-600',
};

const SellingUnitSelector = memo<SellingUnitSelectorProps>(({
  product,
  value,
  onChange,
  disabled = false,
  className,
  compact = false,
}) => {
  // الحصول على الوحدات المتاحة
  const availableUnits = useMemo(() => getAvailableSellingUnits(product), [product]);

  // إذا كانت هناك وحدة واحدة فقط، لا نعرض المحدد
  if (availableUnits.length <= 1) {
    return null;
  }

  // الحصول على معلومات السعر لكل وحدة
  const getUnitPriceInfo = (unit: SellingUnit): string => {
    switch (unit) {
      case 'piece':
        return `${product.price.toLocaleString('ar-DZ')} د.ج`;
      case 'weight':
        return product.price_per_weight_unit
          ? `${product.price_per_weight_unit.toLocaleString('ar-DZ')} د.ج/${product.weight_unit || 'كغ'}`
          : '';
      case 'box':
        return product.box_price
          ? `${product.box_price.toLocaleString('ar-DZ')} د.ج (${product.units_per_box} وحدة)`
          : '';
      case 'meter':
        return product.price_per_meter
          ? `${product.price_per_meter.toLocaleString('ar-DZ')} د.ج/م`
          : '';
      default:
        return '';
    }
  };

  if (compact) {
    return (
      <div className={cn('flex gap-1', className)}>
        {availableUnits.map((unit) => {
          const Icon = unitIcons[unit];
          const isActive = value === unit;

          return (
            <Button
              key={unit}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(unit)}
              disabled={disabled}
              className={cn(
                'h-8 px-2 border transition-colors',
                isActive ? unitActiveColors[unit] : unitColors[unit]
              )}
              title={`${getSellingUnitLabel(unit)} - ${getUnitPriceInfo(unit)}`}
            >
              <Icon className="w-4 h-4" />
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm font-medium text-muted-foreground">
        نوع البيع
      </Label>

      <div className="grid grid-cols-2 gap-2">
        {availableUnits.map((unit) => {
          const Icon = unitIcons[unit];
          const isActive = value === unit;
          const priceInfo = getUnitPriceInfo(unit);

          return (
            <Button
              key={unit}
              type="button"
              variant="outline"
              onClick={() => onChange(unit)}
              disabled={disabled}
              className={cn(
                'h-auto py-2 px-3 flex flex-col items-start gap-1 border transition-all',
                isActive
                  ? unitActiveColors[unit]
                  : unitColors[unit]
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="font-medium">{getSellingUnitLabel(unit)}</span>
              </div>
              {priceInfo && (
                <span className={cn(
                  'text-xs',
                  isActive ? 'text-white/80' : 'text-muted-foreground'
                )}>
                  {priceInfo}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
});

SellingUnitSelector.displayName = 'SellingUnitSelector';

export default SellingUnitSelector;
