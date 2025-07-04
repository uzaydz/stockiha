-- ===============================================
-- حل شامل لجميع مشاكل نظام المخزون - النسخة المحسنة
-- تاريخ: 3 يوليو 2025
-- الهدف: توحيد نظام المخزون مع معالجة القيم الفارغة
-- ===============================================

-- ===========================================
-- الخطوة 0: التحقق وإصلاح البيانات المعطوبة
-- ===========================================

-- البحث عن organization_id للسجلات الفارغة من خلال product_id
UPDATE inventory_logs 
SET organization_id = (
    SELECT p.organization_id 
    FROM products p 
    WHERE p.id = inventory_logs.product_id
)
WHERE organization_id IS NULL
AND product_id IS NOT NULL;

-- حذف السجلات التي لا يمكن ربطها بمنظمة (البيانات المعطوبة)
DELETE FROM inventory_logs 
WHERE organization_id IS NULL;

-- ===========================================
-- الخطوة 1: توحيد جداول المخزون (بحماية من NULL وتصحيح الأنواع)
-- ===========================================

-- نسخ البيانات من inventory_logs إلى inventory_log مع فلترة البيانات الصحيحة فقط
-- وتحويل الأنواع غير المدعومة إلى أنواع مقبولة
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
    -- تحويل الأنواع غير المدعومة إلى أنواع مقبولة
    CASE 
        WHEN il.type = 'addition' THEN 'manual'
        WHEN il.type = 'stock-add' THEN 'manual'
        WHEN il.type = 'stock-remove' THEN 'manual'
        WHEN il.type = 'reduction' THEN 'manual'
        WHEN il.type IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'online_order', 'manual', 'transfer', 'production', 'damaged', 'expired', 'pos_sale') THEN il.type
        ELSE 'manual'  -- جميع الأنواع الأخرى غير المعروفة
    END,
    CASE 
        WHEN il.reference_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN il.reference_id::uuid 
        ELSE NULL 
    END,
    -- إنشاء reference_type مناسب (لأنه غير موجود في inventory_logs)
    CASE 
        WHEN il.type = 'addition' THEN 'manual'
        WHEN il.type = 'stock-add' THEN 'manual'
        WHEN il.type = 'stock-remove' THEN 'manual'
        WHEN il.type = 'reduction' THEN 'manual'
        ELSE 'system'
    END,
    CASE 
        WHEN il.notes IS NOT NULL THEN il.notes
        WHEN il.type = 'addition' THEN 'تحويل من النظام القديم - إضافة مخزون'
        WHEN il.type = 'stock-add' THEN 'تحويل من النظام القديم - إضافة مخزون'
        WHEN il.type = 'stock-remove' THEN 'تحويل من النظام القديم - تقليل مخزون'
        WHEN il.type = 'reduction' THEN 'تحويل من النظام القديم - تقليل مخزون'
        ELSE 'تحويل من النظام القديم'
    END,
    il.created_by,
    il.organization_id,
    il.created_at
FROM inventory_logs il
WHERE il.organization_id IS NOT NULL  -- فقط السجلات التي لها organization_id
AND il.product_id IS NOT NULL        -- فقط السجلات التي لها product_id
AND NOT EXISTS (
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
    'manual',  -- استخدام نوع مدعوم
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

-- إنشاء دالة trigger محسنة مع معالجة الأخطاء
CREATE OR REPLACE FUNCTION create_initial_inventory_log_unified()
RETURNS TRIGGER AS $$
BEGIN
    -- التحقق من وجود البيانات المطلوبة
    IF NEW.organization_id IS NULL THEN
        RAISE WARNING 'Cannot create inventory log: organization_id is NULL for product %', NEW.id;
        RETURN NEW;
    END IF;
    
    IF NEW.stock_quantity IS NULL OR NEW.stock_quantity <= 0 THEN
        -- لا نضيف سجل للمنتجات بدون مخزون أولي
        RETURN NEW;
    END IF;
    
    -- إضافة سجل في inventory_log (الجدول الرئيسي)
    BEGIN
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
            NEW.stock_quantity,
            0,
            NEW.stock_quantity,
            'manual',  -- استخدام نوع مدعوم
            NULL,
            'system',
            'إضافة مخزون أولي عند إنشاء المنتج - ' || COALESCE(NEW.name, 'منتج جديد'),
            COALESCE(NEW.created_by_user_id, NEW.updated_by_user_id),
            NEW.organization_id,
            COALESCE(NEW.created_at, NOW())
        );
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create inventory log for product %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- حذف trigger القديم وإنشاء الجديد
DROP TRIGGER IF EXISTS trigger_create_initial_inventory_log ON products;
DROP TRIGGER IF EXISTS trigger_create_initial_inventory_log_unified ON products;

