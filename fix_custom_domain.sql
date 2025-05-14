-- ملف SQL لضمان فرادة النطاقات الأساسية للمنظمات

-- إضافة تعليق على حقل domain
COMMENT ON COLUMN organizations.domain IS 'النطاق الأساسي المخصص للمنظمة (بدون بروتوكول) مثل example.com';

-- إضافة قيد فريد على حقل domain
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'organizations_domain_unique'
    ) THEN
        -- إنشاء القيد الفريد إذا لم يكن موجوداً
        ALTER TABLE organizations ADD CONSTRAINT organizations_domain_unique UNIQUE (domain);
        RAISE NOTICE 'تم إنشاء قيد فريد على حقل domain في جدول organizations';
    ELSE
        RAISE NOTICE 'القيد الفريد على حقل domain موجود بالفعل';
    END IF;
END
$$;

-- تحديث وظيفة التحقق من المنظمة للتأكد من صحة النطاق
CREATE OR REPLACE FUNCTION validate_organization_domain()
RETURNS TRIGGER AS $$
BEGIN
    -- تحقق من صحة النطاق إذا كان موجوداً
    IF NEW.domain IS NOT NULL AND LENGTH(TRIM(NEW.domain)) > 0 THEN
        -- التحقق من تنسيق النطاق
        IF NEW.domain !~ '^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$' THEN
            RAISE EXCEPTION 'تنسيق النطاق غير صالح. يجب أن يكون مثل: example.com';
        END IF;
        
        -- التأكد من عدم وجود http/https في بداية النطاق
        IF NEW.domain ~* '^https?://' THEN
            NEW.domain := regexp_replace(NEW.domain, '^https?://', '', 'i');
        END IF;
        
        -- التأكد من عدم وجود / في نهاية النطاق
        IF NEW.domain ~ '/$' THEN
            NEW.domain := rtrim(NEW.domain, '/');
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مشغل لتطبيق الوظيفة عند إنشاء أو تحديث المنظمات
DROP TRIGGER IF EXISTS validate_organization_domain_trigger ON organizations;
CREATE TRIGGER validate_organization_domain_trigger
BEFORE INSERT OR UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION validate_organization_domain();

-- التأكد من تطبيق الصلاحيات المناسبة
GRANT EXECUTE ON FUNCTION validate_organization_domain() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_organization_domain() TO service_role;

-- إضافة وظائف للتعامل مع التحقق من النطاقات المخصصة

-- التحقق من وجود جدول domain_verifications وإنشائه إذا لم يكن موجودًا
CREATE OR REPLACE FUNCTION create_domain_verifications_table()
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'domain_verifications') THEN
    CREATE TABLE public.domain_verifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
      domain TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      verification_code TEXT,
      verification_data JSONB,
      verified_at TIMESTAMPTZ,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_checked TIMESTAMPTZ,
      verification_message TEXT,
      UNIQUE (organization_id, domain)
    );
    
    -- إضافة تصريح للوصول إلى الجدول
    ALTER TABLE public.domain_verifications ENABLE ROW LEVEL SECURITY;
    
    -- إضافة سياسة الأمان للقراءة
    CREATE POLICY "Users can read domain verifications for their organization" 
      ON public.domain_verifications FOR SELECT
      USING (auth.uid() IN (
        SELECT id FROM public.users 
        WHERE organization_id = domain_verifications.organization_id
      ));
      
    -- إضافة سياسة الأمان للتعديل
    CREATE POLICY "Admins can modify domain verifications for their organization" 
      ON public.domain_verifications FOR ALL
      USING (auth.uid() IN (
        SELECT id FROM public.users 
        WHERE organization_id = domain_verifications.organization_id
        AND is_admin = TRUE
      ));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- تنفيذ التحقق من وجود الجدول
SELECT create_domain_verifications_table();

-- إنشاء أو تحديث سجل تحقق من النطاق
CREATE OR REPLACE FUNCTION upsert_domain_verification(
  p_organization_id UUID,
  p_domain TEXT,
  p_status TEXT DEFAULT 'pending',
  p_verification_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  now_time TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO public.domain_verifications (
    organization_id,
    domain,
    status,
    verification_data,
    created_at,
    updated_at
  ) VALUES (
    p_organization_id,
    p_domain,
    p_status,
    p_verification_data,
    now_time,
    now_time
  )
  ON CONFLICT (organization_id, domain) 
  DO UPDATE SET
    status = p_status,
    verification_data = p_verification_data,
    updated_at = now_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف سجل تحقق من النطاق
CREATE OR REPLACE FUNCTION delete_domain_verification(
  p_organization_id UUID,
  p_domain TEXT
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.domain_verifications
  WHERE organization_id = p_organization_id
  AND domain = p_domain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث حالة التحقق من النطاق
CREATE OR REPLACE FUNCTION update_domain_verification_status(
  p_organization_id UUID,
  p_domain TEXT,
  p_status TEXT,
  p_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  now_time TIMESTAMPTZ := NOW();
BEGIN
  UPDATE public.domain_verifications
  SET 
    status = p_status,
    verification_message = p_message,
    last_checked = now_time,
    updated_at = now_time,
    verified_at = CASE WHEN p_status IN ('active', 'verified') THEN now_time ELSE verified_at END
  WHERE 
    organization_id = p_organization_id
    AND domain = p_domain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 