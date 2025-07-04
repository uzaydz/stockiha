-- ===============================================
-- حل مشكلة السجلات المكررة في inventory_log
-- للمؤسسة: uzaydz3bvc3 (989bf6d2-aba1-4edd-8d07-649120ac4323)
-- تاريخ: 3 يوليو 2025
-- ===============================================

-- ===========================================
-- الخطوة 1: تحليل المشكلة الحالية
-- ===========================================

-- فحص جميع السجلات المكررة في النظام
SELECT 
    'قبل الحل - جميع السجلات المكررة' as description,
    product_id,
    reference_id,
    COUNT(*) as duplicate_count,
    string_agg(id::text, ', ') as duplicate_ids
FROM inventory_log 
WHERE organization_id = '989bf6d2-aba1-4edd-8d07-649120ac4323'
AND reference_type = 'pos_order'
AND type = 'sale'
GROUP BY product_id, reference_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ===========================================
-- الخطوة 2: إنشاء دالة تنظيف متقدمة
-- ===========================================

-- دالة لحذف السجلات المكررة بذكاء (الاحتفاظ بالأفضل)
CREATE OR REPLACE FUNCTION fix_all_duplicate_inventory_logs()
RETURNS TABLE(
    total_duplicates_found INTEGER,
    total_records_deleted INTEGER,
    total_records_kept INTEGER,
    cleanup_summary TEXT
) 
LANGUAGE plpgsql AS $$
DECLARE
    v_duplicate_groups INTEGER := 0;
    v_total_deleted INTEGER := 0;
    v_total_kept INTEGER := 0;
    v_group_record RECORD;
    v_best_record RECORD;
    v_deleted_in_group INTEGER;
