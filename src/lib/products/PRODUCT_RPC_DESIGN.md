# 🎯 تصميم RPC المنتجات الجديد المحسّن

## 📋 نظرة عامة

هذا المستند يوثق تصميم دوال RPC الجديدة للمنتجات التي تدعم جميع أنواع التجارة.

---

## 🏗️ البنية الجديدة

### 1. الأعمدة الجديدة المطلوبة في جدول `products`

```sql
-- حقول البيع بالوزن
sell_by_weight BOOLEAN DEFAULT FALSE,
weight_unit TEXT DEFAULT 'kg', -- kg, g, lb, oz
min_weight_per_sale NUMERIC(10,3),
max_weight_per_sale NUMERIC(10,3),
price_per_weight_unit NUMERIC(12,2),
purchase_price_per_weight_unit NUMERIC(12,2),
average_item_weight NUMERIC(10,3), -- الوزن المتوسط للقطعة الواحدة

-- حقول البيع بالكرتون/العلبة
sell_by_box BOOLEAN DEFAULT FALSE,
units_per_box INTEGER DEFAULT 1,
box_price NUMERIC(12,2),
box_purchase_price NUMERIC(12,2),
box_barcode TEXT,
allow_single_unit_sale BOOLEAN DEFAULT TRUE,

-- حقول البيع بالمتر
sell_by_meter BOOLEAN DEFAULT FALSE,
meter_unit TEXT DEFAULT 'm', -- m, cm, ft, inch
price_per_meter NUMERIC(12,2),
purchase_price_per_meter NUMERIC(12,2),
min_meters_per_sale NUMERIC(10,2) DEFAULT 0.1,
roll_length_meters NUMERIC(10,2), -- طول الرول الكامل

-- تتبع الصلاحية
track_expiry BOOLEAN DEFAULT FALSE,
default_expiry_days INTEGER,
expiry_alert_days INTEGER DEFAULT 30,

-- تتبع الأرقام التسلسلية
track_serial_numbers BOOLEAN DEFAULT FALSE,
require_serial_on_sale BOOLEAN DEFAULT FALSE,

-- تتبع الضمان
has_warranty BOOLEAN DEFAULT FALSE,
warranty_duration_months INTEGER,
warranty_type TEXT, -- 'manufacturer', 'store', 'extended'

-- تتبع الدفعات
track_batches BOOLEAN DEFAULT FALSE,
use_fifo BOOLEAN DEFAULT TRUE,

-- معلومات إضافية للأدوية/الصيدليات
requires_prescription BOOLEAN DEFAULT FALSE,
active_ingredient TEXT,
dosage_form TEXT,
concentration TEXT,

-- معلومات إضافية للمطاعم
preparation_time_minutes INTEGER,
calories INTEGER,
allergens TEXT[],
is_vegetarian BOOLEAN DEFAULT FALSE,
is_vegan BOOLEAN DEFAULT FALSE,
is_gluten_free BOOLEAN DEFAULT FALSE,
spice_level INTEGER, -- 0-5

-- معلومات قطع الغيار
oem_number TEXT,
compatible_models TEXT[],
vehicle_make TEXT,
vehicle_model TEXT,
year_from INTEGER,
year_to INTEGER,

-- معلومات البناء والمواد
material_type TEXT,
dimensions JSONB, -- {length, width, height, unit}
weight_kg NUMERIC(10,3),
coverage_area_sqm NUMERIC(10,2), -- للدهانات والبلاط

-- حقول متقدمة
tax_rate NUMERIC(5,2),
tax_included BOOLEAN DEFAULT TRUE,
commission_rate NUMERIC(5,2),
supplier_id UUID,
manufacturer TEXT,
country_of_origin TEXT,
customs_code TEXT, -- HS Code
```

### 2. جدول جديد: `product_serial_numbers`

```sql
CREATE TABLE product_serial_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_id UUID REFERENCES product_colors(id) ON DELETE SET NULL,
  size_id UUID REFERENCES product_sizes(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  serial_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- available, sold, returned, defective, reserved

  -- معلومات الضمان
  warranty_start_date TIMESTAMPTZ,
  warranty_end_date TIMESTAMPTZ,
  warranty_claimed BOOLEAN DEFAULT FALSE,

  -- معلومات البيع
  sold_at TIMESTAMPTZ,
  sold_in_order_id UUID,
  sold_to_customer_id UUID,
  sold_price NUMERIC(12,2),

  -- تتبع
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, serial_number)
);

CREATE INDEX idx_serial_numbers_product ON product_serial_numbers(product_id);
CREATE INDEX idx_serial_numbers_status ON product_serial_numbers(status);
CREATE INDEX idx_serial_numbers_serial ON product_serial_numbers(serial_number);
```

