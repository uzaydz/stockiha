# 🏗️ خطة إعادة البناء الشاملة - MASTER REBUILD PLAN

> **تاريخ التحليل:** 2 ديسمبر 2025
> **الهدف:** نظام مثالي موحد 100% مع Supabase

---

## 📋 الفهرس

1. [ملخص المشاكل المكتشفة](#1-ملخص-المشاكل-المكتشفة)
2. [الهيكل الجديد المقترح](#2-الهيكل-الجديد-المقترح)
3. [المرحلة 1: توحيد التسميات](#3-المرحلة-1-توحيد-التسميات)
4. [المرحلة 2: إعادة بناء SQLite Schema](#4-المرحلة-2-إعادة-بناء-sqlite-schema)
5. [المرحلة 3: إعادة بناء نظام المزامنة](#5-المرحلة-3-إعادة-بناء-نظام-المزامنة)
6. [المرحلة 4: توحيد الأنواع TypeScript](#6-المرحلة-4-توحيد-الأنواع-typescript)
7. [المرحلة 5: تحديث الخدمات](#7-المرحلة-5-تحديث-الخدمات)
8. [المرحلة 6: Migration وترحيل البيانات](#8-المرحلة-6-migration-وترحيل-البيانات)
9. [قائمة الملفات المتأثرة](#9-قائمة-الملفات-المتأثرة)
10. [جدول الأولويات](#10-جدول-الأولويات)

---

## 1. ملخص المشاكل المكتشفة

### 1.1 إحصائيات صادمة

| المشكلة | الأرقام | التأثير |
|---------|---------|---------|
| **أعمدة مكررة في products** | 419 عمود (192 مكرر) | 45.8% هدر |
| **ملفات التسميات المختلطة** | 10+ ملفات | تضارب كبير |
| **جداول بأسماء مختلفة** | 5 جداول | تعقيد المزامنة |
| **أعمدة بأسماء مختلفة** | 50+ عمود | أخطاء البيانات |
| **ثغرات أمنية** | 4 SQL Injection | خطر حرج |
| **Race Conditions** | 3 نقاط | فقدان بيانات |

### 1.2 المشاكل الحرجة (Critical)

```
🔴 1. SQL Injection في SyncManager.ts (سطر 477, 519)
🔴 2. null order_id في order_items (PushEngine.ts سطر 330)
🔴 3. DELTA Race Condition (PushEngine.ts سطر 549-602)
🔴 4. Hardcoded payment_method = 'cash' (SyncManager.ts سطر 162)
🔴 5. ازدواجية 45% في أعمدة products
```

### 1.3 اختلافات الأسماء

| المحلي (SQLite) | السيرفر (Supabase) | الجديد الموحد |
|-----------------|-------------------|---------------|
| `pos_orders` | `orders` | `orders` |
| `pos_order_items` | `order_items` | `order_items` |
| `product_returns` | `returns` | `returns` |
| `loss_declarations` | `losses` | `losses` |
| `work_sessions` | `staff_work_sessions` | `staff_work_sessions` |

---

## 2. الهيكل الجديد المقترح

### 2.1 هيكل المجلدات الجديد

```
src/
├── lib/
│   ├── db/
│   │   ├── schema/
│   │   │   ├── index.ts              # تصدير موحد
│   │   │   ├── tables/
│   │   │   │   ├── products.sql.ts   # schema products
│   │   │   │   ├── orders.sql.ts     # schema orders
│   │   │   │   ├── customers.sql.ts  # schema customers
│   │   │   │   └── ...
│   │   │   ├── indexes.sql.ts        # جميع الفهارس
│   │   │   └── migrations/
│   │   │       ├── v43_unify_schema.ts
│   │   │       └── ...
│   │   ├── operations/
│   │   │   ├── read.ts               # عمليات القراءة
│   │   │   ├── write.ts              # عمليات الكتابة
│   │   │   └── batch.ts              # عمليات الدفعات
│   │   └── sqliteClient.ts           # العميل الموحد
│   │
│   ├── sync/
│   │   ├── core/
│   │   │   ├── SyncManager.ts        # المدير الرئيسي (مُحسّن)
│   │   │   ├── PullEngine.ts         # محرك السحب (مُحسّن)
│   │   │   ├── PushEngine.ts         # محرك الدفع (مُحسّن)
│   │   │   └── DeltaEngine.ts        # محرك DELTA (جديد)
│   │   ├── queue/
│   │   │   ├── OutboxManager.ts      # إدارة الصادر
│   │   │   └── ConflictResolver.ts   # حل التعارضات
│   │   ├── config/
│   │   │   ├── tables.ts             # قائمة الجداول
│   │   │   ├── constants.ts          # الثوابت
│   │   │   └── index.ts              # تصدير موحد
│   │   └── utils/
│   │       ├── validation.ts         # التحقق من البيانات
│   │       └── network.ts            # فحص الشبكة
│   │
│   └── types/
│       ├── database/
│       │   ├── supabase.types.ts     # أنواع Supabase (مولدة)
│       │   └── local.types.ts        # أنواع محلية
│       ├── entities/
│       │   ├── product.ts            # نوع المنتج
│       │   ├── order.ts              # نوع الطلب
│       │   ├── customer.ts           # نوع العميل
│       │   └── ...
│       └── index.ts                  # تصدير موحد
│
├── api/
│   ├── services/
│   │   ├── products/
│   │   │   ├── remote.ts             # ProductRemoteService
│   │   │   ├── local.ts              # ProductLocalService
│   │   │   └── sync.ts               # ProductSyncService
│   │   ├── orders/
│   │   │   ├── remote.ts             # OrderRemoteService
│   │   │   ├── local.ts              # OrderLocalService
│   │   │   └── sync.ts               # OrderSyncService
│   │   └── ...
│   └── utils/
│       ├── transformers.ts           # تحويل البيانات
│       └── validators.ts             # التحقق
│
└── hooks/
    └── data/
        ├── useProducts.ts
        ├── useOrders.ts
        └── ...
```

### 2.2 مبادئ التصميم الجديد

```typescript
/**
 * ✅ القواعد الأساسية:
 *
 * 1. snake_case فقط - لا camelCase في قاعدة البيانات
 * 2. أسماء متطابقة 100% مع Supabase
 * 3. لا TABLE_MAP - الأسماء موحدة
 * 4. لا COLUMN_MAP - الأعمدة موحدة
 * 5. Validation في طبقة واحدة فقط
 * 6. Parameterized queries فقط - لا template literals
 */
```

---

## 3. المرحلة 1: توحيد التسميات

### 3.1 القاعدة الذهبية

```typescript
// ❌ الطريقة القديمة (خاطئة)
await addColumnIfNotExists('products', 'compare_at_price', 'REAL');
await addColumnIfNotExists('products', 'compareAtPrice', 'REAL');

// ✅ الطريقة الجديدة (صحيحة)
await addColumnIfNotExists('products', 'compare_at_price', 'REAL');
// لا تضف camelCase أبداً!
```

### 3.2 خريطة التحويل النهائية

#### 3.2.1 الجداول

```typescript
// ملف: src/lib/sync/config/tables.ts

export const UNIFIED_TABLES = {
  // ❌ القديم → ✅ الجديد
  'pos_orders': 'orders',
  'pos_order_items': 'order_items',
  'product_returns': 'returns',
  'loss_declarations': 'losses',
  'work_sessions': 'staff_work_sessions',
} as const;

// قائمة الجداول الموحدة
export const SYNCED_TABLES = [
  'products',
  'product_categories',
  'product_subcategories',
  'product_colors',
  'product_sizes',
  'product_images',
  'customers',
  'orders',              // ✅ بدلاً من pos_orders
  'order_items',         // ✅ بدلاً من pos_order_items
  'returns',             // ✅ بدلاً من product_returns
  'return_items',
  'losses',              // ✅ بدلاً من loss_declarations
  'loss_items',
  'suppliers',
  'supplier_purchases',
  'supplier_purchase_items',
  'supplier_payments',
  'invoices',
  'invoice_items',
  'expenses',
  'expense_categories',
  'staff_work_sessions', // ✅ بدلاً من work_sessions
  'pos_settings',
  'organization_settings',
] as const;
```

#### 3.2.2 الأعمدة (orders)

```typescript
// ملف: src/lib/types/entities/order.ts

/**
 * ✅ نوع الطلب الموحد - متطابق 100% مع Supabase
 *
 * جميع الأسماء snake_case
 * لا يوجد أي camelCase
 */
export interface Order {
  // المفاتيح
  id: string;
  organization_id: string;
  customer_id: string | null;

  // المبالغ (✅ الأسماء الصحيحة)
  subtotal: number;
  tax: number;
  discount: number | null;
  total: number;                    // ✅ بدلاً من total_amount
  amount_paid: number | null;       // ✅ بدلاً من paid_amount
  remaining_amount: number | null;

  // الحالة
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  payment_method: 'cash' | 'card' | 'credit' | 'mixed';
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded';

  // الموظف
  employee_id: string | null;       // ✅ بدلاً من staff_id
  created_by_staff_id: string | null;
  created_by_staff_name: string | null;

  // الرقم المتسلسل
  global_order_number: number;      // ✅ بدلاً من order_number
  slug: string | null;

  // الشحن
  is_online: boolean;
  shipping_address_id: string | null;
  shipping_method: string | null;
  shipping_cost: number | null;

  // الملاحظات
  notes: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  metadata: Record<string, any> | null;

  // التواريخ
  created_at: string;
  updated_at: string;
  completed_at: string | null;

  // ❌ أعمدة يجب حذفها (محلية فقط)
  // synced - لا يُرسل للسيرفر
  // sync_status - لا يُرسل للسيرفر
  // pending_operation - لا يُرسل للسيرفر
  // local_order_number - لا يُرسل للسيرفر
}
```

#### 3.2.3 الأعمدة (order_items)

```typescript
// ملف: src/lib/types/entities/orderItem.ts

export interface OrderItem {
  // المفاتيح
  id: string;
  order_id: string;                 // ✅ مطلوب دائماً
  product_id: string;
  organization_id: string;          // ✅ مطلوب

  // المنتج
  name: string;                     // ✅ بدلاً من product_name
  quantity: number;
  unit_price: number;
  total_price: number;              // ✅ بدلاً من subtotal

  // المتغيرات
  color_id: string | null;
  size_id: string | null;
  color_name: string | null;
  size_name: string | null;
  variant_display_name: string | null;

  // نوع البيع
  sale_type: 'retail' | 'wholesale' | 'partial_wholesale';
  selling_unit_type: 'piece' | 'weight' | 'meter' | 'box';

  // البيع المتقدم
  weight_sold: number | null;
  weight_unit: string | null;
  price_per_weight_unit: number | null;
  meters_sold: number | null;
  price_per_meter: number | null;
  boxes_sold: number | null;
  units_per_box: number | null;
  box_price: number | null;

  // التتبع
  batch_id: string | null;
  batch_number: string | null;
  serial_numbers: string[] | null;
  expiry_date: string | null;

  // التواريخ
  created_at: string;

  // ❌ أعمدة يجب حذفها
  // barcode - محلي فقط
  // cost - محلي فقط
  // discount - محلي فقط (استخدم discount على مستوى order)
  // image_url - محلي فقط
  // synced - محلي فقط
}
```

#### 3.2.4 الأعمدة (products)

```typescript
// ملف: src/lib/types/entities/product.ts

export interface Product {
  // المفاتيح
  id: string;
  organization_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  supplier_id: string | null;

  // الأساسي
  name: string;
  description: string;
  sku: string;
  barcode: string | null;
  slug: string | null;

  // التسعير الأساسي
  price: number;
  compare_at_price: number | null;
  purchase_price: number | null;

  // تسعير الجملة
  wholesale_price: number | null;
  partial_wholesale_price: number | null;
  min_wholesale_quantity: number | null;
  min_partial_wholesale_quantity: number | null;
  allow_retail: boolean;
  allow_wholesale: boolean;
  allow_partial_wholesale: boolean;

  // المخزون
  stock_quantity: number;
  min_stock_level: number | null;
  reorder_level: number | null;
  reorder_quantity: number | null;

  // الحالة
  is_active: boolean;
  is_featured: boolean;
  is_digital: boolean;
  is_new: boolean | null;

  // المتغيرات
  has_variants: boolean;
  use_sizes: boolean;
  use_variant_prices: boolean;

  // البيع بالوزن
  sell_by_weight: boolean;
  weight_unit: string | null;
  price_per_weight_unit: number | null;
  purchase_price_per_weight_unit: number | null;
  min_weight_per_sale: number | null;
  max_weight_per_sale: number | null;
  average_item_weight: number | null;
  available_weight: number;
  total_weight_purchased: number;

  // البيع بالصندوق
  sell_by_box: boolean;
  units_per_box: number | null;
  box_price: number | null;
  box_purchase_price: number | null;
  box_barcode: string | null;
  allow_single_unit_sale: boolean;
  available_boxes: number;
  total_boxes_purchased: number;

  // البيع بالمتر
  sell_by_meter: boolean;
  meter_unit: string | null;
  price_per_meter: number | null;
  purchase_price_per_meter: number | null;
  min_meters_per_sale: number | null;
  roll_length_meters: number | null;
  available_length: number;
  total_meters_purchased: number;

  // التتبع
  track_expiry: boolean;
  default_expiry_days: number | null;
  expiry_alert_days: number;
  track_serial_numbers: boolean;
  require_serial_on_sale: boolean;
  track_batches: boolean;
  use_fifo: boolean;

  // الضمان
  has_warranty: boolean;
  warranty_duration_months: number | null;
  warranty_type: string | null;

  // الصور
  images: string[] | null;
  thumbnail_image: string | null;

  // النشر
  publication_status: 'draft' | 'scheduled' | 'published' | 'archived';
  publish_at: string | null;
  published_at: string | null;

  // الضرائب
  tax_rate: number | null;
  tax_included: boolean;

  // الخصائص
  features: string[] | null;
  specifications: Record<string, any> | null;
  dimensions: Record<string, any> | null;

  // التواريخ
  created_at: string;
  updated_at: string;
  last_inventory_update: string | null;

  // ❌ أعمدة يجب حذفها (محلية فقط)
  // synced, sync_status, pending_operation
  // name_lower, name_normalized, sku_lower, barcode_lower
  // thumbnail_base64, images_base64
  // local_updated_at
  // stock_version
  // actual_stock_quantity (محسوب)
}
```

---

## 4. المرحلة 2: إعادة بناء SQLite Schema

### 4.1 الملف الجديد: `src/lib/db/schema/tables/orders.sql.ts`

```typescript
/**
 * جدول الطلبات - متطابق 100% مع Supabase
 */
export const ORDERS_TABLE = `
CREATE TABLE IF NOT EXISTS orders (
  -- المفاتيح
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  customer_id TEXT,

  -- المبالغ
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  discount REAL,
  total REAL NOT NULL DEFAULT 0,
  amount_paid REAL,
  remaining_amount REAL,
  consider_remaining_as_partial INTEGER DEFAULT 1,

  -- الحالة
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_status TEXT NOT NULL DEFAULT 'pending',

  -- الموظف
  employee_id TEXT,
  created_by_staff_id TEXT,
  created_by_staff_name TEXT,

  -- الرقم المتسلسل
  global_order_number INTEGER,
  slug TEXT,
  customer_order_number INTEGER,

  -- الشحن
  is_online INTEGER NOT NULL DEFAULT 0,
  shipping_address_id TEXT,
  shipping_method TEXT,
  shipping_cost REAL,

  -- الملاحظات
  notes TEXT,
  customer_notes TEXT,
  admin_notes TEXT,
  metadata TEXT,

  -- نوع الطلب
  pos_order_type TEXT DEFAULT 'pos',
  call_confirmation_status_id INTEGER,

  -- التواريخ
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,

  -- ⚡ أعمدة المزامنة (محلية فقط)
  _synced INTEGER DEFAULT 0,
  _sync_status TEXT,
  _pending_operation TEXT,
  _local_updated_at TEXT
);
`;

export const ORDERS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_orders_org_status ON orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_org_created ON orders(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_employee ON orders(employee_id);
CREATE INDEX IF NOT EXISTS idx_orders_global_number ON orders(global_order_number);
`;
```

### 4.2 الملف الجديد: `src/lib/db/schema/tables/products.sql.ts`

```typescript
/**
 * جدول المنتجات - متطابق 100% مع Supabase
 *
 * ملاحظة: لا يوجد أي أعمدة camelCase
 */
export const PRODUCTS_TABLE = `
CREATE TABLE IF NOT EXISTS products (
  -- المفاتيح
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  category_id TEXT,
  subcategory_id TEXT,
  supplier_id TEXT,

  -- الأساسي
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT NOT NULL,
  barcode TEXT,
  slug TEXT,
  brand TEXT,
  category TEXT,
  subcategory TEXT,

  -- التسعير
  price REAL NOT NULL DEFAULT 0,
  compare_at_price REAL,
  purchase_price REAL,

  -- تسعير الجملة
  wholesale_price REAL,
  partial_wholesale_price REAL,
  min_wholesale_quantity INTEGER,
  min_partial_wholesale_quantity INTEGER,
  allow_retail INTEGER DEFAULT 1,
  allow_wholesale INTEGER DEFAULT 0,
  allow_partial_wholesale INTEGER DEFAULT 0,

  -- البيع بالوحدة
  is_sold_by_unit INTEGER DEFAULT 1,
  unit_type TEXT,
  unit_purchase_price REAL,
  unit_sale_price REAL,

  -- المخزون
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  reorder_level INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 20,

  -- الحالة
  is_active INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  is_digital INTEGER DEFAULT 0,
  is_new INTEGER DEFAULT 0,
  show_price_on_landing INTEGER DEFAULT 1,

  -- المتغيرات
  has_variants INTEGER DEFAULT 0,
  use_sizes INTEGER DEFAULT 0,
  use_variant_prices INTEGER DEFAULT 0,

  -- البيع بالوزن
  sell_by_weight INTEGER DEFAULT 0,
  weight_unit TEXT DEFAULT 'kg',
  price_per_weight_unit REAL,
  purchase_price_per_weight_unit REAL,
  min_weight_per_sale REAL,
  max_weight_per_sale REAL,
  average_item_weight REAL,
  available_weight REAL DEFAULT 0,
  total_weight_purchased REAL DEFAULT 0,

  -- البيع بالصندوق
  sell_by_box INTEGER DEFAULT 0,
  units_per_box INTEGER DEFAULT 1,
  box_price REAL,
  box_purchase_price REAL,
  box_barcode TEXT,
  allow_single_unit_sale INTEGER DEFAULT 1,
  available_boxes INTEGER DEFAULT 0,
  total_boxes_purchased INTEGER DEFAULT 0,

  -- البيع بالمتر
  sell_by_meter INTEGER DEFAULT 0,
  meter_unit TEXT DEFAULT 'm',
  price_per_meter REAL,
  purchase_price_per_meter REAL,
  min_meters_per_sale REAL DEFAULT 0.1,
  roll_length_meters REAL,
  available_length REAL DEFAULT 0,
  total_meters_purchased REAL DEFAULT 0,

  -- التتبع
  track_expiry INTEGER DEFAULT 0,
  default_expiry_days INTEGER,
  expiry_alert_days INTEGER DEFAULT 30,
  track_serial_numbers INTEGER DEFAULT 0,
  require_serial_on_sale INTEGER DEFAULT 0,
  track_batches INTEGER DEFAULT 0,
  use_fifo INTEGER DEFAULT 1,

  -- الضمان
  has_warranty INTEGER DEFAULT 0,
  warranty_duration_months INTEGER,
  warranty_type TEXT,

  -- الصور
  images TEXT,
  thumbnail_image TEXT,

  -- النشر
  publication_status TEXT DEFAULT 'published',
  publish_at TEXT,
  published_at TEXT,

  -- الضرائب
  tax_rate REAL,
  tax_included INTEGER DEFAULT 1,
  commission_rate REAL,

  -- الخصائص
  features TEXT,
  specifications TEXT,
  dimensions TEXT,
  weight_kg REAL,

  -- الخصائص المتخصصة
  -- الصيدلية
  requires_prescription INTEGER DEFAULT 0,
  active_ingredient TEXT,
  dosage_form TEXT,
  concentration TEXT,

  -- المطاعم
  preparation_time_minutes INTEGER,
  calories INTEGER,
  allergens TEXT,
  is_vegetarian INTEGER DEFAULT 0,
  is_vegan INTEGER DEFAULT 0,
  is_gluten_free INTEGER DEFAULT 0,
  spice_level INTEGER,

  -- قطع الغيار
  oem_number TEXT,
  compatible_models TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  year_from INTEGER,
  year_to INTEGER,

  -- مواد البناء
  material_type TEXT,
  coverage_area_sqm REAL,

  -- التصنيع
  manufacturer TEXT,
  country_of_origin TEXT,
  customs_code TEXT,

  -- الشحن
  has_fast_shipping INTEGER DEFAULT 0,
  has_money_back INTEGER DEFAULT 0,
  has_quality_guarantee INTEGER DEFAULT 0,
  fast_shipping_text TEXT,
  money_back_text TEXT,
  quality_guarantee_text TEXT,

  -- الإعدادات المتقدمة
  special_offers_config TEXT,
  advanced_description TEXT,
  purchase_page_config TEXT,

  -- التتبع
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  form_template_id TEXT,
  shipping_provider_id INTEGER,
  shipping_clone_id INTEGER,
  use_shipping_clone INTEGER DEFAULT 0,
  shipping_method_type TEXT DEFAULT 'default',
  name_for_shipping TEXT,

  -- التواريخ
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_inventory_update TEXT,

  -- ⚡ أعمدة المزامنة (محلية فقط - تبدأ بـ _)
  _synced INTEGER DEFAULT 0,
  _sync_status TEXT,
  _pending_operation TEXT,
  _local_updated_at TEXT,
  _name_lower TEXT,
  _sku_lower TEXT,
  _barcode_lower TEXT
);
`;

export const PRODUCTS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org_active ON products(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products(_name_lower);
CREATE INDEX IF NOT EXISTS idx_products_sku_lower ON products(_sku_lower);
CREATE INDEX IF NOT EXISTS idx_products_barcode_lower ON products(_barcode_lower);
`;
```

### 4.3 القاعدة الجديدة للأعمدة المحلية

```typescript
/**
 * ⚡ قاعدة أعمدة المزامنة:
 *
 * جميع الأعمدة المحلية فقط تبدأ بـ _ (underscore)
 * هذا يجعلها واضحة ويسهل فلترتها
 */

// الأعمدة المحلية القياسية لكل جدول
const LOCAL_COLUMNS = [
  '_synced',           // حالة المزامنة (0 = غير متزامن، 1 = متزامن)
  '_sync_status',      // pending, syncing, synced, failed
  '_pending_operation', // INSERT, UPDATE, DELETE
  '_local_updated_at', // آخر تحديث محلي
  '_error',            // رسالة الخطأ إن وجدت
];

// أعمدة البحث المحلية (للفهرسة السريعة)
const LOCAL_SEARCH_COLUMNS = [
  '_name_lower',       // للبحث السريع
  '_sku_lower',        // للبحث السريع
  '_barcode_lower',    // للبحث السريع
];
```

---

## 5. المرحلة 3: إعادة بناء نظام المزامنة

### 5.1 ملف الإعدادات الجديد المبسط

```typescript
// ملف: src/lib/sync/config/index.ts

/**
 * ⚡ إعدادات المزامنة الموحدة
 *
 * لا يوجد TABLE_MAP لأن الأسماء موحدة
 * لا يوجد COLUMN_MAP لأن الأسماء موحدة
 */

export const SYNC_CONFIG = {
  // الجداول المتزامنة (مرتبة حسب الأولوية)
  SYNCED_TABLES: [
    // المستقلة (يمكن التوازي)
    'products',
    'product_categories',
    'product_subcategories',
    'customers',
    'suppliers',
    'expense_categories',

    // المعتمدة (يجب التسلسل)
    'orders',
    'order_items',
    'invoices',
    'invoice_items',
    'returns',
    'return_items',
    'losses',
    'loss_items',
    'supplier_purchases',
    'supplier_purchase_items',
    'supplier_payments',

    // المتغيرات
    'product_colors',
    'product_sizes',
    'product_images',

    // الإعدادات
    'pos_settings',
    'organization_settings',
    'staff_work_sessions',
  ],

  // الجداول المحلية فقط (لا تُزامن)
  LOCAL_ONLY_TABLES: [
    'sync_outbox',
    'sync_state',
    'cached_images',
    'cached_notifications',
    'app_license_state',
    'staff_pins',
    'user_credentials',
  ],

  // الأعمدة المحلية (تبدأ بـ _)
  // يتم فلترتها تلقائياً بناءً على البادئة
  LOCAL_COLUMN_PREFIX: '_',

  // ثوابت الأداء
  BATCH_SIZE: 50,
  BATCH_INTERVAL_MS: 3000,
  IDLE_INTERVAL_MS: 30000,
  MAX_RETRY_ATTEMPTS: 5,
  RETRY_DELAY_BASE_MS: 1000,
};

/**
 * فلترة الأعمدة المحلية تلقائياً
 */
export function filterLocalColumns(data: Record<string, any>): Record<string, any> {
  const filtered: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    // تجاهل الأعمدة التي تبدأ بـ _
    if (!key.startsWith('_')) {
      filtered[key] = value;
    }
  }

  return filtered;
}

/**
 * لا حاجة لـ getServerTableName لأن الأسماء موحدة
 * لا حاجة لـ getServerColumnName لأن الأسماء موحدة
 */
```

### 5.2 PushEngine المُحسّن

```typescript
// ملف: src/lib/sync/core/PushEngine.ts

import { supabase } from '@/lib/supabase';
import { SYNC_CONFIG, filterLocalColumns } from '../config';
import { outboxManager } from '../queue/OutboxManager';

export class PushEngine {
  private organizationId: string | null = null;
  private isRunning = false;

  async start(organizationId: string) {
    this.organizationId = organizationId;
    this.isRunning = true;
    this.scheduleNextBatch();
  }

  stop() {
    this.isRunning = false;
  }

  /**
   * معالجة دفعة من العمليات
   */
  async processBatch(): Promise<BatchResult> {
    const pending = await outboxManager.getPending(SYNC_CONFIG.BATCH_SIZE);
    if (pending.length === 0) return { success: true, count: 0 };

    // ترتيب حسب التبعيات (الطلبات قبل العناصر)
    const sorted = this.sortByDependency(pending);

    const results: BatchResult = { success: true, count: 0, errors: [] };

    for (const op of sorted) {
      try {
        await this.processOperation(op);
        await outboxManager.markSent(op.id);
        results.count++;
      } catch (error) {
        results.errors.push({ id: op.id, error: String(error) });
        await outboxManager.markFailed(op.id, String(error));
      }
    }

    return results;
  }

  /**
   * معالجة عملية واحدة
   */
  private async processOperation(op: OutboxEntry): Promise<void> {
    const payload = JSON.parse(op.payload);

    // ✅ فلترة الأعمدة المحلية تلقائياً
    const cleanPayload = filterLocalColumns(payload);

    // ✅ إضافة organization_id إذا لزم
    if (this.organizationId && !cleanPayload.organization_id) {
      cleanPayload.organization_id = this.organizationId;
    }

    // ✅ التحقق من البيانات المطلوبة
    this.validatePayload(op.table_name, cleanPayload);

    switch (op.operation) {
      case 'INSERT':
      case 'UPDATE':
        const { error: upsertError } = await supabase
          .from(op.table_name)
          .upsert(cleanPayload);
        if (upsertError) throw upsertError;
        break;

      case 'DELETE':
        const { error: deleteError } = await supabase
          .from(op.table_name)
          .delete()
          .eq('id', op.record_id);
        if (deleteError) throw deleteError;
        break;

      case 'DELTA':
        await this.handleDelta(op.table_name, op.record_id, payload);
        break;
    }
  }

  /**
   * التحقق من البيانات المطلوبة
   */
  private validatePayload(table: string, payload: Record<string, any>): void {
    // orders: يجب أن يكون total و subtotal موجودين
    if (table === 'orders') {
      if (payload.total === undefined) {
        payload.total = payload.subtotal || 0;
      }
      if (payload.subtotal === undefined) {
        payload.subtotal = payload.total || 0;
      }
      if (!payload.status) {
        payload.status = 'pending';
      }
      if (!payload.payment_method) {
        throw new Error('payment_method is required for orders');
      }
      if (!payload.payment_status) {
        payload.payment_status = 'pending';
      }
    }

    // order_items: يجب أن يكون order_id موجوداً
    if (table === 'order_items') {
      if (!payload.order_id) {
        throw new Error('order_id is required for order_items');
      }
      if (!payload.product_id) {
        throw new Error('product_id is required for order_items');
      }
      if (!payload.name) {
        payload.name = 'منتج';
      }
      if (payload.total_price === undefined) {
        payload.total_price = (payload.quantity || 1) * (payload.unit_price || 0);
      }
    }
  }

  /**
   * معالجة DELTA باستخدام RPC
   */
  private async handleDelta(
    table: string,
    recordId: string,
    delta: Record<string, number>
  ): Promise<void> {
    // استخدام RPC لتجنب Race Condition
    const { error } = await supabase.rpc('apply_delta', {
      p_table: table,
      p_record_id: recordId,
      p_delta: delta
    });

    if (error) {
      // Fallback إذا لم يكن RPC موجوداً
      if (error.code === '42883') {
        await this.handleDeltaFallback(table, recordId, delta);
      } else {
        throw error;
      }
    }
  }

  /**
   * Fallback للـ DELTA (غير مثالي - عرضة لـ Race Condition)
   */
  private async handleDeltaFallback(
    table: string,
    recordId: string,
    delta: Record<string, number>
  ): Promise<void> {
    // جلب القيم الحالية
    const fields = Object.keys(delta);
    const { data, error: fetchError } = await supabase
      .from(table)
      .select(fields.join(','))
      .eq('id', recordId)
      .single();

    if (fetchError) throw fetchError;
    if (!data) return; // السجل محذوف

    // حساب القيم الجديدة
    const updates: Record<string, number> = {};
    for (const [field, deltaValue] of Object.entries(delta)) {
      const current = (data as any)[field] || 0;
      updates[field] = Math.max(0, current + deltaValue);
    }

    // تحديث
    const { error: updateError } = await supabase
      .from(table)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', recordId);

    if (updateError) throw updateError;
  }

  /**
   * ترتيب العمليات حسب التبعيات
   */
  private sortByDependency(ops: OutboxEntry[]): OutboxEntry[] {
    const priority: Record<string, number> = {
      'orders': 1,
      'invoices': 2,
      'returns': 3,
      'losses': 4,
      'supplier_purchases': 5,
      'order_items': 10,
      'invoice_items': 11,
      'return_items': 12,
      'loss_items': 13,
      'supplier_purchase_items': 14,
    };

    return [...ops].sort((a, b) => {
      const pa = priority[a.table_name] || 50;
      const pb = priority[b.table_name] || 50;
      if (pa !== pb) return pa - pb;
      return a.local_seq - b.local_seq;
    });
  }
}
```

### 5.3 PullEngine المُحسّن

```typescript
// ملف: src/lib/sync/core/PullEngine.ts

import { supabase } from '@/lib/supabase';
import { SYNC_CONFIG } from '../config';
import { tauriBatchUpsert, tauriExecute } from '@/lib/db/sqliteClient';
import { outboxManager } from '../queue/OutboxManager';

export class PullEngine {
  private organizationId: string;
  private pendingIds: Map<string, Set<string>> = new Map();

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * تهيئة جدول حالة المزامنة
   */
  async init(): Promise<void> {
    await tauriExecute(this.organizationId, `
      CREATE TABLE IF NOT EXISTS sync_state (
        table_name TEXT PRIMARY KEY,
        last_synced_at TEXT,
        last_sync_status TEXT,
        error_message TEXT
      )
    `);
  }

  /**
   * تحديث cache العمليات المعلقة
   */
  async refreshPendingCache(): Promise<void> {
    const pending = await outboxManager.getPendingOperations();
    this.pendingIds.clear();

    for (const op of pending) {
      if (!this.pendingIds.has(op.table_name)) {
        this.pendingIds.set(op.table_name, new Set());
      }
      this.pendingIds.get(op.table_name)!.add(op.record_id);
    }
  }

  /**
   * جلب جدول من السيرفر
   */
  async pullTable(tableName: string): Promise<PullResult> {
    const startTime = Date.now();
    const result: PullResult = { processed: 0, skipped: 0, errors: 0 };

    try {
      const syncState = await this.getSyncState(tableName);
      const lastSynced = syncState?.last_synced_at || '1970-01-01T00:00:00Z';

      console.log(`[PullEngine] ⬇️ Pulling ${tableName} since ${lastSynced}`);

      // جلب IDs المعلقة محلياً
      const pendingIds = this.pendingIds.get(tableName) || new Set();

      let page = 0;
      let hasMore = true;
      let maxTimestamp = lastSynced;

      while (hasMore) {
        // جلب البيانات من Supabase
        let query = supabase
          .from(tableName)
          .select('*')
          .gt('updated_at', lastSynced)
          .order('updated_at', { ascending: true })
          .range(page * 1000, (page + 1) * 1000 - 1);

        // فلترة حسب organization_id إذا لزم
        if (this.tableHasOrgId(tableName)) {
          query = query.eq('organization_id', this.organizationId);
        }

        const { data, error } = await query;

        if (error) {
          console.error(`[PullEngine] ❌ Error: ${error.message}`);
          result.errors++;
          break;
        }

        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        // تجهيز السجلات
        const toUpsert: any[] = [];
        const toDelete: string[] = [];

        for (const record of data) {
          // تجاهل السجلات المعلقة محلياً
          if (pendingIds.has(record.id)) {
            result.skipped++;
            continue;
          }

          // معالجة الحذف الناعم
          if (record.deleted_at) {
            toDelete.push(record.id);
          } else {
            // إضافة أعمدة المزامنة
            toUpsert.push({
              ...record,
              _synced: 1,
              _sync_status: 'synced',
            });
          }

          // تحديث أقصى timestamp
          if (record.updated_at > maxTimestamp) {
            maxTimestamp = record.updated_at;
          }
        }

        // حذف السجلات
        if (toDelete.length > 0) {
          await tauriExecute(
            this.organizationId,
            `DELETE FROM ${tableName} WHERE id IN (${toDelete.map(() => '?').join(',')})`,
            toDelete
          );
          result.processed += toDelete.length;
        }

        // إدراج/تحديث السجلات
        if (toUpsert.length > 0) {
          await tauriBatchUpsert(this.organizationId, tableName, toUpsert, 'id');
          result.processed += toUpsert.length;
        }

        if (data.length < 1000) {
          hasMore = false;
        } else {
          page++;
        }
      }

      // تحديث حالة المزامنة
      if (result.errors === 0) {
        await this.updateSyncState(tableName, maxTimestamp, 'success');
      }

      const duration = Date.now() - startTime;
      console.log(`[PullEngine] ✅ ${tableName}: ${result.processed} processed, ${result.skipped} skipped (${duration}ms)`);

    } catch (error) {
      console.error(`[PullEngine] ❌ Critical error: ${error}`);
      result.errors++;
    }

    return result;
  }

  /**
   * هل الجدول يحتوي على organization_id
   */
  private tableHasOrgId(tableName: string): boolean {
    const noOrgIdTables = [
      'product_colors',
      'product_sizes',
      'product_images',
      'invoice_items',
      'return_items',
      'loss_items',
      'supplier_purchase_items',
    ];
    return !noOrgIdTables.includes(tableName);
  }

  // ... getSyncState, updateSyncState
}
```

---

## 6. المرحلة 4: توحيد الأنواع TypeScript

### 6.1 الهيكل الجديد للأنواع

```typescript
// ملف: src/lib/types/index.ts

// تصدير جميع الأنواع من مكان واحد

// أنواع الكيانات
export * from './entities/product';
export * from './entities/order';
export * from './entities/orderItem';
export * from './entities/customer';
export * from './entities/supplier';
export * from './entities/invoice';
export * from './entities/expense';

// أنواع قاعدة البيانات
export type { Database } from './database/supabase.types';

// أنواع المزامنة
export * from './sync/outbox';
export * from './sync/state';

// أنواع مساعدة
export * from './common';
```

### 6.2 أنواع مشتركة

```typescript
// ملف: src/lib/types/common.ts

/**
 * أعمدة التدقيق القياسية
 */
export interface AuditColumns {
  created_at: string;
  updated_at: string;
}

/**
 * أعمدة المزامنة المحلية (تبدأ بـ _)
 */
export interface LocalSyncColumns {
  _synced?: 0 | 1;
  _sync_status?: 'pending' | 'syncing' | 'synced' | 'failed';
  _pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE' | null;
  _local_updated_at?: string;
  _error?: string;
}

/**
 * نوع البيع
 */
export type SaleType = 'retail' | 'wholesale' | 'partial_wholesale';

/**
 * نوع وحدة البيع
 */
export type SellingUnitType = 'piece' | 'weight' | 'meter' | 'box';

/**
 * حالة الطلب
 */
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

/**
 * طريقة الدفع
 */
export type PaymentMethod = 'cash' | 'card' | 'credit' | 'mixed' | 'bank_transfer';

/**
 * حالة الدفع
 */
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded';
```

### 6.3 دوال التحويل

```typescript
// ملف: src/lib/utils/transformers.ts

/**
 * ⚠️ ملاحظة مهمة:
 *
 * بعد توحيد الأسماء، لن نحتاج لهذه الدوال!
 * نحتفظ بها فقط للتوافق مع الكود القديم أثناء الانتقال
 */

/**
 * تحويل snake_case إلى camelCase
 * @deprecated استخدم snake_case في كل مكان
 */
export function toCamelCase<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

/**
 * تحويل camelCase إلى snake_case
 * @deprecated استخدم snake_case في كل مكان
 */
export function toSnakeCase<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

/**
 * فلترة الأعمدة المحلية (التي تبدأ بـ _)
 */
export function filterLocalColumns<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith('_')) {
      result[key] = value;
    }
  }
  return result;
}
```

---

## 7. المرحلة 5: تحديث الخدمات

### 7.1 OrderService الجديد

```typescript
// ملف: src/api/services/orders/OrderService.ts

import { supabase } from '@/lib/supabase';
import { Order, OrderItem, OrderStatus, PaymentStatus } from '@/lib/types';
import { filterLocalColumns } from '@/lib/utils/transformers';

export class OrderService {

  /**
   * إنشاء طلب جديد
   */
  async createOrder(
    organizationId: string,
    orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<OrderItem, 'id' | 'order_id' | 'created_at'>[]
  ): Promise<{ order: Order; items: OrderItem[] }> {

    // التحقق من البيانات المطلوبة
    if (!orderData.payment_method) {
      throw new Error('payment_method is required');
    }

    // إنشاء الطلب
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        ...filterLocalColumns(orderData),
        organization_id: organizationId,
        status: orderData.status || 'pending',
        payment_status: orderData.payment_status || 'pending',
        is_online: orderData.is_online ?? false,
        subtotal: orderData.subtotal || 0,
        tax: orderData.tax || 0,
        total: orderData.total || orderData.subtotal || 0,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // إنشاء العناصر
    const itemsWithOrderId = items.map(item => ({
      ...filterLocalColumns(item),
      order_id: order.id,
      organization_id: organizationId,
      name: item.name || 'منتج',
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      total_price: item.total_price || (item.quantity || 1) * (item.unit_price || 0),
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId)
      .select();

    if (itemsError) throw itemsError;

    return { order, items: insertedItems };
  }

  /**
   * تحديث حالة الطلب
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    paymentStatus?: PaymentStatus
  ): Promise<Order> {
    const updates: Partial<Order> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (paymentStatus) {
      updates.payment_status = paymentStatus;
    }

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * جلب طلب مع عناصره
   */
  async getOrderWithItems(orderId: string): Promise<Order & { items: OrderItem[] }> {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    return { ...order, items: items || [] };
  }
}

export const orderService = new OrderService();
```

### 7.2 LocalOrderService الجديد

```typescript
// ملف: src/api/services/orders/LocalOrderService.ts

import { Order, OrderItem, LocalSyncColumns } from '@/lib/types';
import { tauriExecute, tauriUpsert, tauriBatchUpsert, tauriQuery } from '@/lib/db/sqliteClient';
import { outboxManager } from '@/lib/sync/queue/OutboxManager';
import { generateUUID } from '@/lib/utils/uuid';

type LocalOrder = Order & LocalSyncColumns;
type LocalOrderItem = OrderItem & LocalSyncColumns;

export class LocalOrderService {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * إنشاء طلب محلي
   */
  async createOrder(
    orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'organization_id'>,
    items: Omit<OrderItem, 'id' | 'order_id' | 'created_at' | 'organization_id'>[]
  ): Promise<{ order: LocalOrder; items: LocalOrderItem[] }> {

    const orderId = generateUUID();
    const now = new Date().toISOString();

    // تجهيز الطلب
    const order: LocalOrder = {
      id: orderId,
      organization_id: this.organizationId,
      ...orderData,
      status: orderData.status || 'pending',
      payment_status: orderData.payment_status || 'pending',
      is_online: orderData.is_online ?? false,
      subtotal: orderData.subtotal || 0,
      tax: orderData.tax || 0,
      total: orderData.total || orderData.subtotal || 0,
      created_at: now,
      updated_at: now,
      // أعمدة المزامنة
      _synced: 0,
      _sync_status: 'pending',
      _pending_operation: 'INSERT',
      _local_updated_at: now,
    };

    // حفظ الطلب
    await tauriUpsert(this.organizationId, 'orders', order, 'id');

    // إضافة للـ outbox
    await outboxManager.add({
      tableName: 'orders',
      operation: 'INSERT',
      recordId: orderId,
      payload: order,
    });

    // تجهيز العناصر
    const orderItems: LocalOrderItem[] = items.map(item => ({
      id: generateUUID(),
      order_id: orderId,
      organization_id: this.organizationId,
      product_id: item.product_id,
      name: item.name || 'منتج',
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      total_price: item.total_price || (item.quantity || 1) * (item.unit_price || 0),
      color_id: item.color_id || null,
      size_id: item.size_id || null,
      color_name: item.color_name || null,
      size_name: item.size_name || null,
      sale_type: item.sale_type || 'retail',
      selling_unit_type: item.selling_unit_type || 'piece',
      created_at: now,
      // أعمدة المزامنة
      _synced: 0,
      _sync_status: 'pending',
      _pending_operation: 'INSERT',
    }));

    // حفظ العناصر
    await tauriBatchUpsert(this.organizationId, 'order_items', orderItems, 'id');

    // إضافة العناصر للـ outbox
    for (const item of orderItems) {
      await outboxManager.add({
        tableName: 'order_items',
        operation: 'INSERT',
        recordId: item.id,
        payload: item,
      });
    }

    return { order, items: orderItems };
  }

  /**
   * جلب الطلبات المحلية
   */
  async getOrders(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<LocalOrder[]> {
    let query = `
      SELECT * FROM orders
      WHERE organization_id = ?
    `;
    const params: any[] = [this.organizationId];

    if (options?.status) {
      query += ` AND status = ?`;
      params.push(options.status);
    }

    query += ` ORDER BY created_at DESC`;

    if (options?.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ` OFFSET ?`;
      params.push(options.offset);
    }

    const result = await tauriQuery<LocalOrder>(this.organizationId, query, params);
    return result.data || [];
  }
}
```

---

## 8. المرحلة 6: Migration وترحيل البيانات

### 8.1 خطة الترحيل

```typescript
// ملف: src/lib/db/schema/migrations/v43_unify_schema.ts

/**
 * Migration v43: توحيد Schema مع Supabase
 *
 * هذا الـ migration يقوم بـ:
 * 1. إعادة تسمية الجداول (pos_orders → orders)
 * 2. إعادة تسمية الأعمدة (total_amount → total)
 * 3. حذف الأعمدة المكررة (camelCase)
 * 4. إضافة بادئة _ للأعمدة المحلية
 */

export async function migrate_v43(organizationId: string): Promise<void> {
  console.log('[Migration v43] Starting schema unification...');

  // 1. إعادة تسمية الجداول
  await renameTable(organizationId, 'pos_orders', 'orders');
  await renameTable(organizationId, 'pos_order_items', 'order_items');
  await renameTable(organizationId, 'product_returns', 'returns');
  await renameTable(organizationId, 'loss_declarations', 'losses');
  await renameTable(organizationId, 'work_sessions', 'staff_work_sessions');

  // 2. إعادة تسمية الأعمدة في orders
  await renameColumn(organizationId, 'orders', 'total_amount', 'total');
  await renameColumn(organizationId, 'orders', 'paid_amount', 'amount_paid');
  await renameColumn(organizationId, 'orders', 'staff_id', 'employee_id');
  await renameColumn(organizationId, 'orders', 'order_number', 'global_order_number');

  // 3. إعادة تسمية الأعمدة في order_items
  await renameColumn(organizationId, 'order_items', 'product_name', 'name');
  await renameColumn(organizationId, 'order_items', 'subtotal', 'total_price');

  // 4. إضافة بادئة _ للأعمدة المحلية
  await renameColumn(organizationId, 'products', 'synced', '_synced');
  await renameColumn(organizationId, 'products', 'sync_status', '_sync_status');
  await renameColumn(organizationId, 'products', 'pending_operation', '_pending_operation');
  await renameColumn(organizationId, 'products', 'local_updated_at', '_local_updated_at');
  await renameColumn(organizationId, 'products', 'name_lower', '_name_lower');
  await renameColumn(organizationId, 'products', 'sku_lower', '_sku_lower');
  await renameColumn(organizationId, 'products', 'barcode_lower', '_barcode_lower');

  // نفس الشيء لباقي الجداول...

  // 5. حذف الأعمدة المكررة (camelCase)
  await dropDuplicateColumns(organizationId);

  // 6. تحديث إصدار Schema
  await updateSchemaVersion(organizationId, 43);

  console.log('[Migration v43] ✅ Schema unification complete!');
}

/**
 * إعادة تسمية جدول
 */
async function renameTable(
  organizationId: string,
  oldName: string,
  newName: string
): Promise<void> {
  try {
    // تحقق من وجود الجدول القديم
    const exists = await tableExists(organizationId, oldName);
    if (!exists) {
      console.log(`[Migration] Table ${oldName} not found, skipping...`);
      return;
    }

    // تحقق أن الجدول الجديد غير موجود
    const newExists = await tableExists(organizationId, newName);
    if (newExists) {
      console.log(`[Migration] Table ${newName} already exists, migrating data...`);
      // نقل البيانات من القديم للجديد
      await exec(organizationId, `
        INSERT INTO ${newName} SELECT * FROM ${oldName}
        WHERE id NOT IN (SELECT id FROM ${newName})
      `);
      await exec(organizationId, `DROP TABLE ${oldName}`);
      return;
    }

    // إعادة تسمية
    await exec(organizationId, `ALTER TABLE ${oldName} RENAME TO ${newName}`);
    console.log(`[Migration] Renamed ${oldName} → ${newName}`);
  } catch (error) {
    console.error(`[Migration] Error renaming ${oldName}:`, error);
  }
}

/**
 * إعادة تسمية عمود
 */
async function renameColumn(
  organizationId: string,
  tableName: string,
  oldColumn: string,
  newColumn: string
): Promise<void> {
  try {
    // تحقق من وجود العمود القديم
    const hasOld = await columnExists(organizationId, tableName, oldColumn);
    if (!hasOld) {
      console.log(`[Migration] Column ${tableName}.${oldColumn} not found, skipping...`);
      return;
    }

    // تحقق من وجود العمود الجديد
    const hasNew = await columnExists(organizationId, tableName, newColumn);
    if (hasNew) {
      // نسخ البيانات من القديم للجديد
      await exec(organizationId, `
        UPDATE ${tableName}
        SET ${newColumn} = ${oldColumn}
        WHERE ${newColumn} IS NULL AND ${oldColumn} IS NOT NULL
      `);
      console.log(`[Migration] Merged ${tableName}.${oldColumn} → ${newColumn}`);
      return;
    }

    // إعادة تسمية
    await exec(organizationId, `
      ALTER TABLE ${tableName}
      RENAME COLUMN ${oldColumn} TO ${newColumn}
    `);
    console.log(`[Migration] Renamed ${tableName}.${oldColumn} → ${newColumn}`);
  } catch (error) {
    // SQLite قد لا يدعم RENAME COLUMN مباشرة
    console.log(`[Migration] Using alternative method for ${tableName}.${oldColumn}`);
    await renameColumnAlternative(organizationId, tableName, oldColumn, newColumn);
  }
}

/**
 * حذف الأعمدة المكررة (camelCase)
 */
async function dropDuplicateColumns(organizationId: string): Promise<void> {
  const duplicates = [
    // products
    { table: 'products', column: 'compareAtPrice' },
    { table: 'products', column: 'purchasePrice' },
    { table: 'products', column: 'stockQuantity' },
    { table: 'products', column: 'wholesalePrice' },
    { table: 'products', column: 'sellByWeight' },
    { table: 'products', column: 'sellByBox' },
    { table: 'products', column: 'sellByMeter' },
    { table: 'products', column: 'hasVariants' },
    { table: 'products', column: 'useSizes' },
    { table: 'products', column: 'isActive' },
    { table: 'products', column: 'isFeatured' },
    { table: 'products', column: 'thumbnailImage' },
    // ... المزيد

    // orders
    { table: 'orders', column: 'totalAmount' },
    { table: 'orders', column: 'paidAmount' },
    { table: 'orders', column: 'staffId' },
    { table: 'orders', column: 'paymentMethod' },
    { table: 'orders', column: 'paymentStatus' },
    // ... المزيد
  ];

  for (const { table, column } of duplicates) {
    await dropColumn(organizationId, table, column);
  }
}
```

### 8.2 سكربت تنفيذ الترحيل

```typescript
// ملف: src/lib/db/runMigration.ts

import { migrate_v43 } from './schema/migrations/v43_unify_schema';
import { getSchemaVersion, setSchemaVersion } from './schema/version';

export async function runMigrations(organizationId: string): Promise<void> {
  const currentVersion = await getSchemaVersion(organizationId);

  console.log(`[Migrations] Current schema version: ${currentVersion}`);

  // تنفيذ الـ migrations المطلوبة
  if (currentVersion < 43) {
    console.log('[Migrations] Running v43 (Schema Unification)...');
    await migrate_v43(organizationId);
  }

  // migrations مستقبلية...

  const newVersion = await getSchemaVersion(organizationId);
  console.log(`[Migrations] ✅ All migrations complete. Version: ${newVersion}`);
}
```

---

## 9. قائمة الملفات المتأثرة

### 9.1 ملفات يجب إعادة كتابتها بالكامل

```
src/lib/db/tauriSchema.ts                    → src/lib/db/schema/
src/lib/sync/config.ts                       → src/lib/sync/config/
src/lib/sync/SyncManager.ts                  → إعادة كتابة
src/lib/sync/PullEngine.ts                   → إعادة كتابة
src/lib/sync/PushEngine.ts                   → إعادة كتابة
src/lib/sync/delta/DeltaSyncEngine.ts        → إعادة كتابة
src/lib/sync/delta/OutboxManager.ts          → تحديث
src/types/index.ts                           → src/lib/types/
src/types/product.ts                         → src/lib/types/entities/
```

### 9.2 ملفات يجب تحديثها

```
src/api/posOrdersService.ts                  → تحديث الأسماء
src/api/localPosOrderService.ts              → تحديث الأسماء
src/api/productSyncUtils.ts                  → تحديث
src/api/supplierService.ts                   → تحديث الأسماء
src/api/localSupplierService.ts              → تحديث الأسماء
src/services/DeltaWriteService.ts            → تحديث
src/services/LocalProductSearchService.ts    → تحديث
src/context/POSDataContext.tsx               → تحديث
src/context/WorkSessionContext.tsx           → تحديث
src/hooks/useLocalPOSProducts.ts             → تحديث
src/hooks/useOptimizedOrders.ts              → تحديث
src/components/pos-advanced/*.tsx            → تحديث
```

### 9.3 ملفات يجب حذفها

```
src/lib/sync/delta/BatchSender.ts            → غير مستخدم
src/lib/sync/delta/ConflictResolver.ts       → غير مستخدم
src/lib/sync/delta/MergeStrategy.ts          → غير مستخدم
src/lib/sync/delta/OperationQueue.ts         → غير مستخدم
src/lib/sync/delta/RealtimeReceiver.ts       → غير مستخدم
src/lib/sync/delta/StateHashValidator.ts     → غير مستخدم
```

---

## 10. جدول الأولويات

### 10.1 الأولوية 1: حرجة (الأسبوع الأول)

| المهمة | الوصف | الملفات |
|--------|-------|---------|
| 🔴 إصلاح SQL Injection | استخدام parameterized queries | SyncManager.ts |
| 🔴 إصلاح null order_id | التحقق قبل الإضافة للـ outbox | PushEngine.ts, OutboxManager.ts |
| 🔴 إصلاح DELTA Race | استخدام RPC أو transaction | PushEngine.ts |
| 🔴 إصلاح payment_method | عدم استخدام 'cash' افتراضي | SyncManager.ts |

### 10.2 الأولوية 2: عالية (الأسبوع الثاني)

| المهمة | الوصف | الملفات |
|--------|-------|---------|
| 🟠 إنشاء Schema جديد | جداول موحدة | src/lib/db/schema/ |
| 🟠 كتابة Migration | v43 unify schema | migrations/ |
| 🟠 تحديث config.ts | إزالة TABLE_MAP و COLUMN_MAP | config/ |
| 🟠 تحديث الأنواع | توحيد مع Supabase | src/lib/types/ |

### 10.3 الأولوية 3: متوسطة (الأسبوع الثالث)

| المهمة | الوصف | الملفات |
|--------|-------|---------|
| 🟡 تحديث PullEngine | إزالة mappings | PullEngine.ts |
| 🟡 تحديث PushEngine | إزالة mappings | PushEngine.ts |
| 🟡 تحديث الخدمات | استخدام أسماء موحدة | api/services/ |
| 🟡 تحديث Contexts | استخدام أسماء موحدة | context/ |

### 10.4 الأولوية 4: منخفضة (الأسابيع اللاحقة)

| المهمة | الوصف | الملفات |
|--------|-------|---------|
| 🟢 تحديث Components | استخدام الأنواع الجديدة | components/ |
| 🟢 إضافة Tests | اختبارات للـ migration | tests/ |
| 🟢 توثيق | README وتعليقات | docs/ |
| 🟢 تنظيف | حذف الملفات غير المستخدمة | - |

---

## ✅ ملخص التحسينات المتوقعة

| المقياس | قبل | بعد | التحسن |
|---------|-----|-----|--------|
| **أعمدة products** | 419 | 229 | -45% |
| **حجم قاعدة البيانات** | X MB | ~0.5X MB | -50% |
| **سرعة المزامنة** | X sec | ~0.6X sec | +40% |
| **أخطاء المزامنة** | كثيرة | 0 | -100% |
| **تعقيد config.ts** | 387 سطر | ~100 سطر | -75% |
| **ملفات المزامنة** | 12 ملف | 6 ملفات | -50% |
| **Mappings مطلوبة** | 50+ | 0 | -100% |

---

**نهاية الخطة الشاملة**

> تم إعدادها في: 2 ديسمبر 2025
> الهدف: نظام مثالي موحد 100%
> المدة المتوقعة: 3-4 أسابيع
