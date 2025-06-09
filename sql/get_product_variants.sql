-- دالة للحصول على جميع متغيرات المنتج (الألوان والمقاسات) مع معلومات المخزون
-- هذه الدالة ستُستخدم في واجهة تصريح الخسائر لاختيار المتغير المحدد

CREATE OR REPLACE FUNCTION get_product_variants(p_product_id UUID)
RETURNS TABLE (
    -- معلومات المنتج الأساسية
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    product_purchase_price DECIMAL,
    product_price DECIMAL,
    has_colors BOOLEAN,
    has_sizes BOOLEAN,
    
    -- معلومات المتغير
    variant_type TEXT, -- 'main', 'color_only', 'size_only', 'color_size'
    color_id UUID,
    color_name TEXT,
    color_code TEXT,
    size_id UUID,
    size_name TEXT,
    size_code TEXT,
    
    -- معلومات المخزون
    current_stock INTEGER,
    variant_display_name TEXT -- اسم المتغير للعرض
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- التحقق من وجود المنتج
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'المنتج غير موجود';
    END IF;

    RETURN QUERY
    WITH product_info AS (
        SELECT 
            p.id as pid,
            p.name,
            p.sku,
            p.purchase_price,
            p.price,
            EXISTS(SELECT 1 FROM product_colors pc WHERE pc.product_id = p.id) as has_colors,
            EXISTS(SELECT 1 FROM product_sizes ps WHERE ps.product_id = p.id) as has_sizes
        FROM products p
        WHERE p.id = p_product_id
    ),
    variants AS (
        -- المنتج الرئيسي بدون متغيرات
        SELECT 
            pi.pid,
            pi.name,
            pi.sku,
            pi.purchase_price,
            pi.price,
            pi.has_colors,
            pi.has_sizes,
            'main'::TEXT as variant_type,
            NULL::UUID as color_id,
            NULL::TEXT as color_name,
            NULL::TEXT as color_code,
            NULL::UUID as size_id,
            NULL::TEXT as size_name,
            NULL::TEXT as size_code,
            COALESCE(p.stock, 0) as current_stock,
            'المنتج الأساسي'::TEXT as variant_display_name
        FROM product_info pi
        JOIN products p ON p.id = pi.pid
        WHERE NOT pi.has_colors AND NOT pi.has_sizes
        
        UNION ALL
        
        -- المنتجات مع ألوان فقط
        SELECT 
            pi.pid,
            pi.name,
            pi.sku,
            pi.purchase_price,
            pi.price,
            pi.has_colors,
            pi.has_sizes,
            'color_only'::TEXT as variant_type,
            pc.id as color_id,
            pc.name as color_name,
            pc.code as color_code,
            NULL::UUID as size_id,
            NULL::TEXT as size_name,
            NULL::TEXT as size_code,
            COALESCE(pc.stock, 0) as current_stock,
            pc.name as variant_display_name
        FROM product_info pi
        JOIN product_colors pc ON pc.product_id = pi.pid
        WHERE pi.has_colors AND NOT pi.has_sizes
        
        UNION ALL
        
        -- المنتجات مع مقاسات فقط
        SELECT 
            pi.pid,
            pi.name,
            pi.sku,
            pi.purchase_price,
            pi.price,
            pi.has_colors,
            pi.has_sizes,
            'size_only'::TEXT as variant_type,
            NULL::UUID as color_id,
            NULL::TEXT as color_name,
            NULL::TEXT as color_code,
            ps.id as size_id,
            ps.name as size_name,
            ps.code as size_code,
            COALESCE(ps.stock, 0) as current_stock,
            ps.name as variant_display_name
        FROM product_info pi
        JOIN product_sizes ps ON ps.product_id = pi.pid
        WHERE NOT pi.has_colors AND pi.has_sizes
        
        UNION ALL
        
        -- المنتجات مع ألوان ومقاسات
        SELECT 
            pi.pid,
            pi.name,
            pi.sku,
            pi.purchase_price,
            pi.price,
            pi.has_colors,
            pi.has_sizes,
            'color_size'::TEXT as variant_type,
            pc.id as color_id,
            pc.name as color_name,
            pc.code as color_code,
            ps.id as size_id,
            ps.name as size_name,
            ps.code as size_code,
            COALESCE(
                CASE 
                    WHEN pi.has_colors AND pi.has_sizes THEN 
                        (SELECT stock FROM product_colors pc2 WHERE pc2.id = pc.id AND pc2.product_id = pi.pid) +
                        (SELECT stock FROM product_sizes ps2 WHERE ps2.id = ps.id AND ps2.product_id = pi.pid)
                    ELSE 0 
                END, 0
            ) as current_stock,
            CONCAT(pc.name, ' - ', ps.name) as variant_display_name
        FROM product_info pi
        CROSS JOIN product_colors pc
        CROSS JOIN product_sizes ps
        WHERE pc.product_id = pi.pid 
        AND ps.product_id = pi.pid
        AND pi.has_colors AND pi.has_sizes
    )
    SELECT * FROM variants
    ORDER BY variant_type, color_name, size_name;
END;
$$; 