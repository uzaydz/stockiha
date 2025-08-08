-- ===============================================
-- 🔧 إصلاح نظام الإشعارات الفوري (Realtime Notifications)
-- ===============================================

-- 🔧 تفعيل Realtime لجدول الإشعارات
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 🔧 إنشاء دالة مساعدة لفحص حالة Realtime
CREATE OR REPLACE FUNCTION check_realtime_status()
RETURNS TABLE(
  table_name TEXT,
  is_published BOOLEAN,
  publication_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || tablename as table_name,
    pubname IS NOT NULL as is_published,
    COALESCE(pubname, 'Not published') as publication_name
  FROM pg_tables pt
  LEFT JOIN pg_publication_tables ppt ON pt.schemaname = ppt.schemaname AND pt.tablename = ppt.tablename
  WHERE pt.schemaname = 'public' 
    AND pt.tablename IN ('notifications', 'online_orders', 'products');
END;
$$ LANGUAGE plpgsql;

-- 🔧 دالة لتفعيل Realtime لجميع الجداول المطلوبة
CREATE OR REPLACE FUNCTION enable_realtime_for_notifications()
RETURNS void AS $$
BEGIN
  -- تفعيل Realtime لجدول الإشعارات
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  
  -- تفعيل Realtime لجدول الطلبيات الأونلاين
  ALTER PUBLICATION supabase_realtime ADD TABLE online_orders;
  
  -- تفعيل Realtime لجدول المنتجات
  ALTER PUBLICATION supabase_realtime ADD TABLE products;
  
  RAISE NOTICE '✅ تم تفعيل Realtime لجميع الجداول المطلوبة';
END;
$$ LANGUAGE plpgsql;

-- 🔧 دالة لفحص وإصلاح إعدادات RLS للإشعارات
CREATE OR REPLACE FUNCTION fix_notification_rls()
RETURNS void AS $$
BEGIN
  -- تفعيل RLS
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  
  -- حذف السياسات القديمة إذا وجدت
  DROP POLICY IF EXISTS "Allow users to view their organization notifications" ON notifications;
  DROP POLICY IF EXISTS "Allow staff to insert notifications" ON notifications;
  DROP POLICY IF EXISTS "Allow users to update read status" ON notifications;
  
  -- إنشاء سياسات جديدة محسنة
  CREATE POLICY "Allow users to view their organization notifications" 
  ON notifications FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );
  
  CREATE POLICY "Allow staff to insert notifications" 
  ON notifications FOR INSERT 
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'employee')
    )
  );
  
  CREATE POLICY "Allow users to update read status" 
  ON notifications FOR UPDATE 
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );
  
  RAISE NOTICE '✅ تم إصلاح سياسات RLS للإشعارات';
END;
$$ LANGUAGE plpgsql;

