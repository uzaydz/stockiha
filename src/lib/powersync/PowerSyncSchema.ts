/**
 * PowerSync Schema - Bazaar Console
 * ============================================================
 * آخر تحديث: 2025-12-10
 *
 * ✅ متطابق مع Supabase Schema الفعلي (تم التحقق عبر MCP)
 * ✅ متطابق مع sync-rules-complete.yaml
 * ✅ أسماء الجداول الصحيحة:
 *    - losses (ليس loss_declarations)
 *    - repair_orders (ليس repairs)
 *    - returns (ليس product_returns)
 * ✅ تم إضافة organization_id للجداول المفقودة
 * ✅ جميع الأعمدة موثقة من Supabase
 *
 * عدد الجداول: 54 مُزامن + 14 محلي = 68
 * - org_data: 52 جدول (مع organization_id)
 * - global_data: 2 جدول (subscription_plans, payment_methods)
 * - local-only: 14 جدول (لا تُزامن مع السيرفر)
 *
 * ⚡ الجداول الجديدة (v4.0) - نظام إدارة الموارد البشرية:
 *    - work_shifts (الورديات)
 *    - employee_shift_assignments (تعيين الورديات)
 *    - employee_attendance (الحضور والانصراف)
 *    - attendance_adjustments (تعديلات الحضور)
 *    - leave_types (أنواع الإجازات)
 *    - employee_leave_balances (رصيد الإجازات)
 *    - leave_requests (طلبات الإجازة)
 *    - official_holidays (العطلات الرسمية)
 *    - salary_structures (هيكل الرواتب)
 *    - payroll_records (سجلات الرواتب)
 *    - employee_loans (السلف والقروض)
 *    - loan_payments (دفعات القروض)
 *    - performance_criteria (معايير الأداء)
 *    - performance_review_periods (فترات التقييم)
 *    - performance_reviews (تقييمات الأداء)
 *    - employee_goals (أهداف الموظفين)
 *    - goal_updates (تحديثات الأهداف)
 *    - employee_warnings (الإنذارات)
 *    - employee_documents (وثائق الموظفين)
 *    - employee_daily_stats (إحصائيات يومية)
 *
 * ⚡ الجداول السابقة (v3.1) - نظام المشتريات الذكي:
 *    - supplier_purchases (المشتريات)
 *    - supplier_purchase_items (عناصر المشتريات)
 *    - purchase_landed_costs (التكاليف الإضافية)
 *    - purchase_price_updates (تحديثات الأسعار)
 *    - purchase_templates (قوالب المشتريات)
 *
 * ⚡ الجداول المحلية (v3.0):
 *    - notification_settings (إعدادات الإشعارات)
 *    - offline_notifications (الإشعارات المحلية)
 *    - local_printer_settings (إعدادات الطابعة المحلية - v50)
 *    - low_stock_tracking (تتبع نفاد المخزون)
 *    - customer_debts (ديون العملاء)
 *    - subscription_audit_logs (سجل تدقيق الاشتراكات)
 * ============================================================
 */

import { Schema, Table, column } from '@powersync/web';

// ╔════════════════════════════════════════════════════════════════════════════╗
// ║                         🔄 SYNCED TABLES                                   ║
// ║              الجداول المُزامنة من Supabase                                ║
// ╚════════════════════════════════════════════════════════════════════════════╝

// ========================================
// 1. PRODUCTS (المنتجات) - متطابق 100% مع Supabase
// ========================================
const products = new Table(
  {
    // Core fields
    organization_id: column.text,
    name: column.text,
    description: column.text,
    sku: column.text,
    barcode: column.text,
    slug: column.text,
    category: column.text,
    subcategory: column.text,
    brand: column.text,
    category_id: column.text,
    subcategory_id: column.text,
    supplier_id: column.text,
    // Pricing
    price: column.real,
    purchase_price: column.real,
    compare_at_price: column.real,
    wholesale_price: column.real,
    partial_wholesale_price: column.real,
    unit_sale_price: column.real,
    unit_purchase_price: column.real,
    // Stock
    stock_quantity: column.real,
    min_stock_level: column.real,
    reorder_level: column.integer,
    reorder_quantity: column.integer,
    // Images & Media
    thumbnail_image: column.text,
    images: column.text, // JSON array
    // Variants
    has_variants: column.integer,
    use_sizes: column.integer,
    use_variant_prices: column.integer,
    // Status flags
    is_active: column.integer,
    is_digital: column.integer,
    is_new: column.integer,
    is_featured: column.integer,
    show_price_on_landing: column.integer,
    // إعدادات العرض والنشر
    show_in_store: column.integer,
    allow_marketplace: column.integer,
    hide_stock_quantity: column.integer,
    // Features & Specs
    features: column.text, // JSON array
    specifications: column.text, // JSON object
    // Weight-based selling
    sell_by_weight: column.integer,
    weight_unit: column.text,
    price_per_weight_unit: column.real,
    purchase_price_per_weight_unit: column.real,
    min_weight_per_sale: column.real,
    max_weight_per_sale: column.real,
    average_item_weight: column.real,
    available_weight: column.real,
    total_weight_purchased: column.real,
    weight_kg: column.real,
    // Meter-based selling
    sell_by_meter: column.integer,
    meter_unit: column.text,
    price_per_meter: column.real,
    purchase_price_per_meter: column.real,
    min_meters_per_sale: column.real,
    roll_length_meters: column.real,
    total_meters_purchased: column.real,
    available_length: column.real,
    // Box-based selling
    sell_by_box: column.integer,
    units_per_box: column.integer,
    box_price: column.real,
    box_purchase_price: column.real,
    box_barcode: column.text,
    allow_single_unit_sale: column.integer,
    available_boxes: column.integer,
    total_boxes_purchased: column.integer,
    // Wholesale Settings
    allow_retail: column.integer,
    allow_wholesale: column.integer,
    allow_partial_wholesale: column.integer,
    min_wholesale_quantity: column.integer,
    min_partial_wholesale_quantity: column.integer,
    // Unit Settings
    unit_type: column.text,
    is_sold_by_unit: column.integer,
    // Tracking
    track_expiry: column.integer,
    default_expiry_days: column.integer,
    expiry_alert_days: column.integer,
    track_batches: column.integer,
    track_serial_numbers: column.integer,
    require_serial_on_sale: column.integer,
    use_fifo: column.integer,
    // Warranty
    has_warranty: column.integer,
    warranty_duration_months: column.integer,
    warranty_type: column.text,
    // Shipping
    shipping_clone_id: column.integer,
    name_for_shipping: column.text,
    shipping_provider_id: column.integer,
    use_shipping_clone: column.integer,
    shipping_method_type: column.text,
    has_fast_shipping: column.integer,
    fast_shipping_text: column.text,
    has_money_back: column.integer,
    money_back_text: column.text,
    has_quality_guarantee: column.integer,
    quality_guarantee_text: column.text,
    // Advanced settings
    purchase_page_config: column.text, // JSON
    special_offers_config: column.text, // JSON
    advanced_description: column.text, // JSON
    form_template_id: column.text,
    // Publication
    publication_status: column.text,
    publish_at: column.text,
    published_at: column.text,
    last_inventory_update: column.text,
    // Business-specific fields
    requires_prescription: column.integer,
    active_ingredient: column.text,
    dosage_form: column.text,
    concentration: column.text,
    preparation_time_minutes: column.integer,
    calories: column.integer,
    allergens: column.text, // JSON array
    is_vegetarian: column.integer,
    is_vegan: column.integer,
    is_gluten_free: column.integer,
    spice_level: column.integer,
    oem_number: column.text,
    compatible_models: column.text, // JSON array
    vehicle_make: column.text,
    vehicle_model: column.text,
    year_from: column.integer,
    year_to: column.integer,
    material_type: column.text,
    dimensions: column.text, // JSON
    coverage_area_sqm: column.real,
    // Tax & Commission
    tax_rate: column.real,
    tax_included: column.integer,
    commission_rate: column.real,
    // Origin
    manufacturer: column.text,
    country_of_origin: column.text,
    customs_code: column.text,
    // Audit
    created_by_user_id: column.text,
    updated_by_user_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      // ⚡ Basic indexes
      org: ['organization_id'],
      sku: ['sku'],
      barcode: ['barcode'],
      // ⚡ Compound indexes for common queries (v2.0)
      org_category_active: ['organization_id', 'category_id', 'is_active'],  // Products by category
      org_active: ['organization_id', 'is_active'],                          // Active products
      org_name: ['organization_id', 'name'],                                 // Search by name
      org_stock: ['organization_id', 'stock_quantity'],                      // Low stock alerts
    }
  }
);

// ========================================
// 2. PRODUCT CATEGORIES (التصنيفات)
// ========================================
const product_categories = new Table(
  {
    id: column.text, // ✅ المفتاح الأساسي (UUID)
    organization_id: column.text,
    name: column.text,
    description: column.text,
    slug: column.text,
    icon: column.text,
    type: column.text,
    image_url: column.text,
    image_base64: column.text,  // ⚡ صورة الفئة محلياً (للـ Offline)
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'] } }
);

// ========================================
// 3. PRODUCT SUBCATEGORIES (التصنيفات الفرعية)
// ========================================
const product_subcategories = new Table(
  {
    id: column.text, // ✅ المفتاح الأساسي (UUID)
    organization_id: column.text,
    category_id: column.text,
    name: column.text,
    description: column.text,
    slug: column.text,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], category: ['category_id'] } }
);

