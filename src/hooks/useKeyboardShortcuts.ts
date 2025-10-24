import { useEffect, useCallback, useRef, useState } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
  disabled?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  shortcuts?: KeyboardShortcut[];
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Hook لإدارة اختصارات لوحة المفاتيح في نظام POS
 * يدعم جميع المفاتيح والتركيبات (Ctrl, Shift, Alt)
 */
export const useKeyboardShortcuts = ({
  shortcuts: initialShortcuts = [],
  enabled = true,
  preventDefault = true,
}: UseKeyboardShortcutsOptions) => {
  const shortcutsRef = useRef(initialShortcuts);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // دالة لتحديث الاختصارات
  const setShortcuts = useCallback((newShortcuts: KeyboardShortcut[]) => {
    shortcutsRef.current = newShortcuts;
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // تجاهل الاختصارات عندما يكون التركيز على حقول الإدخال
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // السماح ببعض الاختصارات حتى في حقول الإدخال
      const allowedInInputFields = ['F1', 'F5', 'Escape'];
      const shouldSkip = isInputField && !allowedInInputFields.includes(event.key);

      if (shouldSkip) return;

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.disabled) continue;

        const keyMatch = event.key === shortcut.key;
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          if (preventDefault) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    },
    [enabled, preventDefault]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  // دالة لعرض نافذة المساعدة
  const showShortcutsHelp = useCallback(() => {
    setIsHelpOpen(true);
  }, []);

  const closeShortcutsHelp = useCallback(() => {
    setIsHelpOpen(false);
  }, []);

  return { 
    showShortcutsHelp, 
    closeShortcutsHelp,
    isHelpOpen, 
    setIsHelpOpen,
    setShortcuts,
    shortcuts: shortcutsRef.current 
  };
};

/**
 * اختصارات POS القياسية
 */
export const createPOSShortcuts = (actions: {
  onHelp?: () => void;
  onSearch?: () => void;
  onClearSearch?: () => void;
  onFocusBarcode?: () => void;
  onRefresh?: () => void;
  onToggleCart?: () => void;
  onToggleReturnMode?: () => void;
  onOpenSettings?: () => void;
  onOpenCalculator?: () => void;
  onCheckout?: () => void;
  onNewTab?: () => void;
  onCloseTab?: () => void;
  onNextTab?: () => void;
  onPrevTab?: () => void;
  onSaveOrder?: () => void;
  onPrint?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  onIncreaseQuantity?: () => void;
  onDecreaseQuantity?: () => void;
  onToggleFullscreen?: () => void;
}): KeyboardShortcut[] => {
  return [
    {
      key: 'F1',
      description: 'عرض المساعدة',
      action: actions.onHelp || (() => {}),
    },
    {
      key: 'F2',
      description: 'البحث عن منتج',
      action: actions.onSearch || (() => {}),
    },
    {
      key: 'F3',
      description: 'مسح البحث',
      action: actions.onClearSearch || (() => {}),
    },
    {
      key: 'F4',
      description: 'التركيز على الباركود',
      action: actions.onFocusBarcode || (() => {}),
    },
    {
      key: 'F5',
      description: 'تحديث البيانات',
      action: actions.onRefresh || (() => {}),
    },
    {
      key: 'F6',
      description: 'فتح/إغلاق السلة',
      action: actions.onToggleCart || (() => {}),
    },
    {
      key: 'F7',
      description: 'وضع الإرجاع',
      action: actions.onToggleReturnMode || (() => {}),
    },
    {
      key: 'F8',
      description: 'إعدادات POS',
      action: actions.onOpenSettings || (() => {}),
    },
    {
      key: 'F9',
      description: 'آلة حاسبة',
      action: actions.onOpenCalculator || (() => {}),
    },
    {
      key: 'F10',
      description: 'إتمام الطلب',
      action: actions.onCheckout || (() => {}),
    },
    {
      key: 'F11',
      description: 'شاشة كاملة',
      action: actions.onToggleFullscreen || (() => {}),
    },
    {
      key: 'n',
      ctrl: true,
      description: 'تبويب جديد',
      action: actions.onNewTab || (() => {}),
    },
    {
      key: 'w',
      ctrl: true,
      description: 'إغلاق التبويب',
      action: actions.onCloseTab || (() => {}),
    },
    {
      key: 'Tab',
      ctrl: true,
      description: 'التبويب التالي',
      action: actions.onNextTab || (() => {}),
    },
    {
      key: 'Tab',
      ctrl: true,
      shift: true,
      description: 'التبويب السابق',
      action: actions.onPrevTab || (() => {}),
    },
    {
      key: 's',
      ctrl: true,
      description: 'حفظ الطلب',
      action: actions.onSaveOrder || (() => {}),
    },
    {
      key: 'p',
      ctrl: true,
      description: 'طباعة',
      action: actions.onPrint || (() => {}),
    },
    {
      key: 'Escape',
      description: 'إلغاء/إغلاق',
      action: actions.onCancel || (() => {}),
    },
    {
      key: 'Enter',
      description: 'تأكيد/إضافة',
      action: actions.onConfirm || (() => {}),
      disabled: true, // معطل افتراضياً لتجنب التعارض
    },
    {
      key: '+',
      description: 'زيادة الكمية',
      action: actions.onIncreaseQuantity || (() => {}),
      disabled: true, // يتم تفعيله عند التركيز على منتج
    },
    {
      key: '-',
      description: 'تقليل الكمية',
      action: actions.onDecreaseQuantity || (() => {}),
      disabled: true, // يتم تفعيله عند التركيز على منتج
    },
  ];
};

