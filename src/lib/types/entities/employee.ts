/**
 * ⚡ Employee Types - أنواع الموظفين
 *
 * موحد 100% مع Supabase (جدول users)
 * يشمل: المستخدمين، الرواتب، النشاطات
 */

import type { LocalSyncColumns } from '../common';

// ============================================
// 🎯 Enums & Types
// ============================================

/** أدوار المستخدم */
export type UserRole = 'admin' | 'manager' | 'employee' | 'cashier' | 'viewer';

/** حالة المستخدم */
export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

/** الجنس */
export type Gender = 'male' | 'female' | 'other';

/** نوع الراتب */
export type SalaryType = 'monthly' | 'hourly' | 'daily' | 'commission' | 'fixed';

/** حالة الراتب */
export type SalaryStatus = 'active' | 'pending' | 'paid' | 'cancelled';

// ============================================
// 👤 User/Employee - المستخدم/الموظف
// ============================================

/**
 * ⚡ User - المستخدم (موحد مع Supabase)
 */
export interface User {
    // 🔑 المعرفات
    id: string;
    organization_id?: string | null;
    auth_user_id?: string | null;

    // 👤 البيانات الأساسية
    email: string;
    name: string;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    whatsapp_phone?: string | null;

    // 🎭 الدور والصلاحيات
    role: string;
    permissions?: Record<string, boolean> | null;
    is_active: boolean;
    is_org_admin?: boolean | null;
    is_super_admin?: boolean | null;

    // 📋 معلومات إضافية
    avatar_url?: string | null;
    job_title?: string | null;
    bio?: string | null;
    birth_date?: string | null;
    gender?: Gender | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;

    // 📊 الحالة والنشاط
    status?: UserStatus | null;
    last_activity_at?: string | null;

    // 🔐 الأمان
    two_factor_enabled?: boolean | null;
    two_factor_secret?: string | null;
    backup_codes?: string[] | null;
    last_password_change?: string | null;
    failed_login_attempts?: number | null;
    account_locked_until?: string | null;

    // 🔗 الحسابات المرتبطة
    google_account_linked?: boolean | null;
    google_user_id?: string | null;
    whatsapp_connected?: boolean | null;
    whatsapp_enabled?: boolean | null;

    // ⚙️ الإعدادات
    privacy_settings?: Record<string, any> | null;
    security_notifications_enabled?: boolean | null;

    // 📅 التواريخ
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalUser - المستخدم المحلي مع أعمدة المزامنة
 */
export interface LocalUser extends User, LocalSyncColumns {
    // 🔍 أعمدة البحث المحلية
    _name_lower?: string;
    _email_lower?: string;
    _phone_digits?: string;
}

// ============================================
// 💰 Employee Salary - راتب الموظف
// ============================================

/**
 * ⚡ EmployeeSalary - راتب الموظف (موحد مع Supabase)
 */
export interface EmployeeSalary {
    id: string;
    employee_id: string;
    organization_id: string;

    // 💵 بيانات الراتب
    amount: number;
    type: SalaryType;
    status: SalaryStatus;

    // 📅 الفترة
    start_date: string;
    end_date?: string | null;

    // 📝 ملاحظات
    notes?: string | null;

    // 📅 التواريخ
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalEmployeeSalary - راتب الموظف المحلي
 */
export interface LocalEmployeeSalary extends EmployeeSalary, LocalSyncColumns {}

// ============================================
// 📊 Employee Activity - نشاط الموظف
// ============================================

/**
 * ⚡ EmployeeActivity - نشاط الموظف
 */
export interface EmployeeActivity {
    id: string;
    employee_id: string;
    organization_id: string;

    // 📊 بيانات النشاط
    activity_type: string;
    activity_description?: string | null;
    activity_data?: Record<string, any> | null;

    // 📅 التواريخ
    created_at?: string | null;
}

// ============================================
// 📊 Employee Stats - إحصائيات الموظف
// ============================================

/**
 * ⚡ EmployeeStats - إحصائيات الموظف
 */
export interface EmployeeStats {
    total_orders: number;
    total_sales: number;
    total_returns: number;
    average_order_value: number;
    total_work_hours: number;
    sessions_count: number;
}

/**
 * ⚡ UserWithStats - المستخدم مع الإحصائيات
 */
export interface UserWithStats extends User {
    stats?: EmployeeStats;
    current_session?: {
        id: string;
        started_at: string;
        status: string;
    } | null;
}

// ============================================
// 📝 Input Types - أنواع الإدخال
// ============================================

/**
 * ⚡ CreateUserInput - إدخال إنشاء مستخدم
 */
export interface CreateUserInput {
    email: string;
    name: string;
    role: string;
    organization_id: string;

    // اختياري
    phone?: string;
    first_name?: string;
    last_name?: string;
    job_title?: string;
    is_active?: boolean;
    is_org_admin?: boolean;
    permissions?: Record<string, boolean>;
}

/**
 * ⚡ UpdateUserInput - إدخال تحديث مستخدم
 */
export interface UpdateUserInput {
    name?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    whatsapp_phone?: string;
    role?: string;
    job_title?: string;
    bio?: string;
    birth_date?: string;
    gender?: Gender;
    address?: string;
    city?: string;
    country?: string;
    avatar_url?: string;
    is_active?: boolean;
    is_org_admin?: boolean;
    permissions?: Record<string, boolean>;
    privacy_settings?: Record<string, any>;
}

/**
 * ⚡ CreateSalaryInput - إدخال إنشاء راتب
 */
export interface CreateSalaryInput {
    employee_id: string;
    organization_id: string;
    amount: number;
    type: SalaryType;
    start_date: string;
    end_date?: string;
    notes?: string;
}
