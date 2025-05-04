-- migrations/fix_inventory_log_constraint.sql
-- حل مشكلة قيد التحقق في حقل type في جدول inventory_log

-- 1. تحديث قيد التحقق لإضافة 'online_order'
DO $$
BEGIN
    -- حذف القيد الموجود أولاً
    ALTER TABLE inventory_log DROP CONSTRAINT IF EXISTS inventory_log_type_check;
    
    -- إضافة القيد مع القيم الجديدة
    ALTER TABLE inventory_log ADD CONSTRAINT inventory_log_type_check 
        CHECK (type IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'online_order'));
    
    RAISE NOTICE 'تم تحديث قيد التحقق لجدول inventory_log بنجاح';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'حدث خطأ أثناء تحديث قيد التحقق: %', SQLERRM;
END;
$$;

-- 2. تأكيد إضافة القيمة الجديدة في تعريف نوع المخزون
DO $$
DECLARE
    constraint_info TEXT;
BEGIN
    SELECT pg_get_constraintdef(oid) INTO constraint_info
    FROM pg_constraint
    WHERE conname = 'inventory_log_type_check';
    
    IF constraint_info IS NOT NULL THEN
        RAISE NOTICE 'قيد inventory_log_type_check الحالي: %', constraint_info;
    ELSE
        RAISE NOTICE 'قيد inventory_log_type_check غير موجود';
    END IF;
END;
$$; 