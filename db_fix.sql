-- ملف db_fix.sql
-- معالجة مشكلة حفظ الطلبات الأونلاين في قاعدة البيانات

-- 1. إصلاح قيد التحقق في جدول inventory_log
DO $$
BEGIN
    -- حذف القيد الموجود
    ALTER TABLE inventory_log DROP CONSTRAINT IF EXISTS inventory_log_type_check;
    
    -- إضافة القيد من جديد مع دعم 'online_order'
    ALTER TABLE inventory_log ADD CONSTRAINT inventory_log_type_check 
    CHECK (type IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'online_order'));
    
    RAISE NOTICE 'تم تحديث قيد التحقق بنجاح';
END;
$$;

-- 2. تحقق من محتوى جدول الطلبات عبر الإنترنت
WITH order_counts AS (
    SELECT 
        COUNT(*) AS total_orders,
        COUNT(*) FILTER (WHERE is_online = TRUE) AS online_orders_count
    FROM orders
), 
online_orders_table_count AS (
    SELECT COUNT(*) AS count FROM online_orders
)
SELECT 
    o.total_orders AS "إجمالي الطلبات", 
    o.online_orders_count AS "طلبات الأونلاين في جدول orders",
    oo.count AS "طلبات في جدول online_orders"
FROM 
    order_counts o, 
    online_orders_table_count oo;

-- 3. فحص الإدخال الأخير الذي تم تقديمه للتحقق من تطبيق الطلب
WITH recent_orders AS (
    SELECT 
        id, customer_id, total, status, created_at, 
        'orders' AS source
    FROM 
        orders 
    WHERE 
        created_at > NOW() - INTERVAL '1 hour'
    
    UNION ALL
    
    SELECT 
        id, customer_id, total, status, created_at, 
        'online_orders' AS source
    FROM 
        online_orders 
    WHERE 
        created_at > NOW() - INTERVAL '1 hour'
)
SELECT 
    id, source, total, status, created_at
FROM 
    recent_orders
ORDER BY 
    created_at DESC
LIMIT 5;

-- 4. فحص قاعدة البيانات للعثور على سجلات للعميل المحدد (إذا كانت المعلومات متاحة)
SELECT 
    c.id, c.name, c.phone, c.created_at,
    (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) AS order_count,
    (SELECT COUNT(*) FROM online_orders WHERE customer_id = c.id) AS online_order_count
FROM 
    customers c
WHERE 
    c.phone = '0655880236'
    OR c.name LIKE '%دلالدلال%'
ORDER BY 
    c.created_at DESC
LIMIT 5;

-- 5. الاستعلام عن الجداول في قاعدة البيانات - تم إزالة الاعتماد على جدول error_log
SELECT 
    table_name
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public' AND
    table_name IN ('orders', 'online_orders', 'inventory_log', 'customers');

-- 6. التحقق من وظيفة معالجة الطلبات
SELECT 
    proname AS function_name,
    proargnames AS argument_names,
    prosrc LIKE '%online_order%' AS has_online_order_type
FROM 
    pg_proc
WHERE 
    proname = 'process_online_order_new'; 