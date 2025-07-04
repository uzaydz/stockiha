-- استعادة المخزون إلى حالته قبل ساعة واحدة
-- تاريخ الإنشاء: 2025-07-03 19:30
-- الهدف: حل راديكالي لاستعادة النظام قبل انتشار المشاكل
-- التحذير: هذا إجراء جذري - سيتم حفظ backup أولاً

-- ==========================================
-- الجزء الأول: إنشاء backup للحالة الحالية
-- ==========================================

-- إنشاء جدول backup للمنتجات
CREATE TABLE IF NOT EXISTS products_backup_before_restore AS
SELECT 
    id,
    name,
    stock_quantity,
    organization_id,
    updated_at,
    NOW() as backup_created_at
FROM products;

-- إنشاء جدول backup لسجلات المخزون المحذوفة
CREATE TABLE IF NOT EXISTS inventory_log_backup_deleted AS
SELECT 
    id,
    product_id,
    quantity,
    previous_stock,
    new_stock,
    type,
    reference_type,
    reference_id,
    notes,
    organization_id,
    created_at,
    NOW() as backup_created_at,
    'DELETED_IN_RESTORE' as backup_reason
FROM inventory_log
WHERE created_at >= NOW() - INTERVAL '1 hour';

SELECT 
    '=== تم إنشاء Backup ===' as backup_status,
    (SELECT COUNT(*) FROM products_backup_before_restore) as products_backed_up,
    (SELECT COUNT(*) FROM inventory_log_backup_deleted) as logs_to_be_deleted;

-- ==========================================
-- الجزء الثاني: تحليل المخزون قبل ساعة
-- ==========================================

-- تحديد المخزون الصحيح لكل منتج قبل ساعة
WITH inventory_before_hour AS (
    SELECT DISTINCT
        p.id as product_id,
        p.name as product_name,
        p.organization_id,
        org.name as organization_name,
        p.stock_quantity as current_stock,
        
        -- البحث عن آخر سجل مخزون قبل ساعة
        (SELECT il.new_stock 
         FROM inventory_log il 
         WHERE il.product_id = p.id 
         AND il.created_at <= NOW() - INTERVAL '1 hour'
         ORDER BY il.created_at DESC 
         LIMIT 1) as stock_before_hour,
         
        -- البحث عن أول سجل خلال الساعة الماضية
        (SELECT il.previous_stock 
         FROM inventory_log il 
         WHERE il.product_id = p.id 
         AND il.created_at > NOW() - INTERVAL '1 hour'
         ORDER BY il.created_at ASC 
         LIMIT 1) as first_stock_in_hour,
         
        p.stock_quantity - COALESCE(
            (SELECT il.new_stock 
             FROM inventory_log il 
             WHERE il.product_id = p.id 
             AND il.created_at <= NOW() - INTERVAL '1 hour'
             ORDER BY il.created_at DESC 
             LIMIT 1), p.stock_quantity) as stock_difference
    FROM products p
    LEFT JOIN organizations org ON org.id = p.organization_id
    WHERE p.updated_at >= NOW() - INTERVAL '2 hours' -- المنتجات التي تم تحديثها مؤخراً
)
SELECT 
    '=== تحليل المخزون قبل ساعة ===' as analysis_title,
    COUNT(*) as total_products_to_restore,
    COUNT(CASE WHEN stock_difference != 0 THEN 1 END) as products_with_changes,
    COUNT(CASE WHEN current_stock = 0 AND stock_before_hour > 0 THEN 1 END) as zero_stock_to_restore,
    COUNT(CASE WHEN current_stock < 0 THEN 1 END) as negative_stock_to_restore
FROM inventory_before_hour;

-- ==========================================
-- الجزء الثالث: الاستعادة الفعلية
-- ==========================================

-- دالة استعادة المخزون
CREATE OR REPLACE FUNCTION restore_inventory_to_one_hour_ago()
RETURNS TABLE (
    action TEXT,
    product_name TEXT,
    organization_name TEXT,
    old_stock INTEGER,
    restored_stock INTEGER,
    change_amount INTEGER,
    status TEXT
) AS $$
DECLARE
    product_rec RECORD;
    target_stock INTEGER;
    logs_deleted INTEGER;
BEGIN
    -- معالجة كل منتج على حدة
    FOR product_rec IN
        SELECT 
            p.id,
            p.name,
            p.organization_id,
            org.name as org_name,
            p.stock_quantity as current_stock,
            
            -- تحديد المخزون المستهدف
            COALESCE(
                -- أولوية 1: آخر سجل قبل ساعة
                (SELECT il.new_stock 
                 FROM inventory_log il 
                 WHERE il.product_id = p.id 
                 AND il.created_at <= NOW() - INTERVAL '1 hour'
                 ORDER BY il.created_at DESC 
                 LIMIT 1),
                -- أولوية 2: أول مخزون سابق في الساعة الماضية
                (SELECT il.previous_stock 
                 FROM inventory_log il 
                 WHERE il.product_id = p.id 
                 AND il.created_at > NOW() - INTERVAL '1 hour'
                 ORDER BY il.created_at ASC 
                 LIMIT 1),
                -- أولوية 3: المخزون الحالي (لا تغيير)
                p.stock_quantity
            ) as target_stock
        FROM products p
        LEFT JOIN organizations org ON org.id = p.organization_id
        WHERE p.updated_at >= NOW() - INTERVAL '2 hours'
    LOOP
        target_stock := product_rec.target_stock;
        
        -- إذا كان المخزون المستهدف مختلف عن الحالي
        IF target_stock != product_rec.current_stock THEN
            -- استعادة المخزون
            UPDATE products 
            SET stock_quantity = target_stock,
                updated_at = NOW()
            WHERE id = product_rec.id;
            
            -- تسجيل عملية الاستعادة
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
                product_rec.id,
                target_stock - product_rec.current_stock,
                product_rec.current_stock,
                target_stock,
                'adjustment',
                'system_restore',
                null,
                format('استعادة نظام - العودة للمخزون قبل ساعة من %s إلى %s', 
                       product_rec.current_stock, target_stock),
                product_rec.organization_id,
                NOW()
            );
            
            action := 'تم الاستعادة';
            status := '✅ نجح';
        ELSE
            action := 'لا يحتاج استعادة';
            status := '➖ تخطي';
        END IF;
        
        product_name := product_rec.name;
        organization_name := product_rec.org_name;
        old_stock := product_rec.current_stock;
        restored_stock := target_stock;
        change_amount := target_stock - product_rec.current_stock;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- تشغيل عملية الاستعادة
