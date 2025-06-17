-- التأكد من وجود جداول مركز الاتصالات
-- هذا الملف يضمن وجود جميع الجداول المطلوبة

-- جدول قواعد التوزيع
CREATE TABLE IF NOT EXISTS call_center_distribution_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('region', 'workload', 'performance', 'availability', 'specialization', 'time_based', 'order_value')),
    priority_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    conditions JSONB NOT NULL DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '{}',
    usage_count INTEGER NOT NULL DEFAULT 0,
    success_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول توزيع الطلبات على الوكلاء
CREATE TABLE IF NOT EXISTS call_center_order_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES call_center_agents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) NOT NULL DEFAULT 'auto' CHECK (assignment_type IN ('auto', 'manual', 'priority', 'expert', 'region_based')),
    assignment_reason TEXT,
    distribution_rule_id UUID REFERENCES call_center_distribution_rules(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'transferred', 'cancelled', 'expired')),
    priority_level INTEGER NOT NULL DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    call_attempts INTEGER NOT NULL DEFAULT 0,
    max_call_attempts INTEGER NOT NULL DEFAULT 3,
    last_call_attempt TIMESTAMP WITH TIME ZONE,
    next_call_scheduled TIMESTAMP WITH TIME ZONE,
    call_status VARCHAR(50) CHECK (call_status IN ('pending', 'answered', 'no_answer', 'busy', 'failed', 'voicemail')),
    call_outcome VARCHAR(50) CHECK (call_outcome IN ('confirmed', 'cancelled', 'modified', 'reschedule', 'no_contact', 'wrong_number')),
    call_duration INTEGER, -- بالثواني
    call_notes TEXT,
    completion_time TIMESTAMP WITH TIME ZONE,
    completion_reason TEXT,
    agent_rating INTEGER CHECK (agent_rating BETWEEN 1 AND 5),
    customer_satisfaction INTEGER CHECK (customer_satisfaction BETWEEN 1 AND 5),
    transferred_to_agent_id UUID REFERENCES call_center_agents(id) ON DELETE SET NULL,
    transfer_reason TEXT,
    transferred_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول أعباء العمل للوكلاء
CREATE TABLE IF NOT EXISTS call_center_agent_workload (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES call_center_agents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    assigned_orders INTEGER NOT NULL DEFAULT 0,
    completed_orders INTEGER NOT NULL DEFAULT 0,
    pending_orders INTEGER NOT NULL DEFAULT 0,
    cancelled_orders INTEGER NOT NULL DEFAULT 0,
    total_calls INTEGER NOT NULL DEFAULT 0,
    successful_calls INTEGER NOT NULL DEFAULT 0,
    failed_calls INTEGER NOT NULL DEFAULT 0,
    avg_call_duration DECIMAL(8,2) NOT NULL DEFAULT 0, -- بالدقائق
    response_time_avg DECIMAL(8,2) NOT NULL DEFAULT 0, -- بالدقائق
    customer_satisfaction_avg DECIMAL(3,2) NOT NULL DEFAULT 0,
    completion_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT true,
    availability_hours DECIMAL(4,2) NOT NULL DEFAULT 8,
    actual_work_hours DECIMAL(4,2) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, date)
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_call_center_distribution_rules_org_active ON call_center_distribution_rules(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_call_center_distribution_rules_priority ON call_center_distribution_rules(priority_order);

CREATE INDEX IF NOT EXISTS idx_call_center_order_assignments_agent ON call_center_order_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_center_order_assignments_order ON call_center_order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_call_center_order_assignments_org_status ON call_center_order_assignments(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_call_center_order_assignments_assigned_at ON call_center_order_assignments(assigned_at);

CREATE INDEX IF NOT EXISTS idx_call_center_agent_workload_agent_date ON call_center_agent_workload(agent_id, date);
CREATE INDEX IF NOT EXISTS idx_call_center_agent_workload_org_date ON call_center_agent_workload(organization_id, date);

-- إنشاء دالة لتحديث أعباء العمل تلقائياً
CREATE OR REPLACE FUNCTION update_agent_workload()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث إحصائيات الوكيل عند تغيير حالة التوزيع
    INSERT INTO call_center_agent_workload (
        agent_id, 
        organization_id, 
        date,
        assigned_orders,
        completed_orders,
        pending_orders,
        cancelled_orders
    )
    VALUES (
        NEW.agent_id,
        NEW.organization_id,
        CURRENT_DATE,
        CASE WHEN NEW.status = 'assigned' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status IN ('assigned', 'in_progress') THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END
    )
    ON CONFLICT (agent_id, date) 
    DO UPDATE SET
        assigned_orders = call_center_agent_workload.assigned_orders + 
            CASE WHEN NEW.status = 'assigned' AND OLD.status != 'assigned' THEN 1
                 WHEN NEW.status != 'assigned' AND OLD.status = 'assigned' THEN -1
                 ELSE 0 END,
        completed_orders = call_center_agent_workload.completed_orders + 
            CASE WHEN NEW.status = 'completed' AND OLD.status != 'completed' THEN 1
                 WHEN NEW.status != 'completed' AND OLD.status = 'completed' THEN -1
                 ELSE 0 END,
        pending_orders = call_center_agent_workload.pending_orders + 
            CASE WHEN NEW.status IN ('assigned', 'in_progress') AND OLD.status NOT IN ('assigned', 'in_progress') THEN 1
                 WHEN NEW.status NOT IN ('assigned', 'in_progress') AND OLD.status IN ('assigned', 'in_progress') THEN -1
                 ELSE 0 END,
        cancelled_orders = call_center_agent_workload.cancelled_orders + 
            CASE WHEN NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN 1
                 WHEN NEW.status != 'cancelled' AND OLD.status = 'cancelled' THEN -1
                 ELSE 0 END,
        last_updated = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفز
DROP TRIGGER IF EXISTS trigger_update_agent_workload ON call_center_order_assignments;
CREATE TRIGGER trigger_update_agent_workload
    AFTER INSERT OR UPDATE ON call_center_order_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_workload();

-- إضافة RLS policies
ALTER TABLE call_center_distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_center_order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_center_agent_workload ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للقواعد
CREATE POLICY IF NOT EXISTS "Users can view distribution rules for their organization" ON call_center_distribution_rules
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can manage distribution rules for their organization" ON call_center_distribution_rules
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- سياسات الأمان للتوزيعات
CREATE POLICY IF NOT EXISTS "Users can view order assignments for their organization" ON call_center_order_assignments
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can manage order assignments for their organization" ON call_center_order_assignments
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- سياسات الأمان لأعباء العمل
CREATE POLICY IF NOT EXISTS "Users can view agent workload for their organization" ON call_center_agent_workload
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can manage agent workload for their organization" ON call_center_agent_workload
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ); 