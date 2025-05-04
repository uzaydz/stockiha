-- حذف الدالة الموجودة
DROP FUNCTION IF EXISTS get_expenses_by_category(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

-- إعادة إنشاء الدالة مع إضافة تحويل صريح للنوع
CREATE OR REPLACE FUNCTION get_expenses_by_category(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    category TEXT,
    total_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ec.name AS category,
        COALESCE(SUM(e.amount), 0) AS total_amount
    FROM expenses e
    JOIN expense_categories ec ON e.category::UUID = ec.id
    WHERE 
        e.organization_id = p_organization_id
        AND e.expense_date BETWEEN p_start_date::DATE AND p_end_date::DATE
    GROUP BY ec.name
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql; 