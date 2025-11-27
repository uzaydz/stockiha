/**
 * usePrintShortcuts - اختصارات لوحة المفاتيح للطباعة
 * 
 * ⚡ الاختصارات:
 * - Ctrl+P: طباعة المحدد
 * - Ctrl+A: تحديد الكل
 * - Ctrl+Shift+A: إلغاء تحديد الكل
 * - Escape: إغلاق المعاينة
 */

import { useEffect, useCallback } from 'react';

interface PrintShortcutsOptions {
  onPrint?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onEscape?: () => void;
  onPreview?: () => void;
  enabled?: boolean;
}

export const usePrintShortcuts = (options: PrintShortcutsOptions) => {
  const {
    onPrint,
    onSelectAll,
    onDeselectAll,
    onEscape,
    onPreview,
    enabled = true
  } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // تجاهل إذا كان المستخدم يكتب في حقل إدخال
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // السماح بـ Escape فقط
      if (event.key === 'Escape' && onEscape) {
        onEscape();
      }
      return;
    }

    const isCtrl = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;

    // Ctrl+P: طباعة
    if (isCtrl && event.key === 'p') {
      event.preventDefault();
      onPrint?.();
      return;
    }

    // Ctrl+A: تحديد الكل
    if (isCtrl && !isShift && event.key === 'a') {
      event.preventDefault();
      onSelectAll?.();
      return;
    }

    // Ctrl+Shift+A: إلغاء تحديد الكل
    if (isCtrl && isShift && event.key === 'A') {
      event.preventDefault();
      onDeselectAll?.();
      return;
    }

    // Ctrl+Shift+P: معاينة
    if (isCtrl && isShift && event.key === 'P') {
      event.preventDefault();
      onPreview?.();
      return;
    }

    // Escape: إغلاق
    if (event.key === 'Escape') {
      onEscape?.();
      return;
    }
  }, [enabled, onPrint, onSelectAll, onDeselectAll, onEscape, onPreview]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // إرجاع معلومات الاختصارات للعرض
  return {
    shortcuts: [
      { key: 'Ctrl+P', description: 'طباعة المحدد' },
      { key: 'Ctrl+A', description: 'تحديد الكل' },
      { key: 'Ctrl+Shift+A', description: 'إلغاء التحديد' },
      { key: 'Ctrl+Shift+P', description: 'معاينة' },
      { key: 'Esc', description: 'إغلاق' }
    ]
  };
};

export default usePrintShortcuts;
