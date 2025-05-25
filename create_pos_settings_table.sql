-- إنشاء جدول إعدادات نقطة البيع
-- هذا الجدول يحتوي على جميع إعدادات المتجر الخاصة بنقطة البيع

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- إنشاء جدول إعدادات نقطة البيع
CREATE TABLE IF NOT EXISTS pos_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- معلومات المتجر الأساسية
  store_name VARCHAR(255) DEFAULT 'المتجر',
  store_phone VARCHAR(50),
  store_email VARCHAR(100),
  store_address TEXT,
  store_website VARCHAR(255),
  store_logo_url TEXT,
  
  -- إعدادات نص الوصل
  receipt_header_text TEXT DEFAULT 'شكراً لتعاملكم معنا',
  receipt_footer_text TEXT DEFAULT 'نتطلع لخدمتكم مرة أخرى',
  welcome_message TEXT DEFAULT 'أهلاً وسهلاً بكم',
  
  -- إعدادات العناصر المرئية
  show_qr_code BOOLEAN DEFAULT true,
  show_tracking_code BOOLEAN DEFAULT true,
  show_customer_info BOOLEAN DEFAULT true,
  show_store_logo BOOLEAN DEFAULT true,
  show_store_info BOOLEAN DEFAULT true,
  show_date_time BOOLEAN DEFAULT true,
  show_employee_name BOOLEAN DEFAULT false,
  
  -- إعدادات الطباعة
  paper_width INTEGER DEFAULT 58, -- mm (48, 58, 80)
  font_size INTEGER DEFAULT 10, -- px
  line_spacing DECIMAL(2,1) DEFAULT 1.2,
  print_density VARCHAR(20) DEFAULT 'normal', -- light, normal, dark
  auto_cut BOOLEAN DEFAULT true,
  
  -- إعدادات المظهر والألوان
  primary_color VARCHAR(7) DEFAULT '#0099ff',
  secondary_color VARCHAR(7) DEFAULT '#6c757d',
  text_color VARCHAR(7) DEFAULT '#000000',
  background_color VARCHAR(7) DEFAULT '#ffffff',
  receipt_template VARCHAR(50) DEFAULT 'classic', -- classic, modern, minimal, custom
  
  -- إعدادات تخطيط الوصل
  header_style VARCHAR(20) DEFAULT 'centered', -- centered, left, right
  footer_style VARCHAR(20) DEFAULT 'centered',
  item_display_style VARCHAR(20) DEFAULT 'table', -- table, list
  price_position VARCHAR(20) DEFAULT 'right', -- right, left
  
  -- إعدادات متقدمة
  custom_css TEXT,
  tax_label VARCHAR(50) DEFAULT 'الضريبة',
  currency_symbol VARCHAR(10) DEFAULT 'دج',
  currency_position VARCHAR(10) DEFAULT 'after', -- before, after
  
  -- إعدادات الأمان والصلاحيات
  allow_price_edit BOOLEAN DEFAULT false,
  require_manager_approval BOOLEAN DEFAULT false,
  
  -- معلومات إضافية
  business_license VARCHAR(100),
  tax_number VARCHAR(100),
  
  -- طوابع زمنية
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- قيود فريدة
  CONSTRAINT unique_org_pos_settings UNIQUE (organization_id)
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_pos_settings_organization_id ON pos_settings(organization_id);

-- إنشاء دالة لتحديث وقت التعديل تلقائياً
CREATE OR REPLACE FUNCTION update_pos_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء محفز لتحديث وقت التعديل تلقائياً
DROP TRIGGER IF EXISTS trigger_update_pos_settings_updated_at ON pos_settings;
CREATE TRIGGER trigger_update_pos_settings_updated_at
BEFORE UPDATE ON pos_settings
FOR EACH ROW
EXECUTE FUNCTION update_pos_settings_updated_at();

-- تمكين سياسة الأمان (RLS)
ALTER TABLE pos_settings ENABLE ROW LEVEL SECURITY;

-- حذف أي سياسات موجودة لتجنب التكرار
DROP POLICY IF EXISTS read_pos_settings ON pos_settings;
DROP POLICY IF EXISTS insert_pos_settings ON pos_settings;
DROP POLICY IF EXISTS update_pos_settings ON pos_settings;
DROP POLICY IF EXISTS delete_pos_settings ON pos_settings;
DROP POLICY IF EXISTS super_admin_pos_settings ON pos_settings;

