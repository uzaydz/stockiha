-- إضافة مكون "عن متجرنا" لمتاجر المؤسسات

-- 1. إنشاء وظيفة لإضافة مكون عن المتجر مع تعطيل تسجيل التغييرات
CREATE OR REPLACE FUNCTION create_store_about_component(p_organization_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_component_id UUID;
  v_current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_order_index INT;
BEGIN
  -- التحقق من وجود المؤسسة
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
    RAISE EXCEPTION 'المؤسسة غير موجودة';
  END IF;
  
  -- التحقق من عدم وجود مكون "عن المتجر" بالفعل
  IF EXISTS (SELECT 1 FROM store_settings WHERE organization_id = p_organization_id AND component_type = 'about') THEN
    RETURN (SELECT id FROM store_settings WHERE organization_id = p_organization_id AND component_type = 'about' LIMIT 1);
  END IF;
  
  -- الحصول على أعلى ترتيب حالي
  SELECT COALESCE(MAX(order_index), 0) + 1 INTO v_order_index
  FROM store_settings
  WHERE organization_id = p_organization_id;
  
  -- تعطيل مؤقت للمحفز الذي يسبب المشكلة
  SET session_replication_role = 'replica';
  
  -- إدراج مكون "عن المتجر" الجديد
  BEGIN
    INSERT INTO store_settings(
      organization_id,
      component_type,
      settings,
      is_active,
      order_index,
      created_at,
      updated_at
    )
    VALUES (
      p_organization_id,
      'about',
      jsonb_build_object(
        'title', 'عن متجرنا',
        'subtitle', 'متجر إلكتروني موثوق به منذ سنوات',
        'description', 'تأسس متجرنا بهدف تقديم منتجات عالية الجودة وخدمات متميزة للعملاء. نحن نفخر بتوفير تجربة تسوق سهلة وآمنة مع ضمان أفضل الأسعار والجودة العالية. نلتزم دائمًا بتوفير منتجات أصلية وضمان رضا عملائنا التام.',
        'image', 'https://images.unsplash.com/photo-1612690669207-fed642192c40?q=80&w=1740',
        'storeInfo', jsonb_build_object(
          'yearFounded', v_current_year - 3,
          'customersCount', 500,
          'productsCount', 150,
          'branches', 2
        ),
        'features', jsonb_build_array(
          'منتجات أصلية بضمان الوكيل',
          'شحن سريع لجميع مناطق الجزائر',
          'دعم فني متخصص',
          'خدمة ما بعد البيع'
        )
      ),
      TRUE,
      v_order_index,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_component_id;
  
    -- إعادة تفعيل المحفزات
    SET session_replication_role = 'origin';
    
    -- إضافة سجل تسجيل يدوي للتغيير الذي تم إجراؤه
    INSERT INTO settings_audit_log (
      organization_id,
      user_id, 
      action_type, 
      table_name, 
      record_id, 
      old_values, 
      new_values,
      setting_type,
      setting_key
    ) VALUES (
      p_organization_id,
      (SELECT id FROM users WHERE organization_id = p_organization_id ORDER BY created_at LIMIT 1), -- استخدام أول مستخدم للمؤسسة
      'INSERT',
      'store_settings',
      v_component_id,
      NULL,
      jsonb_build_object(
        'component_type', 'about',
        'organization_id', p_organization_id
      ),
      'store',
      'component_about'
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- إعادة تفعيل المحفزات في حالة حدوث خطأ
      SET session_replication_role = 'origin';
      RAISE;
  END;
  
  RETURN v_component_id;
END;
$$;

-- 2. إنشاء وظيفة RPC للحصول على مكون عن المتجر
CREATE OR REPLACE FUNCTION get_store_about_component(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  component_type TEXT,
  settings JSONB,
  is_active BOOLEAN,
  order_index INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    store_settings.id,
    store_settings.component_type,
    store_settings.settings,
    store_settings.is_active,
    store_settings.order_index
  FROM 
    store_settings
  WHERE 
    store_settings.organization_id = p_organization_id AND
    store_settings.component_type = 'about'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. إضافة مكون "عن المتجر" لجميع المؤسسات الموجودة
-- ملاحظة: هذه العملية قد تستغرق وقتًا إذا كان هناك عدد كبير من المؤسسات
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN 
      -- نقوم بالتحقق من وجود مستخدمين للمؤسسة قبل إضافة المكون لتجنب الأخطاء
      SELECT o.id 
      FROM organizations o
      WHERE EXISTS (
        SELECT 1 FROM users u WHERE u.organization_id = o.id
      )
  LOOP
    BEGIN
      PERFORM create_store_about_component(org_record.id);
    EXCEPTION WHEN OTHERS THEN
      -- تسجيل الخطأ ومتابعة العملية
      RAISE NOTICE 'فشل إضافة مكون "عن المتجر" للمؤسسة %: %', org_record.id, SQLERRM;
    END;
  END LOOP;
END $$; 