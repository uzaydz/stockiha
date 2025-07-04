-- ===== إصلاح ربط المستخدمين بالمؤسسات الموجودة =====
-- هذا الملف يربط المستخدمين الذين تم إنشاؤهم حديثاً بمؤسساتهم

-- عرض المؤسسات التي لها مالك لكن المالك غير مربوط في جدول users
SELECT 
  'مؤسسات بدون ربط المستخدم:' as description,
  o.id as organization_id,
  o.name as organization_name,
  o.subdomain,
  o.owner_id,
  au.email as auth_email,
  u.id as user_record_exists
FROM organizations o
LEFT JOIN auth.users au ON o.owner_id = au.id
LEFT JOIN users u ON o.owner_id = u.auth_user_id
WHERE u.id IS NULL 
  AND o.owner_id IS NOT NULL
ORDER BY o.created_at DESC;

-- إصلاح ربط المستخدمين بمؤسساتهم
-- إنشاء سجلات في جدول users للمستخدمين المفقودين
INSERT INTO users (
  id,
  auth_user_id,
  email,
  name,
  organization_id,
  role,
  is_org_admin,
  is_active,
  created_at,
  updated_at
)
SELECT 
  o.owner_id,
  o.owner_id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', 'مستخدم جديد'),
  o.id,
  'admin',
  true,
  true,
  NOW(),
  NOW()
FROM organizations o
JOIN auth.users au ON o.owner_id = au.id
LEFT JOIN users u ON o.owner_id = u.auth_user_id
WHERE u.id IS NULL 
  AND o.owner_id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  is_org_admin = true,
  role = 'admin',
  updated_at = NOW();

-- تحديث السجلات الموجودة في users التي لا تحتوي على organization_id
UPDATE users 
SET 
  organization_id = o.id,
  is_org_admin = true,
  role = 'admin',
  updated_at = NOW()
FROM organizations o
WHERE users.auth_user_id = o.owner_id
  AND users.organization_id IS NULL;

-- عرض النتائج بعد الإصلاح
SELECT 
  'النتائج بعد الإصلاح:' as description,
  COUNT(*) as total_organizations,
  COUNT(u.id) as linked_users,
  COUNT(*) - COUNT(u.id) as unlinked_organizations
FROM organizations o
LEFT JOIN users u ON o.owner_id = u.auth_user_id;

-- عرض تفاصيل المؤسسات المربوطة حديثاً
SELECT 
  'المؤسسات المربوطة بنجاح:' as description,
  o.name as organization_name,
  o.subdomain,
  u.email,
  u.name as user_name,
  u.role,
  u.is_org_admin
FROM organizations o
JOIN users u ON o.owner_id = u.auth_user_id
WHERE o.created_at > NOW() - INTERVAL '1 day'
ORDER BY o.created_at DESC; 