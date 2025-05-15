/*
تعليمات التنفيذ:

1. افتح لوحة إدارة Supabase SQL Editor الخاصة بمشروعك.
2. انسخ هذا الملف SQL بالكامل وقم بتنفيذه.
3. بعد التنفيذ، ستتمكن من رؤية الطلبات المتروكة في صفحة الطلبات المتروكة.

ملاحظات هامة:
- هذا الملف ينشئ عرض مُجمع (View) يسمى abandoned_carts_view وهو المفقود حالياً
- كما ينشئ جدول إحصائيات للطلبات المتروكة اسمه abandoned_carts_stats
- ينشئ أيضاً دالة تلقائية لتحديث الإحصائيات كلما تم تغيير بيانات الطلبات المتروكة

معالجة الخطأ "relation already exists":
- سنحذف العرض والجدول إذا كانوا موجودين بشكل صريح
*/

-- حذف أي عرض أو جدول موجود بنفس الاسم بشكل صريح
-- تأكد من حذف العرض المادي أولاً
DROP MATERIALIZED VIEW IF EXISTS abandoned_carts_view CASCADE;
DROP VIEW IF EXISTS abandoned_carts_view CASCADE;
DROP TABLE IF EXISTS abandoned_carts_view CASCADE;

-- إنشاء عرض مُجمع للطلبات المتروكة
CREATE VIEW abandoned_carts_view AS
SELECT 
    ac.id,
    ac.organization_id,
    ac.product_id,
    ac.product_color_id,
    ac.product_size_id,
    ac.quantity,
    ac.customer_name,
    ac.customer_phone,
    ac.customer_email,
    ac.province,
    ac.municipality,
    ac.address,
    ac.delivery_option,
    ac.payment_method,
    ac.notes,
    ac.custom_fields_data,
    ac.calculated_delivery_fee,
    ac.subtotal,
    ac.discount_amount,
    ac.total_amount,
    ac.status,
    ac.last_activity_at,
    ac.created_at,
    ac.updated_at,
    ac.cart_items,
    ac.source,
    ac.recovered_at,
    ac.recovered_by,
    ac.recovered_order_id,
    -- إضافة معلومات إضافية للعرض
    p.name AS product_name,
    p.thumbnail_image AS product_image,
    p.price AS product_price,
    ypg.name_ar AS province_name,
    ymg.name_ar AS municipality_name,
    -- حساب وقت الترك بالساعات
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ac.last_activity_at)) / 3600 AS abandoned_hours,
    -- احتساب عدد العناصر في السلة
    CASE 
        WHEN jsonb_typeof(ac.cart_items) = 'array' THEN jsonb_array_length(ac.cart_items)
        ELSE 1
    END AS item_count
FROM 
    abandoned_carts ac
LEFT JOIN 
    products p ON ac.product_id = p.id
LEFT JOIN 
    yalidine_provinces_global ypg ON ac.province::int = ypg.id
LEFT JOIN 
    yalidine_municipalities_global ymg ON ac.municipality::int = ymg.id;

-- حذف جدول الإحصائيات إذا كان موجوداً
DROP MATERIALIZED VIEW IF EXISTS abandoned_carts_stats CASCADE;
DROP VIEW IF EXISTS abandoned_carts_stats CASCADE;
DROP TABLE IF EXISTS abandoned_carts_stats CASCADE;

-- إنشاء جدول الإحصائيات للطلبات المتروكة
CREATE TABLE abandoned_carts_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID UNIQUE NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    total_count INT NOT NULL DEFAULT 0,
    total_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    today_count INT NOT NULL DEFAULT 0,
    week_count INT NOT NULL DEFAULT 0,
    month_count INT NOT NULL DEFAULT 0,
    avg_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    recovery_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    conversion_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- حذف الدالة والمحفز إذا كانوا موجودين
DROP TRIGGER IF EXISTS update_abandoned_cart_stats_trigger ON abandoned_carts;
DROP FUNCTION IF EXISTS update_abandoned_cart_stats();

-- إنشاء دالة لتحديث إحصائيات الطلبات المتروكة
CREATE FUNCTION update_abandoned_cart_stats()
RETURNS TRIGGER AS $$
DECLARE
    org_id UUID;
    total_count INT;
    total_value NUMERIC;
    today_count INT;
    week_count INT;
    month_count INT;
    avg_value NUMERIC;
