-- إصلاح مشكلة "column new_values" و "null value in column setting_type" في جدول settings_audit_log
-- تاريخ: 2024

-- 1. إضافة الأعمدة المفقودة إلى جدول settings_audit_log
ALTER TABLE public.settings_audit_log 
ADD COLUMN IF NOT EXISTS new_values TEXT,
ADD COLUMN IF NOT EXISTS old_values TEXT;

-- 2. تحديث القيم الموجودة
UPDATE settings_audit_log SET new_values = new_value WHERE new_values IS NULL;
UPDATE settings_audit_log SET old_values = old_value WHERE old_values IS NULL;

-- 3. إنشاء محفزات لنسخ القيم تلقائيًا
CREATE OR REPLACE FUNCTION trigger_copy_values()
RETURNS TRIGGER AS $$
BEGIN
  NEW.new_values := NEW.new_value;
  NEW.old_values := NEW.old_value;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء محفز لنسخ القيم إلى الأعمدة الجديدة
DROP TRIGGER IF EXISTS copy_values_trigger ON settings_audit_log;
CREATE TRIGGER copy_values_trigger
BEFORE INSERT OR UPDATE ON settings_audit_log
FOR EACH ROW
EXECUTE FUNCTION trigger_copy_values();

-- 4. تحديث وظائف المتجر لاستخدام الأعمدة الجديدة

