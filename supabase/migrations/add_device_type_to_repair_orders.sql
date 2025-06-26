-- إضافة حقل نوع الجهاز إلى جدول طلبات التصليح
-- Migration: add_device_type_to_repair_orders.sql

-- إضافة حقل نوع الجهاز
ALTER TABLE repair_orders 
ADD COLUMN IF NOT EXISTS device_type TEXT;

-- إضافة تعليق على الحقل
COMMENT ON COLUMN repair_orders.device_type IS 'نوع الجهاز المراد تصليحه (مثل: هاتف ذكي، لابتوب، تابلت، إلخ)';

-- إضافة فهرس لتسريع البحث حسب نوع الجهاز
CREATE INDEX IF NOT EXISTS repair_orders_device_type_idx ON repair_orders(device_type);

-- تحديث البيانات الموجودة بقيمة افتراضية (اختياري)
UPDATE repair_orders 
SET device_type = 'غير محدد' 
WHERE device_type IS NULL;