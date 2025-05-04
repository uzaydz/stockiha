-- ملف إصلاح مشكلة إنشاء الطلبات مع قيد المفتاح الأجنبي
-- هذا الملف يحل مشكلة "orders_customer_id_fkey"

-- 1. تأكد من وجود العميل الزائر
INSERT INTO customers (id, name, email, organization_id, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'زائر',
    'guest@example.com',
    (SELECT id FROM organizations LIMIT 1),
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. التأكد من وجود جميع المستخدمين المذكورين في الطلبات في جدول العملاء
INSERT INTO customers (id, name, email, phone, organization_id, created_at, updated_at)
SELECT 
    u.id,
    u.name,
    u.email,
    u.phone,
    u.organization_id,
    NOW(),
    NOW()
FROM users u
LEFT JOIN customers c ON c.id = u.id
WHERE c.id IS NULL
    AND u.role = 'customer';

-- 3. إنشاء trigger للتأكد من وجود العميل في جدول customers قبل إنشاء الطلب
CREATE OR REPLACE FUNCTION ensure_customer_exists()
RETURNS TRIGGER AS $$
DECLARE
    guest_id UUID := '00000000-0000-0000-0000-000000000000';
    default_org_id UUID;
    user_exists BOOLEAN;
    user_name TEXT;
    user_email TEXT;
    user_organization_id UUID;
BEGIN
    -- تأكد من أن العميل موجود في جدول customers
    PERFORM 1 FROM customers WHERE id = NEW.customer_id;
    
    IF FOUND THEN
        -- العميل موجود في جدول customers، لا داعي لأي إجراء إضافي
        RETURN NEW;
    END IF;
    
    -- التحقق مما إذا كان العميل موجوداً في جدول users
    SELECT 
        COUNT(*) > 0, 
        name, 
        email, 
        organization_id
    INTO 
        user_exists, 
        user_name, 
        user_email, 
        user_organization_id
    FROM users 
    WHERE id = NEW.customer_id;
    
    IF user_exists THEN
        -- إنشاء سجل للعميل في جدول customers
        INSERT INTO customers (id, name, email, organization_id, created_at, updated_at)
        VALUES (
            NEW.customer_id,
            user_name,
            user_email,
            user_organization_id,
            NOW(),
            NOW()
        );
        
        -- العميل تم إنشاؤه الآن، يمكن إكمال الإدخال
        RETURN NEW;
    ELSE
        -- العميل غير موجود في أي من الجدولين، استخدم العميل الزائر بدلاً منه
        -- أولاً، تأكد من وجود معرف المؤسسة
        IF NEW.organization_id IS NULL THEN
            -- جلب معرف المؤسسة الافتراضي
            SELECT id INTO default_org_id FROM organizations LIMIT 1;
            NEW.organization_id := default_org_id;
        END IF;
        
        -- تأكد من وجود العميل الزائر
        INSERT INTO customers (id, name, email, organization_id, created_at, updated_at)
        VALUES (
            guest_id,
            'زائر',
            'guest@example.com',
            NEW.organization_id,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- استخدم معرف العميل الزائر
        NEW.customer_id := guest_id;
        
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- حذف ال trigger إذا كان موجوداً سابقاً
DROP TRIGGER IF EXISTS before_insert_orders ON orders;

-- إنشاء ال trigger الجديد
CREATE TRIGGER before_insert_orders
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION ensure_customer_exists(); 