-- 4.1 تعديل وظيفة initialize_store_settings
CREATE OR REPLACE FUNCTION initialize_store_settings(p_organization_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_user_id UUID;
  v_hero_id UUID;
  v_categories_id UUID;
  v_products_id UUID;
  v_new_val TEXT := 'Store initialized with default components';
BEGIN
  -- الحصول على معرف المستخدم الحالي
  v_user_id := auth.uid();
  
  -- التحقق من صلاحية المستخدم
  SELECT 
    u.organization_id,
    u.is_org_admin OR u.is_super_admin
  INTO 
    v_user_org_id,
    v_is_admin
  FROM 
    users u
  WHERE 
    u.id = v_user_id;
  
  IF v_user_org_id IS NULL OR (v_user_org_id != p_organization_id AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'غير مصرح لك بإعداد متجر لهذه المؤسسة';
  END IF;

  -- إضافة مكون الهيرو الافتراضي
  INSERT INTO store_settings (
    organization_id, 
    component_type, 
    settings, 
    order_index
  ) VALUES (
    p_organization_id,
    'hero',
    '{
      "title": "أحدث المنتجات",
      "description": "تسوق أحدث منتجاتنا المختارة بعناية بأفضل الأسعار التنافسية.",
      "primaryButton": {
        "text": "تصفح الكل",
        "link": "/products"
      },
      "secondaryButton": {
        "text": "العروض الخاصة",
        "link": "/offers"
      },
      "imageUrl": "https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?q=80&w=2070&auto=format&fit=crop",
      "trustBadges": [
        {
          "id": "1",
          "text": "توصيل سريع",
          "icon": "Truck"
        },
        {
          "id": "2",
          "text": "دفع آمن",
          "icon": "ShieldCheck"
        },
        {
          "id": "3",
          "text": "جودة عالية",
          "icon": "Gem"
        }
      ]
    }',
    1
  ) RETURNING id INTO v_hero_id;
  
  -- إضافة مكون الفئات الافتراضي
  INSERT INTO store_settings (
    organization_id, 
    component_type, 
    settings, 
    order_index
  ) VALUES (
    p_organization_id,
    'categories',
    '{
      "title": "تصفح فئات منتجاتنا",
      "description": "أفضل الفئات المختارة لتلبية احتياجاتك",
      "displayCount": 6,
      "displayType": "grid"
    }',
    2
  ) RETURNING id INTO v_categories_id;
  
  -- إضافة مكون المنتجات المميزة الافتراضي
  INSERT INTO store_settings (
    organization_id, 
    component_type, 
    settings, 
    order_index
  ) VALUES (
    p_organization_id,
    'featured_products',
    '{
      "title": "منتجاتنا المميزة",
      "description": "اكتشف أفضل منتجاتنا المختارة بعناية لتناسب احتياجاتك",
      "displayCount": 4,
      "displayType": "grid",
      "selectionCriteria": "featured"
    }',
    3
  ) RETURNING id INTO v_products_id;
  
  -- إنشاء سجلات تدقيق يدويًا
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
  ) VALUES 
  (
    v_user_id,
    p_organization_id,
    'store',
    'initialize_store_settings',
    NULL,
    NULL,
    v_new_val,
    v_new_val,
    'INSERT',
    'store_settings',
    v_hero_id,
    NOW()
  ),
  (
    v_user_id,
    p_organization_id,
    'store',
    'initialize_store_settings',
    NULL,
    NULL,
    v_new_val,
    v_new_val,
    'INSERT',
    'store_settings',
    v_categories_id,
    NOW()
  ),
  (
    v_user_id,
    p_organization_id,
    'store',
    'initialize_store_settings',
    NULL,
    NULL,
    v_new_val,
    v_new_val,
    'INSERT',
    'store_settings',
    v_products_id,
    NOW()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 تعديل وظيفة upsert_store_component
CREATE OR REPLACE FUNCTION upsert_store_component(
  p_organization_id UUID,
  p_component_id UUID,
  p_component_type TEXT,
  p_settings JSONB,
  p_is_active BOOLEAN,
  p_order_index INTEGER
) RETURNS UUID AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_has_permission BOOLEAN;
  v_result_id UUID;
  v_user_id UUID;
  v_old_values TEXT := NULL;
  v_new_values TEXT := NULL;
  v_component_type TEXT;
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

  -- التأكد من أن نوع المكون ليس فارغاً
  v_component_type := COALESCE(p_component_type, 'unknown');

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
      v_component_type,
      p_settings,
      p_is_active,
      p_order_index
    ) RETURNING id INTO v_result_id;
    
    -- تحضير القيمة الجديدة للتدقيق
    SELECT row_to_json(ss)::text INTO v_new_values
    FROM store_settings ss
    WHERE ss.id = v_result_id;
    
    -- إضافة سجل تدقيق يدوي للإضافة
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
      'component_' || v_component_type,
      NULL,
      NULL,
      v_new_values,
      v_new_values,
      'INSERT',
      'store_settings',
      v_result_id,
      NOW()
    );
  ELSE
    -- حفظ القيم القديمة قبل التحديث
    SELECT 
      row_to_json(ss)::text,
      ss.component_type
    INTO 
      v_old_values,
      v_component_type
    FROM store_settings ss
    WHERE ss.id = p_component_id;
    
    -- استخدام نوع المكون المقدم إذا كان غير فارغ، وإلا استخدام القيمة المسترجعة
    v_component_type := COALESCE(p_component_type, v_component_type, 'unknown');
    
    -- تحديث مكون موجود
    UPDATE store_settings ss
    SET 
      component_type = v_component_type,
      settings = p_settings,
      is_active = p_is_active,
      order_index = p_order_index,
      updated_at = NOW()
    WHERE 
      ss.id = p_component_id AND 
      ss.organization_id = p_organization_id
    RETURNING ss.id INTO v_result_id;
    
    -- تحضير القيمة الجديدة للتدقيق
    SELECT row_to_json(ss)::text INTO v_new_values
    FROM store_settings ss
    WHERE ss.id = v_result_id;
    
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
      'component_' || v_component_type,
      v_old_values,
      v_old_values,
      v_new_values,
      v_new_values,
      'UPDATE',
      'store_settings',
      v_result_id,
      NOW()
    );
  END IF;
  
  RETURN v_result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 تعديل وظيفة delete_store_component
