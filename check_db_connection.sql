-- ملف check_db_connection.sql
-- التحقق من الاتصال بقاعدة البيانات وحالة الجداول

-- 1. التحقق من وجود الجداول الرئيسية في النظام
DO $$
BEGIN
    -- طباعة رسالة ترحيبية
    RAISE NOTICE 'بدء اختبار اتصال قاعدة البيانات...';
    
    -- التحقق من وجود الجداول المطلوبة
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_log') THEN
        RAISE NOTICE 'جدول inventory_log موجود ✓';
    ELSE
        RAISE NOTICE 'جدول inventory_log غير موجود ✗';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'online_orders') THEN
        RAISE NOTICE 'جدول online_orders موجود ✓';
    ELSE
        RAISE NOTICE 'جدول online_orders غير موجود ✗';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        RAISE NOTICE 'جدول orders موجود ✓';
    ELSE
        RAISE NOTICE 'جدول orders غير موجود ✗';
    END IF;
    
    -- التحقق من وجود إجراءات معالجة الطلبات
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'process_online_order_new'
    ) THEN
        RAISE NOTICE 'إجراء process_online_order_new موجود ✓';
    ELSE
        RAISE NOTICE 'إجراء process_online_order_new غير موجود ✗';
    END IF;
    
    -- التحقق من قيد CHECK المحدد في inventory_log
    DECLARE
        constraint_info TEXT;
    BEGIN
        SELECT pg_get_constraintdef(oid) INTO constraint_info
        FROM pg_constraint
        WHERE conname = 'inventory_log_type_check';
        
        IF constraint_info IS NOT NULL THEN
            RAISE NOTICE 'قيد inventory_log_type_check موجود: %', constraint_info;
        ELSE
            RAISE NOTICE 'قيد inventory_log_type_check غير موجود ✗';
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'خطأ أثناء التحقق من قيد CHECK: %', SQLERRM;
    END;
    
    -- التحقق من المشكلة في حقل type
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_log' AND column_name = 'type') THEN
        RAISE NOTICE 'حقل type موجود في جدول inventory_log ✓';
    ELSE
        RAISE NOTICE 'حقل type غير موجود في جدول inventory_log ✗';
    END IF;
    
    RAISE NOTICE 'اكتمل اختبار اتصال قاعدة البيانات';
END;
$$; 