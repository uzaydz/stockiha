-- إنشاء stored procedure لإنشاء وكيل مركز اتصال
-- هذه الدالة تعمل بصلاحيات SECURITY DEFINER لتجاوز RLS

CREATE OR REPLACE FUNCTION create_call_center_agent(
  p_email TEXT,
  p_name TEXT,
  p_organization_id UUID,
  p_phone TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'employee',
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_job_title TEXT DEFAULT 'وكيل مركز اتصال',
  p_assigned_regions TEXT[] DEFAULT '{}',
  p_assigned_stores TEXT[] DEFAULT '{}',
  p_max_daily_orders INTEGER DEFAULT 50,
  p_specializations TEXT[] DEFAULT '{}',
  p_work_schedule JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- هذا يسمح للدالة بالعمل بصلاحيات المالك
AS $$
DECLARE
  v_user_id UUID;
  v_agent_id UUID;
  v_current_user_id UUID;
  v_current_user_org_id UUID;
  v_is_org_admin BOOLEAN;
  v_is_super_admin BOOLEAN;
  v_default_schedule JSONB;
BEGIN
  -- التحقق من صلاحيات المستخدم الحالي
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير مصادق عليه';
  END IF;

  -- الحصول على معلومات المستخدم الحالي
  SELECT 
    organization_id, 
    is_org_admin, 
    is_super_admin
  INTO 
    v_current_user_org_id, 
    v_is_org_admin, 
    v_is_super_admin
  FROM public.users 
  WHERE auth_user_id = v_current_user_id;

  -- التحقق من الصلاحيات
  IF NOT (v_is_super_admin OR (v_is_org_admin AND v_current_user_org_id = p_organization_id)) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية لإنشاء وكلاء في هذه المنظمة';
  END IF;

  -- إعداد جدول العمل الافتراضي
  IF p_work_schedule IS NULL THEN
    v_default_schedule := '{
      "monday": {"start": "09:00", "end": "17:00", "active": true},
      "tuesday": {"start": "09:00", "end": "17:00", "active": true},
      "wednesday": {"start": "09:00", "end": "17:00", "active": true},
      "thursday": {"start": "09:00", "end": "17:00", "active": true},
      "friday": {"start": "09:00", "end": "17:00", "active": true},
      "saturday": {"start": "09:00", "end": "17:00", "active": false},
      "sunday": {"start": "09:00", "end": "17:00", "active": false}
    }'::jsonb;
  ELSE
    v_default_schedule := p_work_schedule;
  END IF;

  -- إنشاء سجل المستخدم
  INSERT INTO public.users (
    email,
    name,
    phone,
    role,
    organization_id,
    first_name,
    last_name,
    job_title,
    is_active,
    permissions
  ) VALUES (
    p_email,
    p_name,
    p_phone,
    p_role,
    p_organization_id,
    p_first_name,
    p_last_name,
    p_job_title,
    true,
    jsonb_build_object(
      'call_center', jsonb_build_object(
        'can_make_calls', true,
        'can_view_orders', true,
        'can_update_orders', true,
        'can_view_reports', (p_role = 'admin')
      )
    )
  ) RETURNING id INTO v_user_id;

  -- إنشاء سجل وكيل مركز الاتصال
  INSERT INTO public.call_center_agents (
    user_id,
    organization_id,
    assigned_regions,
    assigned_stores,
    max_daily_orders,
    is_available,
    is_active,
    last_activity,
    performance_metrics,
    specializations,
    work_schedule
  ) VALUES (
    v_user_id,
    p_organization_id,
    p_assigned_regions,
    p_assigned_stores,
    p_max_daily_orders,
    true,
    true,
    NOW(),
    jsonb_build_object(
      'failed_calls', 0,
      'successful_calls', 0,
      'avg_call_duration', 0,
      'total_orders_handled', 0,
      'customer_satisfaction', 0,
      'last_performance_update', null
    ),
    p_specializations,
    v_default_schedule
  ) RETURNING id INTO v_agent_id;

  -- إرجاع النتيجة
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'agent_id', v_agent_id,
    'message', 'تم إنشاء الوكيل بنجاح'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- في حالة حدوث خطأ، إرجاع رسالة الخطأ
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'فشل في إنشاء الوكيل'
    );
END;
$$;

-- منح الصلاحيات للمستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION create_call_center_agent TO authenticated;

-- إضافة تعليق على الدالة
COMMENT ON FUNCTION create_call_center_agent IS 'إنشاء وكيل مركز اتصال جديد مع التحقق من الصلاحيات'; 