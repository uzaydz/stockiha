-- ==============================================
-- دوال إدارة المخزون المتقدمة
-- تحسينات متقدمة مع دعم الفلترة والبحث والترتيب
-- ==============================================

-- دالة للحصول على منتجات المخزون مع pagination متقدم
CREATE OR REPLACE FUNCTION get_inventory_products_paginated(
    p_organization_id UUID,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 50,
    p_search_query TEXT DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_stock_filter TEXT DEFAULT 'all', -- 'all', 'in-stock', 'low-stock', 'out-of-stock', 'reorder-needed'
    p_sort_by TEXT DEFAULT 'name',
    p_sort_order TEXT DEFAULT 'ASC',
    p_include_variants BOOLEAN DEFAULT true,
    p_include_inactive BOOLEAN DEFAULT false
)
RETURNS TABLE (
    -- بيانات المنتج الأساسية
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
    
    -- معلومات إضافية للمخزون
    stock_status TEXT,
    stock_value NUMERIC,
    reorder_needed BOOLEAN,
    days_since_last_update INTEGER,
    variant_count INTEGER,
    total_variant_stock INTEGER,
    
    -- إحصائيات سريعة
    total_count BIGINT,
    filtered_count BIGINT
) AS $$
DECLARE
    v_offset INTEGER;
    v_where_conditions TEXT := '';
    v_search_condition TEXT := '';
    v_category_condition TEXT := '';
    v_stock_condition TEXT := '';
    v_sort_clause TEXT := '';
    v_query TEXT;
    v_count_query TEXT;
    v_total_count BIGINT;
    v_filtered_count BIGINT;
