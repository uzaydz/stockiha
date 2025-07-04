-- إصلاح خطأ التضارب في دالة safe_inventory_monitor
-- المشكلة: تضارب في اسم المتغير organization_name

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS safe_inventory_monitor();

-- إنشاء دالة جديدة بأسماء متغيرات واضحة
CREATE OR REPLACE FUNCTION safe_inventory_monitor()
RETURNS TABLE (
    status_check TEXT,
    org_name TEXT,
    product_name TEXT,
    current_stock INTEGER,
    issue_detected TEXT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH inventory_analysis AS (
        SELECT 
            p.id as product_id,
            p.name as product_name,
            p.stock_quantity,
            org.name as org_name,
            -- فحص المشاكل بدون تصحيح تلقائي
            CASE 
                WHEN p.stock_quantity < 0 THEN 'مخزون سلبي'
                WHEN p.stock_quantity = 0 AND EXISTS(
                    SELECT 1 FROM inventory_log il 
                    WHERE il.product_id = p.id 
                    AND il.type = 'sale' 
                    AND il.created_at >= NOW() - INTERVAL '30 days'
                ) THEN 'مخزون صفر للمنتج النشط'
                WHEN p.stock_quantity > 1000 THEN 'مخزون مرتفع جداً'
                ELSE 'طبيعي'
            END as issue_type,
            -- توصيات بدون تدخل تلقائي
            CASE 
                WHEN p.stock_quantity < 0 THEN 'مراجعة يدوية مطلوبة'
                WHEN p.stock_quantity = 0 THEN 'فحص سجل المبيعات'
                WHEN p.stock_quantity > 1000 THEN 'فحص صحة البيانات'
                ELSE 'لا توجد توصيات'
            END as recommendation
        FROM products p
        LEFT JOIN organizations org ON org.id = p.organization_id
        WHERE p.created_at >= NOW() - INTERVAL '30 days' -- المنتجات الحديثة فقط
    )
    SELECT 
        CASE 
            WHEN ia.issue_type = 'طبيعي' THEN '✅ سليم'
            ELSE '⚠️ يحتاج مراجعة'
        END::TEXT,
        ia.org_name::TEXT,
        ia.product_name::TEXT,
        ia.stock_quantity::INTEGER,
        ia.issue_type::TEXT,
        ia.recommendation::TEXT
    FROM inventory_analysis ia
    WHERE ia.issue_type != 'طبيعي'
    ORDER BY 
        CASE ia.issue_type
            WHEN 'مخزون سلبي' THEN 1
            WHEN 'مخزون صفر للمنتج النشط' THEN 2
            ELSE 3
        END;
END;
$$ LANGUAGE plpgsql;

-- اختبار الدالة الجديدة
SELECT 'اختبار الدالة المُصححة:' as test_title;
SELECT * FROM safe_inventory_monitor() LIMIT 5; 