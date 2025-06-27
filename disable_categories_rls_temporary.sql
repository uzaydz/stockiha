-- تعطيل RLS مؤقتاً للفئات لحل المشكلة
-- هذا حل مؤقت لحين إصلاح النظام

-- تعطيل RLS للفئات
ALTER TABLE product_categories DISABLE ROW LEVEL SECURITY;

-- إضافة تعليق توضيحي
COMMENT ON TABLE product_categories IS 'RLS مُعطل مؤقتاً لحل مشكلة عدم ظهور الفئات - سيتم إعادة تفعيله لاحقاً'; 