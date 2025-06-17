-- =============================================================================
-- تحسينات الأداء الفائق لقاعدة بيانات المتجر
-- Ultra Performance Optimization for Store Database
-- =============================================================================

-- البدء بالتحسينات
-- ملاحظة: تم إزالة BEGIN لتجنب مشاكل CREATE INDEX CONCURRENTLY

-- =============================================================================
-- المرحلة 1: إزالة الفهارس المكررة والمتضاربة
-- =============================================================================


-- إزالة الفهارس المكررة في store_settings
DROP INDEX IF EXISTS idx_store_settings_org_id;
DROP INDEX IF EXISTS idx_store_settings_organization_id;

-- إزالة الفهارس القديمة في products 
DROP INDEX IF EXISTS idx_products_org_id;
DROP INDEX IF EXISTS idx_products_organization_id;

-- إزالة الفهارس القديمة في product_categories
DROP INDEX IF EXISTS idx_product_categories_org_id;


-- =============================================================================
-- المرحلة 2: إنشاء فهارس محسنة للأداء الفائق
-- متوافقة مع جميع إصدارات PostgreSQL (9.6+)
-- =============================================================================


-- فهرس فائق للمتجر - يغطي جميع الاستعلامات الأساسية
CREATE INDEX IF NOT EXISTS idx_store_settings_ultra_optimized 
ON store_settings (organization_id, is_active, order_index, component_type, settings_hash) 
WHERE is_active = true;

-- فهرس محسن للمنتجات المميزة
CREATE INDEX IF NOT EXISTS idx_products_featured_store_optimized
ON products (organization_id, is_featured, is_active, created_at, price, stock_quantity)
WHERE is_featured = true AND is_active = true;

-- فهرس محسن للفئات مع البيانات المضمنة
CREATE INDEX IF NOT EXISTS idx_categories_ultra_optimized
ON product_categories (organization_id, is_active, name) 
WHERE is_active = true;

-- فهرس محسن للمنتجات النشطة حسب الفئة
CREATE INDEX IF NOT EXISTS idx_products_category_active_optimized
ON products (organization_id, category_id, is_active, created_at, price)
WHERE is_active = true;

-- فهرس محسن للبحث في المنتجات (GIN index)
CREATE INDEX IF NOT EXISTS idx_products_search_ultra_fast
ON products USING gin (
    to_tsvector('arabic', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(sku, ''))
) WHERE is_active = true;

-- فهرس محسن للإعدادات التنظيمية
CREATE INDEX IF NOT EXISTS idx_organization_settings_ultra_fast
ON organization_settings (organization_id, site_name, theme_mode);

-- فهرس محسن للتقارير والتحليلات
CREATE INDEX IF NOT EXISTS idx_products_reporting_optimized
ON products (organization_id, created_at, price, stock_quantity, is_active, is_featured);

-- فهرس محسن لسجلات المبيعات والطلبات
CREATE INDEX IF NOT EXISTS idx_products_sales_analytics
ON products (organization_id, is_active, price, stock_quantity, created_at)
WHERE is_active = true;

-- فهرس محسن للمراجعات والتقييمات
CREATE INDEX IF NOT EXISTS idx_products_reviews_optimized
ON product_reviews (product_id, is_approved, created_at, rating)
WHERE is_approved = true;


-- =============================================================================
-- المرحلة 3: دوال قاعدة البيانات محسنة للأداء الفائق
-- =============================================================================


-- دالة جلب بيانات المتجر بسرعة فائقة (محمية)
CREATE OR REPLACE FUNCTION get_store_data_ultra_fast(
    p_subdomain text,
    p_limit_categories integer DEFAULT 8,
    p_limit_products integer DEFAULT 6
) RETURNS TABLE (
    org_id uuid,
    org_name text,
    org_description text,
    org_logo_url text,
    org_domain text,
    settings_data jsonb,
    components_data jsonb,
    categories_data jsonb,
    featured_products_data jsonb
) 
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
SECURITY DEFINER
AS $$
DECLARE
    v_org_id uuid;
