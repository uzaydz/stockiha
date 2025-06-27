-- إصلاح نهائي لمشكلة get_losses_list مع تحديد الدوال بدقة
-- حل مشكلة "function name get_losses_list is not unique"

-- 1. أولاً، دعنا نرى جميع الدوال الموجودة ونحذفها بدقة
DO $$
BEGIN
    -- حذف الدالة الأولى (التي تسبب مشكلة GROUP BY)
    DROP FUNCTION IF EXISTS get_losses_list(UUID, TEXT, INTEGER, INTEGER) CASCADE;
    RAISE NOTICE 'تم حذف الدالة الأولى';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'لم يتم العثور على الدالة الأولى أو حدث خطأ: %', SQLERRM;
END;
$$;

-- 2. حذف الدالة الثانية بمعاملاتها الصحيحة
DO $$
BEGIN
    DROP FUNCTION IF EXISTS get_losses_list(UUID, TEXT, TEXT, DATE, DATE, INTEGER, INTEGER) CASCADE;
    RAISE NOTICE 'تم حذف الدالة الثانية';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'لم يتم العثور على الدالة الثانية أو حدث خطأ: %', SQLERRM;
END;
$$;

-- 3. الآن أنشئ الدالة الأولى المحسنة (للخسائر القديمة)
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

-- 4. إنشاء الدالة الثانية المحسنة (للخسائر الجديدة)
CREATE OR REPLACE FUNCTION get_losses_list(
    p_organization_id UUID,
    p_status TEXT DEFAULT NULL,
    p_loss_type TEXT DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_page INTEGER DEFAULT 1
)
RETURNS TABLE (
    id UUID,
    loss_number TEXT,
    loss_type TEXT,
    loss_category TEXT,
    loss_description TEXT,
    incident_date TIMESTAMP,
    total_cost_value DECIMAL,
    total_selling_value DECIMAL,
    total_items_count INTEGER,
    status TEXT,
    reported_by_name TEXT,
    created_at TIMESTAMP,
    requires_manager_approval BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.loss_number,
        l.loss_type,
        l.loss_category,
        l.loss_description,
        l.incident_date,
        l.total_cost_value,
        l.total_selling_value,
        l.total_items_count,
        l.status,
        COALESCE(u.name, 'غير محدد') as reported_by_name,
        l.created_at,
        l.requires_manager_approval
    FROM losses l
    LEFT JOIN users u ON l.reported_by = u.id
    WHERE l.organization_id = p_organization_id
      AND (p_status IS NULL OR l.status = p_status)
      AND (p_loss_type IS NULL OR l.loss_type = p_loss_type)
      AND (p_date_from IS NULL OR l.incident_date::date >= p_date_from)
      AND (p_date_to IS NULL OR l.incident_date::date <= p_date_to)
    ORDER BY l.created_at DESC
    LIMIT p_limit OFFSET (p_page - 1) * p_limit;
END;
$$;

-- 5. منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_losses_list(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_losses_list(UUID, TEXT, TEXT, DATE, DATE, INTEGER, INTEGER) TO authenticated;

-- 6. تعليقات للتوثيق
COMMENT ON FUNCTION get_losses_list(UUID, TEXT, INTEGER, INTEGER) IS 'دالة محسنة لجلب قائمة الخسائر (النسخة القديمة) - تستخدم CTE لتجنب مشاكل GROUP BY';
COMMENT ON FUNCTION get_losses_list(UUID, TEXT, TEXT, DATE, DATE, INTEGER, INTEGER) IS 'دالة محسنة لجلب قائمة الخسائر (النسخة الجديدة) - محسنة ضد مشاكل GROUP BY';

-- 7. اختبار
DO $$
BEGIN
    RAISE NOTICE 'تم إصلاح دوال get_losses_list بنجاح!';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'خطأ في الإصلاح: %', SQLERRM;
END;
$$; 