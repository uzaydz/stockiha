-- =====================================================
-- نظام مركز الاتصال - إعداد قاعدة البيانات المحسن
-- متوافق مع هيكل قاعدة البيانات الحالية
-- =====================================================

-- تفعيل الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- 1. جدول موظفي مركز الاتصال
-- =====================================================
CREATE TABLE IF NOT EXISTS call_center_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- إعدادات التخصيص
    assigned_regions JSONB DEFAULT '[]'::jsonb,
    assigned_stores JSONB DEFAULT '[]'::jsonb,
    max_daily_orders INTEGER DEFAULT 50,
    
    -- حالة الموظف
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- إعدادات الأداء
    performance_metrics JSONB DEFAULT '{
        "total_orders_handled": 0,
        "successful_calls": 0,
        "failed_calls": 0,
        "avg_call_duration": 0,
        "customer_satisfaction": 0,
        "last_performance_update": null
    }'::jsonb,
    
    -- معلومات إضافية
    specializations JSONB DEFAULT '[]'::jsonb,
    work_schedule JSONB DEFAULT '{
        "monday": {"start": "09:00", "end": "17:00", "active": true},
        "tuesday": {"start": "09:00", "end": "17:00", "active": true},
        "wednesday": {"start": "09:00", "end": "17:00", "active": true},
        "thursday": {"start": "09:00", "end": "17:00", "active": true},
        "friday": {"start": "09:00", "end": "17:00", "active": true},
        "saturday": {"start": "09:00", "end": "17:00", "active": false},
        "sunday": {"start": "09:00", "end": "17:00", "active": false}
    }'::jsonb,
    
    -- طوابع زمنية
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- قيود فريدة
    UNIQUE(user_id, organization_id)
);

-- =====================================================
-- 2. جدول جلسات العمل
-- =====================================================
CREATE TABLE IF NOT EXISTS call_center_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES call_center_agents(id) ON DELETE CASCADE,
    
    -- معلومات الجلسة
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    session_duration INTERVAL GENERATED ALWAYS AS (end_time - start_time) STORED,
    
    -- إحصائيات الجلسة
    orders_handled INTEGER DEFAULT 0,
    calls_made INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    
    -- ملاحظات وتفاصيل
    session_notes TEXT,
    session_type VARCHAR(50) DEFAULT 'regular',
    
    -- معلومات النظام
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. جدول إحصائيات الأداء اليومية
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_performance_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES call_center_agents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- إحصائيات الطلبيات
    orders_assigned INTEGER DEFAULT 0,
    orders_completed INTEGER DEFAULT 0,
    orders_cancelled INTEGER DEFAULT 0,
    orders_pending INTEGER DEFAULT 0,
    
    -- إحصائيات المكالمات
    calls_made INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    no_answer_calls INTEGER DEFAULT 0,
    
    -- أوقات الأداء
    avg_call_duration INTERVAL,
    total_work_time INTERVAL,
    break_time INTERVAL,
    
    -- تقييمات
    customer_satisfaction_score DECIMAL(3,2) CHECK (customer_satisfaction_score >= 0 AND customer_satisfaction_score <= 5),
    supervisor_rating DECIMAL(3,2) CHECK (supervisor_rating >= 0 AND supervisor_rating <= 5),
    
    -- معدلات محسوبة
    success_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN calls_made > 0 THEN (successful_calls::decimal / calls_made::decimal) * 100
            ELSE 0
        END
    ) STORED,
    
    completion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN orders_assigned > 0 THEN (orders_completed::decimal / orders_assigned::decimal) * 100
            ELSE 0
        END
    ) STORED,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- قيد فريد لضمان إحصائية واحدة لكل موظف في اليوم
    UNIQUE(agent_id, date)
);

