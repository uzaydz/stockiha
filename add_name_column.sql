-- إضافة حقل name إلى جدول order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS name TEXT;

-- تحديث السجلات الموجودة بقيم من حقل product_name
UPDATE order_items SET name = product_name WHERE name IS NULL; 