-- إصلاح مشكلة "cannot get array length of a scalar" في وظيفة update_store_components_order
-- المشكلة: الوظيفة تتوقع قيمة JSONB لكن يتم إرسال نص JSON محول كسلسلة نصية

-- حذف جميع نسخ الوظيفة الحالية أولاً لتجنب مشكلة التحميل الزائد (function overloading)
DROP FUNCTION IF EXISTS update_store_components_order(UUID, JSONB);
DROP FUNCTION IF EXISTS update_store_components_order(UUID, TEXT);

-- تعديل وظيفة update_store_components_order لقبول نص JSON وتحويله تلقائياً إلى JSONB
CREATE OR REPLACE FUNCTION update_store_components_order(
  p_organization_id UUID,
  p_components_order TEXT  -- تغيير من JSONB إلى TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_has_permission BOOLEAN;
  v_component_id UUID;
  v_index INTEGER;
  v_user_id UUID;
  v_old_values JSONB := '[]'::jsonb;
  v_new_values JSONB := '[]'::jsonb;
  v_old_val_text TEXT;
  v_new_val_text TEXT;
  v_components_order_jsonb JSONB;  -- متغير جديد لتخزين القيمة بعد التحويل
BEGIN
  -- تحويل النص المدخل إلى JSONB
  BEGIN
    v_components_order_jsonb := p_components_order::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'قيمة غير صالحة لـ p_components_order. يجب أن تكون سلسلة JSON صالحة: %', SQLERRM;
  END;

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

  -- حفظ حالة المكونات قبل التحديث
  SELECT json_agg(row_to_json(ss)) INTO v_old_values
  FROM (
    SELECT id, component_type, order_index, is_active
    FROM store_settings 
    WHERE organization_id = p_organization_id
    ORDER BY order_index
  ) ss;
  
  -- تحديث ترتيب المكونات
  FOR v_index IN 0..jsonb_array_length(v_components_order_jsonb) - 1 LOOP
    v_component_id := (v_components_order_jsonb->>v_index)::UUID;
    
    UPDATE store_settings ss
    SET 
      order_index = v_index + 1,
      updated_at = NOW()
    WHERE 
      ss.id = v_component_id AND 
      ss.organization_id = p_organization_id;
  END LOOP;
  
  -- حفظ حالة المكونات بعد التحديث
  SELECT json_agg(row_to_json(ss)) INTO v_new_values
  FROM (
    SELECT id, component_type, order_index, is_active
    FROM store_settings 
    WHERE organization_id = p_organization_id
    ORDER BY order_index
  ) ss;
  
  -- تحويل JSONB إلى TEXT
  v_old_val_text := v_old_values::text;
  v_new_val_text := v_new_values::text;
  
  -- إضافة سجل تدقيق يدوي للتحديث
  INSERT INTO settings_audit_log (
    user_id, 
    organization_id, 
    setting_type, 
    setting_key, 
    old_value,
    old_values,
    new_value,
    new_values,
    action_type,
    table_name,
    record_id,
    created_at
  ) VALUES (
    v_user_id,
    p_organization_id,
    'store',
    'components_order',
    v_old_val_text,
    v_old_val_text,
    v_new_val_text,
    v_new_val_text,
    'UPDATE',
    'store_settings',
    NULL,
    NOW()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- شرح الإصلاح
COMMENT ON FUNCTION update_store_components_order(UUID, TEXT) IS '
تحديث ترتيب مكونات المتجر.
تم تعديل الوظيفة لقبول النص JSON المرسل من واجهة المستخدم وتحويله تلقائيًا إلى JSONB للمعالجة.
هذا يحل مشكلة "cannot get array length of a scalar" التي كانت تحدث عند استدعاء الوظيفة.
';

-- ملاحظات للتنفيذ
-- 1. هذا الملف يحذف جميع الإصدارات السابقة من الوظيفة ثم يعيد إنشاءها بمعلمة جديدة من نوع TEXT
-- 2. هذا يحل مشكلة تحميل الوظائف الزائد (function overloading) التي تسببت في خطأ PGRST203
-- 3. يمكن تنفيذ هذا الملف على قاعدة البيانات مباشرة دون تعديل شيفرة العميل (frontend) 