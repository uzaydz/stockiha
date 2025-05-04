-- تعريف الصلاحية الجديدة viewInventory للموظفين
-- هذا السكريبت يضيف صلاحية مشاهدة المخزون فقط (بدون تعديل) للمستخدمين

-- تاريخ الإنشاء: 2024-04-24
-- الوصف: إضافة صلاحية جديدة تسمح للموظف بمشاهدة صفحة المخزون بدون القدرة على تعديله

-- أولاً: نقوم بتحديث المستخدمين الذين لديهم صلاحيات محددة بالفعل

-- تحديث المستخدمين الذين لديهم permissions معرفة كـ JSONB
UPDATE users
SET permissions = permissions || jsonb_build_object('viewInventory', true)
WHERE permissions IS NOT NULL 
AND permissions ? 'viewProducts'
AND jsonb_typeof(permissions) = 'object';

-- إضافة الصلاحية إلى جميع مديري المؤسسات ومديري النظام
UPDATE users
SET permissions = COALESCE(permissions, '{}'::jsonb) || jsonb_build_object('viewInventory', true)
WHERE is_org_admin = true OR is_super_admin = true;

-- إضافة الصلاحية إلى المستخدمين الذين لديهم صلاحية manageInventory
UPDATE users
SET permissions = COALESCE(permissions, '{}'::jsonb) || jsonb_build_object('viewInventory', true)
WHERE permissions IS NOT NULL 
AND jsonb_typeof(permissions) = 'object'
AND permissions ? 'manageInventory' 
AND permissions->>'manageInventory' = 'true';

-- ثانياً: حفظ توثيق للتحديث في جدول schema_migrations (إذا كان موجوداً)

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'schema_migrations') THEN
        INSERT INTO schema_migrations (version, description)
        VALUES ('20240424000001', 'إضافة صلاحية viewInventory للموظفين');
    END IF;
END $$;

-- تمت التهيئة بنجاح
COMMENT ON COLUMN users.permissions IS 'صلاحيات المستخدم بما فيها viewInventory (مشاهدة المخزون فقط بدون تعديل)'; 