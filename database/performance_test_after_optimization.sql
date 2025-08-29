-- =============================================================================
-- اختبار الأداء بعد تطبيق التحسينات
-- Performance Test After Optimization
-- =============================================================================

DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time INTERVAL;
    query_result RECORD;
    total_products INTEGER;
BEGIN
    RAISE NOTICE '🚀 بدء اختبار الأداء بعد التحسينات...';

    -- فحص عدد المنتجات
    SELECT COUNT(*) INTO total_products FROM products WHERE is_active = true;
    RAISE NOTICE '📊 إجمالي المنتجات النشطة: %', total_products;

    -- اختبار 1: البحث السريع للمنتجات
    RAISE NOTICE '📈 اختبار 1: البحث السريع للمنتجات...';
    start_time := clock_timestamp();

    FOR i IN 1..5 LOOP
        -- محاكاة استعلام البحث السريع
        SELECT p.id, p.name, p.price, p.stock_quantity, p.thumbnail_image
        INTO query_result
        FROM products p
        WHERE p.organization_id = '560e2c06-d13c-4853-abcf-d41f017469cf'
          AND p.is_active = true
          AND p.slug = 'burkini-sotra'
        LIMIT 1;
    END LOOP;

    end_time := clock_timestamp();
    execution_time := end_time - start_time;
    RAISE NOTICE '   ⏱️ وقت الاستعلام: % ms', EXTRACT(millisecond FROM execution_time)/5;

    -- اختبار 2: البحث في الألوان
    RAISE NOTICE '📈 اختبار 2: البحث في الألوان...';
    start_time := clock_timestamp();

    FOR i IN 1..5 LOOP
        SELECT COUNT(*)
        INTO total_products
        FROM product_colors pc
        JOIN products p ON pc.product_id = p.id
        WHERE p.organization_id = '560e2c06-d13c-4853-abcf-d41f017469cf'
          AND p.is_active = true;
    END LOOP;

    end_time := clock_timestamp();
    execution_time := end_time - start_time;
    RAISE NOTICE '   ⏱️ وقت الاستعلام: % ms', EXTRACT(millisecond FROM execution_time)/5;

    -- اختبار 3: البحث في الصور
    RAISE NOTICE '📈 اختبار 3: البحث في الصور...';
    start_time := clock_timestamp();

    FOR i IN 1..5 LOOP
        SELECT COUNT(*)
        INTO total_products
        FROM product_images pi
        JOIN products p ON pi.product_id = p.id
        WHERE p.organization_id = '560e2c06-d13c-4853-abcf-d41f017469cf'
          AND p.is_active = true;
    END LOOP;

    end_time := clock_timestamp();
    execution_time := end_time - start_time;
    RAISE NOTICE '   ⏱️ وقت الاستعلام: % ms', EXTRACT(millisecond FROM execution_time)/5;

    -- فحص استخدام الفهارس الجديدة
    RAISE NOTICE '🔍 فحص استخدام الفهارس الجديدة...';

    -- فحص فهرس البحث السريع
    SELECT schemaname, relname, indexrelname,
           COALESCE(idx_scan, 0) as scans,
           COALESCE(idx_tup_read, 0) as tuples_read,
           COALESCE(idx_tup_fetch, 0) as tuples_fetched
    INTO query_result
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND relname = 'products'
      AND indexrelname = 'idx_products_lightning_lookup';

    RAISE NOTICE '   📊 فهرس البحث السريع: % مسح, % قراءة, % جلب',
        query_result.scans, query_result.tuples_read, query_result.tuples_fetched;

    -- فحص فهرس الألوان
    SELECT schemaname, relname, indexrelname,
           COALESCE(idx_scan, 0) as scans,
           COALESCE(idx_tup_read, 0) as tuples_read,
           COALESCE(idx_tup_fetch, 0) as tuples_fetched
    INTO query_result
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND relname = 'product_colors'
      AND indexrelname = 'idx_product_colors_lightning';

    RAISE NOTICE '   📊 فهرس الألوان: % مسح, % قراءة, % جلب',
        query_result.scans, query_result.tuples_read, query_result.tuples_fetched;

    -- فحص فهرس الصور
    SELECT schemaname, relname, indexrelname,
           COALESCE(idx_scan, 0) as scans,
           COALESCE(idx_tup_read, 0) as tuples_read,
           COALESCE(idx_tup_fetch, 0) as tuples_fetched
    INTO query_result
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND relname = 'product_images'
      AND indexrelname = 'idx_product_images_lightning';

    RAISE NOTICE '   📊 فهرس الصور: % مسح, % قراءة, % جلب',
        query_result.scans, query_result.tuples_read, query_result.tuples_fetched;

    RAISE NOTICE '✅ تم الانتهاء من اختبار الأداء!';

END $$;
