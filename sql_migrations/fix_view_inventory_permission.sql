-- ملف إصلاح إضافي لتمكين صلاحية مشاهدة المخزون للمستخدمين
-- هذا الملف يقوم بإصلاح أي مشاكل قد تكون موجودة بعد تطبيق صلاحية viewInventory

-- تاريخ الإنشاء: 2024-04-24
-- الوصف: إصلاح لصلاحية مشاهدة المخزون (viewInventory)

-- تحديث جميع المستخدمين لديهم منتوج permissions
UPDATE users
SET permissions = COALESCE(permissions, '{}'::jsonb) || jsonb_build_object('viewInventory', true)
WHERE permissions IS NOT NULL;

-- تأكد من إضافة صلاحية viewInventory لجميع مديري المؤسسات ومديري النظام
UPDATE users
SET permissions = COALESCE(permissions, '{}'::jsonb) || jsonb_build_object('viewInventory', true)
WHERE is_org_admin = true OR is_super_admin = true;

-- تأكد من إضافة صلاحية viewInventory لجميع المستخدمين الذين لديهم دور مدير
UPDATE users
SET permissions = COALESCE(permissions, '{}'::jsonb) || jsonb_build_object('viewInventory', true)
WHERE role = 'admin' OR role = 'owner';

-- تأكد من إضافة صلاحية viewInventory لجميع المستخدمين النشطين
UPDATE users
SET permissions = COALESCE(permissions, '{}'::jsonb) || jsonb_build_object('viewInventory', true)
WHERE is_active = true;

-- إضافة تعليق يشرح الصلاحية الجديدة
COMMENT ON COLUMN users.permissions IS 'صلاحيات المستخدم بما فيها viewInventory (مشاهدة المخزون فقط بدون تعديل) - تم تحديث جميع المستخدمين';

-- إنشاء أو تحديث سجل في جدول schema_migrations (إذا كان موجوداً)

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'schema_migrations') THEN
        INSERT INTO schema_migrations (version, description)
        VALUES ('20240424000002', 'إصلاح صلاحية viewInventory للموظفين')
        ON CONFLICT (version) DO UPDATE
        SET description = 'إصلاح صلاحية viewInventory للموظفين';
    END IF;
END $$; 