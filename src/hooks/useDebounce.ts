import { useState, useEffect } from 'react';

/**
 * هوك لتأخير التغييرات على قيمة معينة بمقدار وقت محدد
 * مفيد لتأخير البحث أثناء الكتابة
 *
 * @param value القيمة المراد تأخيرها
 * @param delay مدة التأخير بالميللي ثانية
 * @returns القيمة بعد مرور وقت التأخير
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // تعيين مؤقت لتحديث القيمة المؤخرة بعد انتهاء وقت التأخير
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // تنظيف المؤقت عند تغيير القيمة أو إزالة المكون
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
