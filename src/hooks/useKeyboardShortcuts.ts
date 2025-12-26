import { useEffect, useCallback, useRef, useState } from 'react';

// ⌨️ Electron Window API (للتحكم في النافذة من الاختصارات)
declare global {
  interface Window {
    electronAPI?: {
      window?: {
        toggleFullscreen?: () => Promise<boolean>;
        reload?: () => Promise<void>;
        toggleDevToolsNew?: () => Promise<void>;
      };
    };
  }
}

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
  disabled?: boolean;
  id?: string; // ⚡ معرف الاختصار للربط مع الاختصارات المخصصة
}

// ⚡ قراءة الاختصارات المخصصة من localStorage
const SHORTCUTS_STORAGE_KEY = 'pos-shortcuts';

interface CustomShortcut {
  id: string;
  key: string;
  ctrl?: boolean;
  alt?: boolean;
}

const getCustomShortcuts = (): CustomShortcut[] => {
  try {
    const stored = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return [];
};

// ⚡ تطبيق الاختصارات المخصصة على الاختصارات الافتراضية
const applyCustomShortcuts = (shortcuts: KeyboardShortcut[]): KeyboardShortcut[] => {
  const customShortcuts = getCustomShortcuts();
  if (customShortcuts.length === 0) return shortcuts;

  return shortcuts.map(shortcut => {
    if (!shortcut.id) return shortcut;
    const custom = customShortcuts.find(c => c.id === shortcut.id);
    if (custom) {
      return {
        ...shortcut,
        key: custom.key,
        ctrl: custom.ctrl || false,
        alt: custom.alt || false,
      };
    }
    return shortcut;
  });
};

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
  const baseShortcutsRef = useRef<KeyboardShortcut[]>([]); // ⚡ الاختصارات الأصلية
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // دالة لتحديث الاختصارات مع تطبيق التخصيصات
  const setShortcuts = useCallback((newShortcuts: KeyboardShortcut[]) => {
    baseShortcutsRef.current = newShortcuts; // حفظ الاختصارات الأصلية
    shortcutsRef.current = applyCustomShortcuts(newShortcuts); // تطبيق التخصيصات
  }, []);

  // ⚡ إعادة تحميل الاختصارات المخصصة عند التغيير
  useEffect(() => {
    const handleShortcutsUpdate = () => {
      if (baseShortcutsRef.current.length > 0) {
        shortcutsRef.current = applyCustomShortcuts(baseShortcutsRef.current);
      }
    };

    // الاستماع لحدث التحديث من نفس النافذة
    window.addEventListener('shortcuts-updated', handleShortcutsUpdate);
    // الاستماع لتغييرات localStorage من نوافذ أخرى
    window.addEventListener('storage', (e) => {
      if (e.key === SHORTCUTS_STORAGE_KEY) {
        handleShortcutsUpdate();
      }
    });

    return () => {
      window.removeEventListener('shortcuts-updated', handleShortcutsUpdate);
    };
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
      const allowedInInputFields = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Escape'];

      // السماح بالاختصارات التي تستخدم Ctrl أو Alt حتى في حقول الإدخال
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

      const shouldSkip = isInputField && !allowedInInputFields.includes(event.key) && !hasModifier;

      if (shouldSkip) return;

      // Avoid swallowing Alt+digit scanner sequences inside inputs (common wedge mode)
      if (isInputField && event.altKey && /^[0-9]$/.test(event.key)) return;

      console.log('Key Pressed:', event.key, 'Code:', event.code, 'Modifiers:', { ctrl: event.ctrlKey, meta: event.metaKey, alt: event.altKey, shift: event.shiftKey });

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.disabled) continue;

        // التحقق من المفتاح
        let keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        // ⚡ إصلاح لنظام Mac: مفتاح Option يغير الحرف (مثلاً Alt+c يصبح ç)
        // لذلك نستخدم event.code للحروف عند ضغط Alt
        if (!keyMatch && shortcut.alt && /^[a-z]$/i.test(shortcut.key)) {
          keyMatch = event.code === `Key${shortcut.key.toUpperCase()}`;
        }

        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          console.log('Shortcut Triggered:', shortcut.description);
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

    // استخدام capture: true لضمان التقاط الأحداث قبل توقفها
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
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

// ═══════════════════════════════════════════════════════════════════════════
// ⌨️ Electron Window Controls - دوال للتحكم في نافذة Electron
// ═══════════════════════════════════════════════════════════════════════════

/**
 * تبديل وضع ملء الشاشة (يعمل في Electron و Browser)
 */
export const toggleFullscreen = async (): Promise<void> => {
  // محاولة استخدام Electron API أولاً
  if (window.electronAPI?.window?.toggleFullscreen) {
    try {
      await window.electronAPI.window.toggleFullscreen();
      return;
    } catch (error) {
      console.warn('[Shortcuts] Electron fullscreen failed, trying browser API:', error);
    }
  }

  // Fallback: استخدام Browser Fullscreen API
  if (!document.fullscreenElement) {
    try {
      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.warn('[Shortcuts] Browser fullscreen failed:', error);
    }
  } else {
    try {
      await document.exitFullscreen();
    } catch (error) {
      console.warn('[Shortcuts] Exit fullscreen failed:', error);
    }
  }
};

/**
 * إعادة تحميل التطبيق
 */
export const reloadApp = async (): Promise<void> => {
  if (window.electronAPI?.window?.reload) {
    try {
      await window.electronAPI.window.reload();
      return;
    } catch (error) {
      console.warn('[Shortcuts] Electron reload failed:', error);
    }
  }
  // Fallback
  window.location.reload();
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
  onQuickCheckout?: () => void; // ⚡ بيع سريع F12
  onClearCart?: () => void; // ⚡ حذف السلة Alt+X
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
  onQuickCash?: () => void;
  onQuickCard?: () => void;
  onAddDiscount?: () => void;
  onAddCustomer?: () => void;
  // ⚡ اختصارات تبديل الأوضاع
  onModeSale?: () => void;
  onModeReturn?: () => void;
  onModeLoss?: () => void;
}): KeyboardShortcut[] => {
  return [
    {
      id: 'help',
      key: 'F1',
      description: 'عرض المساعدة',
      action: actions.onHelp || (() => { }),
    },
    {
      id: 'search',
      key: 'F2',
      description: 'البحث عن منتج',
      action: actions.onSearch || (() => { }),
    },
    {
      id: 'clearSearch',
      key: 'F3',
      description: 'مسح البحث',
      action: actions.onClearSearch || (() => { }),
    },
    {
      id: 'barcode',
      key: 'F4',
      description: 'التركيز على الباركود',
      action: actions.onFocusBarcode || (() => { }),
    },
    {
      id: 'refresh',
      key: 'F5',
      description: 'تحديث البيانات',
      action: actions.onRefresh || (() => { }),
    },
    {
      id: 'cart',
      key: 'F6',
      description: 'فتح/إغلاق السلة',
      action: actions.onToggleCart || (() => { }),
    },
    {
      id: 'return',
      key: 'F7',
      description: 'وضع الإرجاع',
      action: actions.onToggleReturnMode || (() => { }),
    },
    {
      id: 'settings',
      key: 'F8',
      description: 'إعدادات POS',
      action: actions.onOpenSettings || (() => { }),
    },
    {
      id: 'calc',
      key: 'F9',
      description: 'آلة حاسبة',
      action: actions.onOpenCalculator || (() => { }),
    },
    {
      id: 'pay',
      key: 'F10',
      description: 'إتمام الطلب',
      action: actions.onCheckout || (() => { }),
    },
    {
      id: 'fullscreen',
      key: 'F11',
      description: 'شاشة كاملة',
      action: actions.onToggleFullscreen || (() => { }),
    },
    {
      id: 'quick',
      key: 'F12',
      description: 'بيع سريع',
      action: actions.onQuickCheckout || (() => { }),
    },
    {
      id: 'cash',
      key: 'c',
      alt: true,
      description: 'دفع نقدي سريع',
      action: actions.onQuickCash || (() => { }),
    },
    {
      id: 'clearCart',
      key: 'x',
      alt: true,
      description: 'حذف السلة',
      action: actions.onClearCart || (() => { }),
    },
    // ⚡ اختصارات تبديل الأوضاع
    {
      id: 'modeSale',
      key: '1',
      alt: true,
      description: 'وضع البيع',
      action: actions.onModeSale || (() => { }),
    },
    {
      id: 'modeReturn',
      key: '2',
      alt: true,
      description: 'وضع الإرجاع',
      action: actions.onModeReturn || (() => { }),
    },
    {
      id: 'modeLoss',
      key: '3',
      alt: true,
      description: 'وضع الخسارة',
      action: actions.onModeLoss || (() => { }),
    },
    {
      id: 'card',
      key: 'k',
      alt: true,
      description: 'دفع بطاقة سريع',
      action: actions.onQuickCard || (() => { }),
    },
    {
      id: 'discount',
      key: 'd',
      alt: true,
      description: 'إضافة خصم',
      action: actions.onAddDiscount || (() => { }),
    },
    {
      id: 'customer',
      key: 'u',
      alt: true,
      description: 'اختيار عميل',
      action: actions.onAddCustomer || (() => { }),
    },
    {
      id: 'new',
      key: 'n',
      ctrl: true,
      description: 'تبويب جديد',
      action: actions.onNewTab || (() => { }),
    },
    {
      id: 'closeTab',
      key: 'w',
      ctrl: true,
      description: 'إغلاق التبويب',
      action: actions.onCloseTab || (() => { }),
    },
    {
      key: 'Tab',
      ctrl: true,
      description: 'التبويب التالي',
      action: actions.onNextTab || (() => { }),
    },
    {
      key: 'Tab',
      ctrl: true,
      shift: true,
      description: 'التبويب السابق',
      action: actions.onPrevTab || (() => { }),
    },
    {
      id: 'save',
      key: 's',
      ctrl: true,
      description: 'حفظ الطلب',
      action: actions.onSaveOrder || (() => { }),
    },
    {
      id: 'print',
      key: 'p',
      ctrl: true,
      description: 'طباعة',
      action: actions.onPrint || (() => { }),
    },
    {
      key: 'Escape',
      description: 'إلغاء/إغلاق',
      action: actions.onCancel || (() => { }),
    },
    {
      key: 'Enter',
      description: 'تأكيد/إضافة',
      action: actions.onConfirm || (() => { }),
      disabled: true, // معطل افتراضياً لتجنب التعارض
    },
    {
      key: '+',
      description: 'زيادة الكمية',
      action: actions.onIncreaseQuantity || (() => { }),
      disabled: true, // يتم تفعيله عند التركيز على منتج
    },
    {
      key: '-',
      description: 'تقليل الكمية',
      action: actions.onDecreaseQuantity || (() => { }),
      disabled: true, // يتم تفعيله عند التركيز على منتج
    },
  ];
};
