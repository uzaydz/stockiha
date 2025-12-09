/**
 * ⚡ Order Entity Types
 * أنواع الطلب - متطابقة 100% مع Supabase
 *
 * جميع الأسماء snake_case
 * لا يوجد أي camelCase
 */

import {
    OrganizationEntity,
    LocalSyncColumns,
    Nullable,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    SaleType,
    SellingUnitType,
} from '../common';

/**
 * ⚡ Order - نوع الطلب الموحد
 * متطابق 100% مع جدول orders في Supabase
 */
export interface Order extends OrganizationEntity {
    // ═══════════════════════════════════════════════════════════════
    // العلاقات
    // ═══════════════════════════════════════════════════════════════
    customer_id: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // المبالغ
    // ═══════════════════════════════════════════════════════════════
    subtotal: number;
    tax: number;
    discount: Nullable<number>;
    total: number;
    amount_paid: Nullable<number>;
    remaining_amount: Nullable<number>;
    consider_remaining_as_partial: boolean;

    // ═══════════════════════════════════════════════════════════════
    // الحالة
    // ═══════════════════════════════════════════════════════════════
    status: OrderStatus;
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;

    // ═══════════════════════════════════════════════════════════════
    // الموظف
    // ═══════════════════════════════════════════════════════════════
    employee_id: Nullable<string>;
    created_by_staff_id: Nullable<string>;
    created_by_staff_name: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // الرقم المتسلسل
    // ═══════════════════════════════════════════════════════════════
    global_order_number: Nullable<number>;
    slug: Nullable<string>;
    customer_order_number: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // الشحن
    // ═══════════════════════════════════════════════════════════════
    is_online: boolean;
    shipping_address_id: Nullable<string>;
    shipping_method: Nullable<string>;
    shipping_cost: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // الملاحظات
    // ═══════════════════════════════════════════════════════════════
    notes: Nullable<string>;
    customer_notes: Nullable<string>;
    admin_notes: Nullable<string>;
    metadata: Nullable<Record<string, any>>;

    // ═══════════════════════════════════════════════════════════════
    // نوع الطلب
    // ═══════════════════════════════════════════════════════════════
    pos_order_type: Nullable<string>;
    call_confirmation_status_id: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // التواريخ
    // ═══════════════════════════════════════════════════════════════
    completed_at: Nullable<string>;
}

/**
 * ⚡ Local Order - طلب محلي مع أعمدة المزامنة
 */
export interface LocalOrder extends Order, LocalSyncColumns {
    // أعمدة محلية إضافية
    _local_order_number?: number;
    _customer_name_lower?: string;
}

/**
 * ⚡ Order Item - عنصر الطلب
 * متطابق 100% مع جدول order_items في Supabase
 */
export interface OrderItem {
    // ═══════════════════════════════════════════════════════════════
    // المفاتيح
    // ═══════════════════════════════════════════════════════════════
    id: string;
    order_id: string;
    product_id: string;
    organization_id: string;

    // ═══════════════════════════════════════════════════════════════
    // المنتج
    // ═══════════════════════════════════════════════════════════════
    name: string;
    slug: string;
    quantity: number;
    unit_price: number;
    total_price: number;

    // ═══════════════════════════════════════════════════════════════
    // المتغيرات
    // ═══════════════════════════════════════════════════════════════
    color_id: Nullable<string>;
    size_id: Nullable<string>;
    color_name: Nullable<string>;
    size_name: Nullable<string>;
    variant_display_name: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // نوع البيع
    // ═══════════════════════════════════════════════════════════════
    sale_type: SaleType;
    selling_unit_type: SellingUnitType;

    // ═══════════════════════════════════════════════════════════════
    // البيع بالوزن
    // ═══════════════════════════════════════════════════════════════
    weight_sold: Nullable<number>;
    weight_unit: Nullable<string>;
    price_per_weight_unit: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // البيع بالمتر
    // ═══════════════════════════════════════════════════════════════
    meters_sold: Nullable<number>;
    price_per_meter: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // البيع بالصندوق
    // ═══════════════════════════════════════════════════════════════
    boxes_sold: Nullable<number>;
    units_per_box: Nullable<number>;
    box_price: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // التتبع
    // ═══════════════════════════════════════════════════════════════
    batch_id: Nullable<string>;
    batch_number: Nullable<string>;
    serial_numbers: Nullable<string[]>;
    expiry_date: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // التواريخ
    // ═══════════════════════════════════════════════════════════════
    created_at: string;
}

/**
 * ⚡ Local Order Item - عنصر طلب محلي
 */
export interface LocalOrderItem extends OrderItem, LocalSyncColumns {}

/**
 * ⚡ Order With Items - طلب مع عناصره
 */
export interface OrderWithItems extends Order {
    items: OrderItem[];
}

/**
 * ⚡ Local Order With Items
 */
export interface LocalOrderWithItems extends LocalOrder {
    items: LocalOrderItem[];
}

/**
 * ⚡ Create Order Input - بيانات إنشاء طلب جديد
 */
export interface CreateOrderInput {
    customer_id?: string;
    subtotal: number;
    tax?: number;
    discount?: number;
    total: number;
    amount_paid?: number;
    payment_method: PaymentMethod;
    payment_status?: PaymentStatus;
    status?: OrderStatus;
    employee_id?: string;
    created_by_staff_id?: string;
    created_by_staff_name?: string;
    notes?: string;
    is_online?: boolean;
    pos_order_type?: string;
}

/**
 * ⚡ Create Order Item Input - بيانات إنشاء عنصر طلب
 */
export interface CreateOrderItemInput {
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price?: number;
    color_id?: string;
    size_id?: string;
    color_name?: string;
    size_name?: string;
    sale_type?: SaleType;
    selling_unit_type?: SellingUnitType;
    weight_sold?: number;
    weight_unit?: string;
    price_per_weight_unit?: number;
    meters_sold?: number;
    price_per_meter?: number;
    boxes_sold?: number;
    units_per_box?: number;
    box_price?: number;
    batch_id?: string;
    batch_number?: string;
    serial_numbers?: string[];
    expiry_date?: string;
}
