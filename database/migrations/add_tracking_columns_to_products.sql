-- ================================================
-- إضافة أعمدة التتبع المتقدم لجدول products
-- ================================================
-- هذا الملف يضيف الأعمدة المطلوبة لدعم:
-- - Serial Numbers tracking
-- - Batch tracking
-- - Expiry tracking
-- - Warranty tracking
-- - Weight/Box/Meter selling
-- ================================================

-- =====================================================
-- أعمدة البيع بالوزن
-- =====================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS sell_by_weight BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'kg';
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_per_weight_unit NUMERIC(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price_per_weight_unit NUMERIC(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_weight NUMERIC(10,3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_weight NUMERIC(10,3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS average_item_weight NUMERIC(10,3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_weight NUMERIC(12,3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_weight_purchased NUMERIC(12,3);

-- =====================================================
-- أعمدة البيع بالكرتون/العلبة
-- =====================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS sell_by_box BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS units_per_box INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS box_price NUMERIC(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS box_purchase_price NUMERIC(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS box_barcode TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_single_unit_sale BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_boxes INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_boxes_purchased INTEGER;

-- =====================================================
-- أعمدة البيع بالمتر
-- =====================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS sell_by_meter BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meter_unit TEXT DEFAULT 'm';
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_per_meter NUMERIC(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price_per_meter NUMERIC(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_meters NUMERIC(10,2) DEFAULT 0.1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS roll_length NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_length NUMERIC(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_meters_purchased NUMERIC(12,2);

-- =====================================================
-- أعمدة تتبع الصلاحية
-- =====================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_expiry BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS default_expiry_days INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_alert_days INTEGER DEFAULT 30;

-- =====================================================
-- أعمدة تتبع الأرقام التسلسلية
-- =====================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_serial_numbers BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS require_serial_on_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supports_imei BOOLEAN DEFAULT FALSE;

-- =====================================================
-- أعمدة الضمان
-- =====================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_warranty BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_duration_months INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_type TEXT; -- 'manufacturer', 'store', 'extended'

-- =====================================================
-- أعمدة تتبع الدفعات
-- =====================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_batches BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS use_fifo BOOLEAN DEFAULT TRUE;

-- =====================================================
-- إنشاء فهارس للأداء
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_track_serial_numbers ON products(track_serial_numbers) WHERE track_serial_numbers = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_track_batches ON products(track_batches) WHERE track_batches = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_track_expiry ON products(track_expiry) WHERE track_expiry = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_has_warranty ON products(has_warranty) WHERE has_warranty = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_sell_by_weight ON products(sell_by_weight) WHERE sell_by_weight = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_sell_by_box ON products(sell_by_box) WHERE sell_by_box = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_sell_by_meter ON products(sell_by_meter) WHERE sell_by_meter = TRUE;

-- =====================================================
-- تأكيد النجاح
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ تم إضافة أعمدة التتبع المتقدم بنجاح';
END $$;
