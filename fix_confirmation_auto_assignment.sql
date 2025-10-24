-- إصلاح نظام التوزيع التلقائي ليعمل مع النظام الجديد (confirmation_*)
-- هذا الملف يحل مشكلة عدم عمل التوزيع التلقائي للطلبات

-- 1. إنشاء function جديد للتوزيع التلقائي مع النظام الجديد
CREATE OR REPLACE FUNCTION auto_assign_order_to_confirmation_agent(
    p_order_id uuid, 
    p_organization_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_agent_id UUID;
    v_result JSON;
    v_order_total DECIMAL;
    v_available_agents UUID[];
    v_agent_count INTEGER;
    v_assignment_id UUID;
    v_rule_config JSONB;
BEGIN
    -- التحقق من وجود الطلب
    SELECT total INTO v_order_total
    FROM online_orders 
    WHERE id = p_order_id 
      AND organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Order not found'
        );
    END IF;

    -- التحقق من عدم وجود توزيع سابق
    IF EXISTS (
        SELECT 1 FROM confirmation_order_assignments 
        WHERE order_id = p_order_id 
        AND organization_id = p_organization_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Order already assigned'
        );
    END IF;

    -- جلب قانون التوزيع النشط
    SELECT config INTO v_rule_config
    FROM confirmation_assignment_rules
    WHERE organization_id = p_organization_id
      AND is_active = true
      AND rule_type = 'fair_rotation'
    ORDER BY priority ASC
    LIMIT 1;

    IF v_rule_config IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No active assignment rule found'
        );
    END IF;

    -- جلب الموظفين المحددين في القانون
    SELECT array_agg(agent_id), count(*) 
    INTO v_available_agents, v_agent_count
    FROM (
        SELECT jsonb_array_elements_text(v_rule_config->'assign_to_agents')::uuid as agent_id
    ) rule_agents
    JOIN confirmation_agents ca ON rule_agents.agent_id = ca.id
    WHERE ca.organization_id = p_organization_id
      AND ca.status = 'active';

    IF v_agent_count IS NULL OR v_agent_count = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No active agents found in assignment rule'
        );
    END IF;

        -- تطبيق خوارزمية Round Robin على الموظفين المحددين في القانون
        -- اختيار الموظف الذي لم يحصل على طلب مؤخراً (آخر توزيع)
        SELECT ca.id INTO v_agent_id
        FROM confirmation_agents ca
        LEFT JOIN (
            SELECT 
                agent_id,
                MAX(created_at) as last_assignment
            FROM confirmation_order_assignments 
            WHERE organization_id = p_organization_id
              AND status IN ('assigned', 'in_progress', 'confirmed')
            GROUP BY agent_id
        ) last_assignments ON ca.id = last_assignments.agent_id
        WHERE ca.id = ANY(v_available_agents)
        ORDER BY 
            COALESCE(last_assignments.last_assignment, '1900-01-01'::timestamp) ASC,
            ca.created_at ASC
        LIMIT 1;

    -- إنشاء التوزيع في النظام الجديد
    INSERT INTO confirmation_order_assignments (
        organization_id,
        order_id,
        agent_id,
        assignment_strategy,
        assignment_reason,
        status,
        created_at
    ) VALUES (
        p_organization_id,
        p_order_id,
        v_agent_id,
        'auto',
        'توزيع تلقائي باستخدام النظام الجديد',
        'assigned',
        NOW()
    ) RETURNING id INTO v_assignment_id;

    -- إرجاع النتيجة
    RETURN json_build_object(
        'success', true,
        'agent_id', v_agent_id,
        'assignment_id', v_assignment_id,
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

-- 2. تحديث الـ trigger لاستخدام النظام الجديد
CREATE OR REPLACE FUNCTION trigger_auto_assign_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auto_assign_enabled BOOLEAN := false;
    v_result JSON;
BEGIN
    -- التحقق من تفعيل نظام التأكيد
    SELECT 
        COALESCE(auto_assignment_enabled, false)
    INTO v_auto_assign_enabled
    FROM confirmation_settings
    WHERE organization_id = NEW.organization_id;

    -- إذا كان التوزيع التلقائي مفعل والطلب غير مُكلف
    IF v_auto_assign_enabled = true AND NEW.assigned_agent_id IS NULL THEN
        -- تأخير قصير للسماح للطلب بالحفظ أولاً
        PERFORM pg_sleep(0.1);
        
        -- استدعاء دالة التوزيع التلقائي الجديدة
        SELECT auto_assign_order_to_confirmation_agent(NEW.id, NEW.organization_id) INTO v_result;
        
        -- تسجيل النتيجة في السجلات
        IF (v_result->>'success')::boolean = true THEN
            RAISE NOTICE 'Auto-assigned order % to confirmation agent %', NEW.id, v_result->>'agent_id';
        ELSE
            RAISE WARNING 'Failed to auto-assign order %: %', NEW.id, v_result->>'error';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 2.1. تحديث function التوزيع القديم ليعمل مع النظام الجديد
CREATE OR REPLACE FUNCTION auto_assign_order_to_agent(p_order_id uuid, p_organization_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- استدعاء function النظام الجديد
    SELECT auto_assign_order_to_confirmation_agent(p_order_id, p_organization_id) INTO v_result;
    
    -- إرجاع النتيجة
    RETURN v_result;
END;
$$;

-- 3. إنشاء إعدادات المؤسسة إذا لم تكن موجودة
INSERT INTO confirmation_settings (
    organization_id,
    auto_assignment_enabled,
    default_strategy,
    escalation_minutes,
    queue_rebalancing_minutes,
    auto_assignment_windows,
    segmentation_defaults,
    compensation_defaults,
    reminders_settings,
    created_at,
    updated_at
) 
SELECT 
    '6c2ed605-0880-4e40-af50-78f80f7283bb',
    true,
    'fair_rotation',
    45,
    15,
    '{"weekdays": ["sat", "sun", "mon", "tue", "wed"], "hours": {"start": "09:00", "end": "19:00"}}'::jsonb,
    '{"product": [], "priority": ["vip", "normal"], "regions": []}'::jsonb,
    '{"mode": "monthly", "monthly_amount": 45000, "per_order_amount": 200}'::jsonb,
    '{"pending_followups": true, "bonus_alerts": true, "queue_threshold": 10}'::jsonb,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM confirmation_settings 
    WHERE organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
);

-- 4. إنشاء توزيعات للطلبات المعلقة الموجودة
INSERT INTO confirmation_order_assignments (
    organization_id,
    order_id,
    agent_id,
    assignment_strategy,
    assignment_reason,
    status,
    created_at
)
SELECT 
    '6c2ed605-0880-4e40-af50-78f80f7283bb' as organization_id,
    o.id as order_id,
    ca.id as agent_id,
    'manual' as assignment_strategy,
    'توزيع للطلبات الموجودة' as assignment_reason,
    'assigned' as status,
    NOW() as created_at
FROM online_orders o
CROSS JOIN LATERAL (
    SELECT id 
    FROM confirmation_agents 
    WHERE organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
      AND status = 'active'
    ORDER BY created_at ASC
    LIMIT 1
) ca
WHERE o.organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
  AND o.status = 'pending'
  AND o.id NOT IN (
    SELECT order_id FROM confirmation_order_assignments 
    WHERE organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
  )
LIMIT 5;

-- 5. تحديث إعدادات التوزيع القديم لتعطيله
UPDATE order_distribution_settings 
SET 
    call_center_enabled = false,
    call_center_settings = '{"auto_assignment": false}'::jsonb
WHERE organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb';

-- 6. إنشاء function لاختبار التوزيع التلقائي
CREATE OR REPLACE FUNCTION test_confirmation_auto_assignment()
RETURNS TABLE(
    order_id uuid,
    agent_id uuid,
    agent_name text,
    assignment_id uuid,
    success boolean,
    error_message text
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_order RECORD;
    v_result JSON;
BEGIN
    -- اختبار التوزيع على الطلبات المعلقة
    FOR v_order IN 
        SELECT id, customer_order_number 
        FROM online_orders 
        WHERE organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
          AND status = 'pending'
          AND id NOT IN (
              SELECT order_id FROM confirmation_order_assignments 
              WHERE organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
          )
        LIMIT 3
    LOOP
        -- محاولة التوزيع
        SELECT auto_assign_order_to_confirmation_agent(v_order.id, '6c2ed605-0880-4e40-af50-78f80f7283bb') INTO v_result;
        
        -- إرجاع النتيجة
        RETURN QUERY
        SELECT 
            v_order.id,
            (v_result->>'agent_id')::uuid,
            (SELECT full_name FROM confirmation_agents WHERE id = (v_result->>'agent_id')::uuid),
            (v_result->>'assignment_id')::uuid,
            (v_result->>'success')::boolean,
            v_result->>'error';
    END LOOP;
END;
$$;

-- 7. إنشاء view لعرض حالة التوزيعات
CREATE OR REPLACE VIEW confirmation_assignments_overview AS
SELECT 
    coa.id as assignment_id,
    coa.order_id,
    o.customer_order_number,
    o.status as order_status,
    ca.full_name as agent_name,
    ca.status as agent_status,
    coa.status as assignment_status,
    coa.assignment_strategy,
    coa.created_at as assigned_at
FROM confirmation_order_assignments coa
JOIN online_orders o ON coa.order_id = o.id
JOIN confirmation_agents ca ON coa.agent_id = ca.id
WHERE coa.organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
ORDER BY coa.created_at DESC;

-- رسالة نجاح
DO $$
BEGIN
    RAISE NOTICE 'تم إصلاح نظام التوزيع التلقائي بنجاح!';
    RAISE NOTICE 'الآن يمكنك:';
    RAISE NOTICE '1. اختبار التوزيع: SELECT * FROM test_confirmation_auto_assignment();';
    RAISE NOTICE '2. عرض التوزيعات: SELECT * FROM confirmation_assignments_overview;';
    RAISE NOTICE '3. التوزيع التلقائي سيعمل للطلبات الجديدة تلقائياً';
END;
$$;