// ========================================
// 4. PRODUCT COLORS (الألوان)
// ========================================
const product_colors = new Table(
  {
    id: column.text, // ✅ المفتاح الأساسي (UUID)
    organization_id: column.text,
    product_id: column.text,
    name: column.text,
    color_code: column.text,
    image_url: column.text,
    quantity: column.integer,
    price: column.real,
    purchase_price: column.real,
    is_default: column.integer,
    barcode: column.text,
    variant_number: column.integer,
    has_sizes: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], product: ['product_id'] } }
);

// ========================================
// 5. PRODUCT SIZES (المقاسات)
// ========================================
const product_sizes = new Table(
  {
    id: column.text, // ✅ المفتاح الأساسي (UUID)
    organization_id: column.text,
    color_id: column.text,
    product_id: column.text,
    size_name: column.text,
    quantity: column.integer,
    price: column.real,
    purchase_price: column.real,
    barcode: column.text,
    is_default: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], color: ['color_id'], product: ['product_id'] } }
);

// ========================================
// 6. PRODUCT IMAGES (الصور) ✅ تم إضافة organization_id
// ========================================
const product_images = new Table(
  {
    organization_id: column.text,
    product_id: column.text,
    image_url: column.text,
    sort_order: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], product: ['product_id'] } }
);

// ========================================
// 7. PRODUCT WHOLESALE TIERS ✅ تم إضافة organization_id
// ========================================
const product_wholesale_tiers = new Table(
  {
    organization_id: column.text,
    product_id: column.text,
    min_quantity: column.integer,
    price_per_unit: column.real,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], product: ['product_id'] } }
);

// ========================================
// 8. INVENTORY BATCHES (دفعات المخزون) ✅ متطابق مع Supabase
// ========================================
const inventory_batches = new Table(
  {
    organization_id: column.text,
    product_id: column.text,
    color_id: column.text,
    size_id: column.text,
    batch_number: column.text,
    supplier_id: column.text,
    supplier_purchase_item_id: column.text, // ✅ تمت إضافته
    purchase_date: column.text,
    purchase_price: column.real,
    selling_price: column.real,
    quantity_received: column.integer,
    quantity_remaining: column.integer,
    expiry_date: column.text,
    location: column.text,
    notes: column.text,
    cost_per_unit: column.real,
    is_active: column.integer,
    variant_type: column.text,
    variant_display_name: column.text,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], product: ['product_id'], batch: ['batch_number'], expiry: ['expiry_date'] } }
);

// ========================================
// 9. PRODUCT SERIAL NUMBERS (الأرقام التسلسلية) ✅ v5.0 محدث
// ⚡ تم إضافة حقول الحجز (Reservation) لدعم تعدد الأجهزة offline
// ========================================
const product_serial_numbers = new Table(
  {
    organization_id: column.text,
    product_id: column.text,
    color_id: column.text,
    size_id: column.text,
    batch_id: column.text,
    serial_number: column.text,
    imei: column.text,
    mac_address: column.text,
    status: column.text, // 'available' | 'reserved' | 'sold' | 'returned' | 'defective' | 'warranty_claimed'
    // ⚡ v5.0: حقول الحجز (Reservation) - لمنع البيع المزدوج على أجهزة متعددة
    reserved_by_device: column.text,         // معرف الجهاز الذي حجز
    reserved_at: column.text,                // وقت الحجز
    reservation_expires_at: column.text,     // وقت انتهاء الحجز
    reservation_order_draft_id: column.text, // معرف مسودة الطلب
    // الضمان
    warranty_start_date: column.text,
    warranty_end_date: column.text,
    warranty_claimed: column.integer,
    warranty_claim_date: column.text,
    warranty_claim_reason: column.text,
    warranty_claim_resolution: column.text,
    // الشراء
    purchase_date: column.text,
    purchase_price: column.real,
    purchase_supplier_id: column.text,
    purchase_invoice_number: column.text,
    // البيع
    sold_at: column.text,
    sold_in_order_id: column.text,
    sold_to_customer_id: column.text,
    sold_price: column.real,
    sold_by_user_id: column.text,
    // الإرجاع
    returned_at: column.text,
    return_reason: column.text,
    return_condition: column.text,
    // الموقع
    location: column.text,
    shelf_number: column.text,
    notes: column.text,
    internal_notes: column.text,
    // التتبع
    created_at: column.text,
    updated_at: column.text,
    created_by: column.text,
    updated_by: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      product: ['product_id'],
      serial: ['serial_number'],
      status: ['status'],
      // ⚡ v5.0: فهارس الحجز
      device: ['reserved_by_device'],
      expires: ['reservation_expires_at']
    }
  }
);

// ========================================
// 10. ORDERS (الطلبات)
// ========================================
const orders = new Table(
  {
    organization_id: column.text,
    customer_id: column.text,
    subtotal: column.real,
    tax: column.real,
    discount: column.real,
    total: column.real,
    status: column.text,
    payment_method: column.text,
    payment_status: column.text,
    shipping_address_id: column.text,
    shipping_method: column.text,
    shipping_cost: column.real,
    notes: column.text,
    is_online: column.integer,
    employee_id: column.text,
    slug: column.text,
    customer_order_number: column.integer,
    global_order_number: column.integer,
    amount_paid: column.real,
    remaining_amount: column.real,
    consider_remaining_as_partial: column.integer,
    metadata: column.text,
    pos_order_type: column.text,
    completed_at: column.text,
    customer_notes: column.text,
    admin_notes: column.text,
    call_confirmation_status_id: column.integer,
    created_by_staff_id: column.text,
    created_by_staff_name: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      // ⚡ Basic indexes
      org: ['organization_id'],
      customer: ['customer_id'],
      status: ['status'],
      created: ['created_at'],
      // ⚡ Compound indexes for common queries (v2.0)
      org_status: ['organization_id', 'status'],                              // Orders by status
      org_status_created: ['organization_id', 'status', 'created_at'],        // Recent orders by status
      org_customer: ['organization_id', 'customer_id'],                       // Orders by customer
      org_date: ['organization_id', 'created_at'],                            // Orders by date
      // ⚡ Indexes for debts queries (v3.0)
      org_payment_remaining: ['organization_id', 'payment_status', 'remaining_amount'], // Debts listing
      org_customer_payment: ['organization_id', 'customer_id', 'payment_status'],       // Customer debts
      remaining: ['remaining_amount'],                                         // Filter by remaining amount
    }
  }
);

// ========================================
// 9. ORDER ITEMS (عناصر الطلبات)
// ========================================
const order_items = new Table(
  {
    organization_id: column.text,
    order_id: column.text,
    product_id: column.text,
    product_name: column.text,
    name: column.text,
    slug: column.text,
    quantity: column.integer,
    unit_price: column.real,
    total_price: column.real,
    original_price: column.real,
    is_digital: column.integer,
    is_wholesale: column.integer,
    sale_type: column.text,
    selling_unit_type: column.text,
    weight_sold: column.real,
    weight_unit: column.text,
    price_per_weight_unit: column.real,
    meters_sold: column.real,
    price_per_meter: column.real,
    boxes_sold: column.integer,
    units_per_box: column.integer,
    box_price: column.real,
    variant_info: column.text,
    color_id: column.text,
    size_id: column.text,
    color_name: column.text,
    size_name: column.text,
    variant_display_name: column.text,
    batch_id: column.text,
    batch_number: column.text,
    expiry_date: column.text,
    serial_numbers: column.text,
    created_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      order: ['order_id'],
      product: ['product_id'],
      // ⚡ Compound index for order items lookup
      org_order: ['organization_id', 'order_id'],
    }
  }
);

// ========================================
// 10. CUSTOMERS (العملاء)
// ========================================
const customers = new Table(
  {
    organization_id: column.text,
    name: column.text,
    email: column.text,
    phone: column.text,
    address: column.text,
    nif: column.text,
    rc: column.text,
    nis: column.text,
    rib: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      phone: ['phone'],
      email: ['email'],
      // ⚡ Compound indexes for customer search
      org_name: ['organization_id', 'name'],
      org_phone: ['organization_id', 'phone'],
    }
  }
);

// ========================================
// 11. SUPPLIERS (الموردين)
// ========================================
const suppliers = new Table(
  {
    organization_id: column.text,
    name: column.text,
    company_name: column.text,
    email: column.text,
    phone: column.text,
    address: column.text,
    website: column.text,
    tax_number: column.text,
    business_type: column.text,
    notes: column.text,
    rating: column.real,
    supplier_type: column.text,
    supplier_category: column.text,
    is_active: column.integer,
    created_by: column.text,
    updated_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'] } }
);

// ========================================
// 11b. SUPPLIER PURCHASES (المشتريات) ✅ جديد v3.1
// ========================================
const supplier_purchases = new Table(
  {
    organization_id: column.text,
    supplier_id: column.text,
    supplier_name: column.text,
    purchase_number: column.text,
    purchase_date: column.text,
    due_date: column.text,
    // المبالغ
    subtotal: column.real,
    tax_amount: column.real,
    tax_rate: column.real,
    discount_amount: column.real,
    discount_type: column.text,
    discount_percentage: column.real,
    total_amount: column.real,
    landed_costs_total: column.real,
    final_total: column.real,
    // المدفوعات
    paid_amount: column.real,
    balance_due: column.real,
    payment_status: column.text,
    payment_terms: column.text,
    // الكميات
    items_count: column.integer,
    total_quantity: column.integer,
    total_base_quantity: column.integer,
    // المراجع
    reference_number: column.text,
    invoice_number: column.text,
    invoice_date: column.text,
    // التسليم
    delivery_date: column.text,
    received_date: column.text,
    expected_delivery_date: column.text,
    shipping_method: column.text,
    shipping_tracking: column.text,
    // المستودع
    warehouse_id: column.text,
    warehouse_location: column.text,
    // العملة والاستيراد
    currency: column.text,
    exchange_rate: column.real,
    is_imported: column.integer,
    country_of_origin: column.text,
    customs_declaration: column.text,
    // الحالة والموافقة
    status: column.text,
    approval_status: column.text,
    approved_by: column.text,
    approved_at: column.text,
    rejection_reason: column.text,
    // الملاحظات
    notes: column.text,
    internal_notes: column.text,
    // وضع التوربو
    turbo_mode_used: column.integer,
    entry_duration_seconds: column.integer,
    // البيانات الوصفية
    metadata: column.text,
    // التدقيق
    created_by: column.text,
    updated_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      supplier: ['supplier_id'],
      status: ['status'],
      payment_status: ['payment_status'],
      org_date: ['organization_id', 'purchase_date'],
      org_status: ['organization_id', 'status'],
      number: ['purchase_number'],
    }
  }
);

