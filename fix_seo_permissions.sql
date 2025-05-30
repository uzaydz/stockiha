-- إصلاح صلاحيات جداول SEO
-- تعطيل RLS مؤقتاً للسماح بالوصول

-- تعطيل RLS على جميع جداول SEO
ALTER TABLE seo_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE seo_page_meta DISABLE ROW LEVEL SECURITY;
ALTER TABLE seo_robots_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE seo_sitemap_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE seo_structured_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE seo_performance_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keywords DISABLE ROW LEVEL SECURITY;
ALTER TABLE seo_redirects DISABLE ROW LEVEL SECURITY;
ALTER TABLE seo_crawl_log DISABLE ROW LEVEL SECURITY;

-- منح الصلاحيات للمستخدمين المصرح لهم
GRANT ALL ON seo_settings TO authenticated;
GRANT ALL ON seo_page_meta TO authenticated;
GRANT ALL ON seo_robots_rules TO authenticated;
GRANT ALL ON seo_sitemap_entries TO authenticated;
GRANT ALL ON seo_structured_data TO authenticated;
GRANT ALL ON seo_performance_metrics TO authenticated;
GRANT ALL ON seo_keywords TO authenticated;
GRANT ALL ON seo_redirects TO authenticated;
GRANT ALL ON seo_crawl_log TO authenticated;

-- منح الصلاحيات على التسلسلات (sequences) إن وجدت
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- إعادة إنشاء سياسات RLS مع تحسينات
ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_page_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_robots_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_sitemap_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_structured_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_crawl_log ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات RLS محدثة للسماح للمستخدمين المصادق عليهم بالوصول
-- (مؤقتاً حتى نتمكن من إصلاح مشكلة is_super_admin)

-- seo_settings
DROP POLICY IF EXISTS "Allow authenticated users to view SEO settings" ON seo_settings;
CREATE POLICY "Allow authenticated users to view SEO settings" ON seo_settings
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage SEO settings" ON seo_settings;
CREATE POLICY "Allow authenticated users to manage SEO settings" ON seo_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- seo_page_meta
DROP POLICY IF EXISTS "Allow authenticated users to manage page meta" ON seo_page_meta;
CREATE POLICY "Allow authenticated users to manage page meta" ON seo_page_meta
    FOR ALL USING (auth.role() = 'authenticated');

-- seo_robots_rules
DROP POLICY IF EXISTS "Allow authenticated users to manage robots rules" ON seo_robots_rules;
CREATE POLICY "Allow authenticated users to manage robots rules" ON seo_robots_rules
    FOR ALL USING (auth.role() = 'authenticated');

-- seo_sitemap_entries
DROP POLICY IF EXISTS "Allow authenticated users to manage sitemap" ON seo_sitemap_entries;
CREATE POLICY "Allow authenticated users to manage sitemap" ON seo_sitemap_entries
    FOR ALL USING (auth.role() = 'authenticated');

-- seo_structured_data
DROP POLICY IF EXISTS "Allow authenticated users to manage structured data" ON seo_structured_data;
CREATE POLICY "Allow authenticated users to manage structured data" ON seo_structured_data
    FOR ALL USING (auth.role() = 'authenticated');

-- seo_performance_metrics
DROP POLICY IF EXISTS "Allow authenticated users to manage performance metrics" ON seo_performance_metrics;
CREATE POLICY "Allow authenticated users to manage performance metrics" ON seo_performance_metrics
    FOR ALL USING (auth.role() = 'authenticated');

-- seo_keywords
DROP POLICY IF EXISTS "Allow authenticated users to manage keywords" ON seo_keywords;
CREATE POLICY "Allow authenticated users to manage keywords" ON seo_keywords
    FOR ALL USING (auth.role() = 'authenticated');

-- seo_redirects
DROP POLICY IF EXISTS "Allow authenticated users to manage redirects" ON seo_redirects;
CREATE POLICY "Allow authenticated users to manage redirects" ON seo_redirects
    FOR ALL USING (auth.role() = 'authenticated');

-- seo_crawl_log
DROP POLICY IF EXISTS "Allow authenticated users to view crawl log" ON seo_crawl_log;
CREATE POLICY "Allow authenticated users to view crawl log" ON seo_crawl_log
    FOR ALL USING (auth.role() = 'authenticated');