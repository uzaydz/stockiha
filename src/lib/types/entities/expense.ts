/**
 * ⚡ Expense Types - أنواع المصروفات
 *
 * موحد 100% مع Supabase (جدول expenses + expense_categories)
 */

import type { LocalSyncColumns, PaymentMethod } from '../common';

// ============================================
// 🎯 Enums & Types
// ============================================

/** حالة المصروف */
export type ExpenseStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';

/** مصدر المصروف */
export type ExpenseSource = 'web' | 'pos' | 'mobile' | 'import';

// ============================================
// 💸 Expense - المصروف
// ============================================

/**
 * ⚡ Expense - المصروف (موحد مع Supabase)
 */
export interface Expense {
    // 🔑 المعرفات
    id: string;
    organization_id: string;
    reference_number?: string | null;

    // 📝 البيانات الأساسية
    title: string;
    description?: string | null;
    amount: number;
    expense_date: string;

    // 📂 التصنيف
    category: string;
    category_id?: string | null;
    tags?: string[] | null;

    // 💳 الدفع
    payment_method: PaymentMethod;

    // 📋 الحالة
    status?: ExpenseStatus | null;
    source?: ExpenseSource | null;

    // 🔄 التكرار
    is_recurring?: boolean | null;

    // 📎 المرفقات
    receipt_url?: string | null;

    // 📊 بيانات إضافية
    metadata?: Record<string, any> | null;

    // 🗑️ الحذف الناعم
    is_deleted?: boolean | null;
    deleted_at?: string | null;

    // 👨‍💼 المنشئ
    created_by?: string | null;

    // 📅 التواريخ
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalExpense - المصروف المحلي
 */
export interface LocalExpense extends Expense, LocalSyncColumns {
    // 🔍 أعمدة البحث المحلية
    _title_lower?: string;
    _category_lower?: string;
}

// ============================================
// 📂 Expense Category - فئة المصروفات
// ============================================

/**
 * ⚡ ExpenseCategory - فئة المصروفات (موحد مع Supabase)
 */
export interface ExpenseCategory {
    // 🔑 المعرفات
    id: string;
    organization_id: string;

    // 📝 البيانات
    name: string;
    description?: string | null;

    // 🎨 المظهر
    color?: string | null;
    icon?: string | null;

    // ⚙️ إعدادات
    is_default?: boolean | null;

    // 📅 التواريخ
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalExpenseCategory - فئة المصروفات المحلية
 */
export interface LocalExpenseCategory extends ExpenseCategory, LocalSyncColumns {}

// ============================================
// 📊 Expense Stats - إحصائيات المصروفات
// ============================================

/**
 * ⚡ ExpenseSummary - ملخص المصروفات
 */
export interface ExpenseSummary {
    total_expenses: number;
    total_amount: number;
    average_expense: number;
    by_category: {
        category: string;
        count: number;
        amount: number;
    }[];
    by_payment_method: {
        method: PaymentMethod;
        count: number;
        amount: number;
    }[];
}

/**
 * ⚡ MonthlyExpenseReport - تقرير المصروفات الشهري
 */
export interface MonthlyExpenseReport {
    month: string;
    year: number;
    total_amount: number;
    expenses_count: number;
    categories_breakdown: {
        category_id: string;
        category_name: string;
        amount: number;
        percentage: number;
    }[];
    comparison_to_previous: {
        amount_difference: number;
        percentage_change: number;
    };
}

/**
 * ⚡ ExpenseWithCategory - المصروف مع الفئة
 */
export interface ExpenseWithCategory extends Expense {
    category_details?: ExpenseCategory | null;
}

// ============================================
// 📝 Input Types - أنواع الإدخال
// ============================================

/**
 * ⚡ CreateExpenseInput - إدخال إنشاء مصروف
 */
export interface CreateExpenseInput {
    organization_id: string;
    title: string;
    amount: number;
    expense_date: string;
    category: string;
    payment_method: PaymentMethod;

    // اختياري
    description?: string;
    category_id?: string;
    tags?: string[];
    reference_number?: string;
    is_recurring?: boolean;
    receipt_url?: string;
    metadata?: Record<string, any>;
    created_by?: string;
}

/**
 * ⚡ UpdateExpenseInput - إدخال تحديث مصروف
 */
export interface UpdateExpenseInput {
    title?: string;
    description?: string;
    amount?: number;
    expense_date?: string;
    category?: string;
    category_id?: string;
    payment_method?: PaymentMethod;
    tags?: string[];
    receipt_url?: string;
    is_recurring?: boolean;
    status?: ExpenseStatus;
    metadata?: Record<string, any>;
}

/**
 * ⚡ CreateExpenseCategoryInput - إدخال إنشاء فئة مصروفات
 */
export interface CreateExpenseCategoryInput {
    organization_id: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    is_default?: boolean;
}

/**
 * ⚡ ExpenseFilterInput - فلترة المصروفات
 */
export interface ExpenseFilterInput {
    organization_id: string;
    start_date?: string;
    end_date?: string;
    category?: string;
    category_id?: string;
    payment_method?: PaymentMethod;
    status?: ExpenseStatus;
    min_amount?: number;
    max_amount?: number;
    search?: string;
    tags?: string[];
}
