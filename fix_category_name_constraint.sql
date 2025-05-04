-- إصلاح قيد الاسم الفريد في جدول الفئات (product_categories)
-- المشكلة: حاليًا الاسم يجب أن يكون فريدًا على مستوى النظام بأكمله
-- الحل: جعل الاسم فريدًا فقط داخل المؤسسة الواحدة (unique per organization)

-- 1. إزالة قيد المفتاح الفريد الحالي على حقل name
ALTER TABLE product_categories
DROP CONSTRAINT IF EXISTS product_categories_name_key;

-- 2. إضافة قيد مفتاح فريد مركب يجمع بين name و organization_id
-- هذا يعني أن اسم الفئة يجب أن يكون فريدًا فقط داخل المؤسسة الواحدة
ALTER TABLE product_categories
ADD CONSTRAINT product_categories_name_org_key UNIQUE (name, organization_id);

-- 3. اختياري: التأكد من وجود فهرس على حقل الاسم لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories (name);

-- ملاحظة: هذا التعديل يسمح لمؤسسات مختلفة باستخدام نفس أسماء الفئات
-- دون أي تعارض، مع الحفاظ على فرادة الأسماء داخل كل مؤسسة 