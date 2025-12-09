/**
 * ⚡ Products Table Schema
 * متطابق 100% مع Supabase
 *
 * ملاحظة: لا يوجد أي أعمدة camelCase
 * جميع الأعمدة المحلية تبدأ بـ _ (underscore)
 */

export const PRODUCTS_TABLE = `
CREATE TABLE IF NOT EXISTS products (
  -- ═══════════════════════════════════════════════════════════════
  -- المفاتيح
  -- ═══════════════════════════════════════════════════════════════
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  category_id TEXT,
  subcategory_id TEXT,
  supplier_id TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- الأساسي
  -- ═══════════════════════════════════════════════════════════════
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT NOT NULL,
  barcode TEXT,
  slug TEXT,
  brand TEXT,
  category TEXT,
  subcategory TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- التسعير
  -- ═══════════════════════════════════════════════════════════════
  price REAL NOT NULL DEFAULT 0,
  compare_at_price REAL,
  purchase_price REAL,

  -- ═══════════════════════════════════════════════════════════════
  -- تسعير الجملة
  -- ═══════════════════════════════════════════════════════════════
  wholesale_price REAL,
  partial_wholesale_price REAL,
  min_wholesale_quantity INTEGER,
  min_partial_wholesale_quantity INTEGER,
  allow_retail INTEGER DEFAULT 1,
  allow_wholesale INTEGER DEFAULT 0,
  allow_partial_wholesale INTEGER DEFAULT 0,

  -- ═══════════════════════════════════════════════════════════════
  -- البيع بالوحدة
  -- ═══════════════════════════════════════════════════════════════
  is_sold_by_unit INTEGER DEFAULT 1,
  unit_type TEXT,
  unit_purchase_price REAL,
  unit_sale_price REAL,

  -- ═══════════════════════════════════════════════════════════════
  -- المخزون
  -- ═══════════════════════════════════════════════════════════════
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  reorder_level INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 20,

  -- ═══════════════════════════════════════════════════════════════
  -- الحالة
  -- ═══════════════════════════════════════════════════════════════
  is_active INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  is_digital INTEGER DEFAULT 0,
  is_new INTEGER DEFAULT 0,
  show_price_on_landing INTEGER DEFAULT 1,

  -- ═══════════════════════════════════════════════════════════════
  -- المتغيرات
  -- ═══════════════════════════════════════════════════════════════
  has_variants INTEGER DEFAULT 0,
  use_sizes INTEGER DEFAULT 0,
  use_variant_prices INTEGER DEFAULT 0,

  -- ═══════════════════════════════════════════════════════════════
  -- البيع بالوزن
  -- ═══════════════════════════════════════════════════════════════
  sell_by_weight INTEGER DEFAULT 0,
  weight_unit TEXT DEFAULT 'kg',
  price_per_weight_unit REAL,
  purchase_price_per_weight_unit REAL,
  min_weight_per_sale REAL,
  max_weight_per_sale REAL,
  average_item_weight REAL,
  available_weight REAL DEFAULT 0,
  total_weight_purchased REAL DEFAULT 0,

  -- ═══════════════════════════════════════════════════════════════
  -- البيع بالصندوق
  -- ═══════════════════════════════════════════════════════════════
  sell_by_box INTEGER DEFAULT 0,
  units_per_box INTEGER DEFAULT 1,
  box_price REAL,
  box_purchase_price REAL,
  box_barcode TEXT,
  allow_single_unit_sale INTEGER DEFAULT 1,
  available_boxes INTEGER DEFAULT 0,
  total_boxes_purchased INTEGER DEFAULT 0,

  -- ═══════════════════════════════════════════════════════════════
  -- البيع بالمتر
  -- ═══════════════════════════════════════════════════════════════
  sell_by_meter INTEGER DEFAULT 0,
  meter_unit TEXT DEFAULT 'm',
  price_per_meter REAL,
  purchase_price_per_meter REAL,
  min_meters_per_sale REAL DEFAULT 0.1,
  roll_length_meters REAL,
  available_length REAL DEFAULT 0,
  total_meters_purchased REAL DEFAULT 0,

  -- ═══════════════════════════════════════════════════════════════
  -- التتبع
  -- ═══════════════════════════════════════════════════════════════
  track_expiry INTEGER DEFAULT 0,
  default_expiry_days INTEGER,
  expiry_alert_days INTEGER DEFAULT 30,
  track_serial_numbers INTEGER DEFAULT 0,
  require_serial_on_sale INTEGER DEFAULT 0,
  track_batches INTEGER DEFAULT 0,
  use_fifo INTEGER DEFAULT 1,

  -- ═══════════════════════════════════════════════════════════════
  -- الضمان
  -- ═══════════════════════════════════════════════════════════════
  has_warranty INTEGER DEFAULT 0,
  warranty_duration_months INTEGER,
  warranty_type TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- الصور
  -- ═══════════════════════════════════════════════════════════════
  images TEXT,
  thumbnail_image TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- النشر
  -- ═══════════════════════════════════════════════════════════════
  publication_status TEXT DEFAULT 'published',
  publish_at TEXT,
  published_at TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- الضرائب
  -- ═══════════════════════════════════════════════════════════════
  tax_rate REAL,
  tax_included INTEGER DEFAULT 1,
  commission_rate REAL,

  -- ═══════════════════════════════════════════════════════════════
  -- الخصائص
  -- ═══════════════════════════════════════════════════════════════
  features TEXT,
  specifications TEXT,
  dimensions TEXT,
  weight_kg REAL,

  -- ═══════════════════════════════════════════════════════════════
  -- خصائص الصيدلية
  -- ═══════════════════════════════════════════════════════════════
  requires_prescription INTEGER DEFAULT 0,
  active_ingredient TEXT,
  dosage_form TEXT,
  concentration TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- خصائص المطاعم
  -- ═══════════════════════════════════════════════════════════════
  preparation_time_minutes INTEGER,
  calories INTEGER,
  allergens TEXT,
  is_vegetarian INTEGER DEFAULT 0,
  is_vegan INTEGER DEFAULT 0,
  is_gluten_free INTEGER DEFAULT 0,
  spice_level INTEGER,

  -- ═══════════════════════════════════════════════════════════════
  -- خصائص قطع الغيار
  -- ═══════════════════════════════════════════════════════════════
  oem_number TEXT,
  compatible_models TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  year_from INTEGER,
  year_to INTEGER,

  -- ═══════════════════════════════════════════════════════════════
  -- خصائص مواد البناء
  -- ═══════════════════════════════════════════════════════════════
  material_type TEXT,
  coverage_area_sqm REAL,

  -- ═══════════════════════════════════════════════════════════════
  -- التصنيع
  -- ═══════════════════════════════════════════════════════════════
  manufacturer TEXT,
  country_of_origin TEXT,
  customs_code TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- الشحن
  -- ═══════════════════════════════════════════════════════════════
  has_fast_shipping INTEGER DEFAULT 0,
  has_money_back INTEGER DEFAULT 0,
  has_quality_guarantee INTEGER DEFAULT 0,
  fast_shipping_text TEXT,
  money_back_text TEXT,
  quality_guarantee_text TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- الإعدادات المتقدمة
  -- ═══════════════════════════════════════════════════════════════
  special_offers_config TEXT,
  advanced_description TEXT,
  purchase_page_config TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- التتبع الداخلي
  -- ═══════════════════════════════════════════════════════════════
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  form_template_id TEXT,
  shipping_provider_id INTEGER,
  shipping_clone_id INTEGER,
  use_shipping_clone INTEGER DEFAULT 0,
  shipping_method_type TEXT DEFAULT 'default',
  name_for_shipping TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- التواريخ
  -- ═══════════════════════════════════════════════════════════════
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_inventory_update TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- أعمدة المزامنة المحلية (تبدأ بـ _)
  -- ═══════════════════════════════════════════════════════════════
  _synced INTEGER DEFAULT 0,
  _sync_status TEXT DEFAULT 'pending',
  _pending_operation TEXT,
  _local_updated_at TEXT,
  _error TEXT,
  _name_lower TEXT,
  _sku_lower TEXT,
  _barcode_lower TEXT
);
`;

