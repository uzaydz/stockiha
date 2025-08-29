import { useState, useEffect, useRef } from 'react';

export function useSearchDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // إلغاء timeout السابق إذا وجد
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // تعيين timeout جديد
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // تنظيف عند إلغاء المكون أو تغيير القيمة
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  // تنظيف عند إلغاء المكون
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedValue;
}

export default useSearchDebounce;
