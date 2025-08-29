-- 🧪 اختبارات شاملة للتأكد من إصلاح مشكلة الموظفين

-- 1. اختبار الدالة مع معرف المؤسسة المحدد
SELECT 
  '🔍 اختبار 1: الدالة مع معرف المؤسسة' as test_name,
  (get_employees_with_stats('6c2ed605-0880-4e40-af50-78f80f7283bb')->>'success')::boolean as success,
  (get_employees_with_stats('6c2ed605-0880-4e40-af50-78f80f7283bb')->'stats'->>'total')::int as total_employees,
  get_employees_with_stats('6c2ed605-0880-4e40-af50-78f80f7283bb')->>'debug' as debug_message;

-- 2. اختبار الدالة بدون معرف المؤسسة (يجب أن تحدد تلقائياً)
SELECT 
  '🔍 اختبار 2: الدالة بدون معرف المؤسسة' as test_name,
  (get_employees_with_stats()->'stats'->>'total')::int as total_employees,
  get_employees_with_stats()->>'success' as success;

-- 3. عد الموظفين مباشرة من قاعدة البيانات
SELECT 
  '📊 إحصائية مباشرة من قاعدة البيانات' as test_name,
  COUNT(*) as total_employees,
  COUNT(*) FILTER (WHERE is_active = true) as active_employees,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_employees
FROM users 
WHERE role = 'employee' 
AND organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb';

-- 4. عرض جميع الموظفين مع تفاصيلهم
SELECT 
  '👤 تفاصيل كل موظف' as info,
  id,
  name,
  email,
  role,
  is_active,
  organization_id,
  auth_user_id,
  created_at,
  last_activity_at
FROM users 
WHERE role = 'employee' 
AND organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
ORDER BY created_at DESC;

-- 5. التحقق من أن جميع الموظفين لهم auth_user_id صحيح
SELECT 
  '🔐 التحقق من auth_user_id' as test_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE auth_user_id IS NOT NULL) as with_auth_id,
  COUNT(*) FILTER (WHERE auth_user_id IS NULL) as without_auth_id
FROM users 
WHERE role = 'employee' 
AND organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb';

-- 6. اختبار نهائي شامل للدالة
SELECT 
  '✅ الاختبار النهائي الشامل' as test_name,
  result.*
FROM (
  SELECT get_employees_with_stats('6c2ed605-0880-4e40-af50-78f80f7283bb') as full_result
) test_query,
LATERAL json_to_record(test_query.full_result) as result(
  success boolean,
  organization_id uuid,
  debug text,
  employees json,
  stats json
);
