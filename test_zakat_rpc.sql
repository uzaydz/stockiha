-- 🧪 ملف اختبار لدالة calculate_zakat
-- يمكن تشغيله بعد إنشاء الدالة للتأكد من عملها بشكل صحيح

-- 1. اختبار بسيط للتأكد من وجود الدالة
SELECT proname
FROM pg_proc
WHERE proname = 'calculate_zakat';

-- 2. اختبار مع بيانات تجريبية
-- استبدل 'your-organization-id' بمعرف منظمة حقيقي من قاعدة البيانات
SELECT
    'Test Organization ID'::UUID as organization_id,
    NOW() as calculation_date,
    TRUE as include_detailed_breakdown,
    TRUE as include_zakat_suggestions,
    NULL::NUMERIC as custom_gold_price;

-- 3. إنشاء بيانات تجريبية بسيطة للاختبار
-- يمكن إلغاء التعليق وتشغيل هذا الجزء إذا لزم الأمر

/*
-- إدراج منتج تجريبي
INSERT INTO products (
    id, name, description, price, purchase_price, stock_quantity,
    organization_id, is_active, sku
) VALUES (
    gen_random_uuid(),
    'منتج تجريبي للزكاة',
    'منتج لاختبار حساب الزكاة',
    100.00,
    80.00,
    10,
    'your-organization-id'::UUID,
    TRUE,
    'TEST-ZAKAT-001'
) ON CONFLICT DO NOTHING;

-- إدراج طلب تجريبي
INSERT INTO orders (
    id, subtotal, tax, total, status, payment_method, payment_status,
    organization_id, is_online, created_at
) VALUES (
    gen_random_uuid(),
    100.00,
    0.00,
    100.00,
    'completed',
    'cash',
    'paid',
    'your-organization-id'::UUID,
    FALSE,
    NOW()
) ON CONFLICT DO NOTHING;

-- إدراج عنصر طلب تجريبي
INSERT INTO order_items (
    id, order_id, product_id, quantity, unit_price, total_price,
    organization_id
)
SELECT
    gen_random_uuid(),
    o.id,
    p.id,
    1,
    100.00,
    100.00,
    'your-organization-id'::UUID
FROM orders o
JOIN products p ON p.organization_id = o.organization_id
WHERE o.organization_id = 'your-organization-id'::UUID
AND p.sku = 'TEST-ZAKAT-001'
LIMIT 1;
*/

-- 4. اختبار الدالة مع معرف منظمة حقيقي
-- استبدل 'your-organization-id' بمعرف منظمة حقيقي
/*
SELECT * FROM calculate_zakat(
    'your-organization-id'::UUID,  -- معرف المنظمة
    NOW(),                         -- تاريخ الحساب
    TRUE,                          -- تضمين التفاصيل
    TRUE,                          -- تضمين الاقتراحات
    2800                           -- سعر الذهب (اختياري)
);
*/
