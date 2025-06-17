-- إصلاح محفز التوزيع التلقائي للطلبيات
-- يجب أن يتحقق من order_distribution_settings بدلاً من call_center_distribution_rules

-- حذف المحفز والدالة القديمة
DROP TRIGGER IF EXISTS trigger_auto_assign_order ON online_orders;
DROP FUNCTION IF EXISTS trigger_auto_assign_new_order();

-- إنشاء دالة محفز محدثة
CREATE OR REPLACE FUNCTION trigger_auto_assign_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auto_assign_enabled BOOLEAN := false;
    v_call_center_enabled BOOLEAN := false;
    v_result JSON;
BEGIN
    -- التحقق من تفعيل التوزيع التلقائي لمركز الاتصال
    SELECT 
        call_center_enabled,
        COALESCE((call_center_settings->>'auto_assignment')::boolean, false)
    INTO 
        v_call_center_enabled,
        v_auto_assign_enabled
    FROM order_distribution_settings
    WHERE organization_id = NEW.organization_id;

    -- إذا كان التوزيع التلقائي مفعل والطلب غير مُكلف
    IF v_call_center_enabled = true AND v_auto_assign_enabled = true AND NEW.assigned_agent_id IS NULL THEN
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

-- إنشاء المحفز الجديد
CREATE TRIGGER trigger_auto_assign_order
    AFTER INSERT ON online_orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_assign_new_order();

-- تحديث دالة auto_assign_order_to_agent لتعمل مع الوكلاء المتاحين
CREATE OR REPLACE FUNCTION auto_assign_order_to_agent(
    p_order_id UUID,
    p_organization_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_agent_id UUID;
    v_distribution_type TEXT := 'round_robin';
    v_result JSON;
    v_order_total DECIMAL;
    v_order_priority INTEGER;
    v_available_agents UUID[];
BEGIN
    -- التحقق من وجود الطلب وأنه غير مُكلف
    SELECT total INTO v_order_total
    FROM online_orders 
    WHERE id = p_order_id 
      AND organization_id = p_organization_id 
      AND assigned_agent_id IS NULL;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Order not found or already assigned'
        );
    END IF;

    -- حساب أولوية الطلب بناءً على القيمة
    v_order_priority := CASE 
        WHEN v_order_total >= 1000 THEN 1  -- عالية جداً
        WHEN v_order_total >= 500 THEN 2   -- عالية
        WHEN v_order_total >= 200 THEN 3   -- متوسطة
        WHEN v_order_total >= 100 THEN 4   -- منخفضة
        ELSE 5                             -- منخفضة جداً
    END;

    -- جلب الوكلاء المتاحين والنشطين
    SELECT array_agg(id) INTO v_available_agents
    FROM call_center_agents
    WHERE organization_id = p_organization_id
      AND is_active = true
      AND is_available = true;

    IF array_length(v_available_agents, 1) IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No available agents found'
        );
    END IF;

    -- تطبيق خوارزمية Round Robin البسيطة
    -- اختيار الوكيل الذي لم يحصل على طلب مؤخراً
    SELECT id INTO v_agent_id
    FROM call_center_agents
    WHERE id = ANY(v_available_agents)
    ORDER BY 
        COALESCE(last_activity, '1970-01-01'::timestamp) ASC,
        created_at ASC
    LIMIT 1;

    -- إذا لم يتم العثور على وكيل، اختر الأول المتاح
    IF v_agent_id IS NULL THEN
        SELECT v_available_agents[1] INTO v_agent_id;
    END IF;

    -- تكليف الطلب للوكيل
    UPDATE online_orders 
    SET 
        assigned_agent_id = v_agent_id,
        assignment_timestamp = NOW(),
        call_center_priority = v_order_priority,
        agent_priority = v_order_priority,
        call_attempts = 0,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- تحديث آخر نشاط للوكيل
    UPDATE call_center_agents 
    SET 
        last_activity = NOW()
    WHERE id = v_agent_id;

    -- إضافة سجل في تاريخ التكليفات
    INSERT INTO call_center_order_assignments (
        order_id, 
        agent_id, 
        assignment_type, 
        assignment_reason,
        assigned_at,
        organization_id
    ) VALUES (
        p_order_id, 
        v_agent_id, 
        'auto', 
        'Automatic assignment using round_robin algorithm',
        NOW(),
        p_organization_id
    );

    -- إرجاع النتيجة
    RETURN json_build_object(
        'success', true,
        'agent_id', v_agent_id,
        'distribution_type', v_distribution_type,
        'order_priority', v_order_priority,
        'assigned_at', NOW()
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION trigger_auto_assign_new_order() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_assign_order_to_agent(UUID, UUID) TO authenticated; 