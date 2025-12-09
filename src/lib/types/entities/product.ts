/**
 * ⚡ Product Entity Types
 * أنواع المنتج - متطابقة 100% مع Supabase
 *
 * جميع الأسماء snake_case
 * لا يوجد أي camelCase
 */

import {
    OrganizationEntity,
    LocalSyncColumns,
    Nullable,
    PublicationStatus,
    WeightUnit,
    LengthUnit,
    WarrantyType,
} from '../common';

/**
 * ⚡ Product - نوع المنتج الموحد
 */
export interface Product extends OrganizationEntity {
    // ═══════════════════════════════════════════════════════════════
    // المفاتيح والعلاقات
    // ═══════════════════════════════════════════════════════════════
    category_id: Nullable<string>;
    subcategory_id: Nullable<string>;
    supplier_id: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // المعلومات الأساسية
    // ═══════════════════════════════════════════════════════════════
    name: string;
    description: Nullable<string>;
    sku: string;
    barcode: Nullable<string>;
    slug: Nullable<string>;
    brand: Nullable<string>;
    category: Nullable<string>;
    subcategory: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // التسعير الأساسي
    // ═══════════════════════════════════════════════════════════════
    price: number;
    compare_at_price: Nullable<number>;
    purchase_price: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // تسعير الجملة
    // ═══════════════════════════════════════════════════════════════
    wholesale_price: Nullable<number>;
    partial_wholesale_price: Nullable<number>;
    min_wholesale_quantity: Nullable<number>;
    min_partial_wholesale_quantity: Nullable<number>;
    allow_retail: boolean;
    allow_wholesale: boolean;
    allow_partial_wholesale: boolean;

    // ═══════════════════════════════════════════════════════════════
    // البيع بالوحدة
    // ═══════════════════════════════════════════════════════════════
    is_sold_by_unit: boolean;
    unit_type: Nullable<string>;
    unit_purchase_price: Nullable<number>;
    unit_sale_price: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // المخزون
    // ═══════════════════════════════════════════════════════════════
    stock_quantity: number;
    min_stock_level: Nullable<number>;
    reorder_level: Nullable<number>;
    reorder_quantity: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // الحالة
    // ═══════════════════════════════════════════════════════════════
    is_active: boolean;
    is_featured: boolean;
    is_digital: boolean;
    is_new: Nullable<boolean>;
    show_price_on_landing: boolean;

    // ═══════════════════════════════════════════════════════════════
    // المتغيرات
    // ═══════════════════════════════════════════════════════════════
    has_variants: boolean;
    use_sizes: boolean;
    use_variant_prices: boolean;

    // ═══════════════════════════════════════════════════════════════
    // البيع بالوزن
    // ═══════════════════════════════════════════════════════════════
    sell_by_weight: boolean;
    weight_unit: Nullable<WeightUnit>;
    price_per_weight_unit: Nullable<number>;
    purchase_price_per_weight_unit: Nullable<number>;
    min_weight_per_sale: Nullable<number>;
    max_weight_per_sale: Nullable<number>;
    average_item_weight: Nullable<number>;
    available_weight: number;
    total_weight_purchased: number;

    // ═══════════════════════════════════════════════════════════════
    // البيع بالصندوق
    // ═══════════════════════════════════════════════════════════════
    sell_by_box: boolean;
    units_per_box: Nullable<number>;
    box_price: Nullable<number>;
    box_purchase_price: Nullable<number>;
    box_barcode: Nullable<string>;
    allow_single_unit_sale: boolean;
    available_boxes: number;
    total_boxes_purchased: number;

    // ═══════════════════════════════════════════════════════════════
    // البيع بالمتر
    // ═══════════════════════════════════════════════════════════════
    sell_by_meter: boolean;
    meter_unit: Nullable<LengthUnit>;
    price_per_meter: Nullable<number>;
    purchase_price_per_meter: Nullable<number>;
    min_meters_per_sale: Nullable<number>;
    roll_length_meters: Nullable<number>;
    available_length: number;
    total_meters_purchased: number;

    // ═══════════════════════════════════════════════════════════════
    // التتبع
    // ═══════════════════════════════════════════════════════════════
    track_expiry: boolean;
    default_expiry_days: Nullable<number>;
    expiry_alert_days: number;
    track_serial_numbers: boolean;
    require_serial_on_sale: boolean;
    track_batches: boolean;
    use_fifo: boolean;

    // ═══════════════════════════════════════════════════════════════
    // الضمان
    // ═══════════════════════════════════════════════════════════════
    has_warranty: boolean;
    warranty_duration_months: Nullable<number>;
    warranty_type: Nullable<WarrantyType>;

