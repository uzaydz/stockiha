import { useState, useEffect } from 'react';

/**
 * Hook للتحكم في تأخير تنفيذ القيم المتغيرة (debouncing)
 * مفيد لتحسين الأداء عند البحث أو التصفية
 *
 * @param value القيمة المراد تأخيرها
 * @param delay مدة التأخير بالميللي ثانية
 * @returns القيمة بعد مرور وقت التأخير
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // تعيين مؤقت لتحديث القيمة المؤخرة بعد انتهاء وقت التأخير
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // تنظيف المؤقت عند تغيير القيمة أو إزالة المكون
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