// ========================================
// 11c. SUPPLIER PURCHASE ITEMS (عناصر المشتريات) ✅ جديد v3.1
// ========================================
const supplier_purchase_items = new Table(
  {
    organization_id: column.text,
    purchase_id: column.text,
    product_id: column.text,
    // معلومات المنتج
    product_name: column.text,
    product_sku: column.text,
    product_barcode: column.text,
    product_image: column.text,
    description: column.text,
    // الوحدات والتحويل
    purchase_unit: column.text,
    conversion_factor: column.real,
    purchase_quantity: column.real,
    quantity: column.integer,
    base_quantity: column.real,
    // الأسعار
    unit_price: column.real,
    base_cost: column.real,
    tax_rate: column.real,
    tax_amount: column.real,
    subtotal: column.real,
    total_price: column.real,
    total_cost: column.real,
    // التكاليف الإضافية
    landed_cost_share: column.real,
    final_cost: column.real,
    final_base_cost: column.real,
    // المتغيرات
    variant_type: column.text,
    color_id: column.text,
    color_name: column.text,
    size_id: column.text,
    size_name: column.text,
    variant_display_name: column.text,
    // المخزون
    current_stock: column.real,
    new_stock: column.real,
    stock_updated: column.integer,
    stock_updated_at: column.text,
    // التسعير الذكي
    price_changed: column.integer,
    old_purchase_price: column.real,
    suggested_selling_price: column.real,
    old_selling_price: column.real,
    new_selling_price: column.real,
    price_update_applied: column.integer,
    price_update_applied_at: column.text,
    margin_percentage: column.real,
    // الدفعات والتتبع
    batch_id: column.text,
    batch_number: column.text,
    expiry_date: column.text,
    serial_numbers: column.text,
    // البيع بالوزن
    weight_kg: column.real,
    weight_unit: column.text,
    price_per_weight_unit: column.real,
    // البيع بالمتر
    meters: column.real,
    price_per_meter: column.real,
    // البيع بالصندوق
    boxes_count: column.integer,
    units_per_box: column.integer,
    box_price: column.real,
    // الاستلام والجودة
    received_quantity: column.real,
    damaged_quantity: column.real,
    returned_quantity: column.real,
    item_notes: column.text,
    quality_notes: column.text,
    // التواريخ
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      purchase: ['purchase_id'],
      product: ['product_id'],
      org_purchase: ['organization_id', 'purchase_id'],
      color: ['color_id'],
      size: ['size_id'],
    }
  }
);

// ========================================
// 11d. PURCHASE LANDED COSTS (التكاليف الإضافية) ✅ جديد v3.1
// ========================================
const purchase_landed_costs = new Table(
  {
    organization_id: column.text,
    purchase_id: column.text,
    cost_type: column.text, // 'shipping' | 'customs' | 'insurance' | 'handling' | 'other'
    label: column.text,
    amount: column.real,
    percentage_of_total: column.real,
    distribution_method: column.text, // 'by_value' | 'by_quantity' | 'by_weight' | 'equal'
    reference_number: column.text,
    vendor_name: column.text,
    invoice_number: column.text,
    notes: column.text,
    cost_date: column.text,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      purchase: ['purchase_id'],
      org_purchase: ['organization_id', 'purchase_id'],
    }
  }
);

// ========================================
// 11e. PURCHASE PRICE UPDATES (تحديثات الأسعار) ✅ جديد v3.1
// ========================================
const purchase_price_updates = new Table(
  {
    organization_id: column.text,
    purchase_id: column.text,
    purchase_item_id: column.text,
    product_id: column.text,
    product_name: column.text,
    color_id: column.text,
    color_name: column.text,
    size_id: column.text,
    size_name: column.text,
    // تغيير سعر الشراء
    old_purchase_price: column.real,
    new_purchase_price: column.real,
    purchase_price_change_amount: column.real,
    purchase_price_change_percent: column.real,
    // تغيير سعر البيع
    old_selling_price: column.real,
    suggested_selling_price: column.real,
    new_selling_price: column.real,
    selling_price_change_amount: column.real,
    selling_price_change_percent: column.real,
    // الهوامش
    old_margin_amount: column.real,
    old_margin_percent: column.real,
    new_margin_amount: column.real,
    new_margin_percent: column.real,
    // الحالة
    status: column.text,
    applied_at: column.text,
    applied_by: column.text,
    rejection_reason: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      purchase: ['purchase_id'],
      product: ['product_id'],
      status: ['status'],
    }
  }
);

// ========================================
// 11f. PURCHASE TEMPLATES (قوالب المشتريات) ✅ جديد v3.1
// ========================================
const purchase_templates = new Table(
  {
    organization_id: column.text,
    name: column.text,
    description: column.text,
    supplier_id: column.text,
    supplier_name: column.text,
    items: column.text, // JSON array
    auto_apply_landed_costs: column.integer,
    default_landed_costs: column.text, // JSON array
    use_count: column.integer,
    last_used_at: column.text,
    is_active: column.integer,
    is_favorite: column.integer,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      supplier: ['supplier_id'],
      active: ['is_active'],
    }
  }
);

// ========================================
// 12. POS STAFF SESSIONS (الموظفين)
// ========================================
const pos_staff_sessions = new Table(
  {
    organization_id: column.text,
    staff_name: column.text,
    pin_code: column.text,
    permissions: column.text,
    is_active: column.integer,
    user_id: column.text,
    created_by: column.text,
    last_login: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], user: ['user_id'], active: ['is_active'] } }
);

// ========================================
// 13. STAFF WORK SESSIONS (جلسات العمل)
// ========================================
const staff_work_sessions = new Table(
  {
    organization_id: column.text,
    staff_id: column.text,
    staff_name: column.text,
    opening_cash: column.real,
    closing_cash: column.real,
    expected_cash: column.real,
    cash_difference: column.real,
    total_sales: column.real,
    total_orders: column.integer,
    cash_sales: column.real,
    card_sales: column.real,
    started_at: column.text,
    ended_at: column.text,
    paused_at: column.text,
    resumed_at: column.text,
    pause_count: column.integer,
    total_pause_duration: column.integer,
    status: column.text,
    opening_notes: column.text,
    closing_notes: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      staff: ['staff_id'],
      status: ['status'],
      // ⚡ Compound indexes for work sessions
      org_status: ['organization_id', 'status'],
      org_staff_status: ['organization_id', 'staff_id', 'status'],
    }
  }
);

// ========================================
// 14. EXPENSES (المصروفات)
// ========================================
const expenses = new Table(
  {
    organization_id: column.text,
    title: column.text,
    amount: column.real,
    expense_date: column.text,
    description: column.text,
    category: column.text,
    category_id: column.text,
    payment_method: column.text,
    receipt_url: column.text,
    reference_number: column.text,
    tags: column.text,
    metadata: column.text,
    is_recurring: column.integer,
    status: column.text,
    source: column.text,
    is_deleted: column.integer,
    deleted_at: column.text,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      category: ['category_id'],
      date: ['expense_date'],
      // ⚡ Compound indexes for expense reports
      org_date: ['organization_id', 'expense_date'],
      org_category_date: ['organization_id', 'category_id', 'expense_date'],
    }
  }
);

// ========================================
// 15. EXPENSE CATEGORIES (فئات المصروفات)
// ========================================
const expense_categories = new Table(
  {
    organization_id: column.text,
    name: column.text,
    description: column.text,
    color: column.text,
    icon: column.text,
    is_default: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'] } }
);

// ========================================
// 16. USERS (المستخدمين) ✅ متطابق مع Supabase (بدون الأعمدة الحساسة)
// ========================================
const users = new Table(
  {
    organization_id: column.text,
    auth_user_id: column.text,
    email: column.text,
    name: column.text,
    first_name: column.text,
    last_name: column.text,
    phone: column.text,
    role: column.text,
    permissions: column.text, // jsonb
    is_active: column.integer,
    is_org_admin: column.integer,
    is_super_admin: column.integer,
    avatar_url: column.text,
    job_title: column.text,
    bio: column.text,
    birth_date: column.text,
    gender: column.text,
    address: column.text,
    city: column.text,
    country: column.text,
    status: column.text,
    last_activity_at: column.text,
    whatsapp_phone: column.text,
    whatsapp_connected: column.integer,
    whatsapp_enabled: column.integer,
    two_factor_enabled: column.integer,
    // ⚠️ two_factor_secret و backup_codes لا تُزامن لأسباب أمنية
    last_password_change: column.text,
    failed_login_attempts: column.integer,
    account_locked_until: column.text,
    google_account_linked: column.integer,
    google_user_id: column.text,
    security_notifications_enabled: column.integer,
    privacy_settings: column.text, // jsonb
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], auth: ['auth_user_id'], email: ['email'] } }
);

