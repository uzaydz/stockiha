-- إنشاء جدول لحفظ معلومات Facebook Catalogs
CREATE TABLE IF NOT EXISTS facebook_catalogs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    catalog_id VARCHAR(255) NOT NULL UNIQUE,
    catalog_name VARCHAR(255) NOT NULL,
    business_id VARCHAR(255) NOT NULL,
    feed_url TEXT,
    pixel_id VARCHAR(255),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_facebook_catalogs_catalog_id ON facebook_catalogs(catalog_id);
CREATE INDEX IF NOT EXISTS idx_facebook_catalogs_business_id ON facebook_catalogs(business_id);
CREATE INDEX IF NOT EXISTS idx_facebook_catalogs_organization_id ON facebook_catalogs(organization_id);

-- إضافة RLS (Row Level Security)
ALTER TABLE facebook_catalogs ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسة للوصول للبيانات
CREATE POLICY "Users can view their organization's catalogs" ON facebook_catalogs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert catalogs for their organization" ON facebook_catalogs
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's catalogs" ON facebook_catalogs
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- إنشاء trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_facebook_catalogs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_facebook_catalogs_updated_at
    BEFORE UPDATE ON facebook_catalogs
    FOR EACH ROW
    EXECUTE FUNCTION update_facebook_catalogs_updated_at(); 