-- تحديث أنماط الأزرار في مكونات الهيرو للمؤسسات الموجودة

-- هذا التحديث سيضيف خصائص أنماط الأزرار للهيرو إذا لم تكن موجودة بالفعل
UPDATE store_settings
SET settings = jsonb_set(
  jsonb_set(
    settings, 
    '{primaryButtonStyle}', 
    '"primary"', 
    true
  ), 
  '{secondaryButtonStyle}', 
  '"primary"', 
  true
)
WHERE component_type = 'hero'
AND NOT (settings ? 'primaryButtonStyle')
AND NOT (settings ? 'secondaryButtonStyle');

-- سجل تاريخ تنفيذ التحديث في سجل التنفيذ (إذا كان موجودًا)
DO $$
BEGIN
  -- التحقق من وجود جدول سجل التحديثات
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migrations_log') THEN
    INSERT INTO migrations_log (name, executed_at, description)
    VALUES (
      'update_hero_button_styles', 
      NOW(), 
      'إضافة خصائص أنماط الأزرار إلى مكونات الهيرو الموجودة: primaryButtonStyle و secondaryButtonStyle'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- تجاهل أي أخطاء قد تحدث عند محاولة الإدراج في سجل التحديثات
  RAISE NOTICE 'تم تجاهل خطأ عند محاولة التسجيل في سجل التحديثات: %', SQLERRM;
END $$; 