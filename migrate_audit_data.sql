-- =============================================================================
-- هجرة البيانات المهمة من النظام القديم إلى النظام المحسن
-- =============================================================================

-- 1. تحليل البيانات الحالية أولاً
SELECT 
  'تحليل النظام القديم' as status,
  COUNT(*) as total_records,
  pg_size_pretty(pg_total_relation_size('settings_audit_log')) as current_size,
  MAX(created_at) as latest_record,
  MIN(created_at) as oldest_record
FROM settings_audit_log;

-- 2. إنشاء دالة لهجرة السجلات المهمة
CREATE OR REPLACE FUNCTION migrate_important_audit_records()
RETURNS TABLE (
  migrated_count INTEGER,
  skipped_count INTEGER,
  total_processed INTEGER
) AS $$
DECLARE
  old_record RECORD;
  migrated_cnt INTEGER := 0;
  skipped_cnt INTEGER := 0;
  total_cnt INTEGER := 0;
  field_changes_calc JSONB;
  is_major_calc BOOLEAN;
  summary_text TEXT;
BEGIN
  -- هجرة السجلات من آخر 30 يوم فقط والتي تعتبر مهمة
  FOR old_record IN 
    SELECT * FROM settings_audit_log 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    AND (
      setting_key LIKE '%important%' OR
      setting_type = 'organization' OR
      action_type = 'INSERT' OR
      action_type = 'DELETE' OR
      -- تصنيف السجلات الكبيرة كمهمة
      OCTET_LENGTH(COALESCE(old_value, '')) + OCTET_LENGTH(COALESCE(new_value, '')) > 5000
    )
    ORDER BY created_at DESC
  LOOP
    total_cnt := total_cnt + 1;
    
    -- تحديد ما إذا كان التغيير مهماً
    is_major_calc := (
      old_record.action_type IN ('INSERT', 'DELETE') OR
      old_record.setting_type = 'organization' OR
      old_record.setting_key LIKE '%important%'
    );
    
    -- إنشاء ملخص للتغيير
    summary_text := CASE 
      WHEN old_record.action_type = 'INSERT' THEN 
        format('تم إنشاء %s جديد', old_record.setting_key)
      WHEN old_record.action_type = 'DELETE' THEN 
        format('تم حذف %s', old_record.setting_key)
      WHEN old_record.action_type = 'UPDATE' THEN 
        format('تم تحديث %s', old_record.setting_key)
      ELSE 
        format('تغيير في %s', old_record.setting_key)
    END;
    
    -- تبسيط field_changes (لا نحتاج تفاصيل دقيقة للبيانات المهاجرة)
    field_changes_calc := CASE 
      WHEN old_record.old_value IS NOT NULL AND old_record.new_value IS NOT NULL 
        AND old_record.old_value != old_record.new_value THEN
        jsonb_build_object(
          'migrated_from_old_system', jsonb_build_object(
            'had_changes', true,
            'old_size_kb', round(OCTET_LENGTH(old_record.old_value) / 1024.0, 2),
            'new_size_kb', round(OCTET_LENGTH(old_record.new_value) / 1024.0, 2)
          )
        )
      ELSE 
        jsonb_build_object('migrated_from_old_system', jsonb_build_object('had_changes', false))
    END;
    
    -- إدراج في الجدول الجديد
    BEGIN
      INSERT INTO settings_audit_log_optimized (
        user_id,
        organization_id,
        setting_type,
        setting_key,
        action_type,
        table_name,
        record_id,
        changed_fields,
        field_changes,
        is_major_change,
        summary,
        created_at
      ) VALUES (
        old_record.user_id,
        old_record.organization_id,
        old_record.setting_type,
        old_record.setting_key,
        old_record.action_type,
        COALESCE(old_record.table_name, old_record.setting_type || '_settings'),
        old_record.record_id,
        ARRAY['migrated_data'], -- حقل واحد للبيانات المهاجرة
        field_changes_calc,
        is_major_calc,
        summary_text,
        old_record.created_at
      );
      
      migrated_cnt := migrated_cnt + 1;
      
    EXCEPTION WHEN OTHERS THEN
      skipped_cnt := skipped_cnt + 1;
      RAISE NOTICE 'تم تخطي السجل %: %', old_record.id, SQLERRM;
    END;
    
    -- استراحة قصيرة كل 100 سجل لتجنب الضغط على قاعدة البيانات
    IF total_cnt % 100 = 0 THEN
      PERFORM pg_sleep(0.1);
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT migrated_cnt, skipped_cnt, total_cnt;
END;
$$ LANGUAGE plpgsql;

-- 3. تشغيل الهجرة
SELECT 
  'نتائج الهجرة' as status,
  migrated_count as records_migrated,
  skipped_count as records_skipped,
  total_processed as total_processed,
  round((migrated_count::numeric / total_processed::numeric) * 100, 1) as success_rate_percent
FROM migrate_important_audit_records();

-- 4. مقارنة الأحجام بعد الهجرة
SELECT 
  'النظام القديم' as system,
  COUNT(*) as record_count,
  pg_size_pretty(pg_total_relation_size('settings_audit_log')) as table_size,
  round(avg(OCTET_LENGTH(COALESCE(old_value, '')) + OCTET_LENGTH(COALESCE(new_value, ''))), 0) as avg_record_size_bytes
FROM settings_audit_log

UNION ALL

SELECT 
  'النظام الجديد' as system,
  COUNT(*) as record_count,
  pg_size_pretty(pg_total_relation_size('settings_audit_log_optimized')) as table_size,
  round(avg(OCTET_LENGTH(COALESCE(summary, '')) + OCTET_LENGTH(COALESCE(field_changes::text, ''))), 0) as avg_record_size_bytes
FROM settings_audit_log_optimized;

-- 5. عرض عينة من البيانات المهاجرة
SELECT 
  'عينة من البيانات المهاجرة' as info,
  setting_type,
  setting_key,
  action_type,
  is_major_change,
  summary,
  created_at
FROM settings_audit_log_optimized 
ORDER BY created_at DESC 
LIMIT 10;

-- 6. حذف دالة الهجرة المؤقتة
DROP FUNCTION IF EXISTS migrate_important_audit_records(); 