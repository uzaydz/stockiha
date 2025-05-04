-- إصلاح مشكلة قيد المفتاح الأجنبي بين الطلبات والعملاء
-- حل مشكلة "orders_customer_id_fkey"

-- 1. التحقق من صحة قيد المفتاح الأجنبي الحالي
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_customer_id_fkey'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'القيد orders_customer_id_fkey موجود، سيتم حذفه وإعادة إنشائه';
    ELSE
        RAISE NOTICE 'القيد orders_customer_id_fkey غير موجود، سيتم إنشاؤه';
    END IF;
END $$;

-- 2. حذف القيد إذا كان موجودًا
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;

-- 3. التحقق من وجود جميع العملاء المشار إليهم في جدول الطلبات
-- نقل العملاء من جدول المستخدمين إلى جدول العملاء مع معالجة مشكلة القيد الفريد
DO $$
DECLARE
    user_rec RECORD;
    phone_exists BOOLEAN;
BEGIN
    FOR user_rec IN (
        SELECT u.id, u.name, u.email, u.phone, u.organization_id
        FROM users u
        LEFT JOIN customers c ON c.id = u.id
        WHERE c.id IS NULL
            AND (u.role = 'customer' OR u.role IS NULL)
    ) LOOP
        -- التحقق إذا كان هناك عميل آخر بنفس رقم الهاتف ومعرف المؤسسة
        IF user_rec.phone IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM customers 
                WHERE phone = user_rec.phone AND organization_id = user_rec.organization_id
            ) INTO phone_exists;
            
            -- إذا كان الرقم موجودًا، نضيف بعض الرموز لجعله فريدًا
            IF phone_exists THEN
                INSERT INTO customers (id, name, email, phone, organization_id, created_at, updated_at)
                VALUES (
                    user_rec.id,
                    user_rec.name,
                    user_rec.email,
                    user_rec.phone || '_' || substr(md5(random()::text), 1, 4),
                    user_rec.organization_id,
                    NOW(),
                    NOW()
                );
                RAISE NOTICE 'تم إضافة عميل مع تعديل رقم الهاتف: % (ID: %)', user_rec.name, user_rec.id;
            ELSE
                -- إذا كان الرقم غير موجود، نضيف بدون تعديل
                INSERT INTO customers (id, name, email, phone, organization_id, created_at, updated_at)
                VALUES (
                    user_rec.id,
                    user_rec.name,
                    user_rec.email,
                    user_rec.phone,
                    user_rec.organization_id,
                    NOW(),
                    NOW()
                );
                RAISE NOTICE 'تم إضافة عميل: % (ID: %)', user_rec.name, user_rec.id;
            END IF;
        ELSE
            -- إذا كان الرقم NULL، لا توجد مشكلة مع القيد الفريد
            INSERT INTO customers (id, name, email, phone, organization_id, created_at, updated_at)
            VALUES (
                user_rec.id,
                user_rec.name,
                user_rec.email,
                NULL,
                user_rec.organization_id,
                NOW(),
                NOW()
            );
            RAISE NOTICE 'تم إضافة عميل بدون رقم هاتف: % (ID: %)', user_rec.name, user_rec.id;
        END IF;
        
    END LOOP;
END $$;

-- 4. إنشاء العميل الزائر إذا لم يكن موجودًا بالفعل
INSERT INTO customers (id, name, email, organization_id, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'زائر',
    'guest@example.com',
    (SELECT id FROM organizations ORDER BY created_at LIMIT 1),
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 5. تحديث جميع الطلبات التي لها customer_id غير موجود في جدول العملاء
UPDATE orders
SET customer_id = '00000000-0000-0000-0000-000000000000'
WHERE customer_id NOT IN (SELECT id FROM customers);

-- 6. إعادة إنشاء قيد المفتاح الأجنبي مع خيار ON DELETE SET NULL
ALTER TABLE orders ADD CONSTRAINT orders_customer_id_fkey
FOREIGN KEY (customer_id) REFERENCES customers(id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 7. إنشاء trigger للتأكد من وجود العميل قبل إضافة أي طلب جديد
CREATE OR REPLACE FUNCTION ensure_customer_exists_before_order()
RETURNS TRIGGER AS $$
DECLARE
    guest_id UUID := '00000000-0000-0000-0000-000000000000';
    default_org_id UUID;
    user_exists BOOLEAN;
    user_name TEXT;
    user_email TEXT;
    user_phone TEXT;
    phone_exists BOOLEAN;
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
        phone,
        organization_id
    INTO 
        user_exists, 
        user_name, 
        user_email,
        user_phone,
        user_organization_id
    FROM users 
    WHERE id = NEW.customer_id;
    
    IF user_exists THEN
        -- التحقق إذا كان رقم الهاتف موجودًا مسبقًا
        IF user_phone IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM customers 
                WHERE phone = user_phone AND organization_id = COALESCE(user_organization_id, NEW.organization_id)
            ) INTO phone_exists;
            
            -- إذا كان الرقم موجودًا، نضيف رموزًا للجعله فريدًا
            IF phone_exists THEN
                user_phone := user_phone || '_' || substr(md5(random()::text), 1, 4);
            END IF;
        END IF;
        
        -- إنشاء سجل للعميل في جدول customers
        INSERT INTO customers (id, name, email, phone, organization_id, created_at, updated_at)
        VALUES (
            NEW.customer_id,
            user_name,
            user_email,
            user_phone,
            COALESCE(user_organization_id, NEW.organization_id),
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
            SELECT id INTO default_org_id FROM organizations ORDER BY created_at LIMIT 1;
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
EXECUTE FUNCTION ensure_customer_exists_before_order();

-- 8. التحقق من حالة الجداول بعد التعديلات
DO $$
DECLARE
    orders_count INTEGER;
    customers_count INTEGER;
    invalid_orders INTEGER;
BEGIN
    SELECT COUNT(*) INTO orders_count FROM orders;
    SELECT COUNT(*) INTO customers_count FROM customers;
    
    SELECT COUNT(*) INTO invalid_orders 
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE c.id IS NULL AND o.customer_id IS NOT NULL;
    
    RAISE NOTICE 'إحصائيات بعد التعديلات:';
    RAISE NOTICE 'عدد الطلبات: %', orders_count;
    RAISE NOTICE 'عدد العملاء: %', customers_count;
    RAISE NOTICE 'عدد الطلبات غير الصالحة (يجب أن يكون صفر): %', invalid_orders;
END $$; 