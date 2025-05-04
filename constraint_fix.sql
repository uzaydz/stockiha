-- constraint_fix.sql

-- الخطوة 1: التحقق من عدم وجود تكرارات حالية لـ (organization_id, component_type)
-- قم بتشغيل هذا الاستعلام أولاً. إذا وجدت تكرارات، يجب حلها يدويًا.
SELECT organization_id, component_type, COUNT(*)
FROM public.store_settings
GROUP BY organization_id, component_type
HAVING COUNT(*) > 1;

-- الخطوة 2: إضافة القيد الفريد المطلوب لجدول store_settings
-- قم بتشغيل هذا فقط بعد التأكد من عدم وجود تكرارات من الخطوة 1.
ALTER TABLE public.store_settings
ADD CONSTRAINT store_settings_org_component_unique UNIQUE (organization_id, component_type); 