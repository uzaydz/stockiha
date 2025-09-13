-- إصلاح جدول domain_verifications بإضافة العمود المفقود verification_data
-- هذا العمود مطلوب لتخزين بيانات التحقق من النطاق في تطبيق Cloudflare

-- إضافة العمود verification_data من نوع JSONB لتخزين بيانات التحقق
ALTER TABLE domain_verifications 
ADD COLUMN IF NOT EXISTS verification_data JSONB;

-- إضافة تعليق للعمود الجديد
COMMENT ON COLUMN domain_verifications.verification_data IS 'بيانات التحقق من النطاق (Cloudflare, DNS instructions, etc.)';

-- تحديث السجلات الموجودة بقيم افتراضية إذا لزم الأمر
UPDATE domain_verifications 
SET verification_data = '{}'::jsonb 
WHERE verification_data IS NULL;

-- فحص البنية الجديدة للجدول
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'domain_verifications' 
ORDER BY ordinal_position;
