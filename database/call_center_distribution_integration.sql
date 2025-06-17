-- ========================================
-- Call Center Distribution Integration SQL
-- تكامل نظام مركز الاتصالات مع توزيع الطلبات
-- ========================================

-- 1. إنشاء جدول ربط الطلبات بوكلاء الاتصالات
CREATE TABLE IF NOT EXISTS call_center_order_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES online_orders(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES call_center_agents(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- تفاصيل التوزيع
    assignment_type TEXT DEFAULT 'auto' CHECK (assignment_type IN ('auto', 'manual', 'priority', 'expert', 'region_based')),
    assignment_reason TEXT,
    distribution_rule_id UUID REFERENCES call_center_distribution_rules(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- حالة المهمة
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'transferred', 'cancelled', 'expired')),
    priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    
    -- تتبع المكالمات
    call_attempts INTEGER DEFAULT 0,
    max_call_attempts INTEGER DEFAULT 3,
    last_call_attempt TIMESTAMP WITH TIME ZONE,
    next_call_scheduled TIMESTAMP WITH TIME ZONE,
    call_status TEXT CHECK (call_status IN ('pending', 'answered', 'no_answer', 'busy', 'failed', 'voicemail')),
    call_outcome TEXT CHECK (call_outcome IN ('confirmed', 'cancelled', 'modified', 'reschedule', 'no_contact', 'wrong_number')),
    call_duration INTEGER, -- بالثواني
    call_notes TEXT,
    
    -- معلومات الإكمال
    completion_time TIMESTAMP WITH TIME ZONE,
    completion_reason TEXT,
    agent_rating INTEGER CHECK (agent_rating BETWEEN 1 AND 5),
    customer_satisfaction INTEGER CHECK (customer_satisfaction BETWEEN 1 AND 5),
    
    -- معلومات التحويل
    transferred_to_agent_id UUID REFERENCES call_center_agents(id),
    transfer_reason TEXT,
    transferred_at TIMESTAMP WITH TIME ZONE,
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. إنشاء جدول قواعد التوزيع المحدث للـ call center
CREATE TABLE IF NOT EXISTS call_center_distribution_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- معلومات القاعدة
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('region', 'workload', 'performance', 'availability', 'specialization', 'time_based', 'order_value')),
    priority_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- شروط التطبيق
    conditions JSONB DEFAULT '{}' NOT NULL,
    /* أمثلة على الشروط:
    {
      "regions": ["قسنطينة", "الجزائر", "وهران"],
      "min_order_value": 1000,
      "max_order_value": 5000,
      "product_categories": ["electronics", "clothing"],
      "time_slots": [{"start": "09:00", "end": "17:00", "days": ["monday", "tuesday"]}],
      "agent_specializations": ["customer_service", "technical_support"],
      "max_current_orders": 5,
      "min_performance_score": 80
    }
    */
    
    -- إجراءات التوزيع
    actions JSONB DEFAULT '{}' NOT NULL,
    /* أمثلة على الإجراءات:
    {
      "assign_to_agents": ["agent_id_1", "agent_id_2"],
      "priority_level": 4,
      "max_attempts": 3,
      "call_interval_minutes": 30,
      "escalate_after_attempts": 2,
      "fallback_rule_id": "uuid"
    }
    */
    
    -- إحصائيات الاستخدام
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. إنشاء جدول تتبع أعباء العمل للوكلاء
CREATE TABLE IF NOT EXISTS call_center_agent_workload (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES call_center_agents(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- إحصائيات يومية
    date DATE DEFAULT CURRENT_DATE,
    assigned_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    pending_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    
    -- إحصائيات المكالمات
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    avg_call_duration INTEGER DEFAULT 0, -- بالثواني
    
    -- أداء العمل
    response_time_avg INTEGER DEFAULT 0, -- بالدقائق
    customer_satisfaction_avg DECIMAL(3,2) DEFAULT 0.00,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- حالة التوفر
    is_available BOOLEAN DEFAULT TRUE,
    availability_hours INTEGER DEFAULT 8, -- ساعات العمل المتوقعة
    actual_work_hours INTEGER DEFAULT 0, -- ساعات العمل الفعلية
    
    -- تحديث تلقائي
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(agent_id, date)
);

-- 4. إنشاء جدول لوج أنشطة التوزيع
CREATE TABLE IF NOT EXISTS call_center_distribution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- معلومات العملية
    action_type TEXT NOT NULL CHECK (action_type IN ('assign', 'transfer', 'complete', 'cancel', 'escalate', 'retry')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'agent', 'rule')),
    entity_id UUID NOT NULL,
    
    -- تفاصيل العملية
    old_state JSONB,
    new_state JSONB,
    reason TEXT,
    
    -- معلومات المستخدم
    performed_by UUID REFERENCES users(id),
    automated BOOLEAN DEFAULT TRUE,
    
    -- معلومات النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. تحديث جدول إعدادات التوزيع الموجود
