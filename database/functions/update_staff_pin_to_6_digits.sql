-- =====================================================
-- تحديث نظام PIN للموظفين
-- =====================================================
-- 1. تغيير طول PIN من 4 إلى 6 أرقام
-- 2. إضافة فحص لمنع تكرار PIN بين الموظفين

-- =====================================================
-- تحديث دالة save_pos_staff_session
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
        -- ✅ التحقق من طول PIN (يجب أن يكون 6 أرقام)
        IF LENGTH(p_pin_code::text) != 6 THEN
            RETURN json_build_object(
                'success', false,
                'error', 'كود PIN يجب أن يكون 6 أرقام بالضبط'
            );
        END IF;

        -- ✅ التحقق من أن PIN يحتوي على أرقام فقط
        IF p_pin_code::text !~ '^[0-9]{6}$' THEN
            RETURN json_build_object(
                'success', false,
                'error', 'كود PIN يجب أن يحتوي على أرقام فقط'
            );
        END IF;

        -- استخدام الدالة المساعدة للتشفير
        v_encrypted_pin := encrypt_pin(p_pin_code::text);

        -- ✅ التحقق من عدم تكرار PIN في نفس المؤسسة
        IF EXISTS (
            SELECT 1 FROM pos_staff_sessions
            WHERE organization_id = v_org_id
            AND pin_code = v_encrypted_pin
            AND (p_id IS NULL OR id != p_id) -- استثناء الموظف الحالي عند التعديل
        ) THEN
            RETURN json_build_object(
                'success', false,
                'error', 'كود PIN مستخدم من قبل موظف آخر. يرجى اختيار كود مختلف'
            );
        END IF;
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
        RETURNING id INTO v_staff_id;

        IF v_staff_id IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'الموظف غير موجود'
            );
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
-- تحديث دالة update_staff_pin
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

    -- ✅ التحقق من طول PIN (يجب أن يكون 6 أرقام)
    IF p_new_pin IS NULL OR LENGTH(p_new_pin::text) != 6 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'كود PIN يجب أن يكون 6 أرقام بالضبط'
        );
    END IF;

    -- ✅ التحقق من أن PIN يحتوي على أرقام فقط
    IF p_new_pin::text !~ '^[0-9]{6}$' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'كود PIN يجب أن يحتوي على أرقام فقط'
        );
    END IF;

    -- تشفير PIN الجديد (استخدام SHA256 - لا يحتاج extensions)
    v_encrypted_pin := encrypt_pin(p_new_pin::text);

    -- ✅ التحقق من عدم تكرار PIN
    IF EXISTS (
        SELECT 1 FROM pos_staff_sessions
        WHERE organization_id = v_org_id
        AND pin_code = v_encrypted_pin
        AND id != p_staff_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'كود PIN مستخدم من قبل موظف آخر. يرجى اختيار كود مختلف'
        );
    END IF;

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

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION save_pos_staff_session(UUID, VARCHAR, VARCHAR, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION update_staff_pin(UUID, VARCHAR) TO authenticated;

-- Comments
COMMENT ON FUNCTION save_pos_staff_session IS 'حفظ أو تعديل موظف نقطة البيع (PIN: 6 أرقام، فحص التكرار)';
COMMENT ON FUNCTION update_staff_pin IS 'تحديث كود PIN لموظف (6 أرقام، فحص التكرار)';
