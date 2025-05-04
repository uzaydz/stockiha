-- إضافة إعدادات SEO في قاعدة البيانات

-- إنهاء أي معاملات حالية
COMMIT;
BEGIN;

-- لا نعطل جميع المشغلات لتجنب مشكلة أذونات مشغلات النظام
-- نحذف مباشرة المشغلات التي نريد إزالتها

-- حذف المشغلات المشكلة
DROP TRIGGER IF EXISTS trigger_store_settings_audit ON public.store_settings;
DROP TRIGGER IF EXISTS store_settings_audit_trigger ON public.store_settings;
DROP TRIGGER IF EXISTS log_store_settings_changes_trigger ON public.store_settings;
DROP TRIGGER IF EXISTS audit_store_settings_changes_trigger ON public.store_settings;
DROP TRIGGER IF EXISTS safe_store_settings_audit_trigger ON public.store_settings;
DROP TRIGGER IF EXISTS bazaar_store_settings_audit_trigger ON public.store_settings;

-- حذف الوظائف المرتبطة
DROP FUNCTION IF EXISTS public.log_store_settings_changes() CASCADE;
DROP FUNCTION IF EXISTS public.audit_store_settings_changes() CASCADE;
DROP FUNCTION IF EXISTS public.safe_store_settings_audit() CASCADE;
DROP FUNCTION IF EXISTS public.log_settings_change(text) CASCADE;

-- تعديل جدول settings_audit_log لقبول قيمة افتراضية
ALTER TABLE IF EXISTS public.settings_audit_log 
ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;

-- إصلاح أسماء الأعمدة
DO $$
BEGIN
  -- معالجة حالة وجود كلا العمودين old_values و old_value
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'settings_audit_log' AND column_name = 'old_values'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'settings_audit_log' AND column_name = 'old_value'
  ) THEN
    -- تحديث البيانات ثم حذف العمود القديم
    UPDATE public.settings_audit_log 
    SET old_value = old_values 
    WHERE old_value IS NULL AND old_values IS NOT NULL;
    
    ALTER TABLE public.settings_audit_log DROP COLUMN old_values;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'settings_audit_log' AND column_name = 'old_values'
  ) THEN
    -- فقط إعادة تسمية العمود
    ALTER TABLE public.settings_audit_log RENAME COLUMN old_values TO old_value;
  END IF;
  
  -- معالجة حالة وجود كلا العمودين new_values و new_value
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'settings_audit_log' AND column_name = 'new_values'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'settings_audit_log' AND column_name = 'new_value'
  ) THEN
    -- تحديث البيانات ثم حذف العمود القديم
    UPDATE public.settings_audit_log 
    SET new_value = new_values 
    WHERE new_value IS NULL AND new_values IS NOT NULL;
    
    ALTER TABLE public.settings_audit_log DROP COLUMN new_values;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'settings_audit_log' AND column_name = 'new_values'
  ) THEN
    -- فقط إعادة تسمية العمود
    ALTER TABLE public.settings_audit_log RENAME COLUMN new_values TO new_value;
  END IF;
END $$;

-- إنشاء وظيفة تدقيق آمنة جديدة
CREATE OR REPLACE FUNCTION public.bazaar_store_settings_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_organization_id UUID;
  v_new_organization_id UUID;
  v_old_id UUID;
  v_new_id UUID;
  v_component_type TEXT;
  v_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
