-- إضافة حقل الوصف المتقدم إلى جدول المنتجات
-- Advanced description field for products with JSON structure

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS advanced_description JSONB;

-- إضافة فهرس للبحث في محتوى الوصف المتقدم
CREATE INDEX IF NOT EXISTS idx_products_advanced_description_gin 
ON products USING gin(advanced_description);

-- إضافة تعليق للحقل
COMMENT ON COLUMN products.advanced_description IS 'بنية JSON للوصف المتقدم يحتوي على مكونات متعددة مثل الصور والسلايد شو وآراء العملاء';