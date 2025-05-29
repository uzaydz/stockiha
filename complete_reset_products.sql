-- إعادة تعيين كاملة لجدول products
-- هذا سيحل جميع مشاكل RLS و PostgREST

-- 1. إزالة جميع السياسات
DROP POLICY IF EXISTS "products_insert_policy" ON products;
DROP POLICY IF EXISTS "products_read_policy" ON products;
DROP POLICY IF EXISTS "products_update_policy" ON products;
DROP POLICY IF EXISTS "products_delete_policy" ON products;
DROP POLICY IF EXISTS "products_service_role_policy" ON products;
DROP POLICY IF EXISTS "products_read_simple" ON products;
DROP POLICY IF EXISTS "products_insert_simple" ON products;
DROP POLICY IF EXISTS "products_update_simple" ON products;
DROP POLICY IF EXISTS "products_delete_simple" ON products;
DROP POLICY IF EXISTS "products_service_role_full_access" ON products;

-- 2. تعطيل RLS نهائياً
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- 3. إزالة جميع الصلاحيات الحالية
REVOKE ALL PRIVILEGES ON products FROM PUBLIC;
REVOKE ALL PRIVILEGES ON products FROM anon;
REVOKE ALL PRIVILEGES ON products FROM authenticated;
REVOKE ALL PRIVILEGES ON products FROM service_role;

-- 4. منح صلاحيات كاملة جديدة
GRANT ALL PRIVILEGES ON products TO PUBLIC;
GRANT ALL PRIVILEGES ON products TO anon;
GRANT ALL PRIVILEGES ON products TO authenticated;
GRANT ALL PRIVILEGES ON products TO service_role;

-- 5. إعادة تحديث إحصائيات الجدول
ANALYZE products;

-- 6. تحديث تعريف الجدول في PostgREST cache
NOTIFY pgrst, 'reload schema';

-- 7. اختبار إدراج بسيط مع جميع الحقول المطلوبة
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM products WHERE name = 'TEST_PRODUCT_ACCESS') THEN
        INSERT INTO products (
            organization_id,
            name,
            description,
            price,
            purchase_price,
            sku,
            category_id,
            stock_quantity,
            thumbnail_image,
            is_digital,
            is_featured,
            is_new,
            has_variants,
            show_price_on_landing,
            allow_retail,
            allow_wholesale,
            allow_partial_wholesale,
            use_sizes,
            is_sold_by_unit,
            use_variant_prices,
            use_shipping_clone,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            '27b9feaa-114a-40b2-a307-c541dbe93df0',
            'TEST_PRODUCT_ACCESS',
            'اختبار الوصول للجدول',
            1,
            1,
            'TEST-ACCESS',
            '5ce4da58-2a2e-4af0-b5ca-c1ce956816b8',
            1,
            'test.jpg',
            false,
            false,
            true,
            false,
            true,
            true,
            false,
            false,
            false,
            true,
            false,
            false,
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'تم إدراج منتج اختبار بنجاح';
    END IF;
END $$;

-- 8. حذف منتج الاختبار
DELETE FROM products WHERE name = 'TEST_PRODUCT_ACCESS';

-- 9. رسالة تأكيد نهائية
SELECT 
    'تم إعادة تعيين جدول products بنجاح - جاهز للاستخدام' as status,
    count(*) as total_products
FROM products; 