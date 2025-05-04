-- إصلاح القيود الفريدة في جدول المنظمات
-- الهدف: معالجة الخطأ "there is no unique or exclusion constraint matching the ON CONFLICT specification"

-- حذف القيود القديمة إذا كانت موجودة
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subdomain_key;
DROP INDEX IF EXISTS idx_organizations_subdomain;
DROP INDEX IF EXISTS organizations_subdomain_idx;

-- التأكد من أن عمود subdomain غير فارغ قبل إضافة القيد الفريد
UPDATE organizations 
SET subdomain = CONCAT('org-', id) 
WHERE subdomain IS NULL OR subdomain = '';

-- إضافة قيد فريد لعمود subdomain
ALTER TABLE organizations ADD CONSTRAINT organizations_subdomain_key UNIQUE (subdomain);

-- إنشاء قيد فريد للاسم والنطاق الفرعي معًا (للسماح بأسماء مكررة طالما النطاق الفرعي فريد)
ALTER TABLE organizations ADD CONSTRAINT organizations_name_subdomain_key UNIQUE (name, subdomain);

-- إضافة قيد فريد إضافي لمعرف المالك (إذا كان مطلوباً في تطبيقك)
ALTER TABLE organizations ADD CONSTRAINT organizations_owner_id_key UNIQUE (owner_id);

-- حذف الدالة الموجودة أولاً لتجنب خطأ تغيير أسماء الوسطاء
DROP FUNCTION IF EXISTS create_organization(text, text, text, text);

-- تحديث وظيفة إنشاء المنظمة بتغيير الاسم لتجنب التعارض
CREATE OR REPLACE FUNCTION create_organization_fixed(
  org_name TEXT,
  org_description TEXT DEFAULT NULL,
  org_domain TEXT DEFAULT NULL,
  org_subdomain TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- التحقق من وجود النطاق الفرعي أولًا
  SELECT id INTO org_id FROM organizations WHERE subdomain = org_subdomain;
  
  -- إذا كان موجودًا، أعد معرفه
  IF org_id IS NOT NULL THEN
    RETURN org_id;
  END IF;
  
  -- إذا لم يكن موجودًا، أدرج منظمة جديدة
  INSERT INTO organizations (name, description, domain, subdomain, owner_id)
  VALUES (org_name, org_description, org_domain, org_subdomain, auth.uid())
  RETURNING id INTO org_id;
  
  RETURN org_id;
END;
$$;

-- منح الصلاحيات المناسبة
GRANT SELECT, INSERT, UPDATE ON organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON organizations TO service_role;
GRANT EXECUTE ON FUNCTION create_organization_fixed TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_fixed TO service_role;
