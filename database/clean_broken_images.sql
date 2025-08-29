-- تنظيف الصور المكسورة من قاعدة البيانات
-- هذا الملف يحذف الروابط المكسورة للصور من جدول products

-- تشغيل هذا الملف في Supabase SQL Editor

-- 1. تنظيف حقل additional_images من الروابط المكسورة
UPDATE products
SET additional_images = NULL
WHERE additional_images IS NOT NULL
  AND (
    -- الروابط التي لا تحتوي على supabase.co (ربما صور محلية أو مكسورة)
    NOT (additional_images[1] LIKE '%supabase.co%')
    OR
    -- الروابط التي قد تكون مكسورة (اختياري - يمكنك تعديل هذا حسب الحاجة)
    additional_images[1] LIKE '%undefined%'
    OR additional_images[1] LIKE '%null%'
  );

-- 2. إحصائية للمنتجات التي تم تنظيفها
SELECT
  'تم تنظيف الصور المكسورة من ' || COUNT(*) || ' منتج' as result
FROM products
WHERE additional_images IS NULL;

-- 3. عرض المنتجات التي لا تزال تحتوي على صور (للمراجعة)
SELECT
  id,
  name,
  additional_images
FROM products
WHERE additional_images IS NOT NULL
LIMIT 10;
