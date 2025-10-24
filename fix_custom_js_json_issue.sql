-- =====================================================
-- إصلاح مشكلة JSON المخزن في custom_js
-- =====================================================
-- هذا الملف يحل مشكلة تخزين JSON في حقل custom_js بدلاً من كود JavaScript

-- 1. عرض البيانات الحالية لمعرفة المشكلة
SELECT 
  organization_id,
  custom_js,
  LENGTH(custom_js) as js_length,
  CASE 
    WHEN custom_js LIKE '{%' THEN 'JSON detected'
    WHEN custom_js LIKE 'function%' OR custom_js LIKE 'var%' OR custom_js LIKE 'const%' OR custom_js LIKE 'let%' THEN 'JavaScript detected'
    ELSE 'Other format'
  END as content_type,
  updated_at
FROM organization_settings 
WHERE organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb';

-- 2. مسح JSON من custom_js (الحل الآمن)
UPDATE organization_settings 
SET 
  custom_js = NULL,
  updated_at = NOW()
WHERE 
  organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
  AND custom_js LIKE '{%'
  AND custom_js LIKE '%}';

-- 3. التحقق من النتيجة
SELECT 
  organization_id,
  custom_js,
  updated_at
FROM organization_settings 
WHERE organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb';

-- 4. (اختياري) إنشاء جدول منفصل لتخزين إعدادات JSON
-- إذا كنت تريد الاحتفاظ ببيانات JSON في مكان منفصل
CREATE TABLE IF NOT EXISTS organization_json_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  settings_key VARCHAR(100) NOT NULL,
  json_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, settings_key)
);

-- 5. (اختياري) نقل بيانات JSON إلى الجدول الجديد
-- INSERT INTO organization_json_settings (organization_id, settings_key, json_data)
-- SELECT 
--   organization_id,
--   'tracking_settings' as settings_key,
--   custom_js::jsonb as json_data
-- FROM organization_settings 
-- WHERE 
--   organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
--   AND custom_js LIKE '{%'
--   AND custom_js LIKE '%}';

-- 6. إضافة فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_organization_json_settings_org_id 
ON organization_json_settings(organization_id);

-- 7. إضافة تعليقات للتوثيق
COMMENT ON TABLE organization_json_settings IS 'جدول لتخزين إعدادات JSON المنفصلة عن custom_js';
COMMENT ON COLUMN organization_json_settings.settings_key IS 'مفتاح الإعداد (مثل: tracking_settings, analytics_config)';
COMMENT ON COLUMN organization_json_settings.json_data IS 'بيانات JSON للإعدادات';

-- =====================================================
-- ملاحظات مهمة:
-- =====================================================
-- 1. هذا الاستعلام سيمسح جميع بيانات JSON من custom_js
-- 2. تأكد من عمل نسخة احتياطية قبل التنفيذ
-- 3. يمكنك استخدام الجدول الجديد لتخزين إعدادات JSON منفصلة
-- 4. custom_js يجب أن يحتوي فقط على كود JavaScript صالح
-- =====================================================
