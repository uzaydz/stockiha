-- تشخيص وإصلاح صلاحيات المستخدم anonymous
-- هذا الملف سيحل مشكلة 406 Not Acceptable

BEGIN;

-- فحص الأدوار والصلاحيات
SELECT '🔍 فحص صلاحيات الأدوار...' as status;

-- التحقق من صلاحيات anon على الجدول
SELECT 
    r.rolname,
    t.tablename,
    p.privilege_type
FROM information_schema.role_table_grants p
JOIN pg_roles r ON r.rolname = p.grantee
JOIN pg_tables t ON t.tablename = p.table_name
WHERE t.tablename = 'online_orders'
AND r.rolname IN ('anon', 'authenticated', 'public')
ORDER BY r.rolname, p.privilege_type;

-- منح الصلاحيات للدور anon إذا لم تكن موجودة
SELECT '🔧 منح صلاحيات SELECT و INSERT للمستخدم anonymous...' as status;

-- منح صلاحية SELECT (القراءة) للمستخدم anonymous
GRANT SELECT ON public.online_orders TO anon;

-- منح صلاحية INSERT (الكتابة) للمستخدم anonymous  
GRANT INSERT ON public.online_orders TO anon;

-- منح صلاحية USAGE على schema public
GRANT USAGE ON SCHEMA public TO anon;

-- التأكد من أن المستخدم authenticated له نفس الصلاحيات
GRANT SELECT, INSERT, UPDATE, DELETE ON public.online_orders TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- فحص الصلاحيات بعد المنح
SELECT '📊 عرض الصلاحيات بعد التحديث...' as status;
SELECT 
    r.rolname,
    t.tablename,
    p.privilege_type
FROM information_schema.role_table_grants p
JOIN pg_roles r ON r.rolname = p.grantee
JOIN pg_tables t ON t.tablename = p.table_name
WHERE t.tablename = 'online_orders'
AND r.rolname IN ('anon', 'authenticated', 'public')
ORDER BY r.rolname, p.privilege_type;

COMMIT;

SELECT '✅ تم إصلاح صلاحيات المستخدم anonymous!' as result; 