-- 🔧 دالة لإنشاء فهارس محسنة للإشعارات
CREATE OR REPLACE FUNCTION optimize_notification_indexes()
RETURNS void AS $$
BEGIN
  -- إنشاء فهارس محسنة
  CREATE INDEX IF NOT EXISTS idx_notifications_org_created ON notifications(organization_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_notifications_org_type ON notifications(organization_id, type);
  CREATE INDEX IF NOT EXISTS idx_notifications_org_priority ON notifications(organization_id, priority);
  CREATE INDEX IF NOT EXISTS idx_notifications_org_unread ON notifications(organization_id, is_read) WHERE is_read = FALSE;
  
  RAISE NOTICE '✅ تم إنشاء الفهارس المحسنة للإشعارات';
END;
$$ LANGUAGE plpgsql;

-- 🔧 دالة شاملة لإصلاح نظام الإشعارات
CREATE OR REPLACE FUNCTION fix_notification_system()
RETURNS void AS $$
BEGIN
  -- تفعيل Realtime
  PERFORM enable_realtime_for_notifications();
  
  -- إصلاح RLS
  PERFORM fix_notification_rls();
  
  -- تحسين الفهارس
  PERFORM optimize_notification_indexes();
  
  RAISE NOTICE '✅ تم إصلاح نظام الإشعارات بالكامل';
END;
$$ LANGUAGE plpgsql;

-- 🔧 تشغيل الإصلاح الشامل
SELECT fix_notification_system();

-- 🔧 فحص حالة Realtime
SELECT * FROM check_realtime_status();

-- 🔧 إنشاء دالة لمراقبة أداء الإشعارات
CREATE OR REPLACE FUNCTION get_notification_performance_stats()
RETURNS TABLE(
  total_notifications BIGINT,
  unread_count BIGINT,
  urgent_count BIGINT,
  avg_response_time_ms NUMERIC,
  last_notification_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_notifications,
    COUNT(CASE WHEN NOT is_read THEN 1 END)::BIGINT as unread_count,
    COUNT(CASE WHEN priority = 'urgent' THEN 1 END)::BIGINT as urgent_count,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) * 1000)::NUMERIC as avg_response_time_ms,
    MAX(created_at) as last_notification_time
  FROM notifications;
END;
$$ LANGUAGE plpgsql;

-- 🔧 دالة لتنظيف الإشعارات القديمة تلقائياً
CREATE OR REPLACE FUNCTION cleanup_old_notifications_auto()
RETURNS void AS $$
BEGIN
  -- حذف الإشعارات المقروءة الأقدم من 30 يوم
  DELETE FROM notifications 
  WHERE is_read = TRUE 
    AND created_at < NOW() - INTERVAL '30 days';
    
  -- حذف الإشعارات غير المقروءة الأقدم من 90 يوم
  DELETE FROM notifications 
  WHERE is_read = FALSE 
    AND created_at < NOW() - INTERVAL '90 days';
    
  RAISE NOTICE '🧹 تم تنظيف الإشعارات القديمة';
END;
$$ LANGUAGE plpgsql;

-- 🔧 إنشاء Cron job لتنظيف الإشعارات (إذا كان pg_cron متوفر)
-- SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications_auto();');

-- 🔧 دالة لفحص صحة نظام الإشعارات
CREATE OR REPLACE FUNCTION diagnose_notification_system()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- فحص وجود جدول الإشعارات
  RETURN QUERY
  SELECT 
    'Table exists'::TEXT,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') 
         THEN 'OK' ELSE 'FAIL' END::TEXT,
    'Checking if notifications table exists'::TEXT;
    
  -- فحص RLS
  RETURN QUERY
  SELECT 
    'RLS enabled'::TEXT,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notifications' AND rowsecurity = true) 
         THEN 'OK' ELSE 'FAIL' END::TEXT,
    'Checking if RLS is enabled'::TEXT;
    
  -- فحص Realtime
  RETURN QUERY
  SELECT 
    'Realtime enabled'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE tablename = 'notifications' AND pubname = 'supabase_realtime'
    ) THEN 'OK' ELSE 'FAIL' END::TEXT,
    'Checking if Realtime is enabled'::TEXT;
    
  -- فحص الفهارس
  RETURN QUERY
  SELECT 
    'Indexes exist'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'notifications' AND indexname LIKE 'idx_notifications%'
    ) THEN 'OK' ELSE 'FAIL' END::TEXT,
    'Checking if performance indexes exist'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 🔧 تشغيل التشخيص
SELECT * FROM diagnose_notification_system();

-- 🔧 معلومات إضافية للتشخيص
SELECT 
  'Performance Stats' as info_type,
  total_notifications::TEXT as value
FROM get_notification_performance_stats()
UNION ALL
SELECT 
  'Unread Count' as info_type,
  unread_count::TEXT as value
FROM get_notification_performance_stats()
UNION ALL
SELECT 
  'Urgent Count' as info_type,
  urgent_count::TEXT as value
FROM get_notification_performance_stats(); 