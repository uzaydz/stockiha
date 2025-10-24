-- =====================================================
-- إصلاح البيانات التالفة في custom_js
-- =====================================================
-- هذا الملف يصلح المشكلة حيث custom_js يحتوي على JSON بدلاً من JavaScript

-- مسح البيانات التالفة من custom_js
UPDATE organization_settings 
SET custom_js = NULL 
WHERE organization_id = 'c48e113d-c161-48a9-8393-012db6c597c2' 
AND custom_js IS NOT NULL 
AND (
  custom_js::text LIKE '{%' OR 
  custom_js::text LIKE '%fNcqSfPLFxu%' OR
  custom_js::text LIKE '%Unexpected identifier%'
);

-- التحقق من النتيجة
SELECT 
  organization_id,
  CASE 
    WHEN custom_js IS NULL THEN 'NULL (تم مسحه)'
    WHEN custom_js::text LIKE '{%' THEN 'JSON (يحتاج مسح)'
    ELSE 'JavaScript صالح'
  END as custom_js_status,
  LENGTH(custom_js::text) as custom_js_length
FROM organization_settings 
WHERE organization_id = 'c48e113d-c161-48a9-8393-012db6c597c2';

