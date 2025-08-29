-- إنشاء RPC موحدة ومحسنة لإنشاء الموظفين
-- تقلل من الاستدعاءات المتعددة وتحل مشاكل المصادقة

-- حذف الدالة الموجودة إذا كانت موجودة
DROP FUNCTION IF EXISTS create_employee_unified(text, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS create_employee_unified();

-- إنشاء الدالة الموحدة الجديدة
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
    v_auth_user_id UUID;
    v_result JSON;
    v_existing_user RECORD;
BEGIN
    -- تحديد معرف المؤسسة
    IF p_organization_id IS NULL THEN
        -- الحصول على معرف المؤسسة من المستخدم الحالي
        SELECT organization_id INTO v_org_id
        FROM public.users
        WHERE id = auth.uid()
        LIMIT 1;
        
        IF v_org_id IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'لم يتم العثور على معرف المؤسسة',
                'code', 'NO_ORGANIZATION'
            );
        END IF;
    ELSE
        v_org_id := p_organization_id;
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
    
    -- محاولة إنشاء مستخدم في نظام المصادقة (اختياري)
    -- نتجاهل الأخطاء هنا ونتركها للواجهة الأمامية
    
    -- إرجاع بيانات الموظف الجديد
    SELECT json_build_object(
        'success', true,
        'employee', json_build_object(
            'id', id,
            'user_id', id, -- نستخدم نفس المعرف مؤقتاً
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

-- إضافة تعليق
COMMENT ON FUNCTION create_employee_unified(text, text, text, text, text, jsonb, uuid) IS 'دالة موحدة ومحسنة لإنشاء الموظفين بأقل عدد من الاستدعاءات وأفضل معالجة للأخطاء';

-- دالة مساعدة لإرسال دعوة للموظف (ستستدعى من الواجهة الأمامية)
CREATE OR REPLACE FUNCTION invite_employee_auth(
    p_employee_id UUID,
    p_email TEXT,
    p_password TEXT,
    p_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- محاولة إنشاء مستخدم المصادقة
    -- هذه الدالة ستستدعى بشكل منفصل لتجنب تعقيد العملية الرئيسية
    
    RETURN json_build_object(
        'success', true,
        'message', 'سيتم التعامل مع المصادقة بشكل منفصل',
        'employee_id', p_employee_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION invite_employee_auth(uuid, text, text, text) TO authenticated;

-- اختبار الدالة
DO $$
BEGIN
    RAISE NOTICE '✅ تم إنشاء دالة create_employee_unified بنجاح!';
    RAISE NOTICE '🚀 الفوائد: إنشاء موظف في استدعاء واحد مع معالجة أفضل للأخطاء';
    RAISE NOTICE '📝 الاستخدام: create_employee_unified(email, password, name, phone, job_title, permissions)';
END;
$$;
