-- ==========================================
-- تطبيق تحميل الألعاب - Game Downloads App
-- ==========================================

-- 1. جدول فئات الألعاب
CREATE TABLE IF NOT EXISTS game_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    parent_id UUID REFERENCES game_categories(id) ON DELETE SET NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- 2. جدول الألعاب
CREATE TABLE IF NOT EXISTS games_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES game_categories(id) ON DELETE SET NULL,
    platform VARCHAR(50) NOT NULL, -- PC, PlayStation, Xbox, Mobile
    size_gb DECIMAL(10,2),
    requirements JSONB DEFAULT '{}', -- متطلبات التشغيل
    images JSONB DEFAULT '[]', -- صور اللعبة
    price DECIMAL(10,2) DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- 3. جدول طلبات تحميل الألعاب
CREATE TABLE IF NOT EXISTS game_download_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tracking_number VARCHAR(20) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    game_id UUID NOT NULL REFERENCES games_catalog(id) ON DELETE RESTRICT,
    device_type VARCHAR(100), -- نوع الجهاز
    device_specs TEXT, -- مواصفات الجهاز
    notes TEXT, -- ملاحظات العميل
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, ready, delivered, cancelled
    status_history JSONB DEFAULT '[]',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- الموظف المسؤول
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, partial, paid
    payment_method VARCHAR(50),
    amount_paid DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول إعدادات التطبيق للمؤسسة
