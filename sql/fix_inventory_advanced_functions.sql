-- =============================================================================
-- إصلاح دوال المخزون المتقدمة - نسخة محسنة ومصححة
-- =============================================================================

-- 1. حذف الدوال القديمة المعطلة وإعادة إنشائها
DROP FUNCTION IF EXISTS get_inventory_products_paginated(uuid, integer, integer, text, uuid, text, text, text, boolean, boolean);
DROP FUNCTION IF EXISTS search_inventory_autocomplete(uuid, text, integer);
DROP FUNCTION IF EXISTS get_inventory_advanced_stats(uuid);
DROP FUNCTION IF EXISTS bulk_update_inventory(uuid, jsonb, uuid);

-- =============================================================================
-- 1. دالة البحث التلقائي السريع للمخزون
-- =============================================================================
CREATE OR REPLACE FUNCTION search_inventory_autocomplete(
    p_organization_id UUID,
    p_search_query TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    sku TEXT,
    barcode TEXT,
    price NUMERIC,
    stock_quantity INTEGER,
    thumbnail_image TEXT,
    category TEXT,
    stock_status TEXT
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    -- تنظيف وتهيئة مصطلح البحث
    p_search_query := TRIM(COALESCE(p_search_query, ''));
    
    IF LENGTH(p_search_query) = 0 THEN
        -- إرجاع النتائج الأساسية بدون بحث
        RETURN QUERY
        SELECT 
            p.id,
            p.name,
            p.sku,
            p.barcode,
            p.price,
            p.stock_quantity,
            p.thumbnail_image,
            p.category,
            CASE 
                WHEN p.stock_quantity = 0 THEN 'out-of-stock'
                WHEN p.stock_quantity <= COALESCE(p.min_stock_level, 5) THEN 'low-stock'
                ELSE 'in-stock'
            END as stock_status
        FROM products p
        WHERE p.organization_id = p_organization_id 
        AND p.is_active = true
        ORDER BY p.name ASC
        LIMIT p_limit;
    ELSE
        -- البحث المتقدم مع إعطاء أولوية للمطابقة الدقيقة
        RETURN QUERY
        SELECT 
            p.id,
            p.name,
            p.sku,
            p.barcode,
            p.price,
            p.stock_quantity,
            p.thumbnail_image,
            p.category,
            CASE 
                WHEN p.stock_quantity = 0 THEN 'out-of-stock'
                WHEN p.stock_quantity <= COALESCE(p.min_stock_level, 5) THEN 'low-stock'
                ELSE 'in-stock'
            END as stock_status
        FROM products p
        WHERE p.organization_id = p_organization_id 
        AND p.is_active = true
        AND (
            p.name ILIKE '%' || p_search_query || '%' OR 
            p.sku ILIKE '%' || p_search_query || '%' OR 
            p.barcode ILIKE '%' || p_search_query || '%' OR
            COALESCE(p.description, '') ILIKE '%' || p_search_query || '%' OR
            to_tsvector('arabic', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('arabic', p_search_query)
        )
        ORDER BY 
            -- أولوية ترتيب النتائج
            CASE WHEN p.name ILIKE p_search_query || '%' THEN 1 ELSE 2 END,
            CASE WHEN p.sku = p_search_query THEN 1 ELSE 2 END,
            CASE WHEN p.barcode = p_search_query THEN 1 ELSE 2 END,
            p.name ASC
        LIMIT p_limit;
    END IF;
END;
$$;

-- =============================================================================
-- 2. دالة الحصول على المنتجات مع التصفح المتقدم - مصححة
-- =============================================================================
CREATE OR REPLACE FUNCTION get_inventory_products_paginated(
    p_organization_id UUID,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 50,
    p_search_query TEXT DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_stock_filter TEXT DEFAULT 'all',
    p_sort_by TEXT DEFAULT 'name',
    p_sort_order TEXT DEFAULT 'ASC',
    p_include_variants BOOLEAN DEFAULT true,
    p_include_inactive BOOLEAN DEFAULT false
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    description TEXT,
    price NUMERIC,
    compare_at_price NUMERIC,
    sku TEXT,
    barcode TEXT,
    category TEXT,
    category_id UUID,
    subcategory TEXT,
    subcategory_id UUID,
    brand TEXT,
    images TEXT[],
    thumbnail_image TEXT,
    stock_quantity INTEGER,
    min_stock_level INTEGER,
    reorder_level INTEGER,
    reorder_quantity INTEGER,
    is_digital BOOLEAN,
    is_new BOOLEAN,
    is_featured BOOLEAN,
    is_active BOOLEAN,
    has_variants BOOLEAN,
    use_sizes BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_inventory_update TIMESTAMPTZ,
    stock_status TEXT,
    stock_value NUMERIC,
    reorder_needed BOOLEAN,
    days_since_last_update INTEGER,
    variant_count INTEGER,
    total_variant_stock INTEGER,
    total_count BIGINT,
    filtered_count BIGINT
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
    v_offset INTEGER;
    v_base_where TEXT;
    v_search_where TEXT := '';
    v_category_where TEXT := '';
    v_stock_where TEXT := '';
    v_active_where TEXT := '';
    v_full_where TEXT;
    v_order_by TEXT;
    v_total_count BIGINT;
    v_filtered_count BIGINT;
BEGIN
    -- حساب الإزاحة
    v_offset := (p_page - 1) * p_page_size;
    
    -- الشروط الأساسية
    v_base_where := 'p.organization_id = $1';
    
    -- شرط الحالة النشطة
    IF NOT p_include_inactive THEN
        v_active_where := ' AND p.is_active = true';
    END IF;
    
    -- شرط البحث
    IF p_search_query IS NOT NULL AND LENGTH(TRIM(p_search_query)) > 0 THEN
        v_search_where := format(
            ' AND (
                p.name ILIKE %L OR 
                p.sku ILIKE %L OR 
                p.barcode ILIKE %L OR
                COALESCE(p.description, '''') ILIKE %L OR
                to_tsvector(''arabic'', p.name || '' '' || COALESCE(p.description, '''')) @@ plainto_tsquery(''arabic'', %L)
            )',
            '%' || p_search_query || '%',
            '%' || p_search_query || '%', 
            '%' || p_search_query || '%',
            '%' || p_search_query || '%',
            p_search_query
        );
    END IF;
    
    -- شرط الفئة
    IF p_category_id IS NOT NULL THEN
        v_category_where := format(' AND p.category_id = %L', p_category_id);
    END IF;
    
    -- شرط المخزون
    CASE p_stock_filter
        WHEN 'in-stock' THEN
            v_stock_where := ' AND p.stock_quantity > COALESCE(p.min_stock_level, 5)';
        WHEN 'low-stock' THEN 
            v_stock_where := ' AND p.stock_quantity > 0 AND p.stock_quantity <= COALESCE(p.min_stock_level, 5)';
        WHEN 'out-of-stock' THEN
            v_stock_where := ' AND p.stock_quantity = 0';
        WHEN 'reorder-needed' THEN
            v_stock_where := ' AND p.stock_quantity <= COALESCE(p.reorder_level, 10)';
        ELSE
            v_stock_where := '';
    END CASE;
    
    -- دمج جميع الشروط
    v_full_where := v_base_where || v_active_where || v_search_where || v_category_where || v_stock_where;
    
    -- شرط الترتيب
    CASE p_sort_by
        WHEN 'name' THEN v_order_by := 'p.name';
        WHEN 'stock' THEN v_order_by := 'p.stock_quantity';
        WHEN 'price' THEN v_order_by := 'p.price';
        WHEN 'created' THEN v_order_by := 'p.created_at';
        WHEN 'updated' THEN v_order_by := 'p.updated_at';
        WHEN 'last_inventory_update' THEN v_order_by := 'p.last_inventory_update';
        WHEN 'reorder_priority' THEN v_order_by := '(COALESCE(p.reorder_level, 10) - p.stock_quantity)';
        ELSE v_order_by := 'p.name';
    END CASE;
    
    v_order_by := v_order_by || ' ' || p_sort_order;
    
    -- حساب العدد الإجمالي والمفلتر
    EXECUTE format('
        SELECT 
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE %s) as filtered_count
        FROM products p 
        WHERE p.organization_id = $1 AND p.is_active = true',
        CASE WHEN LENGTH(v_search_where || v_category_where || v_stock_where) > 0 
             THEN 'true' || v_search_where || v_category_where || v_stock_where
             ELSE 'true' 
        END
    ) INTO v_total_count, v_filtered_count USING p_organization_id;
    
    -- الاستعلام الرئيسي
    RETURN QUERY EXECUTE format('
        SELECT 
            p.id,
            p.name,
            p.description,
            p.price,
            p.compare_at_price,
            p.sku,
            p.barcode,
            p.category,
            p.category_id,
            p.subcategory,
            p.subcategory_id,
            p.brand,
            p.images,
            p.thumbnail_image,
            p.stock_quantity,
            p.min_stock_level,
            p.reorder_level,
            p.reorder_quantity,
            p.is_digital,
            p.is_new,
            p.is_featured,
            p.is_active,
            p.has_variants,
            p.use_sizes,
            p.created_at,
            p.updated_at,
            p.last_inventory_update,
            
            -- حالة المخزون
            CASE 
                WHEN p.stock_quantity = 0 THEN ''out-of-stock''
                WHEN p.stock_quantity <= COALESCE(p.min_stock_level, 5) THEN ''low-stock''
                WHEN p.stock_quantity <= COALESCE(p.reorder_level, 10) THEN ''reorder-needed''
                ELSE ''in-stock''
            END as stock_status,
            
            -- قيمة المخزون
            (p.stock_quantity * COALESCE(p.purchase_price, p.price * 0.6))::NUMERIC as stock_value,
            
            -- هل يحتاج إعادة طلب
            (p.stock_quantity <= COALESCE(p.reorder_level, 10)) as reorder_needed,
            
            -- أيام منذ آخر تحديث
            EXTRACT(DAY FROM NOW() - COALESCE(p.last_inventory_update, p.updated_at))::INTEGER as days_since_last_update,
            
            -- عدد المتغيرات
            COALESCE(variants.variant_count, 0) as variant_count,
            COALESCE(variants.total_variant_stock, 0) as total_variant_stock,
            
            -- الأعداد الإحصائية
            $2::BIGINT as total_count,
            $3::BIGINT as filtered_count
            
        FROM products p
        LEFT JOIN (
            SELECT 
                pc.product_id,
                COUNT(pc.id)::INTEGER as variant_count,
                SUM(pc.quantity)::INTEGER as total_variant_stock
            FROM product_colors pc
            GROUP BY pc.product_id
        ) variants ON p.id = variants.product_id
        WHERE %s
        ORDER BY %s
        LIMIT $4 OFFSET $5',
        v_full_where,
        v_order_by
    ) USING p_organization_id, v_total_count, v_filtered_count, p_page_size, v_offset;
END;
$$;

-- =============================================================================
-- 3. دالة الإحصائيات المتقدمة للمخزون
-- =============================================================================
CREATE OR REPLACE FUNCTION get_inventory_advanced_stats(
    p_organization_id UUID
)
RETURNS TABLE(
    total_products BIGINT,
    active_products BIGINT,
    inactive_products BIGINT,
    in_stock_products BIGINT,
    low_stock_products BIGINT,
    out_of_stock_products BIGINT,
    reorder_needed_products BIGINT,
    total_stock_value NUMERIC,
    average_stock_level NUMERIC,
    products_with_variants BIGINT,
    total_variants BIGINT,
    recent_updates BIGINT,
    categories_count BIGINT,
    top_categories JSONB,
    stock_distribution JSONB
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH inventory_stats AS (
        SELECT 
            p.id,
            p.name,
            p.category,
            p.stock_quantity,
            p.min_stock_level,
            p.reorder_level,
            p.is_active,
            p.has_variants,
            p.last_inventory_update,
            COALESCE(p.purchase_price, p.price * 0.6) as cost_price,
            CASE 
                WHEN p.stock_quantity = 0 THEN 'out-of-stock'
                WHEN p.stock_quantity <= COALESCE(p.min_stock_level, 5) THEN 'low-stock'
                WHEN p.stock_quantity <= COALESCE(p.reorder_level, 10) THEN 'reorder-needed'
                ELSE 'in-stock'
            END as stock_status
        FROM products p
        WHERE p.organization_id = p_organization_id
    ),
    variant_stats AS (
        SELECT 
            COUNT(pc.id) as total_variants,
            COUNT(DISTINCT pc.product_id) as products_with_variants
        FROM product_colors pc
        INNER JOIN products p ON pc.product_id = p.id
        WHERE p.organization_id = p_organization_id
    ),
    category_stats AS (
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'category', s.category,
                    'count', s.product_count,
                    'stock_value', s.category_stock_value
                ) ORDER BY s.product_count DESC
            ) FILTER (WHERE s.category IS NOT NULL) as top_categories
        FROM (
            SELECT 
                category,
                COUNT(*) as product_count,
                SUM(stock_quantity * cost_price) as category_stock_value
            FROM inventory_stats
            WHERE category IS NOT NULL
            GROUP BY category
            LIMIT 10
        ) s
    )
    SELECT 
        -- عدد المنتجات
        COUNT(*)::BIGINT as total_products,
        COUNT(*) FILTER (WHERE is_active = true)::BIGINT as active_products,
        COUNT(*) FILTER (WHERE is_active = false)::BIGINT as inactive_products,
        
        -- توزيع المخزون
        COUNT(*) FILTER (WHERE stock_status = 'in-stock')::BIGINT as in_stock_products,
        COUNT(*) FILTER (WHERE stock_status = 'low-stock')::BIGINT as low_stock_products,
        COUNT(*) FILTER (WHERE stock_status = 'out-of-stock')::BIGINT as out_of_stock_products,
        COUNT(*) FILTER (WHERE stock_status = 'reorder-needed')::BIGINT as reorder_needed_products,
        
        -- القيم المالية
        SUM(stock_quantity * cost_price)::NUMERIC as total_stock_value,
        AVG(stock_quantity)::NUMERIC as average_stock_level,
        
        -- المتغيرات
        vs.products_with_variants::BIGINT,
        vs.total_variants::BIGINT,
        
        -- التحديثات الأخيرة (آخر 7 أيام)
        COUNT(*) FILTER (WHERE last_inventory_update >= NOW() - INTERVAL '7 days')::BIGINT as recent_updates,
        
        -- الفئات
        COUNT(DISTINCT category) FILTER (WHERE category IS NOT NULL)::BIGINT as categories_count,
        cs.top_categories,
        
        -- توزيع المخزون كـ JSON
        jsonb_build_object(
            'in_stock', COUNT(*) FILTER (WHERE stock_status = 'in-stock'),
            'low_stock', COUNT(*) FILTER (WHERE stock_status = 'low-stock'),
            'out_of_stock', COUNT(*) FILTER (WHERE stock_status = 'out-of-stock'),
            'reorder_needed', COUNT(*) FILTER (WHERE stock_status = 'reorder-needed')
        ) as stock_distribution
        
    FROM inventory_stats i
    CROSS JOIN variant_stats vs
    CROSS JOIN category_stats cs;
END;
$$;

-- =============================================================================
-- 4. دالة التحديث المجمع للمخزون
-- =============================================================================
CREATE OR REPLACE FUNCTION bulk_update_inventory(
    p_organization_id UUID,
    p_updates JSONB,
    p_updated_by UUID
)
RETURNS TABLE(
    success_count INTEGER,
    error_count INTEGER,
    total_processed INTEGER,
    errors JSONB,
    summary JSONB
) 
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
AS $$
DECLARE
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
    v_total_processed INTEGER := 0;
    v_errors JSONB := '[]'::jsonb;
    v_update_record JSONB;
BEGIN
    -- التحقق من وجود البيانات
    IF p_updates IS NULL OR jsonb_array_length(p_updates) = 0 THEN
        RETURN QUERY SELECT 0, 0, 0, '[]'::jsonb, '{"message": "لا توجد بيانات للتحديث"}'::jsonb;
        RETURN;
    END IF;
    
    -- معالجة كل عنصر في المصفوفة
    FOR v_update_record IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        BEGIN
            v_total_processed := v_total_processed + 1;
            
            -- التحقق من صحة البيانات المطلوبة
            IF NOT (v_update_record ? 'product_id' AND v_update_record ? 'stock_quantity') THEN
                v_error_count := v_error_count + 1;
                v_errors := v_errors || jsonb_build_object(
                    'product_id', COALESCE(v_update_record->>'product_id', 'unknown'),
                    'error', 'بيانات ناقصة: product_id و stock_quantity مطلوبان'
                );
                CONTINUE;
            END IF;
            
            -- تنفيذ التحديث
            UPDATE products 
            SET 
                stock_quantity = (v_update_record->>'stock_quantity')::INTEGER,
                min_stock_level = COALESCE((v_update_record->>'min_stock_level')::INTEGER, min_stock_level),
                reorder_level = COALESCE((v_update_record->>'reorder_level')::INTEGER, reorder_level),
                reorder_quantity = COALESCE((v_update_record->>'reorder_quantity')::INTEGER, reorder_quantity),
                last_inventory_update = NOW(),
                updated_by_user_id = p_updated_by,
                updated_at = NOW()
            WHERE 
                id = (v_update_record->>'product_id')::UUID 
                AND organization_id = p_organization_id;
            
            -- التحقق من نجاح التحديث
            IF FOUND THEN
                v_success_count := v_success_count + 1;
                
                -- إضافة سجل في inventory_log
                INSERT INTO inventory_log (
                    product_id,
                    quantity,
                    type,
                    reference_type,
                    notes,
                    created_by
                ) VALUES (
                    (v_update_record->>'product_id')::UUID,
                    (v_update_record->>'stock_quantity')::INTEGER,
                    'bulk_update',
                    'manual',
                    COALESCE(v_update_record->>'notes', 'تحديث مجمع للمخزون'),
                    p_updated_by
                );
            ELSE
                v_error_count := v_error_count + 1;
                v_errors := v_errors || jsonb_build_object(
                    'product_id', v_update_record->>'product_id',
                    'error', 'المنتج غير موجود أو لا تملك صلاحية تعديله'
                );
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            v_errors := v_errors || jsonb_build_object(
                'product_id', COALESCE(v_update_record->>'product_id', 'unknown'),
                'error', SQLERRM
            );
        END;
    END LOOP;
    
    -- إرجاع النتائج
    RETURN QUERY SELECT 
        v_success_count,
        v_error_count,
        v_total_processed,
        v_errors,
        jsonb_build_object(
            'message', format('تم معالجة %s عنصر: %s نجح، %s فشل', 
                            v_total_processed, v_success_count, v_error_count),
            'success_rate', CASE WHEN v_total_processed > 0 
                               THEN (v_success_count::FLOAT / v_total_processed * 100)::NUMERIC(5,2)
                               ELSE 0 END
        );
END;
$$;

-- =============================================================================
-- إنشاء فهارس محسنة للأداء
-- =============================================================================

-- فهرس مركب للبحث السريع
CREATE INDEX IF NOT EXISTS idx_products_inventory_search 
ON products USING gin (
    to_tsvector('arabic', name || ' ' || COALESCE(description, ''))
);

-- فهرس للمخزون والحالة
CREATE INDEX IF NOT EXISTS idx_products_inventory_status 
ON products (organization_id, is_active, stock_quantity, min_stock_level, reorder_level);

-- فهرس للترتيب المتقدم
CREATE INDEX IF NOT EXISTS idx_products_inventory_sort 
ON products (organization_id, name, created_at, updated_at, last_inventory_update);

-- فهرس للفئات والبحث
CREATE INDEX IF NOT EXISTS idx_products_category_search 
ON products (organization_id, category_id, is_active);

-- تحسين أداء البحث في SKU والباركود
CREATE INDEX IF NOT EXISTS idx_products_sku_barcode 
ON products (organization_id, sku, barcode) 
WHERE sku IS NOT NULL OR barcode IS NOT NULL;

-- =============================================================================
-- منح الصلاحيات المطلوبة
-- =============================================================================

-- السماح للمستخدمين المصرح لهم بتنفيذ الدوال
GRANT EXECUTE ON FUNCTION search_inventory_autocomplete(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_products_paginated(UUID, INTEGER, INTEGER, TEXT, UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_advanced_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_inventory(UUID, JSONB, UUID) TO authenticated;

-- إضافة تعليقات للدوال
COMMENT ON FUNCTION search_inventory_autocomplete IS 'بحث سريع وتلقائي في منتجات المخزون مع دعم اللغة العربية';
COMMENT ON FUNCTION get_inventory_products_paginated IS 'جلب منتجات المخزون مع التصفح والفلترة المتقدمة';
COMMENT ON FUNCTION get_inventory_advanced_stats IS 'إحصائيات شاملة ومتقدمة للمخزون';
COMMENT ON FUNCTION bulk_update_inventory IS 'تحديث مجمع وآمن لكميات المخزون'; 