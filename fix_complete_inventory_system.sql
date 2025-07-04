-- ===============================================
-- حل شامل لجميع مشاكل نظام المخزون
-- تاريخ: 3 يوليو 2025
-- الهدف: توحيد نظام المخزون وحل جميع المشاكل
-- ===============================================

-- ===========================================
-- الخطوة 1: توحيد جداول المخزون
-- ===========================================

-- نسخ البيانات من inventory_logs إلى inventory_log (الجدول الرئيسي)
INSERT INTO inventory_log (
    id,
    product_id,
    quantity,
    previous_stock,
    new_stock,
    type,
    reference_id,
    reference_type,
    notes,
    created_by,
    organization_id,
    created_at
) 
SELECT 
    COALESCE(il.id, gen_random_uuid()),
    il.product_id,
    il.quantity,
    il.previous_stock,
    il.new_stock,
    il.type,
    il.reference_id::uuid,
    COALESCE(il.type, 'system'),
    il.notes,
    il.created_by,
    il.organization_id,
    il.created_at
FROM inventory_logs il
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_log il2 
    WHERE il2.product_id = il.product_id 
    AND il2.created_at = il.created_at 
    AND il2.organization_id = il.organization_id
)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- الخطوة 2: إضافة سجل المخزون الأولي للمنتج الحالي
-- ===========================================

-- إضافة سجل المخزون للمنتج التجريبي إذا لم يكن موجوداً
INSERT INTO inventory_log (
    id,
    product_id,
    quantity,
    previous_stock,
    new_stock,
    type,
    reference_id,
    reference_type,
    notes,
    created_by,
    organization_id,
    created_at
) 
SELECT 
    gen_random_uuid(),
    '1cb97231-dce1-4018-8290-cb43b21e374d',
    20,
    0,
    20,
    'addition',
    NULL,
    'system',
    'إضافة مخزون أولي عند إنشاء المنتج',
    '3f602507-15f4-4055-988e-de069e220c2a',
    '989bf6d2-aba1-4edd-8d07-649120ac4323',
    '2025-07-03T16:27:34.052Z'
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_log 
    WHERE product_id = '1cb97231-dce1-4018-8290-cb43b21e374d'
    AND organization_id = '989bf6d2-aba1-4edd-8d07-649120ac4323'
);

-- ===========================================
-- الخطوة 3: إنشاء trigger للمنتجات الجديدة
-- ===========================================

