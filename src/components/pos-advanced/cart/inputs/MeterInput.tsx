/**
 * 📏 Meter Input Component
 *
 * مكون إدخال الطول بالمتر للمنتجات التي تباع بالمتر
 * مثل الأقمشة، الكابلات، الأنابيب
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Ruler, Plus, Minus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MeterInputProps {
  value: number;
  onChange: (length: number) => void;
  pricePerMeter: number;
  rollLength?: number;
  minLength?: number;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
}

const MeterInput = memo<MeterInputProps>(({
  value,
  onChange,
  pricePerMeter,
  rollLength,
  minLength = 0.1,
  maxLength,
  disabled = false,
  className
}) => {
  const [inputValue, setInputValue] = useState(value.toString());

  // خطوة الزيادة/النقصان
  const step = 0.5;

  // تحديث القيمة المحلية عند تغيير القيمة الخارجية
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    const numValue = parseFloat(newValue);
    if (!isNaN(numValue) && numValue >= 0) {
      const effectiveMax = maxLength || rollLength;
      const clampedValue = Math.max(
        minLength,
        effectiveMax ? Math.min(numValue, effectiveMax) : numValue
      );
      onChange(clampedValue);
    }
  }, [onChange, minLength, maxLength, rollLength]);

  const handleBlur = useCallback(() => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue) || numValue < minLength) {
      setInputValue(minLength.toString());
      onChange(minLength);
    }
  }, [inputValue, minLength, onChange]);

  const increment = useCallback(() => {
    const newValue = Math.round((value + step) * 10) / 10;
    const effectiveMax = maxLength || rollLength;
    const clampedValue = effectiveMax ? Math.min(newValue, effectiveMax) : newValue;
    onChange(clampedValue);
  }, [value, step, maxLength, rollLength, onChange]);

  const decrement = useCallback(() => {
    const newValue = Math.round((value - step) * 10) / 10;
    const clampedValue = Math.max(newValue, minLength);
    onChange(clampedValue);
  }, [value, step, minLength, onChange]);

  // أطوال سريعة شائعة
  const quickLengths = [0.5, 1, 2, 3, 5, 10];

  // حساب المجموع
  const totalPrice = value * pricePerMeter;

  // حساب المتبقي من الرول إذا متوفر
  const remainingInRoll = rollLength ? rollLength - value : null;
  const effectiveMax = maxLength || rollLength;

  return (
    <div className={cn('space-y-3 p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50', className)}>
      {/* العنوان */}
      <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
        <Ruler className="w-4 h-4" />
        <Label className="text-sm font-medium">الطول (متر)</Label>
      </div>

      {/* حقل الإدخال مع أزرار +/- */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={decrement}
          disabled={disabled || value <= minLength}
          className="h-9 w-9 shrink-0 border-purple-200 hover:bg-purple-100"
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
            min={minLength}
            max={effectiveMax}
            disabled={disabled}
            className="text-center text-lg font-semibold pr-10 border-purple-200 focus:ring-purple-500"
            dir="ltr"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            م
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={increment}
          disabled={disabled || (effectiveMax !== undefined && value >= effectiveMax)}
          className="h-9 w-9 shrink-0 border-purple-200 hover:bg-purple-100"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* أزرار الطول السريعة */}
      <div className="flex flex-wrap gap-1.5">
        {quickLengths.map((length) => (
          <Button
            key={length}
            type="button"
            variant={value === length ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(length)}
            disabled={disabled || (effectiveMax !== undefined && length > effectiveMax)}
            className={cn(
              'text-xs h-7 px-2',
              value === length
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'border-purple-200 hover:bg-purple-100'
            )}
          >
            {length} م
          </Button>
        ))}
      </div>

      {/* زر لاختيار الرول كاملاً */}
      {rollLength && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(rollLength)}
          disabled={disabled || value === rollLength}
          className="w-full text-xs border-purple-200 hover:bg-purple-100"
        >
          الرول كاملاً ({rollLength} م)
        </Button>
      )}

      {/* معلومات إضافية */}
      <div className="space-y-1.5 text-xs pt-2 border-t border-purple-200/50">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            السعر: {pricePerMeter.toLocaleString('ar-DZ')} د.ج/متر
          </span>
          <span className="font-semibold text-purple-700 dark:text-purple-400">
            المجموع: {totalPrice.toLocaleString('ar-DZ')} د.ج
          </span>
        </div>

        {/* معلومات الرول */}
        {rollLength && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Info className="w-3 h-3" />
            <span>
              طول الرول: {rollLength} م
              {remainingInRoll !== null && remainingInRoll > 0 && (
                <span className="mx-1">•</span>
              )}
              {remainingInRoll !== null && remainingInRoll > 0 && (
                <span>المتبقي: {remainingInRoll.toFixed(1)} م</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* شريط التقدم للرول */}
      {rollLength && (
        <div className="space-y-1">
          <div className="h-2 bg-purple-100 dark:bg-purple-900/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((value / rollLength) * 100, 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground text-center">
            {Math.round((value / rollLength) * 100)}% من الرول
          </div>
        </div>
      )}
    </div>
  );
});

MeterInput.displayName = 'MeterInput';

export default MeterInput;
