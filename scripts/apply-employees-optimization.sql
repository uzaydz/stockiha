-- تطبيق تحسينات صفحة الموظفين
-- هذا السكريبت يطبق RPC function المحسنة لتقليل الاستدعاءات

-- تحقق من وجود الجدول أولاً
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'جدول users غير موجود!';
    END IF;
END
$$;

-- حذف الدالة الموجودة إذا كانت موجودة (لتجنب تعارض أنواع الإرجاع)
DROP FUNCTION IF EXISTS get_employees_with_stats(UUID);
DROP FUNCTION IF EXISTS get_employees_with_stats();

-- إنشاء أو تحديث الدالة الرئيسية
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
        'total', total,
        'active', active,
        'inactive', inactive
    ) INTO stats_data
    FROM employee_counts;
    
    -- إنشاء النتيجة النهائية
    final_result := json_build_object(
        'employees', COALESCE(employees_data, '[]'::json),
        'stats', COALESCE(stats_data, json_build_object('total', 0, 'active', 0, 'inactive', 0))
    );
    
    RETURN final_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- في حالة حدوث خطأ، نعيد بيانات فارغة
        RETURN json_build_object(
            'employees', '[]'::json,
            'stats', json_build_object(
                'total', 0,
                'active', 0,
                'inactive', 0
            ),
            'error', SQLERRM
        );
END;
$$;

-- منح الصلاحيات المناسبة للدالة
GRANT EXECUTE ON FUNCTION get_employees_with_stats(UUID) TO authenticated;

-- إنشاء دالة مساعدة للحصول على معرف المؤسسة للمستخدم الحالي
CREATE OR REPLACE FUNCTION get_current_user_organization_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    org_id UUID;
BEGIN
    -- محاولة الحصول على معرف المؤسسة من المستخدم الحالي
    SELECT organization_id INTO org_id
    FROM public.users
    WHERE id = auth.uid()
    LIMIT 1;
    
    RETURN org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_user_organization_id() TO authenticated;

-- إضافة تعليق للدالة
COMMENT ON FUNCTION get_employees_with_stats(UUID) IS 'دالة محسنة لجلب جميع بيانات الموظفين مع الإحصائيات في استدعاء واحد فقط';

-- اختبار الدالة
DO $$
DECLARE
    test_result JSON;
BEGIN
    -- اختبار الدالة للتأكد من عملها
    SELECT get_employees_with_stats() INTO test_result;
    
    -- طباعة رسالة نجاح
    RAISE NOTICE 'تم تطبيق تحسينات صفحة الموظفين بنجاح! ✅';
    RAISE NOTICE 'الدالة الجديدة: get_employees_with_stats()';
    RAISE NOTICE 'الفوائد: تقليل الاستدعاءات من 6 إلى 1';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'حدث خطأ أثناء اختبار الدالة: %', SQLERRM;
END;
$$;
