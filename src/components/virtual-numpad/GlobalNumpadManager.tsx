import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useVirtualNumpad } from '@/context/VirtualNumpadContext';
import { VirtualNumpad } from './VirtualNumpad';

/**
 * مدير عالمي للوحة الأرقام الافتراضية
 * يكتشف تلقائياً جميع الحقول الرقمية في الصفحة ويضيف لها اللوحة
 */
export const GlobalNumpadManager: React.FC = () => {
  const { isEnabled } = useVirtualNumpad();
  const [activeInput, setActiveInput] = useState<HTMLInputElement | null>(null);
  const [numpadPosition, setNumpadPosition] = useState<{ x: number; y: number } | undefined>();
  const [inputValue, setInputValue] = useState('');
  const numpadRef = useRef<HTMLDivElement>(null);

  // دالة للتحقق من أن الحقل رقمي
  const isNumericInput = useCallback((input: HTMLInputElement): boolean => {
    // التحقق من type
    if (input.type === 'number') return true;
    
    // التحقق من inputMode
    if (input.inputMode === 'numeric' || input.inputMode === 'decimal') return true;
    
    // التحقق من pattern
    if (input.pattern && /^\[0-9\]/.test(input.pattern)) return true;
    
    // التحقق من class names
    const className = input.className || '';
    if (className.includes('numeric') || className.includes('number') || className.includes('price') || className.includes('quantity')) {
      return true;
    }
    
    // التحقق من name/id
    const name = (input.name || input.id || '').toLowerCase();
    const numericKeywords = ['price', 'quantity', 'amount', 'total', 'cost', 'number', 'phone', 'tel', 'qty', 'count'];
    if (numericKeywords.some(keyword => name.includes(keyword))) {
      return true;
    }
    
    return false;
  }, []);

  // حساب موقع اللوحة بناءً على موقع الحقل
  const calculatePosition = useCallback((input: HTMLInputElement) => {
    const rect = input.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const numpadWidth = 280;
    const numpadHeight = 450;

    let x = rect.right + 10;
    let y = rect.top;

    // إذا كانت اللوحة ستخرج من الشاشة من اليمين
    if (x + numpadWidth > windowWidth) {
      x = rect.left - numpadWidth - 10;
    }

    // إذا كانت اللوحة ستخرج من الشاشة من اليسار
    if (x < 10) {
      x = Math.max(10, windowWidth - numpadWidth - 10);
      y = rect.bottom + 10;
    }

    // إذا كانت اللوحة ستخرج من الشاشة من الأسفل
    if (y + numpadHeight > windowHeight) {
      y = Math.max(10, windowHeight - numpadHeight - 10);
    }

    // إذا كانت اللوحة ستخرج من الشاشة من الأعلى
    y = Math.max(10, y);

    return { x, y };
  }, []);

  // معالج focus للحقول
  const handleInputFocus = useCallback(
    (event: FocusEvent) => {
      if (!isEnabled) return;

      const target = event.target as HTMLElement;
      if (!(target instanceof HTMLInputElement)) return;
      if (!isNumericInput(target)) return;

      // تعيين الحقل النشط
      setActiveInput(target);
      setInputValue(target.value);

      // حساب الموقع
      const position = calculatePosition(target);
      setNumpadPosition(position);

      // جعل الحقل للقراءة فقط لمنع لوحة المفاتيح الافتراضية
      target.setAttribute('readonly', 'true');
      target.setAttribute('data-numpad-active', 'true');
    },
    [isEnabled, isNumericInput, calculatePosition]
  );

  // معالج blur للحقول - لا نفعل شيء لأن اللوحة تستخدم preventDefault
  const handleInputBlur = useCallback((event: FocusEvent) => {
    // لا نفعل شيء - اللوحة تمنع blur تلقائياً
    // سنزيل readonly فقط عند إغلاق اللوحة
  }, []);

  // تحديث قيمة الحقل من اللوحة
  const handleNumpadChange = useCallback(
    (value: string) => {
      setInputValue(value);
      if (activeInput) {
        // إزالة readonly مؤقتاً للسماح بالتحديث
        const wasReadonly = activeInput.hasAttribute('readonly');
        if (wasReadonly) {
          activeInput.removeAttribute('readonly');
        }
        
        // تحديث القيمة باستخدام React's native setter
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(activeInput, value);
        } else {
          activeInput.value = value;
        }
        
        // إطلاق حدث input لتحديث React state
        const inputEvent = new Event('input', { bubbles: true });
        activeInput.dispatchEvent(inputEvent);
        
        // إطلاق حدث change أيضاً
        const changeEvent = new Event('change', { bubbles: true });
        activeInput.dispatchEvent(changeEvent);
        
        // محاولة إطلاق React synthetic event
        try {
          const reactEvent = new InputEvent('input', { 
            bubbles: true, 
            cancelable: true,
            composed: true 
          });
          activeInput.dispatchEvent(reactEvent);
        } catch (e) {
          // تجاهل الخطأ
        }
        
        // إعادة readonly
        if (wasReadonly) {
          activeInput.setAttribute('readonly', 'true');
        }
      }
    },
    [activeInput]
  );

  // إغلاق اللوحة
  const handleNumpadClose = useCallback(() => {
    if (activeInput) {
      activeInput.removeAttribute('readonly');
      activeInput.removeAttribute('data-numpad-active');
      activeInput.blur();
    }
    setActiveInput(null);
    setNumpadPosition(undefined);
  }, [activeInput]);

  // إضافة event listeners عند تفعيل الميزة
  useEffect(() => {
    if (!isEnabled) {
      // إغلاق اللوحة إذا كانت مفتوحة
      if (activeInput) {
        handleNumpadClose();
      }
      return;
    }

    // إضافة listeners لجميع الحقول في الصفحة
    document.addEventListener('focusin', handleInputFocus, true);
    document.addEventListener('focusout', handleInputBlur, true);

    return () => {
      document.removeEventListener('focusin', handleInputFocus, true);
      document.removeEventListener('focusout', handleInputBlur, true);
    };
  }, [isEnabled, handleInputFocus, handleInputBlur, activeInput, handleNumpadClose]);

  // إغلاق اللوحة عند النقر خارجها
  useEffect(() => {
    if (!activeInput) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // لا تغلق إذا تم النقر على اللوحة نفسها (باستخدام data attribute)
      const clickedElement = target.closest('[data-virtual-numpad="true"]');
      if (clickedElement) return;
      
      // لا تغلق إذا تم النقر على الحقل النشط
      if (activeInput.contains(target)) return;
      
      handleNumpadClose();
    };

    // استخدام capture phase للتأكد من الحصول على الحدث أولاً
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [activeInput, handleNumpadClose]);

  // عدم عرض شيء إذا لم تكن الميزة مفعلة أو لا يوجد حقل نشط
  if (!isEnabled || !activeInput) {
    return null;
  }

  // تحديد خصائص اللوحة بناءً على نوع الحقل
  const allowDecimal = activeInput.step !== '1' && !activeInput.classList.contains('integer-only');
  const allowNegative = !activeInput.hasAttribute('min') || parseFloat(activeInput.min) < 0;
  const maxLength = activeInput.maxLength > 0 ? activeInput.maxLength : undefined;

  // استخدام Portal لعرض اللوحة خارج DOM tree للـ Dialog
  return createPortal(
    <div ref={numpadRef}>
      <VirtualNumpad
        value={inputValue}
        onChange={handleNumpadChange}
        onClose={handleNumpadClose}
        position={numpadPosition}
        allowDecimal={allowDecimal}
        allowNegative={allowNegative}
        maxLength={maxLength}
      />
    </div>,
    document.body // عرض اللوحة مباشرة في body
  );
};
