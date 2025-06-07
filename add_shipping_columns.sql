-- تصحيح: النظام يستخدم جدول shipping_orders للتتبع
-- لا نحتاج لإضافة أعمدة في جدول orders

-- 1. التحقق من بنية shipping_orders الحالية
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'shipping_orders' 
  AND column_name IN ('tracking_number', 'external_id', 'provider_id')
ORDER BY column_name;

-- 2. التحقق من الفهارس الموجودة
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'shipping_orders' 
  AND indexname LIKE '%tracking%';

-- 3. إضافة فهرس للبحث السريع في tracking_number (إذا لم يكن موجوداً)
CREATE INDEX IF NOT EXISTS idx_shipping_orders_tracking_number 
ON shipping_orders (tracking_number) 
WHERE tracking_number IS NOT NULL;

-- 4. إضافة فهرس مركب للبحث بالمزود ورقم التتبع
CREATE INDEX IF NOT EXISTS idx_shipping_orders_provider_tracking 
ON shipping_orders (provider_id, tracking_number) 
WHERE tracking_number IS NOT NULL;

-- 5. إضافة فهرس للبحث بـ order_id
CREATE INDEX IF NOT EXISTS idx_shipping_orders_order_id 
ON shipping_orders (order_id) 
WHERE order_id IS NOT NULL;

-- 6. التحقق من النتائج
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'shipping_orders' 
  AND indexname LIKE 'idx_shipping_orders_%'
ORDER BY indexname;

-- ملاحظة: النظام الحالي يستخدم:
-- - shipping_orders.tracking_number للتتبع
-- - shipping_orders.external_id للمعرف الخارجي
-- - shipping_orders.provider_id لربط المزود
-- - لا حاجة لأعمدة إضافية في جدول orders 