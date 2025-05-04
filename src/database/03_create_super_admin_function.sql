-- إنشاء وظيفة لإضافة أو تحديث مستخدم ليصبح مسؤولاً رئيسياً
-- يجب تنفيذ هذا الملف بعد إضافة العمود وإنشاء السياسات

-- التحقق أولاً من وجود العمود
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- التحقق من وجود العمود
    SELECT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'is_super_admin'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE EXCEPTION 'Error: Column is_super_admin does not exist in users table. Please run 01_add_super_admin_column.sql first';
    ELSE
        RAISE NOTICE 'Verification passed: Column is_super_admin exists in users table';
    END IF;
END
$$;

-- إنشاء وظيفة لإضافة مسؤول رئيسي
CREATE OR REPLACE FUNCTION create_super_admin(
    p_email TEXT,
    p_name TEXT
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- التحقق من وجود المستخدم في auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email;
    
    -- إذا لم يكن موجوداً، أظهر رسالة خطأ
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Error: User with email % does not exist in auth.users. Please create the user through Supabase Auth UI or API first', p_email;
        RETURN;
    END IF;
    
    -- التحقق مما إذا كان المستخدم موجوداً في public.users
    IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
        -- تحديث المستخدم الموجود ليصبح مسؤولاً رئيسياً
        UPDATE public.users
        SET 
            is_super_admin = TRUE,
            role = 'super_admin',
            is_active = TRUE,
            name = p_name,
            updated_at = NOW()
        WHERE email = p_email;
        
        RAISE NOTICE 'Success: Updated existing user to super admin: %', p_email;
    ELSE
        -- إنشاء مستخدم جديد في public.users
        INSERT INTO public.users (
            id,
            email,
            name,
            role,
            is_active,
            is_super_admin,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            p_email,
            p_name,
            'super_admin',
            TRUE,
            TRUE,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Success: Created new super admin user: %', p_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- طريقة الاستخدام (بعد إنشاء المستخدم في auth.users):
/*
    -- أمثلة:
    SELECT create_super_admin('admin@example.com', 'Super Admin');
    
    -- ملاحظة: يجب إنشاء المستخدم أولاً في نظام المصادقة (auth.users)
    -- قبل استدعاء هذه الوظيفة، وذلك من خلال واجهة سوبابيس أو API
*/ 