BEGIN
    -- تحديد المؤسسة للإحصائيات
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        org_id := NEW.organization_id;
    ELSE
        org_id := OLD.organization_id;
    END IF;

    -- إحصاء العدد الإجمالي والقيمة
    SELECT 
        COUNT(*),
        COALESCE(SUM(total_amount), 0)
    INTO 
        total_count,
        total_value
    FROM 
        abandoned_carts
    WHERE 
        organization_id = org_id
        AND status = 'pending';

    -- عدد الطلبات اليوم
    SELECT 
        COUNT(*)
    INTO 
        today_count
    FROM 
        abandoned_carts
    WHERE 
        organization_id = org_id
        AND status = 'pending'
        AND created_at >= CURRENT_DATE;

    -- عدد الطلبات هذا الأسبوع
    SELECT 
        COUNT(*)
    INTO 
        week_count
    FROM 
        abandoned_carts
    WHERE 
        organization_id = org_id
        AND status = 'pending'
        AND created_at >= CURRENT_DATE - INTERVAL '7 days';

    -- عدد الطلبات هذا الشهر
    SELECT 
        COUNT(*)
    INTO 
        month_count
    FROM 
        abandoned_carts
    WHERE 
        organization_id = org_id
        AND status = 'pending'
        AND created_at >= CURRENT_DATE - INTERVAL '30 days';

    -- متوسط القيمة
    IF total_count > 0 THEN
        avg_value := total_value / total_count;
    ELSE
        avg_value := 0;
    END IF;

    -- تحديث أو إدراج إحصائيات
    INSERT INTO abandoned_carts_stats (
        organization_id,
        total_count,
        total_value,
        today_count,
        week_count,
        month_count,
        avg_value,
        updated_at
    ) VALUES (
        org_id,
        total_count,
        total_value,
        today_count,
        week_count,
        month_count,
        avg_value,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (organization_id) DO UPDATE SET
        total_count = EXCLUDED.total_count,
        total_value = EXCLUDED.total_value,
        today_count = EXCLUDED.today_count,
        week_count = EXCLUDED.week_count,
        month_count = EXCLUDED.month_count,
        avg_value = EXCLUDED.avg_value,
        updated_at = EXCLUDED.updated_at;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفز لتحديث الإحصائيات تلقائياً
CREATE TRIGGER update_abandoned_cart_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON abandoned_carts
FOR EACH ROW
EXECUTE FUNCTION update_abandoned_cart_stats();

-- تشغيل تحديث أولي للإحصائيات لكل المؤسسات
DO $$
DECLARE
    org_record RECORD;
    total_count INT;
    total_value NUMERIC;
    today_count INT;
    week_count INT;
    month_count INT;
    avg_value NUMERIC;
BEGIN
    -- معالجة كل مؤسسة على حدة
    FOR org_record IN 
        SELECT DISTINCT organization_id FROM abandoned_carts
    LOOP
        -- إحصاء العدد الإجمالي والقيمة
        SELECT 
            COUNT(*),
            COALESCE(SUM(total_amount), 0)
        INTO 
            total_count,
            total_value
        FROM 
            abandoned_carts
        WHERE 
            organization_id = org_record.organization_id
            AND status = 'pending';

        -- عدد الطلبات اليوم
        SELECT 
            COUNT(*)
        INTO 
            today_count
        FROM 
            abandoned_carts
        WHERE 
            organization_id = org_record.organization_id
            AND status = 'pending'
            AND created_at >= CURRENT_DATE;

        -- عدد الطلبات هذا الأسبوع
        SELECT 
            COUNT(*)
        INTO 
            week_count
        FROM 
            abandoned_carts
        WHERE 
            organization_id = org_record.organization_id
            AND status = 'pending'
            AND created_at >= CURRENT_DATE - INTERVAL '7 days';

        -- عدد الطلبات هذا الشهر
        SELECT 
            COUNT(*)
        INTO 
            month_count
        FROM 
            abandoned_carts
        WHERE 
            organization_id = org_record.organization_id
            AND status = 'pending'
            AND created_at >= CURRENT_DATE - INTERVAL '30 days';

        -- متوسط القيمة
        IF total_count > 0 THEN
            avg_value := total_value / total_count;
        ELSE
            avg_value := 0;
        END IF;

        -- تحديث أو إدراج إحصائيات
        INSERT INTO abandoned_carts_stats (
            organization_id,
            total_count,
            total_value,
            today_count,
            week_count,
            month_count,
            avg_value,
            updated_at
        ) VALUES (
            org_record.organization_id,
            total_count,
            total_value,
            today_count,
            week_count,
            month_count,
            avg_value,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (organization_id) DO UPDATE SET
            total_count = EXCLUDED.total_count,
            total_value = EXCLUDED.total_value,
            today_count = EXCLUDED.today_count,
            week_count = EXCLUDED.week_count,
            month_count = EXCLUDED.month_count,
            avg_value = EXCLUDED.avg_value,
            updated_at = EXCLUDED.updated_at;
    END LOOP;
END
$$; 
 