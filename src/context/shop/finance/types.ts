/**
 * Finance Types
 * أنواع البيانات الخاصة بالمعاملات المالية
 */

import { Transaction, Expense } from '@/types';

export interface FinanceState {
  transactions: Transaction[];
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
}

export interface FinanceContextType {
  state: FinanceState;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Transaction;
  addExpense: (expense: Omit<Expense, 'id'>) => Expense;
  updateExpense: (expense: Expense) => Expense;
  deleteExpense: (expenseId: string) => void;
  refreshFinance: () => Promise<void>;
}