-- إنشاء دالة trigger لإضافة سجل مخزون عند إنشاء منتج جديد
CREATE OR REPLACE FUNCTION create_initial_inventory_log_unified()
RETURNS TRIGGER AS $$
BEGIN
    -- إضافة سجل في inventory_log (الجدول الرئيسي)
    INSERT INTO inventory_log (
        id,
        product_id,
        quantity,
        previous_stock,
        new_stock,
        type,
        reference_id,
        reference_type,
        notes,
        created_by,
        organization_id,
        created_at
    ) VALUES (
        gen_random_uuid(),
        NEW.id,
        COALESCE(NEW.stock_quantity, 0),
        0,
        COALESCE(NEW.stock_quantity, 0),
        'addition',
        NULL,
        'system',
        'إضافة مخزون أولي عند إنشاء المنتج - ' || NEW.name,
        COALESCE(NEW.created_by_user_id, NEW.updated_by_user_id),
        NEW.organization_id,
        COALESCE(NEW.created_at, NOW())
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- حذف trigger القديم وإنشاء الجديد
DROP TRIGGER IF EXISTS trigger_create_initial_inventory_log ON products;
DROP TRIGGER IF EXISTS trigger_create_initial_inventory_log_unified ON products;

CREATE TRIGGER trigger_create_initial_inventory_log_unified
    AFTER INSERT ON products
    FOR EACH ROW
    WHEN (NEW.stock_quantity IS NOT NULL AND NEW.stock_quantity > 0)
    EXECUTE FUNCTION create_initial_inventory_log_unified();

-- ===========================================
-- الخطوة 4: تحديث دالة get_advanced_inventory_tracking
-- ===========================================

-- تحديث الدالة لتعمل مع الجدول الصحيح وتتعامل مع القيم الفارغة
CREATE OR REPLACE FUNCTION get_advanced_inventory_tracking(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_product_ids UUID[] DEFAULT NULL,
    p_user_ids UUID[] DEFAULT NULL,
    p_operation_types TEXT[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0,
    p_include_batches BOOLEAN DEFAULT FALSE,
    p_include_stats BOOLEAN DEFAULT TRUE,
    p_search_term TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
    v_stats JSON;
    v_batches JSON;
    v_recent_activities JSON;
    v_user_activities JSON;
    v_product_insights JSON;
    v_execution_time INTERVAL;
    v_start_time TIMESTAMP;
    v_total_count INTEGER;
BEGIN
    -- بداية قياس الوقت
    v_start_time := clock_timestamp();
    
    -- التحقق من صحة المعاملات
    IF p_organization_id IS NULL THEN
        RAISE EXCEPTION 'معرف المؤسسة مطلوب';
    END IF;
    
    -- حساب العدد الإجمالي للحركات أولاً
    SELECT COUNT(*) INTO v_total_count
    FROM inventory_log il
    LEFT JOIN products p ON il.product_id = p.id
    WHERE il.organization_id = p_organization_id
        AND il.created_at BETWEEN p_start_date AND p_end_date
        AND (p_product_ids IS NULL OR il.product_id = ANY(p_product_ids))
        AND (p_user_ids IS NULL OR il.created_by = ANY(p_user_ids))
        AND (p_operation_types IS NULL OR il.type = ANY(p_operation_types))
        AND (p_search_term IS NULL OR 
             p.name ILIKE '%' || p_search_term || '%' OR 
             p.sku ILIKE '%' || p_search_term || '%');
    
    -- الحركات الأخيرة
    WITH recent_activities AS (
        SELECT 
            il.id,
            il.type as operation_type,
            il.quantity,
            il.previous_stock,
            il.new_stock,
            il.reference_type,
            il.reference_id,
            il.notes,
            il.created_at,
            json_build_object(
                'id', p.id,
                'name', COALESCE(p.name, 'منتج محذوف'),
                'sku', p.sku,
                'current_stock', p.stock_quantity,
                'price', p.price,
                'purchase_price', p.purchase_price
            ) as product_info,
            json_build_object(
                'id', u.id,
                'name', COALESCE(u.name, 'مستخدم غير معروف'),
                'email', u.email
            ) as user_info,
            -- حساب القيمة المالية
            CASE 
                WHEN il.type = 'sale' THEN ABS(il.quantity) * COALESCE(p.price, 0)
                WHEN il.type = 'purchase' THEN ABS(il.quantity) * COALESCE(p.purchase_price, p.price * 0.6, 0)
                WHEN il.type = 'addition' THEN ABS(il.quantity) * COALESCE(p.purchase_price, p.price * 0.6, 0)
                ELSE 0
            END as transaction_value
        FROM inventory_log il
        LEFT JOIN products p ON il.product_id = p.id
        LEFT JOIN auth.users u ON il.created_by = u.id
        WHERE il.organization_id = p_organization_id
            AND il.created_at BETWEEN p_start_date AND p_end_date
            AND (p_product_ids IS NULL OR il.product_id = ANY(p_product_ids))
            AND (p_user_ids IS NULL OR il.created_by = ANY(p_user_ids))
            AND (p_operation_types IS NULL OR il.type = ANY(p_operation_types))
            AND (p_search_term IS NULL OR 
                 p.name ILIKE '%' || p_search_term || '%' OR 
                 p.sku ILIKE '%' || p_search_term || '%')
        ORDER BY il.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'id', id,
            'operation_type', operation_type,
            'quantity', quantity,
            'previous_stock', previous_stock,
            'new_stock', new_stock,
            'reference_type', reference_type,
            'reference_id', reference_id,
            'notes', notes,
            'created_at', created_at,
            'product', product_info,
            'user', user_info,
            'transaction_value', transaction_value
        )
    ), '[]'::json) INTO v_recent_activities
    FROM recent_activities;
    
    -- الإحصائيات الذكية
    IF p_include_stats THEN
        WITH stats_data AS (
            SELECT 
                COUNT(*) as total_operations,
                COUNT(DISTINCT il.product_id) as affected_products,
                COUNT(DISTINCT il.created_by) as active_users,
                
                -- إحصائيات بالنوع
                COUNT(*) FILTER (WHERE il.type IN ('sale', 'reduction')) as sales_count,
                COUNT(*) FILTER (WHERE il.type IN ('purchase', 'addition')) as purchases_count,
                COUNT(*) FILTER (WHERE il.type = 'return') as returns_count,
                COUNT(*) FILTER (WHERE il.type = 'adjustment') as adjustments_count,
                
                -- قيم مالية
                COALESCE(SUM(
                    CASE WHEN il.type IN ('sale', 'reduction') 
                    THEN ABS(il.quantity) * COALESCE(p.price, 0) 
                    ELSE 0 END
                ), 0) as total_sales_value,
                
                COALESCE(SUM(
                    CASE WHEN il.type IN ('purchase', 'addition') 
                    THEN ABS(il.quantity) * COALESCE(p.purchase_price, p.price * 0.6, 0) 
                    ELSE 0 END
                ), 0) as total_purchase_value,
                
                -- اتجاهات
                COUNT(*) FILTER (
                    WHERE il.created_at >= NOW() - INTERVAL '7 days'
                ) as operations_last_7_days,
                
                COUNT(*) FILTER (
                    WHERE il.created_at >= CURRENT_DATE
                ) as operations_today
                
            FROM inventory_log il
            LEFT JOIN products p ON il.product_id = p.id
            WHERE il.organization_id = p_organization_id
                AND il.created_at BETWEEN p_start_date AND p_end_date
                AND (p_product_ids IS NULL OR il.product_id = ANY(p_product_ids))
                AND (p_user_ids IS NULL OR il.created_by = ANY(p_user_ids))
                AND (p_operation_types IS NULL OR il.type = ANY(p_operation_types))
        )
        SELECT json_build_object(
            'total_operations', total_operations,
            'affected_products', affected_products,
            'active_users', active_users,
            'operations_breakdown', json_build_object(
                'sales', sales_count,
                'purchases', purchases_count,
                'returns', returns_count,
                'adjustments', adjustments_count
            ),
            'financial_summary', json_build_object(
                'total_sales_value', total_sales_value,
                'total_purchase_value', total_purchase_value,
                'net_value', total_sales_value - total_purchase_value
            ),
            'trends', json_build_object(
                'operations_last_7_days', operations_last_7_days,
                'operations_today', operations_today
            )
        ) INTO v_stats
        FROM stats_data;
    END IF;
    
    -- نشاط المستخدمين
    WITH user_activity AS (
        SELECT 
            u.id as user_id,
            COALESCE(u.name, 'مستخدم غير معروف') as user_name,
            COUNT(*) as operations_count,
            COUNT(DISTINCT il.product_id) as products_affected,
            SUM(ABS(il.quantity)) as total_quantity_handled,
            MAX(il.created_at) as last_activity
        FROM inventory_log il
        LEFT JOIN auth.users u ON il.created_by = u.id
        WHERE il.organization_id = p_organization_id
            AND il.created_at BETWEEN p_start_date AND p_end_date
        GROUP BY u.id, u.name
        HAVING COUNT(*) > 0
        ORDER BY operations_count DESC
        LIMIT 10
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'user_id', user_id,
            'user_name', user_name,
            'operations_count', operations_count,
            'products_affected', products_affected,
            'total_quantity_handled', total_quantity_handled,
            'last_activity', last_activity
        )
    ), '[]'::json) INTO v_user_activities
    FROM user_activity;
    
    -- رؤى المنتجات
    WITH product_insights AS (
        SELECT 
            p.id as product_id,
            p.name as product_name,
            p.sku,
            p.stock_quantity as current_stock,
            p.price as selling_price,
            COUNT(il.id) as total_movements,
            SUM(ABS(il.quantity)) as total_quantity_moved,
            MAX(il.created_at) as last_movement
        FROM products p
        LEFT JOIN inventory_log il ON p.id = il.product_id 
            AND il.created_at BETWEEN p_start_date AND p_end_date
        WHERE p.organization_id = p_organization_id
            AND p.is_active = true
            AND (p_product_ids IS NULL OR p.id = ANY(p_product_ids))
        GROUP BY p.id, p.name, p.sku, p.stock_quantity, p.price
        HAVING COUNT(il.id) > 0
        ORDER BY total_movements DESC
        LIMIT 20
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'product_id', product_id,
            'product_name', product_name,
            'sku', sku,
            'current_stock', current_stock,
            'selling_price', selling_price,
            'total_movements', total_movements,
            'total_quantity_moved', total_quantity_moved,
            'last_movement', last_movement
        )
    ), '[]'::json) INTO v_product_insights
    FROM product_insights;
    
    -- حساب وقت التنفيذ
    v_execution_time := clock_timestamp() - v_start_time;
    
    -- النتيجة النهائية
    v_result := json_build_object(
        'success', true,
        'data', json_build_object(
            'recent_activities', v_recent_activities,
            'statistics', CASE WHEN p_include_stats THEN v_stats ELSE null END,
            'batches', CASE WHEN p_include_batches THEN v_batches ELSE null END,
            'user_activities', v_user_activities,
            'product_insights', v_product_insights,
            'total_count', v_total_count
        ),
        'metadata', json_build_object(
            'execution_time_ms', EXTRACT(EPOCH FROM v_execution_time) * 1000,
            'query_params', json_build_object(
                'start_date', p_start_date,
                'end_date', p_end_date,
                'limit', p_limit,
                'offset', p_offset,
                'include_batches', p_include_batches,
                'include_stats', p_include_stats
            ),
            'generated_at', NOW()
        )
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', json_build_object(
                'message', SQLERRM,
                'code', SQLSTATE,
                'timestamp', NOW()
            )
        );
