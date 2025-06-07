-- إصلاح نهائي لجدول subscription_services - إضافة الأعمدة المفقودة فقط

DO $$
BEGIN
    -- إضافة الأعمدة المفقودة فقط (العمود profit_margin موجود بالفعل ومحسوب بشكل صحيح)
    
    -- تحديث الـ organization_id ليكون nullable إذا لزم الأمر
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_services' 
        AND column_name = 'organization_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE subscription_services ALTER COLUMN organization_id DROP NOT NULL;
        RAISE NOTICE 'تم جعل العمود organization_id nullable';
    END IF;

    -- إضافة فهارس إضافية إذا لم تكن موجودة
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscription_services_name') THEN
        CREATE INDEX idx_subscription_services_name ON subscription_services(name);
        RAISE NOTICE 'تم إنشاء فهرس للاسم';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscription_services_is_active') THEN
        CREATE INDEX idx_subscription_services_is_active ON subscription_services(is_active);
        RAISE NOTICE 'تم إنشاء فهرس للحالة النشطة';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscription_services_provider') THEN
        CREATE INDEX idx_subscription_services_provider ON subscription_services(provider);
        RAISE NOTICE 'تم إنشاء فهرس للمزود';
    END IF;

END $$;

-- تحديث قيم status للتطابق مع الكود إذا لزم الأمر
UPDATE subscription_services SET status = 'active' WHERE status = 'available';
UPDATE subscription_services SET status = 'inactive' WHERE status = 'sold';

-- إضافة comment للتوضيح
COMMENT ON COLUMN subscription_services.profit_margin IS 'هامش الربح كنسبة مئوية - محسوب تلقائياً';
COMMENT ON COLUMN subscription_services.profit_amount IS 'مبلغ الربح - محسوب تلقائياً'; 