export const PRODUCTS_INDEXES = `
-- فهارس البحث الأساسية
CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org_active ON products(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);

-- فهارس البحث المحلية
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products(_name_lower);
CREATE INDEX IF NOT EXISTS idx_products_sku_lower ON products(_sku_lower);
CREATE INDEX IF NOT EXISTS idx_products_barcode_lower ON products(_barcode_lower);

-- فهارس المزامنة
CREATE INDEX IF NOT EXISTS idx_products_sync_status ON products(_synced, _sync_status);
CREATE INDEX IF NOT EXISTS idx_products_pending ON products(_pending_operation) WHERE _pending_operation IS NOT NULL;

-- فهارس المخزون
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(organization_id, stock_quantity, min_stock_level) WHERE is_active = 1;
`;

/**
 * ⚡ Product Colors Table
 */
export const PRODUCT_COLORS_TABLE = `
CREATE TABLE IF NOT EXISTS product_colors (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  hex_code TEXT,
  image_url TEXT,
  stock_quantity INTEGER DEFAULT 0,
  price_adjustment REAL,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),

  _synced INTEGER DEFAULT 0,
  _sync_status TEXT DEFAULT 'pending',
  _pending_operation TEXT,

  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
`;

/**
 * ⚡ Product Sizes Table
 */
export const PRODUCT_SIZES_TABLE = `
CREATE TABLE IF NOT EXISTS product_sizes (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  color_id TEXT,
  name TEXT NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  price_adjustment REAL,
  sku_suffix TEXT,
  barcode TEXT,
  created_at TEXT DEFAULT (datetime('now')),

  _synced INTEGER DEFAULT 0,
  _sync_status TEXT DEFAULT 'pending',
  _pending_operation TEXT,

  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (color_id) REFERENCES product_colors(id) ON DELETE SET NULL
);
`;

/**
 * ⚡ Product Images Table
 */
export const PRODUCT_IMAGES_TABLE = `
CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),

  _synced INTEGER DEFAULT 0,
  _sync_status TEXT DEFAULT 'pending',
  _pending_operation TEXT,

  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
`;

/**
 * ⚡ Product Categories Table
 */
export const PRODUCT_CATEGORIES_TABLE = `
CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  slug TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  parent_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  _synced INTEGER DEFAULT 0,
  _sync_status TEXT DEFAULT 'pending',
  _pending_operation TEXT,

  FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL
);
`;

/**
 * ⚡ Product Subcategories Table
 */
export const PRODUCT_SUBCATEGORIES_TABLE = `
CREATE TABLE IF NOT EXISTS product_subcategories (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  slug TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  _synced INTEGER DEFAULT 0,
  _sync_status TEXT DEFAULT 'pending',
  _pending_operation TEXT,

  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE CASCADE
);
`;
