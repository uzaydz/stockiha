-- تحديث صلاحيات المستخدمين لإضافة الحقول الجديدة
-- للمستخدمين الذين لديهم manageProducts = true، قم بتعيين editProducts و deleteProducts إلى true
UPDATE users 
SET permissions = jsonb_set(
  jsonb_set(
    COALESCE(permissions, '{}'::jsonb),
    '{editProducts}',
    'true'::jsonb
  ),
  '{deleteProducts}',
  'true'::jsonb
)
WHERE (permissions->>'manageProducts')::boolean = true;

-- وللتأكد من أن المستخدمين الذين لديهم is_org_admin = true يحصلون على جميع الصلاحيات
UPDATE users 
SET permissions = jsonb_set(
  jsonb_set(
    COALESCE(permissions, '{}'::jsonb),
    '{editProducts}',
    'true'::jsonb
  ),
  '{deleteProducts}',
  'true'::jsonb
)
WHERE is_org_admin = true;

-- وللتأكد من أن المستخدمين الذين لديهم دور admin يحصلون على جميع الصلاحيات
UPDATE users 
SET permissions = jsonb_set(
  jsonb_set(
    COALESCE(permissions, '{}'::jsonb),
    '{editProducts}',
    'true'::jsonb
  ),
  '{deleteProducts}',
  'true'::jsonb
)
WHERE role = 'admin' OR role = 'owner';

-- تعديل الصلاحيات للمستخدمين الذين لديهم صلاحيات محددة 
-- للتعامل مع الحالة التي يكون فيها المستخدم لديه صلاحية editProducts ولكن ليس لديه صلاحية deleteProducts
UPDATE users 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{editProducts}',
  'true'::jsonb
)
WHERE (permissions->>'manageProducts')::boolean = true 
   OR role = 'admin' 
   OR role = 'owner'
   OR is_org_admin = true;

-- للتعامل مع الحالة التي يكون فيها المستخدم لديه صلاحية deleteProducts ولكن ليس لديه صلاحية editProducts
UPDATE users 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{deleteProducts}',
  'true'::jsonb
)
WHERE (permissions->>'manageProducts')::boolean = true 
   OR role = 'admin' 
   OR role = 'owner'
   OR is_org_admin = true; 