-- =====================================================
-- 4. جدول سجل المكالمات
-- =====================================================
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES call_center_agents(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
    
    -- معلومات المكالمة
    call_start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    call_end_time TIMESTAMP WITH TIME ZONE,
    call_duration INTERVAL GENERATED ALWAYS AS (call_end_time - call_start_time) STORED,
    
    -- نتيجة المكالمة
    call_status VARCHAR(50) NOT NULL,
    call_outcome VARCHAR(50),
    
    -- ملاحظات المكالمة
    call_notes TEXT,
    customer_feedback TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    
    -- معلومات إضافية
    phone_number VARCHAR(20),
    call_attempt_number INTEGER DEFAULT 1,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. تحديث جدول الطلبيات الأونلاين
-- =====================================================
DO $$
BEGIN
    -- إضافة الأعمدة الجديدة إذا لم تكن موجودة
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'online_orders' AND column_name = 'assigned_agent_id') THEN
        ALTER TABLE online_orders ADD COLUMN assigned_agent_id UUID REFERENCES call_center_agents(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'online_orders' AND column_name = 'agent_priority') THEN
        ALTER TABLE online_orders ADD COLUMN agent_priority INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'online_orders' AND column_name = 'call_attempts') THEN
        ALTER TABLE online_orders ADD COLUMN call_attempts INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'online_orders' AND column_name = 'last_call_attempt') THEN
        ALTER TABLE online_orders ADD COLUMN last_call_attempt TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'online_orders' AND column_name = 'next_call_scheduled') THEN
        ALTER TABLE online_orders ADD COLUMN next_call_scheduled TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'online_orders' AND column_name = 'assignment_timestamp') THEN
        ALTER TABLE online_orders ADD COLUMN assignment_timestamp TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- =====================================================
-- 6. إنشاء دوال IMMUTABLE للفهارس
-- =====================================================

-- دالة IMMUTABLE لاستخراج التاريخ من timestamp
CREATE OR REPLACE FUNCTION extract_date_immutable(ts TIMESTAMP WITH TIME ZONE)
RETURNS DATE AS $$
BEGIN
    RETURN ts::date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 7. إنشاء الفهارس للأداء المحسن
-- =====================================================

-- فهارس جدول الموظفين
CREATE INDEX IF NOT EXISTS idx_agents_organization_active ON call_center_agents(organization_id, is_active, is_available);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON call_center_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_last_activity ON call_center_agents(last_activity) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agents_regions ON call_center_agents USING GIN(assigned_regions);
CREATE INDEX IF NOT EXISTS idx_agents_stores ON call_center_agents USING GIN(assigned_stores);