ALTER TABLE order_distribution_settings 
ADD COLUMN IF NOT EXISTS call_center_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS call_center_settings JSONB DEFAULT '{}';

-- تحديث الإعدادات الافتراضية للـ call center
UPDATE order_distribution_settings 
SET call_center_settings = '{
    "auto_assignment": true,
    "max_orders_per_agent": 10,
    "call_retry_interval": 30,
    "max_retry_attempts": 3,
    "working_hours": {
        "start": "09:00",
        "end": "17:00",
        "timezone": "Africa/Algiers"
    },
    "weekend_enabled": false,
    "priority_rules": {
        "high_value_threshold": 3000,
        "vip_customer_priority": true,
        "urgent_order_priority": true
    },
    "escalation_rules": {
        "no_answer_escalate_after": 2,
        "failed_call_escalate_after": 3,
        "escalate_to_supervisor": true
    },
    "performance_weights": {
        "availability": 0.3,
        "success_rate": 0.4,
        "customer_satisfaction": 0.3
    }
}'
WHERE call_center_settings = '{}' OR call_center_settings IS NULL;

-- ========================================
-- إضافة الفهارس للأداء الأمثل
-- ========================================

-- فهارس جدول call_center_order_assignments
CREATE INDEX IF NOT EXISTS idx_ccoa_order_id ON call_center_order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_ccoa_agent_id ON call_center_order_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_ccoa_org_id ON call_center_order_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_ccoa_status ON call_center_order_assignments(status);
CREATE INDEX IF NOT EXISTS idx_ccoa_assigned_at ON call_center_order_assignments(assigned_at);
CREATE INDEX IF NOT EXISTS idx_ccoa_next_call ON call_center_order_assignments(next_call_scheduled) WHERE next_call_scheduled IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ccoa_priority ON call_center_order_assignments(priority_level);

-- فهارس جدول call_center_distribution_rules
CREATE INDEX IF NOT EXISTS idx_ccdr_org_id ON call_center_distribution_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_ccdr_type ON call_center_distribution_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_ccdr_active ON call_center_distribution_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ccdr_priority ON call_center_distribution_rules(priority_order);

-- فهارس جدول call_center_agent_workload
CREATE INDEX IF NOT EXISTS idx_ccaw_agent_id ON call_center_agent_workload(agent_id);
CREATE INDEX IF NOT EXISTS idx_ccaw_date ON call_center_agent_workload(date);
CREATE INDEX IF NOT EXISTS idx_ccaw_org_id ON call_center_agent_workload(organization_id);

-- فهارس جدول call_center_distribution_log
CREATE INDEX IF NOT EXISTS idx_ccdl_org_id ON call_center_distribution_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_ccdl_entity ON call_center_distribution_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ccdl_created_at ON call_center_distribution_log(created_at);

-- ========================================
-- إنشاء الـ Functions والـ Triggers
-- ========================================

