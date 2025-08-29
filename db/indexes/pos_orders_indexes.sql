-- =================================================================
-- 🎯 فهارس محسنة لصفحة طلبيات نقطة البيع (POS Orders)
-- =================================================================
-- المؤلف: AI Assistant  
-- التاريخ: 2025-01-27
-- الوصف: فهارس محسنة لتحسين أداء RPC get_pos_orders_page_data
-- الهدف: تحسين الاستعلامات لتصل إلى < 150ms لـ 10k سجل
-- =================================================================

-- ✅ 1. فهرس رئيسي محسن لطلبيات POS مع جميع الفلاتر الشائعة
CREATE INDEX IF NOT EXISTS idx_pos_orders_main_optimized 
ON orders (
    organization_id, 
    is_online, 
    created_at DESC,
    status,
    payment_status,
    employee_id
) 
WHERE is_online = false;

-- ✅ 2. فهرس للبحث النصي (GIN) - للبحث في العملاء والطلبيات
CREATE INDEX IF NOT EXISTS idx_pos_orders_search_gin
ON orders USING GIN (
    to_tsvector('arabic', 
        COALESCE(slug, '') || ' ' || 
        COALESCE(notes, '') || ' ' || 
        COALESCE(customer_order_number::TEXT, '')
    )
)
WHERE is_online = false;

-- ✅ 3. فهرس محسن للعملاء مع البحث النصي
CREATE INDEX IF NOT EXISTS idx_customers_pos_search_optimized
ON customers (
    organization_id,
    name,
    phone
) 
INCLUDE (id, email);

-- ✅ 4. فهرس GIN للبحث النصي في العملاء
CREATE INDEX IF NOT EXISTS idx_customers_search_gin
ON customers USING GIN (
    to_tsvector('arabic', 
        COALESCE(name, '') || ' ' || 
        COALESCE(phone, '') || ' ' || 
        COALESCE(email, '')
    )
);

-- ✅ 5. فهرس محسن لعناصر الطلبيات - لحساب items_count بسرعة
CREATE INDEX IF NOT EXISTS idx_order_items_count_optimized
ON order_items (
    order_id,
    organization_id
) 
INCLUDE (quantity, product_id);

-- ✅ 6. فهرس محسن للمرتجعات - لحساب إحصائيات المرتجعات
CREATE INDEX IF NOT EXISTS idx_returns_pos_orders_optimized
ON returns (
    original_order_id,
    status,
    organization_id
) 
INCLUDE (refund_amount)
WHERE status = 'approved';

-- ✅ 7. فهرس محسن للموظفين النشطين
CREATE INDEX IF NOT EXISTS idx_users_active_pos_optimized
ON users (
    organization_id,
    is_active,
    name
) 
INCLUDE (id, email, role)
WHERE is_active = true;

-- ✅ 8. فهرس للفلترة حسب التاريخ (محسن للاستعلامات اليومية/الأسبوعية)
CREATE INDEX IF NOT EXISTS idx_pos_orders_date_range_optimized
ON orders (
    organization_id,
    DATE(created_at),
    is_online
) 
INCLUDE (total, status, payment_status)
WHERE is_online = false;

-- ✅ 9. فهرس مركب للإحصائيات السريعة
CREATE INDEX IF NOT EXISTS idx_pos_orders_stats_fast
ON orders (
    organization_id,
    is_online,
    status,
    payment_status,
    payment_method
) 
INCLUDE (total, created_at)
WHERE is_online = false;

-- ✅ 10. فهرس محسن لـ pagination مع INCLUDE للبيانات المطلوبة
CREATE INDEX IF NOT EXISTS idx_pos_orders_pagination_optimized
ON orders (
    organization_id,
    is_online,
    created_at DESC
) 
INCLUDE (
    id, customer_id, employee_id, slug, customer_order_number,
    status, payment_status, payment_method, total, subtotal,
    tax, discount, amount_paid, remaining_amount, notes,
    updated_at, completed_at
)
WHERE is_online = false;

-- ✅ 11. فهرس للفلترة حسب طريقة الدفع
CREATE INDEX IF NOT EXISTS idx_pos_orders_payment_method
ON orders (
    organization_id,
    is_online,
    payment_method,
    created_at DESC
)
WHERE is_online = false;

