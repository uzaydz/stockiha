/**
 * ⚡ Supplier Entity Types
 * أنواع المورد - متطابقة 100% مع Supabase
 */

import {
    OrganizationEntity,
    LocalSyncColumns,
    Nullable,
    PaymentMethod,
    PaymentStatus,
} from '../common';

/**
 * ⚡ Supplier - نوع المورد الموحد
 */
export interface Supplier extends OrganizationEntity {
    // ═══════════════════════════════════════════════════════════════
    // المعلومات الأساسية
    // ═══════════════════════════════════════════════════════════════
    name: string;
    code: Nullable<string>;
    email: Nullable<string>;
    phone: Nullable<string>;
    secondary_phone: Nullable<string>;
    fax: Nullable<string>;
    website: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // العنوان
    // ═══════════════════════════════════════════════════════════════
    address: Nullable<string>;
    city: Nullable<string>;
    state: Nullable<string>;
    country: Nullable<string>;
    postal_code: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // المعلومات التجارية
    // ═══════════════════════════════════════════════════════════════
    tax_id: Nullable<string>;
    registration_number: Nullable<string>;
    bank_name: Nullable<string>;
    bank_account: Nullable<string>;
    iban: Nullable<string>;
    swift_code: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // شروط الدفع
    // ═══════════════════════════════════════════════════════════════
    payment_terms: Nullable<string>;
    credit_limit: Nullable<number>;
    default_payment_method: Nullable<PaymentMethod>;
    currency: string;

    // ═══════════════════════════════════════════════════════════════
    // التصنيف
    // ═══════════════════════════════════════════════════════════════
    category: Nullable<string>;
    tags: Nullable<string[]>;

    // ═══════════════════════════════════════════════════════════════
    // الإحصائيات
    // ═══════════════════════════════════════════════════════════════
    total_purchases: number;
    total_paid: number;
    outstanding_balance: number;
    last_purchase_date: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // الحالة
    // ═══════════════════════════════════════════════════════════════
    is_active: boolean;
    rating: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // ملاحظات
    // ═══════════════════════════════════════════════════════════════
    notes: Nullable<string>;
    internal_notes: Nullable<string>;
}

/**
 * ⚡ Local Supplier - مورد محلي
 */
export interface LocalSupplier extends Supplier, LocalSyncColumns {
    _name_lower?: string;
}

/**
 * ⚡ Supplier Contact - جهة اتصال المورد
 */
export interface SupplierContact {
    id: string;
    supplier_id: string;
    name: string;
    position: Nullable<string>;
    email: Nullable<string>;
    phone: Nullable<string>;
    is_primary: boolean;
    notes: Nullable<string>;
    created_at: string;
}

/**
 * ⚡ Supplier Purchase - مشتريات من المورد
 */
export interface SupplierPurchase extends OrganizationEntity {
    supplier_id: string;
    purchase_number: Nullable<string>;
    reference_number: Nullable<string>;

    // المبالغ
    subtotal: number;
    tax: number;
    discount: Nullable<number>;
    shipping_cost: Nullable<number>;
    total: number;
    amount_paid: number;
    remaining_amount: number;

    // الحالة
    status: 'draft' | 'ordered' | 'received' | 'partial' | 'cancelled';
    payment_status: PaymentStatus;
    payment_method: Nullable<PaymentMethod>;

    // التواريخ
    order_date: Nullable<string>;
    expected_date: Nullable<string>;
    received_date: Nullable<string>;

    // ملاحظات
    notes: Nullable<string>;
}

/**
 * ⚡ Supplier Purchase Item - عنصر مشتريات
 */
export interface SupplierPurchaseItem {
    id: string;
    purchase_id: string;
    product_id: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
    received_quantity: number;
    batch_number: Nullable<string>;
    expiry_date: Nullable<string>;
    notes: Nullable<string>;
    created_at: string;
}

/**
 * ⚡ Supplier Payment - دفعة للمورد
 */
export interface SupplierPayment extends OrganizationEntity {
    supplier_id: string;
    purchase_id: Nullable<string>;
    amount: number;
    payment_method: PaymentMethod;
    reference_number: Nullable<string>;
    payment_date: string;
    notes: Nullable<string>;
}

/**
 * ⚡ Create Supplier Input
 */
export interface CreateSupplierInput {
    name: string;
    code?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    tax_id?: string;
    payment_terms?: string;
    credit_limit?: number;
    default_payment_method?: PaymentMethod;
    currency?: string;
    category?: string;
    notes?: string;
}
