import { useState, useCallback, useRef, useEffect } from 'react';
import { useVirtualNumpad } from '@/context/VirtualNumpadContext';

interface UseVirtualNumpadInputOptions {
  allowDecimal?: boolean;
  allowNegative?: boolean;
  maxLength?: number;
  onValueChange?: (value: string) => void;
}

export const useVirtualNumpadInput = (options: UseVirtualNumpadInputOptions = {}) => {
  const { isEnabled } = useVirtualNumpad();
  const [showNumpad, setShowNumpad] = useState(false);
  const [numpadPosition, setNumpadPosition] = useState<{ x: number; y: number } | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputFocus = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      if (!isEnabled) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const numpadWidth = 280; // عرض اللوحة تقريباً
      const numpadHeight = 400; // ارتفاع اللوحة تقريباً

      let x = rect.right + 10;
      let y = rect.top;

      // إذا كانت اللوحة ستخرج من الشاشة من اليمين، ضعها على اليسار
      if (x + numpadWidth > windowWidth) {
        x = rect.left - numpadWidth - 10;
      }

      // إذا كانت اللوحة ستخرج من الشاشة من الأسفل، ارفعها
      if (y + numpadHeight > windowHeight) {
        y = windowHeight - numpadHeight - 20;
      }

      // تأكد أن الموقع لا يخرج من الشاشة من الأعلى أو اليسار
      x = Math.max(10, x);
      y = Math.max(10, y);

      setNumpadPosition({ x, y });
      setShowNumpad(true);
    },
    [isEnabled]
  );

  const handleInputBlur = useCallback(() => {
    // لا نغلق اللوحة مباشرة لأن المستخدم قد ينقر على زر في اللوحة
    // اللوحة ستغلق نفسها عند النقر خارجها
  }, []);

  const handleNumpadChange = useCallback(
    (value: string) => {
      if (inputRef.current) {
        inputRef.current.value = value;
        // إطلاق حدث input لتحديث React state
        const event = new Event('input', { bubbles: true });
        inputRef.current.dispatchEvent(event);
        
        if (options.onValueChange) {
          options.onValueChange(value);
        }
      }
    },
    [options]
  );

  const handleNumpadClose = useCallback(() => {
    setShowNumpad(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }, []);

  // إغلاق اللوحة عند تعطيل الميزة
  useEffect(() => {
    if (!isEnabled && showNumpad) {
      setShowNumpad(false);
    }
  }, [isEnabled, showNumpad]);

  return {
    inputRef,
    showNumpad,
    numpadPosition,
    numpadProps: {
      value: inputRef.current?.value || '',
      onChange: handleNumpadChange,
      onClose: handleNumpadClose,
      position: numpadPosition,
      allowDecimal: options.allowDecimal,
      allowNegative: options.allowNegative,
      maxLength: options.maxLength,
    },
    inputProps: {
      ref: inputRef,
      onFocus: handleInputFocus,
      onBlur: handleInputBlur,
      readOnly: isEnabled, // اجعل الحقل للقراءة فقط عند تفعيل اللوحة الافتراضية
      inputMode: isEnabled ? 'none' as const : 'numeric' as const, // منع ظهور لوحة المفاتيح الافتراضية
    },
  };
};
