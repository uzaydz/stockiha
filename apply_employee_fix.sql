-- إصلاح مشكلة تضارب الدوال create_employee_unified
-- هذا الملف يحل مشكلة "Could not choose the best candidate function"

-- إزالة جميع النسخ القديمة من الدالة
DROP FUNCTION IF EXISTS create_employee_unified(text, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS create_employee_unified(text, text, text, text, text, jsonb, uuid);
DROP FUNCTION IF EXISTS create_employee_unified(text, text, text, text, text, jsonb, uuid, uuid);
DROP FUNCTION IF EXISTS create_employee_unified();

-- إنشاء دالة واحدة محدثة
CREATE OR REPLACE FUNCTION create_employee_unified(
    p_email TEXT,
    p_password TEXT,
    p_name TEXT,
    p_phone TEXT DEFAULT NULL,
    p_job_title TEXT DEFAULT NULL,
    p_permissions JSONB DEFAULT '{}',
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_employee_id UUID;
    v_result JSON;
    v_existing_user RECORD;
    v_current_user_id UUID;
    v_current_user_role TEXT;
BEGIN
    -- الحصول على معرف المستخدم الحالي
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'المستخدم غير مصادق عليه',
            'code', 'NOT_AUTHENTICATED'
        );
    END IF;

    -- تحديد معرف المؤسسة
    IF p_organization_id IS NULL THEN
        -- الحصول على معرف المؤسسة من المستخدم الحالي
        SELECT organization_id, role INTO v_org_id, v_current_user_role
        FROM public.users
        WHERE auth_user_id = v_current_user_id
        LIMIT 1;

        IF v_org_id IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'لم يتم العثور على معرف المؤسسة',
                'code', 'NO_ORGANIZATION'
            );
        END IF;

        -- التحقق من صلاحيات المستخدم الحالي
        IF v_current_user_role NOT IN ('admin', 'super_admin') THEN
            RETURN json_build_object(
                'success', false,
                'error', 'ليس لديك صلاحية لإضافة موظفين',
                'code', 'NOT_ADMIN'
            );
        END IF;
    ELSE
        v_org_id := p_organization_id;
        -- التحقق من أن المستخدم الحالي admin في المؤسسة المحددة
        SELECT role INTO v_current_user_role
        FROM public.users
        WHERE auth_user_id = v_current_user_id
        AND organization_id = v_org_id
        LIMIT 1;

        IF v_current_user_role NOT IN ('admin', 'super_admin') THEN
            RETURN json_build_object(
                'success', false,
                'error', 'ليس لديك صلاحية لإضافة موظفين في هذه المؤسسة',
                'code', 'NOT_ADMIN'
            );
        END IF;
    END IF;

    -- التحقق من عدم وجود موظف بنفس البريد الإلكتروني في نفس المؤسسة
    SELECT * INTO v_existing_user
    FROM public.users
    WHERE email = p_email
    AND organization_id = v_org_id
    AND role = 'employee'
    LIMIT 1;

    IF FOUND THEN
        IF v_existing_user.is_active THEN
            RETURN json_build_object(
                'success', false,
                'error', 'البريد الإلكتروني مستخدم بالفعل لموظف نشط في هذه المؤسسة',
                'code', 'EMAIL_EXISTS_ACTIVE'
            );
        ELSE
            -- إعادة تفعيل الموظف الموجود
            UPDATE public.users
            SET
                is_active = true,
                name = p_name,
                phone = p_phone,
                job_title = p_job_title,
                permissions = p_permissions,
                updated_at = NOW()
            WHERE id = v_existing_user.id
            RETURNING id INTO v_employee_id;

            -- إرجاع بيانات الموظف المُعاد تفعيله
            SELECT json_build_object(
                'success', true,
                'employee', json_build_object(
                    'id', id,
                    'user_id', COALESCE(auth_user_id, id),
                    'name', name,
                    'email', email,
                    'phone', phone,
                    'role', role,
                    'is_active', is_active,
                    'job_title', job_title,
                    'created_at', created_at,
                    'updated_at', updated_at,
                    'organization_id', organization_id,
                    'permissions', COALESCE(permissions, '{}'::jsonb)
                ),
                'action', 'reactivated',
                'message', 'تم إعادة تفعيل الموظف بنجاح'
            ) INTO v_result
            FROM public.users
            WHERE id = v_employee_id;

            RETURN v_result;
        END IF;
    END IF;

    -- إنشاء موظف جديد
    v_employee_id := gen_random_uuid();

    -- إدراج سجل الموظف الجديد
    INSERT INTO public.users (
        id,
        email,
        name,
        phone,
        role,
        is_active,
        organization_id,
        permissions,
        job_title,
        created_at,
        updated_at
    ) VALUES (
        v_employee_id,
        p_email,
        p_name,
        p_phone,
        'employee',
        true,
        v_org_id,
        COALESCE(p_permissions, '{}'::jsonb),
        p_job_title,
        NOW(),
        NOW()
    );

    -- إرجاع بيانات الموظف الجديد
    SELECT json_build_object(
        'success', true,
        'employee', json_build_object(
            'id', id,
            'user_id', id,
            'name', name,
            'email', email,
            'phone', phone,
            'role', role,
            'is_active', is_active,
            'job_title', job_title,
            'created_at', created_at,
            'updated_at', updated_at,
            'organization_id', organization_id,
            'permissions', COALESCE(permissions, '{}'::jsonb)
        ),
        'action', 'created',
        'message', 'تم إنشاء الموظف بنجاح',
        'note', 'سيتم إرسال دعوة بالبريد الإلكتروني للموظف'
    ) INTO v_result
    FROM public.users
    WHERE id = v_employee_id;

    RETURN v_result;

EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'error', 'البريد الإلكتروني مستخدم بالفعل',
            'code', 'EMAIL_DUPLICATE'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'code', 'UNKNOWN_ERROR'
        );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION create_employee_unified(text, text, text, text, text, jsonb, uuid) TO authenticated;

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح مشكلة تضارب الدوال بنجاح!';
    RAISE NOTICE '🔧 تم إنشاء دالة واحدة بـ 7 معاملات';
    RAISE NOTICE '🚀 يمكنك الآن إضافة موظفين جدد بدون مشاكل';
END;
$$;


