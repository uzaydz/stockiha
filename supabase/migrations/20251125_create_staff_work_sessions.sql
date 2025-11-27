-- =====================================================
-- Migration: إنشاء جدول staff_work_sessions
-- التاريخ: 2025-11-25
-- الوصف: جدول لتتبع جلسات عمل الموظفين في نقطة البيع POS
-- ملاحظة: الموظفين موجودون في جدول users مع role = 'employee'
-- =====================================================

-- حذف الدوال القديمة إذا كانت موجودة (لتجنب تعارض أنواع الإرجاع)
DROP FUNCTION IF EXISTS public.start_pos_work_session(UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.close_pos_work_session(UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.get_active_work_session(UUID);
DROP FUNCTION IF EXISTS public.get_active_or_paused_session(UUID);
DROP FUNCTION IF EXISTS public.get_today_work_sessions(DATE);
DROP FUNCTION IF EXISTS public.pause_work_session(UUID);
DROP FUNCTION IF EXISTS public.resume_work_session(UUID);

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS public.staff_work_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    staff_name TEXT,

    -- أموال الافتتاح والإغلاق
    opening_cash NUMERIC(12, 2) DEFAULT 0,
    closing_cash NUMERIC(12, 2),
    expected_cash NUMERIC(12, 2),
    cash_difference NUMERIC(12, 2),

    -- إحصائيات المبيعات
    total_sales NUMERIC(12, 2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    cash_sales NUMERIC(12, 2) DEFAULT 0,
    card_sales NUMERIC(12, 2) DEFAULT 0,

    -- أوقات الجلسة
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    resumed_at TIMESTAMPTZ,

    -- معلومات الإيقاف المؤقت
    pause_count INTEGER DEFAULT 0,
    total_pause_duration INTEGER DEFAULT 0, -- بالثواني

    -- الحالة
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),

    -- ملاحظات
    opening_notes TEXT,
    closing_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة الفهارس للأداء
CREATE INDEX IF NOT EXISTS idx_staff_work_sessions_org ON public.staff_work_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_work_sessions_staff ON public.staff_work_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_work_sessions_status ON public.staff_work_sessions(status);
CREATE INDEX IF NOT EXISTS idx_staff_work_sessions_started_at ON public.staff_work_sessions(started_at DESC);

-- تمكين RLS
ALTER TABLE public.staff_work_sessions ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
-- القراءة: يمكن لأعضاء المنظمة قراءة جلسات منظمتهم
CREATE POLICY "staff_work_sessions_select_policy" ON public.staff_work_sessions
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
            UNION
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

-- الإدراج: يمكن للموظفين إنشاء جلسات في منظمتهم
CREATE POLICY "staff_work_sessions_insert_policy" ON public.staff_work_sessions
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
            UNION
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

-- التحديث: يمكن للموظفين تحديث جلساتهم الخاصة
CREATE POLICY "staff_work_sessions_update_policy" ON public.staff_work_sessions
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
            UNION
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
            UNION
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

-- الحذف: فقط للمالكين والمدراء
CREATE POLICY "staff_work_sessions_delete_policy" ON public.staff_work_sessions
    FOR DELETE
    USING (
        organization_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

-- =====================================================
-- RPC Functions لإدارة جلسات العمل
-- =====================================================

-- بدء جلسة عمل جديدة
CREATE OR REPLACE FUNCTION public.start_pos_work_session(
    p_staff_id UUID,
    p_opening_cash NUMERIC DEFAULT 0,
    p_opening_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_staff_name TEXT;
    v_session_id UUID;
    v_existing_session UUID;
BEGIN
    -- جلب معلومات الموظف من جدول users
    SELECT organization_id, COALESCE(name, email, 'موظف')
    INTO v_org_id, v_staff_name
    FROM public.users
    WHERE id = p_staff_id;

    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'الموظف غير موجود');
    END IF;

    -- التحقق من عدم وجود جلسة نشطة
    SELECT id INTO v_existing_session
    FROM public.staff_work_sessions
    WHERE staff_id = p_staff_id AND status IN ('active', 'paused')
    LIMIT 1;

    IF v_existing_session IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'يوجد جلسة نشطة بالفعل', 'session_id', v_existing_session);
    END IF;

    -- إنشاء جلسة جديدة
    INSERT INTO public.staff_work_sessions (
        organization_id, staff_id, staff_name, opening_cash, opening_notes, status
    ) VALUES (
        v_org_id, p_staff_id, v_staff_name, p_opening_cash, p_opening_notes, 'active'
    )
    RETURNING id INTO v_session_id;

    RETURN jsonb_build_object('success', true, 'session_id', v_session_id);
END;
$$;

-- إغلاق جلسة العمل
CREATE OR REPLACE FUNCTION public.close_pos_work_session(
    p_session_id UUID,
    p_closing_cash NUMERIC DEFAULT 0,
    p_closing_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_expected_cash NUMERIC;
    v_difference NUMERIC;
BEGIN
    -- جلب الجلسة
    SELECT * INTO v_session
    FROM public.staff_work_sessions
    WHERE id = p_session_id AND status IN ('active', 'paused');

    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'الجلسة غير موجودة أو مغلقة بالفعل');
    END IF;

    -- حساب المبلغ المتوقع
    v_expected_cash := COALESCE(v_session.opening_cash, 0) + COALESCE(v_session.cash_sales, 0);
    v_difference := p_closing_cash - v_expected_cash;

    -- تحديث الجلسة
    UPDATE public.staff_work_sessions
    SET
        closing_cash = p_closing_cash,
        expected_cash = v_expected_cash,
        cash_difference = v_difference,
        closing_notes = p_closing_notes,
        ended_at = NOW(),
        status = 'closed',
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'expected_cash', v_expected_cash,
        'closing_cash', p_closing_cash,
        'difference', v_difference
    );
END;
$$;

-- جلب الجلسة النشطة للموظف
CREATE OR REPLACE FUNCTION public.get_active_work_session(p_staff_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
BEGIN
    SELECT * INTO v_session
    FROM public.staff_work_sessions
    WHERE staff_id = p_staff_id AND status = 'active'
    LIMIT 1;

    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', true, 'has_active_session', false);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'has_active_session', true,
        'session', row_to_json(v_session)
    );
END;
$$;

-- جلب الجلسة النشطة أو المتوقفة
CREATE OR REPLACE FUNCTION public.get_active_or_paused_session(p_staff_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
BEGIN
    SELECT * INTO v_session
    FROM public.staff_work_sessions
    WHERE staff_id = p_staff_id AND status IN ('active', 'paused')
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', true, 'has_session', false);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'has_session', true,
        'session', row_to_json(v_session)
    );
END;
$$;

-- جلب جلسات اليوم
CREATE OR REPLACE FUNCTION public.get_today_work_sessions(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sessions JSONB;
    v_org_id UUID;
BEGIN
    -- جلب organization_id للمستخدم الحالي
    SELECT organization_id INTO v_org_id
    FROM public.users
    WHERE id = auth.uid()
    LIMIT 1;

    IF v_org_id IS NULL THEN
        SELECT id INTO v_org_id
        FROM public.organizations
        WHERE owner_id = auth.uid()
        LIMIT 1;
    END IF;

    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'لا يوجد صلاحية');
    END IF;

    SELECT jsonb_agg(row_to_json(s))
    INTO v_sessions
    FROM public.staff_work_sessions s
    WHERE s.organization_id = v_org_id
      AND DATE(s.started_at) = p_date
    ORDER BY s.started_at DESC;

    RETURN jsonb_build_object(
        'success', true,
        'sessions', COALESCE(v_sessions, '[]'::jsonb)
    );
END;
$$;

-- إيقاف الجلسة مؤقتاً
CREATE OR REPLACE FUNCTION public.pause_work_session(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
BEGIN
    SELECT * INTO v_session
    FROM public.staff_work_sessions
    WHERE id = p_session_id AND status = 'active';

    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'الجلسة غير موجودة أو ليست نشطة');
    END IF;

    UPDATE public.staff_work_sessions
    SET
        status = 'paused',
        paused_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'message', 'تم إيقاف الجلسة مؤقتاً');
