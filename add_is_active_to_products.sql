-- إضافة عمود is_active إلى جدول المنتجات
-- هذا العمود سيستخدم لتعطيل المنتجات بدلاً من حذفها

ALTER TABLE products 
ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- إضافة تعليق توضيحي للعمود
COMMENT ON COLUMN products.is_active IS 'يشير إلى ما إذا كان المنتج مفعّل (يظهر في نقاط البيع) أو معطّل';

-- تحديث جميع المنتجات الحالية لتكون مفعلة
UPDATE products SET is_active = TRUE WHERE is_active IS NULL;

-- إنشاء فهرس على العمود للبحث السريع
CREATE INDEX idx_products_is_active ON products(is_active); 