BEGIN
    -- الحصول على معرف المؤسسة أولاً
    SELECT o.id INTO v_org_id
    FROM organizations o
    WHERE o.subdomain = p_subdomain 
      AND o.is_active = true
    LIMIT 1;
    
    -- إذا لم توجد المؤسسة، إرجاع فارغ
    IF v_org_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH org_data AS (
        SELECT 
            o.id,
            o.name,
            o.description,
            o.logo_url,
            o.domain,
            row_to_json(os.*) as settings
        FROM organizations o
        LEFT JOIN organization_settings os ON o.id = os.organization_id
        WHERE o.id = v_org_id
    ),
    components_data AS (
        SELECT json_agg(
            json_build_object(
                'id', ss.id,
                'type', ss.component_type,
                'settings', ss.settings,
                'is_active', ss.is_active,
                'order_index', ss.order_index
            ) ORDER BY ss.order_index
        ) as components
        FROM store_settings ss
        WHERE ss.organization_id = v_org_id
          AND ss.is_active = true
    ),
    categories_data AS (
        SELECT json_agg(
            json_build_object(
                'id', pc.id,
                'name', pc.name,
                'description', pc.description,
                'slug', pc.slug,
                'icon', pc.icon,
                'image_url', pc.image_url,
                'product_count', COALESCE(pc_stats.product_count, 0)
            ) ORDER BY pc.name
        ) as categories
        FROM product_categories pc
        LEFT JOIN (
            SELECT 
                category_id,
                count(*) as product_count
            FROM products p2
            WHERE p2.organization_id = v_org_id
              AND p2.is_active = true
            GROUP BY category_id
        ) pc_stats ON pc.id = pc_stats.category_id
        WHERE pc.organization_id = v_org_id
          AND pc.is_active = true
        ORDER BY pc.name
        LIMIT p_limit_categories
    ),
    featured_products_data AS (
        SELECT json_agg(
            json_build_object(
                'id', p.id,
                'name', p.name,
                'description', p.description,
                'price', p.price,
                'compare_at_price', p.compare_at_price,
                'thumbnail_image', p.thumbnail_image,
                'slug', p.slug,
                'stock_quantity', p.stock_quantity,
                'category_name', COALESCE(pc.name, p.category)
            ) ORDER BY p.created_at DESC
        ) as featured_products
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.organization_id = v_org_id
          AND p.is_featured = true 
          AND p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT p_limit_products
    )
    SELECT 
        od.id,
        od.name,
        od.description,
        od.logo_url,
        od.domain,
        od.settings::jsonb,
        COALESCE(cd.components, '[]'::json)::jsonb,
        COALESCE(catd.categories, '[]'::json)::jsonb,
        COALESCE(fpd.featured_products, '[]'::json)::jsonb
    FROM org_data od
    LEFT JOIN components_data cd ON true
    LEFT JOIN categories_data catd ON true
    LEFT JOIN featured_products_data fpd ON true;
END;
$$;

-- دالة محسنة لجلب المكونات النشطة فقط (محمية)
CREATE OR REPLACE FUNCTION get_active_store_components(
    p_organization_id uuid
) RETURNS TABLE (
    id uuid,
    component_type text,
    settings jsonb,
    order_index integer,
    updated_at timestamptz
)
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
AS $$
    SELECT 
        ss.id,
        ss.component_type,
        ss.settings,
        ss.order_index,
        ss.updated_at
    FROM store_settings ss
    WHERE ss.organization_id = p_organization_id
      AND ss.is_active = true
    ORDER BY ss.order_index, ss.created_at;
$$;

-- دالة محسنة للبحث في المنتجات
CREATE OR REPLACE FUNCTION search_products_ultra_fast(
    p_organization_id uuid,
    p_search_query text DEFAULT NULL,
    p_category_id uuid DEFAULT NULL,
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
) RETURNS TABLE (
    id uuid,
    name text,
    description text,
    price numeric,
    compare_at_price numeric,
    thumbnail_image text,
    slug text,
    stock_quantity integer,
    category_name text,
    rank real
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.compare_at_price,
        p.thumbnail_image,
        p.slug,
        p.stock_quantity,
        COALESCE(pc.name, p.category) as category_name,
        CASE 
            WHEN p_search_query IS NOT NULL THEN
                ts_rank_cd(
                    to_tsvector('arabic', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.sku, '')),
                    plainto_tsquery('arabic', p_search_query)
                )
            ELSE 1.0
        END as rank
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE p.organization_id = p_organization_id
      AND p.is_active = true
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (
          p_search_query IS NULL OR
          to_tsvector('arabic', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.sku, '')) 
          @@ plainto_tsquery('arabic', p_search_query)
      )
    ORDER BY 
        CASE WHEN p_search_query IS NOT NULL THEN rank END DESC,
        p.is_featured DESC,
        p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- دالة محسنة لإحصائيات المتجر
