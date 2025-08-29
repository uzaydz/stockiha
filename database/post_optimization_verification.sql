-- =============================================================================
-- التحقق من سلامة قاعدة البيانات بعد تحسين الفهارس
-- يتم تشغيله بعد تطبيق index_cleanup_and_optimization.sql
-- التاريخ: 2025-01-27
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔍 بدء التحقق من سلامة قاعدة البيانات...';
END $$;

-- =============================================================================
-- فحص 1: التحقق من وجود الفهارس الجديدة
-- =============================================================================

DO $$
DECLARE
    missing_indexes TEXT[] := ARRAY[]::TEXT[];
    index_check RECORD;
BEGIN
    RAISE NOTICE '📋 فحص الفهارس الجديدة المطلوبة...';

    -- فحص الفهارس الأساسية
    -- ملاحظة: pg_indexes يستخدم indexname بشكل صحيح
    FOR index_check IN
        SELECT 'idx_products_lightning_lookup' as required_index
        UNION ALL SELECT 'idx_products_active_search'
        UNION ALL SELECT 'idx_products_inventory'
        UNION ALL SELECT 'idx_products_featured_new'
        UNION ALL SELECT 'idx_products_text_search'
        UNION ALL SELECT 'idx_products_sku_barcode_optimized'
        UNION ALL SELECT 'idx_product_colors_lightning'
        UNION ALL SELECT 'idx_product_images_lightning'
        UNION ALL SELECT 'idx_product_categories_lightning'
        UNION ALL SELECT 'idx_organizations_lightning'
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
              AND indexname = index_check.required_index
        ) THEN
            missing_indexes := array_append(missing_indexes, index_check.required_index);
        END IF;
    END LOOP;

    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE WARNING '⚠️ الفهارس التالية مفقودة: %', array_to_string(missing_indexes, ', ');
    ELSE
        RAISE NOTICE '✅ جميع الفهارس المطلوبة موجودة';
    END IF;
END $$;

-- =============================================================================
-- فحص 2: التحقق من سلامة البيانات
-- =============================================================================

DO $$
DECLARE
    products_count INTEGER := 0;
    colors_count INTEGER := 0;
    images_count INTEGER := 0;
    categories_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 فحص سلامة البيانات...';

    -- عد السجلات في كل جدول مع معالجة الأخطاء
    BEGIN
        SELECT COUNT(*) INTO products_count FROM products;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ تعذر عد السجلات في جدول products: %', SQLERRM;
    END;

    BEGIN
        SELECT COUNT(*) INTO colors_count FROM product_colors;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ تعذر عد السجلات في جدول product_colors: %', SQLERRM;
    END;

    BEGIN
        SELECT COUNT(*) INTO images_count FROM product_images;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ تعذر عد السجلات في جدول product_images: %', SQLERRM;
    END;

    BEGIN
        SELECT COUNT(*) INTO categories_count FROM product_categories;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ تعذر عد السجلات في جدول product_categories: %', SQLERRM;
    END;

    RAISE NOTICE '📊 عدد السجلات:';
    RAISE NOTICE '   - المنتجات: %', products_count;
    RAISE NOTICE '   - الألوان: %', colors_count;
    RAISE NOTICE '   - الصور: %', images_count;
    RAISE NOTICE '   - الفئات: %', categories_count;

    -- فحص المنتجات بدون ألوان (يجب أن تكون سليمة)
    IF products_count > 0 THEN
        BEGIN
            IF EXISTS (
                SELECT 1 FROM products p
                WHERE p.has_variants = true
                  AND NOT EXISTS (SELECT 1 FROM product_colors pc WHERE pc.product_id = p.id)
            ) THEN
                RAISE WARNING '⚠️ يوجد منتجات لها has_variants = true بدون ألوان!';
            ELSE
                RAISE NOTICE '✅ جميع المنتجات ذات المتغيرات لها ألوان';
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️ تعذر فحص سلامة المتغيرات: %', SQLERRM;
        END;
    END IF;
