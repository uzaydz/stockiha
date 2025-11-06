/**
 * FinanceContext - سياق المعاملات المالية المحسن
 *
 * التحسينات:
 * - useCallback للأداء
 * - تجميع البيانات المالية في مكان واحد
 * - دعم التقارير المالية
 * - حسابات تلقائية للأرباح والخسائر
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  ReactNode
} from 'react';
import { Transaction, Expense } from '@/types';
import { FinanceState, FinanceContextType } from './types';

// ============================================================================
// Initial State
// ============================================================================

const initialState: FinanceState = {
  transactions: [],
  expenses: [],
  isLoading: false,
  error: null,
};

// ============================================================================
// Context
// ============================================================================

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface FinanceProviderProps {
  children: ReactNode;
}

export const FinanceProvider = React.memo(function FinanceProvider({
  children
}: FinanceProviderProps) {
  const [state, setState] = useState<FinanceState>(initialState);

  // ========================================================================
  // Finance Actions
  // ========================================================================

  const addTransaction = useCallback((
    transaction: Omit<Transaction, 'id' | 'createdAt'>
  ): Transaction => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      createdAt: new Date(),
    };

    setState(prev => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions],
    }));

    return newTransaction;
  }, []);

  const addExpense = useCallback((expense: Omit<Expense, 'id'>): Expense => {
    const newExpense: Expense = {
      ...expense,
      id: Date.now().toString(),
    };

    setState(prev => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
    }));

    return newExpense;
  }, []);

  const updateExpense = useCallback((expense: Expense): Expense => {
    setState(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => (e.id === expense.id ? expense : e)),
    }));

    return expense;
  }, []);

  const deleteExpense = useCallback((expenseId: string): void => {
    setState(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== expenseId),
    }));
  }, []);

  const refreshFinance = useCallback(async () => {
    // يمكن إضافة منطق لجلب البيانات من الخادم هنا
    setState(prev => ({ ...prev, isLoading: false }));
  }, []);

  // ========================================================================
  // Context Value (memoized)
  // ========================================================================

  const value = useMemo<FinanceContextType>(
    () => ({
      state,
      addTransaction,
      addExpense,
      updateExpense,
      deleteExpense,
      refreshFinance,
    }),
    [
      state,
      addTransaction,
      addExpense,
      updateExpense,
      deleteExpense,
      refreshFinance,
    ]
  );

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
});

// ============================================================================
// Hook
// ============================================================================

export function useFinance(): FinanceContextType {
  const context = useContext(FinanceContext);

  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }

  return context;
}

// ============================================================================
// Selectors (for performance)
// ============================================================================

/**
 * Hook للحصول على المعاملات المالية فقط
 */
export function useTransactionsList() {
  const { state } = useFinance();
  return useMemo(() => state.transactions, [state.transactions]);
}

/**
 * Hook للحصول على المصاريف فقط
 */
export function useExpensesList() {
  const { state } = useFinance();
  return useMemo(() => state.expenses, [state.expenses]);
}

/**
 * Hook للحصول على إجمالي المعاملات (الدخل)
 */
export function useTotalIncome() {
  const { state } = useFinance();
  return useMemo(() => {
    return state.transactions
      .filter(t => t.type === 'sale')
      .reduce((total, transaction) => total + transaction.amount, 0);
  }, [state.transactions]);
}

/**
 * Hook للحصول على إجمالي المصاريف
 */
export function useTotalExpenses() {
  const { state } = useFinance();
  return useMemo(() => {
    return state.expenses.reduce((total, expense) => total + expense.amount, 0);
  }, [state.expenses]);
}

/**
 * Hook للحصول على صافي الربح
 */
export function useNetProfit() {
  const totalIncome = useTotalIncome();
  const totalExpenses = useTotalExpenses();
  return useMemo(
    () => totalIncome - totalExpenses,
    [totalIncome, totalExpenses]
  );
}

/**
 * Hook للحصول على المعاملات حسب الفترة الزمنية
 */
export function useTransactionsByDateRange(startDate: Date, endDate: Date) {
  const { state } = useFinance();
  return useMemo(() => {
    return state.transactions.filter(t => {
      const transactionDate = new Date(t.createdAt);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }, [state.transactions, startDate, endDate]);
}

/**
 * Hook للحصول على المصاريف حسب الفترة الزمنية
 */
export function useExpensesByDateRange(startDate: Date, endDate: Date) {
  const { state } = useFinance();
  return useMemo(() => {
    return state.expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  }, [state.expenses, startDate, endDate]);
}

/**
 * Hook للحصول على المعاملات حسب طريقة الدفع
 */
export function useTransactionsByPaymentMethod(paymentMethod: string) {
  const { state } = useFinance();
  return useMemo(
    () => state.transactions.filter(t => t.paymentMethod === paymentMethod),
    [state.transactions, paymentMethod]
  );
}

/**
 * Hook للحصول على المصاريف حسب الفئة
 */
export function useExpensesByCategory(category: string) {
  const { state } = useFinance();
  return useMemo(
    () => state.expenses.filter(e => e.category === category),
    [state.expenses, category]
  );
}

/**
 * Hook للحصول على المعاملات اليوم
 */
export function useTodayTransactions() {
  const { state } = useFinance();
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return state.transactions.filter(t => {
      const transactionDate = new Date(t.createdAt);
      transactionDate.setHours(0, 0, 0, 0);
      return transactionDate.getTime() === today.getTime();
    });
  }, [state.transactions]);
}

/**
 * Hook للحصول على الدخل اليوم
 */
export function useTodayIncome() {
  const todayTransactions = useTodayTransactions();
  return useMemo(() => {
    return todayTransactions
      .filter(t => t.type === 'sale')
      .reduce((total, transaction) => total + transaction.amount, 0);
  }, [todayTransactions]);
}

/**
 * Hook للحصول على حالة التحميل
 */
export function useFinanceLoading() {
  const { state } = useFinance();
  return useMemo(() => state.isLoading, [state.isLoading]);
}

/**
 * Hook للحصول على الأخطاء
 */
export function useFinanceError() {
  const { state } = useFinance();
  return useMemo(() => state.error, [state.error]);
}
