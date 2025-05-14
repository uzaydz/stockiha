-- ملف SQL لإعداد ودعم النطاقات المخصصة في قاعدة البيانات

-- 1. إضافة تعليقات توضيحية على حقول النطاق
COMMENT ON COLUMN organizations.domain IS 'النطاق الرئيسي المخصص للمنظمة مثل example.com';
COMMENT ON COLUMN organizations.subdomain IS 'النطاق الفرعي المستخدم في المنصة الأساسية مثل mystore';

-- 2. إضافة مؤشر فريد على حقل domain في جدول organizations
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

-- 3. إنشاء وظيفة وtriger للتحقق من صحة النطاق قبل الإدخال أو التحديث
CREATE OR REPLACE FUNCTION validate_domain_format()
RETURNS TRIGGER AS $$
BEGIN
    -- التحقق فقط إذا كان النطاق غير فارغ
    IF NEW.domain IS NOT NULL AND NEW.domain != '' THEN
        -- التحقق من صحة تنسيق النطاق باستخدام regex
        IF NEW.domain !~ '^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$' THEN
            RAISE EXCEPTION 'تنسيق النطاق غير صالح: %', NEW.domain;
        END IF;
        
        -- تحويل النطاق إلى أحرف صغيرة للتوحيد
        NEW.domain := lower(NEW.domain);
        
        -- إزالة أي www. من بداية النطاق للتوحيد
        IF NEW.domain LIKE 'www.%' THEN
            NEW.domain := substring(NEW.domain from 5);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. إنشاء Trigger لاستدعاء وظيفة التحقق من صحة النطاق
DO $$
BEGIN
    -- إزالة المشغل القديم إذا كان موجوداً
    DROP TRIGGER IF EXISTS validate_domain_before_upsert ON organizations;
    
    -- إنشاء المشغل الجديد
    CREATE TRIGGER validate_domain_before_upsert
    BEFORE INSERT OR UPDATE OF domain
    ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION validate_domain_format();
    
    RAISE NOTICE 'تم إنشاء المشغل للتحقق من صحة تنسيق النطاق';
END
$$;

-- 5. إنشاء جدول لتتبع حالات التحقق من النطاقات
CREATE TABLE IF NOT EXISTS domain_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    verification_code VARCHAR(100),
    verified_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(organization_id, domain)
);

COMMENT ON TABLE domain_verifications IS 'جدول لتتبع حالة التحقق من النطاقات المخصصة للمنظمات';
COMMENT ON COLUMN domain_verifications.status IS 'حالة التحقق: pending, active, error';

-- 6. إنشاء مؤشر على حقل domain في جدول domain_verifications
CREATE INDEX IF NOT EXISTS idx_domain_verifications_domain ON domain_verifications(domain);

-- 7. إنشاء وظيفة RPC للتحقق من توفر النطاق
CREATE OR REPLACE FUNCTION check_domain_availability(p_domain TEXT, p_organization_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_available BOOLEAN := TRUE;
    v_message TEXT;
    v_clean_domain TEXT;
    v_count INTEGER;
BEGIN
    -- تنظيف النطاق
    v_clean_domain := lower(trim(p_domain));
    
    -- إزالة www. من بداية النطاق
    IF v_clean_domain LIKE 'www.%' THEN
        v_clean_domain := substring(v_clean_domain from 5);
    END IF;
    
    -- التحقق من صحة تنسيق النطاق
    IF v_clean_domain !~ '^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$' THEN
        RETURN jsonb_build_object(
            'available', FALSE,
            'message', 'تنسيق النطاق غير صالح'
        );
    END IF;
    
    -- البحث عن النطاق في جدول المنظمات
    IF p_organization_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM organizations
        WHERE domain = v_clean_domain
        AND id != p_organization_id;
    ELSE
        SELECT COUNT(*) INTO v_count
        FROM organizations
        WHERE domain = v_clean_domain;
    END IF;
    
    IF v_count > 0 THEN
        v_available := FALSE;
        v_message := 'هذا النطاق مستخدم بالفعل من قبل متجر آخر';
    END IF;
    
    RETURN jsonb_build_object(
        'available', v_available,
        'message', v_message,
        'domain', v_clean_domain
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 