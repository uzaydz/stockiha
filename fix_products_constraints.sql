-- إصلاح مشكلة NOT NULL constraints في جدول products
-- السبب: عمود description و sku مطلوبان لكن التطبيق قد لا يرسل قيم لهما

-- ==================================================================
-- الحل 1: إضافة قيم افتراضية للأعمدة المطلوبة
-- ==================================================================

-- جعل description اختياري أو إضافة قيمة افتراضية
ALTER TABLE products ALTER COLUMN description SET DEFAULT '';

-- يمكن أيضاً جعله اختياري تماماً
-- ALTER TABLE products ALTER COLUMN description DROP NOT NULL;

-- ==================================================================
-- الحل 2: إعادة تفعيل RLS مع سياسات صحيحة
-- ==================================================================

-- تفعيل RLS مرة أخرى
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات بسيطة تعمل
CREATE POLICY "products_read_any" ON products FOR SELECT 
TO authenticated, public
USING (true);

CREATE POLICY "products_insert_any" ON products FOR INSERT 
TO authenticated, public
WITH CHECK (
    organization_id IS NOT NULL AND
    name IS NOT NULL AND
    LENGTH(name) >= 1
);

CREATE POLICY "products_update_any" ON products FOR UPDATE 
TO authenticated, public
USING (organization_id IS NOT NULL)
WITH CHECK (organization_id IS NOT NULL);

CREATE POLICY "products_delete_any" ON products FOR DELETE 
TO authenticated, public
USING (organization_id IS NOT NULL);

CREATE POLICY "products_service_any" ON products FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- ==================================================================
-- الحل 3: إنشاء trigger لملء القيم المفقودة تلقائياً
-- ==================================================================

CREATE OR REPLACE FUNCTION ensure_required_product_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- تأكد من وجود description
    IF NEW.description IS NULL OR NEW.description = '' THEN
        NEW.description := COALESCE(NEW.name, 'منتج جديد');
    END IF;
    
    -- تأكد من وجود sku إذا كان مطلوباً
    IF NEW.sku IS NULL OR NEW.sku = '' THEN
        -- إنشاء SKU تلقائياً إذا لم يتم توفيره
        NEW.sku := 'AUTO-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || substring(md5(random()::text), 1, 6);
    END IF;
    
    RETURN NEW;
END;
$$;

-- تطبيق الـ trigger
DROP TRIGGER IF EXISTS ensure_product_fields_trigger ON products;
CREATE TRIGGER ensure_product_fields_trigger
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION ensure_required_product_fields();

-- ==================================================================
-- اختبار النتيجة
-- ==================================================================

-- اختبار إدراج منتج بدون description
INSERT INTO products (
    organization_id,
    name,
    price,
    purchase_price,
    category_id,
    stock_quantity,
    is_active,
    created_by_user_id,
    updated_by_user_id,
    is_digital
) VALUES (
    'fed872f9-1ade-4351-b020-5598fda976fe',
    'منتج اختبار',
    100,
    50,
    '91c89913-50bd-4cc5-b4cb-316afe43076b',
    10,
    true,
    '213f3a14-c076-4cdf-945b-a7e877eab5c9',
    '213f3a14-c076-4cdf-945b-a7e877eab5c9',
    false
) RETURNING id, name, description, sku;

-- حذف المنتج التجريبي
DELETE FROM products WHERE name = 'منتج اختبار';

-- رسالة النجاح
SELECT 
    'تم إصلاح مشكلة NOT NULL constraints!' as status,
    'الآن يمكن إنشاء المنتجات بنجاح' as note; 