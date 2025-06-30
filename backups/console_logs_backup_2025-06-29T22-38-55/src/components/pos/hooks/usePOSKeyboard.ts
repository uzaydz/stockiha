import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface UsePOSKeyboardOptions {
  onCalculatorOpen: () => void;
  onQuickReturnOpen: () => void;
  onPOSSettingsOpen: () => void;
  onRefreshData: () => Promise<void>;
  isLoading?: boolean;
}

export const usePOSKeyboard = ({
  onCalculatorOpen,
  onQuickReturnOpen,
  onPOSSettingsOpen,
  onRefreshData,
  isLoading = false
}: UsePOSKeyboardOptions) => {

  // معالجة اختصارات لوحة المفاتيح
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // اختصار Ctrl+= لفتح الآلة الحاسبة
    if (event.ctrlKey && event.key === '=' && !event.shiftKey) {
      event.preventDefault();
      onCalculatorOpen();
      return;
    }

    // اختصار Ctrl+R لفتح الإرجاع السريع
    if (event.ctrlKey && event.key === 'r' && !event.shiftKey) {
      event.preventDefault();
      onQuickReturnOpen();
      return;
    }

    // اختصار Ctrl+S لفتح الإعدادات
    if (event.ctrlKey && event.key === 's' && !event.shiftKey) {
      event.preventDefault();
      onPOSSettingsOpen();
      return;
    }

    // اختصار Ctrl+F5 للتحديث السريع
    if (event.ctrlKey && event.key === 'F5') {
      event.preventDefault();
      if (!isLoading) {
        toast.promise(
          onRefreshData(), 
          {
            loading: 'جاري تحديث البيانات...',
            success: 'تم تحديث البيانات بنجاح!',
            error: 'حدث خطأ أثناء التحديث'
          }
        );
      }
      return;
    }
  }, [onCalculatorOpen, onQuickReturnOpen, onPOSSettingsOpen, onRefreshData, isLoading]);

  // إضافة وإزالة مستمع الأحداث
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    handleKeyDown
  };
};
