-- =====================================================
-- إضافة نظام الإيميل وكلمة السر للموظفين
-- =====================================================
-- الخيار الأول: دمج مع جدول users
-- الموظف = user عادي + صلاحيات POS + PIN

-- =====================================================
-- 1. إضافة حقل user_id لجدول pos_staff_sessions
-- =====================================================
ALTER TABLE pos_staff_sessions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_pos_staff_sessions_user_id 
ON pos_staff_sessions(user_id);

-- Constraint لمنع تكرار user_id في نفس المؤسسة
-- (موظف واحد = حساب user واحد)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_per_org'
    ) THEN
        ALTER TABLE pos_staff_sessions 
        ADD CONSTRAINT unique_user_per_org 
        UNIQUE (organization_id, user_id);
    END IF;
END $$;

-- =====================================================
-- 2. دالة إنشاء موظف مع حساب Supabase Auth
-- =====================================================
CREATE OR REPLACE FUNCTION create_staff_with_auth(
    p_email VARCHAR,
    p_password VARCHAR,
    p_staff_name VARCHAR,
    p_pin_code VARCHAR,
    p_permissions JSONB DEFAULT '{}'::jsonb,
    p_is_active BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_admin_user_id UUID;
    v_user_role TEXT;
    v_new_auth_user_id UUID;
    v_new_user_id UUID;
    v_staff_id UUID;
    v_encrypted_pin VARCHAR;
    v_result JSON;
BEGIN
    -- الحصول على معلومات المدير الحالي
    SELECT u.id, u.organization_id, u.role
    INTO v_admin_user_id, v_org_id, v_user_role
    FROM users u
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true
    LIMIT 1;

    -- التحقق من وجود المدير
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
            'error', 'ليس لديك صلاحية لإنشاء موظفين'
        );
    END IF;

    -- التحقق من البيانات المطلوبة
    IF p_email IS NULL OR TRIM(p_email) = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'الإيميل مطلوب'
        );
    END IF;

    IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'كلمة السر يجب أن تكون 6 أحرف على الأقل'
        );
    END IF;

    IF p_staff_name IS NULL OR TRIM(p_staff_name) = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'اسم الموظف مطلوب'
        );
    END IF;

    IF p_pin_code IS NULL OR LENGTH(p_pin_code) != 6 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'كود PIN يجب أن يكون 6 أرقام بالضبط'
        );
    END IF;

    -- التحقق من أن PIN يحتوي على أرقام فقط
    IF p_pin_code !~ '^[0-9]{6}$' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'كود PIN يجب أن يحتوي على أرقام فقط'
        );
    END IF;

    -- التحقق من عدم تكرار الإيميل في نفس المؤسسة
    IF EXISTS (
        SELECT 1 FROM users
        WHERE organization_id = v_org_id
        AND LOWER(email) = LOWER(p_email)
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'الإيميل مستخدم من قبل موظف آخر'
        );
    END IF;

    -- التحقق من عدم تكرار اسم الموظف
    IF EXISTS (
        SELECT 1 FROM pos_staff_sessions
        WHERE organization_id = v_org_id
        AND staff_name = p_staff_name
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'اسم الموظف موجود مسبقاً'
        );
    END IF;

    -- تشفير PIN
    v_encrypted_pin := encrypt_pin(p_pin_code);

    -- التحقق من عدم تكرار PIN
    IF EXISTS (
        SELECT 1 FROM pos_staff_sessions
        WHERE organization_id = v_org_id
        AND pin_code = v_encrypted_pin
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'كود PIN مستخدم من قبل موظف آخر'
        );
    END IF;

    -- ملاحظة: إنشاء حساب Supabase Auth يجب أن يتم من Frontend
    -- لأن RPC functions لا يمكنها الوصول لـ auth.users مباشرة
    -- هنا نفترض أن auth_user_id تم إنشاؤه مسبقاً وتمريره
    
    -- إنشاء سجل في جدول users
    INSERT INTO users (
        email,
        name,
        role,
        organization_id,
        is_active,
        auth_user_id
    ) VALUES (
        p_email,
        p_staff_name,
        'staff', -- دور الموظف
        v_org_id,
        p_is_active,
        NULL -- سيتم تحديثه من Frontend بعد إنشاء حساب Auth
    )
    RETURNING id INTO v_new_user_id;

    -- إنشاء سجل في pos_staff_sessions
    INSERT INTO pos_staff_sessions (
        organization_id,
        user_id,
        staff_name,
        pin_code,
        permissions,
        is_active,
        created_by
    ) VALUES (
        v_org_id,
        v_new_user_id,
        p_staff_name,
        v_encrypted_pin,
        p_permissions,
        p_is_active,
        v_admin_user_id
    )
    RETURNING id INTO v_staff_id;

    v_result := json_build_object(
        'success', true,
        'action', 'created',
        'staff_id', v_staff_id,
        'user_id', v_new_user_id,
        'message', 'تم إنشاء الموظف بنجاح. يرجى إنشاء حساب Supabase Auth من Frontend'
    );

    RETURN v_result;
