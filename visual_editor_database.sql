-- ===============================================
-- قاعدة بيانات المحرر المرئي للمتجر
-- Visual Store Editor Database Schema
-- ===============================================

-- تفعيل الإضافات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- 1. جدول السمات (Themes)
-- ===============================================
CREATE TABLE IF NOT EXISTS super_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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

-- ===============================================
-- 2. جدول قوالب الأقسام (Section Templates)
-- ===============================================
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

-- ===============================================
-- 3. جدول الصفحات (Pages)
-- ===============================================
CREATE TABLE IF NOT EXISTS super_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    theme_id UUID REFERENCES super_themes(id) ON DELETE SET NULL,
    sections JSONB NOT NULL DEFAULT '[]',
    metadata JSONB DEFAULT '{
        "seo": {
            "title": null,
            "description": null,
            "keywords": [],
            "ogImage": null
        },
        "analytics": {
            "gaId": null,
            "fbPixelId": null
        }
    }',
    published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

-- ===============================================
-- 4. جدول مكتبة الوسائط (Media Library)
-- ===============================================
CREATE TABLE IF NOT EXISTS super_media_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    width INTEGER,
    height INTEGER,
    alt TEXT,
    tags TEXT[] DEFAULT '{}',
    folder VARCHAR(255) DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- 5. جدول سجل التعديلات (Edit History)
-- ===============================================
CREATE TABLE IF NOT EXISTS super_edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES super_pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'publish', 'unpublish', 'delete', 'revert')),
    changes JSONB NOT NULL,
    snapshot JSONB, -- حالة الصفحة الكاملة في هذه النقطة
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- 6. جدول تحليلات الصفحات (Page Analytics)
-- ===============================================
CREATE TABLE IF NOT EXISTS super_page_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES super_pages(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2),
    avg_time_on_page INTEGER, -- بالثواني
    conversion_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(page_id, date)
);

-- ===============================================
-- 7. جدول المكونات المخصصة (Custom Components)
-- ===============================================
CREATE TABLE IF NOT EXISTS super_custom_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    html TEXT,
    css TEXT,
    js TEXT,
    props JSONB DEFAULT '{}',
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- 8. جدول الأنماط العامة (Global Styles)
-- ===============================================
CREATE TABLE IF NOT EXISTS super_global_styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'css', 'scss', 'tailwind'
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- 9. الفهارس (Indexes)
-- ===============================================
CREATE INDEX idx_super_themes_tenant ON super_themes(tenant_id);
CREATE INDEX idx_super_themes_default ON super_themes(is_default);

CREATE INDEX idx_super_pages_tenant ON super_pages(tenant_id);
CREATE INDEX idx_super_pages_slug ON super_pages(tenant_id, slug);
CREATE INDEX idx_super_pages_published ON super_pages(published);
CREATE INDEX idx_super_pages_theme ON super_pages(theme_id);

CREATE INDEX idx_super_media_tenant ON super_media_library(tenant_id);
CREATE INDEX idx_super_media_folder ON super_media_library(tenant_id, folder);
CREATE INDEX idx_super_media_mime ON super_media_library(mime_type);

CREATE INDEX idx_super_edit_history_page ON super_edit_history(page_id);
CREATE INDEX idx_super_edit_history_user ON super_edit_history(user_id);
CREATE INDEX idx_super_edit_history_created ON super_edit_history(created_at DESC);

CREATE INDEX idx_super_page_analytics_page_date ON super_page_analytics(page_id, date);

-- ===============================================
-- 10. تفعيل RLS (Row Level Security)
-- ===============================================
ALTER TABLE super_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_section_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_custom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_global_styles ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- 11. سياسات الأمان (RLS Policies)
-- ===============================================

