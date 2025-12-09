/**
 * 🏋️ Weight Input Component
 *
 * مكون إدخال الوزن للمنتجات التي تباع بالوزن
 * يدعم وحدات مختلفة: كيلو، جرام، رطل، أونصة
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Scale, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWeightUnitLabel } from '@/lib/pricing/wholesalePricing';

interface WeightInputProps {
  value: number;
  onChange: (weight: number) => void;
  weightUnit: 'kg' | 'g' | 'lb' | 'oz';
  pricePerUnit: number;
  minWeight?: number;
  maxWeight?: number;
  averageItemWeight?: number;
  disabled?: boolean;
  className?: string;
}

const WeightInput = memo<WeightInputProps>(({
  value,
  onChange,
  weightUnit,
  pricePerUnit,
  minWeight = 0.01,
  maxWeight,
  averageItemWeight,
  disabled = false,
  className
}) => {
  const [inputValue, setInputValue] = useState(value.toString());

  // تحديد خطوة الزيادة/النقصان بناءً على الوحدة
  const step = weightUnit === 'g' || weightUnit === 'oz' ? 10 : 0.1;

  // تحديث القيمة المحلية عند تغيير القيمة الخارجية
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    const numValue = parseFloat(newValue);
    if (!isNaN(numValue) && numValue >= 0) {
      const clampedValue = Math.max(
        minWeight,
        maxWeight ? Math.min(numValue, maxWeight) : numValue
      );
      onChange(clampedValue);
    }
  }, [onChange, minWeight, maxWeight]);

  const handleBlur = useCallback(() => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue) || numValue < minWeight) {
      setInputValue(minWeight.toString());
      onChange(minWeight);
    }
  }, [inputValue, minWeight, onChange]);

  const increment = useCallback(() => {
    const newValue = Math.round((value + step) * 100) / 100;
    const clampedValue = maxWeight ? Math.min(newValue, maxWeight) : newValue;
    onChange(clampedValue);
  }, [value, step, maxWeight, onChange]);

  const decrement = useCallback(() => {
    const newValue = Math.round((value - step) * 100) / 100;
    const clampedValue = Math.max(newValue, minWeight);
    onChange(clampedValue);
  }, [value, step, minWeight, onChange]);

  // أزرار الوزن السريعة
  const quickWeights = weightUnit === 'g' || weightUnit === 'oz'
    ? [100, 250, 500, 1000]
    : [0.25, 0.5, 1, 2];

  const totalPrice = value * pricePerUnit;
  const unitLabel = getWeightUnitLabel(weightUnit);

  return (
    <div className={cn('space-y-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50', className)}>
      {/* العنوان */}
      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
        <Scale className="w-4 h-4" />
        <Label className="text-sm font-medium">الوزن ({unitLabel})</Label>
      </div>

      {/* حقل الإدخال مع أزرار +/- */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={decrement}
          disabled={disabled || value <= minWeight}
          className="h-9 w-9 shrink-0 border-emerald-200 hover:bg-emerald-100"
        >
          <Minus className="w-4 h-4" />
        </Button>

        <div className="relative flex-1">
          <Input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            step={step}
            min={minWeight}
            max={maxWeight}
            disabled={disabled}
            className="text-center text-lg font-semibold pr-12 border-emerald-200 focus:ring-emerald-500"
            dir="ltr"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {unitLabel}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={increment}
          disabled={disabled || (maxWeight !== undefined && value >= maxWeight)}
          className="h-9 w-9 shrink-0 border-emerald-200 hover:bg-emerald-100"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* أزرار الوزن السريعة */}
      <div className="flex flex-wrap gap-1.5">
        {quickWeights.map((w) => (
          <Button
            key={w}
            type="button"
            variant={value === w ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(w)}
            disabled={disabled || (maxWeight !== undefined && w > maxWeight)}
            className={cn(
              'text-xs h-7 px-2',
              value === w
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'border-emerald-200 hover:bg-emerald-100'
            )}
          >
            {w} {unitLabel}
          </Button>
        ))}
      </div>

      {/* معلومات إضافية */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-emerald-200/50">
        <span className="text-muted-foreground">
          السعر: {pricePerUnit.toLocaleString('ar-DZ')} د.ج/{unitLabel}
        </span>
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
          المجموع: {totalPrice.toLocaleString('ar-DZ')} د.ج
        </span>
      </div>

      {/* متوسط وزن القطعة إذا متوفر */}
      {averageItemWeight && (
        <div className="text-xs text-muted-foreground">
          متوسط وزن القطعة: {averageItemWeight} {unitLabel}
          <span className="mx-1">•</span>
          ≈ {Math.round(value / averageItemWeight)} قطعة
        </div>
      )}
    </div>
  );
});

WeightInput.displayName = 'WeightInput';

export default WeightInput;
