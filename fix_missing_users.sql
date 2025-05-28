-- إصلاح مشكلة المستخدمين المفقودين في جدول public.users
-- Fix Missing Users in public.users table

-- أولاً، دعنا نتحقق من المستخدمين المفقودين
DO $$
DECLARE
    missing_user RECORD;
    inserted_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'بدء إصلاح المستخدمين المفقودين...';
    
    -- إدراج المستخدمين المفقودين من auth.users إلى public.users
    FOR missing_user IN 
        SELECT 
            au.id,
            au.email,
            au.created_at,
            au.raw_user_meta_data,
            au.email_confirmed_at
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.auth_user_id OR au.id = pu.id
        WHERE pu.id IS NULL
        ORDER BY au.created_at
    LOOP
        BEGIN
            INSERT INTO public.users (
                id,
                auth_user_id,
                email,
                name,
                role,
                is_active,
                created_at,
                updated_at,
                email_confirmed_at
            ) VALUES (
                missing_user.id,
                missing_user.id,
                missing_user.email,
                COALESCE(
                    missing_user.raw_user_meta_data->>'name',
                    missing_user.raw_user_meta_data->>'full_name',
                    split_part(missing_user.email, '@', 1)
                ),
                COALESCE(missing_user.raw_user_meta_data->>'role', 'user'),
                true,
                missing_user.created_at,
                NOW(),
                missing_user.email_confirmed_at
            );
            
            inserted_count := inserted_count + 1;
            RAISE NOTICE 'تم إدراج المستخدم: % (ID: %)', missing_user.email, missing_user.id;
            
        EXCEPTION 
            WHEN unique_violation THEN
                RAISE NOTICE 'المستخدم موجود بالفعل: % (ID: %)', missing_user.email, missing_user.id;
            WHEN OTHERS THEN
                RAISE NOTICE 'خطأ في إدراج المستخدم %: %', missing_user.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'تم الانتهاء من إصلاح المستخدمين. تم إدراج % مستخدم جديد.', inserted_count;
END $$;

-- التحقق من النتائج
SELECT 
    'auth.users' as table_name,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'public.users' as table_name,
    COUNT(*) as count
FROM public.users
ORDER BY table_name;

-- عرض المستخدمين الذين تم إصلاحهم مؤخراً
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.created_at,
    'تم الإصلاح' as status
FROM public.users u
WHERE u.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY u.updated_at DESC;

-- التأكد من عدم وجود مستخدمين مفقودين
SELECT 
    COUNT(*) as remaining_missing_users
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.auth_user_id OR au.id = pu.id
WHERE pu.id IS NULL; 