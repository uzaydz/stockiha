-- دالة التوزيع التلقائي للطلبيات على وكلاء مركز الاتصال
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
    v_distribution_type TEXT;
    v_result JSON;
    v_order_total DECIMAL;
    v_order_priority INTEGER;
    v_agent_workload INTEGER;
    v_min_workload INTEGER;
    v_available_agents UUID[];
    v_expert_agents UUID[];
    v_round_robin_agent UUID;
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

    -- جلب نوع التوزيع المفعل
    SELECT distribution_type INTO v_distribution_type
    FROM call_center_distribution_rules
    WHERE organization_id = p_organization_id 
      AND is_active = true
    ORDER BY priority ASC
    LIMIT 1;

    -- إذا لم توجد قواعد توزيع، استخدم Round Robin كافتراضي
    IF v_distribution_type IS NULL THEN
        v_distribution_type := 'round_robin';
    END IF;

    -- حساب أولوية الطلب بناءً على القيمة
    v_order_priority := CASE 
        WHEN v_order_total >= 1000 THEN 1  -- عالية جداً
        WHEN v_order_total >= 500 THEN 2   -- عالية
        WHEN v_order_total >= 200 THEN 3   -- متوسطة
        WHEN v_order_total >= 100 THEN 4   -- منخفضة
        ELSE 5                             -- منخفضة جداً
    END;

    -- جلب الوكلاء المتاحين
    SELECT array_agg(id) INTO v_available_agents
    FROM call_center_agents
    WHERE organization_id = p_organization_id
      AND is_active = true
      AND availability_status = 'available';

    IF array_length(v_available_agents, 1) IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No available agents found'
        );
    END IF;

    -- تطبيق خوارزمية التوزيع حسب النوع
    CASE v_distribution_type
        WHEN 'round_robin' THEN
            -- Round Robin: اختيار الوكيل التالي في الدور
            SELECT id INTO v_agent_id
            FROM call_center_agents
            WHERE id = ANY(v_available_agents)
            ORDER BY last_assignment_time ASC NULLS FIRST
            LIMIT 1;

        WHEN 'smart' THEN
            -- Smart: توزيع ذكي بناءً على عبء العمل والخبرة
            SELECT ca.id INTO v_agent_id
            FROM call_center_agents ca
            LEFT JOIN call_center_agent_workload caw ON ca.id = caw.agent_id
            WHERE ca.id = ANY(v_available_agents)
              AND (caw.current_orders IS NULL OR caw.current_orders < ca.max_concurrent_orders)
            ORDER BY 
                COALESCE(caw.current_orders, 0) ASC,
                ca.experience_level DESC,
                ca.performance_score DESC
            LIMIT 1;

        WHEN 'availability' THEN
            -- Availability: اختيار الوكيل الأقل انشغالاً
            SELECT ca.id INTO v_agent_id
            FROM call_center_agents ca
            LEFT JOIN call_center_agent_workload caw ON ca.id = caw.agent_id
            WHERE ca.id = ANY(v_available_agents)
            ORDER BY COALESCE(caw.current_orders, 0) ASC
            LIMIT 1;

        WHEN 'priority' THEN
            -- Priority: توزيع بناءً على أولوية الطلب ومستوى الوكيل
            SELECT ca.id INTO v_agent_id
            FROM call_center_agents ca
            WHERE ca.id = ANY(v_available_agents)
              AND ca.experience_level >= (6 - v_order_priority) -- مطابقة مستوى الخبرة مع الأولوية
            ORDER BY ca.performance_score DESC
            LIMIT 1;

        WHEN 'expert' THEN
            -- Expert: توزيع على الخبراء للطلبات المعقدة
            SELECT ca.id INTO v_agent_id
            FROM call_center_agents ca
            WHERE ca.id = ANY(v_available_agents)
              AND ca.experience_level >= 8
              AND ca.performance_score >= 85
            ORDER BY ca.performance_score DESC
            LIMIT 1;

            -- إذا لم يوجد خبراء، استخدم Smart
            IF v_agent_id IS NULL THEN
                SELECT ca.id INTO v_agent_id
                FROM call_center_agents ca
                LEFT JOIN call_center_agent_workload caw ON ca.id = caw.agent_id
                WHERE ca.id = ANY(v_available_agents)
                ORDER BY 
                    COALESCE(caw.current_orders, 0) ASC,
                    ca.experience_level DESC
                LIMIT 1;
            END IF;

        ELSE
            -- افتراضي: Round Robin
            SELECT id INTO v_agent_id
            FROM call_center_agents
            WHERE id = ANY(v_available_agents)
            ORDER BY last_assignment_time ASC NULLS FIRST
            LIMIT 1;
    END CASE;

    -- إذا لم يتم العثور على وكيل، اختر أي وكيل متاح
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

    -- تحديث آخر وقت تكليف للوكيل
    UPDATE call_center_agents 
    SET 
        last_assignment_time = NOW(),
        total_assigned_orders = COALESCE(total_assigned_orders, 0) + 1
    WHERE id = v_agent_id;

    -- تحديث عبء العمل للوكيل
    INSERT INTO call_center_agent_workload (agent_id, current_orders, last_updated)
    VALUES (v_agent_id, 1, NOW())
    ON CONFLICT (agent_id) 
    DO UPDATE SET 
        current_orders = call_center_agent_workload.current_orders + 1,
        last_updated = NOW();

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
        'Automatic assignment using ' || v_distribution_type || ' algorithm',
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

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_online_orders_assignment 
ON online_orders(organization_id, assigned_agent_id, created_at) 
WHERE assigned_agent_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_call_center_agents_availability 
ON call_center_agents(organization_id, is_active, availability_status, last_assignment_time);

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION auto_assign_order_to_agent(UUID, UUID) TO authenticated;

-- إضافة تعليق
COMMENT ON FUNCTION auto_assign_order_to_agent(UUID, UUID) IS 
'دالة التوزيع التلقائي للطلبيات على وكلاء مركز الاتصال بناءً على خوارزميات مختلفة'; 