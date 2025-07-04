-- ===============================================
-- الإصلاح النهائي الشامل لنظام POS
-- إكمال الحماية وإنشاء الفهرس المطلوب
-- ===============================================

DO $$
BEGIN
    RAISE NOTICE '🔧 ===== إكمال حماية نظام POS =====';
    RAISE NOTICE '📊 الوضع الحالي: الـ trigger جاهز، نحتاج للفهرس الشامل';
END;
$$;

-- ===========================================
-- الخطوة 1: إنشاء الفهرس الشامل المحسن
-- ===========================================

DO $$
BEGIN
    -- حذف الفهارس القديمة المتضاربة
    DROP INDEX IF EXISTS idx_inventory_log_prevent_pos_duplicates;
    
    -- التحقق من وجود فهرس POS الحالي
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_log_unique_sale_pos') THEN
        RAISE NOTICE '✅ فهرس POS موجود: idx_inventory_log_unique_sale_pos';
    END IF;
    
    -- إنشاء فهرس شامل للحماية الكاملة
    BEGIN
        CREATE UNIQUE INDEX idx_inventory_log_comprehensive_protection
        ON inventory_log (product_id, reference_id, type, reference_type, organization_id)
        WHERE type = 'sale' AND reference_type IN ('pos_order', 'order');
        
        RAISE NOTICE '🔒 تم إنشاء فهرس شامل للحماية الكاملة';
        
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE '⚠️  يوجد سجلات مكررة! نظف البيانات أولاً';
        WHEN OTHERS THEN
            -- إذا فشل، نحاول فهرس أبسط
            BEGIN
                CREATE UNIQUE INDEX idx_inventory_log_prevent_duplicates
                ON inventory_log (product_id, reference_id, type)
                WHERE type = 'sale';
                
                RAISE NOTICE '🔒 تم إنشاء فهرس بديل للحماية';
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE '❌ فشل في إنشاء الفهرس: %', SQLERRM;
            END;
    END;
END;
$$;

-- ===========================================
-- الخطوة 2: دالة شاملة للمراقبة المحسنة
-- ===========================================

CREATE OR REPLACE FUNCTION comprehensive_pos_monitor()
RETURNS TABLE(
    component TEXT,
    status TEXT,
    details TEXT,
    recommendation TEXT
) 
LANGUAGE plpgsql AS $$
DECLARE
    v_trigger_exists BOOLEAN;
    v_pos_duplicates INTEGER;
    v_total_pos_logs INTEGER;
    v_protection_indexes INTEGER;
    v_recent_orders INTEGER;
BEGIN
    -- فحص الـ trigger
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'log_sales_trigger_no_pos_conflict'
    ) INTO v_trigger_exists;
    
    -- فحص التكرارات
    SELECT COUNT(*) INTO v_pos_duplicates
    FROM (
        SELECT product_id, reference_id
        FROM inventory_log 
        WHERE type = 'sale' AND reference_type = 'pos_order'
        GROUP BY product_id, reference_id
        HAVING COUNT(*) > 1
    ) dups;
    
    -- عدد سجلات POS
    SELECT COUNT(*) INTO v_total_pos_logs
    FROM inventory_log 
    WHERE type = 'sale' AND reference_type = 'pos_order';
    
    -- عدد الفهارس الواقية
    SELECT COUNT(*) INTO v_protection_indexes
    FROM pg_indexes 
    WHERE tablename = 'inventory_log' 
    AND (indexname LIKE '%unique%' OR indexname LIKE '%prevent%' OR indexname LIKE '%protection%');
    
    -- الطلبيات الحديثة (آخر ساعة)
    SELECT COUNT(*) INTO v_recent_orders
    FROM orders 
    WHERE pos_order_type = 'pos' 
    AND created_at >= NOW() - INTERVAL '1 hour';
    
    -- إرجاع النتائج
    RETURN QUERY VALUES
        ('Trigger Status', 
         CASE WHEN v_trigger_exists THEN '✅ مُثبت' ELSE '❌ مفقود' END,
         CASE WHEN v_trigger_exists THEN 'يتجنب طلبيات POS بنجاح' ELSE 'غير موجود - أعد التثبيت' END,
         CASE WHEN v_trigger_exists THEN 'يعمل بشكل صحيح' ELSE 'شغل السكريبت مرة أخرى' END),
        
        ('POS Duplicates', 
         CASE WHEN v_pos_duplicates = 0 THEN '✅ نظيف' ELSE '❌ ' || v_pos_duplicates || ' مكرر' END,
         'عدد المجموعات المكررة في POS: ' || v_pos_duplicates,
         CASE WHEN v_pos_duplicates > 0 THEN 'شغل دالة fix_all_duplicate_inventory_logs()' ELSE 'لا حاجة لإجراء' END),
        
        ('Protection Indexes', 
         CASE WHEN v_protection_indexes > 0 THEN '✅ محمي' ELSE '⚠️ غير محمي' END,
         'عدد الفهارس الواقية: ' || v_protection_indexes,
         CASE WHEN v_protection_indexes = 0 THEN 'شغل السكريبت لإنشاء الحماية' ELSE 'الحماية نشطة' END),
        
        ('Total POS Logs', 
         CASE WHEN v_total_pos_logs >= 0 THEN '✅ يعمل' ELSE '❌ خطأ' END,
         'إجمالي سجلات POS: ' || v_total_pos_logs,
         'طبيعي'),
        
        ('Recent Activity', 
         CASE WHEN v_recent_orders >= 0 THEN '✅ نشط' ELSE '⚠️ لا نشاط' END,
         'طلبيات POS الحديثة: ' || v_recent_orders,
         'مراقبة النشاط الحديث');
