-- =====================================================
-- حذف نظام إدارة الموظفين القديم بالكامل
-- =====================================================

-- حذف الـ RPC functions
DROP FUNCTION IF EXISTS get_pos_staff_sessions(UUID) CASCADE;
DROP FUNCTION IF EXISTS save_pos_staff_session(UUID, VARCHAR, VARCHAR, JSONB, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS update_staff_pin(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS delete_pos_staff_session(UUID) CASCADE;

-- حذف الـ trigger function
DROP FUNCTION IF EXISTS update_pos_staff_sessions_updated_at() CASCADE;

-- حذف الجدول (سيحذف الـ triggers تلقائياً)
DROP TABLE IF EXISTS pos_staff_sessions CASCADE;

-- رسالة نجاح
DO $$ 
BEGIN 
    RAISE NOTICE 'تم حذف نظام إدارة الموظفين القديم بنجاح. يمكنك الآن تطبيق pos_staff_sessions_schema.sql'; 
END $$;