CREATE OR REPLACE FUNCTION delete_store_component(
  p_organization_id UUID,
  p_component_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_has_permission BOOLEAN;
  v_user_id UUID;
  v_result BOOLEAN;
  v_old_values TEXT;
  v_component_type TEXT;
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
    RAISE EXCEPTION 'غير مصرح لك بحذف بيانات هذه المؤسسة';
  END IF;
  
  IF NOT (v_is_admin OR v_has_permission) THEN
    RAISE EXCEPTION 'يجب أن تكون مديراً أو تملك صلاحيات إدارة إعدادات المؤسسة';
  END IF;

  -- حفظ القيم القديمة قبل الحذف
  SELECT 
    row_to_json(ss)::text,
    ss.component_type
  INTO 
    v_old_values,
    v_component_type
  FROM store_settings ss
  WHERE ss.id = p_component_id;
  
  -- التأكد من أن نوع المكون ليس NULL
  v_component_type := COALESCE(v_component_type, 'unknown');
  
  -- حذف المكون
  DELETE FROM store_settings ss
  WHERE ss.id = p_component_id AND ss.organization_id = p_organization_id;
  
  v_result := FOUND;
  
  IF v_result THEN
    -- إضافة سجل تدقيق يدوي للحذف
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
      'component_' || v_component_type,
      v_old_values,
      v_old_values,
      NULL,
      NULL,
      'DELETE',
      'store_settings',
      p_component_id,
      NOW()
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.4 تعديل وظيفة تحديث ترتيب المكونات
CREATE OR REPLACE FUNCTION update_store_components_order(
  p_organization_id UUID,
  p_components_order JSONB
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

  -- حفظ حالة المكونات قبل التحديث
  SELECT json_agg(row_to_json(ss)) INTO v_old_values
  FROM (
    SELECT id, component_type, order_index, is_active
    FROM store_settings 
    WHERE organization_id = p_organization_id
    ORDER BY order_index
  ) ss;
  
  -- تحديث ترتيب المكونات
  FOR v_index IN 0..jsonb_array_length(p_components_order) - 1 LOOP
    v_component_id := (p_components_order->>v_index)::UUID;
    
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

-- 5. تحديث دالة log_settings_change للجداول الأخرى
CREATE OR REPLACE FUNCTION public.log_settings_change()
RETURNS trigger AS $$
DECLARE
    org_id uuid := NULL;
    user_org_id uuid := NULL;
    rec_id uuid := NULL;
    old_val text := NULL;
    new_val text := NULL;
BEGIN
    -- محاولة الحصول على معرف السجل
    BEGIN
        IF TG_OP IN ('INSERT', 'UPDATE') THEN
            rec_id := NEW.id;
        ELSIF TG_OP = 'DELETE' THEN
            rec_id := OLD.id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        rec_id := NULL;
    END;

    -- تحديد المؤسسة حسب نوع الجدول
    IF TG_TABLE_NAME = 'organization_settings' THEN
        org_id := NEW.organization_id;
    ELSIF TG_TABLE_NAME = 'user_settings' THEN
        BEGIN
            SELECT u.organization_id INTO user_org_id 
            FROM users u 
            WHERE u.id = NEW.user_id;
            
            IF FOUND THEN
                org_id := user_org_id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            org_id := NULL;
        END;
    END IF;

    -- تجهيز القيم
    IF TG_OP = 'UPDATE' THEN
        old_val := (SELECT row_to_json(OLD)::text);
    END IF;
    
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        new_val := (SELECT row_to_json(NEW)::text);
    END IF;

    -- تسجيل التغيير
    INSERT INTO public.settings_audit_log (
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
    )
    VALUES (
        COALESCE(NEW.user_id, auth.uid()), 
        org_id,
        CASE 
            WHEN TG_TABLE_NAME = 'user_settings' THEN 'user'
            ELSE 'organization'
        END,
        TG_ARGV[0],
        old_val,
        old_val,
        new_val,
        new_val,
        TG_OP,
        TG_TABLE_NAME,
        rec_id,
        NOW()
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'خطأ في log_settings_change: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة إنشاء المحفزات لجداول الإعدادات
DROP TRIGGER IF EXISTS user_settings_audit_trigger ON user_settings;
DROP TRIGGER IF EXISTS organization_settings_audit_trigger ON organization_settings;

CREATE TRIGGER user_settings_audit_trigger
AFTER INSERT OR UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change('user_settings');

CREATE TRIGGER organization_settings_audit_trigger
AFTER INSERT OR UPDATE ON organization_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change('organization_settings'); 