END;
$$;

-- ===========================================
-- الخطوة 5: إنشاء فهارس محسنة
-- ===========================================

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_inventory_log_org_date_type 
ON inventory_log(organization_id, created_at DESC, type);

CREATE INDEX IF NOT EXISTS idx_inventory_log_product_date 
ON inventory_log(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_log_user_date 
ON inventory_log(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_log_reference 
ON inventory_log(reference_type, reference_id) 
WHERE reference_id IS NOT NULL;

-- ===========================================
-- الخطوة 6: تنظيف البيانات المكررة
-- ===========================================

-- حذف السجلات المكررة من inventory_logs
DELETE FROM inventory_logs 
WHERE organization_id = '989bf6d2-aba1-4edd-8d07-649120ac4323'
AND EXISTS (
    SELECT 1 FROM inventory_log 
    WHERE inventory_log.product_id = inventory_logs.product_id
    AND inventory_log.created_at = inventory_logs.created_at
    AND inventory_log.organization_id = inventory_logs.organization_id
);

-- ===========================================
-- الخطوة 7: إضافة قواعد RLS إذا لم تكن موجودة
-- ===========================================

-- تمكين RLS على inventory_log
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسة للقراءة
DROP POLICY IF EXISTS "Users can view inventory logs from their organization" ON inventory_log;
CREATE POLICY "Users can view inventory logs from their organization"
ON inventory_log FOR SELECT
USING (
    organization_id IN (
        SELECT uo.organization_id 
        FROM user_organizations uo 
        WHERE uo.user_id = auth.uid()
    )
);

-- إنشاء سياسة للإدراج
DROP POLICY IF EXISTS "Users can insert inventory logs to their organization" ON inventory_log;
CREATE POLICY "Users can insert inventory logs to their organization"
ON inventory_log FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT uo.organization_id 
        FROM user_organizations uo 
        WHERE uo.user_id = auth.uid()
    )
);

