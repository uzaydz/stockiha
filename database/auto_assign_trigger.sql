-- دالة trigger للتوزيع التلقائي للطلبيات الجديدة
CREATE OR REPLACE FUNCTION trigger_auto_assign_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auto_assign_enabled BOOLEAN := false;
    v_result JSON;
BEGIN
    -- التحقق من تفعيل التوزيع التلقائي للمؤسسة
    SELECT auto_assign_enabled INTO v_auto_assign_enabled
    FROM call_center_distribution_rules
    WHERE organization_id = NEW.organization_id
      AND is_active = true
    LIMIT 1;

    -- إذا كان التوزيع التلقائي مفعل والطلب غير مُكلف
    IF v_auto_assign_enabled = true AND NEW.assigned_agent_id IS NULL THEN
        -- تأخير قصير للسماح للطلب بالحفظ أولاً
        PERFORM pg_sleep(0.1);
        
        -- استدعاء دالة التوزيع التلقائي
        SELECT auto_assign_order_to_agent(NEW.id, NEW.organization_id) INTO v_result;
        
        -- تسجيل النتيجة في السجلات
        IF (v_result->>'success')::boolean = true THEN
            RAISE NOTICE 'Auto-assigned order % to agent %', NEW.id, v_result->>'agent_id';
        ELSE
            RAISE WARNING 'Failed to auto-assign order %: %', NEW.id, v_result->>'error';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- إنشاء trigger للطلبيات الجديدة
DROP TRIGGER IF EXISTS trigger_auto_assign_order ON online_orders;
CREATE TRIGGER trigger_auto_assign_order
    AFTER INSERT ON online_orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_assign_new_order();

-- دالة لتفعيل/إلغاء تفعيل التوزيع التلقائي
CREATE OR REPLACE FUNCTION toggle_auto_assignment(
    p_organization_id UUID,
    p_enabled BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- تحديث إعدادات التوزيع التلقائي
    UPDATE call_center_distribution_rules
    SET 
        auto_assign_enabled = p_enabled,
        updated_at = NOW()
    WHERE organization_id = p_organization_id;

    -- إذا لم توجد قاعدة، أنشئ واحدة جديدة
    IF NOT FOUND THEN
        INSERT INTO call_center_distribution_rules (
            organization_id,
            distribution_type,
            auto_assign_enabled,
            is_active,
            priority,
            created_at,
            updated_at
        ) VALUES (
            p_organization_id,
            'round_robin',
            p_enabled,
            true,
            1,
            NOW(),
            NOW()
        );
    END IF;

    RETURN p_enabled;
END;
$$;

-- دالة للحصول على إحصائيات التوزيع التلقائي
CREATE OR REPLACE FUNCTION get_auto_assignment_stats(
    p_organization_id UUID,
    p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMP DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_orders INTEGER;
    v_auto_assigned INTEGER;
    v_manual_assigned INTEGER;
    v_unassigned INTEGER;
    v_avg_assignment_time INTERVAL;
    v_success_rate DECIMAL;
BEGIN
    -- إجمالي الطلبيات في الفترة
    SELECT COUNT(*) INTO v_total_orders
    FROM online_orders
    WHERE organization_id = p_organization_id
      AND created_at BETWEEN p_start_date AND p_end_date;

    -- الطلبيات المُكلفة تلقائياً
    SELECT COUNT(*) INTO v_auto_assigned
    FROM online_orders o
    JOIN call_center_order_assignments a ON o.id = a.order_id
    WHERE o.organization_id = p_organization_id
      AND o.created_at BETWEEN p_start_date AND p_end_date
      AND a.assignment_type = 'auto';

    -- الطلبيات المُكلفة يدوياً
    SELECT COUNT(*) INTO v_manual_assigned
    FROM online_orders o
    JOIN call_center_order_assignments a ON o.id = a.order_id
    WHERE o.organization_id = p_organization_id
      AND o.created_at BETWEEN p_start_date AND p_end_date
      AND a.assignment_type = 'manual';

    -- الطلبيات غير المُكلفة
    SELECT COUNT(*) INTO v_unassigned
    FROM online_orders
    WHERE organization_id = p_organization_id
      AND created_at BETWEEN p_start_date AND p_end_date
      AND assigned_agent_id IS NULL;

    -- متوسط وقت التكليف
    SELECT AVG(a.assigned_at - o.created_at) INTO v_avg_assignment_time
    FROM online_orders o
    JOIN call_center_order_assignments a ON o.id = a.order_id
    WHERE o.organization_id = p_organization_id
      AND o.created_at BETWEEN p_start_date AND p_end_date
      AND a.assignment_type = 'auto';

    -- معدل النجاح
    IF v_total_orders > 0 THEN
        v_success_rate := (v_auto_assigned + v_manual_assigned)::DECIMAL / v_total_orders * 100;
    ELSE
        v_success_rate := 0;
    END IF;

    RETURN json_build_object(
        'total_orders', v_total_orders,
        'auto_assigned', v_auto_assigned,
        'manual_assigned', v_manual_assigned,
        'unassigned', v_unassigned,
        'success_rate', ROUND(v_success_rate, 2),
        'avg_assignment_time_seconds', EXTRACT(EPOCH FROM v_avg_assignment_time),
        'period_start', p_start_date,
        'period_end', p_end_date
    );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION trigger_auto_assign_new_order() TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_auto_assignment(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_auto_assignment_stats(UUID, TIMESTAMP, TIMESTAMP) TO authenticated;

-- إضافة تعليقات
COMMENT ON FUNCTION trigger_auto_assign_new_order() IS 
'دالة trigger للتوزيع التلقائي للطلبيات الجديدة';

COMMENT ON FUNCTION toggle_auto_assignment(UUID, BOOLEAN) IS 
'دالة لتفعيل أو إلغاء تفعيل التوزيع التلقائي للطلبيات';

COMMENT ON FUNCTION get_auto_assignment_stats(UUID, TIMESTAMP, TIMESTAMP) IS 
'دالة للحصول على إحصائيات التوزيع التلقائي للطلبيات'; 