-- سياسات السمات (Themes)
CREATE POLICY "Users can view their tenant themes"
    ON super_themes FOR SELECT
    USING (
        tenant_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage their tenant themes"
    ON super_themes FOR ALL
    USING (
        tenant_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- سياسات قوالب الأقسام (يمكن للجميع رؤيتها)
CREATE POLICY "Anyone can view section templates"
    ON super_section_templates FOR SELECT
    USING (true);

-- سياسات الصفحات
CREATE POLICY "Anyone can view published pages"
    ON super_pages FOR SELECT
    USING (published = true);

CREATE POLICY "Users can view their tenant pages"
    ON super_pages FOR SELECT
    USING (
        tenant_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their tenant pages"
    ON super_pages FOR ALL
    USING (
        tenant_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- سياسات مكتبة الوسائط
CREATE POLICY "Users can view their tenant media"
    ON super_media_library FOR SELECT
    USING (
        tenant_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their tenant media"
    ON super_media_library FOR ALL
    USING (
        tenant_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- سياسات سجل التعديلات
CREATE POLICY "Users can view their page edit history"
    ON super_edit_history FOR SELECT
    USING (
        page_id IN (
            SELECT id FROM super_pages 
            WHERE tenant_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- سياسات تحليلات الصفحات
CREATE POLICY "Users can view their page analytics"
    ON super_page_analytics FOR SELECT
    USING (
        page_id IN (
            SELECT id FROM super_pages 
            WHERE tenant_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- ===============================================
-- 12. الدوال المساعدة (Helper Functions)
-- ===============================================

-- دالة تحديث الوقت
CREATE OR REPLACE FUNCTION super_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة حفظ سجل التعديلات
CREATE OR REPLACE FUNCTION super_save_edit_history()
RETURNS TRIGGER AS $$
BEGIN
    -- حفظ سجل التعديل عند تحديث الصفحة
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO super_edit_history (
            page_id,
            user_id,
            action,
            changes,
            snapshot
        ) VALUES (
            NEW.id,
            auth.uid(),
            'update',
            jsonb_build_object(
                'old', row_to_json(OLD),
                'new', row_to_json(NEW)
            ),
            row_to_json(NEW)::jsonb
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة نشر الصفحة
CREATE OR REPLACE FUNCTION super_publish_page(page_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE super_pages
    SET 
        published = true,
        published_at = NOW()
    WHERE id = page_id;
    
    -- حفظ في سجل التعديلات
    INSERT INTO super_edit_history (
        page_id,
        user_id,
        action,
        changes
    ) VALUES (
        page_id,
        auth.uid(),
        'publish',
        jsonb_build_object('published', true, 'published_at', NOW())
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- دالة إلغاء نشر الصفحة
CREATE OR REPLACE FUNCTION super_unpublish_page(page_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE super_pages
    SET 
        published = false,
        published_at = NULL
    WHERE id = page_id;
    
    -- حفظ في سجل التعديلات
    INSERT INTO super_edit_history (
        page_id,
        user_id,
        action,
        changes
    ) VALUES (
        page_id,
        auth.uid(),
        'unpublish',
        jsonb_build_object('published', false)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 13. المشغلات (Triggers)
-- ===============================================

-- مشغلات تحديث الوقت
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

CREATE TRIGGER update_super_custom_components_updated_at
    BEFORE UPDATE ON super_custom_components
    FOR EACH ROW
    EXECUTE FUNCTION super_update_updated_at();

CREATE TRIGGER update_super_global_styles_updated_at
    BEFORE UPDATE ON super_global_styles
    FOR EACH ROW
    EXECUTE FUNCTION super_update_updated_at();

-- مشغل حفظ سجل التعديلات
CREATE TRIGGER save_page_edit_history
    AFTER UPDATE ON super_pages
    FOR EACH ROW
    EXECUTE FUNCTION super_save_edit_history();

-- ===============================================
-- 14. البيانات الأولية (Initial Data)
-- ===============================================

-- إدراج قوالب الأقسام الافتراضية
INSERT INTO super_section_templates (name, category, elements, default_props) VALUES
    -- قوالب Hero
    ('Hero عصري', 'hero', '[
        {
            "id": "hero-container",
            "type": "container",
            "children": [
                {"id": "heading", "type": "text", "content": "مرحباً بك في متجرنا"},
                {"id": "subheading", "type": "text", "content": "اكتشف مجموعة رائعة من المنتجات"},
                {"id": "cta", "type": "button", "content": "تسوق الآن"}
            ]
        }
    ]', '{
        "backgroundImage": "",
        "overlayColor": "#000000",
        "overlayOpacity": 0.5,
        "minHeight": "500px",
        "textAlign": "center",
        "textColor": "#FFFFFF"
    }'),
    
    ('Hero بسيط', 'hero', '[
        {
            "id": "hero-simple",
            "type": "container",
            "children": [
                {"id": "heading", "type": "text", "content": "العنوان الرئيسي"},
                {"id": "subheading", "type": "text", "content": "النص الفرعي"}
            ]
        }
    ]', '{
        "backgroundColor": "#F3F4F6",
        "textColor": "#1F2937",
        "padding": "60px 20px"
    }'),
    
    -- قوالب المنتجات
    ('شبكة المنتجات', 'products', '[
        {
            "id": "products-grid",
            "type": "container",
            "children": [
                {"id": "title", "type": "text", "content": "منتجاتنا المميزة"},
                {"id": "products", "type": "products-grid", "content": ""}
            ]
        }
    ]', '{
        "columns": 4,
        "gap": "20px",
        "showPrice": true,
        "showAddToCart": true
    }'),
    
    ('كاروسيل المنتجات', 'products', '[
        {
            "id": "products-carousel",
            "type": "container",
            "children": [
                {"id": "title", "type": "text", "content": "أحدث المنتجات"},
                {"id": "products", "type": "products-carousel", "content": ""}
            ]
        }
    ]', '{
        "slidesPerView": 4,
        "autoplay": true,
        "loop": true
    }'),
    
    -- قوالب المميزات
    ('مميزات بأيقونات', 'features', '[
        {
            "id": "features-icons",
            "type": "container",
            "children": [
                {"id": "title", "type": "text", "content": "لماذا تختارنا؟"},
                {"id": "features", "type": "features-list", "content": ""}
            ]
        }
    ]', '{
        "columns": 3,
        "iconStyle": "filled",
        "iconColor": "#3B82F6"
    }'),
    
    -- قوالب الشهادات
    ('كاروسيل الشهادات', 'testimonials', '[
        {
            "id": "testimonials-carousel",
            "type": "container",
            "children": [
                {"id": "title", "type": "text", "content": "ماذا يقول عملاؤنا"},
                {"id": "testimonials", "type": "testimonials-carousel", "content": ""}
            ]
        }
    ]', '{
        "slidesPerView": 3,
        "showRating": true,
        "autoplay": true
    }'),
    
    -- قوالب CTA
    ('دعوة للعمل بسيطة', 'cta', '[
        {
            "id": "cta-simple",
            "type": "container",
            "children": [
                {"id": "heading", "type": "text", "content": "هل أنت مستعد للبدء؟"},
                {"id": "subheading", "type": "text", "content": "انضم إلى آلاف العملاء السعداء"},
                {"id": "button", "type": "button", "content": "ابدأ الآن"}
            ]
        }
    ]', '{
        "backgroundColor": "#EFF6FF",
        "textAlign": "center",
        "padding": "60px 20px"
    }'),
    
    -- قوالب التذييل
    ('تذييل متكامل', 'footer', '[
        {
            "id": "footer-full",
            "type": "container",
            "children": [
                {"id": "logo", "type": "image", "content": ""},
                {"id": "about", "type": "text", "content": "نبذة عن المتجر"},
                {"id": "links", "type": "links-list", "content": ""},
                {"id": "contact", "type": "contact-info", "content": ""},
                {"id": "social", "type": "social-links", "content": ""},
                {"id": "copyright", "type": "text", "content": "© 2025 جميع الحقوق محفوظة"}
            ]
        }
    ]', '{
        "backgroundColor": "#1F2937",
        "textColor": "#F9FAFB",
        "columns": 4
    }'),
    
    ('تذييل بسيط', 'footer', '[
        {
            "id": "footer-simple",
            "type": "container",
            "children": [
                {"id": "copyright", "type": "text", "content": "© 2025 اسم المتجر. جميع الحقوق محفوظة."}
            ]
        }
    ]', '{
        "backgroundColor": "#F3F4F6",
        "textAlign": "center",
        "padding": "20px"
    }')
ON CONFLICT DO NOTHING;

-- ===============================================
-- 15. Storage Buckets للوسائط
-- ===============================================

-- إنشاء bucket للصور إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT DO NOTHING;

-- سياسات الـ Storage
CREATE POLICY "Users can upload store assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'store-assets' AND
    auth.uid() IN (
        SELECT id FROM users WHERE organization_id IS NOT NULL
    )
);

CREATE POLICY "Users can update their store assets"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'store-assets' AND
    auth.uid() IN (
        SELECT id FROM users WHERE organization_id IS NOT NULL
    )
);

CREATE POLICY "Anyone can view store assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-assets');

-- ===============================================
-- النهاية - المحرر المرئي جاهز للعمل!
-- ===============================================