-- ===========================================
-- الخطوة 8: إضافة دالة للتحقق من صحة البيانات
-- ===========================================

CREATE OR REPLACE FUNCTION validate_inventory_system(p_organization_id UUID)
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT,
    count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    -- تحقق 1: المنتجات بدون سجلات مخزون
    SELECT 
        'المنتجات بدون سجلات مخزون'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        'منتجات لها مخزون ولكن لا توجد سجلات في inventory_log'::TEXT,
        COUNT(*)::INTEGER
    FROM products p
    WHERE p.organization_id = p_organization_id
    AND p.stock_quantity > 0
    AND NOT EXISTS (
        SELECT 1 FROM inventory_log il 
        WHERE il.product_id = p.id
    )
    
    UNION ALL
    
    -- تحقق 2: سجلات مخزون بدون منتجات
    SELECT 
        'سجلات مخزون بدون منتجات'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END::TEXT,
        'سجلات في inventory_log تشير لمنتجات غير موجودة'::TEXT,
        COUNT(*)::INTEGER
    FROM inventory_log il
    WHERE il.organization_id = p_organization_id
    AND NOT EXISTS (
        SELECT 1 FROM products p 
        WHERE p.id = il.product_id
    )
    
    UNION ALL
    
    -- تحقق 3: إجمالي سجلات المخزون
    SELECT 
        'إجمالي سجلات المخزون'::TEXT,
        'INFO'::TEXT,
        'العدد الإجمالي لسجلات المخزون في النظام'::TEXT,
        COUNT(*)::INTEGER
    FROM inventory_log
    WHERE organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- الخطوة 9: تشغيل التحقق النهائي
