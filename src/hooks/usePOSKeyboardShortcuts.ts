import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface POSKeyboardShortcutsOptions {
  // دوال التبويبات
  addTab?: () => void;
  removeCurrentTab?: () => void;
  nextTab?: () => void;
  previousTab?: () => void;

  // دوال السلة
  clearCart?: () => void;
  focusSearch?: () => void;

  // دوال الطلبات
  submitOrder?: () => void;
  openPaymentDialog?: () => void;

  // دوال الإرجاع
  toggleReturnMode?: () => void;

  // دوال أخرى
  refreshData?: () => void;
  printLastReceipt?: () => void;

  // حالات
  isEnabled?: boolean;
  isDialogOpen?: boolean;
}

/**
 * ⌨️ Hook لاختصارات لوحة المفاتيح في نقطة البيع
 *
 * الاختصارات المتاحة:
 * - F1: عرض قائمة الاختصارات
 * - F2: البحث السريع
 * - F3: إضافة تبويب جديد
 * - F4: إغلاق التبويب الحالي
 * - F5: تحديث البيانات
 * - F6: التبويب السابق
 * - F7: التبويب التالي
 * - F8: وضع الإرجاع
 * - F9: فتح نافذة الدفع
 * - F10: إتمام الطلب
 * - F11: طباعة آخر فاتورة
 * - Escape: إلغاء / إغلاق
 * - Ctrl+Delete: مسح السلة
 */
export const usePOSKeyboardShortcuts = ({
  addTab,
  removeCurrentTab,
  nextTab,
  previousTab,
  clearCart,
  focusSearch,
  submitOrder,
  openPaymentDialog,
  toggleReturnMode,
  refreshData,
  printLastReceipt,
  isEnabled = true,
  isDialogOpen = false
}: POSKeyboardShortcutsOptions) => {
  const lastKeyTimeRef = useRef<number>(0);
  const showHelpRef = useRef<boolean>(false);

  // عرض قائمة الاختصارات
  const showShortcutsHelp = useCallback(() => {
    if (showHelpRef.current) return;
    showHelpRef.current = true;

    toast.info(
      <div className="text-right space-y-1" dir="rtl">
        <div className="font-bold mb-2">⌨️ اختصارات لوحة المفاتيح:</div>
        <div>F1 - عرض المساعدة</div>
        <div>F2 - البحث السريع</div>
        <div>F3 - تبويب جديد</div>
        <div>F4 - إغلاق التبويب</div>
        <div>F5 - تحديث</div>
        <div>F6/F7 - التنقل بين التبويبات</div>
        <div>F8 - وضع الإرجاع</div>
        <div>F9 - نافذة الدفع</div>
        <div>F10 - إتمام الطلب</div>
        <div>Ctrl+Del - مسح السلة</div>
      </div>,
      {
        duration: 8000,
        onDismiss: () => {
          showHelpRef.current = false;
        },
        onAutoClose: () => {
          showHelpRef.current = false;
        }
      }
    );
  }, []);

  // معالج الضغط على المفاتيح
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // تجاهل إذا كان الـ hook معطل أو هناك dialog مفتوح
    if (!isEnabled || isDialogOpen) return;

    // تجاهل إذا كان التركيز في input أو textarea (ما عدا F keys)
    const target = event.target as HTMLElement;
    const isInputFocused =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;

    // منع التكرار السريع
    const now = Date.now();
    if (now - lastKeyTimeRef.current < 200) return;
    lastKeyTimeRef.current = now;

    // معالجة الاختصارات
    switch (event.key) {
      case 'F1':
        event.preventDefault();
        showShortcutsHelp();
        break;

      case 'F2':
        event.preventDefault();
        if (focusSearch) {
          focusSearch();
          toast.info('اكتب للبحث...', { duration: 1500 });
        }
        break;

      case 'F3':
        event.preventDefault();
        if (addTab) {
          addTab();
          toast.success('تم إضافة تبويب جديد', { duration: 1500 });
        }
        break;

      case 'F4':
        event.preventDefault();
        if (removeCurrentTab) {
          removeCurrentTab();
        }
        break;

      case 'F5':
        event.preventDefault();
        if (refreshData) {
          refreshData();
          toast.info('جاري تحديث البيانات...', { duration: 1500 });
        }
        break;

      case 'F6':
        event.preventDefault();
        if (previousTab) {
          previousTab();
        }
        break;

      case 'F7':
        event.preventDefault();
        if (nextTab) {
          nextTab();
        }
        break;

      case 'F8':
        event.preventDefault();
        if (toggleReturnMode) {
          toggleReturnMode();
        }
        break;

      case 'F9':
        event.preventDefault();
        if (openPaymentDialog) {
          openPaymentDialog();
        }
        break;

      case 'F10':
        event.preventDefault();
        if (submitOrder) {
          submitOrder();
        }
        break;

      case 'F11':
        event.preventDefault();
        if (printLastReceipt) {
          printLastReceipt();
        }
        break;

      case 'Delete':
        if (event.ctrlKey && !isInputFocused) {
          event.preventDefault();
          if (clearCart) {
            clearCart();
          }
        }
        break;

      case 'Escape':
        // لا نمنع الـ default لـ Escape لأنه يُستخدم لإغلاق dialogs
        break;

      default:
        break;
    }
  }, [
    isEnabled,
    isDialogOpen,
    showShortcutsHelp,
    addTab,
    removeCurrentTab,
    nextTab,
    previousTab,
    clearCart,
    focusSearch,
    submitOrder,
    openPaymentDialog,
    toggleReturnMode,
    refreshData,
    printLastReceipt
  ]);

  // تسجيل event listener
  useEffect(() => {
    if (!isEnabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEnabled, handleKeyDown]);

  return {
    showShortcutsHelp
  };
};

export default usePOSKeyboardShortcuts;
