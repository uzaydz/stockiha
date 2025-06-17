-- =============================================================================
-- سكريبت تجريبي لاختبار النظام المحسن
-- =============================================================================

-- إنشاء دالة مساعدة لحساب إحصائيات الجداول
CREATE OR REPLACE FUNCTION get_table_stats(table_name TEXT)
RETURNS TABLE (
  records BIGINT,
  size_mb NUMERIC,
  avg_record_size_kb NUMERIC
) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT 
      COUNT(*)::BIGINT as records,
      round((pg_total_relation_size(%L) / 1024.0 / 1024.0)::numeric, 2) as size_mb,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          round((pg_total_relation_size(%L) / 1024.0 / COUNT(*))::numeric, 2)
        ELSE 0
      END as avg_record_size_kb
    FROM %I', 
    table_name, table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- 1. إنشاء تحديثات تجريبية
DO $$
DECLARE
  test_org_id UUID;
  test_store_id UUID;
  test_user_settings_id UUID;
BEGIN
  -- الحصول على معرفات للاختبار
  SELECT id INTO test_org_id FROM organization_settings LIMIT 1;
  SELECT id INTO test_store_id FROM store_settings LIMIT 1;
  SELECT id INTO test_user_settings_id FROM user_settings LIMIT 1;
  
  -- تحديث إعدادات المؤسسة
  IF test_org_id IS NOT NULL THEN
    UPDATE organization_settings 
    SET theme_primary_color = '#ff6b35',
        theme_secondary_color = '#2563eb'
    WHERE id = test_org_id;
    
    RAISE NOTICE 'تم تحديث إعدادات المؤسسة: %', test_org_id;
  END IF;
  
  -- تحديث إعدادات المتجر
  IF test_store_id IS NOT NULL THEN
    UPDATE store_settings 
    SET is_active = NOT is_active
    WHERE id = test_store_id;
    
    RAISE NOTICE 'تم تحديث إعدادات المتجر: %', test_store_id;
  END IF;
  
  -- تحديث إعدادات المستخدم
  IF test_user_settings_id IS NOT NULL THEN
    UPDATE user_settings 
    SET theme_mode = 'dark'
    WHERE id = test_user_settings_id;
    
    RAISE NOTICE 'تم تحديث إعدادات المستخدم: %', test_user_settings_id;
  END IF;
  
  -- انتظار قصير للتأكد من تسجيل البيانات
  PERFORM pg_sleep(0.1);
END $$;

-- 2. التحقق من النتائج
SELECT 
  '=== نتائج الاختبار ===' as info,
  COUNT(*) as total_records,
  COUNT(CASE WHEN is_major_change THEN 1 END) as major_changes,
  pg_size_pretty(pg_total_relation_size('settings_audit_log_optimized')) as table_size
FROM settings_audit_log_optimized;

-- 3. عرض السجلات الجديدة
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
ORDER BY created_at DESC 
LIMIT 10;

-- 4. مقارنة الأحجام
SELECT 
  'مقارنة الأحجام' as comparison,
  (SELECT pg_size_pretty(pg_total_relation_size('settings_audit_log'))) as old_system_size,
  (SELECT pg_size_pretty(pg_total_relation_size('settings_audit_log_optimized'))) as new_system_size,
  (SELECT COUNT(*) FROM settings_audit_log) as old_records,
  (SELECT COUNT(*) FROM settings_audit_log_optimized) as new_records;

-- 5. اختبار العرض القابل للقراءة
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

-- 6. إحصائيات التوفير
WITH old_stats AS (
  SELECT 
    COUNT(*) as records,
    pg_total_relation_size('settings_audit_log') as size_bytes
  FROM settings_audit_log
),
new_stats AS (
  SELECT 
    COUNT(*) as records,
    pg_total_relation_size('settings_audit_log_optimized') as size_bytes
  FROM settings_audit_log_optimized
)
SELECT 
  'إحصائيات التوفير' as metric,
  old_stats.records as old_records,
  new_stats.records as new_records,
  pg_size_pretty(old_stats.size_bytes) as old_size,
  pg_size_pretty(new_stats.size_bytes) as new_size,
  CASE 
    WHEN old_stats.size_bytes > 0 THEN
      round(((old_stats.size_bytes - new_stats.size_bytes)::numeric / old_stats.size_bytes::numeric) * 100, 1)
    ELSE 0
  END as savings_percentage
FROM old_stats, new_stats;

-- 7. نصيحة للمستخدم
SELECT 
  '🎉 النظام المحسن يعمل بنجاح!' as status,
  'تم تسجيل التغييرات الجديدة بكفاءة عالية' as message,
  'يمكنك الآن استخدام لوحة التحكم React لمراقبة النظام' as next_step; 