-- فهارس جدول الجلسات (تم إصلاح مشكلة IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON call_center_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_date ON call_center_sessions(extract_date_immutable(start_time));
CREATE INDEX IF NOT EXISTS idx_sessions_agent_date ON call_center_sessions(agent_id, extract_date_immutable(start_time));
CREATE INDEX IF NOT EXISTS idx_sessions_active ON call_center_sessions(agent_id) WHERE end_time IS NULL;

-- فهارس جدول الإحصائيات
CREATE INDEX IF NOT EXISTS idx_performance_agent_date ON agent_performance_stats(agent_id, date);
CREATE INDEX IF NOT EXISTS idx_performance_date ON agent_performance_stats(date);
CREATE INDEX IF NOT EXISTS idx_performance_success_rate ON agent_performance_stats(success_rate);

-- فهارس جدول سجل المكالمات (تم إصلاح مشكلة IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_call_logs_agent_id ON call_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_start_date ON call_logs(extract_date_immutable(call_start_time));
CREATE INDEX IF NOT EXISTS idx_call_logs_agent_date ON call_logs(agent_id, extract_date_immutable(call_start_time));
CREATE INDEX IF NOT EXISTS idx_call_logs_order ON call_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(call_status, call_outcome);

-- فهارس جدول الطلبيات المحسنة
CREATE INDEX IF NOT EXISTS idx_orders_assigned_agent ON online_orders(assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_agent_priority ON online_orders(assigned_agent_id, agent_priority, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_call_attempts ON online_orders(call_attempts, last_call_attempt);
CREATE INDEX IF NOT EXISTS idx_orders_next_call ON online_orders(next_call_scheduled) WHERE next_call_scheduled IS NOT NULL;

-- =====================================================
-- 8. إنشاء Triggers للتحديث التلقائي
-- =====================================================

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agents_updated_at 
    BEFORE UPDATE ON call_center_agents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger لتحديث last_activity عند تسجيل الدخول
CREATE OR REPLACE FUNCTION update_agent_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE call_center_agents 
    SET last_activity = NOW() 
    WHERE id = NEW.agent_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_last_activity 
    AFTER INSERT ON call_center_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_agent_activity();

-- =====================================================
-- 9. إنشاء Views للاستعلامات المحسنة
-- =====================================================

-- View للموظفين النشطين مع إحصائياتهم
CREATE OR REPLACE VIEW active_agents_with_stats AS
SELECT 
    a.id,
    a.user_id,
    u.name as agent_name,
    u.email as agent_email,
    a.organization_id,
    a.is_available,
    a.last_activity,
    a.max_daily_orders,
    a.assigned_regions,
    a.assigned_stores,
    a.performance_metrics,
    
    -- إحصائيات اليوم
    COALESCE(ps.orders_assigned, 0) as today_orders_assigned,
    COALESCE(ps.orders_completed, 0) as today_orders_completed,
    COALESCE(ps.calls_made, 0) as today_calls_made,
    COALESCE(ps.successful_calls, 0) as today_successful_calls,
    COALESCE(ps.success_rate, 0) as today_success_rate,
    
    -- الجلسة النشطة
    s.id as active_session_id,
    s.start_time as session_start_time,
    s.orders_handled as session_orders_handled
    
FROM call_center_agents a
JOIN users u ON a.user_id = u.id
LEFT JOIN agent_performance_stats ps ON a.id = ps.agent_id AND ps.date = CURRENT_DATE
LEFT JOIN call_center_sessions s ON a.id = s.agent_id AND s.end_time IS NULL
WHERE a.is_active = true;

-- View للطلبيات المخصصة للموظفين
CREATE OR REPLACE VIEW agent_assigned_orders AS
SELECT 
    o.id,
    o.customer_order_number,
    o.assigned_agent_id,
    o.agent_priority,
    o.call_attempts,
    o.last_call_attempt,
    o.next_call_scheduled,
    o.assignment_timestamp,
    o.status,
    o.call_confirmation_status_id,
    o.call_confirmation_notes,
    o.total,
    o.created_at,
    o.form_data,
    
    -- معلومات الموظف
    a.user_id as agent_user_id,
    u.name as agent_name,
    
    -- آخر مكالمة
    cl.call_status as last_call_status,
    cl.call_outcome as last_call_outcome,
    cl.call_notes as last_call_notes
    
FROM online_orders o
JOIN call_center_agents a ON o.assigned_agent_id = a.id
JOIN users u ON a.user_id = u.id
LEFT JOIN LATERAL (
    SELECT call_status, call_outcome, call_notes
    FROM call_logs 
    WHERE order_id = o.id 
    ORDER BY call_start_time DESC 
    LIMIT 1
) cl ON true
WHERE o.assigned_agent_id IS NOT NULL;

-- =====================================================
-- 10. إعداد Row Level Security (RLS)
-- =====================================================

-- تفعيل RLS على الجداول الجديدة
ALTER TABLE call_center_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_center_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للموظفين
DROP POLICY IF EXISTS "Agents can view their own data" ON call_center_agents;
CREATE POLICY "Agents can view their own data" ON call_center_agents
    FOR SELECT USING (
        user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage agents in their organization" ON call_center_agents;
CREATE POLICY "Admins can manage agents in their organization" ON call_center_agents
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- سياسات الأمان للجلسات
DROP POLICY IF EXISTS "Agents can manage their own sessions" ON call_center_sessions;
CREATE POLICY "Agents can manage their own sessions" ON call_center_sessions
    FOR ALL USING (
        agent_id IN (
            SELECT id FROM call_center_agents 
            WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    );

-- سياسات الأمان للإحصائيات
DROP POLICY IF EXISTS "Agents can view their own stats" ON agent_performance_stats;
CREATE POLICY "Agents can view their own stats" ON agent_performance_stats
    FOR SELECT USING (
        agent_id IN (
            SELECT id FROM call_center_agents 
            WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Admins can view all stats in their organization" ON agent_performance_stats;
CREATE POLICY "Admins can view all stats in their organization" ON agent_performance_stats
    FOR SELECT USING (
        agent_id IN (
            SELECT a.id FROM call_center_agents a
            JOIN users u ON a.user_id = u.id
            WHERE a.organization_id IN (
                SELECT organization_id FROM users 
                WHERE auth_user_id = auth.uid() 
                AND role IN ('admin', 'super_admin')
            )
        )
    );

-- سياسات الأمان لسجل المكالمات
DROP POLICY IF EXISTS "Agents can manage their own call logs" ON call_logs;
CREATE POLICY "Agents can manage their own call logs" ON call_logs
    FOR ALL USING (
        agent_id IN (
            SELECT id FROM call_center_agents 
            WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    );

-- =====================================================
-- 11. إنشاء الدوال المخزنة للأداء المحسن
-- =====================================================

-- دالة تخصيص الطلبيات للموظفين
CREATE OR REPLACE FUNCTION assign_orders_to_agent(
    p_agent_id UUID,
    p_order_ids UUID[],
    p_priority INTEGER DEFAULT 0
)
RETURNS TABLE(assigned_count INTEGER, failed_orders UUID[]) AS $$
DECLARE
    v_assigned_count INTEGER := 0;
    v_failed_orders UUID[] := ARRAY[]::UUID[];
    v_order_id UUID;
BEGIN
    -- التحقق من وجود الموظف وأنه نشط
    IF NOT EXISTS (
        SELECT 1 FROM call_center_agents 
        WHERE id = p_agent_id AND is_active = true AND is_available = true
    ) THEN
        RAISE EXCEPTION 'Agent not found or not available';
    END IF;
    
    -- تخصيص الطلبيات
    FOREACH v_order_id IN ARRAY p_order_ids
    LOOP
        BEGIN
            UPDATE online_orders 
            SET 
                assigned_agent_id = p_agent_id,
                agent_priority = p_priority,
                assignment_timestamp = NOW(),
                updated_at = NOW()
            WHERE id = v_order_id 
                AND assigned_agent_id IS NULL 
                AND status IN ('pending', 'processing');
            
            IF FOUND THEN
                v_assigned_count := v_assigned_count + 1;
            ELSE
                v_failed_orders := array_append(v_failed_orders, v_order_id);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_failed_orders := array_append(v_failed_orders, v_order_id);
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_assigned_count, v_failed_orders;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة الحصول على إحصائيات لوحة التحكم
CREATE OR REPLACE FUNCTION get_agent_dashboard_stats(p_agent_id UUID)
RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    SELECT json_build_object(
        'today', json_build_object(
            'orders_assigned', COALESCE(ps.orders_assigned, 0),
            'orders_completed', COALESCE(ps.orders_completed, 0),
            'calls_made', COALESCE(ps.calls_made, 0),
            'successful_calls', COALESCE(ps.successful_calls, 0),
            'success_rate', COALESCE(ps.success_rate, 0),
            'completion_rate', COALESCE(ps.completion_rate, 0)
        ),
        'pending_orders', (
            SELECT COUNT(*) FROM online_orders 
            WHERE assigned_agent_id = p_agent_id 
                AND status IN ('pending', 'processing')
                AND call_confirmation_status_id IS NULL
        ),
        'high_priority_orders', (
            SELECT COUNT(*) FROM online_orders 
            WHERE assigned_agent_id = p_agent_id 
                AND agent_priority > 0
                AND status IN ('pending', 'processing')
        ),
        'overdue_calls', (
            SELECT COUNT(*) FROM online_orders 
            WHERE assigned_agent_id = p_agent_id 
                AND next_call_scheduled < NOW()
                AND status IN ('pending', 'processing')
        ),
        'active_session', (
            SELECT json_build_object(
                'id', s.id,
                'start_time', s.start_time,
                'orders_handled', s.orders_handled,
                'calls_made', s.calls_made
            )
            FROM call_center_sessions s
            WHERE s.agent_id = p_agent_id AND s.end_time IS NULL
            LIMIT 1
        )
    ) INTO v_stats
    FROM agent_performance_stats ps
    WHERE ps.agent_id = p_agent_id AND ps.date = CURRENT_DATE;
    
    RETURN COALESCE(v_stats, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة الحصول على الموظفين المتاحين
CREATE OR REPLACE FUNCTION get_available_agents(p_organization_id UUID)
RETURNS TABLE(
    agent_id UUID,
    agent_name TEXT,
    current_load INTEGER,
    max_capacity INTEGER,
    availability_score DECIMAL,
    assigned_regions JSONB,
    assigned_stores JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        u.name,
        COALESCE(current_orders.count, 0)::INTEGER,
        a.max_daily_orders,
        CASE 
            WHEN a.max_daily_orders > 0 THEN 
                (1.0 - (COALESCE(current_orders.count, 0)::DECIMAL / a.max_daily_orders::DECIMAL))
            ELSE 1.0
        END,
        a.assigned_regions,
        a.assigned_stores
    FROM call_center_agents a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN (
        SELECT 
            assigned_agent_id, 
            COUNT(*) as count
        FROM online_orders 
        WHERE status IN ('pending', 'processing') 
            AND assigned_agent_id IS NOT NULL
        GROUP BY assigned_agent_id
    ) current_orders ON a.id = current_orders.assigned_agent_id
    WHERE a.organization_id = p_organization_id
        AND a.is_active = true
        AND a.is_available = true
        AND (current_orders.count IS NULL OR current_orders.count < a.max_daily_orders)
    ORDER BY availability_score DESC, a.last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة تحديث إحصائيات الأداء
CREATE OR REPLACE FUNCTION update_agent_performance(p_agent_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO agent_performance_stats (
        agent_id, 
        date, 
        orders_assigned,
        orders_completed,
        orders_cancelled,
        calls_made,
        successful_calls,
        failed_calls,
        avg_call_duration
    )
    SELECT 
        p_agent_id,
        p_date,
        COUNT(CASE WHEN extract_date_immutable(o.assignment_timestamp) = p_date THEN 1 END),
        COUNT(CASE WHEN o.status = 'delivered' AND extract_date_immutable(o.updated_at) = p_date THEN 1 END),
        COUNT(CASE WHEN o.status = 'cancelled' AND extract_date_immutable(o.updated_at) = p_date THEN 1 END),
        COUNT(cl.id),
        COUNT(CASE WHEN cl.call_status = 'answered' THEN 1 END),
        COUNT(CASE WHEN cl.call_status != 'answered' THEN 1 END),
        AVG(cl.call_duration)
    FROM online_orders o
    LEFT JOIN call_logs cl ON o.id = cl.order_id AND extract_date_immutable(cl.call_start_time) = p_date
    WHERE o.assigned_agent_id = p_agent_id
    ON CONFLICT (agent_id, date) 
    DO UPDATE SET 
        orders_assigned = EXCLUDED.orders_assigned,
        orders_completed = EXCLUDED.orders_completed,
        orders_cancelled = EXCLUDED.orders_cancelled,
        calls_made = EXCLUDED.calls_made,
        successful_calls = EXCLUDED.successful_calls,
        failed_calls = EXCLUDED.failed_calls,
        avg_call_duration = EXCLUDED.avg_call_duration,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 12. إعداد الفهرسة المتقدمة للبحث
-- =====================================================

-- فهرس للبحث النصي في ملاحظات المكالمات
CREATE INDEX IF NOT EXISTS idx_call_logs_notes_search ON call_logs USING gin(to_tsvector('arabic', COALESCE(call_notes, '')));

-- فهرس مركب للاستعلامات المعقدة
CREATE INDEX IF NOT EXISTS idx_orders_agent_status_priority ON online_orders(assigned_agent_id, status, agent_priority, created_at) 
WHERE assigned_agent_id IS NOT NULL;

-- فهرس للطلبيات المجدولة للمكالمة
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_calls ON online_orders(next_call_scheduled, assigned_agent_id) 
WHERE next_call_scheduled IS NOT NULL AND assigned_agent_id IS NOT NULL;

-- =====================================================
-- 13. إضافة التعليقات والوصف
-- =====================================================

COMMENT ON TABLE call_center_agents IS 'جدول موظفي مركز الاتصال مع إعدادات التخصيص والأداء';
COMMENT ON TABLE call_center_sessions IS 'جدول جلسات العمل لتتبع نشاط الموظفين';
COMMENT ON TABLE agent_performance_stats IS 'إحصائيات الأداء اليومية للموظفين';
COMMENT ON TABLE call_logs IS 'سجل مفصل لجميع المكالمات';

-- =====================================================
-- انتهاء إعداد قاعدة البيانات
-- ===================================================== 