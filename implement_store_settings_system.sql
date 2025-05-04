-- تطبيق نظام إدارة متاجر المؤسسات
-- هذا الملف ينشئ جميع الهياكل اللازمة لإدارة متاجر المؤسسات مع ضمان الأمان المناسب

-- التأكد من وجود امتداد uuid-ossp
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- إنشاء جدول إعدادات المتجر
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL, -- 'hero', 'categories', 'featured_products', 'testimonials', 'about'
  settings JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء مؤشرات لتسريع البحث
CREATE INDEX IF NOT EXISTS idx_store_settings_organization_id ON store_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_store_settings_component_type ON store_settings(component_type);

-- إنشاء دالة لتحديث وقت التعديل تلقائيًا
CREATE OR REPLACE FUNCTION update_store_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء محفز لتحديث وقت التعديل تلقائيًا
DROP TRIGGER IF EXISTS trigger_update_store_settings_updated_at ON store_settings;
CREATE TRIGGER trigger_update_store_settings_updated_at
BEFORE UPDATE ON store_settings
FOR EACH ROW
EXECUTE FUNCTION update_store_settings_updated_at();

-- إضافة تعليق للجدول
COMMENT ON TABLE store_settings IS 'يحتوي هذا الجدول على إعدادات مكونات المتجر التي يمكن تخصيصها لكل مؤسسة';

-- تمكين سياسة الأمان (RLS)
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- حذف أي سياسات موجودة (لتجنب التكرار عند إعادة التنفيذ)
DROP POLICY IF EXISTS read_store_settings ON store_settings;
DROP POLICY IF EXISTS insert_store_settings ON store_settings;
DROP POLICY IF EXISTS update_store_settings ON store_settings;
DROP POLICY IF EXISTS delete_store_settings ON store_settings;
DROP POLICY IF EXISTS super_admin_store_settings ON store_settings;

-- سياسة للقراءة
CREATE POLICY read_store_settings ON store_settings
  FOR SELECT
  USING (auth.uid() IN (
    SELECT u.id FROM users u WHERE u.organization_id = store_settings.organization_id
  ));

-- سياسة للإنشاء
CREATE POLICY insert_store_settings ON store_settings
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT u.id FROM users u 
    WHERE u.organization_id = store_settings.organization_id 
    AND (u.is_org_admin = true OR u.permissions->>'manageOrganizationSettings' = 'true')
  ));

-- سياسة للتحديث
CREATE POLICY update_store_settings ON store_settings
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT u.id FROM users u 
    WHERE u.organization_id = store_settings.organization_id
    AND (u.is_org_admin = true OR u.permissions->>'manageOrganizationSettings' = 'true')
  ));

-- سياسة للحذف
CREATE POLICY delete_store_settings ON store_settings
  FOR DELETE
  USING (auth.uid() IN (
    SELECT u.id FROM users u 
    WHERE u.organization_id = store_settings.organization_id
    AND (u.is_org_admin = true OR u.permissions->>'manageOrganizationSettings' = 'true')
  ));

-- سياسة للمدير الأعلى (Super Admin)
CREATE POLICY super_admin_store_settings ON store_settings
  FOR ALL
  USING (auth.uid() IN (
    SELECT u.id FROM users u WHERE u.is_super_admin = true
  ));

-- === وظائف RPC لإدارة إعدادات المتجر ===

-- الحصول على إعدادات متجر لمؤسسة معينة
CREATE OR REPLACE FUNCTION get_store_settings(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  component_type TEXT,
  settings JSONB,
  is_active BOOLEAN,
  order_index INTEGER
) AS $$
BEGIN
  -- التحقق من صلاحية المستخدم
  IF NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND (u.organization_id = p_organization_id OR u.is_super_admin = true)
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول إلى هذه البيانات';
  END IF;

  RETURN QUERY
  SELECT 
    ss.id,
    ss.component_type,
    ss.settings,
    ss.is_active,
    ss.order_index
  FROM 
    store_settings ss
  WHERE 
    ss.organization_id = p_organization_id
  ORDER BY
    ss.order_index ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء/تحديث مكون متجر
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
BEGIN
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
    u.id = auth.uid();
  
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

-- حذف مكون متجر
CREATE OR REPLACE FUNCTION delete_store_component(
  p_organization_id UUID,
  p_component_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_has_permission BOOLEAN;
BEGIN
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
    u.id = auth.uid();
  
  IF v_user_org_id IS NULL OR (v_user_org_id != p_organization_id AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'غير مصرح لك بحذف بيانات هذه المؤسسة';
  END IF;
  
  IF NOT (v_is_admin OR v_has_permission) THEN
    RAISE EXCEPTION 'يجب أن تكون مديراً أو تملك صلاحيات إدارة إعدادات المؤسسة';
  END IF;

  -- حذف المكون
  DELETE FROM store_settings ss
  WHERE ss.id = p_component_id AND ss.organization_id = p_organization_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث ترتيب مكونات المتجر
CREATE OR REPLACE FUNCTION update_store_components_order(
  p_organization_id UUID,
  p_components_order JSONB -- مصفوفة من معرفات المكونات بالترتيب الجديد
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_has_permission BOOLEAN;
  v_component_id UUID;
  v_index INTEGER;
BEGIN
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
    u.id = auth.uid();
  
  IF v_user_org_id IS NULL OR (v_user_org_id != p_organization_id AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'غير مصرح لك بتعديل بيانات هذه المؤسسة';
  END IF;
  
  IF NOT (v_is_admin OR v_has_permission) THEN
    RAISE EXCEPTION 'يجب أن تكون مديراً أو تملك صلاحيات إدارة إعدادات المؤسسة';
  END IF;

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
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء إعدادات متجر افتراضية لمؤسسة جديدة
CREATE OR REPLACE FUNCTION initialize_store_settings(p_organization_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
BEGIN
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
    u.id = auth.uid();
  
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
  );
  
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
  );
  
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
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- === محفزات لربط ميزة المتجر بدورة حياة المؤسسة ===

-- إنشاء وظيفة لإعداد المتجر عند إنشاء مؤسسة جديدة
CREATE OR REPLACE FUNCTION trigger_init_store_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- استدعاء وظيفة تهيئة إعدادات المتجر للمؤسسة الجديدة
  PERFORM initialize_store_settings(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء محفز لتهيئة إعدادات المتجر تلقائياً عند إنشاء مؤسسة جديدة
DROP TRIGGER IF EXISTS trigger_organization_store_init ON organizations;
CREATE TRIGGER trigger_organization_store_init
AFTER INSERT ON organizations
FOR EACH ROW
EXECUTE FUNCTION trigger_init_store_settings();

-- تحديث صلاحيات النظام ليشمل إدارة المتجر
COMMENT ON FUNCTION get_store_settings IS 'الحصول على إعدادات متجر لمؤسسة معينة';
COMMENT ON FUNCTION upsert_store_component IS 'إضافة أو تحديث مكون متجر';
COMMENT ON FUNCTION delete_store_component IS 'حذف مكون متجر';
COMMENT ON FUNCTION update_store_components_order IS 'تحديث ترتيب مكونات المتجر';
COMMENT ON FUNCTION initialize_store_settings IS 'إنشاء إعدادات متجر افتراضية لمؤسسة جديدة';

-- إضافة نوع إذن جديد في الملف التعريفي للنظام
DO $$ 
BEGIN
  -- إذا كان هناك متحكم بإضافة أنواع الأذونات، يمكن إضافة:
  -- manageStoreSettings - إدارة إعدادات المتجر
END $$; 