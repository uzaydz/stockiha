-- =====================================================
-- جدول جلسات الموظفين لنقطة البيع
-- =====================================================
-- ملاحظة: نستخدم SHA256 للتشفير (لا يحتاج extensions)
-- يخزن معلومات الموظفين وأكواد PIN الخاصة بهم والصلاحيات

-- دالة مساعدة للتشفير
CREATE OR REPLACE FUNCTION encrypt_pin(pin_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- محاولة استخدام SHA256 أولاً
    BEGIN
        RETURN encode(digest(pin_text, 'sha256'::text), 'hex');
    EXCEPTION WHEN OTHERS THEN
        -- في حالة فشل، استخدام MD5 كبديل
        RETURN md5(pin_text);
    END;
END;
$$;

CREATE TABLE IF NOT EXISTS pos_staff_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    staff_name VARCHAR(255) NOT NULL,
    pin_code VARCHAR(255) NOT NULL, -- سيتم تخزينه مشفراً
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    last_login TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_staff_name_per_org UNIQUE (organization_id, staff_name)
);

-- Indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_pos_staff_sessions_org_id ON pos_staff_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_pos_staff_sessions_is_active ON pos_staff_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_pos_staff_sessions_created_at ON pos_staff_sessions(created_at DESC);

-- Trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_pos_staff_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pos_staff_sessions_updated_at
    BEFORE UPDATE ON pos_staff_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_pos_staff_sessions_updated_at();

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE pos_staff_sessions ENABLE ROW LEVEL SECURITY;

-- Policy للقراءة: فقط المستخدمون في نفس المؤسسة
CREATE POLICY "pos_staff_sessions_select_policy" ON pos_staff_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.organization_id = pos_staff_sessions.organization_id
            AND users.is_active = true
        )
    );

-- Policy للإضافة: فقط الأدمن
CREATE POLICY "pos_staff_sessions_insert_policy" ON pos_staff_sessions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.organization_id = pos_staff_sessions.organization_id
            AND users.role IN ('admin', 'super_admin')
            AND users.is_active = true
        )
    );

-- Policy للتحديث: فقط الأدمن
CREATE POLICY "pos_staff_sessions_update_policy" ON pos_staff_sessions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.organization_id = pos_staff_sessions.organization_id
            AND users.role IN ('admin', 'super_admin')
            AND users.is_active = true
        )
    );

-- Policy للحذف: فقط الأدمن
CREATE POLICY "pos_staff_sessions_delete_policy" ON pos_staff_sessions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.organization_id = pos_staff_sessions.organization_id
            AND users.role IN ('admin', 'super_admin')
            AND users.is_active = true
        )
    );