-- ✅ 12. فهرس لإعدادات POS
CREATE INDEX IF NOT EXISTS idx_pos_settings_org_optimized
ON pos_settings (organization_id)
INCLUDE (
    store_name, receipt_header_text, receipt_footer_text,
    primary_color, secondary_color, currency_symbol
);

-- ✅ 13. فهرس لإعدادات المؤسسة
CREATE INDEX IF NOT EXISTS idx_organization_settings_optimized
ON organization_settings (organization_id)
INCLUDE (
    site_name, logo_url, theme_primary_color, 
    theme_secondary_color, default_language
);

-- ✅ 14. فهرس للاشتراكات النشطة
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_active
ON organization_subscriptions (
    organization_id,
    status,
    created_at DESC
)
INCLUDE (plan_id, start_date, end_date, trial_ends_at)
WHERE status = 'active';

-- =================================================================
-- 📊 إحصائيات وتحليل الفهارس
-- =================================================================

-- دالة لتحليل استخدام الفهارس
CREATE OR REPLACE FUNCTION analyze_pos_indexes_usage()
RETURNS TABLE (
    index_name TEXT,
    table_name TEXT,
    index_size TEXT,
    index_scans BIGINT,
    tuples_read BIGINT,
    tuples_fetched BIGINT,
    usage_ratio NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        indexname::TEXT,
        tablename::TEXT,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||indexname)) as index_size,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        CASE WHEN idx_scan > 0 
            THEN ROUND((idx_tup_fetch::NUMERIC / idx_tup_read::NUMERIC) * 100, 2)
            ELSE 0 
        END as usage_ratio
    FROM pg_stat_user_indexes 
    WHERE indexname LIKE 'idx_pos_%' 
       OR indexname LIKE 'idx_customers_%'
       OR indexname LIKE 'idx_order_items_%'
       OR indexname LIKE 'idx_returns_%'
       OR indexname LIKE 'idx_users_%'
       OR indexname LIKE 'idx_organization_%'
    ORDER BY idx_scan DESC;
END;
$$;

-- =================================================================
-- 🛠️ صيانة الفهارس
-- =================================================================

-- دالة لإعادة بناء الفهارس عند الحاجة
CREATE OR REPLACE FUNCTION maintain_pos_indexes()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    result_text TEXT := '';
    index_record RECORD;
BEGIN
    -- تحديث إحصائيات الجداول
    ANALYZE orders, order_items, customers, users, returns, 
            pos_settings, organization_settings, organization_subscriptions;
    
    result_text := result_text || 'تم تحديث إحصائيات الجداول' || chr(10);
    
    -- فحص الفهارس التي تحتاج إعادة بناء (حجم كبير مع استخدام قليل)
    FOR index_record IN 
        SELECT indexname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||indexname)) as size
        FROM pg_stat_user_indexes 
        WHERE (indexname LIKE 'idx_pos_%' OR indexname LIKE 'idx_customers_%')
        AND idx_scan < 10 
        AND pg_total_relation_size(schemaname||'.'||indexname) > 1024*1024*10 -- > 10MB
    LOOP
        result_text := result_text || format('فهرس يحتاج مراجعة: %s على الجدول %s (الحجم: %s، الاستخدام: قليل)', 
                                           index_record.indexname, 
                                           index_record.tablename,
                                           index_record.size) || chr(10);
    END LOOP;
    
    IF result_text = 'تم تحديث إحصائيات الجداول' || chr(10) THEN
        result_text := result_text || 'جميع الفهارس تعمل بكفاءة ✅';
    END IF;
    
    RETURN result_text;
END;
$$;

-- =================================================================
-- 📝 ملاحظات التطبيق
-- =================================================================

/*
ترتيب تطبيق الفهارس:

1. تطبيق الفهارس الأساسية أولاً:
   - idx_pos_orders_main_optimized
   - idx_order_items_count_optimized
   - idx_customers_pos_search_optimized

2. ثم الفهارس النصية:
   - idx_pos_orders_search_gin
   - idx_customers_search_gin

3. أخيراً الفهارس الإضافية حسب الحاجة

4. مراقبة الأداء بعد كل مجموعة باستخدام:
   SELECT * FROM analyze_pos_indexes_usage();

5. صيانة دورية:
   SELECT maintain_pos_indexes();

ملاحظة: تم إزالة CONCURRENTLY لحل مشكلة transaction block
*/
