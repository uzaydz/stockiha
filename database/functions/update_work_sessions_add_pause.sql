-- =====================================================
-- تحديث جدول pos_work_sessions لدعم الإيقاف المؤقت
-- =====================================================

-- 1. تحديث constraint لإضافة حالة 'paused'
ALTER TABLE pos_work_sessions 
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE pos_work_sessions
ADD CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'closed'));

-- 2. إضافة أعمدة لتتبع الإيقاف المؤقت
ALTER TABLE pos_work_sessions
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pause_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pause_duration INTERVAL DEFAULT '0 seconds';

-- =====================================================
-- RPC Function: إيقاف الجلسة مؤقتاً
-- =====================================================
CREATE OR REPLACE FUNCTION pause_work_session(
    p_session_id UUID
)
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
            'error', 'الجلسة غير موجودة أو غير نشطة'
        );
    END IF;

    -- إيقاف الجلسة مؤقتاً
    UPDATE pos_work_sessions
    SET 
        status = 'paused',
        paused_at = NOW(),
        pause_count = pause_count + 1
    WHERE id = p_session_id;

    RETURN json_build_object(
        'success', true,
        'message', 'تم إيقاف الجلسة مؤقتاً'
    );
END;
$$;

-- =====================================================
-- RPC Function: استئناف الجلسة
-- =====================================================
CREATE OR REPLACE FUNCTION resume_work_session(
    p_session_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_session RECORD;
    v_pause_duration INTERVAL;
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
    AND status = 'paused';

    IF v_session.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'الجلسة غير موجودة أو غير متوقفة'
        );
    END IF;

    -- حساب مدة الإيقاف
    v_pause_duration := NOW() - v_session.paused_at;

    -- استئناف الجلسة
    UPDATE pos_work_sessions
    SET 
        status = 'active',
        resumed_at = NOW(),
        total_pause_duration = total_pause_duration + v_pause_duration
    WHERE id = p_session_id;

    RETURN json_build_object(
        'success', true,
        'message', 'تم استئناف الجلسة',
        'pause_duration', EXTRACT(EPOCH FROM v_pause_duration)
    );
END;
$$;

-- =====================================================
-- RPC Function: جلب الجلسة النشطة أو المتوقفة للموظف
-- =====================================================
CREATE OR REPLACE FUNCTION get_active_or_paused_session(p_staff_id UUID)
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

    -- جلب الجلسة النشطة أو المتوقفة
    SELECT * INTO v_session
    FROM pos_work_sessions
    WHERE staff_id = p_staff_id
    AND organization_id = v_org_id
    AND status IN ('active', 'paused')
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_session.id IS NULL THEN
        RETURN json_build_object(
            'success', true,
            'has_session', false,
            'session', NULL
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'has_session', true,
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
            'paused_at', v_session.paused_at,
            'resumed_at', v_session.resumed_at,
            'pause_count', v_session.pause_count,
            'total_pause_duration', EXTRACT(EPOCH FROM v_session.total_pause_duration),
            'status', v_session.status,
            'opening_notes', v_session.opening_notes
        )
    );
END;
$$;

-- =====================================================
-- تحديث دالة get_today_work_sessions لإضافة الحقول الجديدة
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
            'paused_at', s.paused_at,
            'resumed_at', s.resumed_at,
            'pause_count', s.pause_count,
            'total_pause_duration', EXTRACT(EPOCH FROM s.total_pause_duration),
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

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION pause_work_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION resume_work_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_or_paused_session(UUID) TO authenticated;

-- Comments
COMMENT ON FUNCTION pause_work_session IS 'إيقاف جلسة العمل مؤقتاً';
COMMENT ON FUNCTION resume_work_session IS 'استئناف جلسة العمل المتوقفة';
COMMENT ON FUNCTION get_active_or_paused_session IS 'جلب الجلسة النشطة أو المتوقفة للموظف';