    // ═══════════════════════════════════════════════════════════════
    // الصور
    // ═══════════════════════════════════════════════════════════════
    images: Nullable<string[]>;
    thumbnail_image: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // النشر
    // ═══════════════════════════════════════════════════════════════
    publication_status: PublicationStatus;
    publish_at: Nullable<string>;
    published_at: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // الضرائب
    // ═══════════════════════════════════════════════════════════════
    tax_rate: Nullable<number>;
    tax_included: boolean;
    commission_rate: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // الخصائص
    // ═══════════════════════════════════════════════════════════════
    features: Nullable<string[]>;
    specifications: Nullable<Record<string, any>>;
    dimensions: Nullable<Record<string, any>>;
    weight_kg: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // خصائص الصيدلية
    // ═══════════════════════════════════════════════════════════════
    requires_prescription: boolean;
    active_ingredient: Nullable<string>;
    dosage_form: Nullable<string>;
    concentration: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // خصائص المطاعم
    // ═══════════════════════════════════════════════════════════════
    preparation_time_minutes: Nullable<number>;
    calories: Nullable<number>;
    allergens: Nullable<string[]>;
    is_vegetarian: boolean;
    is_vegan: boolean;
    is_gluten_free: boolean;
    spice_level: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // خصائص قطع الغيار
    // ═══════════════════════════════════════════════════════════════
    oem_number: Nullable<string>;
    compatible_models: Nullable<string[]>;
    vehicle_make: Nullable<string>;
    vehicle_model: Nullable<string>;
    year_from: Nullable<number>;
    year_to: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // خصائص مواد البناء
    // ═══════════════════════════════════════════════════════════════
    material_type: Nullable<string>;
    coverage_area_sqm: Nullable<number>;

    // ═══════════════════════════════════════════════════════════════
    // التصنيع
    // ═══════════════════════════════════════════════════════════════
    manufacturer: Nullable<string>;
    country_of_origin: Nullable<string>;
    customs_code: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // الشحن
    // ═══════════════════════════════════════════════════════════════
    has_fast_shipping: boolean;
    has_money_back: boolean;
    has_quality_guarantee: boolean;
    fast_shipping_text: Nullable<string>;
    money_back_text: Nullable<string>;
    quality_guarantee_text: Nullable<string>;

    // ═══════════════════════════════════════════════════════════════
    // الإعدادات المتقدمة
    // ═══════════════════════════════════════════════════════════════
    special_offers_config: Nullable<Record<string, any>>;
    advanced_description: Nullable<string>;
    purchase_page_config: Nullable<Record<string, any>>;

    // ═══════════════════════════════════════════════════════════════
    // التتبع الداخلي
    // ═══════════════════════════════════════════════════════════════
    created_by_user_id: Nullable<string>;
    updated_by_user_id: Nullable<string>;
    form_template_id: Nullable<string>;
    shipping_provider_id: Nullable<number>;
    shipping_clone_id: Nullable<number>;
    use_shipping_clone: boolean;
    shipping_method_type: string;
    name_for_shipping: Nullable<string>;
    last_inventory_update: Nullable<string>;
}

/**
 * ⚡ Local Product - منتج محلي مع أعمدة المزامنة
 */
export interface LocalProduct extends Product, LocalSyncColumns {
    // أعمدة البحث المحلية
    _name_lower?: string;
    _sku_lower?: string;
    _barcode_lower?: string;
}

/**
 * ⚡ Product Color - لون المنتج
 */
export interface ProductColor {
    id: string;
    product_id: string;
    name: string;
    hex_code: Nullable<string>;
    image_url: Nullable<string>;
    stock_quantity: number;
    price_adjustment: Nullable<number>;
    is_default: boolean;
    created_at: string;
}

/**
 * ⚡ Product Size - مقاس المنتج
 */
export interface ProductSize {
    id: string;
    product_id: string;
    color_id: Nullable<string>;
    name: string;
    stock_quantity: number;
    price_adjustment: Nullable<number>;
    sku_suffix: Nullable<string>;
    barcode: Nullable<string>;
    created_at: string;
}

/**
 * ⚡ Product Image - صورة المنتج
 */
export interface ProductImage {
    id: string;
    product_id: string;
    url: string;
    alt_text: Nullable<string>;
    sort_order: number;
    is_primary: boolean;
    created_at: string;
}

/**
 * ⚡ Product Wholesale Tier - شريحة سعر الجملة
 */
export interface ProductWholesaleTier {
    id: string;
    product_id: string;
    min_quantity: number;
    price_per_unit: number;
    created_at: string;
}

/**
 * ⚡ Product Category
 */
export interface ProductCategory extends OrganizationEntity {
    name: string;
    description: Nullable<string>;
    image_url: Nullable<string>;
    slug: Nullable<string>;
    sort_order: number;
    is_active: boolean;
    parent_id: Nullable<string>;
}

/**
 * ⚡ Product Subcategory
 */
export interface ProductSubcategory extends OrganizationEntity {
    category_id: string;
    name: string;
    description: Nullable<string>;
    image_url: Nullable<string>;
    slug: Nullable<string>;
    sort_order: number;
    is_active: boolean;
}
