-- إصلاح جدول shipping_orders ليشير إلى online_orders بدلاً من orders
-- تاريخ: 2025-10-12

-- 1. إزالة الـ constraint القديم
ALTER TABLE shipping_orders 
DROP CONSTRAINT IF EXISTS shipping_orders_order_id_fkey;

-- 2. إضافة constraint جديد يشير إلى online_orders
ALTER TABLE shipping_orders 
ADD CONSTRAINT shipping_orders_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES online_orders(id) 
ON DELETE CASCADE;

-- 3. إضافة index على order_id لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_shipping_orders_order_id 
ON shipping_orders(order_id);

-- 4. إضافة index على organization_id لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_shipping_orders_organization_id 
ON shipping_orders(organization_id);

-- 5. إضافة index على tracking_number للبحث السريع
CREATE INDEX IF NOT EXISTS idx_shipping_orders_tracking_number 
ON shipping_orders(tracking_number);

-- 6. التحقق من النجاح
-- يمكنك تشغيل هذا الاستعلام للتحقق من الـ constraints:
-- SELECT 
--   conname as constraint_name,
--   conrelid::regclass as table_name,
--   confrelid::regclass as referenced_table
-- FROM pg_constraint 
-- WHERE conname = 'shipping_orders_order_id_fkey';

COMMENT ON CONSTRAINT shipping_orders_order_id_fkey ON shipping_orders 
IS 'Foreign key to online_orders table - fixed on 2025-10-12';

