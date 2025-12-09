/**
 * 📦 Box Count Input Component
 *
 * مكون إدخال عدد الصناديق/الكراتين
 * يعرض معلومات الوحدات في الصندوق والسعر
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Box, Plus, Minus, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BoxCountInputProps {
  value: number;
  onChange: (count: number) => void;
  unitsPerBox: number;
  boxPrice: number;
  unitPrice?: number;
  maxBoxes?: number;
  disabled?: boolean;
  className?: string;
}

const BoxCountInput = memo<BoxCountInputProps>(({
  value,
  onChange,
  unitsPerBox,
  boxPrice,
  unitPrice,
  maxBoxes,
  disabled = false,
  className
}) => {
  const [inputValue, setInputValue] = useState(value.toString());

  // تحديث القيمة المحلية عند تغيير القيمة الخارجية
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    const numValue = parseInt(newValue, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      const clampedValue = Math.max(
        1,
        maxBoxes ? Math.min(numValue, maxBoxes) : numValue
      );
      onChange(clampedValue);
    }
  }, [onChange, maxBoxes]);

  const handleBlur = useCallback(() => {
    const numValue = parseInt(inputValue, 10);
    if (isNaN(numValue) || numValue < 1) {
      setInputValue('1');
      onChange(1);
    }
  }, [inputValue, onChange]);

  const increment = useCallback(() => {
    const newValue = value + 1;
    const clampedValue = maxBoxes ? Math.min(newValue, maxBoxes) : newValue;
    onChange(clampedValue);
  }, [value, maxBoxes, onChange]);

  const decrement = useCallback(() => {
    const newValue = Math.max(value - 1, 1);
    onChange(newValue);
  }, [value, onChange]);

  // حساب المجاميع
  const totalUnits = value * unitsPerBox;
  const totalPrice = value * boxPrice;
  const pricePerUnitInBox = boxPrice / unitsPerBox;

  // حساب التوفير إذا كان سعر الوحدة متوفر
  const savings = unitPrice ? (unitPrice * totalUnits) - totalPrice : 0;
  const savingsPercentage = unitPrice && savings > 0
    ? Math.round((savings / (unitPrice * totalUnits)) * 100)
    : 0;

  // أزرار العدد السريعة
  const quickCounts = [1, 2, 3, 5, 10];

  return (
    <div className={cn('space-y-3 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50', className)}>
      {/* العنوان */}
      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
        <Box className="w-4 h-4" />
        <Label className="text-sm font-medium">عدد الكراتين</Label>
      </div>

      {/* حقل الإدخال مع أزرار +/- */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={decrement}
          disabled={disabled || value <= 1}
          className="h-9 w-9 shrink-0 border-blue-200 hover:bg-blue-100"
        >
          <Minus className="w-4 h-4" />
        </Button>

        <div className="relative flex-1">
          <Input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            step={1}
            min={1}
            max={maxBoxes}
            disabled={disabled}
            className="text-center text-lg font-semibold pr-16 border-blue-200 focus:ring-blue-500"
            dir="ltr"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            كرتون
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={increment}
          disabled={disabled || (maxBoxes !== undefined && value >= maxBoxes)}
          className="h-9 w-9 shrink-0 border-blue-200 hover:bg-blue-100"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* أزرار العدد السريعة */}
      <div className="flex flex-wrap gap-1.5">
        {quickCounts.map((count) => (
          <Button
            key={count}
            type="button"
            variant={value === count ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(count)}
            disabled={disabled || (maxBoxes !== undefined && count > maxBoxes)}
            className={cn(
              'text-xs h-7 px-2',
              value === count
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'border-blue-200 hover:bg-blue-100'
            )}
          >
            {count}
          </Button>
        ))}
      </div>

      {/* معلومات الصندوق */}
      <div className="space-y-1.5 text-xs pt-2 border-t border-blue-200/50">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <Package className="w-3 h-3" />
            {unitsPerBox} وحدة/كرتون
          </span>
          <span className="text-muted-foreground">
            سعر الكرتون: {boxPrice.toLocaleString('ar-DZ')} د.ج
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            إجمالي الوحدات: {totalUnits}
          </span>
          <span className="text-muted-foreground">
            سعر الوحدة: {pricePerUnitInBox.toLocaleString('ar-DZ', { maximumFractionDigits: 2 })} د.ج
          </span>
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-blue-200/30">
          <span className="font-semibold text-blue-700 dark:text-blue-400">
            المجموع: {totalPrice.toLocaleString('ar-DZ')} د.ج
          </span>

          {savings > 0 && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              توفير {savingsPercentage}% ({savings.toLocaleString('ar-DZ')} د.ج)
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

BoxCountInput.displayName = 'BoxCountInput';

export default BoxCountInput;