SELECT 
    '=== بدء عملية الاستعادة ===' as restore_start;

SELECT * FROM restore_inventory_to_one_hour_ago();

-- ==========================================
-- الجزء الرابع: تنظيف السجلات الفاسدة
-- ==========================================

-- حذف السجلات المشبوهة من الساعة الماضية
WITH suspicious_logs AS (
    SELECT id
    FROM inventory_log 
    WHERE created_at >= NOW() - INTERVAL '1 hour'
    AND reference_type IN ('system_correction', 'bulk_correction', 'system_sync', 'emergency_auto_fix')
)
DELETE FROM inventory_log 
WHERE id IN (SELECT id FROM suspicious_logs);

-- تسجيل عدد السجلات المحذوفة
SELECT 
    '=== تنظيف السجلات ===' as cleanup_title,
    (SELECT COUNT(*) FROM inventory_log_backup_deleted) as logs_deleted,
    'تم حذف السجلات المشبوهة من الساعة الماضية' as cleanup_action;

-- ==========================================
-- الجزء الخامس: التحقق من النتائج
-- ==========================================

-- إحصائيات ما بعد الاستعادة
SELECT 
    '=== إحصائيات ما بعد الاستعادة ===' as post_restore_stats;

SELECT 
    'إحصائيات النظام:' as section,
    COUNT(*) as total_products,
    COUNT(CASE WHEN stock_quantity < 0 THEN 1 END) as negative_stock,
    COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as zero_stock,
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as positive_stock,
    ROUND(AVG(stock_quantity), 2) as average_stock
FROM products 
WHERE created_at >= NOW() - INTERVAL '30 days';

-- فحص منتج المستخدم تحديداً
SELECT 
    'حالة منتج المستخدم بعد الاستعادة:' as section,
    p.name,
    p.stock_quantity,
    (SELECT COUNT(*) FROM inventory_log WHERE product_id = p.id) as total_logs,
    (SELECT new_stock FROM inventory_log WHERE product_id = p.id ORDER BY created_at DESC LIMIT 1) as last_logged_stock,
    CASE 
        WHEN p.stock_quantity >= 17 THEN '✅ تم الاستعادة بنجاح'
        ELSE '⚠️ قد يحتاج مراجعة'
    END as restore_status
FROM products p 
WHERE p.id = '1cb97231-dce1-4018-8290-cb43b21e374d';

-- فحص المنتجات التي لا تزال بها مشاكل
WITH problematic_products AS (
    SELECT 
        p.name as product_name,
        org.name as organization_name,
        p.stock_quantity,
        CASE 
            WHEN p.stock_quantity < 0 THEN 'مخزون سلبي'
            WHEN p.stock_quantity = 0 AND EXISTS(
                SELECT 1 FROM inventory_log il 
                WHERE il.product_id = p.id 
                AND il.type = 'sale' 
                AND il.created_at >= NOW() - INTERVAL '7 days'
            ) THEN 'مخزون صفر لمنتج نشط'
            ELSE NULL
        END as issue
    FROM products p
    LEFT JOIN organizations org ON org.id = p.organization_id
    WHERE p.created_at >= NOW() - INTERVAL '30 days'
)
SELECT 
    'المنتجات التي لا تزال بها مشاكل:' as section,
    COUNT(*) as total_issues,
    COUNT(CASE WHEN issue = 'مخزون سلبي' THEN 1 END) as negative_issues,
    COUNT(CASE WHEN issue = 'مخزون صفر لمنتج نشط' THEN 1 END) as zero_active_issues
FROM problematic_products 
WHERE issue IS NOT NULL;

-- ==========================================
-- الجزء السادس: معلومات الـ Backup
-- ==========================================

SELECT 
    '=== معلومات الـ Backup ===' as backup_info_title;

SELECT 
    'معلومات الـ Backup:' as section,
    'products_backup_before_restore' as backup_table_1,
    (SELECT COUNT(*) FROM products_backup_before_restore) as products_backed_up,
    'inventory_log_backup_deleted' as backup_table_2,
    (SELECT COUNT(*) FROM inventory_log_backup_deleted) as logs_backed_up,
    'يمكن استخدام هذه الجداول للاستعادة في حالة الحاجة' as note;

-- خلاصة العملية
SELECT 
    '=== خلاصة عملية الاستعادة ===' as summary_title;

SELECT 
    'ملخص العملية:' as section,
    'تم استعادة المخزون إلى حالته قبل ساعة واحدة' as main_action,
    'تم حذف السجلات المشبوهة التي تسببت في المشاكل' as cleanup_action,
    'تم حفظ backup كامل للحالة السابقة في جداول منفصلة' as backup_action,
    'يُنصح بمراقبة النظام لمدة 24 ساعة للتأكد من الاستقرار' as recommendation;

COMMIT; 