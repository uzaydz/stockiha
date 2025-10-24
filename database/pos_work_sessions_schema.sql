-- =====================================================
-- جدول جلسات العمل اليومية لنقطة البيع
-- =====================================================
-- يتتبع جلسات العمل اليومية للموظفين مع رأس المال الأولي والنهائي

CREATE TABLE IF NOT EXISTS pos_work_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES pos_staff_sessions(id) ON DELETE CASCADE,
    staff_name VARCHAR(255) NOT NULL, -- نسخة للسرعة
    
    -- معلومات الجلسة
    opening_cash DECIMAL(10, 2) NOT NULL DEFAULT 0, -- رأس المال الأولي
    closing_cash DECIMAL(10, 2), -- رأس المال النهائي (null = جلسة نشطة)
    expected_cash DECIMAL(10, 2), -- المبلغ المتوقع بناءً على المبيعات
    cash_difference DECIMAL(10, 2), -- الفرق بين المتوقع والفعلي
    
    -- إحصائيات الجلسة
    total_sales DECIMAL(10, 2) DEFAULT 0, -- إجمالي المبيعات
    total_orders INTEGER DEFAULT 0, -- عدد الطلبات
    cash_sales DECIMAL(10, 2) DEFAULT 0, -- مبيعات نقدية
    card_sales DECIMAL(10, 2) DEFAULT 0, -- مبيعات بالبطاقة
    
    -- أوقات الجلسة
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    -- ملاحظات
    opening_notes TEXT, -- ملاحظات عند بدء الجلسة
    closing_notes TEXT, -- ملاحظات عند إغلاق الجلسة
    
    -- حالة الجلسة
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, closed
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- فهارس
    CONSTRAINT valid_status CHECK (status IN ('active', 'closed'))
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_pos_work_sessions_org ON pos_work_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_pos_work_sessions_staff ON pos_work_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_pos_work_sessions_status ON pos_work_sessions(status);
CREATE INDEX IF NOT EXISTS idx_pos_work_sessions_started ON pos_work_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_work_sessions_org_status ON pos_work_sessions(organization_id, status);

-- Trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_pos_work_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pos_work_sessions_updated_at
    BEFORE UPDATE ON pos_work_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_pos_work_sessions_updated_at();

-- =====================================================
-- RPC Function: بدء جلسة عمل جديدة
-- =====================================================
CREATE OR REPLACE FUNCTION start_pos_work_session(
    p_staff_id UUID,
    p_opening_cash DECIMAL,
    p_opening_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
    v_staff_name VARCHAR;
    v_active_session UUID;
    v_session_id UUID;
BEGIN
    -- الحصول على معلومات المستخدم
    SELECT u.id, u.organization_id
    INTO v_user_id, v_org_id
    FROM users u
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true
    LIMIT 1;

    -- التحقق من المستخدم
    IF v_org_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المستخدم غير مصرح له'
        );
    END IF;

    -- التحقق من وجود الموظف
    SELECT staff_name INTO v_staff_name
    FROM pos_staff_sessions
    WHERE id = p_staff_id
    AND organization_id = v_org_id
    AND is_active = true;

    IF v_staff_name IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'الموظف غير موجود أو غير نشط'
        );
    END IF;

    -- التحقق من عدم وجود جلسة نشطة للموظف
    SELECT id INTO v_active_session
    FROM pos_work_sessions
    WHERE staff_id = p_staff_id
    AND status = 'active'
    LIMIT 1;

    IF v_active_session IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'لديك جلسة نشطة بالفعل. يرجى إغلاقها أولاً'
        );
    END IF;

    -- إنشاء جلسة عمل جديدة
    INSERT INTO pos_work_sessions (
        organization_id,
        staff_id,
        staff_name,
        opening_cash,
        opening_notes,
        status
    ) VALUES (
        v_org_id,
        p_staff_id,
        v_staff_name,
        p_opening_cash,
        p_opening_notes,
        'active'
    )
    RETURNING id INTO v_session_id;

    RETURN json_build_object(
        'success', true,
        'session_id', v_session_id,
        'message', 'تم بدء الجلسة بنجاح'
    );
END;
$$;

-- =====================================================
-- RPC Function: إغلاق جلسة العمل
-- =====================================================
CREATE OR REPLACE FUNCTION close_pos_work_session(
    p_session_id UUID,
    p_closing_cash DECIMAL,
    p_closing_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_session RECORD;
    v_expected_cash DECIMAL;
    v_difference DECIMAL;
BEGIN
    -- الحصول على معلومات المستخدم
    SELECT u.organization_id
    INTO v_org_id
    FROM users u
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true
    LIMIT 1;

    -- التحقق من المستخدم
    IF v_org_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المستخدم غير مصرح له'
        );
    END IF;

    -- جلب معلومات الجلسة
    SELECT * INTO v_session
    FROM pos_work_sessions
    WHERE id = p_session_id
    AND organization_id = v_org_id
    AND status = 'active';

    IF v_session.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'الجلسة غير موجودة أو مغلقة بالفعل'
        );
    END IF;

    -- حساب المبلغ المتوقع (رأس المال الأولي + المبيعات النقدية)
    v_expected_cash := v_session.opening_cash + v_session.cash_sales;
    v_difference := p_closing_cash - v_expected_cash;

    -- إغلاق الجلسة
    UPDATE pos_work_sessions
    SET 
        closing_cash = p_closing_cash,
        expected_cash = v_expected_cash,
        cash_difference = v_difference,
        closing_notes = p_closing_notes,
        status = 'closed',
        ended_at = NOW()
    WHERE id = p_session_id;

    RETURN json_build_object(
        'success', true,
        'expected_cash', v_expected_cash,
        'closing_cash', p_closing_cash,
        'difference', v_difference,
        'message', 'تم إغلاق الجلسة بنجاح'
    );
