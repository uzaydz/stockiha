// Expense types for the expenses management module
export type ExpenseStatus = 'pending' | 'completed' | 'cancelled';
export type RecurringFrequency = 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'yearly';
export type RecurringStatus = 'active' | 'paused' | 'completed';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  notes?: string;
  status: ExpenseStatus;
  is_recurring: boolean;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
  organization_id?: string;
  recurring?: {
    id: string;
    expense_id: string;
    frequency: RecurringFrequency;
    start_date: string;
    end_date?: string;
    next_due: string;
    created_at: string;
  };
}

export interface RecurringExpense {
  id: string;
  expense_id: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string;
  last_generated?: string;
  next_due: string;
  day_of_month?: number;
  day_of_week?: number;
  status: RecurringStatus;
  created_at: string;
  updated_at: string;
  expense?: Expense;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
}

export interface ExpenseWithRecurring extends Expense {
  recurring?: {
    id: string;
    expense_id: string;
    frequency: RecurringFrequency;
    start_date: string;
    end_date?: string;
    next_due: string;
    created_at: string;
  };
}

export interface ExpenseSummary {
  total_expenses: number;
  recurring_expenses: number;
  recurring_count: number;
  upcoming_total: number;
  upcoming_count: number;
  previous_month_change?: number;
  by_month: Record<string, number>;
  by_category: Record<string, number>;
  categories: Record<string, number>;
  recent_expenses: ExpenseWithRecurring[];
  upcoming_expenses: ExpenseWithRecurring[];
}

export interface ExpenseFilters {
  search?: string;
  category?: string | null;
  categories?: string[];
  type?: 'all' | 'regular' | 'recurring';
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  status?: string[];
  isRecurring?: boolean;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

export interface ExpenseFormData {
  title: string;
  amount: number;
  category: string;
  expense_date: Date | string;
  notes?: string;
  status?: ExpenseStatus;
  is_recurring: boolean;
  recurring?: {
    frequency: RecurringFrequency;
    start_date: Date | string;
    end_date?: Date | string;
    day_of_month?: number;
    day_of_week?: number;
  };
}

export interface ExpenseCategoryFormData {
  name: string;
  description?: string;
  icon?: string;
}
