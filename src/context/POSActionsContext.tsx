/**
 * ⚡ POSActionsContext - ربط أزرار التايتل بار بصفحة POS
 * ============================================================
 *
 * يتيح التواصل بين:
 * - أزرار التطبيقات في التايتل بار
 * - النوافذ الحوارية في صفحة POS
 *
 * ============================================================
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';

interface POSActionsContextType {
  // حالة النوافذ الحوارية
  isCalculatorOpen: boolean;
  isQuickExpenseOpen: boolean;
  isSettingsOpen: boolean;
  isCustomersOpen: boolean;

  // دوال فتح/إغلاق النوافذ
  openCalculator: () => void;
  closeCalculator: () => void;
  toggleCalculator: () => void;

  openQuickExpense: () => void;
  closeQuickExpense: () => void;
  toggleQuickExpense: () => void;

  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;

  openCustomers: () => void;
  closeCustomers: () => void;
  toggleCustomers: () => void;

  // تحديث البيانات
  triggerRefresh: () => void;
  onRefresh: (() => void) | null;
  setRefreshHandler: (handler: () => void) => void;
}

const POSActionsContext = createContext<POSActionsContextType | undefined>(undefined);

export const POSActionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // حالة النوافذ
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCustomersOpen, setIsCustomersOpen] = useState(false);

  // دوال الآلة الحاسبة
  const openCalculator = useCallback(() => {
    setIsCalculatorOpen(true);
    console.log('[POSActions] openCalculator');
  }, []);

  const closeCalculator = useCallback(() => {
    setIsCalculatorOpen(false);
  }, []);

  const toggleCalculator = useCallback(() => {
    setIsCalculatorOpen(prev => !prev);
    console.log('[POSActions] toggleCalculator');
  }, []);

  // دوال المصروفات السريعة
  const openQuickExpense = useCallback(() => {
    setIsQuickExpenseOpen(true);
    console.log('[POSActions] openQuickExpense');
  }, []);

  const closeQuickExpense = useCallback(() => {
    setIsQuickExpenseOpen(false);
  }, []);

  const toggleQuickExpense = useCallback(() => {
    setIsQuickExpenseOpen(prev => !prev);
    console.log('[POSActions] toggleQuickExpense');
  }, []);

  // دوال الإعدادات
  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
    console.log('[POSActions] openSettings');
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const toggleSettings = useCallback(() => {
    setIsSettingsOpen(prev => !prev);
    console.log('[POSActions] toggleSettings');
  }, []);

  // دوال العملاء
  const openCustomers = useCallback(() => {
    setIsCustomersOpen(true);
    console.log('[POSActions] openCustomers');
  }, []);

  const closeCustomers = useCallback(() => {
    setIsCustomersOpen(false);
  }, []);

  const toggleCustomers = useCallback(() => {
    setIsCustomersOpen(prev => !prev);
    console.log('[POSActions] toggleCustomers');
  }, []);

  // تحديث البيانات - استخدام ref بدلاً من state لتجنب infinite loop
  const refreshHandlerRef = useRef<(() => void) | null>(null);

  const triggerRefresh = useCallback(() => {
    if (refreshHandlerRef.current) {
      refreshHandlerRef.current();
      console.log('[POSActions] triggerRefresh');
    }
  }, []);

  const setRefreshHandler = useCallback((handler: () => void) => {
    refreshHandlerRef.current = handler;
  }, []);

  return (
    <POSActionsContext.Provider value={{
      isCalculatorOpen,
      isQuickExpenseOpen,
      isSettingsOpen,
      isCustomersOpen,

      openCalculator,
      closeCalculator,
      toggleCalculator,

      openQuickExpense,
      closeQuickExpense,
      toggleQuickExpense,

      openSettings,
      closeSettings,
      toggleSettings,

      openCustomers,
      closeCustomers,
      toggleCustomers,

      triggerRefresh,
      onRefresh: refreshHandlerRef.current,
      setRefreshHandler
    }}>
      {children}
    </POSActionsContext.Provider>
  );
};

export const usePOSActions = () => {
  const context = useContext(POSActionsContext);
  if (!context) {
    // إرجاع قيم افتراضية بدلاً من رمي خطأ
    // هذا يسمح باستخدام الـ hook خارج POS بدون مشاكل
    return {
      isCalculatorOpen: false,
      isQuickExpenseOpen: false,
      isSettingsOpen: false,
      isCustomersOpen: false,
      openCalculator: () => {},
      closeCalculator: () => {},
      toggleCalculator: () => {},
      openQuickExpense: () => {},
      closeQuickExpense: () => {},
      toggleQuickExpense: () => {},
      openSettings: () => {},
      closeSettings: () => {},
      toggleSettings: () => {},
      openCustomers: () => {},
      closeCustomers: () => {},
      toggleCustomers: () => {},
      triggerRefresh: () => {},
      onRefresh: null,
      setRefreshHandler: () => {}
    };
  }
  return context;
};

export default POSActionsContext;
