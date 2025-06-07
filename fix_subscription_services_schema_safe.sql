-- إصلاح آمن لـ schema جدول subscription_services

-- التحقق من وجود الجدول أولاً
DO $$
BEGIN
    -- التحقق من وجود العمود service_name وإعادة تسميته إلى name إذا لزم الأمر
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_services' 
        AND column_name = 'service_name'
    ) THEN
        ALTER TABLE subscription_services RENAME COLUMN service_name TO name;
        RAISE NOTICE 'تم تغيير اسم العمود service_name إلى name';
    END IF;

    -- التحقق من وجود العمود name إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'subscription_services' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE subscription_services ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'خدمة غير محددة';
        RAISE NOTICE 'تم إضافة العمود name';
    END IF;

    -- إضافة الأعمدة المفقودة
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'description') THEN
        ALTER TABLE subscription_services ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'provider') THEN
        ALTER TABLE subscription_services ADD COLUMN provider VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'supported_countries') THEN
        ALTER TABLE subscription_services ADD COLUMN supported_countries JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'available_durations') THEN
        ALTER TABLE subscription_services ADD COLUMN available_durations JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'credentials_encrypted') THEN
        ALTER TABLE subscription_services ADD COLUMN credentials_encrypted TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'total_quantity') THEN
        ALTER TABLE subscription_services ADD COLUMN total_quantity INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'available_quantity') THEN
        ALTER TABLE subscription_services ADD COLUMN available_quantity INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'sold_quantity') THEN
        ALTER TABLE subscription_services ADD COLUMN sold_quantity INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'reserved_quantity') THEN
        ALTER TABLE subscription_services ADD COLUMN reserved_quantity INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'is_featured') THEN
        ALTER TABLE subscription_services ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'is_active') THEN
        ALTER TABLE subscription_services ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'logo_url') THEN
        ALTER TABLE subscription_services ADD COLUMN logo_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'terms_conditions') THEN
        ALTER TABLE subscription_services ADD COLUMN terms_conditions TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'usage_instructions') THEN
        ALTER TABLE subscription_services ADD COLUMN usage_instructions TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'support_contact') THEN
        ALTER TABLE subscription_services ADD COLUMN support_contact TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'renewal_policy') THEN
        ALTER TABLE subscription_services ADD COLUMN renewal_policy TEXT;
    END IF;

    -- إصلاح العمود profit_margin
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'profit_margin') THEN
        ALTER TABLE subscription_services DROP COLUMN profit_margin;
        RAISE NOTICE 'تم حذف العمود profit_margin القديم';
    END IF;

    -- إضافة عمود profit_amount للمبلغ المطلق
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'profit_amount') THEN
        ALTER TABLE subscription_services ADD COLUMN profit_amount DECIMAL(10, 2) GENERATED ALWAYS AS (selling_price - purchase_price) STORED;
        RAISE NOTICE 'تم إضافة العمود profit_amount';
    END IF;

    -- إضافة عمود profit_margin للنسبة المئوية
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_services' AND column_name = 'profit_margin') THEN
        ALTER TABLE subscription_services ADD COLUMN profit_margin DECIMAL(10, 2) GENERATED ALWAYS AS (
            CASE 
                WHEN purchase_price > 0 THEN ((selling_price - purchase_price) / purchase_price) * 100
                ELSE 0 
            END
        ) STORED;
        RAISE NOTICE 'تم إضافة العمود profit_margin المحسوب';
    END IF;

END $$;

-- تحديث قيم status للتطابق مع الكود
UPDATE subscription_services SET status = 'active' WHERE status = 'available';
UPDATE subscription_services SET status = 'inactive' WHERE status = 'sold';

-- تحديث/إنشاء الفهارس
DROP INDEX IF EXISTS idx_subscription_services_service_name;
CREATE INDEX IF NOT EXISTS idx_subscription_services_name ON subscription_services(name);
CREATE INDEX IF NOT EXISTS idx_subscription_services_is_active ON subscription_services(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_services_provider ON subscription_services(provider);

-- تحديث view الإحصائيات
DROP VIEW IF EXISTS subscription_services_stats;
CREATE VIEW subscription_services_stats AS
SELECT 
    organization_id,
    category_id,
    name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as available_count,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as sold_count,
    COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_count,
    SUM(CASE WHEN status = 'active' THEN selling_price ELSE 0 END) as total_revenue,
    SUM(CASE WHEN status = 'active' THEN profit_amount ELSE 0 END) as total_profit,
    AVG(CASE WHEN status = 'active' THEN profit_margin ELSE NULL END) as avg_profit_margin
FROM subscription_services
GROUP BY organization_id, category_id, name; 