// ========================================
// 17. ORGANIZATIONS (المؤسسات)
// ========================================
const organizations = new Table(
  {
    name: column.text,
    description: column.text,
    logo_url: column.text,
    domain: column.text,
    subdomain: column.text,
    owner_id: column.text,
    subscription_id: column.text,
    subscription_tier: column.text,
    subscription_status: column.text,
    settings: column.text,
    business_type: column.text,
    business_features: column.text,
    business_type_selected: column.integer,
    business_type_selected_at: column.text,
    online_orders_this_month: column.integer,
    online_orders_limit: column.integer,
    store_blocked: column.integer,
    store_block_reason: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { subdomain: ['subdomain'], owner: ['owner_id'] } }
);

// ========================================
// 18. ORGANIZATION SUBSCRIPTIONS (الاشتراكات) 🔒
// ========================================
const organization_subscriptions = new Table(
  {
    organization_id: column.text,
    plan_id: column.text,
    status: column.text,
    billing_cycle: column.text,
    start_date: column.text,
    end_date: column.text,
    trial_ends_at: column.text,
    amount_paid: column.real,
    currency: column.text,
    payment_method: column.text,
    payment_reference: column.text,
    is_auto_renew: column.integer,
    lifetime_courses_access: column.integer,
    accessible_courses: column.text,
    courses_access_expires_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], status: ['status'] } }
);

// ========================================
// 19. POS SETTINGS (إعدادات نقطة البيع - مُزامنة)
// ⚡ الإعدادات المشتركة فقط - إعدادات الطابعة في local_printer_settings
// ========================================
const pos_settings = new Table(
  {
    organization_id: column.text,
    // معلومات المتجر
    store_name: column.text,
    store_phone: column.text,
    store_email: column.text,
    store_address: column.text,
    store_website: column.text,
    store_logo_url: column.text,
    // إعدادات نص الوصل
    receipt_header_text: column.text,
    receipt_footer_text: column.text,
    welcome_message: column.text,
    // إعدادات العناصر المرئية
    show_qr_code: column.integer,
    show_tracking_code: column.integer,
    show_customer_info: column.integer,
    show_store_logo: column.integer,
    show_store_info: column.integer,
    show_date_time: column.integer,
    show_employee_name: column.integer,
    // إعدادات الوصل الأساسية (مشتركة)
    paper_width: column.integer,
    font_size: column.integer,
    line_spacing: column.real,
    print_density: column.text,
    auto_cut: column.integer,
    // الألوان والمظهر
    primary_color: column.text,
    secondary_color: column.text,
    text_color: column.text,
    background_color: column.text,
    // تخطيط الوصل
    receipt_template: column.text,
    header_style: column.text,
    footer_style: column.text,
    item_display_style: column.text,
    price_position: column.text,
    custom_css: column.text,
    // إعدادات العملة
    currency_symbol: column.text,
    currency_position: column.text,
    tax_label: column.text,
    tax_number: column.text,
    // المعلومات التجارية
    business_license: column.text,
    activity: column.text,
    rc: column.text,
    nif: column.text,
    nis: column.text,
    rib: column.text,
    // الأمان والصلاحيات
    allow_price_edit: column.integer,
    require_manager_approval: column.integer,
    // التواريخ
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'] } }
);

// ========================================
// 20. INVOICES (الفواتير) ✅ متطابق مع Supabase
// ========================================
const invoices = new Table(
  {
    organization_id: column.text,
    invoice_number: column.text,
    customer_id: column.text,
    customer_name: column.text,
    total_amount: column.real,
    invoice_date: column.text,
    due_date: column.text,
    status: column.text,
    source_type: column.text,
    source_id: column.text, // ✅ تمت إضافته
    payment_method: column.text,
    payment_status: column.text,
    notes: column.text,
    custom_fields: column.text, // ✅ jsonb تمت إضافته
    tax_amount: column.real,
    discount_amount: column.real,
    subtotal_amount: column.real,
    shipping_amount: column.real,
    customer_info: column.text, // ✅ jsonb تمت إضافته
    organization_info: column.text, // ✅ jsonb تمت إضافته
    discount_type: column.text,
    discount_percentage: column.real,
    tva_rate: column.real,
    amount_ht: column.real,
    amount_tva: column.real,
    amount_ttc: column.real,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], customer: ['customer_id'], number: ['invoice_number'], status: ['status'] } }
);

// ========================================
// 21. INVOICE ITEMS ✅ تم إضافة organization_id
// ========================================
const invoice_items = new Table(
  {
    organization_id: column.text,
    invoice_id: column.text,
    product_id: column.text,
    service_id: column.text,
    name: column.text,
    description: column.text,
    type: column.text,
    quantity: column.integer,
    unit_price: column.real,
    total_price: column.real,
    sku: column.text,
    barcode: column.text,
    tva_rate: column.real,
    unit_price_ht: column.real,
    unit_price_ttc: column.real,
    total_ht: column.real,
    total_tva: column.real,
    total_ttc: column.real,
    discount_amount: column.real,
    is_editable_price: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], invoice: ['invoice_id'] } }
);

// ========================================
// 22. LOSSES (الخسائر) - الاسم الصحيح في Supabase
// ========================================
const losses = new Table(
  {
    organization_id: column.text,
    loss_number: column.text,
    loss_type: column.text,
    loss_category: column.text,
    loss_description: column.text,
    incident_date: column.text,
    reported_by: column.text,
    witness_employee_id: column.text,
    witness_name: column.text,
    requires_manager_approval: column.integer,
    approved_by: column.text,
    approved_at: column.text,
    approval_notes: column.text,
    status: column.text,
    total_cost_value: column.real,
    total_selling_value: column.real,
    total_items_count: column.integer,
    location_description: column.text,
    external_reference: column.text,
    insurance_claim: column.integer,
    insurance_reference: column.text,
    notes: column.text,
    internal_notes: column.text,
    processed_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], status: ['status'], number: ['loss_number'] } }
);

// ========================================
// 23. LOSS ITEMS ✅ تم إضافة organization_id
// ========================================
const loss_items = new Table(
  {
    organization_id: column.text,
    loss_id: column.text,
    product_id: column.text,
    product_name: column.text,
    product_sku: column.text,
    product_barcode: column.text,
    lost_quantity: column.integer,
    unit_cost_price: column.real,
    unit_selling_price: column.real,
    total_cost_value: column.real,
    total_selling_value: column.real,
    variant_info: column.text,
    loss_condition: column.text,
    loss_percentage: column.real,
    stock_before_loss: column.real,
    stock_after_loss: column.real,
    inventory_adjusted: column.integer,
    inventory_adjusted_at: column.text,
    inventory_adjusted_by: column.text,
    item_notes: column.text,
    color_id: column.text,
    color_name: column.text,
    size_id: column.text,
    size_name: column.text,
    variant_stock_before: column.real,
    variant_stock_after: column.real,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], loss: ['loss_id'], product: ['product_id'] } }
);

// ========================================
// 24. REPAIR ORDERS (طلبات الإصلاح) ✅ متطابق مع Supabase
// ========================================
const repair_orders = new Table(
  {
    organization_id: column.text,
    order_number: column.text,
    customer_name: column.text,
    customer_phone: column.text,
    device_type: column.text,
    repair_location_id: column.text,
    custom_location: column.text,
    issue_description: column.text,
    repair_images: column.text, // ✅ jsonb
    status: column.text,
    total_price: column.real,
    paid_amount: column.real,
    price_to_be_determined_later: column.integer,
    payment_method: column.text,
    notes: column.text,
    received_by: column.text,
    repair_tracking_code: column.text,
    completed_at: column.text, // ✅ تمت إضافته
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], status: ['status'], tracking: ['repair_tracking_code'] } }
);

// ========================================
// 25. REPAIR LOCATIONS (مواقع الإصلاح)
// ========================================
const repair_locations = new Table(
  {
    organization_id: column.text,
    name: column.text,
    description: column.text,
    address: column.text,
    phone: column.text,
    email: column.text,
    is_default: column.integer,
    is_active: column.integer,
    capacity: column.integer,
    working_hours: column.text,
    specialties: column.text,
    manager_name: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], active: ['is_active'] } }
);

// ========================================
// 26. REPAIR IMAGES (صور الإصلاح) ✅ محدث - تمت إضافة organization_id
// ========================================
const repair_images = new Table(
  {
    organization_id: column.text,
    repair_order_id: column.text,
    image_url: column.text,
    image_type: column.text, // 'before' | 'after' | 'during' | 'receipt'
    description: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], repair: ['repair_order_id'] } }
);

// ========================================
// 27. REPAIR STATUS HISTORY (سجل حالات الإصلاح) ✅ محدث - تمت إضافة organization_id
// ========================================
const repair_status_history = new Table(
  {
    organization_id: column.text,
    repair_order_id: column.text,
    status: column.text,
    notes: column.text,
    created_by: column.text,
    created_at: column.text,
  },
  { indexes: { org: ['organization_id'], repair: ['repair_order_id'], status: ['status'] } }
);

