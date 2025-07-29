-- حذف الدوال القديمة وإعادة إنشائها مع الإصلاحات

-- 1. حذف الدوال القديمة
DROP FUNCTION IF EXISTS update_product_complete(UUID, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, UUID);
DROP FUNCTION IF EXISTS create_product_complete(JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, UUID);

-- 2. إعادة إنشاء الدوال المُصححة
\i database/functions/create_product_complete.sql
\i database/functions/update_product_complete.sql

-- 3. التحقق من نجاح العملية
SELECT 'Product functions recreated successfully!' as status;