-- 1. Function لتحديث workload تلقائياً
CREATE OR REPLACE FUNCTION update_agent_workload()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث إحصائيات الوكيل عند تغيير حالة المهمة
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
    -- البحث عن أفضل وكيل متاح بناءً على الشروط
    SELECT ca.id INTO v_agent_id
    FROM call_center_agents ca
    LEFT JOIN call_center_agent_workload caw ON ca.id = caw.agent_id AND caw.date = CURRENT_DATE
    WHERE ca.organization_id = p_organization_id
        AND ca.is_active = TRUE
        AND ca.is_available = TRUE
        AND (p_order_province IS NULL OR ca.assigned_regions ? p_order_province)
        AND COALESCE(caw.pending_orders, 0) < COALESCE(ca.max_daily_orders, 10)
    ORDER BY 
        COALESCE(caw.pending_orders, 0) ASC,  -- أقل عبء عمل
        COALESCE((ca.performance_metrics->>'customer_satisfaction')::DECIMAL, 0) DESC,  -- أعلى رضا عملاء
        ca.last_activity DESC NULLS LAST  -- آخر نشاط
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
    v_result JSONB;
BEGIN
    -- جلب معلومات الطلب
    SELECT 
        form_data->>'province' as province, 
        total,
        id
    INTO v_order_info
    FROM online_orders 
    WHERE id = p_order_id AND organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        RETURN '{"success": false, "error": "Order not found"}';
    END IF;
    
    -- التحقق من عدم وجود توزيع سابق
    IF EXISTS (SELECT 1 FROM call_center_order_assignments WHERE order_id = p_order_id) THEN
        RETURN '{"success": false, "error": "Order already assigned"}';
    END IF;
    
    -- البحث عن الوكيل المناسب
    SELECT get_best_available_agent(
        p_organization_id,
        v_order_info.province,
        v_order_info.total
    ) INTO v_agent_id;
    
    IF v_agent_id IS NULL THEN
        RETURN '{"success": false, "error": "No available agent found"}';
    END IF;
    
    -- إنشاء التوزيع
    INSERT INTO call_center_order_assignments (
        order_id, agent_id, organization_id, assignment_type, assignment_reason
    ) VALUES (
        p_order_id, v_agent_id, p_organization_id, 'auto', 'Automatic assignment based on workload and region'
    ) RETURNING id INTO v_assignment_id;
    
    -- تسجيل في اللوج
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

-- ========================================
-- Views لسهولة الاستعلام
-- ========================================

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

-- ========================================
-- إدراج بيانات تجريبية
-- ========================================

-- إدراج قواعد توزيع افتراضية
INSERT INTO call_center_distribution_rules (organization_id, name, description, rule_type, conditions, actions, priority_order) 
SELECT DISTINCT
    organization_id,
    'التوزيع حسب المنطقة الجغرافية',
    'توزيع الطلبات على الوكلاء بناءً على المنطقة المخصصة لهم',
    'region',
    '{"regions": ["قسنطينة", "الجزائر", "وهران", "عنابة", "سطيف"]}',
    '{"priority_level": 3, "max_attempts": 3}',
    1
FROM call_center_agents
WHERE NOT EXISTS (
    SELECT 1 FROM call_center_distribution_rules 
    WHERE organization_id = call_center_agents.organization_id 
    AND name = 'التوزيع حسب المنطقة الجغرافية'
);

INSERT INTO call_center_distribution_rules (organization_id, name, description, rule_type, conditions, actions, priority_order) 
SELECT DISTINCT
    organization_id,
    'الطلبات عالية القيمة',
    'توجيه الطلبات عالية القيمة للوكلاء ذوي الأداء المتميز',
    'order_value',
    '{"min_order_value": 3000}',
    '{"priority_level": 5, "assign_to_top_performers": true}',
    2
FROM call_center_agents
WHERE NOT EXISTS (
    SELECT 1 FROM call_center_distribution_rules 
    WHERE organization_id = call_center_agents.organization_id 
    AND name = 'الطلبات عالية القيمة'
);

-- إضافة أعمدة للجداول الموجودة إذا لم تكن موجودة
DO $$
BEGIN
    -- إضافة أعمدة للـ call center في جدول online_orders إذا لم تكن موجودة
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'online_orders' AND column_name = 'call_center_priority') THEN
        ALTER TABLE online_orders ADD COLUMN call_center_priority INTEGER DEFAULT 3;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'online_orders' AND column_name = 'call_center_notes') THEN
        ALTER TABLE online_orders ADD COLUMN call_center_notes TEXT;
    END IF;
END
$$;

COMMIT; 