END;
$$;

-- =====================================================
-- 3. دالة تحديث auth_user_id بعد إنشاء حساب Auth
-- =====================================================
CREATE OR REPLACE FUNCTION update_staff_auth_user_id(
    p_user_id UUID,
    p_auth_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- الحصول على معلومات المدير الحالي
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
            'error', 'ليس لديك صلاحية لتحديث بيانات الموظفين'
        );
    END IF;

    -- تحديث auth_user_id
    UPDATE users
    SET auth_user_id = p_auth_user_id
    WHERE id = p_user_id
    AND organization_id = v_org_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'الموظف غير موجود'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'تم تحديث auth_user_id بنجاح'
    );
END;
$$;

-- =====================================================
-- 4. دالة تسجيل دخول الموظف (إيميل + كلمة سر + PIN)
-- =====================================================
CREATE OR REPLACE FUNCTION verify_staff_login(
    p_pin_code VARCHAR
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_user_id UUID;
    v_user_record RECORD;
    v_staff_record RECORD;
    v_encrypted_pin VARCHAR;
BEGIN
    -- الحصول على auth_user_id للمستخدم الحالي (بعد تسجيل دخول Supabase Auth)
    v_auth_user_id := auth.uid();

    -- التحقق من وجود المستخدم
    IF v_auth_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'يجب تسجيل الدخول بالإيميل وكلمة السر أولاً'
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
    v_encrypted_pin := encrypt_pin(p_pin_code);

    -- جلب بيانات المستخدم
    SELECT 
        u.id,
        u.email,
        u.name,
        u.organization_id,
        u.is_active
    INTO v_user_record
    FROM users u
    WHERE u.auth_user_id = v_auth_user_id
    AND u.is_active = true
    LIMIT 1;

    -- التحقق من وجود المستخدم
    IF v_user_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المستخدم غير موجود أو غير نشط'
        );
    END IF;

    -- البحث عن الموظف بـ user_id و PIN المشفر
    SELECT 
        s.id,
        s.staff_name,
        s.permissions,
        s.is_active
    INTO v_staff_record
    FROM pos_staff_sessions s
    WHERE s.user_id = v_user_record.id
    AND s.organization_id = v_user_record.organization_id
    AND s.pin_code = v_encrypted_pin
    LIMIT 1;

    -- التحقق من وجود الموظف
    IF v_staff_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'كود PIN غير صحيح أو الموظف غير موجود'
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
            'user_id', v_user_record.id,
            'staff_name', v_staff_record.staff_name,
            'email', v_user_record.email,
            'permissions', v_staff_record.permissions,
            'is_active', v_staff_record.is_active,
            'organization_id', v_user_record.organization_id
        )
    );
END;
$$;

-- =====================================================
-- 5. تحديث دالة get_pos_staff_sessions لعرض الإيميل
-- =====================================================
-- حذف الدالة القديمة أولاً
DROP FUNCTION IF EXISTS get_pos_staff_sessions(UUID);