-- =====================================================
-- RPC Function: جلب جميع الموظفين
-- =====================================================
CREATE OR REPLACE FUNCTION get_pos_staff_sessions(p_organization_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    staff_name VARCHAR,
    permissions JSONB,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- الحصول على معلومات المستخدم
    SELECT u.organization_id, u.role
    INTO v_org_id, v_user_role
    FROM users u
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true
    LIMIT 1;

    -- التحقق من وجود المستخدم
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'المستخدم غير مصرح له';
    END IF;

    -- استخدام organization_id المحدد أو الخاص بالمستخدم
    IF p_organization_id IS NOT NULL THEN
        v_org_id := p_organization_id;
    END IF;

    -- التحقق من الصلاحيات (فقط الأدمن)
    IF v_user_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'ليس لديك صلاحية لعرض الموظفين';
    END IF;

    -- جلب الموظفين (بدون pin_code لأسباب أمنية)
    RETURN QUERY
    SELECT 
        s.id,
        s.organization_id,
        s.staff_name,
        s.permissions,
        s.is_active,
        s.created_at,
        s.updated_at,
        s.last_login
    FROM pos_staff_sessions s
    WHERE s.organization_id = v_org_id
    ORDER BY s.created_at DESC;
END;
$$;

-- =====================================================
-- RPC Function: حفظ/تعديل موظف
-- =====================================================
CREATE OR REPLACE FUNCTION save_pos_staff_session(
    p_id UUID DEFAULT NULL,
    p_staff_name VARCHAR DEFAULT NULL,
    p_pin_code VARCHAR DEFAULT NULL,
    p_permissions JSONB DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_crypto
AS $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
    v_user_role TEXT;
    v_staff_id UUID;
    v_encrypted_pin VARCHAR;
    v_result JSON;
BEGIN
    -- الحصول على معلومات المستخدم
    SELECT u.id, u.organization_id, u.role
    INTO v_user_id, v_org_id, v_user_role
    FROM users u
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true
    LIMIT 1;

    -- التحقق من وجود المستخدم
    IF v_org_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المستخدم غير مصرح له'
        );
    END IF;

    -- التحقق من الصلاحيات (فقط الأدمن)
    IF v_user_role NOT IN ('admin', 'super_admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'ليس لديك صلاحية لإدارة الموظفين'
        );
    END IF;

    -- التحقق من البيانات المطلوبة
    IF p_staff_name IS NULL OR TRIM(p_staff_name::text) = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'اسم الموظف مطلوب'
        );
    END IF;

    -- تشفير PIN (استخدام SHA256 - لا يحتاج extensions)
    IF p_pin_code IS NOT NULL AND p_pin_code != '' THEN
        -- استخدام الدالة المساعدة للتشفير
        v_encrypted_pin := encrypt_pin(p_pin_code::text);
    END IF;

    -- التعديل أو الإضافة
    IF p_id IS NOT NULL THEN
        -- تحديث موظف موجود
        UPDATE pos_staff_sessions
        SET 
            staff_name = COALESCE(p_staff_name::text, staff_name),
            pin_code = COALESCE(v_encrypted_pin, pin_code),
            permissions = COALESCE(p_permissions, permissions),
            is_active = COALESCE(p_is_active, is_active),
            updated_at = NOW()
        WHERE id = p_id
        AND organization_id = v_org_id
        RETURNING id, user_id INTO v_staff_id, v_user_id;

        IF v_staff_id IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'الموظف غير موجود'
            );
        END IF;

        -- تحديث الصلاحيات في جدول users أيضاً
        IF p_permissions IS NOT NULL AND v_user_id IS NOT NULL THEN
            UPDATE users
            SET permissions = p_permissions
            WHERE id = v_user_id;
        END IF;

        v_result := json_build_object(
            'success', true,
            'action', 'updated',
            'staff_id', v_staff_id
        );
    ELSE
        -- إضافة موظف جديد
        IF v_encrypted_pin IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'كود PIN مطلوب للموظفين الجدد'
            );
        END IF;

        -- التحقق من عدم تكرار الاسم
        IF EXISTS (
            SELECT 1 FROM pos_staff_sessions
            WHERE organization_id = v_org_id
            AND staff_name = p_staff_name::text
        ) THEN
            RETURN json_build_object(
                'success', false,
                'error', 'اسم الموظف موجود مسبقاً'
            );
        END IF;

        INSERT INTO pos_staff_sessions (
            organization_id,
            staff_name,
            pin_code,
            permissions,
            is_active,
            created_by
        ) VALUES (
            v_org_id,
            p_staff_name::text,
            v_encrypted_pin,
            COALESCE(p_permissions, '{}'::jsonb),
            p_is_active,
            v_user_id
        )
        RETURNING id INTO v_staff_id;

        v_result := json_build_object(
            'success', true,
            'action', 'created',
            'staff_id', v_staff_id
        );
    END IF;

    RETURN v_result;
END;
$$;

-- =====================================================
-- RPC Function: تحديث كود PIN فقط
-- =====================================================
CREATE OR REPLACE FUNCTION update_staff_pin(
    p_staff_id UUID,
    p_new_pin VARCHAR
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_crypto
AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
    v_encrypted_pin VARCHAR;
BEGIN
    -- الحصول على معلومات المستخدم
    SELECT u.organization_id, u.role
    INTO v_org_id, v_user_role
    FROM users u
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true
    LIMIT 1;

    -- التحقق من الصلاحيات
    IF v_user_role NOT IN ('admin', 'super_admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'ليس لديك صلاحية لتعديل كود PIN'
        );
    END IF;

    -- التحقق من البيانات
    IF p_new_pin IS NULL OR LENGTH(p_new_pin::text) < 4 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'كود PIN يجب أن يكون 4 أرقام على الأقل'
        );
    END IF;

    -- تشفير PIN الجديد (استخدام SHA256 - لا يحتاج extensions)
    v_encrypted_pin := encrypt_pin(p_new_pin::text);

    -- تحديث PIN
    UPDATE pos_staff_sessions
    SET 
        pin_code = v_encrypted_pin,
        updated_at = NOW()
    WHERE id = p_staff_id
    AND organization_id = v_org_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'الموظف غير موجود'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'تم تحديث كود PIN بنجاح'
    );
