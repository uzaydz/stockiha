/**
 * ⚡ Loss Types - أنواع الخسائر
 *
 * موحد 100% مع Supabase (جدول losses + loss_items)
 */

import type { LocalSyncColumns } from '../common';

// ============================================
// 🎯 Enums & Types
// ============================================

/** حالة الخسارة */
export type LossStatus = 'pending' | 'approved' | 'rejected' | 'processed' | 'cancelled';

/** نوع الخسارة */
export type LossType =
    | 'damage'           // تلف
    | 'theft'            // سرقة
    | 'expiry'           // انتهاء صلاحية
    | 'shortage'         // نقص
    | 'breakage'         // كسر
    | 'water_damage'     // تلف مائي
    | 'fire_damage'      // تلف حريق
    | 'other';           // أخرى

/** فئة الخسارة */
export type LossCategory = 'operational' | 'natural' | 'theft' | 'accident' | 'other';

/** حالة المنتج الخاسر */
export type LossCondition =
    | 'total_loss'       // خسارة كاملة
    | 'partial_loss'     // خسارة جزئية
    | 'repairable'       // قابل للإصلاح
    | 'salvageable';     // قابل للإنقاذ

// ============================================
// 📉 Loss - الخسارة
// ============================================

/**
 * ⚡ Loss - الخسارة (موحد مع Supabase)
 */
export interface Loss {
    // 🔑 المعرفات
    id: string;
    loss_number: string;
    organization_id: string;

    // 📋 تفاصيل الخسارة
    loss_type: LossType;
    loss_category?: LossCategory | null;
    loss_description: string;

    // 📅 تاريخ الحادث
    incident_date: string;

    // 👨‍💼 الإبلاغ
    reported_by: string;
    witness_employee_id?: string | null;
    witness_name?: string | null;

    // 📋 الحالة
    status: LossStatus;

    // ✅ الموافقة
    requires_manager_approval?: boolean | null;
    approved_by?: string | null;
    approved_at?: string | null;
    approval_notes?: string | null;

    // 💵 القيم
    total_cost_value: number;
    total_selling_value: number;
    total_items_count: number;

    // 📍 الموقع
    location_description?: string | null;

    // 📎 المراجع الخارجية
    external_reference?: string | null;

    // 🛡️ التأمين
    insurance_claim?: boolean | null;
    insurance_reference?: string | null;

    // 📝 ملاحظات
    notes?: string | null;
    internal_notes?: string | null;

    // ⚙️ المعالجة
    processed_at?: string | null;

    // 📅 التواريخ
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalLoss - الخسارة المحلية
 */
export interface LocalLoss extends Loss, LocalSyncColumns {
    // 🔍 أعمدة البحث المحلية
    _loss_number_lower?: string;
}

// ============================================
// 📦 Loss Item - عنصر الخسارة
// ============================================

/**
 * ⚡ LossItem - عنصر الخسارة (موحد مع Supabase)
 */
export interface LossItem {
    // 🔑 المعرفات
    id: string;
    loss_id: string;

    // 📦 المنتج
    product_id: string;
    product_name: string;
    product_sku?: string | null;
    product_barcode?: string | null;

    // 🎨 المتغيرات
    color_id?: string | null;
    size_id?: string | null;
    color_name?: string | null;
    size_name?: string | null;
    variant_info?: Record<string, any> | null;

    // 📊 الكميات
    lost_quantity: number;

    // 💵 الأسعار
    unit_cost_price: number;
    unit_selling_price: number;
    total_cost_value: number;
    total_selling_value: number;

    // 📋 حالة الخسارة
    loss_condition: LossCondition;
    loss_percentage?: number | null;

    // 📦 المخزون
    stock_before_loss?: number | null;
    stock_after_loss?: number | null;
    variant_stock_before?: number | null;
    variant_stock_after?: number | null;

    // ⚙️ تعديل المخزون
    inventory_adjusted?: boolean | null;
    inventory_adjusted_at?: string | null;
    inventory_adjusted_by?: string | null;

    // 📝 ملاحظات
    item_notes?: string | null;

    // 📅 التواريخ
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalLossItem - عنصر الخسارة المحلي
 */
export interface LocalLossItem extends LossItem, LocalSyncColumns {}

// ============================================
// 📎 Loss Evidence - أدلة الخسارة
// ============================================

/**
 * ⚡ LossEvidence - دليل الخسارة
 */
export interface LossEvidence {
    id: string;
    loss_id: string;
    evidence_type: 'image' | 'video' | 'document';
    file_url: string;
    description?: string | null;
    uploaded_by?: string | null;
    created_at?: string | null;
}

// ============================================
// 📊 Loss With Items - الخسارة مع العناصر
// ============================================

/**
 * ⚡ LossWithItems - الخسارة مع عناصرها
 */
export interface LossWithItems extends Loss {
    items: LossItem[];
    evidence?: LossEvidence[];
}

/**
 * ⚡ LossSummary - ملخص الخسائر
 */
export interface LossSummary {
    total_losses: number;
    pending_losses: number;
    approved_losses: number;
    total_cost_value: number;
    total_selling_value: number;
    total_items_lost: number;
    by_type: {
        type: LossType;
        count: number;
        cost_value: number;
        selling_value: number;
    }[];
    by_category: {
        category: LossCategory;
        count: number;
        cost_value: number;
    }[];
}

// ============================================
// 📝 Input Types - أنواع الإدخال
// ============================================

/**
 * ⚡ CreateLossInput - إدخال إنشاء خسارة
 */
export interface CreateLossInput {
    loss_number: string;
    organization_id: string;
    loss_type: LossType;
    loss_description: string;
    incident_date: string;
    reported_by: string;

    // اختياري
    loss_category?: LossCategory;
    witness_employee_id?: string;
    witness_name?: string;
    requires_manager_approval?: boolean;
    location_description?: string;
    external_reference?: string;
    insurance_claim?: boolean;
    notes?: string;
}

/**
 * ⚡ CreateLossItemInput - إدخال إنشاء عنصر خسارة
 */
export interface CreateLossItemInput {
    loss_id: string;
    product_id: string;
    product_name: string;
    lost_quantity: number;
    unit_cost_price: number;
    unit_selling_price: number;
    loss_condition: LossCondition;

    // اختياري
    product_sku?: string;
    product_barcode?: string;
    color_id?: string;
    size_id?: string;
    color_name?: string;
    size_name?: string;
    variant_info?: Record<string, any>;
    loss_percentage?: number;
    stock_before_loss?: number;
    item_notes?: string;
}

/**
 * ⚡ ApproveLossInput - إدخال الموافقة على الخسارة
 */
export interface ApproveLossInput {
    approved_by: string;
    approval_notes?: string;
    adjust_inventory?: boolean;
}

/**
 * ⚡ AdjustLossInventoryInput - تعديل مخزون الخسارة
 */
export interface AdjustLossInventoryInput {
    adjusted_by: string;
    items: {
        loss_item_id: string;
        stock_after_loss: number;
    }[];
}
