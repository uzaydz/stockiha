/**
 * ⚡ Customer Entity Types
 * أنواع العميل - متطابقة 100% مع Supabase
 */

import {
    OrganizationEntity,
    LocalSyncColumns,
    Nullable,
} from '../common';

/**
 * ⚡ Customer - نوع العميل الموحد
 */
export interface Customer extends OrganizationEntity {
    // ═══════════════════════════════════════════════════════════════
    // المعلومات الأساسية
    // ═══════════════════════════════════════════════════════════════
    name: string;
    email: Nullable<string>;
    phone: Nullable<string>;
    secondary_phone: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // العنوان
    // ═══════════════════════════════════════════════════════════════
    address: Nullable<string>;
    city: Nullable<string>;
    state: Nullable<string>;
    country: Nullable<string>;
    postal_code: Nullable<string>;
    wilaya: Nullable<string>;
    commune: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // الإحصائيات
    // ═══════════════════════════════════════════════════════════════
    total_orders: number;
    total_spent: number;
    last_order_date: Nullable<string>;
    points: number;

    // ═══════════════════════════════════════════════════════════════
    // التصنيف
    // ═══════════════════════════════════════════════════════════════
    customer_type: 'individual' | 'business';
    tier: 'regular' | 'silver' | 'gold' | 'platinum';
    tags: Nullable<string[]>;

    // ═══════════════════════════════════════════════════════════════
    // الشركة (للعملاء التجاريين)
    // ═══════════════════════════════════════════════════════════════
    company_name: Nullable<string>;
    tax_id: Nullable<string>;
    registration_number: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // الحالة
    // ═══════════════════════════════════════════════════════════════
    is_active: boolean;
    is_verified: boolean;
    accepts_marketing: boolean;

    // ═══════════════════════════════════════════════════════════════
    // ملاحظات
    // ═══════════════════════════════════════════════════════════════
    notes: Nullable<string>;
    internal_notes: Nullable<string>;
    metadata: Nullable<Record<string, any>>;

    // ═══════════════════════════════════════════════════════════════
    // المصدر
    // ═══════════════════════════════════════════════════════════════
    source: Nullable<string>;
    referred_by: Nullable<string>;
}

/**
 * ⚡ Local Customer - عميل محلي
 */
export interface LocalCustomer extends Customer, LocalSyncColumns {
    _name_lower?: string;
    _phone_digits?: string;
    _email_lower?: string;
    _total_debt?: number;
}

/**
 * ⚡ Customer Address - عنوان العميل
 */
export interface CustomerAddress {
    id: string;
    customer_id: string;
    organization_id: string;
    label: string;
    address_line_1: string;
    address_line_2: Nullable<string>;
    city: string;
    state: Nullable<string>;
    country: string;
    postal_code: Nullable<string>;
    wilaya: Nullable<string>;
    commune: Nullable<string>;
    is_default: boolean;
    is_billing: boolean;
    is_shipping: boolean;
    phone: Nullable<string>;
    notes: Nullable<string>;
    created_at: string;
    updated_at: string;
}

/**
 * ⚡ Customer With Stats - عميل مع إحصائياته
 */
export interface CustomerWithStats extends Customer {
    pending_debt: number;
    last_purchase: Nullable<{
        id: string;
        total: number;
        date: string;
    }>;
}

/**
 * ⚡ Create Customer Input
 */
export interface CreateCustomerInput {
    name: string;
    email?: string;
    phone?: string;
    secondary_phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    wilaya?: string;
    commune?: string;
    customer_type?: 'individual' | 'business';
    company_name?: string;
    tax_id?: string;
    notes?: string;
    tags?: string[];
    source?: string;
}
