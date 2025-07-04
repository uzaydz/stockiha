-- =================================================================
-- 🚀 مجموعة دوال محسنة لجلب بيانات نقطة البيع في أجزاء منفصلة
-- تم تقسيمها لتجنب مشكلة حد 100 معامل في PostgreSQL
-- =================================================================

-- حذف الدوال إذا كانت موجودة مسبقاً
DROP FUNCTION IF EXISTS get_pos_products_data(UUID);
DROP FUNCTION IF EXISTS get_pos_business_data(UUID);
DROP FUNCTION IF EXISTS get_pos_stats_data(UUID);
DROP FUNCTION IF EXISTS get_complete_pos_data(UUID);
DROP FUNCTION IF EXISTS get_complete_pos_data_optimized(UUID);

-- =================================================================
-- 1️⃣ دالة جلب بيانات المنتجات والمتغيرات
-- =================================================================
CREATE OR REPLACE FUNCTION get_pos_products_data(p_organization_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المؤسسة غير موجودة',
            'error_code', 'ORGANIZATION_NOT_FOUND'
        );
    END IF;

    -- جلب المنتجات مع المتغيرات (مبسط لتجنب مشكلة 100 معامل)
    WITH product_variants AS (
        SELECT 
            p.id,
            p.name,
            p.description,
            p.price,
            p.compare_at_price,
            p.purchase_price,
            p.sku,
            p.barcode,
            p.category,
            p.subcategory,
            p.brand,
            p.images,
            p.thumbnail_image,
            p.stock_quantity,
            p.has_variants,
            p.is_active,
            p.category_id,
            p.subcategory_id,
            p.min_stock_level,
            p.wholesale_price,
            p.allow_retail,
            p.allow_wholesale,
            p.is_sold_by_unit,
            p.unit_type,
            p.use_variant_prices,
            -- حساب المخزون الفعلي
            CASE 
                WHEN p.has_variants = true THEN 
                    COALESCE((SELECT SUM(pc.quantity) FROM product_colors pc WHERE pc.product_id = p.id), 0)
                ELSE p.stock_quantity 
            END as actual_stock_quantity,
            -- جلب الألوان مع الأحجام
            COALESCE(
                (SELECT json_agg(
                    json_build_object(
                        'id', pc.id,
                        'product_id', pc.product_id,
                        'name', pc.name,
                        'color_code', pc.color_code,
                        'image_url', pc.image_url,
                        'quantity', pc.quantity,
                        'price', pc.price,
                        'barcode', pc.barcode,
                        'is_default', pc.is_default,
                        'variant_number', pc.variant_number,
                        'purchase_price', pc.purchase_price,
                        'sizes', COALESCE(
                            (SELECT json_agg(
                                json_build_object(
                                    'id', ps.id,
                                    'color_id', ps.color_id,
                                    'product_id', ps.product_id,
                                    'size_name', ps.size_name,
                                    'quantity', ps.quantity,
                                    'price', ps.price,
                                    'barcode', ps.barcode,
                                    'is_default', ps.is_default,
                                    'purchase_price', ps.purchase_price
                                )
                            ) FROM product_sizes ps WHERE ps.color_id = pc.id),
                            '[]'::json
                        )
                    )
                ) FROM product_colors pc WHERE pc.product_id = p.id),
                '[]'::json
            ) as colors
        FROM products p
        WHERE p.organization_id = p_organization_id 
            AND p.is_active = true
    )
    SELECT json_build_object(
        'success', true,
        'data', json_agg(
            json_build_object(
                'id', pv.id,
                'name', pv.name,
                'description', pv.description,
                'price', pv.price,
                'compare_at_price', pv.compare_at_price,
                'purchase_price', pv.purchase_price,
                'sku', pv.sku,
                'barcode', pv.barcode,
                'category', pv.category,
                'subcategory', pv.subcategory,
                'brand', pv.brand,
                'images', pv.images,
                'thumbnail_image', pv.thumbnail_image,
                'stock_quantity', pv.stock_quantity,
                'actual_stock_quantity', pv.actual_stock_quantity,
                'has_variants', pv.has_variants,
                'is_active', pv.is_active,
                'category_id', pv.category_id,
                'subcategory_id', pv.subcategory_id,
                'min_stock_level', pv.min_stock_level,
                'wholesale_price', pv.wholesale_price,
                'allow_retail', pv.allow_retail,
                'allow_wholesale', pv.allow_wholesale,
                'is_sold_by_unit', pv.is_sold_by_unit,
                'unit_type', pv.unit_type,
                'use_variant_prices', pv.use_variant_prices,
                'colors', pv.colors
            )
        )
    ) INTO result
    FROM product_variants pv;

    RETURN result;
END;
$$;

