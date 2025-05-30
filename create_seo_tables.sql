-- إنشاء جدول إعدادات SEO الرئيسية
CREATE TABLE IF NOT EXISTS seo_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_title TEXT NOT NULL,
    site_description TEXT,
    site_keywords TEXT[],
    default_og_image TEXT,
    google_analytics_id TEXT,
    google_search_console_key TEXT,
    facebook_pixel_id TEXT,
    twitter_handle TEXT,
    enable_sitemap BOOLEAN DEFAULT true,
    enable_robots_txt BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول Meta Tags للصفحات
CREATE TABLE IF NOT EXISTS seo_page_meta (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_path TEXT UNIQUE NOT NULL,
    title TEXT,
    description TEXT,
    keywords TEXT[],
    og_title TEXT,
    og_description TEXT,
    og_image TEXT,
    og_type TEXT DEFAULT 'website',
    twitter_card TEXT DEFAULT 'summary_large_image',
    canonical_url TEXT,
    no_index BOOLEAN DEFAULT false,
    no_follow BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول إعدادات robots.txt
CREATE TABLE IF NOT EXISTS seo_robots_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_agent TEXT NOT NULL DEFAULT '*',
    allow_paths TEXT[],
    disallow_paths TEXT[],
    crawl_delay INTEGER,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول Sitemap
CREATE TABLE IF NOT EXISTS seo_sitemap_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    last_modified TIMESTAMPTZ DEFAULT NOW(),
    change_frequency TEXT CHECK (change_frequency IN ('always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never')),
    priority DECIMAL(2,1) CHECK (priority >= 0 AND priority <= 1),
    include_in_sitemap BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول Structured Data (Schema.org)
CREATE TABLE IF NOT EXISTS seo_structured_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_path TEXT,
    schema_type TEXT NOT NULL,
    schema_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول تتبع الأداء
CREATE TABLE IF NOT EXISTS seo_performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_url TEXT NOT NULL,
    metric_date DATE NOT NULL,
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2),
    avg_time_on_page INTERVAL,
    organic_traffic INTEGER DEFAULT 0,
    click_through_rate DECIMAL(5,2),
    impressions INTEGER DEFAULT 0,
    position DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(page_url, metric_date)
);

-- إنشاء جدول كلمات البحث
CREATE TABLE IF NOT EXISTS seo_keywords (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    keyword TEXT NOT NULL,
    search_volume INTEGER,
    difficulty DECIMAL(3,1),
    current_position INTEGER,
    target_page TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول Redirects
CREATE TABLE IF NOT EXISTS seo_redirects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_path TEXT UNIQUE NOT NULL,
    to_path TEXT NOT NULL,
    redirect_type INTEGER CHECK (redirect_type IN (301, 302, 307, 308)) DEFAULT 301,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول سجل الزحف
CREATE TABLE IF NOT EXISTS seo_crawl_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    crawler_name TEXT,
    ip_address INET,
    user_agent TEXT,
    requested_url TEXT,
    status_code INTEGER,
    response_time_ms INTEGER,
    crawled_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_seo_page_meta_path ON seo_page_meta(page_path);
CREATE INDEX idx_seo_sitemap_url ON seo_sitemap_entries(url);
CREATE INDEX idx_seo_structured_data_path ON seo_structured_data(page_path);
CREATE INDEX idx_seo_performance_url_date ON seo_performance_metrics(page_url, metric_date);
CREATE INDEX idx_seo_redirects_from ON seo_redirects(from_path) WHERE is_active = true;
CREATE INDEX idx_seo_crawl_log_date ON seo_crawl_log(crawled_at);

-- إنشاء Triggers للتحديث التلقائي
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seo_settings_updated_at
    BEFORE UPDATE ON seo_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_seo_page_meta_updated_at
    BEFORE UPDATE ON seo_page_meta
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_seo_sitemap_entries_updated_at
    BEFORE UPDATE ON seo_sitemap_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_seo_structured_data_updated_at
    BEFORE UPDATE ON seo_structured_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_seo_keywords_updated_at
    BEFORE UPDATE ON seo_keywords
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- إنشاء RLS Policies
ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_page_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_robots_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_sitemap_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_structured_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_crawl_log ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للـ Super Admin فقط
CREATE POLICY "Super Admin can manage SEO settings" ON seo_settings
    FOR ALL USING (auth.jwt() ->> 'is_super_admin' = 'true');

CREATE POLICY "Super Admin can manage page meta" ON seo_page_meta
    FOR ALL USING (auth.jwt() ->> 'is_super_admin' = 'true');

CREATE POLICY "Super Admin can manage robots rules" ON seo_robots_rules
    FOR ALL USING (auth.jwt() ->> 'is_super_admin' = 'true');

CREATE POLICY "Super Admin can manage sitemap" ON seo_sitemap_entries
    FOR ALL USING (auth.jwt() ->> 'is_super_admin' = 'true');

CREATE POLICY "Super Admin can manage structured data" ON seo_structured_data
    FOR ALL USING (auth.jwt() ->> 'is_super_admin' = 'true');

CREATE POLICY "Super Admin can view performance metrics" ON seo_performance_metrics
    FOR ALL USING (auth.jwt() ->> 'is_super_admin' = 'true');

CREATE POLICY "Super Admin can manage keywords" ON seo_keywords
    FOR ALL USING (auth.jwt() ->> 'is_super_admin' = 'true');

CREATE POLICY "Super Admin can manage redirects" ON seo_redirects
    FOR ALL USING (auth.jwt() ->> 'is_super_admin' = 'true');

CREATE POLICY "Super Admin can view crawl log" ON seo_crawl_log
    FOR ALL USING (auth.jwt() ->> 'is_super_admin' = 'true');

-- إدراج إعدادات افتراضية
INSERT INTO seo_settings (
    site_title,
    site_description,
    site_keywords,
    enable_sitemap,
    enable_robots_txt
) VALUES (
    'موقع التراث الثقافي الجزائري',
    'اكتشف ثراء التراث الثقافي الجزائري',
    ARRAY['التراث', 'الثقافة', 'الجزائر', 'الفن', 'التاريخ'],
    true,
    true
) ON CONFLICT DO NOTHING;

-- إدراج قواعد robots.txt افتراضية
INSERT INTO seo_robots_rules (user_agent, disallow_paths, allow_paths, priority) VALUES
    ('*', ARRAY['/admin/', '/api/', '/private/'], ARRAY['/'], 1),
    ('Googlebot', ARRAY[], ARRAY['/'], 2)
ON CONFLICT DO NOTHING;