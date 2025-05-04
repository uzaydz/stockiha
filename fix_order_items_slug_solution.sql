-- حل مشكلة حقل slug في جدول order_items

-- 1. التحقق من وجود حقل slug في الجدول وإضافته إذا لم يكن موجودًا
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'slug'
  ) THEN
    ALTER TABLE order_items ADD COLUMN slug TEXT;
  END IF;
END $$;

-- 2. تعديل الحقل ليكون nullable مؤقتًا (إذا كان NOT NULL) لتسهيل التحديث
ALTER TABLE order_items ALTER COLUMN slug DROP NOT NULL;

-- 3. إضافة قيم للسجلات الموجودة التي لا تحتوي على قيمة
UPDATE order_items SET slug = 'item-' || id::text WHERE slug IS NULL;

-- 4. تعديل الحقل ليكون NOT NULL بعد تحديث البيانات
ALTER TABLE order_items ALTER COLUMN slug SET NOT NULL;

-- 5. إضافة تعليق توضيحي على الحقل
COMMENT ON COLUMN order_items.slug IS 'معرف فريد للعنصر يستخدم في URLs'; 