END;
$$;

-- =====================================================
-- RPC Function: حذف موظف
-- =====================================================
CREATE OR REPLACE FUNCTION delete_pos_staff_session(p_staff_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- الحصول على معلومات المستخدم
    SELECT u.organization_id, u.role
    INTO v_org_id, v_user_role
    FROM users u
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true
    LIMIT 1;

    -- التحقق من الصلاحيات
    IF v_user_role NOT IN ('admin', 'super_admin') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'ليس لديك صلاحية لحذف الموظفين'
        );
    END IF;

    -- حذف الموظف
    DELETE FROM pos_staff_sessions
    WHERE id = p_staff_id
    AND organization_id = v_org_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'الموظف غير موجود'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'تم حذف الموظف بنجاح'
    );
END;
$$;

-- =====================================================
-- RPC Function: تسجيل دخول الموظف بـ PIN
-- =====================================================
CREATE OR REPLACE FUNCTION verify_staff_pin(
    p_pin_code VARCHAR
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_staff_record RECORD;
    v_encrypted_pin VARCHAR;
BEGIN
    -- الحصول على organization_id للمستخدم الحالي
    SELECT u.organization_id
    INTO v_org_id
    FROM users u
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true
    LIMIT 1;

    -- التحقق من وجود المستخدم
    IF v_org_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المستخدم غير مصرح له'
        );
    END IF;

    -- التحقق من البيانات
    IF p_pin_code IS NULL OR p_pin_code = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'كود PIN مطلوب'
        );
    END IF;

    -- تشفير PIN المدخل للمقارنة
    v_encrypted_pin := encrypt_pin(p_pin_code::text);

    -- البحث عن الموظف بـ PIN المشفر
    SELECT 
        id,
        staff_name,
        permissions,
        is_active
    INTO v_staff_record
    FROM pos_staff_sessions
    WHERE organization_id = v_org_id
    AND pin_code = v_encrypted_pin
    LIMIT 1;

    -- التحقق من وجود الموظف
    IF v_staff_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'كود PIN غير صحيح'
        );
    END IF;

    -- التحقق من أن الموظف نشط
    IF NOT v_staff_record.is_active THEN
        RETURN json_build_object(
            'success', false,
            'error', 'هذا الحساب معطل. يرجى التواصل مع المدير'
        );
    END IF;

    -- تحديث آخر تسجيل دخول
    UPDATE pos_staff_sessions
    SET last_login = NOW()
    WHERE id = v_staff_record.id;

    -- إرجاع بيانات الموظف
    RETURN json_build_object(
        'success', true,
        'staff', json_build_object(
            'id', v_staff_record.id,
            'staff_name', v_staff_record.staff_name,
            'permissions', v_staff_record.permissions,
            'is_active', v_staff_record.is_active
        )
    );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION encrypt_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_staff_sessions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION save_pos_staff_session(UUID, VARCHAR, VARCHAR, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION update_staff_pin(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_pos_staff_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_staff_pin(VARCHAR) TO authenticated;

-- Comments
COMMENT ON TABLE pos_staff_sessions IS 'جدول جلسات الموظفين لنقطة البيع مع أكواد PIN والصلاحيات';
COMMENT ON FUNCTION encrypt_pin IS 'دالة مساعدة لتشفير كود PIN باستخدام SHA256 أو MD5 كبديل';
COMMENT ON FUNCTION get_pos_staff_sessions IS 'جلب جميع موظفي نقطة البيع للمؤسسة';
COMMENT ON FUNCTION save_pos_staff_session IS 'حفظ أو تعديل موظف نقطة البيع';
COMMENT ON FUNCTION update_staff_pin IS 'تحديث كود PIN لموظف';
COMMENT ON FUNCTION delete_pos_staff_session IS 'حذف موظف من نقطة البيع';
