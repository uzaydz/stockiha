-- إصلاح مشكلة مزامنة المخزون لخدمات الاشتراكات
-- تاريخ الإنشاء: 2025-01-20
-- الهدف: مزامنة البيانات بين جدول subscription_services و subscription_service_pricing

-- ================================
-- 1. إصلاح الدالة المسؤولة عن التحديث التلقائي
-- ================================

CREATE OR REPLACE FUNCTION public.update_subscription_service_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث إحصائيات الخدمة الرئيسية بناءً على مجموع أسعارها
    UPDATE public.subscription_services SET
        available_quantity = (
            SELECT COALESCE(SUM(available_quantity), 0) 
            FROM public.subscription_service_pricing 
            WHERE subscription_service_id = COALESCE(NEW.subscription_service_id, OLD.subscription_service_id)
              AND is_active = TRUE
        ),
        sold_quantity = (
            SELECT COALESCE(SUM(sold_quantity), 0) 
            FROM public.subscription_service_pricing 
            WHERE subscription_service_id = COALESCE(NEW.subscription_service_id, OLD.subscription_service_id)
              AND is_active = TRUE
        ),
        total_quantity = (
            SELECT COALESCE(SUM(total_quantity), 0) 
            FROM public.subscription_service_pricing 
            WHERE subscription_service_id = COALESCE(NEW.subscription_service_id, OLD.subscription_service_id)
              AND is_active = TRUE
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.subscription_service_id, OLD.subscription_service_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 2. إعادة إنشاء الـ Trigger
-- ================================

DROP TRIGGER IF EXISTS trigger_update_subscription_stats ON public.subscription_service_pricing;
CREATE TRIGGER trigger_update_subscription_stats
    AFTER INSERT OR UPDATE OR DELETE ON public.subscription_service_pricing
    FOR EACH ROW EXECUTE FUNCTION public.update_subscription_service_stats();

-- ================================
-- 3. مزامنة البيانات الموجودة حالياً
-- ================================

-- تحديث جميع الخدمات الموجودة
UPDATE public.subscription_services 
SET 
    available_quantity = COALESCE(pricing_stats.total_available, 0),
    sold_quantity = COALESCE(pricing_stats.total_sold, 0),
    total_quantity = COALESCE(pricing_stats.total_quantity, 0),
    updated_at = NOW()
FROM (
    SELECT 
        subscription_service_id,
        SUM(available_quantity) as total_available,
        SUM(sold_quantity) as total_sold,
        SUM(total_quantity) as total_quantity
    FROM public.subscription_service_pricing 
    WHERE is_active = TRUE
    GROUP BY subscription_service_id
) pricing_stats
WHERE subscription_services.id = pricing_stats.subscription_service_id;

-- ================================
-- 4. إصلاح الخدمات التي لا تحتوي على أسعار
-- ================================

-- إضافة أسعار افتراضية للخدمات التي لا تحتوي على أي أسعار
INSERT INTO public.subscription_service_pricing (
    subscription_service_id,
    organization_id,
    duration_months,
    duration_label,
    purchase_price,
    selling_price,
    total_quantity,
    available_quantity,
    sold_quantity,
    reserved_quantity,
    is_default,
    is_active,
    display_order
)
SELECT 
    s.id,
    s.organization_id,
    1 as duration_months,
    'شهر واحد' as duration_label,
    COALESCE(s.purchase_price, 0) as purchase_price,
    COALESCE(s.selling_price, 0) as selling_price,
    COALESCE(s.total_quantity, 1) as total_quantity,
    COALESCE(s.available_quantity, 1) as available_quantity,
    COALESCE(s.sold_quantity, 0) as sold_quantity,
    COALESCE(s.reserved_quantity, 0) as reserved_quantity,
    TRUE as is_default,
    TRUE as is_active,
    1 as display_order
FROM public.subscription_services s
WHERE NOT EXISTS (
    SELECT 1 
    FROM public.subscription_service_pricing p 
    WHERE p.subscription_service_id = s.id
);

-- ================================
-- 5. تحديث الخدمات بعد إضافة الأسعار الافتراضية
-- ================================

-- إعادة تحديث الإحصائيات بعد إضافة الأسعار الافتراضية
UPDATE public.subscription_services 
SET 
    available_quantity = COALESCE(pricing_stats.total_available, 0),
    sold_quantity = COALESCE(pricing_stats.total_sold, 0),
    total_quantity = COALESCE(pricing_stats.total_quantity, 0),
    updated_at = NOW()
FROM (
    SELECT 
        subscription_service_id,
        SUM(available_quantity) as total_available,
        SUM(sold_quantity) as total_sold,
        SUM(total_quantity) as total_quantity
    FROM public.subscription_service_pricing 
    WHERE is_active = TRUE
    GROUP BY subscription_service_id
) pricing_stats
WHERE subscription_services.id = pricing_stats.subscription_service_id;

-- ================================
-- 6. إنشاء دالة لإعادة مزامنة البيانات يدوياً
-- ================================

CREATE OR REPLACE FUNCTION public.sync_subscription_inventory()
RETURNS TEXT AS $$
DECLARE
    updated_count INTEGER := 0;
    service_record RECORD;
BEGIN
    -- تحديث كل خدمة على حدة
    FOR service_record IN 
        SELECT DISTINCT s.id, s.organization_id
        FROM public.subscription_services s
    LOOP
        UPDATE public.subscription_services 
        SET 
            available_quantity = (
                SELECT COALESCE(SUM(available_quantity), 0) 
                FROM public.subscription_service_pricing 
                WHERE subscription_service_id = service_record.id
                  AND is_active = TRUE
            ),
            sold_quantity = (
                SELECT COALESCE(SUM(sold_quantity), 0) 
                FROM public.subscription_service_pricing 
                WHERE subscription_service_id = service_record.id
                  AND is_active = TRUE
            ),
            total_quantity = (
                SELECT COALESCE(SUM(total_quantity), 0) 
                FROM public.subscription_service_pricing 
                WHERE subscription_service_id = service_record.id
                  AND is_active = TRUE
            ),
            updated_at = NOW()
        WHERE id = service_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN 'تم تحديث ' || updated_count || ' خدمة بنجاح';
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 7. تشغيل المزامنة النهائية
-- ================================

SELECT public.sync_subscription_inventory();

-- ================================
-- 8. إنشاء فهارس لتحسين الأداء
-- ================================

CREATE INDEX IF NOT EXISTS idx_subscription_service_pricing_service_id 
ON public.subscription_service_pricing(subscription_service_id);

CREATE INDEX IF NOT EXISTS idx_subscription_service_pricing_is_active 
ON public.subscription_service_pricing(is_active);

CREATE INDEX IF NOT EXISTS idx_subscription_service_pricing_organization_id 
ON public.subscription_service_pricing(organization_id);

-- ================================
-- 9. عرض تقرير النتائج
-- ================================

SELECT 
    'تقرير المزامنة النهائي' as report_title,
    COUNT(*) as total_services,
    COUNT(CASE WHEN available_quantity > 0 THEN 1 END) as services_with_inventory,
    COUNT(CASE WHEN available_quantity = 0 THEN 1 END) as services_without_inventory,
    SUM(available_quantity) as total_available_quantity,
    SUM(sold_quantity) as total_sold_quantity
FROM public.subscription_services 
WHERE organization_id IS NOT NULL;

-- عرض الخدمات التي لا تزال تعاني من مشاكل
SELECT 
    s.id,
    s.name,
    s.available_quantity as service_available,
    s.sold_quantity as service_sold,
    COUNT(p.id) as pricing_records,
    SUM(p.available_quantity) as pricing_available_total
FROM public.subscription_services s
LEFT JOIN public.subscription_service_pricing p ON s.id = p.subscription_service_id 
    AND p.is_active = true
GROUP BY s.id, s.name, s.available_quantity, s.sold_quantity
HAVING s.available_quantity != COALESCE(SUM(p.available_quantity), 0)
   OR s.sold_quantity != COALESCE(SUM(p.sold_quantity), 0)
ORDER BY s.name; 