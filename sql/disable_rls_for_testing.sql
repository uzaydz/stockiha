-- ===============================================
-- تعطيل RLS مؤقتاً للاختبار
-- ===============================================

-- تعطيل RLS مؤقتاً على الجدولين
ALTER TABLE visitor_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE page_views DISABLE ROW LEVEL SECURITY;

-- التحقق من الحالة
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('visitor_sessions', 'page_views'); 