END;
$$;

-- =====================================================
-- RPC Function: جلب الجلسة النشطة للموظف
-- =====================================================
CREATE OR REPLACE FUNCTION get_active_work_session(p_staff_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_session RECORD;
BEGIN
    -- الحصول على معلومات المستخدم
    SELECT u.organization_id
    INTO v_org_id
    FROM users u
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true
    LIMIT 1;

    -- جلب الجلسة النشطة
    SELECT * INTO v_session
    FROM pos_work_sessions
    WHERE staff_id = p_staff_id
    AND organization_id = v_org_id
    AND status = 'active'
    LIMIT 1;

    IF v_session.id IS NULL THEN
        RETURN json_build_object(
            'success', true,
            'has_active_session', false,
            'session', NULL
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'has_active_session', true,
        'session', json_build_object(
            'id', v_session.id,
            'staff_id', v_session.staff_id,
            'staff_name', v_session.staff_name,
            'opening_cash', v_session.opening_cash,
            'total_sales', v_session.total_sales,
            'total_orders', v_session.total_orders,
            'cash_sales', v_session.cash_sales,
            'card_sales', v_session.card_sales,
            'started_at', v_session.started_at,
            'opening_notes', v_session.opening_notes
        )
    );
END;
$$;

-- =====================================================
-- RPC Function: جلب جلسات اليوم
-- =====================================================
CREATE OR REPLACE FUNCTION get_today_work_sessions(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_sessions JSON;
BEGIN
    -- الحصول على معلومات المستخدم
    SELECT u.organization_id
    INTO v_org_id
    FROM users u
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true
    LIMIT 1;

    -- التحقق من المستخدم
    IF v_org_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المستخدم غير مصرح له'
        );
    END IF;

    -- جلب جلسات اليوم
    SELECT json_agg(
        json_build_object(
            'id', s.id,
            'staff_id', s.staff_id,
            'staff_name', s.staff_name,
            'opening_cash', s.opening_cash,
            'closing_cash', s.closing_cash,
            'expected_cash', s.expected_cash,
            'cash_difference', s.cash_difference,
            'total_sales', s.total_sales,
            'total_orders', s.total_orders,
            'cash_sales', s.cash_sales,
            'card_sales', s.card_sales,
            'started_at', s.started_at,
            'ended_at', s.ended_at,
            'status', s.status,
            'opening_notes', s.opening_notes,
            'closing_notes', s.closing_notes
        )
        ORDER BY s.started_at DESC
    ) INTO v_sessions
    FROM pos_work_sessions s
    WHERE s.organization_id = v_org_id
    AND DATE(s.started_at) = p_date;

    RETURN json_build_object(
        'success', true,
        'sessions', COALESCE(v_sessions, '[]'::json)
    );
END;
$$;

-- =====================================================
-- Trigger لتحديث إحصائيات الجلسة عند إنشاء طلب
-- =====================================================
CREATE OR REPLACE FUNCTION update_work_session_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_session_id UUID;
    v_payment_method VARCHAR;
BEGIN
    -- البحث عن الجلسة النشطة للموظف الذي أنشأ الطلب
    SELECT ws.id INTO v_session_id
    FROM pos_work_sessions ws
    WHERE ws.staff_id = NEW.created_by_staff_id
    AND ws.status = 'active'
    AND ws.organization_id = NEW.organization_id
    LIMIT 1;

    -- إذا وُجدت جلسة نشطة، تحديث الإحصائيات
    IF v_session_id IS NOT NULL THEN
        -- تحديث الإحصائيات
        UPDATE pos_work_sessions
        SET 
            total_sales = total_sales + NEW.final_total,
            total_orders = total_orders + 1,
            cash_sales = CASE 
                WHEN NEW.payment_method = 'cash' THEN cash_sales + NEW.final_total
                ELSE cash_sales
            END,
            card_sales = CASE 
                WHEN NEW.payment_method IN ('card', 'credit_card') THEN card_sales + NEW.final_total
                ELSE card_sales
            END
        WHERE id = v_session_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ملاحظة: سنضيف هذا الـ trigger بعد إضافة عمود created_by_staff_id لجدول pos_orders

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION start_pos_work_session(UUID, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION close_pos_work_session(UUID, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_work_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_today_work_sessions(DATE) TO authenticated;

-- Comments
COMMENT ON TABLE pos_work_sessions IS 'جدول جلسات العمل اليومية لموظفي نقطة البيع';
COMMENT ON FUNCTION start_pos_work_session IS 'بدء جلسة عمل جديدة للموظف';
COMMENT ON FUNCTION close_pos_work_session IS 'إغلاق جلسة العمل وحساب الفرق';
COMMENT ON FUNCTION get_active_work_session IS 'جلب الجلسة النشطة للموظف';
COMMENT ON FUNCTION get_today_work_sessions IS 'جلب جميع جلسات العمل لتاريخ معين';
