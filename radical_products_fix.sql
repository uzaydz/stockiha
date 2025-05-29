-- الحل الجذري: تعطيل RLS مؤقتاً وإزالة جميع العوائق
-- هذا للتشخيص فقط - لفهم سبب المشكلة

-- ==================================================================
-- الخطوة 1: تعطيل RLS مؤقتاً
-- ==================================================================

ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- ==================================================================
-- الخطوة 2: حذف جميع السياسات
-- ==================================================================

DROP POLICY IF EXISTS "products_simple_read" ON products;
DROP POLICY IF EXISTS "products_simple_insert" ON products;
DROP POLICY IF EXISTS "products_simple_update" ON products;
DROP POLICY IF EXISTS "products_simple_delete" ON products;
DROP POLICY IF EXISTS "products_service_all" ON products;

-- ==================================================================
-- الخطوة 3: منح صلاحيات كاملة
-- ==================================================================

GRANT ALL ON products TO public;
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO anon;
GRANT ALL ON products TO service_role;

-- ==================================================================
-- الخطوة 4: اختبار النتيجة
-- ==================================================================

-- محاولة إدراج منتج تجريبي للاختبار
INSERT INTO products (
    organization_id,
    name,
    price,
    purchase_price,
    category_id,
    stock_quantity,
    is_active,
    created_by_user_id,
    updated_by_user_id
) VALUES (
    'fed872f9-1ade-4351-b020-5598fda976fe',
    'TEST PRODUCT - DELETE ME',
    100,
    50,
    '91c89913-50bd-4cc5-b4cb-316afe43076b',
    10,
    true,
    '213f3a14-c076-4cdf-945b-a7e877eab5c9',
    '213f3a14-c076-4cdf-945b-a7e877eab5c9'
) RETURNING id, name;

-- حذف المنتج التجريبي فوراً
DELETE FROM products WHERE name = 'TEST PRODUCT - DELETE ME';

-- رسالة النتيجة
SELECT 
    'RLS تم تعطيله مؤقتاً لأغراض التشخيص' as status,
    'إذا نجح الاختبار أعلاه، فالمشكلة في RLS/السياسات' as note,
    count(*) as total_products
FROM products; 