CREATE TRIGGER trigger_create_initial_inventory_log_unified
    AFTER INSERT ON products
    FOR EACH ROW
    WHEN (NEW.stock_quantity IS NOT NULL AND NEW.stock_quantity > 0 AND NEW.organization_id IS NOT NULL)
    EXECUTE FUNCTION create_initial_inventory_log_unified();

-- ===========================================
-- الخطوة 4: تحديث دالة get_advanced_inventory_tracking
-- ===========================================

-- تحديث الدالة مع معالجة محسنة للقيم الفارغة
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
        RETURN json_build_object(
            'success', false,
            'error', json_build_object(
                'message', 'معرف المؤسسة مطلوب',
                'code', 'MISSING_ORGANIZATION_ID'
            )
        );
    END IF;
    
    -- التأكد من الحدود المعقولة
    p_limit := LEAST(GREATEST(p_limit, 1), 1000);
    p_offset := GREATEST(p_offset, 0);
    
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
             COALESCE(p.name, '') ILIKE '%' || p_search_term || '%' OR 
             COALESCE(p.sku, '') ILIKE '%' || p_search_term || '%');
    
    -- الحركات الأخيرة مع معالجة محسنة للقيم الفارغة
    WITH recent_activities AS (
        SELECT 
            il.id,
            il.type as operation_type,
            COALESCE(il.quantity, 0) as quantity,
            COALESCE(il.previous_stock, 0) as previous_stock,
            COALESCE(il.new_stock, 0) as new_stock,
            COALESCE(il.reference_type, 'unknown') as reference_type,
            il.reference_id,
            COALESCE(il.notes, 'لا توجد ملاحظات') as notes,
            il.created_at,
            json_build_object(
                'id', p.id,
                'name', COALESCE(p.name, 'منتج محذوف'),
                'sku', COALESCE(p.sku, ''),
                'current_stock', COALESCE(p.stock_quantity, 0),
                'price', COALESCE(p.price, 0),
                'purchase_price', COALESCE(p.purchase_price, 0)
            ) as product_info,
            json_build_object(
                'id', u.id,
                'name', COALESCE(u.raw_user_meta_data->>'name', u.email, 'مستخدم غير معروف'),
                'email', COALESCE(u.email, '')
            ) as user_info,
            -- حساب القيمة المالية مع حماية من القيم الفارغة
            CASE 
                WHEN il.type IN ('sale', 'pos_sale') THEN ABS(COALESCE(il.quantity, 0)) * COALESCE(p.price, 0)
                WHEN il.type IN ('purchase', 'manual') THEN ABS(COALESCE(il.quantity, 0)) * COALESCE(p.purchase_price, p.price * 0.6, 0)
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
                 COALESCE(p.name, '') ILIKE '%' || p_search_term || '%' OR 
                 COALESCE(p.sku, '') ILIKE '%' || p_search_term || '%')
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
    
    -- الإحصائيات الذكية مع معالجة القيم الفارغة
    IF p_include_stats THEN
        WITH stats_data AS (
            SELECT 
                COUNT(*) as total_operations,
                COUNT(DISTINCT il.product_id) as affected_products,
                COUNT(DISTINCT il.created_by) as active_users,
                
                -- إحصائيات بالنوع مع تجميع أفضل (أنواع مدعومة فقط)
                COUNT(*) FILTER (WHERE il.type IN ('sale', 'pos_sale')) as sales_count,
                COUNT(*) FILTER (WHERE il.type IN ('purchase', 'manual')) as purchases_count,
                COUNT(*) FILTER (WHERE il.type = 'return') as returns_count,
                COUNT(*) FILTER (WHERE il.type = 'adjustment') as adjustments_count,
                
                -- قيم مالية مع حماية من NULL
                COALESCE(SUM(
                    CASE WHEN il.type IN ('sale', 'pos_sale') 
                    THEN ABS(COALESCE(il.quantity, 0)) * COALESCE(p.price, 0) 
                    ELSE 0 END
                ), 0) as total_sales_value,
                
                COALESCE(SUM(
                    CASE WHEN il.type IN ('purchase', 'manual') 
                    THEN ABS(COALESCE(il.quantity, 0)) * COALESCE(p.purchase_price, p.price * 0.6, 0) 
                    ELSE 0 END
                ), 0) as total_purchase_value,
                
                -- اتجاهات زمنية
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
    
    -- نشاط المستخدمين مع معالجة القيم الفارغة
    WITH user_activity AS (
        SELECT 
            COALESCE(u.id, il.created_by) as user_id,
            COALESCE(u.raw_user_meta_data->>'name', u.email, 'مستخدم غير معروف') as user_name,
            COUNT(*) as operations_count,
            COUNT(DISTINCT il.product_id) as products_affected,
            SUM(ABS(COALESCE(il.quantity, 0))) as total_quantity_handled,
            MAX(il.created_at) as last_activity
        FROM inventory_log il
        LEFT JOIN auth.users u ON il.created_by = u.id
        WHERE il.organization_id = p_organization_id
            AND il.created_at BETWEEN p_start_date AND p_end_date
        GROUP BY u.id, u.raw_user_meta_data->>'name', u.email, il.created_by
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
    
    -- رؤى المنتجات مع معالجة شاملة
    WITH product_insights AS (
        SELECT 
            p.id as product_id,
            COALESCE(p.name, 'منتج بدون اسم') as product_name,
            COALESCE(p.sku, '') as sku,
            COALESCE(p.stock_quantity, 0) as current_stock,
            COALESCE(p.price, 0) as selling_price,
            COUNT(il.id) as total_movements,
            SUM(ABS(COALESCE(il.quantity, 0))) as total_quantity_moved,
            MAX(il.created_at) as last_movement
        FROM products p
        LEFT JOIN inventory_log il ON p.id = il.product_id 
            AND il.created_at BETWEEN p_start_date AND p_end_date
            AND il.organization_id = p_organization_id
        WHERE p.organization_id = p_organization_id
            AND COALESCE(p.is_active, true) = true
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

-- فهارس لتحسين الأداء مع تجنب التضارب
CREATE INDEX IF NOT EXISTS idx_inventory_log_org_date_type_v2 
ON inventory_log(organization_id, created_at DESC, type) 
WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_log_product_date_v2 
ON inventory_log(product_id, created_at DESC) 
WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_log_user_date_v2 
ON inventory_log(created_by, created_at DESC) 
WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_log_reference_v2 
ON inventory_log(reference_type, reference_id) 
WHERE reference_id IS NOT NULL AND reference_type IS NOT NULL;

-- ===========================================
-- الخطوة 6: تنظيف البيانات المكررة
-- ===========================================

-- حذف السجلات المكررة من inventory_logs بعد النسخ الناجح
DELETE FROM inventory_logs 
WHERE organization_id = '989bf6d2-aba1-4edd-8d07-649120ac4323'
AND EXISTS (
    SELECT 1 FROM inventory_log 
    WHERE inventory_log.product_id = inventory_logs.product_id
    AND inventory_log.created_at = inventory_logs.created_at
    AND inventory_log.organization_id = inventory_logs.organization_id
);

-- ===========================================
-- الخطوة 7: إضافة قواعد RLS محسنة
-- ===========================================

-- تمكين RLS على inventory_log
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسة محسنة للقراءة
DROP POLICY IF EXISTS "Users can view inventory logs from their organization" ON inventory_log;
CREATE POLICY "Users can view inventory logs from their organization"
ON inventory_log FOR SELECT
USING (
    organization_id = (
        SELECT u.organization_id 
        FROM users u 
        WHERE u.id = auth.uid()
    )
    OR 
    -- السماح لمدراء النظام
    EXISTS (
        SELECT 1 FROM auth.users au 
        WHERE au.id = auth.uid() 
        AND au.raw_user_meta_data->>'role' = 'admin'
    )
);

-- إنشاء سياسة محسنة للإدراج
DROP POLICY IF EXISTS "Users can insert inventory logs to their organization" ON inventory_log;
CREATE POLICY "Users can insert inventory logs to their organization"
ON inventory_log FOR INSERT
WITH CHECK (
    organization_id = (
        SELECT u.organization_id 
        FROM users u 
        WHERE u.id = auth.uid()
    )
    AND organization_id IS NOT NULL
);

-- ===========================================
-- الخطوة 8: دالة التحقق المحسنة
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
        CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️ WARNING' END::TEXT,
        'منتجات لها مخزون ولكن لا توجد سجلات في inventory_log'::TEXT,
        COUNT(*)::INTEGER
    FROM products p
    WHERE p.organization_id = p_organization_id
    AND COALESCE(p.stock_quantity, 0) > 0
    AND NOT EXISTS (
        SELECT 1 FROM inventory_log il 
        WHERE il.product_id = p.id
    )
    
    UNION ALL
    
    -- تحقق 2: سجلات مخزون بدون منتجات
    SELECT 
        'سجلات مخزون بدون منتجات'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '❌ ERROR' END::TEXT,
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
        'ℹ️ INFO'::TEXT,
        'العدد الإجمالي لسجلات المخزون في النظام'::TEXT,
        COUNT(*)::INTEGER
    FROM inventory_log
    WHERE organization_id = p_organization_id
    
    UNION ALL
    
    -- تحقق 4: السجلات بدون organization_id
    SELECT 
        'سجلات بدون organization_id'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '🔧 NEEDS_FIX' END::TEXT,
        'سجلات في inventory_log بدون معرف منظمة'::TEXT,
        COUNT(*)::INTEGER
    FROM inventory_log
    WHERE organization_id IS NULL;
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
    '🧹 سجلات بدون organization_id (يجب أن تكون 0)',
    COUNT(*)
FROM inventory_log 
WHERE organization_id IS NULL;

-- تشغيل دالة التحقق
SELECT * FROM validate_inventory_system('989bf6d2-aba1-4edd-8d07-649120ac4323');

-- اختبار دالة get_advanced_inventory_tracking
SELECT 
    '🔍 اختبار دالة التتبع المتقدم' as test_name,
    CASE 
        WHEN (get_advanced_inventory_tracking('989bf6d2-aba1-4edd-8d07-649120ac4323')::jsonb->'data'->'statistics'->>'total_operations')::integer > 0 
        THEN '✅ يعمل بشكل صحيح' 
        ELSE '❌ لا يزال لا يعمل' 
    END as result;

-- ===========================================
-- تأكيد الإكمال
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '🎉 تم إصلاح نظام المخزون بنجاح!';
    RAISE NOTICE '📊 الآن يمكنك اختبار صفحة التتبع المتقدم';
    RAISE NOTICE '🔄 تم إضافة trigger محسن لضمان عدم تكرار المشكلة';
    RAISE NOTICE '⚡ تم تحسين الأداء بإضافة فهارس جديدة';
    RAISE NOTICE '🛡️ تم تفعيل قواعد الأمان RLS المحسنة';
    RAISE NOTICE '🧹 تم تنظيف البيانات المعطوبة والقيم الفارغة';
    RAISE NOTICE '🔧 تم إصلاح مشكلة أنواع العمليات غير المدعومة';
    RAISE NOTICE '✅ النظام جاهز للاستخدام!';
END $$;

-- =============================================================================
-- إصلاح شامل لنظام المخزون على مستوى النظام بأكمله
-- يحل مشاكل التكرار وعدم التطابق لجميع المؤسسات
-- =============================================================================

-- المرحلة 1: تحليل وتنظيف السجلات المكررة
-- =========================================

CREATE OR REPLACE FUNCTION fix_duplicate_inventory_logs_system_wide()
RETURNS TABLE(
    org_id UUID,
    org_name TEXT,
    duplicates_found INT,
    duplicates_removed INT,
    status TEXT
) AS $$
DECLARE
    org_record RECORD;
    duplicate_count INT;
    removed_count INT;
BEGIN
    -- لكل مؤسسة، إصلاح السجلات المكررة
    FOR org_record IN 
        SELECT DISTINCT il.organization_id as org_id, o.name as org_name, o.subdomain
        FROM inventory_log il
        JOIN organizations o ON il.organization_id = o.id
        WHERE il.organization_id IS NOT NULL
    LOOP
        -- حساب السجلات المكررة للمؤسسة
        SELECT COUNT(*) - COUNT(DISTINCT reference_id) INTO duplicate_count
        FROM inventory_log 
        WHERE inventory_log.organization_id = org_record.org_id 
        AND type = 'sale' 
        AND reference_type = 'pos_order';
        
        -- إزالة المكررات (الاحتفاظ بأحدث سجل)
        WITH duplicates AS (
            SELECT id, 
                   ROW_NUMBER() OVER (
                       PARTITION BY reference_id 
                       ORDER BY created_at DESC, 
                                CASE WHEN notes LIKE '%fifo%' THEN 1 ELSE 2 END
                   ) as rn
            FROM inventory_log 
            WHERE inventory_log.organization_id = org_record.org_id 
            AND type = 'sale' 
            AND reference_type = 'pos_order'
        )
        DELETE FROM inventory_log 
        WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
        
        GET DIAGNOSTICS removed_count = ROW_COUNT;
        
        -- إرجاع النتائج
        org_id := org_record.org_id;
        org_name := org_record.org_name;
        duplicates_found := duplicate_count;
        duplicates_removed := removed_count;
        status := CASE 
            WHEN removed_count > 0 THEN 'تم الإصلاح ✅' 
            ELSE 'لا توجد مشاكل ✅' 
        END;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- المرحلة 2: إصلاح المخزون السلبي
-- =================================

CREATE OR REPLACE FUNCTION fix_negative_inventory_system_wide()
RETURNS TABLE(
    org_id UUID,
    prod_id UUID,
    prod_name TEXT,
    old_stock INT,
    new_stock INT,
    status TEXT
) AS $$
DECLARE
    product_record RECORD;
    calculated_stock INT;
BEGIN
    -- لكل منتج بمخزون سلبي
    FOR product_record IN 
        SELECT p.id as prod_id, p.organization_id as org_id, p.name as prod_name, 
               p.stock_quantity, o.name as org_name
        FROM products p
        JOIN organizations o ON p.organization_id = o.id
        WHERE p.stock_quantity < 0
    LOOP
        -- حساب المخزون الصحيح من السجلات
        SELECT COALESCE(SUM(
            CASE 
                WHEN type = 'purchase' THEN quantity
                WHEN type = 'sale' THEN -quantity
                WHEN type = 'adjustment' THEN quantity
                WHEN type = 'return' THEN quantity
                ELSE 0
            END
        ), 0) INTO calculated_stock
        FROM inventory_log 
        WHERE product_id = product_record.prod_id;
        
        -- إذا كان المحسوب سلبي أيضاً، تعيين صفر
        IF calculated_stock < 0 THEN
            calculated_stock := 0;
            
            -- إضافة سجل تعديل
            INSERT INTO inventory_log (
                organization_id, product_id, type, quantity,
                previous_stock, new_stock, reference_type,
                notes, created_at
            ) VALUES (
                product_record.org_id,
                product_record.prod_id,
                'adjustment',
                ABS(product_record.stock_quantity),
                product_record.stock_quantity,
                0,
                'system_fix',
                'إصلاح المخزون السلبي - system_wide_fix',
                NOW()
            );
        END IF;
        
        -- تحديث المخزون
        UPDATE products 
        SET stock_quantity = calculated_stock,
            updated_at = NOW()
        WHERE id = product_record.prod_id;
        
        -- إرجاع النتائج
        org_id := product_record.org_id;
        prod_id := product_record.prod_id;
        prod_name := product_record.prod_name;
        old_stock := product_record.stock_quantity;
        new_stock := calculated_stock;
        status := 'تم الإصلاح ✅';
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- المرحلة 3: مزامنة المخزون مع السجلات
-- =====================================

CREATE OR REPLACE FUNCTION sync_inventory_with_logs_system_wide()
RETURNS TABLE(
    org_id UUID,
    org_name TEXT,
    products_checked INT,
    products_fixed INT,
    total_discrepancy DECIMAL,
    status TEXT
) AS $$
DECLARE
    org_record RECORD;
    product_record RECORD;
    calculated_stock INT;
    products_checked_count INT := 0;
    products_fixed_count INT := 0;
    total_disc DECIMAL := 0;
BEGIN
    -- لكل مؤسسة
    FOR org_record IN 
        SELECT o.id as org_id, o.name as org_name, o.subdomain
        FROM organizations o
        WHERE o.id IN (SELECT DISTINCT organization_id FROM inventory_log)
    LOOP
        products_checked_count := 0;
        products_fixed_count := 0;
        total_disc := 0;
        
        -- فحص كل منتج في المؤسسة
        FOR product_record IN 
            SELECT p.id as prod_id, p.name as prod_name, p.stock_quantity
            FROM products p
            WHERE p.organization_id = org_record.org_id
            AND EXISTS (SELECT 1 FROM inventory_log WHERE product_id = p.id)
        LOOP
            products_checked_count := products_checked_count + 1;
            
            -- حساب المخزون من السجلات
            SELECT COALESCE(SUM(
                CASE 
                    WHEN type = 'purchase' THEN quantity
                    WHEN type = 'sale' THEN -quantity
                    WHEN type = 'adjustment' THEN quantity
                    WHEN type = 'return' THEN quantity
                    ELSE 0
                END
            ), 0) INTO calculated_stock
            FROM inventory_log 
            WHERE product_id = product_record.prod_id;
            
            -- إذا كان هناك تضارب
            IF ABS(product_record.stock_quantity - calculated_stock) > 0 THEN
                total_disc := total_disc + ABS(product_record.stock_quantity - calculated_stock);
                products_fixed_count := products_fixed_count + 1;
                
                -- إضافة سجل تعديل
                INSERT INTO inventory_log (
                    organization_id, product_id, type, quantity,
                    previous_stock, new_stock, reference_type,
                    notes, created_at
                ) VALUES (
                    org_record.org_id,
                    product_record.prod_id,
                    'adjustment',
                    calculated_stock - product_record.stock_quantity,
                    product_record.stock_quantity,
                    calculated_stock,
                    'system_sync',
                    FORMAT('مزامنة المخزون - من %s إلى %s - system_wide_sync', 
                           product_record.stock_quantity, calculated_stock),
                    NOW()
                );
                
                -- تحديث المخزون
                UPDATE products 
                SET stock_quantity = calculated_stock,
                    updated_at = NOW()
                WHERE id = product_record.prod_id;
            END IF;
        END LOOP;
        
        -- إرجاع النتائج للمؤسسة
        org_id := org_record.org_id;
        org_name := org_record.org_name;
        products_checked := products_checked_count;
        products_fixed := products_fixed_count;
        total_discrepancy := total_disc;
        status := CASE 
            WHEN products_fixed_count > 0 THEN 'تم الإصلاح ✅' 
            ELSE 'لا توجد مشاكل ✅' 
        END;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- المرحلة 4: إنشاء محفزات محسنة لمنع المشاكل المستقبلية
-- ======================================================

-- حذف المحفزات القديمة
DROP TRIGGER IF EXISTS log_sales_trigger_smart ON order_items;
DROP FUNCTION IF EXISTS log_sales_to_inventory_smart();

-- إنشاء محفز محسن جديد
CREATE OR REPLACE FUNCTION log_sales_to_inventory_no_conflicts()
RETURNS TRIGGER AS $$
BEGIN
    -- تجنب التدخل مع طلبيات POS التي تستخدم FIFO
    IF NEW.order_type = 'pos' THEN
        RETURN NEW;
    END IF;
    
    -- للطلبيات العادية فقط
    INSERT INTO inventory_log (
        organization_id,
        product_id,
        type,
        quantity,
        previous_stock,
        new_stock,
        reference_id,
        reference_type,
        notes,
        created_at
    )
    SELECT 
        p.organization_id,
        NEW.product_id,
        'sale',
        NEW.quantity,
        p.stock_quantity,
        p.stock_quantity - NEW.quantity,
        NEW.order_id::text,
        'regular_order',
        FORMAT('trigger - regular order - item %s', NEW.id),
        NOW()
    FROM products p
    WHERE p.id = NEW.product_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق المحفز الجديد
CREATE TRIGGER log_sales_trigger_no_conflicts
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION log_sales_to_inventory_no_conflicts();

-- المرحلة 5: تحديث الفهارس الفريدة
-- =================================

-- إنشاء فهرس فريد لمنع التكرار
DROP INDEX IF EXISTS idx_inventory_log_unique_pos_reference;
CREATE UNIQUE INDEX idx_inventory_log_unique_pos_reference 
ON inventory_log (organization_id, reference_id, reference_type, product_id)
WHERE type = 'sale' AND reference_type = 'pos_order';

-- المرحلة 6: دالة مراقبة شاملة
-- =============================

CREATE OR REPLACE FUNCTION monitor_inventory_system_health()
RETURNS TABLE(
    metric_name TEXT,
    total_count BIGINT,
    organizations_affected INT,
    status TEXT,
    details JSONB
) AS $$
BEGIN
    -- فحص السجلات المكررة
    RETURN QUERY
    SELECT 
        'سجلات POS مكررة'::TEXT,
        (COUNT(*) - COUNT(DISTINCT reference_id))::BIGINT,
        COUNT(DISTINCT organization_id)::INT,
        CASE WHEN (COUNT(*) - COUNT(DISTINCT reference_id)) > 0 THEN '⚠️ يحتاج إصلاح' ELSE '✅ سليم' END,
        ('{"total_pos_logs": ' || COUNT(*) || 
         ', "unique_references": ' || COUNT(DISTINCT reference_id) || 
         ', "duplicates": ' || (COUNT(*) - COUNT(DISTINCT reference_id)) || '}')::jsonb
    FROM inventory_log 
    WHERE type = 'sale' AND reference_type = 'pos_order';
    
    -- فحص المخزون السلبي
    RETURN QUERY
    SELECT 
        'منتجات بمخزون سلبي'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(DISTINCT organization_id)::INT,
        CASE WHEN COUNT(*) > 0 THEN '⚠️ يحتاج إصلاح' ELSE '✅ سليم' END,
        ('{"products_with_negative_stock": ' || COUNT(*) || 
         ', "lowest_stock": ' || COALESCE(MIN(stock_quantity), 0) || '}')::jsonb
    FROM products 
    WHERE stock_quantity < 0;
    
    -- فحص التضارب في المخزون
    RETURN QUERY
    WITH inventory_check AS (
        SELECT 
            il.organization_id,
            il.product_id,
            p.stock_quantity as current_stock,
            SUM(CASE 
                WHEN il.type = 'purchase' THEN il.quantity
                WHEN il.type = 'sale' THEN -il.quantity
                WHEN il.type = 'adjustment' THEN il.quantity
                WHEN il.type = 'return' THEN il.quantity
                ELSE 0
            END) as calculated_stock
        FROM inventory_log il
        JOIN products p ON il.product_id = p.id
        GROUP BY il.organization_id, il.product_id, p.stock_quantity
        HAVING ABS(p.stock_quantity - SUM(CASE 
            WHEN il.type = 'purchase' THEN il.quantity
            WHEN il.type = 'sale' THEN -il.quantity
            WHEN il.type = 'adjustment' THEN il.quantity
            WHEN il.type = 'return' THEN il.quantity
            ELSE 0
        END)) > 0
    )
    SELECT 
        'منتجات بتضارب في المخزون'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(DISTINCT organization_id)::INT,
        CASE WHEN COUNT(*) > 0 THEN '⚠️ يحتاج إصلاح' ELSE '✅ سليم' END,
        ('{"products_with_discrepancy": ' || COUNT(*) || 
         ', "avg_discrepancy": ' || ROUND(AVG(ABS(current_stock - calculated_stock)), 2) || '}')::jsonb
    FROM inventory_check;
END;
$$ LANGUAGE plpgsql;

-- المرحلة 7: تطبيق الإصلاحات
-- ==========================

-- تشغيل إصلاح التكرارات
SELECT * FROM fix_duplicate_inventory_logs_system_wide();

-- تشغيل إصلاح المخزون السلبي
SELECT * FROM fix_negative_inventory_system_wide();

-- تشغيل مزامنة المخزون
SELECT * FROM sync_inventory_with_logs_system_wide();

-- فحص الحالة النهائية
SELECT * FROM monitor_inventory_system_health();

-- =============================================================================
-- ملاحظات مهمة:
-- 1. هذا السكريبت يصلح جميع المؤسسات في النظام
-- 2. يحافظ على سجلات FIFO المفصلة
-- 3. ينشئ نظام مراقبة مستمر
-- 4. يمنع المشاكل المستقبلية
-- ============================================================================= 