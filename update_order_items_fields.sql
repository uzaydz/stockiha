-- تأكد من وجود أعمدة slug و name في جدول order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS name TEXT;

-- تحديث السجلات التي ليس لها قيمة slug
UPDATE order_items 
SET slug = CONCAT('item-', id, '-', floor(random() * 1000)::text)
WHERE slug IS NULL;

-- تحديث السجلات التي ليس لها قيمة name
UPDATE order_items 
SET name = product_name
WHERE name IS NULL;

-- التأكد من أن جميع السجلات الجديدة ستحتوي على قيم لهذه الحقول
ALTER TABLE order_items 
ALTER COLUMN slug SET NOT NULL,
ALTER COLUMN name SET NOT NULL;

-- إضافة فهرس للحقل slug لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_order_items_slug ON order_items (slug);

-- تأكد من أن الحقل organization_id موجود
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- إضافة قيد تحقق من عدم وجود قيم فارغة للحقل slug
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS check_slug_not_empty;

ALTER TABLE order_items 
ADD CONSTRAINT check_slug_not_empty 
CHECK (slug <> '');

-- ملاحظة: قم بتشغيل هذا السكريبت في بيئة الاختبار أولاً قبل تشغيله في الإنتاج
