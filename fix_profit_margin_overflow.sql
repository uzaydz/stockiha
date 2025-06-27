-- إصلاح مشكلة فيض هامش الربح في جدول subscription_services
-- مع إدارة الـ view المعتمد عليه

-- أولاً: حفظ تعريف الـ view 
DO $$
DECLARE
    view_definition TEXT;
BEGIN
    -- الحصول على تعريف الـ view
    SELECT pg_get_viewdef('subscription_services_stats', true) INTO view_definition;
    
    -- حذف الـ view مؤقتاً
    DROP VIEW IF EXISTS subscription_services_stats CASCADE;
    
    -- حذف العمود المحسوب الحالي
    ALTER TABLE subscription_services 
    DROP COLUMN IF EXISTS profit_margin CASCADE;
    
    -- إضافة العمود المحسوب الجديد بدقة أكبر
    ALTER TABLE subscription_services 
    ADD COLUMN profit_margin NUMERIC(8,2) GENERATED ALWAYS AS (
      CASE
        WHEN purchase_price > 0 THEN 
          LEAST(99999.99, ((selling_price - purchase_price) / purchase_price) * 100)
        ELSE 0
      END
    ) STORED;
    
    -- تحديث التعليق
    COMMENT ON COLUMN subscription_services.profit_margin IS 'هامش الربح المئوي محدود بـ 99999.99% لتجنب الفيض';
    
    -- إعادة إنشاء الـ view إذا كان موجوداً
    IF view_definition IS NOT NULL THEN
        EXECUTE 'CREATE VIEW subscription_services_stats AS ' || view_definition;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    -- في حالة الخطأ، نحاول إعادة إنشاء view بسيط
    DROP VIEW IF EXISTS subscription_services_stats CASCADE;
    
    CREATE VIEW subscription_services_stats AS
    SELECT 
        organization_id,
        COUNT(*) as total_services,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_services,
        COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_services,
        SUM(total_quantity) as total_inventory,
        SUM(available_quantity) as available_inventory,
        SUM(sold_quantity) as total_sold,
        AVG(profit_margin) as avg_profit_margin,
        SUM(selling_price * sold_quantity) as total_revenue
    FROM subscription_services
    GROUP BY organization_id;
    
END $$; 