// ========================================
// 28. RETURNS (المرتجعات) - الاسم الصحيح في Supabase
// ========================================
const returns = new Table(
  {
    organization_id: column.text,
    return_number: column.text,
    original_order_id: column.text,
    original_order_number: column.text,
    customer_id: column.text,
    customer_name: column.text,
    customer_phone: column.text,
    customer_email: column.text,
    return_type: column.text,
    return_reason: column.text,
    return_reason_description: column.text,
    original_total: column.real,
    return_amount: column.real,
    refund_amount: column.real,
    restocking_fee: column.real,
    status: column.text,
    approved_by: column.text,
    approved_at: column.text,
    processed_by: column.text,
    processed_at: column.text,
    refund_method: column.text,
    notes: column.text,
    internal_notes: column.text,
    requires_manager_approval: column.integer,
    created_by: column.text,
    approval_notes: column.text,
    rejection_reason: column.text,
    rejected_by: column.text,
    rejected_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], customer: ['customer_id'], order: ['original_order_id'], number: ['return_number'] } }
);

// ========================================
// 27. RETURN ITEMS ✅ تم إضافة organization_id + variant fields + selling units
// ========================================
const return_items = new Table(
  {
    organization_id: column.text,
    return_id: column.text,
    original_order_item_id: column.text,
    product_id: column.text,
    product_name: column.text,
    product_sku: column.text,
    original_quantity: column.integer,
    return_quantity: column.integer,
    original_unit_price: column.real,
    return_unit_price: column.real,
    total_return_amount: column.real,
    variant_info: column.text,
    // ⚡ حقول المتغيرات (الألوان والمقاسات)
    color_id: column.text,
    color_name: column.text,
    size_id: column.text,
    size_name: column.text,
    // ⚡ حقول أنواع البيع المختلفة
    selling_unit_type: column.text, // piece, weight, meter, box
    // البيع بالوزن
    weight_returned: column.real,
    weight_unit: column.text,
    price_per_weight_unit: column.real,
    // البيع بالمتر
    meters_returned: column.real,
    price_per_meter: column.real,
    // البيع بالعلبة/الصندوق
    boxes_returned: column.integer,
    units_per_box: column.integer,
    box_price: column.real,
    // ⚡ حقول الجملة
    original_sale_type: column.text, // retail, wholesale, partial_wholesale
    original_is_wholesale: column.integer, // 0 or 1
    // حالة المنتج
    condition_status: column.text,
    resellable: column.integer,
    inventory_returned: column.integer,
    inventory_returned_at: column.text,
    inventory_notes: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], return: ['return_id'], product: ['product_id'] } }
);

// ========================================
// 28. SUBSCRIPTION TRANSACTIONS (معاملات الاشتراكات)
// ========================================
const subscription_transactions = new Table(
  {
    organization_id: column.text,
    service_id: column.text,
    service_name: column.text,
    provider: column.text,
    logo_url: column.text,
    transaction_type: column.text,
    amount: column.real,
    cost: column.real,
    profit: column.real,
    customer_id: column.text,
    customer_name: column.text,
    customer_contact: column.text,
    payment_method: column.text,
    payment_reference: column.text,
    payment_status: column.text,
    quantity: column.integer,
    description: column.text,
    notes: column.text,
    tracking_code: column.text,
    public_tracking_code: column.text,
    account_username: column.text,
    account_email: column.text,
    account_password: column.text,
    account_notes: column.text,
    processed_by: column.text,
    approved_by: column.text,
    transaction_date: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], customer: ['customer_id'], tracking: ['tracking_code'] } }
);

// ========================================
// 29. ACTIVATION CODES (أكواد التفعيل)
// ========================================
const activation_codes = new Table(
  {
    organization_id: column.text,
    code: column.text,
    batch_id: column.text,
    plan_id: column.text,
    status: column.text,
    subscription_id: column.text,
    expires_at: column.text,
    used_at: column.text,
    notes: column.text,
    created_by: column.text,
    billing_cycle: column.text,
    lifetime_courses_access: column.integer,
    courses_access_type: column.text,
    accessible_courses: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], code: ['code'], status: ['status'] } }
);

// ========================================
// 30. SUBSCRIPTION HISTORY (سجل الاشتراكات)
// ========================================
const subscription_history = new Table(
  {
    organization_id: column.text,
    plan_id: column.text,
    action: column.text,
    from_status: column.text,
    to_status: column.text,
    from_plan_id: column.text,
    amount: column.real,
    notes: column.text,
    created_by: column.text,
    created_at: column.text,
  },
  { indexes: { org: ['organization_id'] } }
);

// ========================================
// 31. SUPPLIER PAYMENTS (مدفوعات الموردين) ✅ جديد
// ========================================
const supplier_payments = new Table(
  {
    organization_id: column.text,
    supplier_id: column.text,
    purchase_id: column.text,
    payment_date: column.text,
    amount: column.real,
    payment_method: column.text,
    reference_number: column.text,
    notes: column.text,
    is_full_payment: column.integer, // ✅ إضافة
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], supplier: ['supplier_id'], purchase: ['purchase_id'] } }
);

// ========================================
// 32. SUBSCRIPTION PLANS (خطط الاشتراك - عامة)
// ========================================
const subscription_plans = new Table(
  {
    name: column.text,
    code: column.text,
    description: column.text,
    features: column.text,
    monthly_price: column.real,
    yearly_price: column.real,
    trial_period_days: column.integer,
    limits: column.text,
    permissions: column.text,
    is_active: column.integer,
    is_popular: column.integer,
    display_order: column.integer,
    max_online_orders: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { code: ['code'], active: ['is_active'] } }
);

// ========================================
// 32. PAYMENT METHODS (طرق الدفع - عامة)
// ========================================
const payment_methods = new Table(
  {
    name: column.text,
    code: column.text,
    description: column.text,
    instructions: column.text,
    icon: column.text,
    fields: column.text,
    is_active: column.integer,
    display_order: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { code: ['code'], active: ['is_active'] } }
);

// ╔════════════════════════════════════════════════════════════════════════════╗
// ║                    👥 HR MANAGEMENT TABLES                                  ║
// ║              نظام إدارة الموارد البشرية                                    ║
// ║              ⚡ جديد v4.0 - 2025-12-10                                      ║
// ╚════════════════════════════════════════════════════════════════════════════╝

// ========================================
// HR-1. WORK SHIFTS (الورديات)
// ========================================
const work_shifts = new Table(
  {
    organization_id: column.text,
    name: column.text,
    name_ar: column.text,
    start_time: column.text, // TIME as text
    end_time: column.text, // TIME as text
    break_duration_minutes: column.integer,
    grace_period_minutes: column.integer,
    overtime_rate: column.real,
    is_active: column.integer,
    is_default: column.integer,
    color: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { org: ['organization_id'], active: ['is_active'] } }
);

// ========================================
// HR-2. EMPLOYEE SHIFT ASSIGNMENTS (تعيين الورديات)
// ========================================
const employee_shift_assignments = new Table(
  {
    organization_id: column.text,
    employee_id: column.text,
    shift_id: column.text,
    start_date: column.text, // DATE as text
    end_date: column.text,
    days_of_week: column.text, // JSON array [0,1,2,3,4,5,6]
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      employee: ['employee_id'],
      shift: ['shift_id'],
      org_employee: ['organization_id', 'employee_id'],
    }
  }
);

// ========================================
// HR-3. EMPLOYEE ATTENDANCE (الحضور والانصراف)
// ========================================
const employee_attendance = new Table(
  {
    organization_id: column.text,
    employee_id: column.text,
    shift_id: column.text,
    // التاريخ والأوقات
    attendance_date: column.text,
    check_in_time: column.text, // TIMESTAMPTZ as text
    check_out_time: column.text,
    expected_check_in: column.text,
    expected_check_out: column.text,
    // حسابات الوقت (بالدقائق)
    late_minutes: column.integer,
    early_leave_minutes: column.integer,
    overtime_minutes: column.integer,
    work_duration_minutes: column.integer,
    break_duration_minutes: column.integer,
    // الحالة
    status: column.text, // present, absent, late, early_leave, half_day, on_leave, sick_leave, remote, holiday
    // معلومات الموقع
    check_in_location: column.text, // JSON
    check_out_location: column.text, // JSON
    check_in_device: column.text,
    check_out_device: column.text,
    check_in_photo_url: column.text,
    check_out_photo_url: column.text,
    // ملاحظات
    notes: column.text,
    admin_notes: column.text,
    is_manual_entry: column.integer,
    approved_by: column.text,
    approved_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      employee: ['employee_id'],
      date: ['attendance_date'],
      org_date: ['organization_id', 'attendance_date'],
      org_employee_date: ['organization_id', 'employee_id', 'attendance_date'],
      status: ['status'],
    }
  }
);

// ========================================
// HR-4. ATTENDANCE ADJUSTMENTS (تعديلات الحضور)
// ========================================
const attendance_adjustments = new Table(
  {
    organization_id: column.text,
    attendance_id: column.text,
    adjusted_by: column.text,
    field_changed: column.text,
    old_value: column.text,
    new_value: column.text,
    reason: column.text,
    created_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      attendance: ['attendance_id'],
    }
  }
);

