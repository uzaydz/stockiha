-- تحديث دالة get_losses_list لتشمل معلومات المتغيرات
-- ستعرض الألوان والمقاسات في تفاصيل كل منتج

CREATE OR REPLACE FUNCTION get_losses_list(
    p_branch_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    number TEXT,
    description TEXT,
    status TEXT,
    total_value DECIMAL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    approved_at TIMESTAMP,
    processed_at TIMESTAMP,
    branch_name TEXT,
    created_by_name TEXT,
    approved_by_name TEXT,
    processed_by_name TEXT,
    items_count INTEGER,
    items_summary TEXT -- معلومات موجزة عن المنتجات مع المتغيرات
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.number,
        l.description,
        l.status,
        l.total_value,
        l.created_at,
        l.updated_at,
        l.approved_at,
        l.processed_at,
        b.name as branch_name,
        uc.name as created_by_name,
        ua.name as approved_by_name,
        up.name as processed_by_name,
        COUNT(li.id)::INTEGER as items_count,
        STRING_AGG(
            CONCAT(
                li.quantity::TEXT, ' × ', p.name,
                CASE 
                    WHEN li.color_name IS NOT NULL AND li.size_name IS NOT NULL 
                    THEN ' (' || li.color_name || ' - ' || li.size_name || ')'
                    WHEN li.color_name IS NOT NULL 
                    THEN ' (' || li.color_name || ')'
                    WHEN li.size_name IS NOT NULL 
                    THEN ' (' || li.size_name || ')'
                    ELSE ''
                END
            ), 
            '، ' 
            ORDER BY p.name, li.color_name, li.size_name
        ) as items_summary
    FROM losses l
    LEFT JOIN branches b ON l.branch_id = b.id
    LEFT JOIN users uc ON l.created_by = uc.id
    LEFT JOIN users ua ON l.approved_by = ua.id
    LEFT JOIN users up ON l.processed_by = up.id
    LEFT JOIN loss_items li ON l.id = li.loss_id
    LEFT JOIN products p ON li.product_id = p.id
    WHERE 
        (p_branch_id IS NULL OR l.branch_id = p_branch_id)
        AND (p_status IS NULL OR l.status = p_status)
    GROUP BY 
        l.id, l.number, l.description, l.status, l.total_value,
        l.created_at, l.updated_at, l.approved_at, l.processed_at,
        b.name, uc.name, ua.name, up.name
    ORDER BY l.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$; 