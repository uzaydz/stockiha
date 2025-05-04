-- add_subdomain_unique_constraint.sql
-- هجرة لإضافة قيد فريد على حقل subdomain في جدول organizations

-- إنشاء فهرس فريد على حقل subdomain
-- سنقوم أولاً بالتحقق من وجود الفهرس لتجنب الأخطاء إذا كان موجوداً بالفعل

DO $$
BEGIN
    -- التحقق مما إذا كان الفهرس الفريد موجوداً بالفعل
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'organizations_subdomain_unique'
    ) THEN
        -- إنشاء القيد الفريد إذا لم يكن موجوداً
        EXECUTE 'ALTER TABLE organizations ADD CONSTRAINT organizations_subdomain_unique UNIQUE (subdomain)';
        RAISE NOTICE 'تم إنشاء قيد فريد على حقل subdomain في جدول organizations';
    ELSE
        RAISE NOTICE 'القيد الفريد على حقل subdomain موجود بالفعل';
    END IF;
END
$$;

-- إضافة تعليق (comment) على القيد للتوثيق
COMMENT ON CONSTRAINT organizations_subdomain_unique ON organizations IS 'يضمن فرادة النطاق الفرعي لكل مؤسسة';

-- تحديث الوظيفة المسؤولة عن تدقيق المؤسسة (إذا كانت موجودة)
DO $$
BEGIN
    -- التحقق من وجود الوظيفة (function) أولاً
    IF EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'validate_organization'
    ) THEN
        -- تحديث الوظيفة إذا كانت موجودة
        CREATE OR REPLACE FUNCTION validate_organization()
        RETURNS TRIGGER AS $FUNC$
        BEGIN
            -- تحقق من صحة النطاق الفرعي
            IF NEW.subdomain IS NOT NULL AND LENGTH(TRIM(NEW.subdomain)) < 3 THEN
                RAISE EXCEPTION 'النطاق الفرعي يجب أن يكون على الأقل 3 أحرف';
            END IF;

            -- التحقق من عدم وجود أحرف خاصة في النطاق الفرعي
            IF NEW.subdomain IS NOT NULL AND NEW.subdomain !~ '^[a-z0-9-]+$' THEN
                RAISE EXCEPTION 'النطاق الفرعي يجب أن يحتوي فقط على أحرف صغيرة وأرقام وشرطات';
            END IF;

            RETURN NEW;
        END;
        $FUNC$ LANGUAGE plpgsql;

        RAISE NOTICE 'تم تحديث وظيفة تدقيق المؤسسة';
    END IF;
END
$$; 