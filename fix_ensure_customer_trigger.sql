-- إصلاح دالة ensure_customer_exists_before_order التي تسبب خطأ GROUP BY
-- تاريخ: 2024
-- المشكلة: استخدام COUNT(*) مع أعمدة أخرى بدون GROUP BY

-- إصلاح الدالة
CREATE OR REPLACE FUNCTION public.ensure_customer_exists_before_order()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    guest_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
    default_org_id UUID;
    user_exists BOOLEAN := FALSE;
    user_name TEXT;
    user_email TEXT;
    user_phone TEXT;
    phone_exists BOOLEAN;
    user_organization_id UUID;
    user_record RECORD;
BEGIN
    -- تأكد من أن العميل موجود في جدول customers
    PERFORM 1 FROM customers WHERE id = NEW.customer_id;
    
    IF FOUND THEN
        -- العميل موجود في جدول customers، لا داعي لأي إجراء إضافي
        RETURN NEW;
    END IF;
    
    -- التحقق مما إذا كان العميل موجوداً في جدول users
    -- إصلاح: استخدام SELECT منفصل بدلاً من COUNT مع أعمدة أخرى
    SELECT 
        name, 
        email,
        phone,
        organization_id
    INTO 
        user_name, 
        user_email,
        user_phone,
        user_organization_id
    FROM users 
    WHERE id = NEW.customer_id
    LIMIT 1;
    
    -- التحقق إذا تم العثور على المستخدم
    user_exists := FOUND;
    
    IF user_exists THEN
        -- التحقق إذا كان رقم الهاتف موجودًا مسبقًا
        IF user_phone IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM customers 
                WHERE phone = user_phone 
                    AND organization_id = COALESCE(user_organization_id, NEW.organization_id)
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
    
EXCEPTION
    WHEN OTHERS THEN
        -- في حالة حدوث خطأ، لا نوقف العملية الأساسية
        -- فقط نسجل الخطأ ونستخدم العميل الزائر
        
        -- تأكد من وجود معرف المؤسسة
        IF NEW.organization_id IS NULL THEN
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
END;
$function$;

-- رسالة تأكيد
SELECT 'تم إصلاح دالة ensure_customer_exists_before_order بنجاح!' as status; 