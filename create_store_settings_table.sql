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

-- إنشاء مؤشر لتسريع البحث
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
CREATE TRIGGER trigger_update_store_settings_updated_at
BEFORE UPDATE ON store_settings
FOR EACH ROW
EXECUTE FUNCTION update_store_settings_updated_at();

-- إضافة تعليق للجدول
COMMENT ON TABLE store_settings IS 'يحتوي هذا الجدول على إعدادات مكونات المتجر التي يمكن تخصيصها';

-- إنشاء سياسة الأمان (RLS)
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة
CREATE POLICY read_store_settings ON store_settings
  FOR SELECT
  USING (auth.uid() IN (
    SELECT organization_id FROM users WHERE organization_id = store_settings.organization_id
  ));

-- سياسة للإنشاء
CREATE POLICY insert_store_settings ON store_settings
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM users WHERE organization_id = store_settings.organization_id
  ));

-- سياسة للتحديث
CREATE POLICY update_store_settings ON store_settings
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM users WHERE organization_id = store_settings.organization_id
  ));

-- سياسة للحذف
CREATE POLICY delete_store_settings ON store_settings
  FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM users WHERE organization_id = store_settings.organization_id
  ));

-- إدراج قيم افتراضية لإعدادات الهيرو
-- نستخدم هذا فقط للاختبار، في الإنتاج سيتم إنشاؤها من خلال واجهة المستخدم
/* تم تعليق هذا الإدراج لأنه يستخدم معرف غير صالح
INSERT INTO store_settings (organization_id, component_type, settings, order_index)
VALUES 
(
  -- استبدل بمعرف المؤسسة الفعلي عند التنفيذ
  'PLACEHOLDER_ORGANIZATION_ID',
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
*/

-- يمكن استخدام الإدراج التالي بعد استبدال قيمة UUID بمعرف مؤسسة صالح
-- INSERT INTO store_settings (organization_id, component_type, settings, order_index)
-- VALUES 
-- (
--   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- معرف مؤسسة صالح (مثال)
--   'hero',
--   '{"title": "أحدث المنتجات", "description": "تسوق أحدث منتجاتنا المختارة بعناية", "imageUrl": "https://example.com/image.jpg"}',
--   1
-- );

-- إنشاء وظيفة RPC للحصول على إعدادات متجر لمؤسسة معينة
CREATE OR REPLACE FUNCTION get_store_settings(p_organization_id UUID)
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
    store_settings.organization_id = p_organization_id
  ORDER BY
    store_settings.order_index ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 