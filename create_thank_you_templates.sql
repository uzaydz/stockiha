-- إنشاء جدول قوالب صفحة الشكر
CREATE TABLE IF NOT EXISTS thank_you_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  layout_type TEXT NOT NULL CHECK (layout_type IN ('standard', 'minimalist', 'elegant', 'colorful')),
  color_scheme TEXT NOT NULL CHECK (color_scheme IN ('primary', 'success', 'info', 'custom')),
  custom_colors JSONB,
  content JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('all_products', 'specific_products')),
  product_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إنشاء الفهارس للبحث السريع
CREATE INDEX thank_you_templates_organization_id_idx ON thank_you_templates(organization_id);
CREATE INDEX thank_you_templates_is_active_idx ON thank_you_templates(is_active);
CREATE INDEX thank_you_templates_is_default_idx ON thank_you_templates(is_default);
CREATE INDEX thank_you_templates_product_ids_idx ON thank_you_templates USING GIN(product_ids);

-- تحديث المحدث التلقائي للتاريخ
CREATE OR REPLACE FUNCTION update_thank_you_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thank_you_templates_updated_at
BEFORE UPDATE ON thank_you_templates
FOR EACH ROW
EXECUTE FUNCTION update_thank_you_templates_updated_at();

-- ضمان أن كل مؤسسة لها قالب افتراضي واحد فقط
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا كان القالب الجديد هو الافتراضي، قم بإلغاء تفعيل الافتراضي القديم
  IF NEW.is_default = true THEN
    UPDATE thank_you_templates
    SET is_default = false
    WHERE organization_id = NEW.organization_id 
      AND id != NEW.id 
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_template
BEFORE INSERT OR UPDATE ON thank_you_templates
FOR EACH ROW
EXECUTE FUNCTION ensure_single_default_template();

-- إضافة قالب افتراضي لكل مؤسسة جديدة
CREATE OR REPLACE FUNCTION create_default_thank_you_template()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO thank_you_templates (
    name,
    organization_id,
    layout_type,
    color_scheme,
    content,
    is_active,
    is_default,
    applies_to
  ) VALUES (
    'القالب الافتراضي',
    NEW.id,
    'standard',
    'primary',
    '{
      "header": {
        "title": "شكرًا لطلبك!",
        "subtitle": "تم استلام طلبك بنجاح وسنعمل على معالجته في أقرب وقت"
      },
      "features": {
        "showOrderDetails": true,
        "showShippingDetails": true,
        "showContactSupport": true,
        "showRelatedProducts": false,
        "showSocialSharing": false,
        "showLoyaltyPoints": false,
        "showDiscount": false
      },
      "call_to_action": {
        "primary": {
          "text": "العودة للتسوق",
          "action": "/"
        },
        "secondary": {
          "text": "طباعة معلومات الطلب",
          "action": "print"
        }
      },
      "custom_sections": [],
      "footer_text": "إذا كان لديك أي استفسار، يمكنك التواصل معنا عبر الهاتف أو البريد الإلكتروني"
    }'::jsonb,
    true,
    true,
    'all_products'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_default_thank_you_template
AFTER INSERT ON organizations
FOR EACH ROW
EXECUTE FUNCTION create_default_thank_you_template();

-- دالة للبحث عن قالب مناسب لمنتج
CREATE OR REPLACE FUNCTION get_thank_you_template_for_product(
  p_organization_id UUID,
  p_product_id UUID DEFAULT NULL
)
RETURNS SETOF thank_you_templates 
LANGUAGE plpgsql
AS $$
BEGIN
  -- البحث عن قالب مخصص للمنتج إذا تم تحديد معرف المنتج
  IF p_product_id IS NOT NULL THEN
    RETURN QUERY 
    SELECT * FROM thank_you_templates
    WHERE organization_id = p_organization_id
      AND is_active = true
      AND applies_to = 'specific_products'
      AND p_product_id = ANY(product_ids)
    LIMIT 1;
    
    -- التحقق مما إذا تم العثور على أي قالب
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- إذا لم يتم العثور على قالب مخصص، استخدم القالب الافتراضي
  RETURN QUERY 
  SELECT * FROM thank_you_templates
  WHERE organization_id = p_organization_id
    AND is_active = true
    AND is_default = true
  LIMIT 1;
  
  -- إذا لم يتم العثور على قالب افتراضي، استخدم أي قالب نشط
  IF NOT FOUND THEN
    RETURN QUERY 
    SELECT * FROM thank_you_templates
    WHERE organization_id = p_organization_id
      AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN;
END;
$$;

-- ضبط صلاحيات الوصول لجدول قوالب صفحة الشكر
ALTER TABLE thank_you_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY thank_you_templates_select
  ON thank_you_templates
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE organization_id = thank_you_templates.organization_id
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'superadmin'
    )
  );

CREATE POLICY thank_you_templates_insert
  ON thank_you_templates
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE organization_id = thank_you_templates.organization_id
      AND (users.role = 'admin' OR users.role = 'owner')
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'superadmin'
    )
  );

CREATE POLICY thank_you_templates_update
  ON thank_you_templates
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE organization_id = thank_you_templates.organization_id
      AND (users.role = 'admin' OR users.role = 'owner')
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'superadmin'
    )
  );

CREATE POLICY thank_you_templates_delete
  ON thank_you_templates
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE organization_id = thank_you_templates.organization_id
      AND (users.role = 'admin' OR users.role = 'owner')
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'superadmin'
    )
  ); 