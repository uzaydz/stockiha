-- إصلاح دالة get_losses_list التي تسبب مشكلة GROUP BY مع users.name
-- هذه الدالة قد تكون السبب في خطأ "column users.name must appear in the GROUP BY clause"

-- 1. حذف الدالة الإشكالية (الأولى)
DROP FUNCTION IF EXISTS get_losses_list(UUID, TEXT, INTEGER, INTEGER) CASCADE;

-- 2. إنشاء الدالة بطريقة محسنة باستخدام CTE
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
    items_summary TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH loss_items_summary AS (
        SELECT 
            li.loss_id,
            COUNT(li.id) as item_count,
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
            ) as summary
        FROM loss_items li
        LEFT JOIN products p ON li.product_id = p.id
        GROUP BY li.loss_id
    )
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
        COALESCE(b.name, 'غير محدد') as branch_name,
        COALESCE(uc.name, 'غير محدد') as created_by_name,
        COALESCE(ua.name, 'غير محدد') as approved_by_name,
        COALESCE(up.name, 'غير محدد') as processed_by_name,
        COALESCE(lis.item_count, 0)::INTEGER as items_count,
        COALESCE(lis.summary, 'لا توجد عناصر') as items_summary
    FROM losses l
    LEFT JOIN branches b ON l.branch_id = b.id
    LEFT JOIN users uc ON l.created_by = uc.id
    LEFT JOIN users ua ON l.approved_by = ua.id
    LEFT JOIN users up ON l.processed_by = up.id
    LEFT JOIN loss_items_summary lis ON l.id = lis.loss_id
    WHERE 
        (p_branch_id IS NULL OR l.branch_id = p_branch_id)
        AND (p_status IS NULL OR l.status = p_status)
    ORDER BY l.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 3. منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_losses_list TO authenticated;

-- 4. تعليق للتوثيق
COMMENT ON FUNCTION get_losses_list IS 'دالة محسنة لجلب قائمة الخسائر - تستخدم CTE لتجنب مشاكل GROUP BY مع users.name';

-- 5. اختبار سريع
DO $$
BEGIN
    PERFORM get_losses_list() LIMIT 1;
    RAISE NOTICE 'تم إصلاح get_losses_list بنجاح!';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'خطأ في إصلاح get_losses_list: %', SQLERRM;
END;
$$; 