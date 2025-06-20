-- إصلاح مشكلة timestamp في دوال المخزون المتقدمة
-- Fix Inventory Functions Timestamp Issue

-- ============================
-- 1. حذف الدوال الموجودة أولاً
-- ============================

DROP FUNCTION IF EXISTS get_inventory_products_paginated(uuid, integer, integer, text, uuid, text, text, text, boolean, boolean);
DROP FUNCTION IF EXISTS get_inventory_advanced_stats(uuid);
DROP FUNCTION IF EXISTS get_product_inventory_details(uuid, uuid);
DROP FUNCTION IF EXISTS search_inventory_autocomplete(uuid, text, integer);
DROP FUNCTION IF EXISTS bulk_update_inventory(uuid, jsonb, uuid);

-- ============================
-- 2. دالة جلب منتجات المخزون - مع إصلاح timestamp
-- ============================

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
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    price DECIMAL,
    compare_at_price DECIMAL,
    sku TEXT,
    barcode TEXT,
    category TEXT,
    subcategory TEXT,
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
    created_at TIMESTAMP WITH TIME ZONE,  -- إصلاح: إضافة WITH TIME ZONE
    updated_at TIMESTAMP WITH TIME ZONE,  -- إصلاح: إضافة WITH TIME ZONE
    has_variants BOOLEAN,
    use_sizes BOOLEAN,
    stock_status TEXT,
    stock_value DECIMAL,
    reorder_needed BOOLEAN,
    days_since_last_update INTEGER,
    variant_count INTEGER,
    total_variant_stock INTEGER,
    total_count BIGINT,
    filtered_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_offset INTEGER;
    v_where_clause TEXT;
    v_order_clause TEXT;
    v_total_count BIGINT;
    v_filtered_count BIGINT;