CREATE OR REPLACE FUNCTION get_store_stats_fast(
    p_organization_id uuid
) RETURNS TABLE (
    total_products bigint,
    active_products bigint,
    featured_products bigint,
    total_categories bigint,
    active_categories bigint,
    total_components bigint,
    active_components bigint,
    last_product_update timestamptz,
    last_settings_update timestamptz
)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
    SELECT 
        (SELECT count(*) FROM products WHERE organization_id = p_organization_id),
        (SELECT count(*) FROM products WHERE organization_id = p_organization_id AND is_active = true),
        (SELECT count(*) FROM products WHERE organization_id = p_organization_id AND is_featured = true AND is_active = true),
        (SELECT count(*) FROM product_categories WHERE organization_id = p_organization_id),
        (SELECT count(*) FROM product_categories WHERE organization_id = p_organization_id AND is_active = true),
        (SELECT count(*) FROM store_settings WHERE organization_id = p_organization_id),
        (SELECT count(*) FROM store_settings WHERE organization_id = p_organization_id AND is_active = true),
        (SELECT max(updated_at) FROM products WHERE organization_id = p_organization_id),
        (SELECT max(updated_at) FROM store_settings WHERE organization_id = p_organization_id);
$$;


-- =============================================================================
-- المرحلة 4: إعدادات تحسين الأداء
-- =============================================================================


-- تحسين إعدادات PostgreSQL للاستعلامات السريعة
SET work_mem = '256MB';
SET maintenance_work_mem = '512MB';
SET effective_cache_size = '2GB';
SET random_page_cost = 1.1;
SET effective_io_concurrency = 200;

-- تمكين الإحصائيات الموسعة
ALTER TABLE store_settings ALTER COLUMN settings SET STATISTICS 1000;
ALTER TABLE products ALTER COLUMN name SET STATISTICS 1000;
ALTER TABLE product_categories ALTER COLUMN name SET STATISTICS 1000;

-- تحديث إحصائيات الجداول
ANALYZE store_settings;
ANALYZE products;
ANALYZE product_categories;
ANALYZE organization_settings;
ANALYZE organizations;

DO $$ BEGIN
    RAISE NOTICE 'تم تطبيق إعدادات تحسين الأداء بنجاح ✅';
END $$;

-- =============================================================================
-- المرحلة 5: دوال مساعدة للتخزين المؤقت
-- =============================================================================

-- دالة لتنظيف البيانات القديمة
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- حذف سجلات التحليلات القديمة (أكبر من 6 أشهر)
    DELETE FROM super_store_component_analytics 
    WHERE date < CURRENT_DATE - INTERVAL '6 months';
    
    -- حذف سجلات التاريخ القديمة (أكبر من سنة)
    DELETE FROM super_store_component_history 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
    
    -- تنظيف جدول محاولات الحذف
    DELETE FROM product_deletion_attempts 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '3 months';
    
    RAISE NOTICE 'تم تنظيف البيانات القديمة';
END;
$$;

-- دالة لإعادة بناء الفهارس
CREATE OR REPLACE FUNCTION rebuild_critical_indexes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REINDEX INDEX idx_store_settings_ultra_optimized;
    REINDEX INDEX idx_products_featured_store_optimized;
    REINDEX INDEX idx_categories_ultra_optimized;
    
    RAISE NOTICE 'تم إعادة بناء الفهارس الحرجة';
END;
$$;


-- =============================================================================
-- المرحلة 6: مراقبة الأداء والتحليلات
-- =============================================================================