// ========================================
// HR-5. LEAVE TYPES (أنواع الإجازات)
// ========================================
const leave_types = new Table(
  {
    organization_id: column.text,
    name: column.text,
    name_ar: column.text,
    code: column.text, // annual, sick, unpaid, maternity, etc.
    color: column.text,
    icon: column.text,
    // الإعدادات
    days_per_year: column.integer,
    can_carry_forward: column.integer,
    max_carry_forward_days: column.integer,
    requires_approval: column.integer,
    requires_attachment: column.integer,
    min_days_notice: column.integer,
    max_consecutive_days: column.integer,
    // مدفوعة أم لا
    is_paid: column.integer,
    pay_percentage: column.real,
    // القيود
    gender_restriction: column.text, // male, female, null
    min_service_months: column.integer,
    is_active: column.integer,
    sort_order: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      code: ['code'],
      active: ['is_active'],
    }
  }
);

// ========================================
// HR-6. EMPLOYEE LEAVE BALANCES (رصيد الإجازات)
// ========================================
const employee_leave_balances = new Table(
  {
    organization_id: column.text,
    employee_id: column.text,
    leave_type_id: column.text,
    year: column.integer,
    total_days: column.real,
    used_days: column.real,
    pending_days: column.real,
    carried_forward_days: column.real,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      employee: ['employee_id'],
      employee_year: ['employee_id', 'year'],
      org_year: ['organization_id', 'year'],
    }
  }
);

// ========================================
// HR-7. LEAVE REQUESTS (طلبات الإجازة)
// ========================================
const leave_requests = new Table(
  {
    organization_id: column.text,
    employee_id: column.text,
    leave_type_id: column.text,
    // التواريخ
    start_date: column.text,
    end_date: column.text,
    total_days: column.real,
    is_half_day: column.integer,
    half_day_type: column.text, // morning, afternoon
    // الحالة
    status: column.text, // pending, approved, rejected, cancelled, withdrawn
    // التفاصيل
    reason: column.text,
    attachment_urls: column.text, // JSON array
    // الموافقة
    reviewed_by: column.text,
    reviewed_at: column.text,
    review_notes: column.text,
    // البديل
    substitute_employee_id: column.text,
    handover_notes: column.text,
    // الإلغاء
    cancelled_by: column.text,
    cancelled_at: column.text,
    cancellation_reason: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      employee: ['employee_id'],
      status: ['status'],
      dates: ['start_date', 'end_date'],
      org_status: ['organization_id', 'status'],
    }
  }
);

// ========================================
// HR-8. OFFICIAL HOLIDAYS (العطلات الرسمية)
// ========================================
const official_holidays = new Table(
  {
    organization_id: column.text,
    name: column.text,
    name_ar: column.text,
    date: column.text,
    is_recurring: column.integer,
    is_half_day: column.integer,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      date: ['date'],
      org_date: ['organization_id', 'date'],
    }
  }
);

// ========================================
// HR-9. SALARY STRUCTURES (هيكل الرواتب)
// ========================================
const salary_structures = new Table(
  {
    organization_id: column.text,
    employee_id: column.text,
    // الراتب الأساسي
    basic_salary: column.real,
    currency: column.text,
    // البدلات
    housing_allowance: column.real,
    transport_allowance: column.real,
    food_allowance: column.real,
    phone_allowance: column.real,
    other_allowances: column.text, // JSON
    // الخصومات الثابتة
    social_insurance: column.real,
    health_insurance: column.real,
    tax_amount: column.real,
    other_deductions: column.text, // JSON
    // طريقة الدفع
    payment_method: column.text, // bank_transfer, cash, check, mobile_wallet
    bank_name: column.text,
    bank_account_number: column.text,
    // الصلاحية
    effective_from: column.text,
    effective_to: column.text,
    is_current: column.integer,
    // معدلات
    hourly_rate: column.real,
    daily_rate: column.real,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      employee: ['employee_id'],
      org_employee: ['organization_id', 'employee_id'],
      current: ['is_current'],
    }
  }
);

// ========================================
// HR-10. PAYROLL RECORDS (سجلات الرواتب)
// ========================================
const payroll_records = new Table(
  {
    organization_id: column.text,
    employee_id: column.text,
    salary_structure_id: column.text,
    // الفترة
    pay_period_month: column.integer,
    pay_period_year: column.integer,
    // الراتب الأساسي والبدلات
    basic_salary: column.real,
    housing_allowance: column.real,
    transport_allowance: column.real,
    food_allowance: column.real,
    phone_allowance: column.real,
    other_allowances: column.real,
    total_allowances: column.real,
    // الإضافات
    overtime_hours: column.real,
    overtime_amount: column.real,
    bonus_amount: column.real,
    commission_amount: column.real,
    incentives: column.real,
    total_earnings: column.real,
    // الخصومات
    absent_days: column.real,
    absent_deduction: column.real,
    late_deduction: column.real,
    advance_deduction: column.real,
    loan_deduction: column.real,
    social_insurance: column.real,
    health_insurance: column.real,
    tax_deduction: column.real,
    other_deductions: column.real,
    total_deductions: column.real,
    // الصافي
    gross_salary: column.real,
    net_salary: column.real,
    // الحالة
    status: column.text, // draft, pending, approved, paid, cancelled
    // الدفع
    payment_date: column.text,
    payment_reference: column.text,
    payment_method: column.text,
    // الموافقة
    approved_by: column.text,
    approved_at: column.text,
    // الملاحظات
    notes: column.text,
    details: column.text, // JSON
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      employee: ['employee_id'],
      period: ['pay_period_year', 'pay_period_month'],
      org_period: ['organization_id', 'pay_period_year', 'pay_period_month'],
      status: ['status'],
    }
  }
);

// ========================================
// HR-11. EMPLOYEE LOANS (السلف والقروض)
// ========================================
const employee_loans = new Table(
  {
    organization_id: column.text,
    employee_id: column.text,
    // نوع القرض
    loan_type: column.text, // salary_advance, personal_loan, emergency_loan
    // المبالغ
    principal_amount: column.real,
    remaining_amount: column.real,
    monthly_deduction: column.real,
    total_installments: column.integer,
    paid_installments: column.integer,
    // التواريخ
    request_date: column.text,
    approval_date: column.text,
    start_deduction_date: column.text,
    expected_end_date: column.text,
    // الحالة
    status: column.text, // pending, approved, rejected, active, completed, cancelled
    // الموافقة
    approved_by: column.text,
    rejection_reason: column.text,
    // ملاحظات
    reason: column.text,
    notes: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      employee: ['employee_id'],
      status: ['status'],
      org_employee: ['organization_id', 'employee_id'],
    }
  }
);

// ========================================
// HR-12. LOAN PAYMENTS (دفعات القروض)
// ========================================
const loan_payments = new Table(
  {
    organization_id: column.text,
    loan_id: column.text,
    payroll_id: column.text,
    payment_date: column.text,
    amount: column.real,
    installment_number: column.integer,
    payment_method: column.text,
    reference: column.text,
    notes: column.text,
    created_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      loan: ['loan_id'],
      payroll: ['payroll_id'],
    }
  }
);

// ========================================
// HR-13. PERFORMANCE CRITERIA (معايير الأداء)
// ========================================
const performance_criteria = new Table(
  {
    organization_id: column.text,
    name: column.text,
    name_ar: column.text,
    description: column.text,
    // التصنيف
    category: column.text, // productivity, quality, attendance, teamwork, communication, etc.
    // الوزن والحدود
    weight: column.real,
    max_score: column.integer,
    // الوصف لكل درجة
    score_descriptions: column.text, // JSON
    is_active: column.integer,
    sort_order: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      category: ['category'],
      active: ['is_active'],
    }
  }
);

// ========================================
// HR-14. PERFORMANCE REVIEW PERIODS (فترات التقييم)
// ========================================
const performance_review_periods = new Table(
  {
    organization_id: column.text,
    name: column.text,
    name_ar: column.text,
    // الفترة
    start_date: column.text,
    end_date: column.text,
    // مواعيد التقييم
    review_start_date: column.text,
    review_end_date: column.text,
    // الحالة
    status: column.text, // upcoming, in_progress, completed, cancelled
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      status: ['status'],
      dates: ['start_date', 'end_date'],
    }
  }
);

// ========================================
// HR-15. PERFORMANCE REVIEWS (تقييمات الأداء)
// ========================================
const performance_reviews = new Table(
  {
    organization_id: column.text,
    employee_id: column.text,
    reviewer_id: column.text,
    period_id: column.text,
    // الفترة
    review_period_start: column.text,
    review_period_end: column.text,
    // الدرجات
    scores: column.text, // JSON {criteria_id: {score, comment}}
    total_score: column.real,
    weighted_score: column.real,
    grade: column.text, // A, B, C, D, F
    // التقييم العام
    strengths: column.text,
    areas_for_improvement: column.text,
    achievements: column.text,
    goals_for_next_period: column.text,
    // التعليقات
    reviewer_comments: column.text,
    employee_comments: column.text,
    manager_comments: column.text,
    // التوصيات
    recommendations: column.text, // JSON
    // الحالة
    status: column.text, // draft, submitted, acknowledged, disputed, finalized
    // التوقيعات
    submitted_at: column.text,
    acknowledged_at: column.text,
    finalized_at: column.text,
    finalized_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      employee: ['employee_id'],
      reviewer: ['reviewer_id'],
      period: ['period_id'],
      status: ['status'],
      org_employee: ['organization_id', 'employee_id'],
    }
  }
);

