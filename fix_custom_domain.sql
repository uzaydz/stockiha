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