-- سياسة للقراءة - يمكن لأي مستخدم في المؤسسة قراءة الإعدادات
CREATE POLICY read_pos_settings ON pos_settings
  FOR SELECT
  USING (auth.uid() IN (
    SELECT u.id FROM users u WHERE u.organization_id = pos_settings.organization_id
  ));

-- سياسة للإنشاء - فقط مديرو المؤسسة أو من لديهم صلاحية managePOSSettings
CREATE POLICY insert_pos_settings ON pos_settings
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT u.id FROM users u 
    WHERE u.organization_id = pos_settings.organization_id 
    AND (u.is_org_admin = true OR u.permissions->>'managePOSSettings' = 'true')
  ));

-- سياسة للتحديث - فقط مديرو المؤسسة أو من لديهم صلاحية managePOSSettings
CREATE POLICY update_pos_settings ON pos_settings
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT u.id FROM users u 
    WHERE u.organization_id = pos_settings.organization_id
    AND (u.is_org_admin = true OR u.permissions->>'managePOSSettings' = 'true')
  ));

-- سياسة للحذف - فقط مديرو المؤسسة أو من لديهم صلاحية managePOSSettings
CREATE POLICY delete_pos_settings ON pos_settings
  FOR DELETE
  USING (auth.uid() IN (
    SELECT u.id FROM users u 
    WHERE u.organization_id = pos_settings.organization_id
    AND (u.is_org_admin = true OR u.permissions->>'managePOSSettings' = 'true')
  ));

-- سياسة للمدير الأعلى (Super Admin)
CREATE POLICY super_admin_pos_settings ON pos_settings
  FOR ALL
  USING (auth.uid() IN (
    SELECT u.id FROM users u WHERE u.is_super_admin = true
  ));

-- === وظائف RPC لإدارة إعدادات نقطة البيع ===

