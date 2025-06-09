-- دالة للحصول على تفاصيل الطلبية مع معلومات المتغيرات
-- هذه الدالة ستُستخدم في واجهة الإرجاع لعرض المنتجات مع متغيراتها

CREATE OR REPLACE FUNCTION get_order_details_with_variants(p_order_id UUID)
RETURNS TABLE (
    -- معلومات الطلبية
    order_id UUID,
    order_number TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    order_total DECIMAL,
    order_date TIMESTAMP WITH TIME ZONE,
    
    -- معلومات المنتج
    item_id UUID,
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    quantity INTEGER,
    unit_price DECIMAL,
    total_price DECIMAL,
    
    -- معلومات المتغير
    color_id UUID,
    color_name TEXT,
    size_id UUID,
    size_name TEXT,
    variant_display_name TEXT,
    variant_info JSONB,
    
    -- معلومات الإرجاع
    already_returned_quantity INTEGER,
    available_for_return INTEGER,
    has_previous_returns BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- التحقق من وجود الطلبية
    IF NOT EXISTS (SELECT 1 FROM orders WHERE id = p_order_id) THEN
        RAISE EXCEPTION 'الطلبية غير موجودة';
    END IF;

    RETURN QUERY
    WITH order_info AS (
        SELECT 
            o.id,
            COALESCE(o.customer_order_number::text, o.id::text) as order_number,
            COALESCE(u.name, 'زائر') as customer_name,
            u.phone as customer_phone,
            u.email as customer_email,
            o.total,
            o.created_at
        FROM orders o
        LEFT JOIN users u ON o.customer_id = u.id
        WHERE o.id = p_order_id
    ),
    return_summary AS (
        SELECT 
            ri.original_order_item_id,
            SUM(ri.return_quantity) as total_returned,
            COUNT(r.id) > 0 as has_returns
        FROM return_items ri
        JOIN returns r ON ri.return_id = r.id
        WHERE r.original_order_id = p_order_id
          AND r.status NOT IN ('rejected', 'cancelled')
        GROUP BY ri.original_order_item_id
    )
    SELECT 
        oi_info.order_id,
        oi_info.order_number,
        oi_info.customer_name,
        oi_info.customer_phone,
        oi_info.customer_email,
        oi_info.order_total,
        oi_info.order_date,
        
        -- معلومات المنتج
        oi.id as item_id,
        oi.product_id,
        oi.product_name,
        COALESCE(oi.product_sku, p.sku, '') as product_sku,
        oi.quantity,
        oi.unit_price,
        oi.total_price,
        
        -- معلومات المتغير
        oi.color_id,
        oi.color_name,
        oi.size_id,
        oi.size_name,
        COALESCE(
            oi.variant_display_name,
            CASE 
                WHEN oi.color_name IS NOT NULL AND oi.size_name IS NOT NULL 
                THEN oi.color_name || ' - ' || oi.size_name
                WHEN oi.color_name IS NOT NULL 
                THEN oi.color_name
                WHEN oi.size_name IS NOT NULL 
                THEN oi.size_name
                ELSE 'المنتج الأساسي'
            END
        ) as variant_display_name,
        COALESCE(oi.variant_info, '{}'::jsonb) as variant_info,
        
        -- معلومات الإرجاع
        COALESCE(rs.total_returned, 0)::INTEGER as already_returned_quantity,
        (oi.quantity - COALESCE(rs.total_returned, 0))::INTEGER as available_for_return,
        COALESCE(rs.has_returns, false) as has_previous_returns
        
    FROM order_info oi_info
    CROSS JOIN order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN return_summary rs ON oi.id = rs.original_order_item_id
    WHERE oi.order_id = oi_info.order_id
      AND (oi.quantity - COALESCE(rs.total_returned, 0)) > 0  -- فقط العناصر المتاحة للإرجاع
    ORDER BY oi.product_name, oi.color_name, oi.size_name;
END;
$$; 