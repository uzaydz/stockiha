-- ملف إصلاح خطأ 409 (Conflict) في إنشاء العملاء
-- تاريخ الإنشاء: 2025-01-27
-- المشكلة: الفهرس الفريد على (phone, organization_id) يمنع إنشاء عملاء بنفس رقم الهاتف

-- بدء المعاملة
BEGIN;

-- 1. فحص الفهارس الفريدة الحالية
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'customers' 
  AND schemaname = 'public' 
  AND indexdef LIKE '%UNIQUE%';

-- 2. إزالة الفهرس الفريد المتسبب في المشكلة (إذا كان موجوداً)
DROP INDEX IF EXISTS customers_phone_organization_id_unique_idx;

-- 3. إنشاء فهرس عادي بدلاً من الفريد للبحث السريع
CREATE INDEX IF NOT EXISTS idx_customers_phone_org 
ON customers (phone, organization_id) 
WHERE phone IS NOT NULL;

-- 4. إنشاء دالة للتحقق من تكرار العملاء قبل الإدخال (اختيارية)
CREATE OR REPLACE FUNCTION check_duplicate_customer(
    p_phone TEXT,
    p_organization_id UUID
) RETURNS TABLE (
    customer_exists BOOLEAN,
    customer_id UUID,
    customer_name TEXT,
    message TEXT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE WHEN c.id IS NOT NULL THEN TRUE ELSE FALSE END as customer_exists,
        c.id as customer_id,
        c.name as customer_name,
        CASE 
            WHEN c.id IS NOT NULL THEN 
                format('عميل موجود بالفعل: %s - %s', c.name, c.phone)
            ELSE 
                'لا يوجد عميل مطابق'
        END as message
    FROM customers c
    WHERE c.phone = p_phone 
      AND c.organization_id = p_organization_id
    LIMIT 1;
END;
$$;

-- 5. إنشاء دالة آمنة لإنشاء أو تحديث العميل
CREATE OR REPLACE FUNCTION upsert_customer(
    p_name TEXT,
    p_phone TEXT,
    p_organization_id UUID,
    p_email TEXT DEFAULT NULL
) RETURNS TABLE (
    customer_id UUID,
    customer_name TEXT,
    is_new BOOLEAN,
    message TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    existing_customer customers%ROWTYPE;
    new_customer_id UUID;
BEGIN
    -- البحث عن عميل موجود
    SELECT * INTO existing_customer
    FROM customers c
    WHERE c.phone = p_phone 
      AND c.organization_id = p_organization_id
    LIMIT 1;
    
    IF existing_customer.id IS NOT NULL THEN
        -- تحديث العميل الموجود
        UPDATE customers 
        SET 
            name = p_name,
            email = COALESCE(p_email, email),
            updated_at = NOW()
        WHERE id = existing_customer.id;
        
        RETURN QUERY
        SELECT 
            existing_customer.id,
            p_name,
            FALSE as is_new,
            'تم تحديث العميل الموجود' as message;
    ELSE
        -- إنشاء عميل جديد
        INSERT INTO customers (name, phone, email, organization_id, created_at, updated_at)
        VALUES (p_name, p_phone, p_email, p_organization_id, NOW(), NOW())
        RETURNING id INTO new_customer_id;
        
        RETURN QUERY
        SELECT 
            new_customer_id,
            p_name,
            TRUE as is_new,
            'تم إنشاء عميل جديد' as message;
    END IF;
END;
$$;

-- 6. إنشاء trigger لمنع التكرارات (اختياري - للحماية الإضافية)
CREATE OR REPLACE FUNCTION prevent_duplicate_phone_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- التحقق من وجود رقم هاتف مطابق في نفس المؤسسة
    IF EXISTS (
        SELECT 1 FROM customers 
        WHERE phone = NEW.phone 
          AND organization_id = NEW.organization_id 
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        -- بدلاً من رفع خطأ، يمكننا تحديث السجل الموجود
        UPDATE customers 
        SET 
            name = NEW.name,
            email = COALESCE(NEW.email, email),
            updated_at = NOW()
        WHERE phone = NEW.phone AND organization_id = NEW.organization_id;
        
        -- إرجاع NULL لمنع الإدخال المكرر
        RETURN NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

-- تطبيق الـ trigger (اختياري - قم بإلغاء التعليق إذا كنت تريد الحماية الإضافية)
-- DROP TRIGGER IF EXISTS prevent_duplicate_phone ON customers;
-- CREATE TRIGGER prevent_duplicate_phone
--     BEFORE INSERT ON customers
--     FOR EACH ROW EXECUTE FUNCTION prevent_duplicate_phone_trigger();

-- 7. إنشاء view لعرض العملاء مع معلومات التكرار
CREATE OR REPLACE VIEW customers_with_duplicates AS
SELECT 
    c.*,
    CASE 
        WHEN dup.phone_count > 1 THEN TRUE 
        ELSE FALSE 
    END as has_duplicate_phone,
    dup.phone_count
FROM customers c
LEFT JOIN (
    SELECT 
        phone, 
        organization_id, 
        COUNT(*) as phone_count
    FROM customers 
    WHERE phone IS NOT NULL
    GROUP BY phone, organization_id
) dup ON c.phone = dup.phone AND c.organization_id = dup.organization_id;

-- 8. فحص البيانات بعد الإصلاح
DO $$
DECLARE
    total_customers INTEGER;
    unique_phones INTEGER;
BEGIN
    -- عد إجمالي العملاء
    SELECT COUNT(*) INTO total_customers FROM customers;
    
    -- عد أرقام الهواتف الفريدة
    SELECT COUNT(DISTINCT phone) INTO unique_phones 
    FROM customers WHERE phone IS NOT NULL;
    
    RAISE NOTICE 'إجمالي العملاء: %', total_customers;
    RAISE NOTICE 'أرقام هواتف فريدة: %', unique_phones;
END $$;

-- إنهاء المعاملة
COMMIT;

-- رسائل الاستخدام
SELECT 'تم إصلاح مشكلة خطأ 409 في إنشاء العملاء!' as result;
SELECT 'يمكنك الآن استخدام دالة upsert_customer() لإنشاء أو تحديث العملاء بأمان' as usage_tip;

-- مثال على الاستخدام:
-- SELECT * FROM upsert_customer('اسم العميل', '0123456789', 'organization_id', 'email@example.com');
-- SELECT * FROM upsert_customer('اسم العميل', '0123456789', 'organization_id'); -- بدون إيميل
-- SELECT * FROM check_duplicate_customer('0123456789', 'organization_id');

-- ملاحظة: تم تغيير اسم العمود من 'exists' إلى 'customer_exists' لتجنب الكلمات المحجوزة
-- ملاحظة: تم ترتيب المعاملات بحيث تكون المعاملات الاختيارية في النهاية 