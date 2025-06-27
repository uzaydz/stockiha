import { useState, useEffect } from 'react';

/**
 * Hook لحفظ واسترجاع البيانات من localStorage مع إدارة الحالة
 * يدعم TypeScript ويعمل بشكل آمن في البيئات التي لا تدعم localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // قراءة القيمة من localStorage أو استخدام القيمة الافتراضية
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }
      
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  // وظيفة لتحديث القيمة في الحالة و localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // السماح بتمرير دالة لتحديث القيمة
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      
      // حفظ في localStorage إذا كان متاحاً
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
    }
  };

  return [storedValue, setValue];
}