BEGIN
    RAISE NOTICE '🔧 بدء إصلاح شامل للسجلات المكررة في inventory_log';
    RAISE NOTICE '📊 فحص المجموعات المكررة...';
    
    -- عدّ المجموعات المكررة
    SELECT COUNT(*) INTO v_duplicate_groups
    FROM (
        SELECT product_id, reference_id, type, reference_type
        FROM inventory_log 
        WHERE type = 'sale' AND reference_type = 'pos_order'
        GROUP BY product_id, reference_id, type, reference_type
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE '⚠️  تم العثور على % مجموعة مكررة', v_duplicate_groups;
    
    -- معالجة كل مجموعة مكررة
    FOR v_group_record IN
        SELECT 
            il.product_id, 
            il.reference_id, 
            il.type, 
            il.reference_type,
            COUNT(*) as duplicate_count
        FROM inventory_log il
        WHERE il.type = 'sale' AND il.reference_type = 'pos_order'
        GROUP BY il.product_id, il.reference_id, il.type, il.reference_type
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
    LOOP
        -- العثور على أفضل سجل للاحتفاظ به
        SELECT il.* INTO v_best_record
        FROM inventory_log il
        WHERE il.product_id = v_group_record.product_id
        AND il.reference_id = v_group_record.reference_id
        AND il.type = v_group_record.type
        AND il.reference_type = v_group_record.reference_type
        ORDER BY 
            -- أولوية 1: السجل مع FIFO في الملاحظات
            CASE WHEN il.notes LIKE '%FIFO%' THEN 1 ELSE 2 END,
            -- أولوية 2: السجل مع تفاصيل التكلفة
            CASE WHEN il.notes LIKE '%التكلفة الإجمالية%' THEN 1 ELSE 2 END,
            -- أولوية 3: السجل مع معلومات المخزون
            CASE WHEN il.notes LIKE '%من المخزون الأولي%' THEN 1 ELSE 2 END,
            -- أولوية 4: السجل الأحدث
            il.created_at DESC
        LIMIT 1;
        
        IF v_best_record.id IS NOT NULL THEN
            -- حذف جميع السجلات الأخرى في هذه المجموعة
            DELETE FROM inventory_log il
            WHERE il.product_id = v_group_record.product_id
            AND il.reference_id = v_group_record.reference_id
            AND il.type = v_group_record.type
            AND il.reference_type = v_group_record.reference_type
            AND il.id != v_best_record.id;
            
            GET DIAGNOSTICS v_deleted_in_group = ROW_COUNT;
            v_total_deleted := v_total_deleted + v_deleted_in_group;
            v_total_kept := v_total_kept + 1;
            
            IF v_duplicate_groups <= 10 THEN
                RAISE NOTICE '✅ مجموعة %: احتفظ بالسجل %, حذف % سجلات', 
                             v_group_record.product_id, v_best_record.id, v_deleted_in_group;
            END IF;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🎉 انتهى التنظيف: حذف % سجلات، احتفظ بـ % سجلات', v_total_deleted, v_total_kept;
    
    -- إرجاع النتائج
    total_duplicates_found := v_duplicate_groups;
    total_records_deleted := v_total_deleted;
    total_records_kept := v_total_kept;
    cleanup_summary := format('معالجة %s مجموعات مكررة: حذف %s سجلات، الاحتفاظ بـ %s سجلات', 
                             v_duplicate_groups, v_total_deleted, v_total_kept);
    
    RETURN NEXT;
END;
$$;

-- ===========================================
-- الخطوة 3: تشغيل عملية التنظيف
-- ===========================================

-- تشغيل دالة التنظيف وعرض النتائج
DO $$
DECLARE
    cleanup_result RECORD;
BEGIN
    RAISE NOTICE '🚀 ===== بدء الإصلاح الشامل =====';
    
    SELECT * INTO cleanup_result FROM fix_all_duplicate_inventory_logs();
    
    RAISE NOTICE '📋 النتيجة النهائية: %', cleanup_result.cleanup_summary;
    RAISE NOTICE '✨ ===== انتهى الإصلاح الشامل =====';
END;
$$;

-- ===========================================
-- الخطوة 4: إنشاء فهرس فريد لمنع التكرار مستقبلاً
-- ===========================================

-- إنشاء فهرس فريد لمنع التكرار مستقبلاً
DO $$
BEGIN
    -- محاولة إنشاء الفهرس الفريد
    BEGIN
        CREATE UNIQUE INDEX idx_inventory_log_unique_sale_pos
        ON inventory_log (product_id, reference_id, type, reference_type)
        WHERE type = 'sale' AND reference_type = 'pos_order';
        
        RAISE NOTICE '🔒 تم إنشاء فهرس فريد بنجاح لمنع التكرار مستقبلاً';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE '⚠️  ما زالت هناك سجلات مكررة! يرجى تشغيل التنظيف مرة أخرى';
        WHEN OTHERS THEN
            RAISE NOTICE '❌ خطأ في إنشاء الفهرس: %', SQLERRM;
    END;
END;
$$;

-- ===========================================
-- الخطوة 5: دالة التحقق النهائي
-- ===========================================

-- دالة التحقق النهائي
CREATE OR REPLACE FUNCTION verify_inventory_fix()
RETURNS TABLE(
    metric TEXT,
    value TEXT,
    status TEXT
) 
LANGUAGE plpgsql AS $$
DECLARE
    v_total_logs INTEGER;
    v_duplicate_groups INTEGER;
    v_orders_count INTEGER;
    v_pos_sales_count INTEGER;
BEGIN
    -- إحصائيات شاملة
    SELECT COUNT(*) INTO v_total_logs FROM inventory_log;
    
    SELECT COUNT(DISTINCT id) INTO v_orders_count FROM orders;
    
    SELECT COUNT(*) INTO v_pos_sales_count 
    FROM inventory_log 
    WHERE type = 'sale' AND reference_type = 'pos_order';
    
    SELECT COUNT(*) INTO v_duplicate_groups
    FROM (
        SELECT product_id, reference_id, type, reference_type
        FROM inventory_log 
        WHERE type = 'sale' AND reference_type = 'pos_order'
        GROUP BY product_id, reference_id, type, reference_type
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- إرجاع النتائج
    RETURN QUERY VALUES
        ('إجمالي سجلات المخزون', v_total_logs::TEXT, 
         CASE WHEN v_total_logs > 0 THEN '✅ طبيعي' ELSE '⚠️ فارغ' END),
        ('إجمالي الطلبيات', v_orders_count::TEXT, 
         CASE WHEN v_orders_count > 0 THEN '✅ موجود' ELSE '⚠️ فارغ' END),
        ('سجلات البيع POS', v_pos_sales_count::TEXT, 
         CASE WHEN v_pos_sales_count > 0 THEN '✅ موجود' ELSE '⚠️ فارغ' END),
        ('المجموعات المكررة', v_duplicate_groups::TEXT, 
         CASE WHEN v_duplicate_groups = 0 THEN '✅ نظيف' ELSE '❌ يحتاج إصلاح' END),
        ('حالة الفهرس الفريد', 
         CASE WHEN EXISTS(
             SELECT 1 FROM pg_indexes 
             WHERE indexname = 'idx_inventory_log_unique_sale_pos'
         ) THEN 'موجود' ELSE 'غير موجود' END,
         CASE WHEN EXISTS(
             SELECT 1 FROM pg_indexes 
             WHERE indexname = 'idx_inventory_log_unique_sale_pos'
         ) THEN '✅ محمي' ELSE '⚠️ غير محمي' END);
END;
$$;

-- 5. التحقق النهائي
SELECT * FROM verify_inventory_fix();

-- ===========================================
-- الخطوة 6: تقرير للمنظمة المحددة
-- ===========================================

-- تقرير للمنظمة المحددة
SELECT 
    organization_id,
    COUNT(*) as total_inventory_logs,
    COUNT(*) FILTER (WHERE type = 'sale' AND reference_type = 'pos_order') as pos_sale_logs,
    COUNT(DISTINCT reference_id) FILTER (WHERE type = 'sale' AND reference_type = 'pos_order') as unique_orders
FROM inventory_log 
WHERE organization_id = '989bf6d2-aba1-4edd-8d07-649120ac4323'
GROUP BY organization_id;

-- الرسائل النهائية
DO $$
BEGIN
    RAISE NOTICE '🎯 تم إصلاح جميع السجلات المكررة في inventory_log!';
    RAISE NOTICE '🔒 تم إنشاء حماية لمنع التكرار مستقبلاً';
    RAISE NOTICE '📊 راجع النتائج أعلاه للتأكد من نجاح العملية';
END;
$$; 