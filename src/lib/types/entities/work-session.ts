/**
 * ⚡ Work Session Types - أنواع جلسات العمل
 *
 * موحد 100% مع Supabase (جدول staff_work_sessions)
 */

import type { LocalSyncColumns } from '../common';

// ============================================
// 🎯 Enums & Types
// ============================================

/** حالة جلسة العمل */
export type WorkSessionStatus = 'active' | 'paused' | 'ended' | 'cancelled';

// ============================================
// ⏱️ Staff Work Session - جلسة عمل الموظف
// ============================================

/**
 * ⚡ StaffWorkSession - جلسة عمل الموظف (موحد مع Supabase)
 */
export interface StaffWorkSession {
    // 🔑 المعرفات
    id: string;
    organization_id: string;
    staff_id: string;
    staff_name?: string | null;

    // 💵 النقدية
    opening_cash?: number | null;
    closing_cash?: number | null;
    expected_cash?: number | null;
    cash_difference?: number | null;

    // 📊 المبيعات
    total_sales?: number | null;
    total_orders?: number | null;
    cash_sales?: number | null;
    card_sales?: number | null;

    // ⏱️ التوقيت
    started_at: string;
    ended_at?: string | null;
    paused_at?: string | null;
    resumed_at?: string | null;

    // ⏸️ الإيقاف المؤقت
    pause_count?: number | null;
    total_pause_duration?: number | null;

    // 📋 الحالة
    status: WorkSessionStatus;

    // 📝 الملاحظات
    opening_notes?: string | null;
    closing_notes?: string | null;

    // 📅 التواريخ
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalStaffWorkSession - جلسة العمل المحلية مع أعمدة المزامنة
 */
export interface LocalStaffWorkSession extends StaffWorkSession, LocalSyncColumns {}

// ============================================
// 📊 Session Summary - ملخص الجلسة
// ============================================

/**
 * ⚡ WorkSessionSummary - ملخص جلسة العمل
 */
export interface WorkSessionSummary {
    session: StaffWorkSession;

    // 📊 الإحصائيات
    duration_minutes: number;
    orders_per_hour: number;
    sales_per_hour: number;

    // 💵 تفاصيل المدفوعات
    payment_breakdown: {
        cash: number;
        card: number;
        credit: number;
        other: number;
    };

    // 📦 تفاصيل الطلبات
    orders_breakdown: {
        completed: number;
        cancelled: number;
        returned: number;
    };
}

/**
 * ⚡ DailySessionsReport - تقرير الجلسات اليومية
 */
export interface DailySessionsReport {
    date: string;
    sessions: StaffWorkSession[];
    total_sales: number;
    total_orders: number;
    total_hours: number;
    staff_count: number;
}

// ============================================
// 📝 Input Types - أنواع الإدخال
// ============================================

/**
 * ⚡ StartSessionInput - بدء جلسة عمل
 */
export interface StartSessionInput {
    organization_id: string;
    staff_id: string;
    staff_name?: string;
    opening_cash: number;
    opening_notes?: string;
}

/**
 * ⚡ EndSessionInput - إنهاء جلسة عمل
 */
export interface EndSessionInput {
    closing_cash: number;
    closing_notes?: string;
}

/**
 * ⚡ UpdateSessionStatsInput - تحديث إحصائيات الجلسة
 */
export interface UpdateSessionStatsInput {
    total_sales?: number;
    total_orders?: number;
    cash_sales?: number;
    card_sales?: number;
}
