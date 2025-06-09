-- إصلاح مشكلة نوع البيانات في دالة get_losses_list
-- تغيير reported_by_name من VARCHAR إلى TEXT

DROP FUNCTION IF EXISTS get_losses_list(UUID, VARCHAR, VARCHAR, DATE, DATE, INTEGER, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION get_losses_list(
    p_organization_id UUID,
    p_status VARCHAR DEFAULT NULL,
    p_loss_type VARCHAR DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    id UUID,
    loss_number VARCHAR,
    loss_type VARCHAR,
    loss_category VARCHAR,
    loss_description TEXT,
    incident_date TIMESTAMP WITH TIME ZONE,
    total_cost_value NUMERIC,
    total_selling_value NUMERIC,
    total_items_count INTEGER,
    status VARCHAR,
    reported_by_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    requires_approval BOOLEAN
) AS $$
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
$$ LANGUAGE plpgsql; 