CREATE OR REPLACE FUNCTION get_pos_staff_sessions(p_organization_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    user_id UUID,
    staff_name VARCHAR,
    email TEXT,
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
    v_is_org_admin BOOLEAN;
    v_is_super_admin BOOLEAN;
    v_permissions JSONB;
    v_has_manage_staff BOOLEAN;
BEGIN
    -- الحصول على معلومات المستخدم
    SELECT u.organization_id, u.role, u.is_org_admin, u.is_super_admin, u.permissions
    INTO v_org_id, v_user_role, v_is_org_admin, v_is_super_admin, v_permissions
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

    -- التحقق من صلاحية إدارة الموظفين
    v_has_manage_staff := COALESCE((v_permissions->>'manageStaff')::boolean, false);

    -- التحقق من الصلاحيات (admin أو org_admin أو super_admin أو لديه صلاحية manageStaff)
    IF v_user_role NOT IN ('admin', 'super_admin') 
       AND NOT COALESCE(v_is_org_admin, false) 
       AND NOT COALESCE(v_is_super_admin, false)
       AND NOT v_has_manage_staff THEN
        RAISE EXCEPTION 'ليس لديك صلاحية لعرض الموظفين';
    END IF;

    -- جلب الموظفين مع الإيميل من جدول users
    RETURN QUERY
    SELECT 
        s.id,
        s.organization_id,
        s.user_id,
        s.staff_name,
        u.email,
        s.permissions,
        s.is_active,
        s.created_at,
        s.updated_at,
        s.last_login
    FROM pos_staff_sessions s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.organization_id = v_org_id
    ORDER BY s.created_at DESC;
END;
$$;

-- =====================================================
-- 6. دالة حذف موظف (مع حذف user)
-- =====================================================
-- حذف الدالة القديمة أولاً
DROP FUNCTION IF EXISTS delete_pos_staff_session(UUID);

CREATE OR REPLACE FUNCTION delete_pos_staff_session(p_staff_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
    v_user_id UUID;
    v_auth_user_id UUID;
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

    -- جلب user_id و auth_user_id قبل الحذف
    SELECT user_id INTO v_user_id
    FROM pos_staff_sessions
    WHERE id = p_staff_id
    AND organization_id = v_org_id;

    IF v_user_id IS NOT NULL THEN
        SELECT auth_user_id INTO v_auth_user_id
        FROM users
        WHERE id = v_user_id;
    END IF;

    -- حذف الموظف من pos_staff_sessions
    DELETE FROM pos_staff_sessions
    WHERE id = p_staff_id
    AND organization_id = v_org_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'الموظف غير موجود'
        );
    END IF;

    -- حذف المستخدم من جدول users (سيتم حذف auth.users من Frontend)
    IF v_user_id IS NOT NULL THEN
        DELETE FROM users WHERE id = v_user_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'تم حذف الموظف بنجاح',
        'auth_user_id', v_auth_user_id,
        'note', 'يجب حذف حساب Auth من Frontend'
    );
END;
$$;

-- =====================================================
-- 7. دالة إنشاء staff session للمستخدم (تتجاوز RLS)
-- =====================================================
CREATE OR REPLACE FUNCTION create_staff_session_for_user(
    p_user_id UUID,
    p_staff_name VARCHAR,
    p_pin_code VARCHAR,
    p_permissions JSONB,
    p_is_active BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_staff_id UUID;
    v_encrypted_pin VARCHAR;
BEGIN
    -- الحصول على organization_id من جدول users
    SELECT organization_id INTO v_org_id
    FROM users
    WHERE id = p_user_id;

    IF v_org_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المستخدم غير موجود'
        );
    END IF;

    -- تشفير PIN
    v_encrypted_pin := encrypt_pin(p_pin_code);

    -- تحديث الصلاحيات في جدول users أيضاً
    UPDATE users
    SET permissions = p_permissions
    WHERE id = p_user_id;

    -- إنشاء سجل في pos_staff_sessions
    INSERT INTO pos_staff_sessions (
        organization_id,
        user_id,
        staff_name,
        pin_code,
        permissions,
        is_active
    ) VALUES (
        v_org_id,
        p_user_id,
        p_staff_name,
        v_encrypted_pin,
        p_permissions,
        p_is_active
    )
    RETURNING id INTO v_staff_id;

    RETURN json_build_object(
        'success', true,
        'staff_id', v_staff_id
    );
END;
$$;

-- =====================================================
-- منح الصلاحيات
-- =====================================================
GRANT EXECUTE ON FUNCTION create_staff_with_auth(VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION update_staff_auth_user_id(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_staff_login(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION create_staff_session_for_user(UUID, VARCHAR, VARCHAR, JSONB, BOOLEAN) TO authenticated;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON COLUMN pos_staff_sessions.user_id IS 'ربط مع جدول users (الموظف = user + PIN + صلاحيات POS)';
COMMENT ON FUNCTION create_staff_with_auth IS 'إنشاء موظف جديد مع حساب في جدول users (Auth يتم من Frontend)';
COMMENT ON FUNCTION update_staff_auth_user_id IS 'تحديث auth_user_id بعد إنشاء حساب Supabase Auth';
COMMENT ON FUNCTION verify_staff_login IS 'تسجيل دخول الموظف: التحقق من auth.uid() ثم PIN';
COMMENT ON FUNCTION get_pos_staff_sessions IS 'جلب جميع موظفي نقطة البيع مع الإيميل';
COMMENT ON FUNCTION delete_pos_staff_session IS 'حذف موظف (مع حذف user، Auth يتم من Frontend)';
COMMENT ON FUNCTION create_staff_session_for_user IS 'إنشاء سجل staff session للمستخدم (تتجاوز RLS - للاستخدام الداخلي)';
