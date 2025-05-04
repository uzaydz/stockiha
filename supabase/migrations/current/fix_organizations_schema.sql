-- تحديث هيكل جدول المنظمات

-- إضافة حقل subdomain إذا لم يكن موجودًا
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations' 
    AND column_name = 'subdomain'
  ) THEN
    ALTER TABLE organizations ADD COLUMN subdomain TEXT;
    -- إضافة مؤشر للنطاق الفرعي
    CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_subdomain ON organizations(subdomain);
  END IF;
  
  -- إضافة حقل owner_id إذا لم يكن موجودًا
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations' 
    AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN owner_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- تعطيل RLS مؤقتًا للمنظمات لتسهيل عمليات التسجيل
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- تحديث السياسات
DROP POLICY IF EXISTS "organizations_select_policy" ON organizations;
DROP POLICY IF EXISTS "org_tenant_organizations_select" ON organizations;

-- إنشاء سياسات جديدة
CREATE POLICY "organizations_select_policy" ON organizations
  FOR SELECT
  USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- منح صلاحيات
GRANT SELECT, INSERT, UPDATE ON organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON organizations TO service_role; 