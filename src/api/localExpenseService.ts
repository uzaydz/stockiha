/**
 * ⚡ localExpenseService - Adapter للخدمة الموحدة
 * 
 * هذا الملف يُعيد التصدير من UnifiedExpenseService للحفاظ على التوافق مع الكود القديم
 * 
 * تم استبدال التنفيذ القديم بـ UnifiedExpenseService للعمل Offline-First
 */

import { unifiedExpenseService } from '@/services/UnifiedExpenseService';
import type { Expense } from '@/services/UnifiedExpenseService';

// إعادة تصدير جميع الصادرات من الخدمة الموحدة
export * from '@/services/UnifiedExpenseService';

// إعادة تصدير كـ default للتوافق
export { unifiedExpenseService as default } from '@/services/UnifiedExpenseService';

// إعادة تصدير الأنواع للتوافق
export type {
  Expense,
  ExpenseCategory,
  ExpenseWithCategory,
  ExpenseFilters,
  ExpenseStats,
  PaginatedExpenses,
  ExpenseStatus
} from '@/services/UnifiedExpenseService';

// ⚡ دوال التوافق القديمة
/**
 * إنشاء مصروف جديد محلياً (PowerSync Offline-First)
 */
export const createLocalExpense = async (data: {
  title: string;
  amount: number;
  category?: string;
  category_id?: string;
  expense_date?: string;
  notes?: string;
  status?: 'pending' | 'approved' | 'rejected';
  is_recurring?: boolean;
  payment_method?: string;
  payment_ref?: string;
  vendor_name?: string;
  cost_center_id?: string;
  receipt_url?: string;
  recurring?: any;
}): Promise<Expense> => {
  const orgId = localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id');
  if (!orgId) throw new Error('Organization ID not found');

  unifiedExpenseService.setOrganizationId(orgId);

  const expenseData: Omit<Expense, 'id' | 'organization_id' | 'created_at' | 'updated_at'> = {
    title: data.title,
    amount: data.amount,
    expense_date: data.expense_date || new Date().toISOString(),
    description: data.notes || '',
    category: data.category || '',
    category_id: data.category_id,
    status: data.status || 'approved',
    is_recurring: data.is_recurring ?? false,
    payment_method: (data.payment_method || 'cash') as any, // ⚡ Default: cash
    reference_number: data.payment_ref || '',
    receipt_url: data.receipt_url || '',
    source: 'pos' // ✅ CHANGED from 'pos_assistant' to 'pos' to match DB constraint
  };

  return unifiedExpenseService.createExpense(expenseData);
};