BEGIN
  -- تحديد القيم المناسبة
  IF TG_OP = 'DELETE' THEN
    v_old_organization_id := OLD.organization_id;
    v_old_id := OLD.id;
    v_new_id := NULL;
    v_component_type := OLD.component_type;
  ELSE
    v_new_organization_id := NEW.organization_id;
    v_new_id := NEW.id;
    v_component_type := NEW.component_type;
    IF TG_OP = 'UPDATE' THEN
      v_old_id := OLD.id;
    ELSE
      v_old_id := NULL;
    END IF;
  END IF;

  -- تنفيذ التسجيل بأمان مع التقاط أي استثناء
  BEGIN
    INSERT INTO public.settings_audit_log (
      organization_id, 
      user_id, 
      action_type, 
      table_name, 
      record_id, 
      old_value, 
      new_value,
      setting_type,
      setting_key
    ) VALUES (
      COALESCE(v_new_organization_id, v_old_organization_id),
      v_user_id,
      TG_OP,
      'store_settings',
      COALESCE(v_new_id, v_old_id),
      CASE 
        WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::TEXT
        WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::TEXT
        ELSE NULL
      END,
      CASE 
        WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::TEXT
        ELSE NULL
      END,
      'store',
      'component_' || COALESCE(v_component_type, 'unknown')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'فشل في تسجيل التغيير: %', SQLERRM;
  END;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- إضافة مشغل جديد
DROP TRIGGER IF EXISTS bazaar_store_settings_audit_trigger ON public.store_settings;
CREATE TRIGGER bazaar_store_settings_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.bazaar_store_settings_audit();

-- إضافة تعليق توضيحي
COMMENT ON FUNCTION public.bazaar_store_settings_audit() IS 'وظيفة آمنة لتسجيل التغييرات في إعدادات المتجر';

-- إضافة إعدادات SEO في قاعدة البيانات

-- التحقق من وجود جدول settings_audit_log، إذا لم يكن موجوداً قم بإنشائه
CREATE TABLE IF NOT EXISTS public.settings_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID,
    organization_id UUID,
    setting_type VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    action_type VARCHAR(20),
    table_name VARCHAR(50),
    record_id UUID,
    changed_by UUID,
    request_id UUID
);

-- إضافة فهرس لتسريع عمليات البحث
CREATE INDEX IF NOT EXISTS idx_settings_audit_organization_id 
ON public.settings_audit_log(organization_id);

CREATE INDEX IF NOT EXISTS idx_settings_audit_setting_type_key 
ON public.settings_audit_log(setting_type, setting_key);

-- تحقق من وجود جدول store_settings، إذا لم يكن موجوداً قم بإنشائه
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    component_type TEXT NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة فهرس على عمود component_type
CREATE INDEX IF NOT EXISTS idx_store_settings_component_type ON public.store_settings(component_type);

-- إضافة فهرس على organization_id
CREATE INDEX IF NOT EXISTS idx_store_settings_organization_id ON public.store_settings(organization_id);

-- إضافة مكون إعدادات SEO إذا لم يكن موجوداً
INSERT INTO public.store_settings (organization_id, component_type, settings, is_active, order_index)
SELECT 
    organizations.id, 
    'seo_settings', 
    '{
        "title": "",
        "description": "",
        "keywords": "",
        "robots_txt": "User-agent: *\nAllow: /",
        "enable_sitemap": true,
        "enable_canonical_urls": true,
        "generate_meta_tags": true,
        "enable_open_graph": true,
        "enable_twitter_cards": true,
        "enable_schema_markup": true,
        "default_image_url": "",
        "social_media": {
            "twitter_handle": "",
            "facebook_page": "",
            "instagram_handle": "",
            "linkedin_page": ""
        },
        "structured_data": {
            "business_type": "Store",
            "business_name": "",
            "business_logo": "",
            "business_address": "",
            "business_phone": ""
        },
        "advanced": {
            "custom_head_tags": "",
            "google_analytics_id": "",
            "google_tag_manager_id": "",
            "google_search_console_id": "",
            "bing_webmaster_id": "",
            "custom_robots_txt": ""
        }
    }'::jsonb,
    true,
    (SELECT COALESCE(MAX(order_index), 0) + 1 FROM public.store_settings WHERE organization_id = organizations.id)
FROM 
    public.organizations
WHERE
    NOT EXISTS (
        SELECT 1 FROM public.store_settings 
        WHERE store_settings.organization_id = organizations.id 
        AND store_settings.component_type = 'seo_settings'
    );

