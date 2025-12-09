/**
 * ⚡ Invoice Types - أنواع الفواتير
 *
 * موحد 100% مع Supabase (جدول invoices + invoice_items)
 */

import type { LocalSyncColumns, PaymentMethod, PaymentStatus } from '../common';

// ============================================
// 🎯 Enums & Types
// ============================================

/** حالة الفاتورة */
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

/** نوع مصدر الفاتورة */
export type InvoiceSourceType = 'order' | 'repair' | 'service' | 'manual' | 'subscription';

/** نوع عنصر الفاتورة */
export type InvoiceItemType = 'product' | 'service' | 'custom';

/** نوع الخصم */
export type DiscountType = 'none' | 'percentage' | 'fixed';

// ============================================
// 🧾 Invoice - الفاتورة
// ============================================

/**
 * ⚡ Invoice - الفاتورة (موحد مع Supabase)
 */
export interface Invoice {
    // 🔑 المعرفات
    id: string;
    invoice_number: string;
    organization_id: string;

    // 👤 العميل
    customer_id?: string | null;
    customer_name?: string | null;
    customer_info?: Record<string, any> | null;

    // 🏢 المصدر
    source_type: InvoiceSourceType;
    source_id?: string | null;

    // 💵 المبالغ الأساسية
    subtotal_amount: number;
    discount_amount: number;
    discount_type?: DiscountType | null;
    discount_percentage?: number | null;
    tax_amount: number;
    shipping_amount?: number | null;
    total_amount: number;

    // 🧮 حسابات TVA (الضريبة الجزائرية)
    tva_rate?: number | null;
    amount_ht?: number | null;      // المبلغ بدون ضريبة
    amount_tva?: number | null;     // مبلغ الضريبة
    amount_ttc?: number | null;     // المبلغ شامل الضريبة

    // 📅 التواريخ
    invoice_date: string;
    due_date?: string | null;

    // 📋 الحالة
    status: InvoiceStatus;
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;

    // 📝 ملاحظات
    notes?: string | null;
    custom_fields?: Record<string, any> | null;

    // 🏢 معلومات المؤسسة
    organization_info?: Record<string, any> | null;

    // 📅 التواريخ
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalInvoice - الفاتورة المحلية
 */
export interface LocalInvoice extends Invoice, LocalSyncColumns {
    // 🔍 أعمدة البحث المحلية
    _customer_name_lower?: string;
    _invoice_number_lower?: string;
}

// ============================================
// 📦 Invoice Item - عنصر الفاتورة
// ============================================

/**
 * ⚡ InvoiceItem - عنصر الفاتورة (موحد مع Supabase)
 */
export interface InvoiceItem {
    // 🔑 المعرفات
    id: string;
    invoice_id: string;

    // 📦 المنتج/الخدمة
    product_id?: string | null;
    service_id?: string | null;
    type: InvoiceItemType;

    // 📝 البيانات
    name: string;
    description?: string | null;
    sku?: string | null;
    barcode?: string | null;

    // 📊 الكميات والأسعار
    quantity: number;
    unit_price: number;
    total_price: number;

    // 🧮 حسابات TVA
    tva_rate?: number | null;
    unit_price_ht?: number | null;
    unit_price_ttc?: number | null;
    total_ht?: number | null;
    total_tva?: number | null;
    total_ttc?: number | null;

    // 💰 الخصم
    discount_amount?: number | null;

    // ⚙️ إعدادات
    is_editable_price?: boolean | null;

    // 📅 التواريخ
    created_at?: string | null;
    updated_at?: string | null;
}

/**
 * ⚡ LocalInvoiceItem - عنصر الفاتورة المحلي
 */
export interface LocalInvoiceItem extends InvoiceItem, LocalSyncColumns {}

// ============================================
// 📊 Invoice With Items - الفاتورة مع العناصر
// ============================================

/**
 * ⚡ InvoiceWithItems - الفاتورة مع عناصرها
 */
export interface InvoiceWithItems extends Invoice {
    items: InvoiceItem[];
}

/**
 * ⚡ InvoiceSummary - ملخص الفاتورة
 */
export interface InvoiceSummary {
    total_invoices: number;
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
    overdue_amount: number;
    average_invoice_value: number;
}

// ============================================
// 📝 Input Types - أنواع الإدخال
// ============================================

/**
 * ⚡ CreateInvoiceInput - إدخال إنشاء فاتورة
 */
export interface CreateInvoiceInput {
    invoice_number: string;
    organization_id: string;
    source_type: InvoiceSourceType;
    payment_method: PaymentMethod;

    // اختياري
    customer_id?: string;
    customer_name?: string;
    customer_info?: Record<string, any>;
    source_id?: string;
    subtotal_amount?: number;
    discount_amount?: number;
    discount_type?: DiscountType;
    discount_percentage?: number;
    tax_amount?: number;
    tva_rate?: number;
    shipping_amount?: number;
    invoice_date?: string;
    due_date?: string;
    notes?: string;
    custom_fields?: Record<string, any>;
    organization_info?: Record<string, any>;
}

/**
 * ⚡ CreateInvoiceItemInput - إدخال إنشاء عنصر فاتورة
 */
export interface CreateInvoiceItemInput {
    invoice_id: string;
    type: InvoiceItemType;
    name: string;
    quantity: number;
    unit_price: number;

    // اختياري
    product_id?: string;
    service_id?: string;
    description?: string;
    sku?: string;
    barcode?: string;
    tva_rate?: number;
    discount_amount?: number;
}

/**
 * ⚡ UpdateInvoiceInput - إدخال تحديث فاتورة
 */
export interface UpdateInvoiceInput {
    status?: InvoiceStatus;
    payment_status?: PaymentStatus;
    payment_method?: PaymentMethod;
    due_date?: string;
    notes?: string;
    discount_amount?: number;
    discount_type?: DiscountType;
    discount_percentage?: number;
}