CREATE TABLE IF NOT EXISTS game_downloads_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    business_name VARCHAR(255),
    business_logo TEXT,
    welcome_message TEXT,
    terms_conditions TEXT,
    contact_info JSONB DEFAULT '{}', -- {phone, whatsapp, email, address}
    social_links JSONB DEFAULT '{}', -- {facebook, instagram, twitter}
    order_prefix VARCHAR(10) DEFAULT 'GD', -- بادئة رقم التتبع
    auto_assign_orders BOOLEAN DEFAULT false,
    notification_settings JSONB DEFAULT '{}',
    working_hours JSONB DEFAULT '{}', -- ساعات العمل
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جدول إشعارات العملاء
CREATE TABLE IF NOT EXISTS game_order_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES game_download_orders(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- status_change, reminder, promotion
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- الفهارس لتحسين الأداء
CREATE INDEX idx_game_categories_org ON game_categories(organization_id) WHERE is_active = true;
CREATE INDEX idx_games_catalog_org_cat ON games_catalog(organization_id, category_id) WHERE is_active = true;
CREATE INDEX idx_games_catalog_featured ON games_catalog(organization_id, is_featured) WHERE is_active = true;
CREATE INDEX idx_game_orders_org_status ON game_download_orders(organization_id, status);
CREATE INDEX idx_game_orders_tracking ON game_download_orders(tracking_number);
CREATE INDEX idx_game_orders_customer_phone ON game_download_orders(organization_id, customer_phone);
CREATE INDEX idx_game_orders_created ON game_download_orders(organization_id, created_at DESC);
CREATE INDEX idx_game_notifications_order ON game_order_notifications(order_id, is_read);

-- دالة توليد رقم التتبع
CREATE OR REPLACE FUNCTION generate_game_order_tracking_number(org_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    prefix VARCHAR(10);
    counter INTEGER;
    tracking_number VARCHAR(20);
BEGIN
    -- الحصول على البادئة من الإعدادات
    SELECT COALESCE(order_prefix, 'GD') INTO prefix
    FROM game_downloads_settings
    WHERE organization_id = org_id;
    
    -- إذا لم توجد إعدادات، استخدم البادئة الافتراضية
    IF prefix IS NULL THEN
        prefix := 'GD';
    END IF;
    
    -- حساب العداد
    SELECT COUNT(*) + 1 INTO counter
    FROM game_download_orders
    WHERE organization_id = org_id;
    
    -- توليد رقم التتبع
    tracking_number := prefix || '-' || LPAD(counter::TEXT, 6, '0');
    
    -- التحقق من عدم التكرار
    WHILE EXISTS(SELECT 1 FROM game_download_orders WHERE tracking_number = tracking_number) LOOP
        counter := counter + 1;
        tracking_number := prefix || '-' || LPAD(counter::TEXT, 6, '0');
    END LOOP;
    
    RETURN tracking_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتوليد رقم التتبع تلقائياً
CREATE OR REPLACE FUNCTION set_game_order_tracking_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tracking_number IS NULL THEN
        NEW.tracking_number := generate_game_order_tracking_number(NEW.organization_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_game_order_tracking
BEFORE INSERT ON game_download_orders
FOR EACH ROW
EXECUTE FUNCTION set_game_order_tracking_number();

-- دالة تحديث حالة الطلب مع السجل
CREATE OR REPLACE FUNCTION update_game_order_status(
    order_id UUID,
    new_status VARCHAR,
    user_id UUID,
    notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_status VARCHAR;
    status_entry JSONB;
BEGIN
    -- الحصول على الحالة الحالية
    SELECT status INTO current_status
    FROM game_download_orders
    WHERE id = order_id;
    
    -- إنشاء سجل الحالة
    status_entry := jsonb_build_object(
        'from_status', current_status,
        'to_status', new_status,
        'changed_by', user_id,
        'changed_at', NOW(),
        'notes', notes
    );
    
    -- تحديث الطلب
    UPDATE game_download_orders
    SET 
        status = new_status,
        status_history = status_history || status_entry,
        updated_at = NOW(),
        processing_started_at = CASE 
            WHEN new_status = 'processing' AND processing_started_at IS NULL 
            THEN NOW() 
            ELSE processing_started_at 
        END,
        completed_at = CASE 
            WHEN new_status = 'delivered' 
            THEN NOW() 
            ELSE completed_at 
        END,
        cancelled_at = CASE 
            WHEN new_status = 'cancelled' 
            THEN NOW() 
            ELSE cancelled_at 
        END,
        cancellation_reason = CASE 
            WHEN new_status = 'cancelled' 
            THEN notes 
            ELSE cancellation_reason 
        END
    WHERE id = order_id;
    
    -- إنشاء إشعار للعميل
    INSERT INTO game_order_notifications (
        organization_id,
        order_id,
        type,
        title,
        message
    )
    SELECT 
        organization_id,
        id,
        'status_change',
        CASE new_status
            WHEN 'processing' THEN 'جاري معالجة طلبك'
            WHEN 'ready' THEN 'طلبك جاهز للاستلام'
            WHEN 'delivered' THEN 'تم تسليم طلبك'
            WHEN 'cancelled' THEN 'تم إلغاء طلبك'
            ELSE 'تحديث على طلبك'
        END,
        CASE new_status
            WHEN 'processing' THEN 'بدأنا في تحضير طلبك وسيتم إشعارك عند الانتهاء'
            WHEN 'ready' THEN 'طلبك جاهز الآن، يمكنك الحضور لاستلامه'
            WHEN 'delivered' THEN 'تم تسليم طلبك بنجاح، شكراً لتعاملك معنا'
            WHEN 'cancelled' THEN COALESCE('تم إلغاء طلبك: ' || notes, 'تم إلغاء طلبك')
            ELSE 'تم تحديث حالة طلبك إلى: ' || new_status
        END
    FROM game_download_orders
    WHERE id = order_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_categories_updated_at
BEFORE UPDATE ON game_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_games_catalog_updated_at
BEFORE UPDATE ON games_catalog
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_game_orders_updated_at
BEFORE UPDATE ON game_download_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_game_settings_updated_at
BEFORE UPDATE ON game_downloads_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE game_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE games_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_download_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_downloads_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_order_notifications ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
-- game_categories
CREATE POLICY "organization_game_categories_select" ON game_categories
FOR SELECT TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "organization_game_categories_insert" ON game_categories
FOR INSERT TO authenticated
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "organization_game_categories_update" ON game_categories
FOR UPDATE TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "organization_game_categories_delete" ON game_categories
FOR DELETE TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

-- games_catalog
CREATE POLICY "organization_games_catalog_select" ON games_catalog
FOR SELECT TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "organization_games_catalog_insert" ON games_catalog
FOR INSERT TO authenticated
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "organization_games_catalog_update" ON games_catalog
FOR UPDATE TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

CREATE POLICY "organization_games_catalog_delete" ON games_catalog
FOR DELETE TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

-- game_download_orders
CREATE POLICY "organization_game_orders_all" ON game_download_orders
FOR ALL TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

-- game_downloads_settings
CREATE POLICY "organization_game_settings_all" ON game_downloads_settings
FOR ALL TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

-- game_order_notifications
CREATE POLICY "organization_game_notifications_all" ON game_order_notifications
FOR ALL TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
);

-- سياسات عامة للعملاء (anon) - للصفحة العامة
-- السماح بعرض الألعاب النشطة
CREATE POLICY "public_games_view" ON games_catalog
FOR SELECT TO anon
USING (is_active = true);

CREATE POLICY "public_categories_view" ON game_categories
FOR SELECT TO anon
USING (is_active = true);

-- السماح بإنشاء طلبات من العملاء
CREATE POLICY "public_order_create" ON game_download_orders
FOR INSERT TO anon
WITH CHECK (true);

-- السماح للعملاء بتتبع طلباتهم
CREATE POLICY "public_order_track" ON game_download_orders
FOR SELECT TO anon
USING (true); -- يمكن تقييدها بـ tracking_number في التطبيق

-- عرض الإشعارات العامة
CREATE POLICY "public_notifications_view" ON game_order_notifications
FOR SELECT TO anon
USING (true);

-- عرض إعدادات المتجر العامة
CREATE POLICY "public_settings_view" ON game_downloads_settings
FOR SELECT TO anon
USING (is_active = true);