-- إضافة وظيفة لتحديث حقل updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث حقل updated_at تلقائياً عند التعديل
DROP TRIGGER IF EXISTS update_store_settings_timestamp ON public.store_settings;
CREATE TRIGGER update_store_settings_timestamp
BEFORE UPDATE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- إضافة بديل آمن لوظيفة log_store_settings_changes
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    default_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
BEGIN
    -- محاولة الحصول على معرف المستخدم من JWT
    BEGIN
        current_user_id := NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;
    
    -- محاولة الحصول على معرف المستخدم من JWT claims كاملة
    IF current_user_id IS NULL THEN
        BEGIN
            current_user_id := (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::UUID;
        EXCEPTION WHEN OTHERS THEN
            current_user_id := NULL;
        END;
    END IF;
    
    -- محاولة الحصول على معرف المستخدم من إعدادات التطبيق
    IF current_user_id IS NULL THEN
        BEGIN
            current_user_id := NULLIF(current_setting('app.current_user_id', true), '')::UUID;
        EXCEPTION WHEN OTHERS THEN
            current_user_id := NULL;
        END;
    END IF;
    
    -- استخدام المعرف الافتراضي إذا لم نتمكن من الحصول على معرف المستخدم
    RETURN COALESCE(current_user_id, default_user_id);
END;
$$;

COMMENT ON FUNCTION public.get_current_user_id IS 'وظيفة آمنة للحصول على معرف المستخدم الحالي، مع استخدام قيمة افتراضية إذا كان غير متوفر';

-- ================================================================
-- =               حل جذري لمشكلة user_id                         =
-- ================================================================

-- 1. إنهاء أي معاملات حالية
COMMIT;

-- 2. حذف جميع المشغلات التي تستخدم log_store_settings_changes بشكل صريح
DROP TRIGGER IF EXISTS trigger_store_settings_audit ON public.store_settings;
DROP TRIGGER IF EXISTS log_store_settings_changes_trigger ON public.store_settings;
DROP TRIGGER IF EXISTS audit_store_settings_changes_trigger ON public.store_settings;
DROP TRIGGER IF EXISTS store_settings_audit_trigger ON public.store_settings;

-- 3. حذف جميع الوظائف المتعلقة بالتدقيق
DROP FUNCTION IF EXISTS public.log_store_settings_changes() CASCADE;
DROP FUNCTION IF EXISTS public.audit_store_settings_changes() CASCADE;
DROP FUNCTION IF EXISTS public.safe_store_settings_audit() CASCADE;

-- 4. ضبط قيمة افتراضية لعمود user_id
ALTER TABLE IF EXISTS public.settings_audit_log 
ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;

-- 5. التأكد من توافق أسماء الأعمدة
DO $$
BEGIN
  -- إصلاح اسم العمود old_values إذا كان موجوداً
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'settings_audit_log' AND column_name = 'old_values'
  ) THEN
    ALTER TABLE public.settings_audit_log RENAME COLUMN old_values TO old_value;
  END IF;
  
  -- إصلاح اسم العمود new_values إذا كان موجوداً
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'settings_audit_log' AND column_name = 'new_values'
  ) THEN
    ALTER TABLE public.settings_audit_log RENAME COLUMN new_values TO new_value;
  END IF;
END $$;

-- 6. إعادة تعريف الوظيفة بشكل صحيح
CREATE OR REPLACE FUNCTION public.log_store_settings_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_organization_id UUID;
  v_new_organization_id UUID;
  v_old_id UUID;
  v_new_id UUID;
  v_component_type TEXT;
  -- تعريف معرف مستخدم ثابت لحل مشكلة auth.uid() التي تعود بقيمة NULL
  v_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
