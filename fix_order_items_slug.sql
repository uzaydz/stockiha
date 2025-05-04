-- إضافة حقل slug إلى جدول order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS slug TEXT;

-- تحديث جميع السجلات الموجودة في جدول order_items بقيم افتراضية للحقل slug
UPDATE order_items SET slug = 'item-' || id WHERE slug IS NULL; 