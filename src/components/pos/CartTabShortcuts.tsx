import React, { useEffect } from 'react';
import { toast } from 'sonner';

interface CartTabShortcutsProps {
  activeTabId: string;
  tabs: Array<{ id: string; name: string }>;
  onSwitchTab: (tabId: string) => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string) => void;
  onDuplicateTab: (tabId: string) => void;
  isEnabled?: boolean;
}

const CartTabShortcuts: React.FC<CartTabShortcutsProps> = ({
  activeTabId,
  tabs,
  onSwitchTab,
  onAddTab,
  onCloseTab,
  onDuplicateTab,
  isEnabled = true
}) => {
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // تجاهل الاختصارات إذا كان المستخدم يكتب في حقل نص
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as any)?.contentEditable === 'true'
      ) {
        return;
      }

      // Ctrl/Cmd + T - إضافة تبويب جديد
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        try {
          onAddTab();
          toast.success('تم إضافة تبويب جديد - Ctrl+T');
        } catch (error) {
          toast.error((error as Error).message);
        }
        return;
      }

      // Ctrl/Cmd + W - إغلاق التبويب الحالي
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (tabs.length > 1) {
          onCloseTab(activeTabId);
          toast.success('تم إغلاق التبويب - Ctrl+W');
        } else {
          toast.error('لا يمكن إغلاق التبويب الأخير');
        }
        return;
      }

      // Ctrl/Cmd + D - تكرار التبويب الحالي
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        try {
          onDuplicateTab(activeTabId);
          toast.success('تم تكرار التبويب - Ctrl+D');
        } catch (error) {
          toast.error((error as Error).message);
        }
        return;
      }

      // Ctrl/Cmd + Tab - التبويب التالي
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        onSwitchTab(tabs[nextIndex].id);
        toast.success(`التبويب: ${tabs[nextIndex].name} - Ctrl+Tab`);
        return;
      }

      // Ctrl/Cmd + Shift + Tab - التبويب السابق
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        onSwitchTab(tabs[prevIndex].id);
        toast.success(`التبويب: ${tabs[prevIndex].name} - Ctrl+Shift+Tab`);
        return;
      }

      // Ctrl/Cmd + [1-9] - التبديل لتبويب محدد
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (tabIndex < tabs.length) {
          onSwitchTab(tabs[tabIndex].id);
          toast.success(`التبويب: ${tabs[tabIndex].name} - Ctrl+${e.key}`);
        }
        return;
      }

      // Alt + Left Arrow - التبويب السابق
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        onSwitchTab(tabs[prevIndex].id);
        return;
      }

      // Alt + Right Arrow - التبويب التالي
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        onSwitchTab(tabs[nextIndex].id);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isEnabled,
    activeTabId,
    tabs,
    onSwitchTab,
    onAddTab,
    onCloseTab,
    onDuplicateTab
  ]);

  return null; // هذا المكون لا يعرض أي واجهة مستخدم
};

export default CartTabShortcuts; 