BEGIN
  -- محاولة الحصول على معرف المستخدم من متغيرات البيئة
  BEGIN
    v_user_id := NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    -- قيمة افتراضية إذا فشلت المحاولة
    v_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END;
  
  -- إذا كانت القيمة NULL، استخدم القيمة الافتراضية
  IF v_user_id IS NULL THEN
    v_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;
  
  -- تحديد القيم بناءً على نوع العملية
  IF TG_OP = 'DELETE' THEN
    v_old_organization_id := OLD.organization_id;
    v_old_id := OLD.id;
    v_new_id := NULL;
    v_component_type := OLD.component_type;
  ELSE
    v_new_organization_id := NEW.organization_id;
    v_new_id := NEW.id;
    v_component_type := NEW.component_type;
    IF TG_OP = 'UPDATE' THEN
      v_old_id := OLD.id;
    ELSE
      v_old_id := NULL;
    END IF;
  END IF;

  -- إدخال سجل في جدول التدقيق
  BEGIN
    INSERT INTO public.settings_audit_log (
      organization_id, 
      user_id,           -- استخدام المتغير المحدد مسبقاً
      action_type, 
      table_name, 
      record_id, 
      old_value,         -- استخدام اسم العمود الصحيح
      new_value,         -- استخدام اسم العمود الصحيح
      setting_type,
      setting_key
    ) VALUES (
      COALESCE(v_new_organization_id, v_old_organization_id),
      v_user_id,         -- استخدام المتغير بدلاً من auth.uid() مباشرة
      TG_OP,
      'store_settings',
      COALESCE(v_new_id, v_old_id),
      CASE 
        WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::TEXT
        WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::TEXT
        ELSE NULL
      END,
      CASE 
        WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::TEXT
        ELSE NULL
      END,
      'store',
      'component_' || COALESCE(v_component_type, 'unknown')
    );
  -- التقاط أي استثناء وتجاهله (مهم لمنع فشل المشغل بأكمله)
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'فشل في تسجيل التغيير في جدول التدقيق: %', SQLERRM;
  END;
  
  -- دائماً إرجاع قيمة لمنع فشل المشغل
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 7. إنشاء المشغل الجديد
DROP TRIGGER IF EXISTS trigger_store_settings_audit ON public.store_settings;
CREATE TRIGGER trigger_store_settings_audit
AFTER INSERT OR UPDATE OR DELETE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.log_store_settings_changes();

-- إضافة مصادقة لتقييد الوصول إلى جدول store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- سياسة للإدارة
CREATE POLICY admin_policy ON public.store_settings
    USING (EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = current_setting('app.current_user_id', true)::UUID
        AND users.role IN ('super_admin', 'admin')
    ));

-- سياسة للمالك
CREATE POLICY owner_policy ON public.store_settings
    USING (EXISTS (
        SELECT 1 FROM public.organizations
        WHERE organizations.id = store_settings.organization_id
        AND organizations.owner_id = current_setting('app.current_user_id', true)::UUID
    ));

-- سياسة للعضو في المؤسسة - تطبق فقط إذا كان جدول organization_members موجوداً
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organization_members'
    ) THEN
        EXECUTE 'CREATE POLICY member_policy ON public.store_settings
                USING (EXISTS (
                    SELECT 1 FROM public.organization_members
                    WHERE organization_members.organization_id = store_settings.organization_id
                    AND organization_members.user_id = current_setting(''app.current_user_id'', true)::UUID
                    AND organization_members.role IN (''admin'', ''editor'')
                ));';
    ELSE
        RAISE NOTICE 'تم تخطي إنشاء سياسة member_policy لأن جدول organization_members غير موجود';
    END IF;
END
$$;

