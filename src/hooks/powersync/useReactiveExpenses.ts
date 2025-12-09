/**
 * ⚡ useReactiveExpenses - PowerSync Reactive Hook
 * ============================================================
 *
 * 🚀 Hook للمصروفات مع تحديث تلقائي
 *    - يستخدم useQuery من @powersync/react
 *    - تحديث فوري عند أي تغيير
 *
 * المصادر:
 * - https://docs.powersync.com/usage/use-case-examples/watch-queries
 * ============================================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';
export type ExpensePaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'check' | 'other';

export interface ReactiveExpense {
  id: string;
  title: string;
  amount: number;
  expense_date: string;
  category: string | null;
  category_id: string | null;
  description: string | null;
  payment_method: ExpensePaymentMethod | null;
  status: ExpenseStatus;
  receipt_url: string | null;
  is_recurring: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface ReactiveExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  organization_id: string;
  created_at: string;
}

export interface UseReactiveExpensesOptions {
  categoryId?: string;
  status?: ExpenseStatus;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook - useReactiveExpenses
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للمصروفات (Reactive)
 *
 * @example
 * ```tsx
 * const { expenses, isLoading } = useReactiveExpenses();
 * // expenses يتحدث تلقائياً عند أي تغيير!
 * ```
 */
export function useReactiveExpenses(options: UseReactiveExpensesOptions = {}) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { categoryId, status, fromDate, toDate, limit = 100 } = options;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT * FROM expenses
      WHERE organization_id = ?
        AND (is_deleted = 0 OR is_deleted IS NULL)
    `;
    const queryParams: any[] = [orgId];

    // فلتر التصنيف
    if (categoryId) {
      query += ` AND category_id = ?`;
      queryParams.push(categoryId);
    }

    // فلتر الحالة
    if (status) {
      query += ` AND status = ?`;
      queryParams.push(status);
    }

    // فلتر التاريخ
    if (fromDate) {
      query += ` AND expense_date >= ?`;
      queryParams.push(fromDate);
    }
    if (toDate) {
      query += ` AND expense_date <= ?`;
      queryParams.push(toDate);
    }

    query += ` ORDER BY expense_date DESC LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [orgId, categoryId, status, fromDate, toDate, limit]);

  const { data, isLoading, isFetching, error } = useQuery<ReactiveExpense>(sql, params);

  const expenses = useMemo(() => {
    if (!data) return [];
    return data.map(e => ({
      ...e,
      amount: Number(e.amount) || 0,
      is_recurring: Boolean(e.is_recurring)
    }));
  }, [data]);

  return {
    expenses,
    isLoading,
    isFetching,
    error: error || null,
    total: expenses.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Expense Categories Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لتصنيفات المصروفات (Reactive)
 */
export function useReactiveExpenseCategories() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT * FROM expense_categories
        WHERE organization_id = ?
        ORDER BY name
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data, isLoading, error } = useQuery<ReactiveExpenseCategory>(sql, params);

  return {
    categories: data || [],
    isLoading,
    error: error || null
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Single Expense Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لمصروف واحد (Reactive)
 */
export function useReactiveExpense(expenseId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !expenseId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM expenses WHERE id = ? AND organization_id = ? LIMIT 1',
      params: [expenseId, orgId]
    };
  }, [expenseId, orgId]);

  const { data, isLoading, error } = useQuery<ReactiveExpense>(sql, params);

  const expense = useMemo(() => {
    if (!data || data.length === 0) return null;
    const e = data[0];
    return {
      ...e,
      amount: Number(e.amount) || 0,
    };
  }, [data]);

  return { expense, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Expense Stats Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لإحصائيات المصروفات (Reactive)
 */
export function useReactiveExpenseStats() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  // إحصائيات الشهر الحالي
  const monthQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as total, 0 as count', params: [] };
    }
    return {
      sql: `
        SELECT
          COALESCE(SUM(amount), 0) as total,
          COUNT(*) as count
        FROM expenses
        WHERE organization_id = ?
          AND (is_deleted = 0 OR is_deleted IS NULL)
          AND strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now')
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: monthData, isLoading: monthLoading } = useQuery<{
    total: number;
    count: number;
  }>(monthQuery.sql, monthQuery.params);

  // إحصائيات حسب التصنيف
  const byCategoryQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT
          COALESCE(category, 'غير مصنف') as category,
          SUM(amount) as total,
          COUNT(*) as count
        FROM expenses
        WHERE organization_id = ?
          AND (is_deleted = 0 OR is_deleted IS NULL)
          AND strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now')
        GROUP BY category
        ORDER BY total DESC
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: categoryData, isLoading: categoryLoading } = useQuery<{
    category: string;
    total: number;
    count: number;
  }>(byCategoryQuery.sql, byCategoryQuery.params);

  const stats = useMemo(() => {
    const byCategory: Record<string, { amount: number; count: number }> = {};

    if (categoryData) {
      for (const row of categoryData) {
        byCategory[row.category] = {
          amount: Number(row.total) || 0,
          count: Number(row.count) || 0
        };
      }
    }

    return {
      monthTotal: monthData?.[0]?.total ? Number(monthData[0].total) : 0,
      monthCount: monthData?.[0]?.count ? Number(monthData[0].count) : 0,
      byCategory
    };
  }, [monthData, categoryData]);

  return {
    stats,
    isLoading: monthLoading || categoryLoading
  };
}

export default useReactiveExpenses;