BEGIN
    -- حساب الإزاحة
    v_offset := (p_page - 1) * p_page_size;
    
    -- بناء شروط البحث
    IF p_search_query IS NOT NULL AND LENGTH(TRIM(p_search_query)) > 0 THEN
        v_search_condition := format(
            'AND (
                p.name ILIKE %L OR 
                p.sku ILIKE %L OR 
                p.barcode ILIKE %L OR
                p.description ILIKE %L OR
                to_tsvector(''arabic'', p.name || '' '' || COALESCE(p.description, '''')) @@ plainto_tsquery(''arabic'', %L)
            )',
            '%' || p_search_query || '%',
            '%' || p_search_query || '%', 
            '%' || p_search_query || '%',
            '%' || p_search_query || '%',
            p_search_query
        );
    END IF;
    
    -- بناء شروط الفئة
    IF p_category_id IS NOT NULL THEN
        v_category_condition := format('AND (p.category_id = %L OR p.category = (SELECT name FROM categories WHERE id = %L))', 
                                      p_category_id, p_category_id);
    END IF;
    
    -- بناء شروط المخزون
    CASE p_stock_filter
        WHEN 'in-stock' THEN
            v_stock_condition := 'AND p.stock_quantity > COALESCE(p.min_stock_level, 5)';
        WHEN 'low-stock' THEN 
            v_stock_condition := 'AND p.stock_quantity > 0 AND p.stock_quantity <= COALESCE(p.min_stock_level, 5)';
        WHEN 'out-of-stock' THEN
            v_stock_condition := 'AND p.stock_quantity = 0';
        WHEN 'reorder-needed' THEN
            v_stock_condition := 'AND p.stock_quantity <= COALESCE(p.reorder_level, 10)';
        ELSE
            v_stock_condition := '';
    END CASE;
    
    -- دمج جميع الشروط
    v_where_conditions := format(
        'WHERE p.organization_id = %L %s %s %s %s',
        p_organization_id,
        CASE WHEN p_include_inactive THEN '' ELSE 'AND p.is_active = true' END,
        v_search_condition,
        v_category_condition,
        v_stock_condition
    );
    
    -- بناء شرط الترتيب
    CASE p_sort_by
        WHEN 'name' THEN v_sort_clause := 'p.name';
        WHEN 'stock' THEN v_sort_clause := 'p.stock_quantity';
        WHEN 'price' THEN v_sort_clause := 'p.price';
        WHEN 'created' THEN v_sort_clause := 'p.created_at';
        WHEN 'updated' THEN v_sort_clause := 'p.updated_at';
        WHEN 'last_inventory_update' THEN v_sort_clause := 'p.last_inventory_update';
        WHEN 'reorder_priority' THEN v_sort_clause := '(COALESCE(p.reorder_level, 10) - p.stock_quantity)';
        ELSE v_sort_clause := 'p.name';
    END CASE;
    
    v_sort_clause := v_sort_clause || ' ' || p_sort_order;
    
    -- حساب العدد الإجمالي
    v_count_query := format('
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (%s) as filtered
        FROM products p 
        WHERE p.organization_id = %L AND p.is_active = true',
        REPLACE(v_where_conditions, 'WHERE p.organization_id = ' || quote_literal(p_organization_id::text), ''),
        p_organization_id
    );
    
    EXECUTE v_count_query INTO v_total_count, v_filtered_count;
    
    -- الاستعلام الرئيسي
    v_query := format('
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
            COALESCE(color_counts.variant_count, 0) as variant_count,
            COALESCE(color_counts.total_variant_stock, 0) as total_variant_stock,
            
            -- العدد الإجمالي
            %L::BIGINT as total_count,
            %L::BIGINT as filtered_count
            
        FROM products p
        LEFT JOIN (
            SELECT 
                pc.product_id,
                COUNT(pc.id) as variant_count,
                SUM(pc.quantity) as total_variant_stock
            FROM product_colors pc
            WHERE pc.product_id IN (
                SELECT p2.id FROM products p2 %s
            )
            GROUP BY pc.product_id
        ) color_counts ON p.id = color_counts.product_id
        %s
        ORDER BY %s
        LIMIT %L OFFSET %L',
        v_total_count,
        v_filtered_count,
        v_where_conditions,
        v_where_conditions,
        v_sort_clause,
        p_page_size,
        v_offset
    );
    
    -- تنفيذ الاستعلام وإرجاع النتائج
    RETURN QUERY EXECUTE v_query;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- دالة البحث السريع للمخزون (للـ autocomplete)
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
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.sku,
        p.barcode,
        p.thumbnail_image,
        p.stock_quantity,
        CASE 
            WHEN p.stock_quantity = 0 THEN 'out-of-stock'
            WHEN p.stock_quantity <= COALESCE(p.min_stock_level, 5) THEN 'low-stock'
            ELSE 'in-stock'
        END as stock_status,
        p.category
    FROM products p
    WHERE p.organization_id = p_organization_id
        AND p.is_active = true
        AND (
            p.name ILIKE '%' ||  p_search_query || '%' OR
            p.sku ILIKE '%' ||  p_search_query || '%' OR
            p.barcode ILIKE '%' ||  p_search_query || '%' OR
            to_tsvector('arabic', p.name) @@ plainto_tsquery('arabic', p_search_query)
        )
    ORDER BY 
        -- أولوية البحث: مطابقة تامة أولاً
        CASE WHEN p.name ILIKE p_search_query THEN 1
             WHEN p.sku = p_search_query THEN 1  
             WHEN p.barcode = p_search_query THEN 1
             WHEN p.name ILIKE p_search_query || '%' THEN 2
             WHEN p.sku ILIKE p_search_query || '%' THEN 2
             ELSE 3
        END,
        p.name
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- دالة إحصائيات المخزون المتقدمة
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
    total_stock_value NUMERIC,
    average_stock_per_product NUMERIC,
    
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
) AS $$
DECLARE
    v_week_ago TIMESTAMPTZ := NOW() - INTERVAL '7 days';
    v_month_ago TIMESTAMPTZ := NOW() - INTERVAL '30 days';
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_products,
        COUNT(*) FILTER (WHERE is_active = true)::INTEGER as active_products,
        COUNT(*) FILTER (WHERE is_active = false)::INTEGER as inactive_products,
        COUNT(*) FILTER (WHERE stock_quantity > COALESCE(min_stock_level, 5))::INTEGER as in_stock_products,
        COUNT(*) FILTER (WHERE stock_quantity > 0 AND stock_quantity <= COALESCE(min_stock_level, 5))::INTEGER as low_stock_products,
        COUNT(*) FILTER (WHERE stock_quantity = 0)::INTEGER as out_of_stock_products,
        COUNT(*) FILTER (WHERE stock_quantity <= COALESCE(reorder_level, 10))::INTEGER as reorder_needed_products,
        
        SUM(stock_quantity)::BIGINT as total_stock_quantity,
        SUM(stock_quantity * COALESCE(purchase_price, price * 0.6))::NUMERIC as total_stock_value,
        AVG(stock_quantity)::NUMERIC as average_stock_per_product,
        
        COUNT(*) FILTER (WHERE is_digital = true)::INTEGER as digital_products,
        COUNT(*) FILTER (WHERE is_digital = false)::INTEGER as physical_products,
        
        COUNT(*) FILTER (WHERE has_variants = true)::INTEGER as products_with_variants,
        COUNT(*) FILTER (WHERE has_variants = false)::INTEGER as products_without_variants,
        
        COUNT(DISTINCT category_id)::INTEGER as categories_count,
        COUNT(DISTINCT brand)::INTEGER as brands_count,
        
        COUNT(*) FILTER (WHERE created_at >= v_week_ago)::INTEGER as last_week_additions,
        COUNT(*) FILTER (WHERE created_at >= v_month_ago)::INTEGER as last_month_additions,
        
        -- أعلى فئة من ناحية قيمة المخزون
        (SELECT category FROM products p2 
         WHERE p2.organization_id = p_organization_id AND p2.is_active = true
         GROUP BY category 
         ORDER BY SUM(stock_quantity * COALESCE(purchase_price, price * 0.6)) DESC 
         LIMIT 1) as top_stock_value_category,
        
        -- أقل فئة من ناحية الكمية
        (SELECT category FROM products p2 
         WHERE p2.organization_id = p_organization_id AND p2.is_active = true
         GROUP BY category 
         ORDER BY SUM(stock_quantity) ASC 
         LIMIT 1) as lowest_stock_category
        
    FROM products p
    WHERE p.organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- دالة تحديث المخزون المجمع (Bulk Update)
CREATE OR REPLACE FUNCTION bulk_update_inventory(
    p_organization_id UUID,
    p_updates JSONB, -- مصفوفة من {product_id, new_quantity, reason, notes}
    p_updated_by UUID
)
RETURNS TABLE (
    success BOOLEAN,
    updated_count INTEGER,
    failed_updates JSONB,
    message TEXT
) AS $$
DECLARE
    v_update JSONB;
    v_product_id UUID;
    v_new_quantity INTEGER;
    v_reason TEXT;
    v_notes TEXT;
    v_current_stock INTEGER;
    v_updated_count INTEGER := 0;
    v_failed_updates JSONB := '[]'::JSONB;
    v_error_msg TEXT;
BEGIN
    -- التحقق من الصلاحيات
    IF NOT EXISTS (
        SELECT 1 FROM users u 
        JOIN organizations o ON u.organization_id = o.id
        WHERE u.id = p_updated_by AND o.id = p_organization_id
    ) THEN
        RETURN QUERY SELECT false, 0, '[]'::JSONB, 'ليس لديك صلاحية لتحديث هذا المخزون';
        RETURN;
    END IF;
    
    -- معالجة كل تحديث
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        BEGIN
            -- استخراج البيانات
            v_product_id := (v_update->>'product_id')::UUID;
            v_new_quantity := (v_update->>'new_quantity')::INTEGER;
            v_reason := COALESCE(v_update->>'reason', 'manual_adjustment');
            v_notes := v_update->>'notes';
            
            -- الحصول على الكمية الحالية
            SELECT stock_quantity INTO v_current_stock
            FROM products 
            WHERE id = v_product_id AND organization_id = p_organization_id;
            
            IF v_current_stock IS NULL THEN
                v_failed_updates := v_failed_updates || jsonb_build_object(
                    'product_id', v_product_id,
                    'error', 'المنتج غير موجود'
                );
                CONTINUE;
            END IF;
            
            -- تحديث المخزون
            UPDATE products 
            SET 
                stock_quantity = v_new_quantity,
                last_inventory_update = NOW(),
                updated_at = NOW(),
                updated_by_user_id = p_updated_by
            WHERE id = v_product_id AND organization_id = p_organization_id;
            
            -- إضافة سجل في تاريخ المخزون
            INSERT INTO inventory_log (
                product_id,
                quantity,
                previous_stock,
                new_stock,
                type,
                notes,
                created_by,
                organization_id
            ) VALUES (
                v_product_id,
                v_new_quantity - v_current_stock,
                v_current_stock,
                v_new_quantity,
                v_reason,
                v_notes,
                p_updated_by,
                p_organization_id
            );
            
            v_updated_count := v_updated_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            v_failed_updates := v_failed_updates || jsonb_build_object(
                'product_id', v_product_id,
                'error', SQLERRM
            );
        END;
    END LOOP;
    
    RETURN QUERY SELECT 
        true,
        v_updated_count,
        v_failed_updates,
        format('تم تحديث %s منتج بنجاح', v_updated_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء فهرس محسن للمخزون
CREATE INDEX IF NOT EXISTS idx_inventory_management_optimized 
ON products (organization_id, is_active, stock_quantity, reorder_level, last_inventory_update DESC) 
WHERE is_active = true;

-- فهرس للبحث السريع في المخزون
CREATE INDEX IF NOT EXISTS idx_inventory_search_optimized 
ON products USING gin (to_tsvector('arabic', name || ' ' || COALESCE(sku, '') || ' ' || COALESCE(barcode, ''))) 
WHERE is_active = true;

-- فهرس لقيمة المخزون
CREATE INDEX IF NOT EXISTS idx_inventory_value_analysis 
ON products (organization_id, (stock_quantity * COALESCE(purchase_price, price * 0.6))) 
WHERE is_active = true AND stock_quantity > 0;

-- تعليق على الدوال
COMMENT ON FUNCTION get_inventory_products_paginated IS 'دالة متقدمة لجلب منتجات المخزون مع pagination وفلترة وبحث محسن';
COMMENT ON FUNCTION search_inventory_autocomplete IS 'بحث سريع للمنتجات في المخزون للـ autocomplete';
COMMENT ON FUNCTION get_inventory_advanced_stats IS 'إحصائيات متقدمة شاملة للمخزون';
COMMENT ON FUNCTION bulk_update_inventory IS 'تحديث مجمع للمخزون مع تسجيل العمليات'; 