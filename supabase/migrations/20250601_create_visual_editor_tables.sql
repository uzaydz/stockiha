-- Create visual editor tables with super_ prefix

-- 1. Themes table
CREATE TABLE IF NOT EXISTS super_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  colors JSONB NOT NULL DEFAULT '{
    "primary": "#3B82F6",
    "secondary": "#6B7280",
    "accent": "#10B981",
    "background": "#FFFFFF",
    "text": "#1F2937",
    "border": "#E5E7EB"
  }',
  typography JSONB NOT NULL DEFAULT '{
    "fontFamily": "Inter, system-ui, sans-serif",
    "fontSize": {"base": "16px", "heading": "24px"},
    "fontWeight": {"normal": 400, "medium": 500, "bold": 700}
  }',
  spacing JSONB NOT NULL DEFAULT '{
    "unit": 4,
    "scale": [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64]
  }',
  border_radius JSONB NOT NULL DEFAULT '{
    "small": "0.25rem",
    "medium": "0.5rem",
    "large": "0.75rem",
    "full": "9999px"
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Section templates table
CREATE TABLE IF NOT EXISTS super_section_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('hero', 'products', 'features', 'testimonials', 'cta', 'footer', 'custom')),
  thumbnail_url TEXT,
  elements JSONB NOT NULL DEFAULT '[]',
  default_props JSONB DEFAULT '{}',
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Pages table
CREATE TABLE IF NOT EXISTS super_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  theme_id UUID REFERENCES super_themes(id) ON DELETE SET NULL,
  sections JSONB NOT NULL DEFAULT '[]',
  metadata JSONB DEFAULT '{
    "seo": {},
    "analytics": {}
  }',
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

-- 4. Media library table
CREATE TABLE IF NOT EXISTS super_media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Edit history table (for versioning)
CREATE TABLE IF NOT EXISTS super_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES super_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'publish', 'unpublish', 'delete')),
  changes JSONB NOT NULL,
  snapshot JSONB, -- Full page state at this point
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Page analytics table
CREATE TABLE IF NOT EXISTS super_page_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES super_pages(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2),
  avg_time_on_page INTEGER, -- in seconds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_id, date)
);

-- Create indexes
CREATE INDEX idx_super_themes_tenant ON super_themes(tenant_id);
CREATE INDEX idx_super_pages_tenant ON super_pages(tenant_id);
CREATE INDEX idx_super_pages_slug ON super_pages(tenant_id, slug);
CREATE INDEX idx_super_pages_published ON super_pages(published);
CREATE INDEX idx_super_media_tenant ON super_media_library(tenant_id);
CREATE INDEX idx_super_edit_history_page ON super_edit_history(page_id);
CREATE INDEX idx_super_page_analytics_page_date ON super_page_analytics(page_id, date);

-- Enable RLS
ALTER TABLE super_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_section_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_page_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Themes: Users can view and edit their tenant's themes
CREATE POLICY "Users can view their tenant themes"
  ON super_themes FOR SELECT
  USING (tenant_id = auth.uid()::uuid OR tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage their tenant themes"
  ON super_themes FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Section templates: Everyone can view templates
CREATE POLICY "Anyone can view section templates"
  ON super_section_templates FOR SELECT
  USING (true);

-- Pages: Users can manage their tenant's pages
CREATE POLICY "Users can view published pages"
  ON super_pages FOR SELECT
  USING (published = true OR tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage their tenant pages"
  ON super_pages FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Media library: Users can manage their tenant's media
CREATE POLICY "Users can manage their tenant media"
  ON super_media_library FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Edit history: Users can view their tenant's edit history
CREATE POLICY "Users can view their tenant edit history"
  ON super_edit_history FOR SELECT
  USING (page_id IN (
    SELECT id FROM super_pages WHERE tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  ));

-- Page analytics: Users can view their tenant's analytics
CREATE POLICY "Users can view their tenant analytics"
  ON super_page_analytics FOR SELECT
  USING (page_id IN (
    SELECT id FROM super_pages WHERE tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  ));

-- Insert default templates
INSERT INTO super_section_templates (name, category, elements) VALUES
  ('Hero Modern', 'hero', '[{"type": "container", "id": "hero-1", "children": [{"type": "text", "id": "heading", "content": "Welcome to Our Store"}, {"type": "text", "id": "subheading", "content": "Discover amazing products"}, {"type": "button", "id": "cta", "content": "Shop Now"}]}]'),
  ('Product Grid', 'products', '[{"type": "container", "id": "products-1", "children": [{"type": "text", "id": "title", "content": "Featured Products"}]}]'),
  ('Testimonials Carousel', 'testimonials', '[{"type": "container", "id": "testimonials-1", "children": [{"type": "text", "id": "title", "content": "What Our Customers Say"}]}]'),
  ('Simple Footer', 'footer', '[{"type": "container", "id": "footer-1", "children": [{"type": "text", "id": "copyright", "content": "© 2025 Your Store. All rights reserved."}]}]');

-- Functions
CREATE OR REPLACE FUNCTION super_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_super_themes_updated_at
  BEFORE UPDATE ON super_themes
  FOR EACH ROW
  EXECUTE FUNCTION super_update_updated_at();

CREATE TRIGGER update_super_pages_updated_at
  BEFORE UPDATE ON super_pages
  FOR EACH ROW
  EXECUTE FUNCTION super_update_updated_at();

CREATE TRIGGER update_super_section_templates_updated_at
  BEFORE UPDATE ON super_section_templates
  FOR EACH ROW
  EXECUTE FUNCTION super_update_updated_at();