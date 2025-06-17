-- إنشاء جداول Call Center Distribution
-- يجب تشغيل هذا الملف بعد التأكد من وجود الجداول الأساسية

-- 1. إنشاء جدول قواعد التوزيع
CREATE TABLE IF NOT EXISTS call_center_distribution_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('region', 'workload', 'performance', 'availability', 'specialization', 'time_based', 'order_value')),
    priority_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    conditions JSONB DEFAULT '{}'::jsonb NOT NULL,
    actions JSONB DEFAULT '{}'::jsonb NOT NULL,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. إنشاء جدول ربط الطلبات بالوكلاء
CREATE TABLE IF NOT EXISTS call_center_order_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES online_orders(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES call_center_agents(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    assignment_type TEXT DEFAULT 'auto' CHECK (assignment_type IN ('auto', 'manual', 'priority', 'expert', 'region_based')),
    assignment_reason TEXT,
    distribution_rule_id UUID REFERENCES call_center_distribution_rules(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'transferred', 'cancelled', 'expired')),
    priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    call_attempts INTEGER DEFAULT 0,
    max_call_attempts INTEGER DEFAULT 3,
    last_call_attempt TIMESTAMP WITH TIME ZONE,
    next_call_scheduled TIMESTAMP WITH TIME ZONE,
    call_status TEXT CHECK (call_status IN ('pending', 'answered', 'no_answer', 'busy', 'failed', 'voicemail')),
    call_outcome TEXT CHECK (call_outcome IN ('confirmed', 'cancelled', 'modified', 'reschedule', 'no_contact', 'wrong_number')),
    call_duration INTEGER,
    call_notes TEXT,
    completion_time TIMESTAMP WITH TIME ZONE,
    completion_reason TEXT,
    agent_rating INTEGER CHECK (agent_rating BETWEEN 1 AND 5),
    customer_satisfaction INTEGER CHECK (customer_satisfaction BETWEEN 1 AND 5),
    transferred_to_agent_id UUID REFERENCES call_center_agents(id),
    transfer_reason TEXT,
    transferred_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. إنشاء جدول أعباء العمل
CREATE TABLE IF NOT EXISTS call_center_agent_workload (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES call_center_agents(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    assigned_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    pending_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    avg_call_duration INTEGER DEFAULT 0,
    response_time_avg INTEGER DEFAULT 0,
    customer_satisfaction_avg DECIMAL(3,2) DEFAULT 0.00,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    is_available BOOLEAN DEFAULT TRUE,
    availability_hours INTEGER DEFAULT 8,
    actual_work_hours INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, date)
);

-- 4. إنشاء جدول اللوج
CREATE TABLE IF NOT EXISTS call_center_distribution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('assign', 'transfer', 'complete', 'cancel', 'escalate', 'retry')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'agent', 'rule')),
    entity_id UUID NOT NULL,
    old_state JSONB,
    new_state JSONB,
    reason TEXT,
    performed_by UUID REFERENCES users(id),
    automated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_ccoa_order_id ON call_center_order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_ccoa_agent_id ON call_center_order_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_ccoa_org_id ON call_center_order_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_ccoa_status ON call_center_order_assignments(status);

CREATE INDEX IF NOT EXISTS idx_ccdr_org_id ON call_center_distribution_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_ccdr_active ON call_center_distribution_rules(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ccaw_agent_id ON call_center_agent_workload(agent_id);
CREATE INDEX IF NOT EXISTS idx_ccaw_date ON call_center_agent_workload(date);

CREATE INDEX IF NOT EXISTS idx_ccdl_org_id ON call_center_distribution_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_ccdl_created_at ON call_center_distribution_log(created_at); 