// ========================================
// HR-16. EMPLOYEE GOALS (أهداف الموظفين)
// ========================================
const employee_goals = new Table(
  {
    organization_id: column.text,
    employee_id: column.text,
    assigned_by: column.text,
    // تفاصيل الهدف
    title: column.text,
    description: column.text,
    category: column.text, // sales, productivity, learning, project, personal, team
    // القياس
    target_type: column.text, // numeric, percentage, binary, milestone
    target_value: column.real,
    current_value: column.real,
    unit: column.text,
    // المراحل
    milestones: column.text, // JSON array
    // التواريخ
    start_date: column.text,
    due_date: column.text,
    completed_at: column.text,
    // الأولوية والوزن
    priority: column.text, // low, medium, high, critical
    weight: column.real,
    // الحالة
    status: column.text, // draft, active, on_hold, achieved, partially, missed, cancelled
    // النتيجة
    achievement_percentage: column.real,
    final_notes: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      employee: ['employee_id'],
      status: ['status'],
      due_date: ['due_date'],
      org_employee: ['organization_id', 'employee_id'],
    }
  }
);

// ========================================
// HR-17. GOAL UPDATES (تحديثات الأهداف)
// ========================================
const goal_updates = new Table(
  {
    organization_id: column.text,
    goal_id: column.text,
    updated_by: column.text,
    previous_value: column.real,
    new_value: column.real,
    notes: column.text,
    created_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      goal: ['goal_id'],
    }
  }
);

// ========================================
// HR-18. EMPLOYEE WARNINGS (الإنذارات)
// ========================================
const employee_warnings = new Table(
  {
    organization_id: column.text,
    employee_id: column.text,
    issued_by: column.text,
    // نوع الإنذار
    warning_type: column.text, // verbal, written, final_warning, suspension, termination
    // السبب
    reason_category: column.text, // attendance, performance, behavior, policy_violation, safety, other
    // التفاصيل
    title: column.text,
    description: column.text,
    incident_date: column.text,
    evidence_urls: column.text, // JSON array
    // الإجراء
    action_required: column.text,
    improvement_deadline: column.text,
    // الحالة
    status: column.text, // draft, issued, acknowledged, appealed, resolved, expired, revoked
    // الاستلام
    acknowledged_at: column.text,
    employee_response: column.text,
    // الانتهاء
    expires_at: column.text,
    resolved_at: column.text,
    resolved_by: column.text,
    resolution_notes: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      employee: ['employee_id'],
      status: ['status'],
      type: ['warning_type'],
      org_employee: ['organization_id', 'employee_id'],
    }
  }
);

// ========================================
// HR-19. EMPLOYEE DOCUMENTS (وثائق الموظفين)
// ========================================
const employee_documents = new Table(
  {
    organization_id: column.text,
    employee_id: column.text,
    uploaded_by: column.text,
    // نوع الوثيقة
    document_type: column.text, // contract, id_card, passport, qualification, certificate, medical, other
    // التفاصيل
    title: column.text,
    description: column.text,
    file_url: column.text,
    file_name: column.text,
    file_size: column.integer,
    file_type: column.text,
    // الصلاحية
    issue_date: column.text,
    expiry_date: column.text,
    // الحالة
    is_verified: column.integer,
    verified_by: column.text,
    verified_at: column.text,
    is_confidential: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      employee: ['employee_id'],
      type: ['document_type'],
      expiry: ['expiry_date'],
      org_employee: ['organization_id', 'employee_id'],
    }
  }
);

// ========================================
// HR-20. EMPLOYEE DAILY STATS (إحصائيات يومية)
// ========================================
const employee_daily_stats = new Table(
  {
    organization_id: column.text,
    employee_id: column.text,
    stat_date: column.text,
    // إحصائيات المبيعات
    total_sales: column.real,
    total_orders: column.integer,
    cash_sales: column.real,
    card_sales: column.real,
    credit_sales: column.real,
    returns_amount: column.real,
    returns_count: column.integer,
    // إحصائيات الأداء
    products_sold: column.integer,
    customers_served: column.integer,
    avg_transaction_value: column.real,
    avg_transaction_time: column.integer, // بالثواني
    // إحصائيات الحضور
    check_in_time: column.text,
    check_out_time: column.text,
    work_hours: column.real,
    break_hours: column.real,
    overtime_hours: column.real,
    // تقييم اليوم
    customer_rating: column.real,
    supervisor_rating: column.real,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      org: ['organization_id'],
      employee: ['employee_id'],
      date: ['stat_date'],
      org_date: ['organization_id', 'stat_date'],
      employee_date: ['employee_id', 'stat_date'],
    }
  }
);

// ╔════════════════════════════════════════════════════════════════════════════╗
// ║                      📦 LOCAL-ONLY TABLES                                  ║
// ║              الجداول المحلية فقط (لا تُزامن)                              ║
// ╚════════════════════════════════════════════════════════════════════════════╝

