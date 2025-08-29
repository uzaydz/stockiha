-- إصلاح مشكلة عدم ظهور الموظفين
-- يمكن تشغيل هذا في Supabase SQL Editor مباشرة

-- 1. التحقق من الموظفين الموجودين
SELECT 
  'الموظفون الموجودون:' as info,
  COUNT(*) as total_employees,
  COUNT(*) FILTER (WHERE is_active = true) as active_employees,
  organization_id
FROM users 
WHERE role = 'employee'
GROUP BY organization_id;

-- 2. التحقق من الموظفين في المؤسسة المحددة
SELECT 
  '🔍 موظفو المؤسسة 6c2ed605-0880-4e40-af50-78f80f7283bb:' as info,
  id,
  name,
  email,
  is_active,
  created_at
FROM users 
WHERE role = 'employee' 
AND organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb';

-- 3. إصلاح الدالة المشكلة
DROP FUNCTION IF EXISTS get_employees_with_stats(UUID);

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
        SELECT organization_id INTO org_id
        FROM public.users
        WHERE id = auth.uid() OR auth_user_id = auth.uid()
        LIMIT 1;
    ELSE
        org_id := p_organization_id;
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
            'last_login', u.last_activity_at,
            'created_at', u.created_at,
            'updated_at', u.updated_at,
            'organization_id', u.organization_id,
            'permissions', COALESCE(u.permissions, '{}'::jsonb)
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
        'total', COALESCE(total, 0),
        'active', COALESCE(active, 0),
        'inactive', COALESCE(inactive, 0)
    ) INTO stats_data
    FROM employee_counts;
    
    -- النتيجة النهائية
    RETURN json_build_object(
        'employees', COALESCE(employees_data, '[]'::json),
        'stats', COALESCE(stats_data, json_build_object('total', 0, 'active', 0, 'inactive', 0)),
        'success', true
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'employees', '[]'::json,
            'stats', json_build_object('total', 0, 'active', 0, 'inactive', 0),
            'success', false,
            'error', SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION get_employees_with_stats(UUID) TO authenticated;

-- 4. اختبار الدالة المصححة
SELECT 
  '🧪 اختبار الدالة المصححة:' as info,
  get_employees_with_stats('6c2ed605-0880-4e40-af50-78f80f7283bb') as result;

-- 5. إظهار النتيجة النهائية
SELECT 
  '✅ الموظفون الذين يجب أن يظهروا:' as info,
  COUNT(*) as should_appear
FROM users 
WHERE role = 'employee' 
AND organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
AND is_active = true;
