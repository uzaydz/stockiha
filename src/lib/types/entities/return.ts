/**
 * ⚡ Return Types - أنواع المرتجعات
 *
 * موحد 100% مع Supabase (جدول returns + return_items)
 */

import type { LocalSyncColumns, PaymentMethod } from '../common';

// ============================================
// 🎯 Enums & Types
// ============================================

/** حالة المرتجع */
export type ReturnStatus =
    | 'pending'
    | 'approved'
    | 'processing'
    | 'completed'
    | 'rejected'
    | 'cancelled';

/** نوع المرتجع */
export type ReturnType = 'full' | 'partial' | 'exchange';

/** سبب المرتجع */
export type ReturnReason =
    | 'defective'
    | 'wrong_item'
    | 'not_as_described'
    | 'customer_changed_mind'
    | 'damaged_in_shipping'
    | 'other';

/** حالة المنتج المرتجع */
export type ReturnCondition = 'good' | 'damaged' | 'opened' | 'used' | 'defective';

/** طريقة الاسترداد */
export type RefundMethod = 'cash' | 'card' | 'store_credit' | 'exchange' | 'bank_transfer';

// ============================================
// 🔄 Return - المرتجع
// ============================================

/**
 * ⚡ Return - المرتجع (موحد مع Supabase)
 */
export interface Return {
    // 🔑 المعرفات
    id: string;
    return_number: string;
    organization_id: string;

    // 📦 الطلب الأصلي
    original_order_id?: string | null;
    original_order_number?: string | null;

    // 👤 العميل
    customer_id?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    customer_email?: string | null;

    // 📋 تفاصيل المرتجع
    return_type: ReturnType;
    return_reason: ReturnReason;
    return_reason_description?: string | null;

    // 💵 المبالغ
    original_total: number;
    return_amount: number;
    refund_amount: number;
    restocking_fee?: number | null;

    // 💳 الاسترداد
    refund_method?: RefundMethod | null;

    // 📋 الحالة
    status: ReturnStatus;

    // ✅ الموافقة
    requires_manager_approval?: boolean | null;
    approved_by?: string | null;
    approved_at?: string | null;
    approval_notes?: string | null;

    // ❌ الرفض
    rejected_by?: string | null;
    rejected_at?: string | null;
    rejection_reason?: string | null;

    // ⚙️ المعالجة
    processed_by?: string | null;
    processed_at?: string | null;

    // 📝 ملاحظات
    notes?: string | null;
    internal_notes?: string | null;

    // 👨‍💼 المنشئ
    created_by?: string | null;

    // 📅 التواريخ
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalReturn - المرتجع المحلي
 */
export interface LocalReturn extends Return, LocalSyncColumns {
    // 🔍 أعمدة البحث المحلية
    _customer_name_lower?: string;
    _return_number_lower?: string;
}

// ============================================
// 📦 Return Item - عنصر المرتجع
// ============================================

/**
 * ⚡ ReturnItem - عنصر المرتجع (موحد مع Supabase)
 */
export interface ReturnItem {
    // 🔑 المعرفات
    id: string;
    return_id: string;
    original_order_item_id?: string | null;

    // 📦 المنتج
    product_id: string;
    product_name: string;
    product_sku?: string | null;

    // 📊 الكميات
    original_quantity: number;
    return_quantity: number;

    // 💵 الأسعار
    original_unit_price: number;
    return_unit_price: number;
    total_return_amount: number;

    // 🎨 المتغيرات
    variant_info?: Record<string, any> | null;

    // 📋 حالة المنتج
    condition_status?: ReturnCondition | null;
    resellable?: boolean | null;

    // 📦 المخزون
    inventory_returned?: boolean | null;
    inventory_returned_at?: string | null;
    inventory_notes?: string | null;

    // 📅 التواريخ
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalReturnItem - عنصر المرتجع المحلي
 */
export interface LocalReturnItem extends ReturnItem, LocalSyncColumns {}

// ============================================
// 📊 Return With Items - المرتجع مع العناصر
// ============================================

/**
 * ⚡ ReturnWithItems - المرتجع مع عناصره
 */
export interface ReturnWithItems extends Return {
    items: ReturnItem[];
}

/**
 * ⚡ ReturnSummary - ملخص المرتجعات
 */
export interface ReturnSummary {
    total_returns: number;
    pending_returns: number;
    approved_returns: number;
    completed_returns: number;
    rejected_returns: number;
    total_refunded: number;
    average_return_value: number;
}

// ============================================
// 📝 Input Types - أنواع الإدخال
// ============================================

/**
 * ⚡ CreateReturnInput - إدخال إنشاء مرتجع
 */
export interface CreateReturnInput {
    return_number: string;
    organization_id: string;
    return_type: ReturnType;
    return_reason: ReturnReason;

    // اختياري
    original_order_id?: string;
    original_order_number?: string;
    customer_id?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    return_reason_description?: string;
    original_total?: number;
    refund_method?: RefundMethod;
    requires_manager_approval?: boolean;
    notes?: string;
    created_by?: string;
}

/**
 * ⚡ CreateReturnItemInput - إدخال إنشاء عنصر مرتجع
 */
export interface CreateReturnItemInput {
    return_id: string;
    product_id: string;
    product_name: string;
    return_quantity: number;
    return_unit_price: number;

    // اختياري
    original_order_item_id?: string;
    product_sku?: string;
    original_quantity?: number;
    original_unit_price?: number;
    variant_info?: Record<string, any>;
    condition_status?: ReturnCondition;
    resellable?: boolean;
}

/**
 * ⚡ ApproveReturnInput - إدخال الموافقة على المرتجع
 */
export interface ApproveReturnInput {
    approved_by: string;
    approval_notes?: string;
    refund_amount?: number;
    restocking_fee?: number;
}

/**
 * ⚡ RejectReturnInput - إدخال رفض المرتجع
 */
export interface RejectReturnInput {
    rejected_by: string;
    rejection_reason: string;
}

/**
 * ⚡ ProcessReturnInput - إدخال معالجة المرتجع
 */
export interface ProcessReturnInput {
    processed_by: string;
    refund_method: RefundMethod;
    return_to_inventory?: boolean;
}
