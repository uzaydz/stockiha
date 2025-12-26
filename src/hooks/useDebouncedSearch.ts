import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDebouncedSearchOptions {
  /** وقت التأخير بالميلي ثانية (افتراضي: 300) */
  delay?: number;
  /** الحد الأدنى لعدد الأحرف للبدء بالبحث (افتراضي: 0) */
  minLength?: number;
  /** دالة تُنفذ عند تغيير القيمة المؤجلة */
  onDebouncedChange?: (value: string) => void;
}

interface UseDebouncedSearchReturn {
  /** القيمة الحالية (تتغير فوراً) */
  inputValue: string;
  /** القيمة المؤجلة (تتغير بعد التأخير) */
  debouncedValue: string;
  /** تعيين قيمة جديدة */
  setInputValue: (value: string) => void;
  /** مسح القيمة */
  clearSearch: () => void;
  /** هل البحث جاري (الفرق بين inputValue و debouncedValue) */
  isSearching: boolean;
}

/**
 * ⚡ Hook للبحث مع Debounce
 *
 * يؤجل تحديث قيمة البحث لتقليل عدد الطلبات
 * ويوفر تجربة بحث سلسة
 *
 * @example
 * const { inputValue, debouncedValue, setInputValue } = useDebouncedSearch({
 *   delay: 300,
 *   onDebouncedChange: (value) => fetchProducts(value)
 * });
 */
export const useDebouncedSearch = ({
  delay = 300,
  minLength = 0,
  onDebouncedChange
}: UseDebouncedSearchOptions = {}): UseDebouncedSearchReturn => {
  const [inputValue, setInputValueState] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onDebouncedChangeRef = useRef(onDebouncedChange);
  // ⚡ Ref لتتبع ما إذا كان هذا أول render (لمنع استدعاء callback عند التهيئة)
  const isFirstRenderRef = useRef(true);
  const lastCalledValueRef = useRef<string | null>(null);

  // تحديث ref عند تغيير callback
  useEffect(() => {
    onDebouncedChangeRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  // Debounce effect
  useEffect(() => {
    // إلغاء أي timeout سابق
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // ⚡ عند أول render، لا تستدعي callback (لمنع إعادة تعيين الصفحة)
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      lastCalledValueRef.current = inputValue;
      return;
    }

    // ✅ مسح البحث يجب أن يكون فورياً (بدون انتظار الـ debounce)
    if (inputValue === '') {
      setDebouncedValue('');
      if (onDebouncedChangeRef.current && lastCalledValueRef.current !== '') {
        lastCalledValueRef.current = '';
        onDebouncedChangeRef.current('');
      }
      return;
    }

    // إذا كانت القيمة أقل من الحد الأدنى، أرسل قيمة فارغة فوراً
    if (inputValue.length < minLength) {
      setDebouncedValue('');
      // ⚡ لا تستدعي callback إذا كانت نفس القيمة
      if (onDebouncedChangeRef.current && lastCalledValueRef.current !== '') {
        lastCalledValueRef.current = '';
        onDebouncedChangeRef.current('');
      }
      return;
    }

    // تأجيل التحديث
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(inputValue);
      // ⚡ لا تستدعي callback إذا كانت نفس القيمة
      if (onDebouncedChangeRef.current && lastCalledValueRef.current !== inputValue) {
        lastCalledValueRef.current = inputValue;
        onDebouncedChangeRef.current(inputValue);
      }
    }, delay);

    // تنظيف عند unmount أو تغيير القيمة
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inputValue, delay, minLength]);

  // دالة لتعيين القيمة
  const setInputValue = useCallback((value: string) => {
    setInputValueState(value);
  }, []);

  // دالة لمسح البحث
  const clearSearch = useCallback(() => {
    setInputValueState('');
    setDebouncedValue('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (onDebouncedChangeRef.current) {
      onDebouncedChangeRef.current('');
    }
  }, []);

  // حالة البحث (هل هناك فرق بين القيمتين)
  const isSearching = inputValue !== debouncedValue && inputValue.length >= minLength;

  return {
    inputValue,
    debouncedValue,
    setInputValue,
    clearSearch,
    isSearching
  };
};

/**
 * ⚡ Hook مبسط للـ debounce على أي قيمة
 */
export const useDebounce = <T>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebouncedSearch;
