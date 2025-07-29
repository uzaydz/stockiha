-- =================================================================
-- 🚀 دالة محسنة خفيفة لجلب بيانات POS مع pagination
-- الهدف: تقليل حجم البيانات وتحسين الأداء
-- =================================================================

-- حذف الدالة إذا كانت موجودة
DROP FUNCTION IF EXISTS get_pos_data_light_optimized(UUID, INTEGER, INTEGER, TEXT, TEXT);

-- =================================================================
-- 📊 دالة جلب المنتجات مع pagination محسن
-- =================================================================
CREATE OR REPLACE FUNCTION get_pos_products_paginated(
    p_organization_id UUID,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 50,
    p_search TEXT DEFAULT NULL,
    p_category_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_offset INTEGER;
    v_total_count INTEGER;
    v_products JSON;
BEGIN
    -- حساب الـ offset
    v_offset := (p_page - 1) * p_limit;
    
    -- حساب العدد الإجمالي أولاً
    SELECT COUNT(*) INTO v_total_count
    FROM products p
    WHERE p.organization_id = p_organization_id
        AND p.is_active = true
        AND (p_search IS NULL OR 
             p.name ILIKE '%' || p_search || '%' OR 
             p.sku ILIKE '%' || p_search || '%' OR 
             p.barcode = p_search)
        AND (p_category_id IS NULL OR p.category_id = p_category_id);

    -- جلب المنتجات مع البيانات الأساسية فقط
    WITH product_data AS (
        SELECT 
            p.id,
            p.name,
            p.price,
            p.compare_at_price,
            p.sku,
            p.barcode,
            p.category,
            p.thumbnail_image,
            p.stock_quantity,
            p.has_variants,
            p.category_id,
            p.wholesale_price,
            p.allow_retail,
            p.allow_wholesale,
            
            -- حساب المخزون الفعلي للمنتجات التي لها متغيرات
            CASE 
                WHEN p.has_variants = true THEN 
                    COALESCE(
                        (SELECT SUM(
                            CASE WHEN pc.has_sizes 
                            THEN (SELECT SUM(ps.quantity) FROM product_sizes ps WHERE ps.color_id = pc.id)
                            ELSE pc.quantity END
                        ) FROM product_colors pc WHERE pc.product_id = p.id), 
                        p.stock_quantity
                    )
                ELSE p.stock_quantity 
            END as actual_stock_quantity,
            
            -- جلب الألوان والمقاسات فقط للمنتجات التي لها متغيرات
            CASE 
                WHEN p.has_variants = true THEN
                    (SELECT json_agg(
                        json_build_object(
                            'id', pc.id,
                            'name', pc.name,
                            'code', pc.code,
                            'quantity', pc.quantity,
                            'has_sizes', pc.has_sizes,
                            'sizes', CASE 
                                WHEN pc.has_sizes THEN
                                    (SELECT json_agg(
                                        json_build_object(
                                            'id', ps.id,
                                            'name', ps.name,
                                            'quantity', ps.quantity,
                                            'price', ps.price
                                        )
                                    ) FROM product_sizes ps WHERE ps.color_id = pc.id)
                                ELSE '[]'::json
                            END
                        )
                    ) FROM product_colors pc WHERE pc.product_id = p.id)
                ELSE '[]'::json
            END as colors
            
        FROM products p
        WHERE p.organization_id = p_organization_id
            AND p.is_active = true
            AND (p_search IS NULL OR 
                 p.name ILIKE '%' || p_search || '%' OR 
                 p.sku ILIKE '%' || p_search || '%' OR 
                 p.barcode = p_search)
            AND (p_category_id IS NULL OR p.category_id = p_category_id)
        ORDER BY p.name ASC
        LIMIT p_limit OFFSET v_offset
    )
    SELECT json_agg(
        json_build_object(
            'id', pd.id,
            'name', pd.name,
            'price', pd.price,
            'compare_at_price', pd.compare_at_price,
            'sku', pd.sku,
            'barcode', pd.barcode,
            'category', pd.category,
            'thumbnail_image', pd.thumbnail_image,
            'stock_quantity', pd.stock_quantity,
            'actual_stock_quantity', pd.actual_stock_quantity,
            'has_variants', pd.has_variants,
            'category_id', pd.category_id,
            'wholesale_price', pd.wholesale_price,
            'allow_retail', pd.allow_retail,
            'allow_wholesale', pd.allow_wholesale,
            'colors', pd.colors
        )
    ) INTO v_products
    FROM product_data pd;
    
    -- إرجاع النتيجة مع معلومات الـ pagination
    RETURN json_build_object(
        'success', true,
        'data', json_build_object(
            'products', COALESCE(v_products, '[]'::json),
            'pagination', json_build_object(
                'current_page', p_page,
                'total_pages', CEIL(v_total_count::DECIMAL / p_limit),
                'total_count', v_total_count,
                'per_page', p_limit,
                'has_next_page', v_total_count > (p_page * p_limit),
                'has_prev_page', p_page > 1
            )
        ),
        'meta', json_build_object(
            'execution_time_ms', 0,
            'organization_id', p_organization_id
        )
    );
END;
$$;

-- =================================================================
-- 📈 دالة جلب البيانات الأساسية (بدون المنتجات)
-- =================================================================
CREATE OR REPLACE FUNCTION get_pos_essential_data(p_organization_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- جلب البيانات الأساسية فقط
    SELECT json_build_object(
        'success', true,
        'data', json_build_object(
            -- فئات المنتجات
            'product_categories', (
                SELECT json_agg(
                    json_build_object(
                        'id', pc.id,
                        'name', pc.name,
                        'slug', pc.slug,
                        'is_active', pc.is_active
                    )
                )
                FROM product_categories pc
                WHERE pc.organization_id = p_organization_id 
                    AND pc.is_active = true
                ORDER BY pc.name
                LIMIT 50
            ),
            
            -- العملاء الأساسيون فقط
            'customers', (
                SELECT json_agg(
                    json_build_object(
                        'id', c.id,
                        'name', c.name,
                        'phone', c.phone
                    )
                )
                FROM customers c
                WHERE c.organization_id = p_organization_id
                ORDER BY c.created_at DESC
                LIMIT 100
            ),
            
            -- المستخدمين النشطين فقط
            'users', (
                SELECT json_agg(
                    json_build_object(
                        'id', u.id,
                        'name', u.name,
                        'email', u.email,
                        'role', u.role
                    )
                )
                FROM users u
                WHERE u.organization_id = p_organization_id 
                    AND u.is_active = true
                ORDER BY u.name
                LIMIT 50
            ),
            
            -- إعدادات POS الأساسية
            'pos_settings', (
                SELECT json_build_object(
                    'id', ps.id,
                    'store_name', ps.store_name,
                    'currency_symbol', ps.currency_symbol,
                    'allow_price_edit', ps.allow_price_edit,
                    'require_manager_approval', ps.require_manager_approval
                )
                FROM pos_settings ps
                WHERE ps.organization_id = p_organization_id
                LIMIT 1
            ),
            
            -- إحصائيات سريعة
            'stats', json_build_object(
                'total_products', (
                    SELECT COUNT(*) FROM products 
                    WHERE organization_id = p_organization_id AND is_active = true
                ),
                'total_customers', (
                    SELECT COUNT(*) FROM customers 
                    WHERE organization_id = p_organization_id
                ),
                'total_categories', (
                    SELECT COUNT(*) FROM product_categories 
                    WHERE organization_id = p_organization_id AND is_active = true
                )
            )
        ),
        'meta', json_build_object(
            'execution_time_ms', 0,
            'organization_id', p_organization_id,
            'data_timestamp', NOW()
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- =================================================================
-- 🚀 الدالة الرئيسية المحسنة والخفيفة
-- =================================================================
CREATE OR REPLACE FUNCTION get_pos_data_light_optimized(
    p_organization_id UUID,
    p_products_page INTEGER DEFAULT 1,
    p_products_limit INTEGER DEFAULT 50,
    p_search TEXT DEFAULT NULL,
    p_category_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_essential_data JSON;
    v_products_data JSON;
    v_final_result JSON;
    execution_time_start TIMESTAMPTZ;
    execution_time_ms INTEGER;
BEGIN
    execution_time_start := now();
    
    -- التحقق من صحة المعاملات
    IF p_organization_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'معرف المؤسسة مطلوب',
            'error_code', 'INVALID_ORGANIZATION_ID'
        );
    END IF;
    
    -- جلب البيانات الأساسية
    SELECT get_pos_essential_data(p_organization_id) INTO v_essential_data;
    
    -- جلب المنتجات مع pagination
    SELECT get_pos_products_paginated(
        p_organization_id, 
        p_products_page, 
        p_products_limit, 
        p_search, 
        p_category_id
    ) INTO v_products_data;
    
    -- حساب وقت التنفيذ
    execution_time_ms := EXTRACT(EPOCH FROM (now() - execution_time_start)) * 1000;
    
    -- دمج النتائج
    SELECT json_build_object(
        'success', true,
        'data', json_build_object(
            'essential', (v_essential_data->'data'),
            'products', (v_products_data->'data'->'products'),
            'pagination', (v_products_data->'data'->'pagination')
        ),
        'meta', json_build_object(
            'execution_time_ms', execution_time_ms,
            'organization_id', p_organization_id,
            'data_timestamp', NOW(),
            'products_page', p_products_page,
            'products_limit', p_products_limit
        )
    ) INTO v_final_result;
    
    RETURN v_final_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'خطأ في دالة get_pos_data_light_optimized: ' || SQLERRM,
        'error_code', 'GENERAL_ERROR',
        'organization_id', p_organization_id
    );
END;
$$;

-- =================================================================
-- 🔧 منح الصلاحيات
-- =================================================================
GRANT EXECUTE ON FUNCTION get_pos_products_paginated(UUID, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_essential_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_data_light_optimized(UUID, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;

-- =================================================================
-- 📝 التعليقات
-- =================================================================
COMMENT ON FUNCTION get_pos_products_paginated(UUID, INTEGER, INTEGER, TEXT, TEXT) IS 'جلب المنتجات مع pagination محسن';
COMMENT ON FUNCTION get_pos_essential_data(UUID) IS 'جلب البيانات الأساسية لـ POS فقط';
COMMENT ON FUNCTION get_pos_data_light_optimized(UUID, INTEGER, INTEGER, TEXT, TEXT) IS 'دالة محسنة خفيفة لجلب بيانات POS مع pagination'; 