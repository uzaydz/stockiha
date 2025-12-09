/**
 * ⚡ UnifiedExpenseService - v3.0 (PowerSync Best Practices 2025)
 * ===============================================================
 *
 * نظام Offline-First كامل للمصروفات:
 * - إضافة/تعديل/حذف محلياً
 * - تصنيفات المصروفات
 * - تقارير محلية فورية
 * - مزامنة تلقائية عند الاتصال
 *
 * ✅ يستخدم powerSyncService.query() بدل db.getAll()
 * ✅ يستخدم powerSyncService.queryOne() بدل db.get()
 * ✅ يستخدم powerSyncService.mutate() للكتابة
 * ✅ يستخدم powerSyncService.transaction() للعمليات المتعددة
 */

import { v4 as uuidv4 } from 'uuid';
import { powerSyncService } from '@/lib/powersync';

// ========================================
// 📦 Types
// ========================================

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'cheque';

export interface Expense {
  id: string;
  organization_id: string;
  title: string;
  amount: number;
  expense_date: string;

  // Details
  description?: string;
  category?: string;
  category_id?: string;

  // Payment
  payment_method?: PaymentMethod;
  reference_number?: string;

  // Media
  receipt_url?: string;

  // Metadata
  tags?: string;
  metadata?: string;
  is_recurring?: boolean;
  status?: ExpenseStatus;
  source?: string;

  // Soft delete
  is_deleted?: boolean;
  deleted_at?: string;