BEGIN
    -- حساب الـ offset
    v_offset := (p_page - 1) * p_page_size;
    
    -- بناء WHERE clause
    v_where_clause := 'WHERE p.organization_id = $1';
    
    IF NOT p_include_inactive THEN
        v_where_clause := v_where_clause || ' AND p.is_active = true';
    END IF;
    
    IF p_search_query IS NOT NULL AND p_search_query != '' THEN
        v_where_clause := v_where_clause || ' AND (p.name ILIKE ''%' || p_search_query || '%'' OR p.sku ILIKE ''%' || p_search_query || '%'' OR p.barcode ILIKE ''%' || p_search_query || '%'')';
    END IF;
    
    IF p_category_id IS NOT NULL THEN
        v_where_clause := v_where_clause || ' AND p.category_id = ''' || p_category_id || '''';
    END IF;
    
    IF p_stock_filter != 'all' THEN
        CASE p_stock_filter
            WHEN 'in-stock' THEN
                v_where_clause := v_where_clause || ' AND p.stock_quantity > COALESCE(p.min_stock_level, 5)';
            WHEN 'low-stock' THEN
                v_where_clause := v_where_clause || ' AND p.stock_quantity <= COALESCE(p.min_stock_level, 5) AND p.stock_quantity > 0';
            WHEN 'out-of-stock' THEN
                v_where_clause := v_where_clause || ' AND p.stock_quantity = 0';
            WHEN 'reorder-needed' THEN
                v_where_clause := v_where_clause || ' AND p.stock_quantity <= COALESCE(p.reorder_level, 10)';
        END CASE;
    END IF;
    
    -- بناء ORDER BY clause
    v_order_clause := 'ORDER BY ';
    CASE p_sort_by
        WHEN 'name' THEN v_order_clause := v_order_clause || 'p.name';
        WHEN 'stock' THEN v_order_clause := v_order_clause || 'p.stock_quantity';
        WHEN 'price' THEN v_order_clause := v_order_clause || 'p.price';
        WHEN 'created' THEN v_order_clause := v_order_clause || 'p.created_at';
        WHEN 'updated' THEN v_order_clause := v_order_clause || 'p.updated_at';
        ELSE v_order_clause := v_order_clause || 'p.name';
    END CASE;
    
    v_order_clause := v_order_clause || ' ' || p_sort_order;
    
    -- حساب العدد الإجمالي والمفلتر
    EXECUTE format('SELECT COUNT(*) FROM products p %s', 
                   REPLACE(v_where_clause, '$1', quote_literal(p_organization_id))) 
    INTO v_filtered_count;
    
    EXECUTE format('SELECT COUNT(*) FROM products p WHERE p.organization_id = %L', 
                   p_organization_id) 
    INTO v_total_count;
    
    -- إرجاع البيانات
    RETURN QUERY
    EXECUTE format('
        SELECT 
            p.id,
            p.name,
            p.description,
            p.price,
            p.compare_at_price,
            p.sku,
            p.barcode,
            p.category,
            p.subcategory,
            p.brand,
            p.images,
            p.thumbnail_image,
            p.stock_quantity,
            COALESCE(p.min_stock_level, 5) as min_stock_level,
            COALESCE(p.reorder_level, 10) as reorder_level,
            COALESCE(p.reorder_quantity, 20) as reorder_quantity,
            COALESCE(p.is_digital, false) as is_digital,
            COALESCE(p.is_new, false) as is_new,
            COALESCE(p.is_featured, false) as is_featured,
            p.created_at,
            p.updated_at,
            COALESCE(p.has_variants, false) as has_variants,
            COALESCE(p.use_sizes, false) as use_sizes,
            CASE 
                WHEN p.stock_quantity > COALESCE(p.min_stock_level, 5) THEN ''in-stock''
                WHEN p.stock_quantity > 0 THEN ''low-stock''
                ELSE ''out-of-stock''
            END as stock_status,
            (p.stock_quantity * p.price) as stock_value,
            (p.stock_quantity <= COALESCE(p.reorder_level, 10)) as reorder_needed,
            EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - p.updated_at))::INTEGER as days_since_last_update,
            CASE 
                WHEN p.has_variants = true THEN (
                    SELECT COUNT(*)::INTEGER FROM product_colors pc WHERE pc.product_id = p.id
                )
                ELSE 1
            END as variant_count,
            CASE 
                WHEN p.has_variants = true THEN (
                    SELECT COALESCE(SUM(pc.quantity), 0)::INTEGER FROM product_colors pc WHERE pc.product_id = p.id
                )
                ELSE p.stock_quantity
            END as total_variant_stock,
            %L::BIGINT as total_count,
            %L::BIGINT as filtered_count
        FROM products p
        %s
        %s
        LIMIT %L OFFSET %L',
        v_total_count,
        v_filtered_count,
        v_where_clause,
        v_order_clause,
        p_page_size,
        v_offset
    ) USING p_organization_id;
END;
$$;

-- ============================
-- 3. دالة الإحصائيات المتقدمة - محسنة
-- ============================

CREATE OR REPLACE FUNCTION get_inventory_advanced_stats(
    p_organization_id UUID
)
RETURNS TABLE (
    total_products INTEGER,
    active_products INTEGER,
    inactive_products INTEGER,
    in_stock_products INTEGER,
    low_stock_products INTEGER,
    out_of_stock_products INTEGER,
    reorder_needed_products INTEGER,
    total_stock_quantity BIGINT,
    total_stock_value DECIMAL,
    average_stock_per_product DECIMAL,
    digital_products INTEGER,
    physical_products INTEGER,
    products_with_variants INTEGER,
    products_without_variants INTEGER,
    categories_count INTEGER,
    brands_count INTEGER,
    last_week_additions INTEGER,
    last_month_additions INTEGER,
    top_stock_value_category TEXT,
    lowest_stock_category TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH base_stats AS (
        SELECT 
            COUNT(*)::INTEGER as total_count,
            COUNT(CASE WHEN p.is_active = true THEN 1 END)::INTEGER as active_count,
            COUNT(CASE WHEN p.is_active = false THEN 1 END)::INTEGER as inactive_count,
            COUNT(CASE WHEN p.stock_quantity > COALESCE(p.min_stock_level, 5) THEN 1 END)::INTEGER as in_stock_count,
            COUNT(CASE WHEN p.stock_quantity <= COALESCE(p.min_stock_level, 5) AND p.stock_quantity > 0 THEN 1 END)::INTEGER as low_stock_count,
            COUNT(CASE WHEN p.stock_quantity = 0 THEN 1 END)::INTEGER as out_stock_count,
            COUNT(CASE WHEN p.stock_quantity <= COALESCE(p.reorder_level, 10) THEN 1 END)::INTEGER as reorder_count,
            COALESCE(SUM(p.stock_quantity), 0)::BIGINT as total_stock,
            COALESCE(SUM(p.stock_quantity * p.price), 0)::DECIMAL as total_value,
            COUNT(CASE WHEN p.is_digital = true THEN 1 END)::INTEGER as digital_count,
            COUNT(CASE WHEN p.is_digital = false OR p.is_digital IS NULL THEN 1 END)::INTEGER as physical_count,
            COUNT(CASE WHEN p.has_variants = true THEN 1 END)::INTEGER as with_variants_count,
            COUNT(CASE WHEN p.has_variants = false OR p.has_variants IS NULL THEN 1 END)::INTEGER as without_variants_count,
            COUNT(CASE WHEN p.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::INTEGER as week_additions,
            COUNT(CASE WHEN p.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::INTEGER as month_additions,
            COUNT(DISTINCT p.category) FILTER (WHERE p.category IS NOT NULL)::INTEGER as categories_total,
            COUNT(DISTINCT p.brand) FILTER (WHERE p.brand IS NOT NULL)::INTEGER as brands_total
        FROM products p
        WHERE p.organization_id = p_organization_id
    ),
    category_values AS (
        SELECT 
            p.category,
            SUM(p.stock_quantity * p.price) as category_value
        FROM products p
        WHERE p.organization_id = p_organization_id
        AND p.category IS NOT NULL
        GROUP BY p.category
        ORDER BY category_value DESC
        LIMIT 1
    ),
    lowest_category AS (
        SELECT 
            p.category
        FROM products p
        WHERE p.organization_id = p_organization_id
        AND p.category IS NOT NULL
        GROUP BY p.category
        ORDER BY SUM(p.stock_quantity) ASC
        LIMIT 1
    )
    SELECT 
        bs.total_count,
        bs.active_count,
        bs.inactive_count,
        bs.in_stock_count,
        bs.low_stock_count,
        bs.out_stock_count,
        bs.reorder_count,
        bs.total_stock,
        bs.total_value,
        CASE 
            WHEN bs.total_count > 0 THEN (bs.total_stock::DECIMAL / bs.total_count::DECIMAL)
            ELSE 0 
        END,
        bs.digital_count,
        bs.physical_count,
        bs.with_variants_count,
        bs.without_variants_count,
        bs.categories_total,
        bs.brands_total,
        bs.week_additions,
        bs.month_additions,
        COALESCE(cv.category, 'غير محدد'),
        COALESCE(lc.category, 'غير محدد')
    FROM base_stats bs
    LEFT JOIN category_values cv ON true
    LEFT JOIN lowest_category lc ON true;
END;
$$;

-- ============================
-- 4. دالة تفاصيل المنتج - مع إصلاح timestamp
-- ============================

CREATE OR REPLACE FUNCTION get_product_inventory_details(
    p_organization_id UUID,
    p_product_id UUID
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    product_barcode TEXT,
    product_category TEXT,
    product_brand TEXT,
    product_price DECIMAL,
    
    -- معلومات المخزون الأساسية
    total_stock_quantity INTEGER,
    min_stock_level INTEGER,
    reorder_level INTEGER,
    reorder_quantity INTEGER,
    stock_status TEXT,
    stock_value DECIMAL,
    last_inventory_update TIMESTAMP WITH TIME ZONE,  -- إصلاح: إضافة WITH TIME ZONE
    
    -- معلومات المتغيرات
    has_variants BOOLEAN,
    use_sizes BOOLEAN,
    variants_data JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    product_record RECORD;
    variants_json JSONB;
BEGIN
    -- جلب معلومات المنتج الأساسية
    SELECT p.* INTO product_record
    FROM products p
    WHERE p.id = p_product_id 
    AND p.organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    -- بناء بيانات المتغيرات
    IF product_record.has_variants = true THEN
        -- المنتج له متغيرات
        WITH variants_data AS (
            SELECT 
                pc.id as color_id,
                pc.name as color_name,
                pc.color_code,
                pc.image_url as color_image,
                pc.quantity as color_quantity,
                pc.price as color_price,
                pc.barcode as color_barcode,
                CASE 
                    WHEN pc.quantity > COALESCE(product_record.min_stock_level, 5) THEN 'in-stock'
                    WHEN pc.quantity > 0 THEN 'low-stock'
                    ELSE 'out-of-stock'
                END as stock_status,
                CASE 
                    WHEN product_record.use_sizes = true THEN 'color_with_sizes'
                    ELSE 'color_only'
                END as type,
                -- جلب المقاسات إذا وجدت
                CASE 
                    WHEN product_record.use_sizes = true THEN (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'size_id', ps.id,
                                'size_name', ps.size_name,
                                'quantity', ps.quantity,
                                'price', ps.price
                            ) ORDER BY ps.size_name
                        ), '[]'::jsonb)
                        FROM product_sizes ps
                        WHERE ps.color_id = pc.id
                    )
                    ELSE '[]'::jsonb
                END as sizes
            FROM product_colors pc
            WHERE pc.product_id = p_product_id
            ORDER BY pc.name
        )
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'color_id', vd.color_id,
                'color_name', vd.color_name,
                'color_code', vd.color_code,
                'color_image', vd.color_image,
                'quantity', vd.color_quantity,
                'color_quantity', vd.color_quantity,
                'price', vd.color_price,
                'barcode', vd.color_barcode,
                'stock_status', vd.stock_status,
                'type', vd.type,
                'sizes', vd.sizes
            ) ORDER BY vd.color_name
        ), '[]'::jsonb) INTO variants_json
        FROM variants_data vd;
    ELSE
        -- المنتج بسيط (بدون متغيرات)
        variants_json := jsonb_build_array(
            jsonb_build_object(
                'type', 'simple',
                'quantity', product_record.stock_quantity,
                'price', product_record.price,
                'barcode', product_record.barcode,
                'stock_status', CASE 
                    WHEN product_record.stock_quantity > COALESCE(product_record.min_stock_level, 5) THEN 'in-stock'
                    WHEN product_record.stock_quantity > 0 THEN 'low-stock'
                    ELSE 'out-of-stock'
                END
            )
        );
    END IF;
    
    -- إرجاع النتائج
    RETURN QUERY
    SELECT 
        product_record.id,
        product_record.name,
        product_record.sku,
        product_record.barcode,
        product_record.category,
        product_record.brand,
        product_record.price,
        
        product_record.stock_quantity,
        COALESCE(product_record.min_stock_level, 5),
        COALESCE(product_record.reorder_level, 10),
        COALESCE(product_record.reorder_quantity, 20),
        CASE 
            WHEN product_record.stock_quantity > COALESCE(product_record.min_stock_level, 5) THEN 'in-stock'
            WHEN product_record.stock_quantity > 0 THEN 'low-stock'
            ELSE 'out-of-stock'
        END,
        (product_record.stock_quantity * product_record.price)::DECIMAL,
        COALESCE(product_record.last_inventory_update, product_record.updated_at),
        
        COALESCE(product_record.has_variants, false),
        COALESCE(product_record.use_sizes, false),
        variants_json;
END;
$$;

-- ============================
-- 5. دالة البحث السريع - محسنة
-- ============================

CREATE OR REPLACE FUNCTION search_inventory_autocomplete(
    p_organization_id UUID,
    p_search_query TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    sku TEXT,
    barcode TEXT,
    thumbnail_image TEXT,
    stock_quantity INTEGER,
    stock_status TEXT,
    category TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.sku,
        COALESCE(p.barcode, '') as barcode,
        COALESCE(p.thumbnail_image, '') as thumbnail_image,
        p.stock_quantity,
        CASE 
            WHEN p.stock_quantity > COALESCE(p.min_stock_level, 5) THEN 'in-stock'
            WHEN p.stock_quantity > 0 THEN 'low-stock'
            ELSE 'out-of-stock'
        END as stock_status,
        COALESCE(p.category, '') as category
    FROM products p
    WHERE p.organization_id = p_organization_id
    AND p.is_active = true
    AND (
        p.name ILIKE '%' || p_search_query || '%' OR
        p.sku ILIKE '%' || p_search_query || '%' OR
        p.barcode ILIKE '%' || p_search_query || '%'
    )
    ORDER BY 
        CASE 
            WHEN p.name ILIKE p_search_query || '%' THEN 1
            WHEN p.sku ILIKE p_search_query || '%' THEN 2
            WHEN p.barcode ILIKE p_search_query || '%' THEN 3
            ELSE 4
        END,
        p.name
    LIMIT p_limit;
END;
$$;

-- ============================
-- 6. دالة التحديث المجمع - محسنة
-- ============================

CREATE OR REPLACE FUNCTION bulk_update_inventory(
    p_organization_id UUID,
    p_updates JSONB,
    p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
    success_count INTEGER,
    error_count INTEGER,
    total_processed INTEGER,
    errors JSONB,
    summary JSONB
)
LANGUAGE plpgsql
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
                    organization_id,
                    quantity,
                    type,
                    reference_type,
                    notes,
                    created_by
                ) VALUES (
                    (v_update_record->>'product_id')::UUID,
                    p_organization_id,
                    (v_update_record->>'stock_quantity')::INTEGER,
                    'adjustment',
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

-- ============================
-- 7. إنشاء الفهارس المحسنة للأداء
-- ============================

CREATE INDEX IF NOT EXISTS idx_products_organization_active_search 
ON products(organization_id, is_active, name, sku, barcode) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_stock_levels 
ON products(organization_id, stock_quantity, min_stock_level, reorder_level) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_variants_info 
ON products(organization_id, has_variants, use_sizes) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_colors_quantities 
ON product_colors(product_id, quantity);

CREATE INDEX IF NOT EXISTS idx_product_sizes_quantities 
ON product_sizes(color_id, quantity);

CREATE INDEX IF NOT EXISTS idx_inventory_log_organization 
ON inventory_log(organization_id, created_at DESC);

-- ============================
-- 8. تحليل الجداول للأداء الأمثل
-- ============================

ANALYZE products;
ANALYZE product_colors;
ANALYZE product_sizes;
ANALYZE inventory_log;

-- ============================
-- رسالة نجاح العملية
-- ============================

DO $$ 
BEGIN 
    RAISE NOTICE 'تم إصلاح دوال المخزون المتقدمة بنجاح!';
    RAISE NOTICE 'تم حل مشكلة timestamp وإعادة إنشاء جميع الدوال';
    RAISE NOTICE 'الدوال المتاحة: get_inventory_products_paginated, get_inventory_advanced_stats, get_product_inventory_details, search_inventory_autocomplete, bulk_update_inventory';
END $$; 