END;
$$;

-- استئناف الجلسة
CREATE OR REPLACE FUNCTION public.resume_work_session(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_pause_duration INTEGER;
BEGIN
    SELECT * INTO v_session
    FROM public.staff_work_sessions
    WHERE id = p_session_id AND status = 'paused';

    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'الجلسة غير موجودة أو ليست متوقفة');
    END IF;

    -- حساب مدة الإيقاف
    v_pause_duration := EXTRACT(EPOCH FROM (NOW() - v_session.paused_at))::INTEGER;

    UPDATE public.staff_work_sessions
    SET
        status = 'active',
        resumed_at = NOW(),
        pause_count = COALESCE(pause_count, 0) + 1,
        total_pause_duration = COALESCE(total_pause_duration, 0) + v_pause_duration,
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم استئناف الجلسة',
        'pause_duration', v_pause_duration
    );
END;
$$;

-- =====================================================
-- منح الصلاحيات
-- =====================================================
GRANT SELECT, INSERT, UPDATE ON public.staff_work_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_pos_work_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_pos_work_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_work_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_or_paused_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_today_work_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.pause_work_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_work_session TO authenticated;

-- تعليق توضيحي
COMMENT ON TABLE public.staff_work_sessions IS 'جلسات عمل الموظفين في نقطة البيع POS';
