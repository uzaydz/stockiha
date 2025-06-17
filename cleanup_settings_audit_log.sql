-- =============================================================================
-- تنظيف وتحسين جدول settings_audit_log 
-- المشكلة: حجم 121 MB بسبب تخزين بيانات JSON كاملة
-- =============================================================================

-- 1. تحليل المشكلة قبل التنظيف
SELECT 
  'إحصائيات قبل التنظيف' as status,
  COUNT(*) as total_records,
  pg_size_pretty(pg_total_relation_size('settings_audit_log')) as table_size,
  COUNT(DISTINCT organization_id) as organizations_count,
  MAX(created_at) as latest_entry,
  MIN(created_at) as earliest_entry
FROM settings_audit_log;

-- 2. إنشاء نسخة احتياطية قبل التنظيف
CREATE TABLE IF NOT EXISTS settings_audit_log_backup AS 
SELECT * FROM settings_audit_log;

-- 3. حذف السجلات الزائدة - الاحتفاظ بآخر 30 يوم فقط
DELETE FROM settings_audit_log 
WHERE created_at < NOW() - INTERVAL '30 days';

-- 4. حذف السجلات المكررة - الاحتفاظ بأحدث سجل لكل إعداد
WITH RankedAuditLogs AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, setting_type, setting_key, 
                   DATE_TRUNC('hour', created_at)
      ORDER BY created_at DESC
    ) as rn
  FROM settings_audit_log
)
DELETE FROM settings_audit_log 
WHERE id IN (
  SELECT id FROM RankedAuditLogs WHERE rn > 2
);

-- 5. حذف السجلات التي لا تحتوي على تغييرات حقيقية
DELETE FROM settings_audit_log 
WHERE old_value = new_value;

-- 6. ضغط البيانات الكبيرة - تقليص البيانات JSON للسجلات الكبيرة
UPDATE settings_audit_log 
SET 
  old_value = CASE 
    WHEN OCTET_LENGTH(old_value) > 10000 THEN 
      '{"compressed": true, "size": "' || OCTET_LENGTH(old_value) || ' bytes", "preview": "' || LEFT(old_value, 100) || '..."}'
    ELSE old_value 
  END,
  new_value = CASE 
    WHEN OCTET_LENGTH(new_value) > 10000 THEN 
      '{"compressed": true, "size": "' || OCTET_LENGTH(new_value) || ' bytes", "preview": "' || LEFT(new_value, 100) || '..."}'
    ELSE new_value 
  END
WHERE OCTET_LENGTH(old_value) > 10000 OR OCTET_LENGTH(new_value) > 10000;

-- 7. إضافة فهارس للتحسين
CREATE INDEX IF NOT EXISTS idx_settings_audit_log_created_at 
ON settings_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_settings_audit_log_composite 
ON settings_audit_log(organization_id, setting_type, setting_key, created_at);

-- 8. تحليل النتائج بعد التنظيف
SELECT 
  'إحصائيات بعد التنظيف' as status,
  COUNT(*) as total_records,
  pg_size_pretty(pg_total_relation_size('settings_audit_log')) as table_size,
  COUNT(DISTINCT organization_id) as organizations_count,
  MAX(created_at) as latest_entry,
  MIN(created_at) as earliest_entry
FROM settings_audit_log;

-- 9. إعادة تنظيم الجدول لاستعادة المساحة
VACUUM FULL settings_audit_log;
REINDEX TABLE settings_audit_log;

-- 10. تقرير التوفير
SELECT 
  'تقرير التوفير' as status,
  pg_size_pretty(pg_total_relation_size('settings_audit_log_backup')) as size_before,
  pg_size_pretty(pg_total_relation_size('settings_audit_log')) as size_after,
  pg_size_pretty(
    pg_total_relation_size('settings_audit_log_backup') - 
    pg_total_relation_size('settings_audit_log')
  ) as space_saved; 