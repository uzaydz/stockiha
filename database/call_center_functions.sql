-- Functions و Views لنظام Call Center Distribution

-- 1. Function لتحديث workload تلقائياً
CREATE OR REPLACE FUNCTION update_agent_workload()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO call_center_agent_workload (agent_id, organization_id, date)
    VALUES (NEW.agent_id, NEW.organization_id, CURRENT_DATE)
    ON CONFLICT (agent_id, date) 
    DO UPDATE SET
        assigned_orders = (
            SELECT COUNT(*) FROM call_center_order_assignments 
            WHERE agent_id = NEW.agent_id AND DATE(assigned_at) = CURRENT_DATE
        ),
        completed_orders = (
            SELECT COUNT(*) FROM call_center_order_assignments 
            WHERE agent_id = NEW.agent_id AND status = 'completed' AND DATE(completion_time) = CURRENT_DATE
        ),
        pending_orders = (
            SELECT COUNT(*) FROM call_center_order_assignments 
            WHERE agent_id = NEW.agent_id AND status IN ('assigned', 'in_progress')
        ),
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger لتحديث workload
DROP TRIGGER IF EXISTS trg_update_agent_workload ON call_center_order_assignments;
CREATE TRIGGER trg_update_agent_workload
    AFTER INSERT OR UPDATE ON call_center_order_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_workload();

-- 3. Function لحساب الوكيل المناسب للتوزيع
CREATE OR REPLACE FUNCTION get_best_available_agent(
    p_organization_id UUID,
    p_order_province TEXT DEFAULT NULL,
    p_order_value DECIMAL DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_agent_id UUID;
BEGIN
    SELECT ca.id INTO v_agent_id
    FROM call_center_agents ca
    LEFT JOIN call_center_agent_workload caw ON ca.id = caw.agent_id AND caw.date = CURRENT_DATE
    WHERE ca.organization_id = p_organization_id
        AND ca.is_active = TRUE
        AND ca.is_available = TRUE
        AND (p_order_province IS NULL OR ca.assigned_regions ? p_order_province)
        AND COALESCE(caw.pending_orders, 0) < COALESCE(ca.max_daily_orders, 10)
    ORDER BY 
        COALESCE(caw.pending_orders, 0) ASC,
        COALESCE((ca.performance_metrics->>'customer_satisfaction')::DECIMAL, 0) DESC,
        ca.last_activity DESC NULLS LAST
    LIMIT 1;
    
    RETURN v_agent_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Function لتوزيع الطلب تلقائياً
CREATE OR REPLACE FUNCTION auto_assign_order_to_agent(
    p_order_id UUID,
    p_organization_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_agent_id UUID;
    v_assignment_id UUID;
    v_order_info RECORD;
BEGIN
    SELECT 
        form_data->>'province' as province, 
        total,
        id
    INTO v_order_info
    FROM online_orders 
    WHERE id = p_order_id AND organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        RETURN '{"success": false, "error": "Order not found"}'::jsonb;
    END IF;
    
    IF EXISTS (SELECT 1 FROM call_center_order_assignments WHERE order_id = p_order_id) THEN
        RETURN '{"success": false, "error": "Order already assigned"}'::jsonb;
    END IF;
    
    SELECT get_best_available_agent(
        p_organization_id,
        v_order_info.province,
        v_order_info.total
    ) INTO v_agent_id;
    
    IF v_agent_id IS NULL THEN
        RETURN '{"success": false, "error": "No available agent found"}'::jsonb;
    END IF;
    
    INSERT INTO call_center_order_assignments (
        order_id, agent_id, organization_id, assignment_type, assignment_reason
    ) VALUES (
        p_order_id, v_agent_id, p_organization_id, 'auto', 'Automatic assignment based on workload and region'
    ) RETURNING id INTO v_assignment_id;
    
    INSERT INTO call_center_distribution_log (
        organization_id, action_type, entity_type, entity_id, 
        new_state, automated, reason
    ) VALUES (
        p_organization_id, 'assign', 'order', p_order_id,
        jsonb_build_object('agent_id', v_agent_id, 'assignment_id', v_assignment_id),
        TRUE, 'Auto-assignment by system'
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'assignment_id', v_assignment_id,
        'agent_id', v_agent_id
    );
END;
$$ LANGUAGE plpgsql;

-- Views لسهولة الاستعلام

-- 1. View للطلبات مع تفاصيل التوزيع
CREATE OR REPLACE VIEW call_center_orders_with_assignments AS
SELECT 
    o.id as order_id,
    o.form_data->>'fullName' as customer_name,
    o.form_data->>'phone' as customer_phone,
    o.form_data->>'province' as province,
    o.form_data->>'municipality' as municipality,
    o.total as total_amount,
    o.status as order_status,
    o.created_at as order_created_at,
    
    coa.id as assignment_id,
    coa.status as assignment_status,
    coa.priority_level,
    coa.call_attempts,
    coa.last_call_attempt,
    coa.next_call_scheduled,
    coa.call_outcome,
    coa.assigned_at,
    
    ca.id as agent_id,
    u.name as agent_name,
    u.email as agent_email,
    ca.is_available as agent_available
FROM online_orders o
LEFT JOIN call_center_order_assignments coa ON o.id = coa.order_id
LEFT JOIN call_center_agents ca ON coa.agent_id = ca.id
LEFT JOIN users u ON ca.user_id = u.id;

-- 2. View لإحصائيات الوكلاء
CREATE OR REPLACE VIEW call_center_agents_stats AS
SELECT 
    ca.id as agent_id,
    u.name as agent_name,
    u.email as agent_email,
    ca.is_available,
    ca.is_active,
    ca.max_daily_orders,
    
    COALESCE(caw.assigned_orders, 0) as assigned_orders,
    COALESCE(caw.completed_orders, 0) as completed_orders,
    COALESCE(caw.pending_orders, 0) as pending_orders,
    COALESCE(caw.total_calls, 0) as total_calls,
    COALESCE(caw.successful_calls, 0) as successful_calls,
    COALESCE(caw.completion_rate, 0) as completion_rate,
    COALESCE(caw.customer_satisfaction_avg, 0) as customer_satisfaction_avg,
    
    ca.performance_metrics
FROM call_center_agents ca
LEFT JOIN users u ON ca.user_id = u.id
LEFT JOIN call_center_agent_workload caw ON ca.id = caw.agent_id AND caw.date = CURRENT_DATE;

-- 3. View للطلبات غير الموزعة
CREATE OR REPLACE VIEW unassigned_orders AS
SELECT 
    o.id,
    o.form_data->>'fullName' as customer_name,
    o.form_data->>'phone' as customer_phone,
    o.form_data->>'province' as province,
    o.form_data->>'municipality' as municipality,
    o.total,
    o.status,
    o.created_at,
    o.organization_id
FROM online_orders o
LEFT JOIN call_center_order_assignments coa ON o.id = coa.order_id
WHERE coa.id IS NULL
    AND o.status NOT IN ('delivered', 'cancelled', 'returned')
ORDER BY o.created_at DESC; 