### 3. جدول جديد: `product_price_tiers`

```sql
CREATE TABLE product_price_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  tier_name TEXT NOT NULL, -- 'retail', 'wholesale', 'partial_wholesale', 'vip', 'reseller'
  min_quantity INTEGER NOT NULL DEFAULT 1,
  max_quantity INTEGER, -- NULL = unlimited

  -- السعر يمكن أن يكون ثابت أو نسبة خصم
  price_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed', 'percentage_discount'
  price NUMERIC(12,2),
  discount_percentage NUMERIC(5,2),

  -- شروط إضافية
  requires_customer_group BOOLEAN DEFAULT FALSE,
  customer_group_id UUID,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_tiers_product ON product_price_tiers(product_id);
```

---

## 🚀 دالة RPC الجديدة: `upsert_product_v2`

### المعاملات (Parameters)

```sql
CREATE OR REPLACE FUNCTION upsert_product_v2(
  -- معرف المنتج (NULL للإنشاء، UUID للتحديث)
  p_product_id UUID DEFAULT NULL,

  -- البيانات الأساسية
  p_basic_data JSONB DEFAULT '{}',
  /*
  {
    "name": "اسم المنتج",
    "description": "الوصف",
    "sku": "SKU001",
    "barcode": "123456789",
    "category_id": "uuid",
    "subcategory_id": "uuid",
    "brand": "الماركة",
    "organization_id": "uuid" -- مطلوب للإنشاء
  }
  */

  -- بيانات التسعير
  p_pricing_data JSONB DEFAULT '{}',
  /*
  {
    "price": 100.00,
    "purchase_price": 80.00,
    "compare_at_price": 120.00,
    "tax_rate": 19.00,
    "tax_included": true,

    -- أسعار الجملة البسيطة
    "wholesale_price": 90.00,
    "min_wholesale_quantity": 10,
    "partial_wholesale_price": 95.00,
    "min_partial_wholesale_quantity": 5,

    "allow_retail": true,
    "allow_wholesale": true,
    "allow_partial_wholesale": false
  }
  */

  -- بيانات المخزون
  p_inventory_data JSONB DEFAULT '{}',
  /*
  {
    "stock_quantity": 100,
    "min_stock_level": 5,
    "reorder_level": 10,
    "reorder_quantity": 20,
    "track_inventory": true
  }
  */

  -- إعدادات البيع بالوزن
  p_weight_selling JSONB DEFAULT NULL,
  /*
  {
    "enabled": true,
    "weight_unit": "kg",
    "price_per_unit": 50.00,
    "purchase_price_per_unit": 40.00,
    "min_weight": 0.1,
    "max_weight": 10,
    "average_item_weight": 0.5
  }
  */

  -- إعدادات البيع بالكرتون
  p_box_selling JSONB DEFAULT NULL,
  /*
  {
    "enabled": true,
    "units_per_box": 24,
    "box_price": 2000.00,
    "box_purchase_price": 1600.00,
    "box_barcode": "BOX123456",
    "allow_single_unit_sale": true
  }
  */

  -- إعدادات البيع بالمتر
  p_meter_selling JSONB DEFAULT NULL,
  /*
  {
    "enabled": true,
    "meter_unit": "m",
    "price_per_meter": 150.00,
    "purchase_price_per_meter": 100.00,
    "min_meters": 0.5,
    "roll_length": 50
  }
  */

  -- إعدادات تتبع الصلاحية
  p_expiry_tracking JSONB DEFAULT NULL,
  /*
  {
    "enabled": true,
    "default_expiry_days": 365,
    "alert_days_before": 30
  }
  */

  -- إعدادات الأرقام التسلسلية
  p_serial_tracking JSONB DEFAULT NULL,
  /*
  {
    "enabled": true,
    "require_on_sale": true
  }
  */

  -- إعدادات الضمان
  p_warranty JSONB DEFAULT NULL,
  /*
  {
    "enabled": true,
    "duration_months": 12,
    "type": "manufacturer"
  }
  */

  -- إعدادات الدفعات
  p_batch_tracking JSONB DEFAULT NULL,
  /*
  {
    "enabled": true,
    "use_fifo": true
  }
  */

  -- الألوان والمقاسات
  p_variants JSONB DEFAULT NULL,
  /*
  [
    {
      "id": "uuid-or-null-for-new",
      "type": "color",
      "name": "أحمر",
      "color_code": "#FF0000",
      "image_url": "...",
      "barcode": "...",
      "quantity": 50,
      "price": null,
      "purchase_price": null,
      "sizes": [
        {
          "id": "uuid-or-null",
          "name": "XL",
          "quantity": 20,
          "price": null,
          "purchase_price": null,
          "barcode": "..."
        }
      ]
    }
  ]
  */

  -- الدفعات الأولية (للإنشاء)
  p_initial_batches JSONB DEFAULT NULL,
  /*
  [
    {
      "batch_number": "B001",
      "quantity": 100,
      "purchase_price": 80.00,
      "selling_price": 100.00,
      "expiry_date": "2025-12-31",
      "supplier_id": "uuid",
      "location": "مستودع أ",
      "notes": "..."
    }
  ]
  */

  -- الأرقام التسلسلية الأولية
  p_initial_serials JSONB DEFAULT NULL,
  /*
  [
    {
      "serial_number": "SN001",
      "warranty_start_date": "2024-01-01",
      "notes": "..."
    }
  ]
  */

  -- مستويات الأسعار المتقدمة
  p_price_tiers JSONB DEFAULT NULL,
  /*
  [
    {
      "tier_name": "reseller",
      "min_quantity": 50,
      "price_type": "percentage_discount",
      "discount_percentage": 20
    }
  ]
  */

  -- الصور
  p_images JSONB DEFAULT NULL,
  /*
  [
    {"url": "...", "alt": "...", "is_primary": true}
  ]
  */

  -- معلومات خاصة بالنشاط (حسب business_type)
  p_business_specific JSONB DEFAULT NULL,
  /*
  -- للصيدلية:
  {
    "requires_prescription": false,
    "active_ingredient": "...",
    "dosage_form": "tablet",
    "concentration": "500mg"
  }

  -- للمطعم:
  {
    "preparation_time_minutes": 15,
    "calories": 350,
    "allergens": ["nuts", "dairy"],
    "is_vegetarian": false,
    "spice_level": 2
  }

  -- لقطع الغيار:
  {
    "oem_number": "OEM123",
    "compatible_models": ["Model A", "Model B"],
    "vehicle_make": "Toyota",
    "year_from": 2018,
    "year_to": 2024
  }

  -- للبناء:
  {
    "material_type": "cement",
    "dimensions": {"length": 10, "width": 10, "height": 5, "unit": "cm"},
    "weight_kg": 25,
    "coverage_area_sqm": 1.5
  }
  */

  -- إعدادات متقدمة (للمتجر الإلكتروني)
  p_advanced_settings JSONB DEFAULT NULL,

  -- إعدادات التسويق
  p_marketing_settings JSONB DEFAULT NULL,

  -- العروض الخاصة
  p_special_offers JSONB DEFAULT NULL,

  -- الوصف المتقدم
  p_advanced_description JSONB DEFAULT NULL,

  -- حالة النشر
  p_publication JSONB DEFAULT NULL,
  /*
  {
    "status": "published", -- draft, scheduled, published, archived
    "publish_at": "2024-01-01T00:00:00Z"
  }
  */

  -- معرف المستخدم
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- سيتم كتابة الكود هنا
$$;
```

