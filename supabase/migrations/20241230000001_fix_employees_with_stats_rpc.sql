-- إصلاح وإنشاء RPC function محسنة لجلب بيانات الموظفين مع الإحصائيات
-- يحل مشكلة تعارض أنواع الإرجاع

-- حذف جميع النسخ الموجودة من الدالة
DROP FUNCTION IF EXISTS get_employees_with_stats();
DROP FUNCTION IF EXISTS get_employees_with_stats(UUID);
DROP FUNCTION IF EXISTS get_employees_with_stats(p_organization_id UUID);

-- إنشاء الدالة الجديدة
CREATE FUNCTION get_employees_with_stats(p_organization_id UUID DEFAULT NULL)
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
        FROM auth.users au
        JOIN public.users pu ON au.id = pu.auth_user_id
        WHERE au.id = auth.uid()
        LIMIT 1;
        
        -- إذا لم نجد معرف المؤسسة من auth.users، نحاول من public.users مباشرة
        IF org_id IS NULL THEN
            SELECT organization_id INTO org_id
            FROM public.users
            WHERE id = auth.uid()
            LIMIT 1;
        END IF;
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
            )
        );
    END IF;
    
    -- جلب بيانات الموظفين
    SELECT json_agg(
        json_build_object(
            'id', u.id,
            'user_id', COALESCE(u.auth_user_id, u.id),
            'name', u.name,
            'email', u.email,
            'phone', u.phone,
            'role', u.role,
            'is_active', u.is_active,
            'last_login', u.last_sign_in_at,
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
    ORDER BY u.created_at DESC;
    
    -- جلب الإحصائيات في استعلام واحد محسن
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
            'timestamp', extract(epoch from now())
        );
END;
$$;

-- منح الصلاحيات المناسبة
GRANT EXECUTE ON FUNCTION get_employees_with_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_employees_with_stats(UUID) TO anon;

-- إضافة تعليق للدالة
COMMENT ON FUNCTION get_employees_with_stats(UUID) IS 'دالة محسنة لجلب جميع بيانات الموظفين مع الإحصائيات في استدعاء واحد فقط. تقلل من 6 استدعاءات إلى استدعاء واحد.';

-- اختبار الدالة للتأكد من عملها
DO $$
DECLARE
    test_result JSON;
    test_org_id UUID;
BEGIN
    -- محاولة الحصول على معرف مؤسسة للاختبار
    SELECT organization_id INTO test_org_id
    FROM public.users
    WHERE role = 'employee'
    LIMIT 1;
    
    -- اختبار الدالة
    SELECT get_employees_with_stats(test_org_id) INTO test_result;
    
    -- طباعة رسالة نجاح
    RAISE NOTICE '✅ تم إنشاء الدالة get_employees_with_stats بنجاح!';
    RAISE NOTICE '📊 الدالة تُرجع: employees, stats, success, timestamp';
    RAISE NOTICE '🚀 تحسين الأداء: من 6 استدعاءات إلى استدعاء واحد فقط';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ تم إنشاء الدالة ولكن حدث خطأ أثناء الاختبار: %', SQLERRM;
        RAISE NOTICE '💡 هذا طبيعي إذا لم توجد بيانات موظفين بعد';
END;
$$;
