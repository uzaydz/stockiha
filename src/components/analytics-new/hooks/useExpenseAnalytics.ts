/**
 * ============================================
 * STOCKIHA ANALYTICS - EXPENSE DATA HOOK
 * جلب وتحليل بيانات المصاريف
 * ============================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/tenant';
import type { ExpenseByCategory as ExpenseByCategoryType, ExpenseData, ExpenseTrend, FilterState } from '../types';
import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';

// ==================== Types ====================

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  count?: number;
  label?: string;
}

export interface CategoryBreakdown {
  id: string;
  name: string;
  value: number;
  count: number;
  percentage: number;
}

export interface TopExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

export interface UseExpenseAnalyticsReturn {
  data: ExpenseData | null;
  isLoading: boolean;
  error: Error | null;
}

// ==================== SQL Query ====================

const buildExpenseQuery = (orgId: string, filters: FilterState) => {
  const { dateRange } = filters;

  // ⚡ استعلام المصاريف الأساسي
  const sql = `
    SELECT
      id,
      title,
      amount,
      description,
      expense_date,
      category_id,
      category,
      payment_method,
      is_recurring,
      created_at
    FROM expenses
    WHERE organization_id = ?
      AND (
        substr(expense_date, 1, 10) >= ?
        AND substr(expense_date, 1, 10) <= ?
      )
      AND (is_deleted IS NULL OR is_deleted = 0)
    ORDER BY expense_date DESC
  `;

  const params = [
    orgId,
    format(dateRange.start, 'yyyy-MM-dd'),
    format(dateRange.end, 'yyyy-MM-dd'),
  ];

  return { sql, params };
};

// ==================== Data Processing ====================

const processExpenseTimeSeries = (
  expenses: any[],
  dateRange: { start: Date; end: Date }
): TimeSeriesDataPoint[] => {
  if (!expenses || expenses.length === 0) {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    return days.slice(0, 30).map((date) => ({
      date: format(date, 'd/M', { locale: ar }),
      value: 0,
      count: 0,
    }));
  }

  const daysDiff = Math.ceil(
    (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  );

  let intervals: Date[];
  let formatPattern: string;
  let groupPattern: string;

  if (daysDiff > 90) {
    intervals = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    formatPattern = "MMM yyyy";
    groupPattern = "yyyy-MM";
  } else if (daysDiff > 30) {
    intervals = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end });
    formatPattern = "d MMM";
    groupPattern = "yyyy-ww";
  } else {
    intervals = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    formatPattern = "d/M";
    groupPattern = "yyyy-MM-dd";
  }

  // Group expenses by date
  const expensesByDate = new Map<string, { amount: number; count: number }>();

  expenses.forEach((expense) => {
    try {
      const expenseDate = expense.expense_date || expense.created_at;
      if (!expenseDate) return;

      const date = format(parseISO(expenseDate), groupPattern);

      if (!expensesByDate.has(date)) {
        expensesByDate.set(date, { amount: 0, count: 0 });
      }

      const data = expensesByDate.get(date)!;
      data.amount += Number(expense.amount) || 0;
      data.count += 1;
    } catch (e) {
      console.warn('[useExpenseAnalytics] Error parsing expense date:', e);
    }
  });

  return intervals.map((date) => {
    const dateKey = format(date, groupPattern);
    const data = expensesByDate.get(dateKey) || { amount: 0, count: 0 };

    return {
      date: format(date, formatPattern, { locale: ar }),
      value: data.amount,
      count: data.count,
      label: format(date, 'EEEE d MMMM', { locale: ar }),
    };
  });
};

const processExpenseByCategory = (
  expenses: any[],
  categoryLookup: Map<string, string>
): CategoryBreakdown[] => {
  if (!expenses || expenses.length === 0) return [];

  const categoryMap = new Map<string, { name: string; amount: number; count: number }>();

  expenses.forEach((expense) => {
    const categoryId = expense.category_id || expense.category || 'uncategorized';

    // ⚡ محاولة جلب الاسم من الخريطة أولاً
    // إذا لم يوجد، نتحقق مما إذا كان حقل 'category' يحتوي على اسم حقيقي وليس UUID
    const rawCategoryName = expense.category;
    const isUuid = rawCategoryName && /^[0-9a-f-]{36}$/i.test(rawCategoryName);

    let categoryName = categoryLookup.get(expense.category_id) ||
      categoryLookup.get(expense.category);

    if (!categoryName) {
      // Fallback logic
      if (rawCategoryName && !isUuid) {
        // إذا كان الاسم موجوداً وليس UUID، نستخدمه
        categoryName = rawCategoryName;
      } else {
        // إذا كان null أو UUID، نستخدم "غير مصنف"
        categoryName = 'غير مصنف';
      }
    }

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, { name: categoryName, amount: 0, count: 0 });
    }

    const cat = categoryMap.get(categoryId)!;
    cat.amount += Number(expense.amount) || 0;
    cat.count += 1;
  });

  const total = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.amount, 0);

  return Array.from(categoryMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      value: data.amount,
      count: data.count,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
};

const processExpenseByPayment = (expenses: any[]): CategoryBreakdown[] => {
  if (!expenses || expenses.length === 0) return [];

  const paymentMap = new Map<string, { amount: number; count: number }>();

  const paymentLabels: Record<string, string> = {
    cash: 'نقدي',
    card: 'بطاقة',
    bank_transfer: 'تحويل بنكي',
    ccp: 'CCP',
    baridimob: 'بريدي موب',
    credit: 'آجل',
  };

  expenses.forEach((expense) => {
    const method = expense.payment_method || 'cash';

    if (!paymentMap.has(method)) {
      paymentMap.set(method, { amount: 0, count: 0 });
    }

    const pm = paymentMap.get(method)!;
    pm.amount += Number(expense.amount) || 0;
    pm.count += 1;
  });

  const total = Array.from(paymentMap.values()).reduce((sum, p) => sum + p.amount, 0);

  return Array.from(paymentMap.entries())
    .map(([method, data]) => ({
      id: method,
      name: paymentLabels[method] || method,
      value: data.amount,
      count: data.count,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
};

const calculateRecurringExpenses = (expenses: any[]): number => {
  if (!expenses || expenses.length === 0) return 0;

  let recurringTotal = 0;

  expenses.forEach((expense) => {
    if (expense.is_recurring === 1 || expense.is_recurring === true) {
      recurringTotal += Number(expense.amount) || 0;
    }
  });

  if (recurringTotal === 0) {
    const categoryCounts = new Map<string, number[]>();

    expenses.forEach((expense) => {
      const categoryId = expense.category_id || expense.category || 'uncategorized';
      const amount = Number(expense.amount) || 0;

      if (!categoryCounts.has(categoryId)) {
        categoryCounts.set(categoryId, []);
      }
      categoryCounts.get(categoryId)!.push(amount);
    });

    categoryCounts.forEach((amounts) => {
      const amountCounts = new Map<number, number>();
      amounts.forEach((a) => {
        amountCounts.set(a, (amountCounts.get(a) || 0) + 1);
      });

      amountCounts.forEach((count, amount) => {
        if (count >= 2) {
          recurringTotal += amount;
        }
      });
    });
  }

  return recurringTotal;
};

// ==================== Main Hook ====================

export function useExpenseAnalytics(filters: FilterState): UseExpenseAnalyticsReturn {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id || '';

  // 1. استعلام المصاريف
  const expenseQuery = useMemo(() => buildExpenseQuery(orgId, filters), [orgId, filters]);
  const { data: expensesData, isLoading: expensesLoading, error: expensesError } =
    useQuery(expenseQuery.sql, expenseQuery.params);

  // 2. استعلام التصنيفات (لضمان وجود الأسماء)
  const { data: categoriesData, isLoading: categoriesLoading } =
    useQuery('SELECT id, name FROM expense_categories WHERE organization_id = ?', [orgId]);

  // بناء خريطة التصنيفات
  const categoryLookup = useMemo(() => {
    const map = new Map<string, string>();
    if (categoriesData) {
      categoriesData.forEach((cat: any) => {
        if (cat.id && cat.name) {
          map.set(cat.id, cat.name);
          // Also map by name if needed, but ID is safer
        }
      });
    }
    return map;
  }, [categoriesData]);

  // معالجة البيانات
  const expenseData = useMemo((): ExpenseData | null => {
    const expenses = (expensesData as any[]) || [];

    // Check loading only if no data
    if ((expensesLoading || categoriesLoading) && expenses.length === 0) return null;

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const expenseCount = expenses.length;

    // Calculate average
    const averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

    // Calculate days in range for daily average
    const daysDiff = Math.max(1, Math.ceil(
      (filters.dateRange.end.getTime() - filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    ));
    const dailyAverage = totalExpenses / daysDiff;
    const monthlyAverage = dailyAverage * 30;

    // Recurring expenses
    const recurringExpenses = calculateRecurringExpenses(expenses);

    // Categories Processing with Lookup
    const expensesByCategory = processExpenseByCategory(expenses, categoryLookup);

    const byCategory: ExpenseByCategoryType[] = expensesByCategory.map((c) => ({
      categoryId: c.id,
      categoryName: c.name,
      categoryColor: '#ef4444',
      amount: c.value,
      count: c.count,
      percentage: c.percentage,
      trend: 'stable',
    }));

    // Top Expenses mapping
    const topExpenses = expenses
      .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
      .slice(0, 10)
      .map((e) => {
        // Resolve Name
        let categoryName = categoryLookup.get(e.category_id) || categoryLookup.get(e.category);
        const rawCategoryName = e.category;

        // Regex to detect UUID
        const isUuid = rawCategoryName && /^[0-9a-f-]{36}$/i.test(rawCategoryName);

        if (!categoryName) {
          if (rawCategoryName && !isUuid) {
            categoryName = rawCategoryName;
          } else {
            categoryName = 'غير مصنف';
          }
        }

        return {
          id: e.id,
          description: e.title || e.description || 'بدون وصف',
          amount: Number(e.amount) || 0,
          category: categoryName,
          date: e.expense_date || e.created_at,
        };
      });

    const expensesByDay = processExpenseTimeSeries(expenses, filters.dateRange);

    const trend: ExpenseTrend[] = (() => {
      let cumulative = 0;
      return expensesByDay.map((p) => {
        const amount = Number(p.value) || 0;
        cumulative += amount;
        return {
          date: p.date,
          amount,
          cumulative,
        };
      });
    })();

    return {
      totalExpenses,
      expenseCount,
      averageExpense,
      byCategory,
      trend,
      monthlyAverage,
      dailyAverage,
      recurringExpenses,
      oneTimeExpenses: totalExpenses - recurringExpenses,
      expensesByDay,
      expensesByCategory,
      expensesByPaymentMethod: processExpenseByPayment(expenses),
      topExpenses,
      expenseToRevenueRatio: 0,
    };
  }, [expensesData, categoryLookup, filters.dateRange, expensesLoading, categoriesLoading]);

  // Unified loading state
  const isLoading = expensesLoading || categoriesLoading;
  const error = expensesError;

  return {
    data: expenseData,
    isLoading,
    error: error as Error | null,
  };
}

export default useExpenseAnalytics;