-- دالة مراقبة أداء الاستعلامات
CREATE OR REPLACE FUNCTION get_query_performance_stats()
RETURNS TABLE (
    query_text text,
    calls bigint,
    total_time numeric,
    mean_time numeric,
    max_time numeric,
    stddev_time numeric,
    rows bigint,
    hit_percentage numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        query,
        calls,
        total_exec_time as total_time,
        mean_exec_time as mean_time,
        max_exec_time as max_time,
        stddev_exec_time as stddev_time,
        rows,
        CASE 
            WHEN (shared_blks_hit + shared_blks_read) > 0 
            THEN (shared_blks_hit::numeric / (shared_blks_hit + shared_blks_read)) * 100
            ELSE 0
        END as hit_percentage
    FROM pg_stat_statements
    WHERE query LIKE '%store_settings%' 
       OR query LIKE '%products%'
       OR query LIKE '%product_categories%'
    ORDER BY total_exec_time DESC
    LIMIT 20;
$$;

-- دالة تحليل استخدام الفهارس
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE (
    schemaname text,
    tablename text,
    indexname text,
    idx_tup_read bigint,
    idx_tup_fetch bigint,
    usage_efficiency numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        CASE 
            WHEN idx_tup_read > 0 
            THEN (idx_tup_fetch::numeric / idx_tup_read) * 100
            ELSE 0
        END as usage_efficiency
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND (tablename LIKE '%store%' OR tablename LIKE '%product%')
    ORDER BY idx_tup_read DESC;
$$;

-- =============================================================================
-- المرحلة 7: MATERIALIZED VIEWS للبيانات شبه الثابتة
-- =============================================================================


-- مشاهدة محسنة لإحصائيات المتاجر
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_store_statistics AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.subdomain,
    COUNT(DISTINCT p.id) as total_products,
    COUNT(DISTINCT CASE WHEN p.is_active THEN p.id END) as active_products,
    COUNT(DISTINCT CASE WHEN p.is_featured AND p.is_active THEN p.id END) as featured_products,
    COUNT(DISTINCT pc.id) as total_categories,
    COUNT(DISTINCT CASE WHEN pc.is_active THEN pc.id END) as active_categories,
    COUNT(DISTINCT ss.id) as total_components,
    COUNT(DISTINCT CASE WHEN ss.is_active THEN ss.id END) as active_components,
    AVG(p.price) as avg_product_price,
    MAX(p.updated_at) as last_product_update,
    MAX(ss.updated_at) as last_settings_update,
    CURRENT_TIMESTAMP as last_refreshed
FROM organizations o
LEFT JOIN products p ON o.id = p.organization_id
LEFT JOIN product_categories pc ON o.id = pc.organization_id
LEFT JOIN store_settings ss ON o.id = ss.organization_id
WHERE o.is_active = true
GROUP BY o.id, o.name, o.subdomain;

-- فهرس للمشاهدة المحسنة
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_store_statistics_org_id 
ON mv_store_statistics (organization_id);

CREATE INDEX IF NOT EXISTS idx_mv_store_statistics_subdomain 
ON mv_store_statistics (subdomain);

-- مشاهدة محسنة للفئات مع عدد المنتجات
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_categories_with_counts AS
SELECT 
    pc.id,
    pc.organization_id,
    pc.name,
    pc.description,
    pc.slug,
    pc.icon,
    pc.image_url,
    pc.is_active,
    COUNT(p.id) as product_count,
    COUNT(CASE WHEN p.is_active THEN p.id END) as active_product_count,
    COUNT(CASE WHEN p.is_featured AND p.is_active THEN p.id END) as featured_product_count,
    AVG(p.price) as avg_price,
    MIN(p.price) as min_price,
    MAX(p.price) as max_price,
    CURRENT_TIMESTAMP as last_refreshed
FROM product_categories pc
LEFT JOIN products p ON pc.id = p.category_id
WHERE pc.is_active = true
GROUP BY pc.id, pc.organization_id, pc.name, pc.description, pc.slug, pc.icon, pc.image_url, pc.is_active;

-- فهرس للمشاهدة المحسنة للفئات
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_categories_counts_id 
ON mv_categories_with_counts (id);

CREATE INDEX IF NOT EXISTS idx_mv_categories_counts_org_active 
ON mv_categories_with_counts (organization_id, is_active);

-- دالة تحديث المشاهدات المحسنة
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_store_statistics;
    REFRESH MATERIALIZED VIEW mv_categories_with_counts;
    
    RAISE NOTICE 'تم تحديث جميع المشاهدات المحسنة في %', CURRENT_TIMESTAMP;
END;
$$;

-- =============================================================================
-- المرحلة 8: إعداد مراقبة تلقائية وتنبيهات
-- =============================================================================

-- دالة فحص صحة الأداء
CREATE OR REPLACE FUNCTION health_check_performance()
RETURNS TABLE (
    metric_name text,
    metric_value numeric,
    status text,
    recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_slow_queries_count bigint;
    v_index_hit_ratio numeric;
    v_cache_hit_ratio numeric;
BEGIN
    -- فحص الاستعلامات البطيئة
    SELECT COUNT(*) INTO v_slow_queries_count
    FROM pg_stat_statements 
    WHERE mean_exec_time > 1000; -- أكثر من ثانية واحدة
    
    -- فحص نسبة استخدام الفهارس
    SELECT 
        CASE 
            WHEN (sum(idx_blks_hit) + sum(idx_blks_read)) > 0 
            THEN (sum(idx_blks_hit)::numeric / (sum(idx_blks_hit) + sum(idx_blks_read))) * 100
            ELSE 0
        END INTO v_index_hit_ratio
    FROM pg_statio_user_indexes;
    
    -- فحص نسبة استخدام الكاش
    SELECT 
        CASE 
            WHEN (sum(heap_blks_hit) + sum(heap_blks_read)) > 0 
            THEN (sum(heap_blks_hit)::numeric / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100
            ELSE 0
        END INTO v_cache_hit_ratio
    FROM pg_statio_user_tables;
    
    RETURN QUERY VALUES
        ('slow_queries_count', v_slow_queries_count, 
         CASE WHEN v_slow_queries_count < 10 THEN 'جيد' ELSE 'يحتاج تحسين' END,
         CASE WHEN v_slow_queries_count < 10 THEN 'الأداء جيد' ELSE 'راجع الاستعلامات البطيئة' END),
        ('index_hit_ratio', v_index_hit_ratio,
         CASE WHEN v_index_hit_ratio > 95 THEN 'ممتاز' WHEN v_index_hit_ratio > 90 THEN 'جيد' ELSE 'ضعيف' END,
         CASE WHEN v_index_hit_ratio > 95 THEN 'استخدام فهارس ممتاز' ELSE 'تحتاج فهارس إضافية' END),
        ('cache_hit_ratio', v_cache_hit_ratio,
         CASE WHEN v_cache_hit_ratio > 95 THEN 'ممتاز' WHEN v_cache_hit_ratio > 90 THEN 'جيد' ELSE 'ضعيف' END,
         CASE WHEN v_cache_hit_ratio > 95 THEN 'استخدام كاش ممتاز' ELSE 'زد shared_buffers' END);
END;
$$;

DO $$ BEGIN
    RAISE NOTICE 'تم إنشاء نظام المراقبة والتحليلات بنجاح ✅';
END $$;

-- =============================================================================
-- إنهاء التحسينات
-- =============================================================================

-- ملاحظة: تم إزالة COMMIT لأننا لا نستخدم transaction

-- =============================================================================
-- المرحلة 9: تمكين مراقبة pg_stat_statements
-- =============================================================================

-- تمكين إحصائيات الاستعلامات إذا لم تكن مُفعلة
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- إعادة تعيين الإحصائيات للبدء من جديد
SELECT pg_stat_statements_reset();

-- =============================================================================
-- المرحلة 10: إعداد صيانة دورية تلقائية
-- =============================================================================

-- دالة الصيانة الشاملة التلقائية
CREATE OR REPLACE FUNCTION automated_maintenance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- تنظيف البيانات القديمة
    PERFORM cleanup_old_data();
    
    -- تحديث المشاهدات المحسنة
    PERFORM refresh_materialized_views();
    
    -- تحديث إحصائيات الجداول
    ANALYZE store_settings;
    ANALYZE products;
    ANALYZE product_categories;
    ANALYZE organization_settings;
    
    -- تسجيل عملية الصيانة
    INSERT INTO maintenance_log (performed_at, operation, status)
    VALUES (CURRENT_TIMESTAMP, 'automated_maintenance', 'completed');
    
    RAISE NOTICE 'تمت الصيانة التلقائية بنجاح في %', CURRENT_TIMESTAMP;
END;
$$;

-- جدول سجل الصيانة
CREATE TABLE IF NOT EXISTS maintenance_log (
    id SERIAL PRIMARY KEY,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    operation TEXT NOT NULL,
    status TEXT NOT NULL,
    details JSONB DEFAULT '{}'
);

-- دالة لحساب حجم الجداول والفهارس
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE (
    table_name text,
    table_size text,
    indexes_size text,
    total_size text,
    row_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        schemaname||'.'||tablename as table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) + pg_indexes_size(schemaname||'.'||tablename)) as total_size,
        n_tup_ins + n_tup_upd + n_tup_del as row_count
    FROM pg_tables pt
    LEFT JOIN pg_stat_user_tables pst ON pt.tablename = pst.relname
    WHERE schemaname = 'public'
      AND (tablename LIKE '%store%' OR tablename LIKE '%product%' OR tablename = 'organizations')
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
$$;

-- إحصائيات سريعة للتحقق من النتائج
SELECT 
    'Database Optimization Complete' as status,
    current_timestamp as completed_at,
    version() as postgres_version; 