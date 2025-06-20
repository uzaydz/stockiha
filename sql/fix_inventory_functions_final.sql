-- إصلاح شامل لدوال المخزون المتقدم
-- تاريخ الإنشاء: الآن

-- 1. حذف الدوال الموجودة لإعادة إنشائها
DROP FUNCTION IF EXISTS get_inventory_advanced_stats(UUID);
DROP FUNCTION IF EXISTS get_product_inventory_details(UUID, UUID);
DROP FUNCTION IF EXISTS get_inventory_products_paginated(UUID, INT, INT, TEXT, UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN);

-- 2. دالة الإحصائيات المتقدمة - مُصححة
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
            COUNT(CASE WHEN p.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::INTEGER as month_additions
        FROM products p
        WHERE p.organization_id = p_organization_id
    ),
    category_stats AS (
        SELECT 
            COUNT(DISTINCT p.category)::INTEGER as categories_total,
            COUNT(DISTINCT p.brand)::INTEGER as brands_total
        FROM products p
        WHERE p.organization_id = p_organization_id
        AND (p.category IS NOT NULL OR p.brand IS NOT NULL)
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
        COALESCE(cs.categories_total, 0),
        COALESCE(cs.brands_total, 0),
        bs.week_additions,
        bs.month_additions,
        COALESCE(cv.category, 'غير محدد'),
        COALESCE(lc.category, 'غير محدد')
    FROM base_stats bs
    CROSS JOIN category_stats cs
    LEFT JOIN category_values cv ON true
    LEFT JOIN lowest_category lc ON true;
END;
$$;

-- 3. دالة تفاصيل مخزون المنتج - جديدة
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
    last_inventory_update TIMESTAMP,
    
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
                pc.color_name,
                pc.color_code,
                pc.color_image,
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
            ORDER BY pc.color_name
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
        COALESCE(product_record.updated_at, product_record.created_at),
        
        COALESCE(product_record.has_variants, false),
        COALESCE(product_record.use_sizes, false),
        variants_json;
END;
$$;

-- 4. تحسين دالة جلب المنتجات - مُحسنة للأداء
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
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
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
        v_where_clause := v_where_clause || ' AND p.category = (SELECT name FROM categories WHERE id = ''' || p_category_id || ''')';
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
    
    -- حساب العدد الإجمالي والمفلتر (محسن)
    EXECUTE format('SELECT COUNT(*) FROM products p %s', 
                   REPLACE(v_where_clause, '$1', quote_literal(p_organization_id))) 
    INTO v_filtered_count;
    
    EXECUTE format('SELECT COUNT(*) FROM products p WHERE p.organization_id = %L', 
                   p_organization_id) 
    INTO v_total_count;
    
    -- إرجاع البيانات مع التحسينات
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

-- 5. دالة البحث السريع - محسنة
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

-- 6. إنشاء الفهارس المحسنة للأداء
CREATE INDEX IF NOT EXISTS idx_products_organization_search 
ON products(organization_id, name, sku, barcode) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_stock_status 
ON products(organization_id, stock_quantity, min_stock_level) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_variants 
ON products(organization_id, has_variants) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_colors_product_id 
ON product_colors(product_id, quantity);

CREATE INDEX IF NOT EXISTS idx_product_sizes_color_id 
ON product_sizes(color_id, quantity);

-- 7. تحليل الجداول للأداء الأمثل
ANALYZE products;
ANALYZE product_colors;
ANALYZE product_sizes; 