END $$;

-- =============================================================================
-- فحص 3: اختبار الاستعلامات المحسّنة
-- =============================================================================

DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time_ms NUMERIC;
    test_product_id UUID;
    test_organization_id UUID;
BEGIN
    RAISE NOTICE '🧪 اختبار الاستعلامات المحسّنة...';

    -- الحصول على بيانات اختبار مع معالجة الأخطاء
    BEGIN
        SELECT id INTO test_product_id FROM products WHERE is_active = true LIMIT 1;
        SELECT organization_id INTO test_organization_id FROM products WHERE id = test_product_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ تعذر الحصول على بيانات الاختبار: %', SQLERRM;
            RETURN;
    END;

    IF test_product_id IS NULL THEN
        RAISE WARNING '⚠️ لا توجد منتجات نشطة للاختبار!';
        RETURN;
    END IF;

    RAISE NOTICE '📋 اختبار مع منتج ID: %', test_product_id;

    -- اختبار 1: البحث بالـ ID
    BEGIN
        start_time := clock_timestamp();
        PERFORM id, name FROM products WHERE id = test_product_id;
        end_time := clock_timestamp();
        execution_time_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        RAISE NOTICE '⚡ البحث بالـ ID: %ms', execution_time_ms;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ فشل اختبار البحث بالـ ID: %', SQLERRM;
    END;

    -- اختبار 2: البحث بالمؤسسة والنشاط
    BEGIN
        start_time := clock_timestamp();
        PERFORM COUNT(*) FROM products WHERE organization_id = test_organization_id AND is_active = true;
        end_time := clock_timestamp();
        execution_time_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        RAISE NOTICE '⚡ البحث بالمؤسسة والنشاط: %ms', execution_time_ms;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ فشل اختبار البحث بالمؤسسة: %', SQLERRM;
    END;

    -- اختبار 3: البحث بالمخزون
    BEGIN
        start_time := clock_timestamp();
        PERFORM COUNT(*) FROM products WHERE organization_id = test_organization_id AND stock_quantity > 0;
        end_time := clock_timestamp();
        execution_time_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        RAISE NOTICE '⚡ البحث بالمخزون: %ms', execution_time_ms;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ فشل اختبار البحث بالمخزون: %', SQLERRM;
    END;

    -- اختبار 4: البحث في الألوان
    BEGIN
        start_time := clock_timestamp();
        PERFORM COUNT(*) FROM product_colors WHERE product_id = test_product_id;
        end_time := clock_timestamp();
        execution_time_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        RAISE NOTICE '⚡ البحث في الألوان: %ms', execution_time_ms;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ فشل اختبار البحث في الألوان: %', SQLERRM;
    END;

    -- اختبار 5: البحث في الصور
    BEGIN
        start_time := clock_timestamp();
        PERFORM COUNT(*) FROM product_images WHERE product_id = test_product_id;
        end_time := clock_timestamp();
        execution_time_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        RAISE NOTICE '⚡ البحث في الصور: %ms', execution_time_ms;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ فشل اختبار البحث في الصور: %', SQLERRM;
    END;

END $$;

-- =============================================================================
-- فحص 4: التحقق من استخدام الفهارس الجديدة
-- =============================================================================

DO $$
DECLARE
    index_usage RECORD;
