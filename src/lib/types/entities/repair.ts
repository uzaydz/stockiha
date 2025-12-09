/**
 * ⚡ Repair Types - أنواع التصليحات
 *
 * موحد 100% مع Supabase (جدول repair_orders)
 */

import type { LocalSyncColumns, PaymentMethod } from '../common';

// ============================================
// 🎯 Enums & Types
// ============================================

/** حالة التصليح */
export type RepairStatus =
    | 'قيد الانتظار'
    | 'جاري العمل'
    | 'بانتظار القطع'
    | 'جاهز للتسليم'
    | 'تم التسليم'
    | 'ملغي';

/** حالة التصليح (English) */
export type RepairStatusEn =
    | 'pending'
    | 'in_progress'
    | 'waiting_parts'
    | 'ready'
    | 'delivered'
    | 'cancelled';

// ============================================
// 🔧 Repair Order - طلب التصليح
// ============================================

/**
 * ⚡ RepairOrder - طلب التصليح (موحد مع Supabase)
 */
export interface RepairOrder {
    // 🔑 المعرفات
    id: string;
    organization_id: string;
    order_number: string;
    repair_tracking_code?: string | null;

    // 👤 بيانات العميل
    customer_name: string;
    customer_phone: string;

    // 📱 بيانات الجهاز
    device_type?: string | null;
    issue_description?: string | null;
    repair_images?: string[] | Record<string, any> | null;

    // 📍 الموقع
    repair_location_id?: string | null;
    custom_location?: string | null;

    // 💵 المالية
    total_price?: number | null;
    paid_amount?: number | null;
    payment_method?: PaymentMethod | null;
    price_to_be_determined_later?: boolean | null;

    // 📋 الحالة
    status?: RepairStatus | null;

    // 👨‍💼 الموظف
    received_by?: string | null;

    // 📝 ملاحظات
    notes?: string | null;

    // 📅 التواريخ
    completed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalRepairOrder - طلب التصليح المحلي
 */
export interface LocalRepairOrder extends RepairOrder, LocalSyncColumns {
    // 🔍 أعمدة البحث المحلية
    _customer_name_lower?: string;
    _customer_phone_digits?: string;
}

// ============================================
// 📜 Repair Status History - تاريخ حالات التصليح
// ============================================

/**
 * ⚡ RepairStatusHistory - تاريخ حالة التصليح
 */
export interface RepairStatusHistory {
    id: string;
    repair_order_id: string;
    status: RepairStatus;
    notes?: string | null;
    created_by?: string | null;
    created_at?: string | null;
}

/**
 * ⚡ LocalRepairStatusHistory - تاريخ الحالة المحلي
 */
export interface LocalRepairStatusHistory extends RepairStatusHistory, LocalSyncColumns {}

// ============================================
// 📍 Repair Location - موقع التصليح
// ============================================

/**
 * ⚡ RepairLocation - موقع التصليح
 */
export interface RepairLocation {
    id: string;
    organization_id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    is_active?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
}

// ============================================
// 📊 Repair Stats - إحصائيات التصليحات
// ============================================

/**
 * ⚡ RepairStats - إحصائيات التصليحات
 */
export interface RepairStats {
    total_repairs: number;
    pending_repairs: number;
    in_progress_repairs: number;
    ready_repairs: number;
    delivered_repairs: number;
    total_revenue: number;
    average_repair_time_hours: number;
}

/**
 * ⚡ RepairOrderWithHistory - طلب التصليح مع التاريخ
 */
export interface RepairOrderWithHistory extends RepairOrder {
    status_history?: RepairStatusHistory[];
    location?: RepairLocation | null;
}

// ============================================
// 📝 Input Types - أنواع الإدخال
// ============================================

/**
 * ⚡ CreateRepairOrderInput - إدخال إنشاء طلب تصليح
 */
export interface CreateRepairOrderInput {
    organization_id: string;
    order_number: string;
    customer_name: string;
    customer_phone: string;

    // اختياري
    device_type?: string;
    issue_description?: string;
    repair_images?: string[];
    repair_location_id?: string;
    custom_location?: string;
    total_price?: number;
    paid_amount?: number;
    payment_method?: PaymentMethod;
    price_to_be_determined_later?: boolean;
    received_by?: string;
    notes?: string;
}

/**
 * ⚡ UpdateRepairOrderInput - إدخال تحديث طلب تصليح
 */
export interface UpdateRepairOrderInput {
    device_type?: string;
    issue_description?: string;
    repair_images?: string[];
    total_price?: number;
    paid_amount?: number;
    payment_method?: PaymentMethod;
    status?: RepairStatus;
    notes?: string;
}

/**
 * ⚡ UpdateRepairStatusInput - تحديث حالة التصليح
 */
export interface UpdateRepairStatusInput {
    status: RepairStatus;
    notes?: string;
    created_by?: string;
}
