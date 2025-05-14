-- إصلاح لمشكلة ترتيب معلمات دالة upsert_store_component
-- هذا الملف يقوم بإنشاء نسخة بديلة من الدالة بترتيب المعلمات الذي يتوقعه التطبيق

-- حذف النسخة السابقة من الدالة إن وجدت
DROP FUNCTION IF EXISTS public.upsert_store_component_with_frontend_order(
  p_component_id UUID,
  p_component_type TEXT,
  p_is_active BOOLEAN,
  p_order_index INTEGER,
  p_organization_id UUID,
  p_settings JSONB
);

-- إنشاء نسخة جديدة من الدالة بترتيب المعلمات المتوقع من واجهة المستخدم
CREATE OR REPLACE FUNCTION public.upsert_store_component_with_frontend_order(
  p_component_id UUID,
  p_component_type TEXT,
  p_is_active BOOLEAN,
  p_order_index INTEGER,
  p_organization_id UUID,
  p_settings JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
BEGIN
  -- استدعاء الدالة الأصلية لكن بترتيب المعلمات الصحيح
  RETURN public.upsert_store_component(
    p_organization_id,
    p_component_id,
    p_component_type,
    p_settings,
    p_is_active,
    p_order_index
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء نسخة جديدة من الدالة بنفس الاسم الأصلي لتكون بديلاً للنسخة الموجودة
-- DROP نسخة الدالة الحالية أولاً
DROP FUNCTION IF EXISTS public.upsert_store_component(
  p_component_id UUID,
  p_component_type TEXT,
  p_is_active BOOLEAN,
  p_order_index INTEGER,
  p_organization_id UUID,
  p_settings JSONB
);

-- إنشاء الدالة مع نفس الاسم ولكن بترتيب المعلمات المتوقع من واجهة المستخدم
CREATE OR REPLACE FUNCTION public.upsert_store_component(
  p_component_id UUID,
  p_component_type TEXT,
  p_is_active BOOLEAN,
  p_order_index INTEGER,
  p_organization_id UUID,
  p_settings JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_has_permission BOOLEAN;
  v_result_id UUID;
  v_user_id UUID;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  v_user_id := auth.uid();
  
  -- التحقق من صلاحية المستخدم
  SELECT 
    u.organization_id,
    u.is_org_admin OR u.is_super_admin,
    COALESCE(u.permissions->>'manageOrganizationSettings' = 'true', false)
  INTO 
    v_user_org_id,
    v_is_admin,
    v_has_permission
  FROM 
    users u
  WHERE 
    u.id = v_user_id;
  
  IF v_user_org_id IS NULL OR (v_user_org_id != p_organization_id AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'غير مصرح لك بتعديل بيانات هذه المؤسسة';
  END IF;
  
  IF NOT (v_is_admin OR v_has_permission) THEN
    RAISE EXCEPTION 'يجب أن تكون مديراً أو تملك صلاحيات إدارة إعدادات المؤسسة';
  END IF;

  -- إضافة أو تحديث المكون
  IF p_component_id IS NULL OR NOT EXISTS (SELECT 1 FROM store_settings ss WHERE ss.id = p_component_id) THEN
    -- إضافة مكون جديد
    INSERT INTO store_settings (
      organization_id,
      component_type,
      settings,
      is_active,
      order_index
    ) VALUES (
      p_organization_id,
      p_component_type,
      p_settings,
      p_is_active,
      p_order_index
    ) RETURNING id INTO v_result_id;
  ELSE
    -- تحديث مكون موجود
    UPDATE store_settings ss
    SET 
      component_type = p_component_type,
      settings = p_settings,
      is_active = p_is_active,
      order_index = p_order_index,
      updated_at = NOW()
    WHERE 
      ss.id = p_component_id AND 
      ss.organization_id = p_organization_id
    RETURNING ss.id INTO v_result_id;
  END IF;
  
  RETURN v_result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 