  // Audit
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseCategory {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseWithCategory extends Expense {
  category_details?: ExpenseCategory;
}

export interface ExpenseFilters {
  search?: string;
  category_id?: string;
  status?: ExpenseStatus;
  payment_method?: PaymentMethod;
  from_date?: string;
  to_date?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface PaginatedExpenses {
  data: ExpenseWithCategory[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ExpenseStats {
  total_expenses: number;
  total_amount: number;
  pending_amount: number;
  by_category: Array<{ category: string; amount: number; count: number }>;
  by_payment_method: Array<{ method: PaymentMethod; amount: number; count: number }>;
  this_month: number;
  last_month: number;
  trend_percentage: number;
}

// ========================================
// 🔧 UnifiedExpenseService Class
// ========================================

class UnifiedExpenseServiceClass {
  private organizationId: string | null = null;

  /**
   * تعيين معرف المؤسسة
   */
  setOrganizationId(orgId: string): void {
    this.organizationId = orgId;
  }

  /**
   * الحصول على معرف المؤسسة
   */
  private getOrgId(): string {
    if (this.organizationId) return this.organizationId;

    const stored = localStorage.getItem('bazaar_organization_id') ||
                   localStorage.getItem('currentOrganizationId');
    if (stored) {
      this.organizationId = stored;
      return stored;
    }

    throw new Error('Organization ID not set');
  }

  // ========================================
  // 📖 READ Operations
  // ========================================

  /**
   * ⚡ جلب المصروفات مع Pagination
   */
  async getExpenses(
    filters: ExpenseFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedExpenses> {
    const orgId = this.getOrgId();
    const offset = (page - 1) * limit;

    // بناء شروط البحث
    let whereClause = 'organization_id = ? AND (is_deleted IS NULL OR is_deleted = 0)';
    const params: any[] = [orgId];

    if (filters.search) {
      whereClause += ' AND (title LIKE ? OR description LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern);
    }

    if (filters.category_id) {
      whereClause += ' AND category_id = ?';
      params.push(filters.category_id);
    }

    if (filters.status) {
      whereClause += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.payment_method) {
      whereClause += ' AND payment_method = ?';
      params.push(filters.payment_method);
    }

    if (filters.from_date) {
      whereClause += ' AND expense_date >= ?';
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      whereClause += ' AND expense_date <= ?';
      params.push(filters.to_date);
    }

    if (filters.min_amount !== undefined) {
      whereClause += ' AND amount >= ?';
      params.push(filters.min_amount);
    }

    if (filters.max_amount !== undefined) {
      whereClause += ' AND amount <= ?';
      params.push(filters.max_amount);
    }

    // ✅ v3.0: استخدام count() الجديد
    const total = await powerSyncService.count('expenses', whereClause, params);

    // ✅ v3.0: استخدام query() الجديد
    const expenses = await powerSyncService.query<Expense>({
      sql: `SELECT * FROM expenses WHERE ${whereClause} ORDER BY expense_date DESC, created_at DESC LIMIT ? OFFSET ?`,
      params: [...params, limit, offset]
    });

    // جلب تفاصيل الفئات
    const expensesWithCategories: ExpenseWithCategory[] = await Promise.all(
      expenses.map(async (expense) => {
        let category_details;
        if (expense.category_id) {
          category_details = await powerSyncService.queryOne<ExpenseCategory>({
            sql: 'SELECT * FROM expense_categories WHERE id = ?',
            params: [expense.category_id]
          });
        }
        return {
          ...expense,
          category_details: category_details || undefined
        };
      })
    );

    return {
      data: expensesWithCategories,
      total,
      page,
      limit,
      hasMore: offset + expenses.length < total
    };
  }

  /**
   * ⚡ جلب مصروف واحد
   */
  async getExpense(expenseId: string): Promise<ExpenseWithCategory | null> {
    // ✅ v3.0: استخدام queryOne() الجديد
    const expense = await powerSyncService.queryOne<Expense>({
      sql: 'SELECT * FROM expenses WHERE id = ? AND (is_deleted IS NULL OR is_deleted = 0)',
      params: [expenseId]
    });

    if (!expense) return null;

    let category_details;
    if (expense.category_id) {
      category_details = await powerSyncService.queryOne<ExpenseCategory>({
        sql: 'SELECT * FROM expense_categories WHERE id = ?',
        params: [expense.category_id]
      });
    }

    return {
      ...expense,
      category_details: category_details || undefined
    };
  }

  /**
   * ⚡ جلب فئات المصروفات
   */
  async getCategories(): Promise<ExpenseCategory[]> {
    const orgId = this.getOrgId();

    // ✅ v3.0: استخدام query() الجديد
    return powerSyncService.query<ExpenseCategory>({
      sql: 'SELECT * FROM expense_categories WHERE organization_id = ? ORDER BY name ASC',
      params: [orgId]
    });
  }

  /**
   * ⚡ مصروفات اليوم
   */
  async getTodayExpenses(): Promise<ExpenseWithCategory[]> {
    const today = new Date().toISOString().slice(0, 10);
    const result = await this.getExpenses({ from_date: today, to_date: today }, 1, 1000);
    return result.data;
  }

  // ========================================
  // ✏️ CREATE Operations
  // ========================================

  /**
   * ⚡ إنشاء مصروف جديد
   */
  async createExpense(
    data: Omit<Expense, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
  ): Promise<Expense> {
    const orgId = this.getOrgId();
    const now = new Date().toISOString();
    const expenseId = uuidv4();

    const expense: Expense = {
      ...data,
      id: expenseId,
      organization_id: orgId,
      status: data.status || 'approved',
      is_deleted: false,
      created_at: now,
      updated_at: now
    };

    // ✅ v3.0: استخدام mutate() الجديد
    await powerSyncService.mutate({
      table: 'expenses',
      operation: 'INSERT',
      data: expense
    });

    console.log(`[UnifiedExpense] ✅ Created expense: ${expenseId}`);
    return expense;
  }

  /**
   * ⚡ إنشاء فئة مصروفات جديدة
   */
  async createCategory(
    data: Omit<ExpenseCategory, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
  ): Promise<ExpenseCategory> {
    const orgId = this.getOrgId();
    const now = new Date().toISOString();
    const categoryId = uuidv4();

    const category: ExpenseCategory = {
      ...data,
      id: categoryId,
      organization_id: orgId,
      created_at: now,
      updated_at: now
    };

    // ✅ v3.0: استخدام mutate() الجديد
    await powerSyncService.mutate({
      table: 'expense_categories',
      operation: 'INSERT',
      data: category
    });

    console.log(`[UnifiedExpense] ✅ Created category: ${categoryId}`);
    return category;
  }

  // ========================================
  // 📝 UPDATE Operations
  // ========================================

  /**
   * ⚡ تحديث مصروف
   */
  async updateExpense(
    expenseId: string,
    updates: Partial<Omit<Expense, 'id' | 'organization_id' | 'created_at'>>
  ): Promise<Expense | null> {
    // ✅ v3.0: استخدام queryOne() الجديد
    const existing = await powerSyncService.queryOne<Expense>({
      sql: 'SELECT * FROM expenses WHERE id = ?',
      params: [expenseId]
    });

    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedExpense = {
      ...existing,
      ...updates,
      updated_at: now
    };

    // ✅ v3.0: استخدام mutate() الجديد
    await powerSyncService.mutate({
      table: 'expenses',
      operation: 'UPDATE',
      data: { ...updates, updated_at: now },
      where: { id: expenseId }
    });

    console.log(`[UnifiedExpense] ✅ Updated expense: ${expenseId}`);
    return updatedExpense;
  }

  /**
   * ⚡ تحديث حالة المصروف
   */
  async updateExpenseStatus(expenseId: string, status: ExpenseStatus): Promise<Expense | null> {
    return this.updateExpense(expenseId, { status });
  }

  /**
   * ⚡ تحديث فئة
   */
  async updateCategory(
    categoryId: string,
    updates: Partial<Omit<ExpenseCategory, 'id' | 'organization_id' | 'created_at'>>
  ): Promise<ExpenseCategory | null> {
    // ✅ v3.0: استخدام queryOne() الجديد
    const existing = await powerSyncService.queryOne<ExpenseCategory>({
      sql: 'SELECT * FROM expense_categories WHERE id = ?',
      params: [categoryId]
    });

    if (!existing) return null;

    const now = new Date().toISOString();

    // ✅ v3.0: استخدام mutate() الجديد
    await powerSyncService.mutate({
      table: 'expense_categories',
      operation: 'UPDATE',
      data: { ...updates, updated_at: now },
      where: { id: categoryId }
    });

    return { ...existing, ...updates, updated_at: now };
  }

  // ========================================
  // 🗑️ DELETE Operations
  // ========================================

  /**
   * ⚡ حذف مصروف (soft delete)
   */
  async deleteExpense(expenseId: string): Promise<boolean> {
    try {
      const now = new Date().toISOString();

      // ✅ v3.0: استخدام execute() الجديد
      await powerSyncService.execute(
        'UPDATE expenses SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?',
        [now, now, expenseId]
      );

      console.log(`[UnifiedExpense] ✅ Soft deleted expense: ${expenseId}`);
      return true;
    } catch (error) {
      console.error(`[UnifiedExpense] ❌ Failed to delete expense:`, error);
      return false;
    }
  }

  /**
   * ⚡ حذف مصروف نهائياً
   */
  async hardDeleteExpense(expenseId: string): Promise<boolean> {
    try {
      // ✅ v3.0: استخدام mutate() الجديد
      await powerSyncService.mutate({
        table: 'expenses',
        operation: 'DELETE',
        where: { id: expenseId }
      });

      console.log(`[UnifiedExpense] ✅ Hard deleted expense: ${expenseId}`);
      return true;
    } catch (error) {
      console.error(`[UnifiedExpense] ❌ Failed to hard delete expense:`, error);
      return false;
    }
  }

  /**
   * ⚡ حذف فئة
   */
  async deleteCategory(categoryId: string): Promise<boolean> {
    try {
      // التحقق من عدم وجود مصروفات مرتبطة
      const expensesCount = await powerSyncService.count(
        'expenses',
        'category_id = ? AND (is_deleted IS NULL OR is_deleted = 0)',
        [categoryId]
      );

      if (expensesCount > 0) {
        console.warn(`[UnifiedExpense] ⚠️ Cannot delete category with expenses: ${categoryId}`);
        return false;
      }

      // ✅ v3.0: استخدام mutate() الجديد
      await powerSyncService.mutate({
        table: 'expense_categories',
        operation: 'DELETE',
        where: { id: categoryId }
      });

      console.log(`[UnifiedExpense] ✅ Deleted category: ${categoryId}`);
      return true;
    } catch (error) {
      console.error(`[UnifiedExpense] ❌ Failed to delete category:`, error);
      return false;
    }
  }

  // ========================================
  // 📊 Statistics
  // ========================================

  /**
   * ⚡ إحصائيات المصروفات
   */
  async getExpenseStats(filters?: { from_date?: string; to_date?: string }): Promise<ExpenseStats> {
    const orgId = this.getOrgId();

    let whereClause = 'organization_id = ? AND (is_deleted IS NULL OR is_deleted = 0)';
    const params: any[] = [orgId];

    if (filters?.from_date) {
      whereClause += ' AND expense_date >= ?';
      params.push(filters.from_date);
    }

    if (filters?.to_date) {
      whereClause += ' AND expense_date <= ?';
      params.push(filters.to_date);
    }

    // ✅ v3.0: استخدام queryOne() الجديد
    const general = await powerSyncService.queryOne<{
      total_expenses: number;
      total_amount: number;
      pending_amount: number;
    }>({
      sql: `SELECT
        COUNT(*) as total_expenses,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
      FROM expenses
      WHERE ${whereClause}`,
      params
    });

    // ✅ v3.0: استخدام query() الجديد
    const byCategory = await powerSyncService.query<{ category: string; amount: number; count: number }>({
      sql: `SELECT
        COALESCE(category, 'غير مصنف') as category,
        SUM(amount) as amount,
        COUNT(*) as count
      FROM expenses
      WHERE ${whereClause}
      GROUP BY category
      ORDER BY amount DESC`,
      params
    });

    const byPaymentMethod = await powerSyncService.query<{ method: PaymentMethod; amount: number; count: number }>({
      sql: `SELECT
        payment_method as method,
        SUM(amount) as amount,
        COUNT(*) as count
      FROM expenses
      WHERE ${whereClause} AND payment_method IS NOT NULL
      GROUP BY payment_method
      ORDER BY amount DESC`,
      params
    });

    // هذا الشهر والشهر الماضي
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

    const thisMonth = await powerSyncService.queryOne<{ total: number }>({
      sql: `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE organization_id = ? AND (is_deleted IS NULL OR is_deleted = 0) AND expense_date >= ?`,
      params: [orgId, thisMonthStart]
    });

    const lastMonth = await powerSyncService.queryOne<{ total: number }>({
      sql: `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE organization_id = ? AND (is_deleted IS NULL OR is_deleted = 0) AND expense_date >= ? AND expense_date <= ?`,
      params: [orgId, lastMonthStart, lastMonthEnd]
    });

    const thisMonthAmount = thisMonth?.total || 0;
    const lastMonthAmount = lastMonth?.total || 0;
    const trendPercentage = lastMonthAmount > 0
      ? ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100
      : 0;

    return {
      total_expenses: general?.total_expenses || 0,
      total_amount: general?.total_amount || 0,
      pending_amount: general?.pending_amount || 0,
      by_category: byCategory,
      by_payment_method: byPaymentMethod,
      this_month: thisMonthAmount,
      last_month: lastMonthAmount,
      trend_percentage: Math.round(trendPercentage * 100) / 100
    };
  }

  /**
   * ⚡ إحصائيات هذا الشهر
   */
  async getCurrentMonthStats(): Promise<ExpenseStats> {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    return this.getExpenseStats({
      from_date: firstDay,
      to_date: lastDay
    });
  }

  /**
   * ⚡ المصروفات اليومية للأسبوع الماضي
   */
  async getWeeklyExpenses(): Promise<Array<{ date: string; total: number; count: number }>> {
    const orgId = this.getOrgId();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // ✅ v3.0: استخدام query() الجديد
    return powerSyncService.query<{ date: string; total: number; count: number }>({
      sql: `SELECT
        expense_date as date,
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM expenses
      WHERE organization_id = ?
      AND (is_deleted IS NULL OR is_deleted = 0)
      AND expense_date >= ?
      GROUP BY expense_date
      ORDER BY date ASC`,
      params: [orgId, sevenDaysAgo]
    });
  }
}

// ========================================
// 📤 Export Singleton
// ========================================

export const unifiedExpenseService = new UnifiedExpenseServiceClass();
export default unifiedExpenseService;