---

## 📤 هيكل الاستجابة

```json
{
  "success": true,
  "product_id": "uuid",
  "action": "created" | "updated",
  "data": {
    "id": "uuid",
    "name": "...",
    "sku": "...",
    "stock_quantity": 100,
    "has_variants": true,
    "variants_count": 5,
    "batches_count": 2,
    "serials_count": 0
  },
  "warnings": [
    "Low stock alert threshold set"
  ],
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## 🔄 دالة جلب المنتج: `get_product_v2`

```sql
CREATE OR REPLACE FUNCTION get_product_v2(
  p_product_identifier TEXT, -- UUID or slug or SKU or barcode
  p_organization_id UUID,
  p_scope TEXT DEFAULT 'full', -- 'basic', 'pos', 'full', 'edit'
  p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
```

### مستويات البيانات:

- **basic**: البيانات الأساسية فقط (للقوائم)
- **pos**: البيانات المطلوبة لنقطة البيع
- **full**: كل البيانات (للعرض الكامل)
- **edit**: كل البيانات + الإعدادات (للتحرير)

---

## 📊 دوال مساعدة جديدة

### 1. إدارة الدفعات

```sql
-- إضافة دفعة جديدة
CREATE FUNCTION add_product_batch(
  p_product_id UUID,
  p_batch_data JSONB,
  p_user_id UUID
) RETURNS JSONB;

-- تحديث كمية الدفعة
CREATE FUNCTION update_batch_quantity(
  p_batch_id UUID,
  p_quantity_change INTEGER,
  p_reason TEXT,
  p_user_id UUID
) RETURNS JSONB;

-- جلب الدفعات المتاحة (FIFO)
CREATE FUNCTION get_available_batches(
  p_product_id UUID,
  p_required_quantity INTEGER
) RETURNS JSONB;
```

### 2. إدارة الأرقام التسلسلية

```sql
-- إضافة أرقام تسلسلية
CREATE FUNCTION add_serial_numbers(
  p_product_id UUID,
  p_serials JSONB,
  p_user_id UUID
) RETURNS JSONB;

-- حجز رقم تسلسلي للبيع
CREATE FUNCTION reserve_serial_number(
  p_serial_number TEXT,
  p_order_id UUID
) RETURNS JSONB;

-- تأكيد بيع الرقم التسلسلي
CREATE FUNCTION confirm_serial_sale(
  p_serial_number TEXT,
  p_customer_id UUID,
  p_sale_price NUMERIC
) RETURNS JSONB;

-- إرجاع رقم تسلسلي
CREATE FUNCTION return_serial_number(
  p_serial_number TEXT,
  p_reason TEXT,
  p_user_id UUID
) RETURNS JSONB;
```

### 3. حساب الأسعار

```sql
-- حساب السعر حسب الكمية والنوع
CREATE FUNCTION calculate_product_price(
  p_product_id UUID,
  p_quantity NUMERIC,
  p_sale_type TEXT, -- 'retail', 'wholesale', 'weight', 'box', 'meter'
  p_customer_group_id UUID DEFAULT NULL,
  p_weight NUMERIC DEFAULT NULL,
  p_meters NUMERIC DEFAULT NULL
) RETURNS JSONB;
/*
{
  "unit_price": 100.00,
  "total_price": 1000.00,
  "discount_applied": 10.00,
  "tier_name": "wholesale",
  "tax_amount": 190.00,
  "final_price": 1190.00
}
*/
```

---

## 🎯 مميزات التصميم الجديد

1. **دالة موحدة**: `upsert_product_v2` تعمل للإنشاء والتحديث
2. **معاملات منظمة**: كل مجموعة بيانات في معامل JSONB منفصل
3. **دعم كل أنواع البيع**: بالوحدة، الوزن، الكرتون، المتر
4. **تتبع متقدم**: دفعات، صلاحية، أرقام تسلسلية، ضمان
5. **مرونة الأسعار**: مستويات أسعار متعددة
6. **دعم كل الأنشطة**: صيدلية، مطعم، قطع غيار، بناء...
7. **أداء محسن**: transaction واحد، indexes محسنة
8. **أمان**: SECURITY DEFINER مع التحقق من الصلاحيات

---

## 📅 خطة التنفيذ

### المرحلة 1: إضافة الأعمدة الجديدة
- Migration لإضافة الأعمدة في جدول products
- إنشاء جدول product_serial_numbers
- إنشاء جدول product_price_tiers

### المرحلة 2: إنشاء الدوال الأساسية
- `upsert_product_v2`
- `get_product_v2`

### المرحلة 3: إنشاء الدوال المساعدة
- دوال إدارة الدفعات
- دوال إدارة الأرقام التسلسلية
- دوال حساب الأسعار

### المرحلة 4: التكامل مع Business Profile
- تصفية الحقول حسب نوع النشاط
- إعدادات افتراضية حسب النشاط
