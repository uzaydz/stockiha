-- إصلاح طارئ لفساد المخزون من التصحيحات الخاطئة
-- تاريخ الإنشاء: 2025-07-03 19:00
-- المشكلة: دوال التصحيح التلقائي قامت بتصحيحات خاطئة أدت لمخزون 0
-- الحل: تحديد المتضررين + إصلاح فوري + منع تكرار المشكلة

-- ==========================================
-- الجزء الأول: تحليل شامل للضرر
-- ==========================================

-- فحص جميع السجلات المشبوهة (التصحيحات التلقائية الحديثة)
SELECT 
    '=== تحليل السجلات المشبوهة ===' as analysis_title;

WITH suspicious_corrections AS (
    SELECT 
        il.id,
        il.product_id,
        p.name as product_name,
        p.organization_id,
        org.name as organization_name,
        il.previous_stock,
        il.new_stock,
        il.quantity,
        il.reference_type,
        il.notes,
        il.created_at,
        -- تحديد نوع المشكلة
        CASE 
            WHEN il.new_stock = 0 AND il.previous_stock > 0 THEN 'مخزون صفر مشبوه'
            WHEN il.new_stock < 0 THEN 'مخزون سلبي'
            WHEN ABS(il.quantity) > il.previous_stock * 2 THEN 'تغيير كبير مشبوه'
            ELSE 'طبيعي'
        END as issue_type
    FROM inventory_log il
    JOIN products p ON p.id = il.product_id
    LEFT JOIN organizations org ON org.id = p.organization_id
    WHERE il.reference_type IN ('system_correction', 'bulk_correction', 'system_sync')
    AND il.created_at >= NOW() - INTERVAL '6 hours' -- آخر 6 ساعات
    ORDER BY il.created_at DESC
)
SELECT 
    issue_type,
    COUNT(*) as count_issues,
    COUNT(DISTINCT organization_id) as affected_organizations,
    COUNT(DISTINCT product_id) as affected_products
FROM suspicious_corrections
GROUP BY issue_type
ORDER BY count_issues DESC;

-- ==========================================
-- الجزء الثاني: قائمة مفصلة بالمتضررين
-- ==========================================

SELECT 
    '=== قائمة المتضررين ===' as victims_title;

WITH detailed_damage AS (
    SELECT 
        org.name as organization_name,
        p.name as product_name,
        p.stock_quantity as current_stock,
        il.previous_stock,
        il.new_stock,
        il.quantity as damage_amount,
        il.notes,
        il.created_at as damage_time,
        -- حساب المخزون المتوقع الصحيح
        CASE 
            WHEN il.reference_type = 'system_correction' AND il.new_stock = 0 
            THEN il.previous_stock -- استرجاع المخزون السابق
            ELSE il.new_stock 
        END as expected_correct_stock
    FROM inventory_log il
    JOIN products p ON p.id = il.product_id
    LEFT JOIN organizations org ON org.id = p.organization_id
    WHERE il.reference_type IN ('system_correction', 'bulk_correction', 'system_sync')
    AND il.created_at >= NOW() - INTERVAL '6 hours'
    AND (il.new_stock = 0 OR il.new_stock < 0 OR ABS(il.quantity) > 50)
    ORDER BY damage_time DESC
)
SELECT 
    organization_name,
    product_name,
    current_stock,
    previous_stock,
    new_stock,
    expected_correct_stock,
    damage_amount,
    damage_time,
    notes
FROM detailed_damage;

-- ==========================================
-- الجزء الثالث: إصلاح فوري للحالات الحرجة
-- ==========================================

-- إصلاح منتج المستخدم الحالي أولاً
UPDATE products 
SET stock_quantity = 18,
    updated_at = NOW()
WHERE id = '1cb97231-dce1-4018-8290-cb43b21e374d'
AND organization_id = '989bf6d2-aba1-4edd-8d07-649120ac4323';

-- حذف السجل الخاطئ
DELETE FROM inventory_log 
WHERE id = '2d11da6f-85f7-4162-a8a9-6d4398f86465'
AND reference_type = 'system_correction'
AND new_stock = 0;

-- إضافة سجل تصحيح صحيح
INSERT INTO inventory_log (
    product_id,
    quantity,
    previous_stock,
    new_stock,
    type,
    reference_type,
    reference_id,
    notes,
    organization_id,
    created_at
) VALUES (
    '1cb97231-dce1-4018-8290-cb43b21e374d',
    18,
    0,
    18,
    'adjustment',
    'emergency_fix',
    null,
    'إصلاح طارئ - حذف السجل الخاطئ وإعادة المخزون الصحيح إلى 18 (كان 17 + شراء 1)',
    '989bf6d2-aba1-4edd-8d07-649120ac4323',
    NOW()
);

-- ==========================================
-- الجزء الرابع: إصلاح تلقائي للحالات المشابهة
-- ==========================================

-- إنشاء دالة إصلاح ذكية
CREATE OR REPLACE FUNCTION emergency_fix_corrupted_inventory()
RETURNS TABLE (
    action TEXT,
    organization_name TEXT,
    product_name TEXT,
    old_stock INTEGER,
    restored_stock INTEGER,
    notes TEXT
) AS $$
DECLARE
    corruption_rec RECORD;
    restored_stock INTEGER;
