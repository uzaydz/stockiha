/**
 * ⚡ Supplier Purchase Types - أنواع مشتريات الموردين
 *
 * موحد 100% مع Supabase (جداول supplier_purchases, supplier_purchase_items, supplier_payments)
 * يتضمن: المشتريات، الدفعات، الديون
 */

import type { LocalSyncColumns, PaymentMethod, PaymentStatus } from '../common';

// ============================================
// 🎯 Enums & Types
// ============================================

/** حالة المشتريات */
export type PurchaseStatus = 'draft' | 'pending' | 'received' | 'partial' | 'cancelled';

/** حالة الدفع للمشتريات */
export type PurchasePaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

/** شروط الدفع */
export type PaymentTerms = 'cash' | 'net_7' | 'net_15' | 'net_30' | 'net_60' | 'net_90' | 'custom';

/** نوع المتغير */
export type VariantType = 'simple' | 'color' | 'size' | 'color_size';

// ============================================
// 🛒 Supplier Purchase - مشتريات المورد
// ============================================

/**
 * ⚡ SupplierPurchase - مشتريات المورد (موحد مع Supabase)
 */
export interface SupplierPurchase {
    // 🔑 المعرفات
    id: string;
    purchase_number: string;
    organization_id: string;
    supplier_id: string;

    // 📅 التواريخ
    purchase_date?: string | null;
    due_date?: string | null;

    // 💵 المبالغ
    total_amount: number;
    paid_amount: number;
    balance_due?: number | null;

    // 📋 الحالة
    status?: PurchaseStatus | null;
    payment_status?: PurchasePaymentStatus | null;
    payment_terms?: PaymentTerms | null;

    // 📝 ملاحظات
    notes?: string | null;

    // 👨‍💼 المنشئ/المحدث
    created_by?: string | null;
    updated_by?: string | null;

    // 📅 التواريخ
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalSupplierPurchase - مشتريات المورد المحلية
 */
export interface LocalSupplierPurchase extends SupplierPurchase, LocalSyncColumns {
    // 🔍 أعمدة البحث المحلية
    _purchase_number_lower?: string;
}

// ============================================
// 📦 Supplier Purchase Item - عنصر المشتريات
// ============================================

/**
 * ⚡ SupplierPurchaseItem - عنصر مشتريات المورد (موحد مع Supabase)
 */
export interface SupplierPurchaseItem {
    // 🔑 المعرفات
    id: string;
    purchase_id: string;
    supplier_purchase_id?: string | null;
    product_id?: string | null;
    batch_id?: string | null;

    // 📝 البيانات
    description: string;

    // 🎨 المتغيرات
    color_id?: string | null;
    size_id?: string | null;
    variant_type?: VariantType | null;
    variant_display_name?: string | null;

    // 📊 الكميات والأسعار
    quantity: number;
    unit_price: number;
    total_price?: number | null;
    selling_price?: number | null;

    // 🧮 الضريبة
    tax_rate?: number | null;
    tax_amount?: number | null;

    // 📅 الصلاحية
    expiry_date?: string | null;

    // 📍 الموقع
    location?: string | null;

    // 📅 التواريخ
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalSupplierPurchaseItem - عنصر المشتريات المحلي
 */
export interface LocalSupplierPurchaseItem extends SupplierPurchaseItem, LocalSyncColumns {}

// ============================================
// 💳 Supplier Payment - دفعات المورد
// ============================================

/**
 * ⚡ SupplierPayment - دفعة المورد (موحد مع Supabase)
 */
export interface SupplierPayment {
    // 🔑 المعرفات
    id: string;
    supplier_id: string;
    purchase_id?: string | null;
    organization_id: string;

    // 💵 الدفعة
    payment_date?: string | null;
    amount: number;
    payment_method?: PaymentMethod | null;
    reference_number?: string | null;

    // 📝 ملاحظات
    notes?: string | null;

    // 👨‍💼 المنشئ
    created_by?: string | null;

    // 📅 التواريخ
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalSupplierPayment - دفعة المورد المحلية
 */
export interface LocalSupplierPayment extends SupplierPayment, LocalSyncColumns {}

// ============================================
// 📊 Supplier Debt - ديون المورد
// ============================================

/**
 * ⚡ SupplierDebt - دين المورد (محسوب)
 */
export interface SupplierDebt {
    supplier_id: string;
    supplier_name: string;
    total_purchases: number;
    total_paid: number;
    total_debt: number;
    overdue_amount: number;
    purchases_count: number;
    last_payment_date?: string | null;
    oldest_due_date?: string | null;
}

/**
 * ⚡ DebtSummary - ملخص الديون
 */
export interface DebtSummary {
    total_debt: number;
    total_overdue: number;
    suppliers_with_debt: number;
    average_debt_per_supplier: number;
    by_supplier: SupplierDebt[];
}

// ============================================
// 📊 Purchase With Items - المشتريات مع العناصر
// ============================================

/**
 * ⚡ SupplierPurchaseWithItems - المشتريات مع عناصرها
 */
export interface SupplierPurchaseWithItems extends SupplierPurchase {
    items: SupplierPurchaseItem[];
    payments?: SupplierPayment[];
    supplier?: {
        id: string;
        name: string;
        company_name?: string;
        phone?: string;
    };
}

/**
 * ⚡ PurchaseSummary - ملخص المشتريات
 */
export interface PurchaseSummary {
    total_purchases: number;
    total_amount: number;
    total_paid: number;
    total_outstanding: number;
    pending_count: number;
    received_count: number;
    overdue_count: number;
}

// ============================================
// 📝 Input Types - أنواع الإدخال
// ============================================

/**
 * ⚡ CreateSupplierPurchaseInput - إدخال إنشاء مشتريات
 */
export interface CreateSupplierPurchaseInput {
    purchase_number: string;
    organization_id: string;
    supplier_id: string;

    // اختياري
    purchase_date?: string;
    due_date?: string;
    payment_terms?: PaymentTerms;
    notes?: string;
    created_by?: string;
}

/**
 * ⚡ CreatePurchaseItemInput - إدخال إنشاء عنصر مشتريات
 */
export interface CreatePurchaseItemInput {
    purchase_id: string;
    description: string;
    quantity: number;
    unit_price: number;

    // اختياري
    product_id?: string;
    color_id?: string;
    size_id?: string;
    variant_type?: VariantType;
    selling_price?: number;
    tax_rate?: number;
    expiry_date?: string;
    location?: string;
}

/**
 * ⚡ CreateSupplierPaymentInput - إدخال إنشاء دفعة
 */
export interface CreateSupplierPaymentInput {
    supplier_id: string;
    organization_id: string;
    amount: number;

    // اختياري
    purchase_id?: string;
    payment_date?: string;
    payment_method?: PaymentMethod;
    reference_number?: string;
    notes?: string;
    created_by?: string;
}

/**
 * ⚡ UpdatePurchaseStatusInput - تحديث حالة المشتريات
 */
export interface UpdatePurchaseStatusInput {
    status?: PurchaseStatus;
    payment_status?: PurchasePaymentStatus;
    notes?: string;
    updated_by?: string;
}

/**
 * ⚡ ReceivePurchaseInput - استلام المشتريات
 */
export interface ReceivePurchaseInput {
    received_by: string;
    items_received: {
        item_id: string;
        received_quantity: number;
        location?: string;
    }[];
    notes?: string;
}
