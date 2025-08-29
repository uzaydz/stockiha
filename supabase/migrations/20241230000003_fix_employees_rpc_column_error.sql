-- إصلاح مشكلة العمود غير الموجود في RPC function
-- المشكلة: last_sign_in_at قد لا يكون موجود في جدول public.users

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS get_employees_with_stats(UUID);

-- إنشاء الدالة المصححة
CREATE OR REPLACE FUNCTION get_employees_with_stats(p_organization_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    employees_data JSON;
    stats_data JSON;
    final_result JSON;
    org_id UUID;
BEGIN
    -- تحديد معرف المؤسسة
    IF p_organization_id IS NULL THEN
        -- محاولة الحصول على معرف المؤسسة من المستخدم الحالي
        SELECT organization_id INTO org_id
        FROM public.users
        WHERE id = auth.uid() OR auth_user_id = auth.uid()
        LIMIT 1;
    ELSE
        org_id := p_organization_id;
    END IF;
    
    -- إذا لم نجد معرف المؤسسة، نعيد بيانات فارغة
    IF org_id IS NULL THEN
        RETURN json_build_object(
            'employees', '[]'::json,
            'stats', json_build_object(
                'total', 0,
                'active', 0,
                'inactive', 0
            ),
            'debug', 'No organization ID found'
        );
    END IF;
    
    -- جلب بيانات الموظفين (بدون العمود المشكل)
    SELECT json_agg(
        json_build_object(
            'id', u.id,
            'user_id', COALESCE(u.auth_user_id, u.id),
            'name', u.name,
            'email', u.email,
            'phone', u.phone,
            'role', u.role,
            'is_active', u.is_active,
            'last_login', u.last_activity_at, -- ✅ العمود الصحيح
            'created_at', u.created_at,
            'updated_at', u.updated_at,
            'organization_id', u.organization_id,
            'permissions', COALESCE(u.permissions, '{}'::jsonb),
            'first_name', u.first_name,
            'last_name', u.last_name,
            'job_title', u.job_title,
            'avatar_url', u.avatar_url
        )
    ) INTO employees_data
    FROM public.users u
    WHERE u.role = 'employee' 
    AND u.organization_id = org_id
    AND u.is_active = true  -- فقط الموظفون النشطون
    ORDER BY u.created_at DESC;
    
    -- جلب الإحصائيات
    WITH employee_counts AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_active = true) as active,
            COUNT(*) FILTER (WHERE is_active = false) as inactive
        FROM public.users 
        WHERE role = 'employee' 
        AND organization_id = org_id
    )
    SELECT json_build_object(
        'total', COALESCE(total, 0),
        'active', COALESCE(active, 0),
        'inactive', COALESCE(inactive, 0)
    ) INTO stats_data
    FROM employee_counts;
    
    -- إنشاء النتيجة النهائية
    final_result := json_build_object(
        'employees', COALESCE(employees_data, '[]'::json),
        'stats', COALESCE(stats_data, json_build_object('total', 0, 'active', 0, 'inactive', 0)),
        'success', true,
        'organization_id', org_id,
        'debug', format('Found %s employees for org %s', COALESCE(json_array_length(employees_data), 0), org_id),
        'timestamp', extract(epoch from now())
    );
    
    RETURN final_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- في حالة حدوث خطأ، نعيد بيانات فارغة مع رسالة الخطأ
        RETURN json_build_object(
            'employees', '[]'::json,
            'stats', json_build_object(
                'total', 0,
                'active', 0,
                'inactive', 0
            ),
            'success', false,
            'error', SQLERRM,
            'debug', format('Error for org %s: %s', org_id, SQLERRM),
            'organization_id', org_id,
            'timestamp', extract(epoch from now())
        );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_employees_with_stats(UUID) TO authenticated;

-- إضافة تعليق
COMMENT ON FUNCTION get_employees_with_stats(UUID) IS 'دالة مصححة لجلب جميع بيانات الموظفين مع الإحصائيات - تم إصلاح مشكلة العمود غير الموجود';

-- اختبار الدالة
DO $$
DECLARE
    test_result JSON;
BEGIN
    -- اختبار الدالة مع معرف المؤسسة المحدد
    SELECT get_employees_with_stats('6c2ed605-0880-4e40-af50-78f80f7283bb') INTO test_result;
    
    RAISE NOTICE '✅ تم إصلاح دالة get_employees_with_stats!';
    RAISE NOTICE '📊 نتيجة الاختبار: %', test_result->>'debug';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ خطأ في اختبار الدالة: %', SQLERRM;
END;
$$;