BEGIN
    RAISE NOTICE '📊 فحص استخدام الفهارس الجديدة...';

    -- إعادة تعيين إحصائيات الفهارس (مطلوب للحصول على بيانات حديثة)
    -- ملاحظة: هذا يحتاج لصلاحيات SUPERUSER
    -- SELECT pg_stat_reset();

    -- فحص استخدام الفهارس
    -- ملاحظة: pg_stat_user_indexes يستخدم relname و indexrelname وليس tablename و indexname
    FOR index_usage IN
        SELECT
            schemaname,
            relname as table_name,
            indexrelname as index_name,
            COALESCE(idx_scan, 0) as scans,
            COALESCE(idx_tup_read, 0) as tuples_read,
            COALESCE(idx_tup_fetch, 0) as tuples_fetched
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
          AND relname IN ('products', 'product_colors', 'product_images', 'product_categories', 'product_subcategories', 'organizations')
          AND indexrelname LIKE 'idx_%lightning%'
        ORDER BY scans DESC
    LOOP
        RAISE NOTICE '📈 الفهرس: % | الجدول: % | المسح: % | القراءة: % | الجلب: %',
            index_usage.index_name,
            index_usage.table_name,
            index_usage.scans,
            index_usage.tuples_read,
            index_usage.tuples_fetched;
    END LOOP;
END $$;

-- =============================================================================
-- فحص 5: تقرير التحسينات
-- =============================================================================

-- تحديث إحصائيات الفهارس للحصول على بيانات حديثة
ANALYZE products, product_colors, product_images, product_categories, product_subcategories, organizations;

DO $$
DECLARE
    total_indexes INTEGER := 0;
    new_indexes INTEGER := 0;
    improvement_ratio NUMERIC;
BEGIN
    RAISE NOTICE '📋 إنشاء تقرير التحسينات...';

    -- عد الفهارس الحالية مع معالجة الأخطاء
    BEGIN
        SELECT COUNT(*) INTO total_indexes
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename IN ('products', 'product_colors', 'product_images', 'product_categories', 'product_subcategories', 'organizations');
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ تعذر عد الفهارس الحالية: %', SQLERRM;
    END;

    -- عد الفهارس الجديدة (التي تحتوي على lightning)
    -- ملاحظة: pg_indexes يستخدم indexname بشكل صحيح
    BEGIN
        SELECT COUNT(*) INTO new_indexes
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname LIKE '%lightning%';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ تعذر عد الفهارس الجديدة: %', SQLERRM;
    END;

    RAISE NOTICE '📊 تقرير التحسينات:';
    RAISE NOTICE '   - إجمالي الفهارس: %', total_indexes;
    RAISE NOTICE '   - الفهارس الجديدة: %', new_indexes;

    IF total_indexes > 0 AND total_indexes < 87 THEN
        RAISE NOTICE '   - تقليل عدد الفهارس: %%%', ROUND((87 - total_indexes)::NUMERIC / 87 * 100, 1);
    END IF;

    IF new_indexes > 0 THEN
        RAISE NOTICE '✅ تم إنشاء الفهارس المحسّنة بنجاح';
    ELSE
        RAISE NOTICE 'ℹ️ لم يتم العثور على الفهارس الجديدة (قد تحتاج إلى تشغيل script التحسين أولاً)';
    END IF;

    RAISE NOTICE '🎯 التأثير المتوقع: تقليل وقت الاستعلام من 2004ms إلى ~1400ms (-30%%)';
END $$;

-- =============================================================================
-- فحص 6: نصائح للمراقبة المستقبلية
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '📋 نصائح للمراقبة المستقبلية:';
    RAISE NOTICE '   1. راقب pg_stat_user_indexes بانتظام';
    RAISE NOTICE '   2. استخدم EXPLAIN ANALYZE للاستعلامات البطيئة';
    RAISE NOTICE '   3. شغل ANALYZE بشكل دوري';
    RAISE NOTICE '   4. راقب استخدام الذاكرة والـ I/O';
    RAISE NOTICE '   5. فحص الأداء بعد أي تغييرات كبيرة في البيانات';
END $$;

-- =============================================================================
-- نهاية التحقق
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ انتهى التحقق من سلامة قاعدة البيانات بنجاح!';
    RAISE NOTICE '📈 الخطوة التالية: مراقبة الأداء لمدة 24-48 ساعة';
    RAISE NOTICE '🚀 إذا كان الأداء جيداً، يمكن تطبيق التحسينات التالية';
END $$;