// ========================================
// 🖼️ LOCAL IMAGE CACHE (كاش الصور المحلي)
// ========================================
const local_image_cache = new Table(
  {
    product_id: column.text,
    organization_id: column.text,
    base64_data: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { localOnly: true, indexes: { product: ['product_id'] } }
);

// ========================================
// 🔒 APP INIT CACHE (كاش التهيئة)
// ========================================
const app_init_cache = new Table(
  {
    cache_key: column.text,
    cache_value: column.text,
    organization_id: column.text,
    expires_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { localOnly: true, indexes: { key: ['cache_key'], org: ['organization_id'] } }
);

// ========================================
// 🔐 STAFF PINS (PIN مشفر للأوفلاين)
// ========================================
const staff_pins = new Table(
  {
    staff_id: column.text,
    organization_id: column.text,
    staff_name: column.text,
    pin_hash: column.text,
    salt: column.text,
    permissions: column.text,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { localOnly: true, indexes: { org: ['organization_id'], staff: ['staff_id'] } }
);

// ========================================
// 📤 SYNC OUTBOX (العمليات المعلقة)
// ========================================
const sync_outbox = new Table(
  {
    table_name: column.text,
    operation: column.text,
    record_id: column.text,
    organization_id: column.text,
    payload: column.text,
    status: column.text,
    retry_count: column.integer,
    error_message: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { localOnly: true, indexes: { status: ['status'], table: ['table_name'], org: ['organization_id'] } }
);

// ========================================
// 🔑 LOCAL AUTH DATA (بيانات المصادقة)
// ========================================
const local_auth_data = new Table(
  {
    key: column.text,
    value: column.text,
    auth_user_id: column.text, // ⚡ FIX: اسم العمود الصحيح
    organization_id: column.text,
    expires_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { localOnly: true, indexes: { key: ['key'], user: ['auth_user_id'] } }
);

// ========================================
// 🔔 CACHED NOTIFICATIONS (الإشعارات المخزنة)
// ========================================
const cached_notifications = new Table(
  {
    organization_id: column.text,
    type: column.text,
    title: column.text,
    message: column.text,
    priority: column.text,
    is_read: column.integer,
    entity_type: column.text,
    entity_id: column.text,
    metadata: column.text,
    created_at: column.text,
    updated_at: column.text,
    synced_at: column.text,
  },
  { localOnly: true, indexes: { org: ['organization_id'], created: ['created_at'] } }
);

// ========================================
// 📤 NOTIFICATION SYNC QUEUE (قائمة مزامنة الإشعارات)
// ========================================
const notification_sync_queue = new Table(
  {
    notification_id: column.text,
    action: column.text,
    data: column.text,
    created_at: column.text,
    attempts: column.integer,
    last_attempt: column.text,
  },
  { localOnly: true, indexes: { created: ['created_at'] } }
);

// ========================================
// 🔐 USER PERMISSIONS (صلاحيات المستخدم - كاش محلي)
// تم تحديثه: 2025-12-10 لدعم الأوفلاين الكامل
// ========================================
const user_permissions = new Table(
  {
    auth_user_id: column.text,
    user_id: column.text,
    email: column.text,
    name: column.text,
    organization_id: column.text,
    role: column.text,
    permissions: column.text, // JSON string
    is_org_admin: column.integer,
    is_super_admin: column.integer,
    is_active: column.integer,
    // صلاحيات محسوبة (computed) للوصول السريع
    has_inventory_access: column.integer,
    can_manage_products: column.integer,
    can_view_reports: column.integer,
    can_manage_users: column.integer,
    can_manage_orders: column.integer,
    can_access_pos: column.integer,
    can_manage_settings: column.integer,
    // timestamps
    last_synced_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    localOnly: true,
    indexes: {
      user: ['auth_user_id'],
      org: ['organization_id'],
      user_org: ['auth_user_id', 'organization_id'],
      role: ['role']
    }
  }
);

// ========================================
// 🔔 NOTIFICATION SETTINGS (إعدادات الإشعارات - محلي فقط)
// ========================================
const notification_settings = new Table(
  {
    organization_id: column.text,
    settings: column.text,  // JSON object containing all settings
    created_at: column.text,
    updated_at: column.text,
  },
  { localOnly: true, indexes: { org: ['organization_id'] } }
);

// ========================================
// 📴 OFFLINE NOTIFICATIONS (الإشعارات المحلية)
// ========================================
const offline_notifications = new Table(
  {
    organization_id: column.text,
    type: column.text,
    title: column.text,
    message: column.text,
    priority: column.text,
    status: column.text,       // ⚡ pending, delivered, read, dismissed
    source: column.text,       // ⚡ local, server
    is_read: column.integer,
    entity_type: column.text,
    entity_id: column.text,
    data: column.text,         // ⚡ JSON metadata
    metadata: column.text,
    action_url: column.text,
    action_label: column.text,
    read_at: column.text,
    expires_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { localOnly: true, indexes: { org: ['organization_id'], type: ['type'], created: ['created_at'], status: ['status'] } }
);

// ========================================
// 📉 LOW STOCK TRACKING (تتبع نفاد المخزون - محلي)
// ========================================
const low_stock_tracking = new Table(
  {
    product_id: column.text,
    organization_id: column.text,
    product_name: column.text,
    current_stock: column.real,
    min_stock_level: column.real,
    last_notified_at: column.text,
    last_quantity: column.real,  // ⚡ آخر كمية تم الإشعار عنها
    notification_count: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { localOnly: true, indexes: { org: ['organization_id'], product: ['product_id'] } }
);

// ========================================
// 💰 CUSTOMER DEBTS (ديون العملاء - محلي فقط)
// ========================================
const customer_debts = new Table(
  {
    organization_id: column.text,
    customer_id: column.text,
    customer_name: column.text,
    customer_phone: column.text,
    order_id: column.text,
    order_number: column.text,
    total_amount: column.real,
    paid_amount: column.real,
    remaining_amount: column.real,
    amount: column.real,  // ⚡ alias for remaining_amount (للتوافق)
    due_date: column.text,
    status: column.text,
    notes: column.text,
    last_payment_date: column.text,
    last_reminder_at: column.text,
    reminder_count: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { localOnly: true, indexes: { org: ['organization_id'], customer: ['customer_id'], status: ['status'] } }
);

// ========================================
// 📋 SUBSCRIPTION AUDIT LOGS (سجل تدقيق الاشتراكات - محلي)
// ========================================
const subscription_audit_logs = new Table(
  {
    organization_id: column.text,
    user_id: column.text,
    event_type: column.text,  // نوع الحدث (ACTIVATION_ATTEMPT, etc)
    timestamp: column.text,   // وقت الحدث
    details: column.text,     // JSON
    ip_address: column.text,
    user_agent: column.text,
    device_info: column.text,
    severity: column.text,    // info, warning, error, critical
    synced: column.integer,   // 0 or 1
    created_at: column.text,
  },
  { localOnly: true, indexes: { org: ['organization_id'], event: ['event_type'], time: ['timestamp'] } }
);

// ========================================
// 📊 INVENTORY BATCH MOVEMENTS (سجل حركات الدفعات - Ledger)
// ⚡ v5.0: للتتبع والتدقيق - تُزامن مع السيرفر
// يُستخدم لتسجيل كل استهلاك/إرجاع من الدفعات
// ========================================
const inventory_batch_movements = new Table(
  {
    organization_id: column.text,
    batch_id: column.text,          // معرف الدفعة
    product_id: column.text,        // معرف المنتج
    delta_quantity: column.real,    // التغيير (سالب للاستهلاك، موجب للإرجاع) - decimal لدعم الوزن/المتر
    unit_type: column.text,         // 'piece' | 'weight' | 'meter' | 'box'
    source: column.text,            // 'sale' | 'return' | 'loss' | 'adjustment' | 'transfer'
    order_id: column.text,          // معرف الطلب المرتبط (إن وجد)
    device_id: column.text,         // معرف الجهاز الذي أجرى العملية
    synced: column.integer,         // 0 = لم يُزامن، 1 = تم المزامنة
    created_at: column.text,
  },
  {
    localOnly: true, // محلي حتى يتم المزامنة
    indexes: {
      org: ['organization_id'],
      batch: ['batch_id'],
      product: ['product_id'],
      order: ['order_id'],
      synced: ['synced'],
      time: ['created_at']
    }
  }
);

// ========================================
// 🔒 SERIAL RESERVATION LOG (سجل حجوزات الأرقام التسلسلية)
// ⚡ v5.0: لتتبع الحجوزات وحل التعارضات
// ========================================
const serial_reservations = new Table(
  {
    organization_id: column.text,
    serial_id: column.text,           // معرف الرقم التسلسلي
    device_id: column.text,           // الجهاز الذي حجز
    order_draft_id: column.text,      // معرف مسودة الطلب
    reserved_at: column.text,         // وقت الحجز
    expires_at: column.text,          // وقت انتهاء الحجز
    status: column.text,              // 'active' | 'released' | 'converted' (تحول لبيع)
    released_at: column.text,         // وقت التحرير (إن حدث)
    converted_order_id: column.text,  // معرف الطلب النهائي (إذا تم البيع)
    created_at: column.text,
  },
  {
    localOnly: true,
    indexes: {
      org: ['organization_id'],
      serial: ['serial_id'],
      device: ['device_id'],
      status: ['status'],
      expires: ['expires_at']
    }
  }
);

// ========================================
// 🖨️ LOCAL PRINTER SETTINGS (إعدادات الطابعة المحلية - لكل جهاز)
// ⚡ v50: إعدادات خاصة بالجهاز - لا تُزامن
// ========================================
const local_printer_settings = new Table(
  {
    organization_id: column.text,
    device_id: column.text,           // معرف الجهاز (فريد لكل جهاز)
    // نوع الطابعة
    printer_name: column.text,        // اسم الطابعة المحددة
    printer_type: column.text,        // 'thermal' | 'normal'
    // إعدادات الطباعة التلقائية
    silent_print: column.integer,     // طباعة صامتة بدون نافذة
    print_on_order: column.integer,   // طباعة تلقائية عند إتمام الطلب
    print_copies: column.integer,     // عدد النسخ
    // إعدادات الطابعة الحرارية
    open_cash_drawer: column.integer, // فتح درج النقود بعد الطباعة
    beep_after_print: column.integer, // صوت تنبيه بعد الطباعة
    auto_cut: column.integer,         // قطع الورق تلقائياً
    // أبعاد الطباعة
    paper_width: column.integer,      // عرض الورق (48, 58, 80 mm)
    margin_top: column.integer,       // هامش أعلى (mm)
    margin_bottom: column.integer,    // هامش أسفل (mm)
    margin_left: column.integer,      // هامش يسار (mm)
    margin_right: column.integer,     // هامش يمين (mm)
    // جودة الطباعة
    font_size: column.integer,        // حجم الخط (px)
    line_spacing: column.real,        // تباعد الأسطر
    print_density: column.text,       // 'light' | 'normal' | 'dark'
    // قالب الوصل
    receipt_template: column.text,    // 'apple' | 'minimal' | 'modern' | 'classic'
    item_display_style: column.text,  // 'compact' | 'table' | 'list'
    // التواريخ
    created_at: column.text,
    updated_at: column.text,
  },
  { localOnly: true, indexes: { org: ['organization_id'], device: ['device_id'] } }
);

// ╔════════════════════════════════════════════════════════════════════════════╗
// ║                        📦 EXPORT SCHEMA                                    ║
// ╚════════════════════════════════════════════════════════════════════════════╝

export const PowerSyncSchema = new Schema({
  // ═══════════════════════════════════════
  // 🔄 SYNCED TABLES (54 tables)
  // ═══════════════════════════════════════

  // Products (9) - تم إضافة inventory_batches و product_serial_numbers
  products,
  product_categories,
  product_subcategories,
  product_colors,
  product_sizes,
  product_images,
  product_wholesale_tiers,
  inventory_batches,
  product_serial_numbers,

  // Orders (2)
  orders,
  order_items,

  // Business (6)
  customers,
  suppliers,
  pos_staff_sessions,
  staff_work_sessions,
  expenses,
  expense_categories,

  // Purchases (6) - ✅ جديد v3.1
  supplier_purchases,
  supplier_purchase_items,
  supplier_payments,
  purchase_landed_costs,
  purchase_price_updates,
  purchase_templates,

  // Invoices (2)
  invoices,
  invoice_items,

  // Losses (2) - اسم الجدول الصحيح: losses
  losses,
  loss_items,

  // Repairs (4) - اسم الجدول الصحيح: repair_orders
  repair_orders,
  repair_locations,
  repair_images,
  repair_status_history,

  // Returns (2) - اسم الجدول الصحيح: returns
  returns,
  return_items,

  // Subscription Services (1)
  subscription_transactions,

  // System (8)
  users,
  organizations,
  organization_subscriptions,
  pos_settings,
  activation_codes,
  subscription_history,
  subscription_plans,
  payment_methods,

  // ═══════════════════════════════════════
  // 👥 HR MANAGEMENT TABLES (20) - ⚡ جديد v4.0
  // ═══════════════════════════════════════
  work_shifts,
  employee_shift_assignments,
  employee_attendance,
  attendance_adjustments,
  leave_types,
  employee_leave_balances,
  leave_requests,
  official_holidays,
  salary_structures,
  payroll_records,
  employee_loans,
  loan_payments,
  performance_criteria,
  performance_review_periods,
  performance_reviews,
  employee_goals,
  goal_updates,
  employee_warnings,
  employee_documents,
  employee_daily_stats,

  // ═══════════════════════════════════════
  // 📦 LOCAL-ONLY TABLES (14)
  // ═══════════════════════════════════════
  local_image_cache,
  app_init_cache,
  staff_pins,
  sync_outbox,
  local_auth_data,
  cached_notifications,
  notification_sync_queue,
  user_permissions,
  // ⚡ NEW: Notification & Tracking Tables
  notification_settings,
  offline_notifications,
  low_stock_tracking,
  customer_debts,
  subscription_audit_logs,
  // ⚡ v50: Printer Settings (local per device)
  local_printer_settings,
  // ⚡ v5.0: Batch & Serial Tracking (Ledger + Reservations)
  inventory_batch_movements,
  serial_reservations,
});

// Debug logging
console.log('[PowerSyncSchema] Tables:', Object.keys(PowerSyncSchema.tables).length);

export default PowerSyncSchema;
