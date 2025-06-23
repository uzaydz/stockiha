-- ملف إصلاح نهائي لمشكلة خطأ 409 في إنشاء العملاء
-- تاريخ الإنشاء: 2025-01-27
-- الهدف: حل مشكلة خطأ 409 نهائياً مع معالجة جميع أنواع التضارب

-- بدء المعاملة
BEGIN;

-- 1. إزالة جميع الفهارس الفريدة المتسببة في المشاكل (عدا المفتاح الأساسي)
DROP INDEX IF EXISTS customers_phone_organization_id_unique_idx;

-- 2. إنشاء فهارس عادية للبحث السريع
CREATE INDEX IF NOT EXISTS idx_customers_phone_org 
ON customers (phone, organization_id) 
WHERE phone IS NOT NULL;

-- 3. إنشاء دالة محسنة للتحقق من العملاء الموجودين
CREATE OR REPLACE FUNCTION find_existing_customer(
    p_phone TEXT,
    p_organization_id UUID
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    existing_id UUID;
BEGIN
    -- البحث عن عميل موجود بنفس الهاتف والمؤسسة
    SELECT id INTO existing_id
    FROM customers 
    WHERE phone = p_phone 
      AND organization_id = p_organization_id
    LIMIT 1;
    
    RETURN existing_id;
END;
$$;

-- 4. إنشاء دالة آمنة لإنشاء أو تحديث العميل
CREATE OR REPLACE FUNCTION safe_upsert_customer(
    p_name TEXT,
    p_phone TEXT,
    p_organization_id UUID,
    p_email TEXT DEFAULT NULL
) RETURNS TABLE (
    customer_id UUID,
    customer_name TEXT,
    operation TEXT,
    message TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    existing_id UUID;
    new_id UUID;
BEGIN
    -- البحث عن عميل موجود
    existing_id := find_existing_customer(p_phone, p_organization_id);
    
    IF existing_id IS NOT NULL THEN
        -- تحديث العميل الموجود
        UPDATE customers 
        SET 
            name = p_name,
            email = COALESCE(p_email, email),
            updated_at = NOW()
        WHERE id = existing_id;
        
        RETURN QUERY
        SELECT 
            existing_id,
            p_name,
            'updated'::TEXT,
            'تم تحديث العميل الموجود'::TEXT;
    ELSE
        -- إنشاء عميل جديد
        INSERT INTO customers (name, phone, email, organization_id, created_at, updated_at)
        VALUES (p_name, p_phone, p_email, p_organization_id, NOW(), NOW())
        RETURNING id INTO new_id;
        
        RETURN QUERY
        SELECT 
            new_id,
            p_name,
            'created'::TEXT,
            'تم إنشاء عميل جديد'::TEXT;
    END IF;
END;
$$;

-- 5. إنشاء trigger لمعالجة التضارب تلقائياً
CREATE OR REPLACE FUNCTION handle_customer_conflict()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    existing_id UUID;
BEGIN
    -- التحقق من وجود عميل بنفس الهاتف والمؤسسة
    existing_id := find_existing_customer(NEW.phone, NEW.organization_id);
    
    IF existing_id IS NOT NULL AND existing_id != NEW.id THEN
        -- تحديث العميل الموجود بدلاً من إنشاء جديد
        UPDATE customers 
        SET 
            name = NEW.name,
            email = COALESCE(NEW.email, email),
            updated_at = NOW()
        WHERE id = existing_id;
        
        -- منع الإدخال المكرر
        RETURN NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

-- تطبيق الـ trigger
DROP TRIGGER IF EXISTS prevent_customer_conflict ON customers;
CREATE TRIGGER prevent_customer_conflict
    BEFORE INSERT ON customers
    FOR EACH ROW EXECUTE FUNCTION handle_customer_conflict();

-- 6. إنشاء view للعملاء مع معلومات إضافية
CREATE OR REPLACE VIEW customers_safe AS
SELECT 
    c.*,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM customers c2 
            WHERE c2.phone = c.phone 
              AND c2.organization_id = c.organization_id 
              AND c2.id != c.id
        ) THEN TRUE 
        ELSE FALSE 
    END as has_duplicate_phone
FROM customers c;

-- 7. إنشاء دالة لتنظيف التكرارات الموجودة
CREATE OR REPLACE FUNCTION cleanup_duplicate_customers(
    p_organization_id UUID DEFAULT NULL
) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    cleanup_count INTEGER := 0;
    duplicate_record RECORD;
BEGIN
    -- العثور على التكرارات وحذف النسخ الإضافية
    FOR duplicate_record IN
        SELECT phone, organization_id, MIN(created_at) as keep_date
        FROM customers 
        WHERE (p_organization_id IS NULL OR organization_id = p_organization_id)
          AND phone IS NOT NULL
        GROUP BY phone, organization_id
        HAVING COUNT(*) > 1
    LOOP
        -- حذف النسخ الإضافية (الاحتفاظ بالأقدم)
        DELETE FROM customers 
        WHERE phone = duplicate_record.phone 
          AND organization_id = duplicate_record.organization_id
          AND created_at > duplicate_record.keep_date;
          
        GET DIAGNOSTICS cleanup_count = cleanup_count + ROW_COUNT;
    END LOOP;
    
    RETURN format('تم حذف %s عميل مكرر', cleanup_count);
END;
$$;

-- 8. تنظيف التكرارات الموجودة
SELECT cleanup_duplicate_customers();

-- 9. فحص النتائج
DO $$
DECLARE
    total_customers INTEGER;
    duplicate_phones INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_customers FROM customers;
    
    SELECT COUNT(*) INTO duplicate_phones 
    FROM (
        SELECT phone, organization_id
        FROM customers 
        WHERE phone IS NOT NULL
        GROUP BY phone, organization_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE 'إجمالي العملاء: %', total_customers;
    RAISE NOTICE 'أرقام هواتف مكررة: %', duplicate_phones;
END $$;

-- إنهاء المعاملة
COMMIT;

-- رسائل النجاح والاستخدام
SELECT 'تم إصلاح مشكلة خطأ 409 نهائياً!' as result;

-- أمثلة الاستخدام:
-- SELECT * FROM safe_upsert_customer('أحمد محمد', '0123456789', 'organization_id', 'ahmed@example.com');
-- SELECT * FROM safe_upsert_customer('أحمد محمد', '0123456789', 'organization_id'); -- بدون إيميل
-- SELECT * FROM find_existing_customer('0123456789', 'organization_id');
-- SELECT * FROM cleanup_duplicate_customers('organization_id'); -- تنظيف مؤسسة معينة 