-- =================================================================
-- 2️⃣ دالة جلب البيانات التجارية (العملاء، الطلبات، التطبيقات)
-- =================================================================
CREATE OR REPLACE FUNCTION get_pos_business_data(p_organization_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    customers_data JSON;
    recent_orders_data JSON;
    organization_apps_data JSON;
    product_categories_data JSON;
BEGIN
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المؤسسة غير موجودة',
            'error_code', 'ORGANIZATION_NOT_FOUND'
        );
    END IF;

    -- جلب العملاء
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'name', c.name,
            'email', c.email,
            'phone', c.phone,
            'created_at', c.created_at,
            'updated_at', c.updated_at
        )
    ) INTO customers_data
    FROM customers c
    WHERE c.organization_id = p_organization_id
    ORDER BY c.created_at DESC
    LIMIT 100;

    -- جلب الطلبات الحديثة
    SELECT json_agg(
        json_build_object(
            'id', o.id,
            'customer_id', o.customer_id,
            'total', o.total,
            'status', o.status,
            'payment_method', o.payment_method,
            'payment_status', o.payment_status,
            'created_at', o.created_at,
            'employee_id', o.employee_id,
            'pos_order_type', o.pos_order_type
        )
    ) INTO recent_orders_data
    FROM orders o
    WHERE o.organization_id = p_organization_id
        AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY o.created_at DESC
    LIMIT 50;

    -- جلب تطبيقات المؤسسة
    SELECT json_agg(
        json_build_object(
            'id', oa.id,
            'app_id', oa.app_id,
            'is_enabled', oa.is_enabled,
            'configuration', oa.configuration,
            'installed_at', oa.installed_at
        )
    ) INTO organization_apps_data
    FROM organization_apps oa
    WHERE oa.organization_id = p_organization_id;

    -- جلب فئات المنتجات
    SELECT json_agg(
        json_build_object(
            'id', pc.id,
            'name', pc.name,
            'description', pc.description,
            'icon', pc.icon,
            'color', pc.color,
            'is_active', pc.is_active,
            'sort_order', pc.sort_order
        )
    ) INTO product_categories_data
    FROM product_categories pc
    WHERE pc.organization_id = p_organization_id
        AND pc.is_active = true
    ORDER BY pc.sort_order, pc.name;

    -- تجميع النتائج
    SELECT json_build_object(
        'success', true,
        'data', json_build_object(
            'customers', COALESCE(customers_data, '[]'::json),
            'recent_orders', COALESCE(recent_orders_data, '[]'::json),
            'organization_apps', COALESCE(organization_apps_data, '[]'::json),
            'product_categories', COALESCE(product_categories_data, '[]'::json)
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- =================================================================
-- 3️⃣ دالة جلب الإحصائيات والبيانات التحليلية
-- =================================================================
CREATE OR REPLACE FUNCTION get_pos_stats_data(p_organization_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    inventory_stats JSON;
    order_stats JSON;
    pos_settings_data JSON;
BEGIN
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المؤسسة غير موجودة',
            'error_code', 'ORGANIZATION_NOT_FOUND'
        );
    END IF;

    -- حساب إحصائيات المخزون
    SELECT json_build_object(
        'total_products', COUNT(*),
        'out_of_stock_products', COUNT(*) FILTER (WHERE 
            CASE 
                WHEN p.has_variants = true THEN 
                    COALESCE((SELECT SUM(pc.quantity) FROM product_colors pc WHERE pc.product_id = p.id), 0) = 0
                ELSE p.stock_quantity = 0 
            END
        ),
        'low_stock_products', COUNT(*) FILTER (WHERE 
            p.min_stock_level IS NOT NULL AND 
            CASE 
                WHEN p.has_variants = true THEN 
                    COALESCE((SELECT SUM(pc.quantity) FROM product_colors pc WHERE pc.product_id = p.id), 0) <= p.min_stock_level
                ELSE p.stock_quantity <= p.min_stock_level 
            END
        ),
        'total_stock_value', COALESCE(SUM(
            CASE 
                WHEN p.has_variants = true THEN 
                    COALESCE((SELECT SUM(pc.quantity * COALESCE(pc.price, p.price)) FROM product_colors pc WHERE pc.product_id = p.id), 0)
                ELSE p.stock_quantity * p.price 
            END
        ), 0)
    ) INTO inventory_stats
    FROM products p
    WHERE p.organization_id = p_organization_id 
        AND p.is_active = true;

    -- حساب إحصائيات الطلبات
    SELECT json_build_object(
        'total_pos_orders', COUNT(*) FILTER (WHERE o.pos_order_type IS NOT NULL),
        'today_orders', COUNT(*) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE),
        'total_sales', COALESCE(SUM(o.total), 0),
        'today_sales', COALESCE(SUM(o.total) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE), 0),
        'this_week_sales', COALESCE(SUM(o.total) FILTER (WHERE o.created_at >= CURRENT_DATE - INTERVAL '7 days'), 0),
        'this_month_sales', COALESCE(SUM(o.total) FILTER (WHERE DATE_TRUNC('month', o.created_at) = DATE_TRUNC('month', CURRENT_DATE)), 0)
    ) INTO order_stats
    FROM orders o
    WHERE o.organization_id = p_organization_id
        AND o.status = 'completed';

    -- جلب إعدادات POS (إذا كانت موجودة)
    SELECT json_build_object(
        'auto_print_receipt', COALESCE(ps.auto_print_receipt, false),
        'default_payment_method', COALESCE(ps.default_payment_method, 'cash'),
        'allow_partial_payments', COALESCE(ps.allow_partial_payments, true),
        'require_customer_info', COALESCE(ps.require_customer_info, false),
        'tax_rate', COALESCE(ps.tax_rate, 0),
        'currency', COALESCE(ps.currency, 'DZD')
    ) INTO pos_settings_data
    FROM pos_settings ps
    WHERE ps.organization_id = p_organization_id
    LIMIT 1;

    -- تجميع النتائج
    SELECT json_build_object(
        'success', true,
        'data', json_build_object(
            'inventory_stats', inventory_stats,
            'order_stats', order_stats,
            'pos_settings', COALESCE(pos_settings_data, json_build_object(
                'auto_print_receipt', false,
                'default_payment_method', 'cash',
                'allow_partial_payments', true,
                'require_customer_info', false,
                'tax_rate', 0,
                'currency', 'DZD'
            ))
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- =================================================================
-- 4️⃣ دالة رئيسية موحدة تجمع كل البيانات
-- =================================================================
CREATE OR REPLACE FUNCTION get_complete_pos_data_optimized(p_organization_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    products_result JSON;
    business_result JSON;
    stats_result JSON;
    execution_time_start TIMESTAMPTZ;
    execution_time_ms INTEGER;
BEGIN
    execution_time_start := now();
    
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المؤسسة غير موجودة',
            'error_code', 'ORGANIZATION_NOT_FOUND'
        );
    END IF;

    -- جلب البيانات من الدوال المنفصلة
    SELECT get_pos_products_data(p_organization_id) INTO products_result;
    SELECT get_pos_business_data(p_organization_id) INTO business_result;
    SELECT get_pos_stats_data(p_organization_id) INTO stats_result;

    -- التحقق من نجاح جميع الاستدعاءات
    IF (products_result->>'success')::boolean = false THEN
        RETURN products_result;
    END IF;
    
    IF (business_result->>'success')::boolean = false THEN
        RETURN business_result;
    END IF;
    
    IF (stats_result->>'success')::boolean = false THEN
        RETURN stats_result;
    END IF;

    -- حساب وقت التنفيذ
    execution_time_ms := EXTRACT(EPOCH FROM (now() - execution_time_start)) * 1000;

    -- تجميع النتائج النهائية
    SELECT json_build_object(
        'success', true,
        'data', json_build_object(
            'products', products_result->'data',
            'customers', business_result->'data'->'customers',
            'recent_orders', business_result->'data'->'recent_orders',
            'organization_apps', business_result->'data'->'organization_apps',
            'product_categories', business_result->'data'->'product_categories',
            'inventory_stats', stats_result->'data'->'inventory_stats',
            'order_stats', stats_result->'data'->'order_stats',
            'pos_settings', stats_result->'data'->'pos_settings'
        ),
        'meta', json_build_object(
            'execution_time_ms', execution_time_ms,
            'data_timestamp', now(),
            'organization_id', p_organization_id,
            'version', '2.0'
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- =================================================================
-- 🔧 منح الصلاحيات اللازمة
-- =================================================================
GRANT EXECUTE ON FUNCTION get_pos_products_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_business_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_stats_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_complete_pos_data_optimized(UUID) TO authenticated;

-- =================================================================
-- 📝 إضافة تعليقات للدوال
-- =================================================================
COMMENT ON FUNCTION get_pos_products_data(UUID) IS 'جلب بيانات المنتجات والمتغيرات لنقطة البيع';
COMMENT ON FUNCTION get_pos_business_data(UUID) IS 'جلب البيانات التجارية (العملاء، الطلبات، التطبيقات)';
COMMENT ON FUNCTION get_pos_stats_data(UUID) IS 'جلب الإحصائيات والبيانات التحليلية';
COMMENT ON FUNCTION get_complete_pos_data_optimized(UUID) IS 'دالة رئيسية موحدة تجمع جميع بيانات نقطة البيع المحسنة';

-- =================================================================
-- 🚀 إنشاء دالة مبسطة للاستدعاء السريع (اختيارية)
-- =================================================================
CREATE OR REPLACE FUNCTION get_pos_data_fast(p_organization_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- استدعاء الدالة الرئيسية مع إضافة طبقة حماية إضافية
    IF p_organization_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'معرف المؤسسة مطلوب');
    END IF;
    
    RETURN get_complete_pos_data_optimized(p_organization_id);
END;
$$;

GRANT EXECUTE ON FUNCTION get_pos_data_fast(UUID) TO authenticated;

-- =================================================================
-- ✅ تم إنشاء RPC شامل لجلب جميع بيانات POS بنجاح!
-- 
-- كيفية الاستخدام في Frontend:
-- 
-- const { data, error } = await supabase.rpc('get_complete_pos_data_optimized', {
--   p_organization_id: organizationId
-- });
-- 
-- أو باستخدام الدالة المبسطة:
-- const { data, error } = await supabase.rpc('get_pos_data_fast', {
--   p_organization_id: organizationId
-- });
-- ================================================================= 