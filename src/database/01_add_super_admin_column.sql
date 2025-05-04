-- إضافة عمود is_super_admin إلى جدول users
-- يجب تنفيذ هذا الملف أولاً قبل إنشاء السياسات

-- إضافة عمود is_super_admin
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- إضافة تعليق
COMMENT ON COLUMN public.users.is_super_admin IS 'Flag to indicate if the user is a super admin with access to all organizations';

-- تأكيد نجاح العملية
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- التحقق من وجود العمود
    SELECT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'is_super_admin'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE 'Success: Column is_super_admin exists in users table';
    ELSE
        RAISE EXCEPTION 'Error: Failed to create is_super_admin column';
    END IF;
END
$$; 