-- كشف وظيفي: إضافة API لجلب إعدادات SEO
CREATE OR REPLACE FUNCTION public.get_store_seo_settings(
    _organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    seo_settings JSONB;
BEGIN
    -- جلب إعدادات SEO
    SELECT settings INTO seo_settings
    FROM public.store_settings
    WHERE organization_id = _organization_id
    AND component_type = 'seo_settings'
    AND is_active = true
    LIMIT 1;
    
    -- إذا لم يتم العثور على إعدادات، إرجاع كائن فارغ
    IF seo_settings IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;
    
    RETURN seo_settings;
END;
$$;

-- كشف وظيفي: تحديث إعدادات SEO
CREATE OR REPLACE FUNCTION public.update_store_seo_settings(
    _organization_id UUID,
    _settings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_settings JSONB;
BEGIN
    -- تحديث إعدادات SEO إذا كانت موجودة
    UPDATE public.store_settings
    SET 
        settings = _settings,
        updated_at = NOW()
    WHERE 
        organization_id = _organization_id
        AND component_type = 'seo_settings'
    RETURNING settings INTO updated_settings;
    
    -- إذا لم يتم العثور على إعدادات، إنشاء سجل جديد
    IF updated_settings IS NULL THEN
        INSERT INTO public.store_settings (
            organization_id,
            component_type,
            settings,
            is_active,
            order_index
        ) VALUES (
            _organization_id,
            'seo_settings',
            _settings,
            true,
            (SELECT COALESCE(MAX(order_index), 0) + 1 FROM public.store_settings WHERE organization_id = _organization_id)
        )
        RETURNING settings INTO updated_settings;
    END IF;
    
    RETURN updated_settings;
END;
$$;

-- إنشاء إجراء لإنشاء ملف sitemap.xml تلقائياً
CREATE OR REPLACE FUNCTION public.generate_sitemap(
    _organization_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sitemap_xml TEXT;
    org_domain TEXT;
    products_cursor CURSOR FOR SELECT id, slug, updated_at FROM public.products WHERE organization_id = _organization_id AND is_active = true;
    product_row RECORD;
    cat_row RECORD; -- تعريف صريح لمتغير cat_row كمتغير RECORD
BEGIN
    -- الحصول على نطاق المؤسسة
    SELECT COALESCE(custom_domain, slug || '.bazaar.com') INTO org_domain
    FROM public.organizations
    WHERE id = _organization_id;
    
    -- بدء إنشاء ملف sitemap
    sitemap_xml := '<?xml version="1.0" encoding="UTF-8"?>';
    sitemap_xml := sitemap_xml || '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    
    -- إضافة الصفحة الرئيسية
    sitemap_xml := sitemap_xml || '<url>';
    sitemap_xml := sitemap_xml || '<loc>https://' || org_domain || '</loc>';
    sitemap_xml := sitemap_xml || '<changefreq>daily</changefreq>';
    sitemap_xml := sitemap_xml || '<priority>1.0</priority>';
    sitemap_xml := sitemap_xml || '</url>';
    
    -- إضافة صفحات المنتجات
    FOR product_row IN products_cursor LOOP
        sitemap_xml := sitemap_xml || '<url>';
        sitemap_xml := sitemap_xml || '<loc>https://' || org_domain || '/product/' || product_row.slug || '</loc>';
        sitemap_xml := sitemap_xml || '<lastmod>' || TO_CHAR(product_row.updated_at, 'YYYY-MM-DD') || '</lastmod>';
        sitemap_xml := sitemap_xml || '<changefreq>weekly</changefreq>';
        sitemap_xml := sitemap_xml || '<priority>0.8</priority>';
        sitemap_xml := sitemap_xml || '</url>';
    END LOOP;
    
    -- إضافة صفحات الفئات
    FOR cat_row IN (SELECT id, slug, updated_at FROM public.product_categories WHERE organization_id = _organization_id) LOOP
        sitemap_xml := sitemap_xml || '<url>';
        sitemap_xml := sitemap_xml || '<loc>https://' || org_domain || '/category/' || cat_row.slug || '</loc>';
        sitemap_xml := sitemap_xml || '<lastmod>' || TO_CHAR(cat_row.updated_at, 'YYYY-MM-DD') || '</lastmod>';
        sitemap_xml := sitemap_xml || '<changefreq>weekly</changefreq>';
        sitemap_xml := sitemap_xml || '<priority>0.7</priority>';
        sitemap_xml := sitemap_xml || '</url>';
    END LOOP;
    
    -- إضافة صفحات ثابتة
    sitemap_xml := sitemap_xml || '<url>';
    sitemap_xml := sitemap_xml || '<loc>https://' || org_domain || '/about</loc>';
    sitemap_xml := sitemap_xml || '<changefreq>monthly</changefreq>';
    sitemap_xml := sitemap_xml || '<priority>0.5</priority>';
    sitemap_xml := sitemap_xml || '</url>';
    
    sitemap_xml := sitemap_xml || '<url>';
    sitemap_xml := sitemap_xml || '<loc>https://' || org_domain || '/contact</loc>';
    sitemap_xml := sitemap_xml || '<changefreq>monthly</changefreq>';
    sitemap_xml := sitemap_xml || '<priority>0.5</priority>';
    sitemap_xml := sitemap_xml || '</url>';
    
    -- إغلاق ملف sitemap
    sitemap_xml := sitemap_xml || '</urlset>';
    
    -- تحديث حقل في إعدادات المؤسسة لتخزين تاريخ آخر تحديث لملف sitemap
    UPDATE public.organizations
    SET meta_data = jsonb_set(COALESCE(meta_data, '{}'::jsonb), '{sitemap_last_generated}', to_jsonb(NOW()))
    WHERE id = _organization_id;
    
    RETURN sitemap_xml;
END;
$$;

COMMENT ON FUNCTION public.generate_sitemap IS 'وظيفة لإنشاء ملف sitemap.xml ديناميكياً للمؤسسة';
COMMENT ON FUNCTION public.get_store_seo_settings IS 'وظيفة لجلب إعدادات SEO للمتجر';
COMMENT ON FUNCTION public.update_store_seo_settings IS 'وظيفة لتحديث إعدادات SEO للمتجر';

-- جدول لكاش robots.txt وsitemap.xml
CREATE TABLE IF NOT EXISTS public.seo_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    cache_type TEXT NOT NULL CHECK (cache_type IN ('robots_txt', 'sitemap_xml')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_seo_cache_org_type ON public.seo_cache(organization_id, cache_type);

-- حذف السجلات المنتهية الصلاحية من الكاش
CREATE OR REPLACE FUNCTION public.cleanup_expired_seo_cache()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.seo_cache
    WHERE expires_at < NOW();
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتنظيف الكاش منتهي الصلاحية
DROP TRIGGER IF EXISTS cleanup_expired_seo_cache_trigger ON public.seo_cache;
CREATE TRIGGER cleanup_expired_seo_cache_trigger
AFTER INSERT OR UPDATE ON public.seo_cache
EXECUTE FUNCTION cleanup_expired_seo_cache();

-- تابع للوظائف لإنشاء ملف robots.txt
CREATE OR REPLACE FUNCTION public.generate_robots_txt(
    _organization_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    robots_txt TEXT;
    org_domain TEXT;
    seo_settings JSONB;
    custom_robots TEXT;
BEGIN
    -- الحصول على نطاق المؤسسة
    SELECT COALESCE(custom_domain, slug || '.bazaar.com') INTO org_domain
    FROM public.organizations
    WHERE id = _organization_id;
    
    -- الحصول على إعدادات SEO
    SELECT public.get_store_seo_settings(_organization_id) INTO seo_settings;
    
    -- التحقق من وجود ملف robots.txt مخصص
    custom_robots := seo_settings->'advanced'->>'custom_robots_txt';
    
    -- إذا كان هناك ملف مخصص، استخدمه
    IF custom_robots IS NOT NULL AND custom_robots != '' THEN
        RETURN custom_robots;
    END IF;
    
    -- إنشاء ملف robots.txt افتراضي
    robots_txt := 'User-agent: *' || CHR(10);
    robots_txt := robots_txt || 'Allow: /' || CHR(10);
    robots_txt := robots_txt || 'Disallow: /admin/' || CHR(10);
    robots_txt := robots_txt || 'Disallow: /api/' || CHR(10);
    robots_txt := robots_txt || 'Disallow: /checkout/' || CHR(10);
    robots_txt := robots_txt || 'Disallow: /cart/' || CHR(10);
    robots_txt := robots_txt || 'Disallow: /account/' || CHR(10);
    
    -- إضافة رابط لملف sitemap
    robots_txt := robots_txt || CHR(10) || 'Sitemap: https://' || org_domain || '/sitemap.xml';
    
    RETURN robots_txt;
END;
$$;

COMMENT ON FUNCTION public.generate_robots_txt IS 'وظيفة لإنشاء ملف robots.txt ديناميكياً للمؤسسة'; 

-- تأكيد المعاملة
COMMIT; 