-- ===========================================

-- التحقق من النتائج النهائية
SELECT 
    '✅ إجمالي المنتجات في المنظمة' as description,
    COUNT(*) as count
FROM products 
WHERE organization_id = '989bf6d2-aba1-4edd-8d07-649120ac4323'

UNION ALL

SELECT 
    '✅ إجمالي سجلات المخزون في inventory_log',
    COUNT(*)
FROM inventory_log 
WHERE organization_id = '989bf6d2-aba1-4edd-8d07-649120ac4323'

UNION ALL

SELECT 
    '✅ سجلات المنتج التجريبي',
    COUNT(*)
FROM inventory_log 
WHERE product_id = '1cb97231-dce1-4018-8290-cb43b21e374d'

UNION ALL

SELECT 
    '🔍 اختبار دالة get_advanced_inventory_tracking',
    CASE 
        WHEN (get_advanced_inventory_tracking('989bf6d2-aba1-4edd-8d07-649120ac4323')::jsonb->'data'->'statistics'->>'total_operations')::integer > 0 
        THEN 1 
        ELSE 0 
    END;

-- ===========================================
-- تأكيد الإكمال
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '🎉 تم إصلاح نظام المخزون بنجاح!';
    RAISE NOTICE '📊 الآن يمكنك اختبار صفحة التتبع المتقدم';
    RAISE NOTICE '🔄 تم إضافة trigger لضمان عدم تكرار المشكلة';
    RAISE NOTICE '⚡ تم تحسين الأداء بإضافة فهارس جديدة';
    RAISE NOTICE '🛡️ تم تفعيل قواعد الأمان RLS';
END $$; 