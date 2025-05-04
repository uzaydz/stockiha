-- تعريف وظيفة get_employee_stats
CREATE OR REPLACE FUNCTION public.get_employee_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_count INTEGER;
    active_count INTEGER;
    inactive_count INTEGER;
    result_json json;
BEGIN
    -- حساب إجمالي عدد الموظفين
    SELECT COUNT(*) INTO total_count
    FROM users
    WHERE role = 'employee';
    
    -- حساب عدد الموظفين النشطين
    SELECT COUNT(*) INTO active_count
    FROM users
    WHERE role = 'employee' AND is_active = true;
    
    -- حساب عدد الموظفين غير النشطين
    SELECT COUNT(*) INTO inactive_count
    FROM users
    WHERE role = 'employee' AND is_active = false;
    
    -- بناء JSON للعودة
    result_json := json_build_object(
        'total', total_count,
        'active', active_count,
        'inactive', inactive_count
    );
    
    RETURN result_json;
END;
$$;

-- منح صلاحيات تنفيذ الوظيفة للمستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION public.get_employee_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_employee_stats() TO service_role;

COMMENT ON FUNCTION public.get_employee_stats IS 'وظيفة لاسترجاع إحصائيات الموظفين مثل العدد الإجمالي، النشطين وغير النشطين'; 