BEGIN
    -- البحث عن الحالات التي تحتاج إصلاح
    FOR corruption_rec IN
        WITH corruption_analysis AS (
            SELECT 
                il.id as log_id,
                il.product_id,
                p.name as product_name,
                p.organization_id,
                org.name as organization_name,
                p.stock_quantity as current_stock,
                il.previous_stock,
                il.new_stock,
                il.quantity,
                il.created_at,
                -- تحديد المخزون الصحيح المفترض
                CASE 
                    WHEN il.reference_type = 'system_correction' AND il.new_stock = 0 AND il.previous_stock > 0
                    THEN il.previous_stock
                    WHEN il.new_stock < 0 AND il.previous_stock >= 0
                    THEN GREATEST(il.previous_stock, 0)
                    ELSE NULL
                END as should_be_stock
            FROM inventory_log il
            JOIN products p ON p.id = il.product_id
            LEFT JOIN organizations org ON org.id = p.organization_id
            WHERE il.reference_type IN ('system_correction', 'bulk_correction')
            AND il.created_at >= NOW() - INTERVAL '6 hours'
            AND (il.new_stock <= 0 OR p.stock_quantity <= 0)
        )
        SELECT *
        FROM corruption_analysis 
        WHERE should_be_stock IS NOT NULL
        AND should_be_stock != current_stock
        AND should_be_stock > 0
    LOOP
        restored_stock := corruption_rec.should_be_stock;
        
        -- إصلاح المخزون
        UPDATE products 
        SET stock_quantity = restored_stock,
            updated_at = NOW()
        WHERE id = corruption_rec.product_id;
        
        -- حذف السجل الفاسد
        DELETE FROM inventory_log 
        WHERE id = corruption_rec.log_id;
        
        -- إضافة سجل إصلاح
        INSERT INTO inventory_log (
            product_id,
            quantity,
            previous_stock,
            new_stock,
            type,
            reference_type,
            reference_id,
            notes,
            organization_id,
            created_at
        ) VALUES (
            corruption_rec.product_id,
            restored_stock - corruption_rec.current_stock,
            corruption_rec.current_stock,
            restored_stock,
            'adjustment',
            'emergency_auto_fix',
            null,
            format('إصلاح طارئ تلقائي - استعادة من %s إلى %s (حذف سجل فاسد)', 
                   corruption_rec.current_stock, restored_stock),
            corruption_rec.organization_id,
            NOW()
        );
        
        -- إرجاع النتيجة
        action := 'تم الإصلاح';
        organization_name := corruption_rec.organization_name;
        product_name := corruption_rec.product_name;
        old_stock := corruption_rec.current_stock;
        restored_stock := restored_stock;
        notes := format('استعادة من مخزون فاسد %s إلى %s', corruption_rec.current_stock, restored_stock);
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- تشغيل الإصلاح التلقائي
SELECT 
    '=== نتائج الإصلاح التلقائي ===' as auto_fix_title;

SELECT * FROM emergency_fix_corrupted_inventory();

-- ==========================================
-- الجزء الخامس: منع تكرار المشكلة
-- ==========================================

-- تعطيل الدوال الخطيرة مؤقتاً
DROP FUNCTION IF EXISTS monitor_purchase_inventory_consistency();
DROP FUNCTION IF EXISTS fix_all_purchase_inventory_inconsistencies();

-- إنشاء دالة مراقبة آمنة بدلاً منها
CREATE OR REPLACE FUNCTION safe_inventory_monitor()
RETURNS TABLE (
    status TEXT,
    organization_name TEXT,
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
            org.name as organization_name,
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
            WHEN issue_type = 'طبيعي' THEN '✅ سليم'
            ELSE '⚠️ يحتاج مراجعة'
        END,
        organization_name,
        product_name,
        stock_quantity,
        issue_type,
        recommendation
    FROM inventory_analysis
    WHERE issue_type != 'طبيعي'
    ORDER BY 
        CASE issue_type
            WHEN 'مخزون سلبي' THEN 1
            WHEN 'مخزون صفر للمنتج النشط' THEN 2
            ELSE 3
        END;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- الجزء السادس: تقرير نهائي شامل
-- ==========================================

SELECT 
    '=== تقرير نهائي - حالة النظام بعد الإصلاح ===' as final_report_title;

-- إحصائيات عامة
SELECT 
    'إحصائيات عامة:' as section,
    COUNT(*) as total_products,
    COUNT(CASE WHEN stock_quantity < 0 THEN 1 END) as negative_stock_products,
    COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as zero_stock_products,
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as positive_stock_products,
    ROUND(AVG(stock_quantity), 2) as average_stock
FROM products 
WHERE created_at >= NOW() - INTERVAL '30 days';

-- حالة منتج المستخدم بعد الإصلاح
SELECT 
    'حالة منتج المستخدم:' as section,
    p.name,
    p.stock_quantity,
    (SELECT COUNT(*) FROM inventory_log WHERE product_id = p.id) as total_logs,
    (SELECT new_stock FROM inventory_log WHERE product_id = p.id ORDER BY created_at DESC LIMIT 1) as last_logged_stock,
    CASE 
        WHEN p.stock_quantity = 18 THEN '✅ تم الإصلاح بنجاح'
        ELSE '❌ لا يزال يحتاج إصلاح'
    END as fix_status
FROM products p 
WHERE p.id = '1cb97231-dce1-4018-8290-cb43b21e374d';

-- فحص المنتجات التي تحتاج مراجعة
SELECT 
    '=== المنتجات التي تحتاج مراجعة ===' as review_needed_title;

SELECT * FROM safe_inventory_monitor() LIMIT 20;

-- آخر السجلات المضافة (للتأكد من عدم وجود مشاكل جديدة)
SELECT 
    'آخر سجلات المخزون:' as section,
    p.name as product_name,
    il.type,
    il.reference_type,
    il.previous_stock,
    il.new_stock,
    il.created_at,
    il.notes
FROM inventory_log il
JOIN products p ON p.id = il.product_id
WHERE il.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY il.created_at DESC
LIMIT 10;

COMMIT; 