-- =====================================================
-- تحديث دالة get_pos_orders_page_data_fixed
-- إضافة حقول created_by_staff_id و created_by_staff_name
-- =====================================================

-- ⚠️ هذا السكريبت يحدث الدالة الموجودة فقط
-- يجب تنفيذه في Supabase SQL Editor

-- البحث عن السطر:
--   o.employee_id,
-- وإضافة بعده:
--   o.created_by_staff_id,
--   o.created_by_staff_name,

-- والبحث عن:
--   ''employee_id'', employee_id,
-- وإضافة بعده:
--   ''created_by_staff_id'', created_by_staff_id,
--   ''created_by_staff_name'', created_by_staff_name,

-- =====================================================
-- التنفيذ اليدوي المطلوب:
-- =====================================================
-- 1. افتح Supabase SQL Editor
-- 2. نفذ الأمر التالي لعرض الدالة:
--    SELECT routine_definition FROM information_schema.routines 
--    WHERE routine_name = 'get_pos_orders_page_data_fixed';
-- 3. انسخ الكود الكامل
-- 4. ابحث عن السطر: o.employee_id,
-- 5. أضف بعده:
--    o.created_by_staff_id,
--    o.created_by_staff_name,
-- 6. ابحث عن السطر: ''employee_id'', employee_id,
-- 7. أضف بعده:
--    ''created_by_staff_id'', created_by_staff_id,
--    ''created_by_staff_name'', created_by_staff_name,
-- 8. نفذ الدالة المحدثة بالكامل مع CREATE OR REPLACE FUNCTION

-- =====================================================
-- أو استخدم هذا الكود الجاهز:
-- =====================================================

-- يمكنك تنفيذ هذا الأمر مباشرة لإضافة الحقول:
DO $$
BEGIN
    -- هذا مجرد مثال - يجب تحديث الدالة الكاملة
    RAISE NOTICE 'يجب تحديث الدالة get_pos_orders_page_data_fixed يدوياً';
    RAISE NOTICE 'أضف الحقول: created_by_staff_id, created_by_staff_name';
END $$;
