-- جدول إعدادات توزيع الطلبيات
CREATE TABLE IF NOT EXISTS order_distribution_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    auto_assignment_enabled BOOLEAN DEFAULT true,
    max_orders_per_agent_per_day INTEGER DEFAULT 50,
    reassignment_after_hours INTEGER DEFAULT 24,
    priority_order_threshold DECIMAL(10,2) DEFAULT 1000.00,
    working_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00"}',
    weekend_assignment BOOLEAN DEFAULT false,
    performance_weight INTEGER DEFAULT 30,
    workload_weight INTEGER DEFAULT 40,
    region_weight INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_settings_row CHECK (id = 1),
    CONSTRAINT valid_weights CHECK (performance_weight + workload_weight + region_weight = 100)
);

-- جدول قواعد التوزيع
CREATE TABLE IF NOT EXISTS distribution_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('region', 'store', 'workload', 'performance', 'time_based')),
    priority INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    conditions JSONB DEFAULT '{}',
    actions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول سجل التوزيع التلقائي
CREATE TABLE IF NOT EXISTS auto_assignment_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES online_orders(id),
    agent_id UUID REFERENCES call_center_agents(id),
    rule_id UUID REFERENCES distribution_rules(id),
    assignment_type VARCHAR(50) NOT NULL CHECK (assignment_type IN ('auto', 'manual', 'reassignment')),
    assignment_reason TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id)
);

-- جدول تنبيهات النظام
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_user_id UUID REFERENCES users(id),
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

-- جدول إحصائيات النظام اليومية
CREATE TABLE IF NOT EXISTS daily_system_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    pending_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    avg_call_duration DECIMAL(5,2) DEFAULT 0,
    avg_response_time DECIMAL(5,2) DEFAULT 0,
    active_agents_count INTEGER DEFAULT 0,
    peak_hour VARCHAR(5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_distribution_rules_type ON distribution_rules(type);
CREATE INDEX IF NOT EXISTS idx_distribution_rules_priority ON distribution_rules(priority);
CREATE INDEX IF NOT EXISTS idx_distribution_rules_active ON distribution_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_auto_assignment_log_order ON auto_assignment_log(order_id);
CREATE INDEX IF NOT EXISTS idx_auto_assignment_log_agent ON auto_assignment_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_auto_assignment_log_date ON auto_assignment_log(assigned_at);

CREATE INDEX IF NOT EXISTS idx_system_alerts_user ON system_alerts(target_user_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_read ON system_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created ON system_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_system_stats(date);

-- إدراج الإعدادات الافتراضية
INSERT INTO order_distribution_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- إدراج قواعد التوزيع الافتراضية
INSERT INTO distribution_rules (name, type, priority, conditions, actions) VALUES
('توزيع حسب المنطقة الجغرافية', 'region', 1, 
 '{"regions": ["الرياض", "جدة", "الدمام"]}', 
 '{"auto_assign": true, "priority_level": "medium"}'),
('توزيع الطلبيات عالية القيمة', 'performance', 2, 
 '{"min_performance_score": 85}', 
 '{"auto_assign": true, "priority_level": "high"}'),
('توزيع خارج ساعات العمل', 'time_based', 3, 
 '{"time_slots": [{"start": "18:00", "end": "08:00", "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]}]}', 
 '{"auto_assign": false, "priority_level": "low"}')
ON CONFLICT DO NOTHING;

-- تحديث الجداول الموجودة لإضافة أعمدة جديدة إذا لزم الأمر
ALTER TABLE call_center_agents 
ADD COLUMN IF NOT EXISTS distribution_weight DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS auto_assignment_enabled BOOLEAN DEFAULT true;

-- إضافة عمود لتتبع قاعدة التوزيع المستخدمة في الطلبيات
ALTER TABLE online_orders 
ADD COLUMN IF NOT EXISTS assignment_rule_id UUID REFERENCES distribution_rules(id),
ADD COLUMN IF NOT EXISTS auto_assigned BOOLEAN DEFAULT false; 