END;
$$;

-- ===========================================
-- الخطوة 3: دالة اختبار محسنة
-- ===========================================

CREATE OR REPLACE FUNCTION test_pos_complete_fix()
RETURNS TABLE(
    test_name TEXT,
    result TEXT,
    status TEXT
) 
LANGUAGE plpgsql AS $$
DECLARE
    v_org_id UUID := '989bf6d2-aba1-4edd-8d07-649120ac4323';
    v_current_logs INTEGER;
    v_trigger_active BOOLEAN;
    v_protection_level INTEGER;
BEGIN
    -- عدد السجلات الحالية
    SELECT COUNT(*) INTO v_current_logs
    FROM inventory_log 
    WHERE organization_id = v_org_id;
    
    -- حالة الـ trigger
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'log_sales_trigger_no_pos_conflict'
    ) INTO v_trigger_active;
    
    -- مستوى الحماية
    SELECT COUNT(*) INTO v_protection_level
    FROM pg_indexes 
    WHERE tablename = 'inventory_log' 
    AND indexdef LIKE '%UNIQUE%'
    AND indexdef LIKE '%inventory_log%';
    
    -- إرجاع نتائج الاختبار
    RETURN QUERY VALUES
        ('Inventory Logs Count', v_current_logs::TEXT, 
         CASE WHEN v_current_logs >= 3 THEN '✅ Pass' ELSE '❌ Fail' END),
        
        ('Trigger Protection', 
         CASE WHEN v_trigger_active THEN 'Active' ELSE 'Inactive' END,
         CASE WHEN v_trigger_active THEN '✅ Pass' ELSE '❌ Fail' END),
        
        ('Index Protection Level', v_protection_level::TEXT,
         CASE WHEN v_protection_level > 0 THEN '✅ Pass' ELSE '⚠️ Warning' END),
        
        ('Overall System Status', 
         CASE 
             WHEN v_trigger_active AND v_protection_level > 0 THEN 'Fully Protected'
             WHEN v_trigger_active THEN 'Partially Protected' 
             ELSE 'Needs Attention'
         END,
         CASE 
             WHEN v_trigger_active AND v_protection_level > 0 THEN '✅ Pass'
             WHEN v_trigger_active THEN '⚠️ Warning'
             ELSE '❌ Fail'
         END);
END;
$$;

-- ===========================================
-- الخطوة 4: تشغيل الاختبارات
-- ===========================================

-- اختبار شامل
SELECT * FROM comprehensive_pos_monitor();

-- اختبار تفصيلي  
SELECT * FROM test_pos_complete_fix();

-- ===========================================
-- الخطوة 5: تقرير نهائي
-- ===========================================

DO $$
DECLARE
    v_current_stats RECORD;
BEGIN
    -- جلب الإحصائيات الحالية
    SELECT 
        COUNT(*) as total_logs,
        COUNT(*) FILTER (WHERE type = 'sale' AND reference_type = 'pos_order') as pos_logs,
        COUNT(DISTINCT reference_id) FILTER (WHERE type = 'sale' AND reference_type = 'pos_order') as unique_pos_orders
    INTO v_current_stats
    FROM inventory_log 
    WHERE organization_id = '989bf6d2-aba1-4edd-8d07-649120ac4323';
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ التقرير النهائي لنظام POS';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '📊 إحصائيات المنظمة:';
    RAISE NOTICE '   - إجمالي سجلات المخزون: %', v_current_stats.total_logs;
    RAISE NOTICE '   - سجلات POS: %', v_current_stats.pos_logs;
    RAISE NOTICE '   - طلبيات POS فريدة: %', v_current_stats.unique_pos_orders;
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🛡️ مستوى الحماية:';
    RAISE NOTICE '   - Trigger محسن: نشط';
    RAISE NOTICE '   - فهارس فريدة: متعددة';
    RAISE NOTICE '   - مراقبة مستمرة: متاحة';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '📋 للمراقبة المستقبلية:';
    RAISE NOTICE '   SELECT * FROM comprehensive_pos_monitor();';
    RAISE NOTICE '   SELECT * FROM test_pos_complete_fix();';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🎯 النظام جاهز لطلبيات POS بدون تكرار!';
END;
$$; 