-- الحصول على إعدادات نقطة البيع لمؤسسة معينة
CREATE OR REPLACE FUNCTION get_pos_settings(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  store_name VARCHAR(255),
  store_phone VARCHAR(50),
  store_email VARCHAR(100),
  store_address TEXT,
  store_website VARCHAR(255),
  store_logo_url TEXT,
  receipt_header_text TEXT,
  receipt_footer_text TEXT,
  welcome_message TEXT,
  show_qr_code BOOLEAN,
  show_tracking_code BOOLEAN,
  show_customer_info BOOLEAN,
  show_store_logo BOOLEAN,
  show_store_info BOOLEAN,
  show_date_time BOOLEAN,
  show_employee_name BOOLEAN,
  paper_width INTEGER,
  font_size INTEGER,
  line_spacing DECIMAL(2,1),
  print_density VARCHAR(20),
  auto_cut BOOLEAN,
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  text_color VARCHAR(7),
  background_color VARCHAR(7),
  receipt_template VARCHAR(50),
  header_style VARCHAR(20),
  footer_style VARCHAR(20),
  item_display_style VARCHAR(20),
  price_position VARCHAR(20),
  custom_css TEXT,
  tax_label VARCHAR(50),
  currency_symbol VARCHAR(10),
  currency_position VARCHAR(10),
  allow_price_edit BOOLEAN,
  require_manager_approval BOOLEAN,
  business_license VARCHAR(100),
  tax_number VARCHAR(100),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
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
    RAISE EXCEPTION 'غير مصرح لك بالوصول إلى إعدادات هذه المؤسسة';
  END IF;

  RETURN QUERY
  SELECT 
    ps.id,
    ps.organization_id,
    ps.store_name,
    ps.store_phone,
    ps.store_email,
    ps.store_address,
    ps.store_website,
    ps.store_logo_url,
    ps.receipt_header_text,
    ps.receipt_footer_text,
    ps.welcome_message,
    ps.show_qr_code,
    ps.show_tracking_code,
    ps.show_customer_info,
    ps.show_store_logo,
    ps.show_store_info,
    ps.show_date_time,
    ps.show_employee_name,
    ps.paper_width,
    ps.font_size,
    ps.line_spacing,
    ps.print_density,
    ps.auto_cut,
    ps.primary_color,
    ps.secondary_color,
    ps.text_color,
    ps.background_color,
    ps.receipt_template,
    ps.header_style,
    ps.footer_style,
    ps.item_display_style,
    ps.price_position,
    ps.custom_css,
    ps.tax_label,
    ps.currency_symbol,
    ps.currency_position,
    ps.allow_price_edit,
    ps.require_manager_approval,
    ps.business_license,
    ps.tax_number,
    ps.created_at,
    ps.updated_at
  FROM 
    pos_settings ps
  WHERE 
    ps.organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حفظ أو تحديث إعدادات نقطة البيع
CREATE OR REPLACE FUNCTION upsert_pos_settings(
  p_organization_id UUID,
  p_settings JSONB
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
    COALESCE(u.permissions->>'managePOSSettings' = 'true', false)
  INTO 
    v_user_org_id,
    v_is_admin,
    v_has_permission
  FROM 
    users u
  WHERE 
    u.id = auth.uid();
  
  IF v_user_org_id IS NULL OR (v_user_org_id != p_organization_id AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'غير مصرح لك بتعديل إعدادات هذه المؤسسة';
  END IF;
  
  IF NOT (v_is_admin OR v_has_permission) THEN
    RAISE EXCEPTION 'يجب أن تكون مديراً أو تملك صلاحيات إدارة إعدادات نقطة البيع';
  END IF;

  -- إدراج أو تحديث الإعدادات
  INSERT INTO pos_settings (
    organization_id,
    store_name,
    store_phone,
    store_email,
    store_address,
    store_website,
    store_logo_url,
    receipt_header_text,
    receipt_footer_text,
    welcome_message,
    show_qr_code,
    show_tracking_code,
    show_customer_info,
    show_store_logo,
    show_store_info,
    show_date_time,
    show_employee_name,
    paper_width,
    font_size,
    line_spacing,
    print_density,
    auto_cut,
    primary_color,
    secondary_color,
    text_color,
    background_color,
    receipt_template,
    header_style,
    footer_style,
    item_display_style,
    price_position,
    custom_css,
    tax_label,
    currency_symbol,
    currency_position,
    allow_price_edit,
    require_manager_approval,
    business_license,
    tax_number
  ) VALUES (
    p_organization_id,
    COALESCE(p_settings->>'store_name', 'المتجر'),
    p_settings->>'store_phone',
    p_settings->>'store_email',
    p_settings->>'store_address',
    p_settings->>'store_website',
    p_settings->>'store_logo_url',
    COALESCE(p_settings->>'receipt_header_text', 'شكراً لتعاملكم معنا'),
    COALESCE(p_settings->>'receipt_footer_text', 'نتطلع لخدمتكم مرة أخرى'),
    COALESCE(p_settings->>'welcome_message', 'أهلاً وسهلاً بكم'),
    COALESCE((p_settings->>'show_qr_code')::BOOLEAN, true),
    COALESCE((p_settings->>'show_tracking_code')::BOOLEAN, true),
    COALESCE((p_settings->>'show_customer_info')::BOOLEAN, true),
    COALESCE((p_settings->>'show_store_logo')::BOOLEAN, true),
    COALESCE((p_settings->>'show_store_info')::BOOLEAN, true),
    COALESCE((p_settings->>'show_date_time')::BOOLEAN, true),
    COALESCE((p_settings->>'show_employee_name')::BOOLEAN, false),
    COALESCE((p_settings->>'paper_width')::INTEGER, 58),
    COALESCE((p_settings->>'font_size')::INTEGER, 10),
    COALESCE((p_settings->>'line_spacing')::DECIMAL(2,1), 1.2),
    COALESCE(p_settings->>'print_density', 'normal'),
    COALESCE((p_settings->>'auto_cut')::BOOLEAN, true),
    COALESCE(p_settings->>'primary_color', '#0099ff'),
    COALESCE(p_settings->>'secondary_color', '#6c757d'),
    COALESCE(p_settings->>'text_color', '#000000'),
    COALESCE(p_settings->>'background_color', '#ffffff'),
    COALESCE(p_settings->>'receipt_template', 'classic'),
    COALESCE(p_settings->>'header_style', 'centered'),
    COALESCE(p_settings->>'footer_style', 'centered'),
    COALESCE(p_settings->>'item_display_style', 'table'),
    COALESCE(p_settings->>'price_position', 'right'),
    p_settings->>'custom_css',
    COALESCE(p_settings->>'tax_label', 'الضريبة'),
    COALESCE(p_settings->>'currency_symbol', 'دج'),
    COALESCE(p_settings->>'currency_position', 'after'),
    COALESCE((p_settings->>'allow_price_edit')::BOOLEAN, false),
    COALESCE((p_settings->>'require_manager_approval')::BOOLEAN, false),
    p_settings->>'business_license',
    p_settings->>'tax_number'
  )
  ON CONFLICT (organization_id) 
  DO UPDATE SET
    store_name = EXCLUDED.store_name,
    store_phone = EXCLUDED.store_phone,
    store_email = EXCLUDED.store_email,
    store_address = EXCLUDED.store_address,
    store_website = EXCLUDED.store_website,
    store_logo_url = EXCLUDED.store_logo_url,
    receipt_header_text = EXCLUDED.receipt_header_text,
    receipt_footer_text = EXCLUDED.receipt_footer_text,
    welcome_message = EXCLUDED.welcome_message,
    show_qr_code = EXCLUDED.show_qr_code,
    show_tracking_code = EXCLUDED.show_tracking_code,
    show_customer_info = EXCLUDED.show_customer_info,
    show_store_logo = EXCLUDED.show_store_logo,
    show_store_info = EXCLUDED.show_store_info,
    show_date_time = EXCLUDED.show_date_time,
    show_employee_name = EXCLUDED.show_employee_name,
    paper_width = EXCLUDED.paper_width,
    font_size = EXCLUDED.font_size,
    line_spacing = EXCLUDED.line_spacing,
    print_density = EXCLUDED.print_density,
    auto_cut = EXCLUDED.auto_cut,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    text_color = EXCLUDED.text_color,
    background_color = EXCLUDED.background_color,
    receipt_template = EXCLUDED.receipt_template,
    header_style = EXCLUDED.header_style,
    footer_style = EXCLUDED.footer_style,
    item_display_style = EXCLUDED.item_display_style,
    price_position = EXCLUDED.price_position,
    custom_css = EXCLUDED.custom_css,
    tax_label = EXCLUDED.tax_label,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_position = EXCLUDED.currency_position,
    allow_price_edit = EXCLUDED.allow_price_edit,
    require_manager_approval = EXCLUDED.require_manager_approval,
    business_license = EXCLUDED.business_license,
    tax_number = EXCLUDED.tax_number,
    updated_at = NOW()
  RETURNING id INTO v_result_id;
  
  RETURN v_result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء إعدادات افتراضية لمؤسسة جديدة
CREATE OR REPLACE FUNCTION initialize_pos_settings(p_organization_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_org_name VARCHAR(255);
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
    RAISE EXCEPTION 'غير مصرح لك بإعداد نقطة البيع لهذه المؤسسة';
  END IF;
  
  -- الحصول على اسم المؤسسة
  SELECT name INTO v_org_name FROM organizations WHERE id = p_organization_id;

  -- إنشاء إعدادات افتراضية
  INSERT INTO pos_settings (
    organization_id,
    store_name,
    receipt_header_text,
    receipt_footer_text,
    welcome_message
  ) VALUES (
    p_organization_id,
    COALESCE(v_org_name, 'المتجر'),
    'شكراً لتعاملكم معنا',
    'نتطلع لخدمتكم مرة أخرى • ' || COALESCE(v_org_name, 'المتجر'),
    'أهلاً وسهلاً بكم في ' || COALESCE(v_org_name, 'المتجر')
  ) ON CONFLICT (organization_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة تعليقات للجدول والوظائف
COMMENT ON TABLE pos_settings IS 'جدول إعدادات نقطة البيع لكل مؤسسة';
COMMENT ON FUNCTION get_pos_settings IS 'الحصول على إعدادات نقطة البيع لمؤسسة معينة';
COMMENT ON FUNCTION upsert_pos_settings IS 'حفظ أو تحديث إعدادات نقطة البيع';
COMMENT ON FUNCTION initialize_pos_settings IS 'إنشاء إعدادات افتراضية لنقطة البيع'; 