-- ملف تحسين أداء صفحة الطلبات المتروكة
-- =======================================

-- 1. إنشاء الجداول المُجمعة (Materialized Views)
-- -----------------------------------------------

-- حذف الجداول المُجمعة إذا كانت موجودة بالفعل
DROP MATERIALIZED VIEW IF EXISTS abandoned_carts_view;
DROP MATERIALIZED VIEW IF EXISTS abandoned_carts_stats;

-- إنشاء جدول مُجمع لعرض الطلبات المتروكة
CREATE MATERIALIZED VIEW abandoned_carts_view AS
SELECT 
  ac.id, 
  ac.organization_id,
  ac.product_id,
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
  EXTRACT(EPOCH FROM (NOW() - ac.last_activity_at))/3600 AS abandoned_hours,
  p.name_ar AS province_name,
  m.name_ar AS municipality_name,
  jsonb_array_length(cart_items) AS item_count
FROM 
  abandoned_carts ac
LEFT JOIN 
  yalidine_provinces_global p ON ac.province::int = p.id
LEFT JOIN 
  yalidine_municipalities_global m ON ac.municipality::int = m.id
WHERE 
  ac.status = 'pending'
WITH NO DATA;

-- إضافة فهرس فريد على الجدول المُجمع - ضروري للتحديث المتزامن
CREATE UNIQUE INDEX idx_abandoned_carts_view_id ON abandoned_carts_view (id);

-- ملء البيانات
REFRESH MATERIALIZED VIEW abandoned_carts_view;

-- إنشاء جدول مُجمع للإحصائيات
CREATE MATERIALIZED VIEW abandoned_carts_stats AS
SELECT
  organization_id,
  COUNT(*) AS total_count,
  SUM(total_amount) AS total_value,
  AVG(total_amount) AS avg_value,
  SUM(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END) AS today_count,
  SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) AS week_count,
  SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) AS month_count
FROM
  abandoned_carts
WHERE
  status = 'pending'
GROUP BY
  organization_id
WITH NO DATA;

-- حذف الفهرس السابق إذا كان موجودًا
DROP INDEX IF EXISTS idx_abandoned_carts_stats_org_id;

-- إضافة فهرس فريد على الجدول المُجمع للإحصائيات
CREATE UNIQUE INDEX idx_abandoned_carts_stats_org_id ON abandoned_carts_stats (organization_id);

-- ملء البيانات
REFRESH MATERIALIZED VIEW abandoned_carts_stats;

-- 2. تحسين الفهارس على الجداول الأساسية
-- -------------------------------------

-- فهرس مركب لتسريع البحث عن الطلبات حسب المؤسسة والحالة والتاريخ
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_org_status_date ON abandoned_carts 
  (organization_id, status, created_at DESC);

-- فهرس لتسريع البحث عن الطلبات حسب رقم الهاتف
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- تثبيت امتداد pg_trgm إذا لم يكن موجوداً
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_phone_trgm ON abandoned_carts 
  USING gin (customer_phone gin_trgm_ops);

-- فهرس لتسريع البحث عن الطلبات حسب تاريخ آخر نشاط
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_last_activity ON abandoned_carts 
  (organization_id, last_activity_at);

-- 3. إعداد التحديث التلقائي باستخدام pg_cron
-- -----------------------------------------

-- تثبيت امتداد pg_cron إذا لم يكن موجوداً
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- حذف المهام الموجودة بالفعل لتجنب التكرار
DO $$
BEGIN
    -- محاولة حذف الجدولة إذا كانت موجودة 
    PERFORM cron.unschedule('refresh_abandoned_carts_views');
EXCEPTION
    WHEN OTHERS THEN
        -- تجاهل الأخطاء إذا لم تكن الجدولة موجودة
        NULL;
END
$$;

-- تحديث الجداول المُجمعة كل ساعة
SELECT cron.schedule('refresh_abandoned_carts_views', '0 * * * *', 
  'REFRESH MATERIALIZED VIEW CONCURRENTLY abandoned_carts_view;
   REFRESH MATERIALIZED VIEW CONCURRENTLY abandoned_carts_stats;');

-- 4. إنشاء دالة للتنظيف التلقائي للطلبات المتروكة جداً
-- ------------------------------------------------------------

-- دالة لحذف الطلبات المتروكة القديمة (أكثر من 90 يوم)
CREATE OR REPLACE FUNCTION cleanup_old_abandoned_carts() RETURNS void AS $$
BEGIN
  DELETE FROM abandoned_carts 
  WHERE status = 'pending' 
  AND last_activity_at < NOW() - INTERVAL '90 days';
  
  -- إعادة تحديث الجداول المُجمعة بعد الحذف
  REFRESH MATERIALIZED VIEW CONCURRENTLY abandoned_carts_view;
  REFRESH MATERIALIZED VIEW CONCURRENTLY abandoned_carts_stats;
END;
$$ LANGUAGE plpgsql;

-- حذف الجدولة السابقة إذا كانت موجودة
DO $$
BEGIN
    PERFORM cron.unschedule('cleanup_old_abandoned_carts_weekly');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END
$$;

-- جدولة تنظيف الطلبات القديمة مرة واحدة في الأسبوع (يوم الأحد الساعة 3 صباحاً)
SELECT cron.schedule('cleanup_old_abandoned_carts_weekly', '0 3 * * 0', 'SELECT cleanup_old_abandoned_carts();');

-- 5. إنشاء وظيفة لحساب نسب التحويل
-- --------------------------------

-- دالة لحساب نسب التحويل والاسترداد
CREATE OR REPLACE FUNCTION calculate_conversion_rates(
  org_id uuid,
  time_range interval DEFAULT interval '30 days'
) RETURNS table (
  recovery_rate numeric,
  conversion_rate numeric
) AS $$
DECLARE
  total_abandoned int;
  recovered int;
  converted int;
BEGIN
  -- حساب عدد الطلبات المتروكة
  SELECT COUNT(*) INTO total_abandoned
  FROM abandoned_carts
  WHERE organization_id = org_id
  AND created_at >= NOW() - time_range;
  
  -- حساب عدد الطلبات المستردة
  SELECT COUNT(*) INTO recovered
  FROM abandoned_carts
  WHERE organization_id = org_id
  AND status = 'recovered'
  AND created_at >= NOW() - time_range;
  
  -- حساب عدد الطلبات المحولة إلى طلبات فعلية
  SELECT COUNT(*) INTO converted
  FROM online_orders
  WHERE organization_id = org_id
  AND conversion_source = 'abandoned_cart'
  AND created_at >= NOW() - time_range;
  
  -- حساب النسب المئوية
  recovery_rate := CASE WHEN total_abandoned > 0 THEN (recovered::numeric / total_abandoned) * 100 ELSE 0 END;
  conversion_rate := CASE WHEN total_abandoned > 0 THEN (converted::numeric / total_abandoned) * 100 ELSE 0 END;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- استخدام الدالة
-- SELECT * FROM calculate_conversion_rates('7a91c81f-347f-4aff-8a67-b6dc4ee0f29a');

-- 6. إنشاء وظيفة استرجاع الطلبات المتروكة
-- ---------------------------------------

-- دالة لتحويل الطلب المتروك إلى طلب عادي
CREATE OR REPLACE FUNCTION recover_abandoned_cart(
  cart_id uuid,
  operator_id uuid
) RETURNS uuid AS $$
DECLARE
  new_order_id uuid;
  cart_data record;
BEGIN
  -- الحصول على بيانات الطلب المتروك
  SELECT * INTO cart_data
  FROM abandoned_carts
  WHERE id = cart_id;
  
  -- إذا لم يوجد الطلب أو تم استرداده مسبقًا
  IF cart_data IS NULL OR cart_data.status <> 'pending' THEN
    RAISE EXCEPTION 'الطلب غير موجود أو تم استرداده مسبقًا';
  END IF;
  
  -- إنشاء طلب جديد
  INSERT INTO online_orders (
    organization_id,
    customer_name,
    customer_phone,
    customer_email,
    province,
    municipality,
    address,
    delivery_option,
    payment_method,
    notes,
    custom_fields_data,
    calculated_delivery_fee,
    subtotal,
    discount_amount,
    total_amount,
    status,
    conversion_source,
    recovered_by,
    cart_items
  ) VALUES (
    cart_data.organization_id,
    cart_data.customer_name,
    cart_data.customer_phone,
    cart_data.customer_email,
    cart_data.province,
    cart_data.municipality,
    cart_data.address,
    cart_data.delivery_option,
    cart_data.payment_method,
    cart_data.notes,
    cart_data.custom_fields_data,
    cart_data.calculated_delivery_fee,
    cart_data.subtotal,
    cart_data.discount_amount,
    cart_data.total_amount,
    'new',
    'abandoned_cart',
    operator_id,
    cart_data.cart_items
  ) RETURNING id INTO new_order_id;
  
  -- تحديث حالة الطلب المتروك
  UPDATE abandoned_carts
  SET 
    status = 'recovered',
    recovered_at = NOW(),
    recovered_by = operator_id,
    recovered_order_id = new_order_id
  WHERE id = cart_id;
  
  -- تحديث الجداول المُجمعة
  PERFORM pg_notify('refresh_materialized_views', '');
  
  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql;

-- استدعاء الدالة
-- SELECT recover_abandoned_cart('abandoned-cart-id-here', 'operator-id-here');

-- 7. إنشاء وظيفة لإرسال تذكيرات للعملاء
-- ------------------------------------

-- جدول لتخزين سجل التذكيرات
CREATE TABLE IF NOT EXISTS abandoned_cart_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abandoned_cart_id uuid NOT NULL REFERENCES abandoned_carts(id),
  sent_at timestamp with time zone DEFAULT NOW(),
  sent_by uuid,
  channel text,
  message text,
  status text DEFAULT 'pending'
);

-- دالة لتسجيل تذكير
CREATE OR REPLACE FUNCTION log_abandoned_cart_reminder(
  cart_id uuid,
  operator_id uuid,
  channel text,
  message text
) RETURNS uuid AS $$
DECLARE
  reminder_id uuid;
BEGIN
  INSERT INTO abandoned_cart_reminders (
    abandoned_cart_id,
    sent_by,
    channel,
    message,
    status
  ) VALUES (
    cart_id,
    operator_id,
    channel,
    message,
    'sent'
  ) RETURNING id INTO reminder_id;
  
  -- تحديث تاريخ آخر نشاط للطلب المتروك
  UPDATE abandoned_carts
  SET last_activity_at = NOW()
  WHERE id = cart_id;
  
  RETURN reminder_id;
END;
$$ LANGUAGE plpgsql;

-- 8. إعداد مشغل (trigger) لتحديث الجداول المُجمعة عند التغييرات
-- -----------------------------------------------------------

-- دالة لتحديث الجداول المُجمعة
CREATE OR REPLACE FUNCTION refresh_materialized_views() RETURNS trigger AS $$
BEGIN
  -- إرسال إشعار لتحديث الجداول المُجمعة
  PERFORM pg_notify('refresh_materialized_views', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- مشغل للتحديث عند إضافة أو تعديل أو حذف سجلات
CREATE TRIGGER trg_refresh_views_after_abandoned_carts_change
AFTER INSERT OR UPDATE OR DELETE ON abandoned_carts
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_materialized_views();

-- 9. إضافة عمود لتتبع مصدر الطلبات المتروكة
-- -----------------------------------------

-- إضافة عمود لتتبع مصدر الطلب المتروك
ALTER TABLE abandoned_carts
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS recovered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS recovered_by uuid,
ADD COLUMN IF NOT EXISTS recovered_order_id uuid;

-- 10. إنشاء وظيفة للتنزيل إلى Excel
-- --------------------------------

-- هذه الوظيفة سيتم تنفيذها في الباك-اند للتطبيق
-- ولكن يمكن إعداد استعلام مخصص لتصدير البيانات

CREATE OR REPLACE FUNCTION export_abandoned_carts_data(
  org_id uuid,
  start_date timestamp with time zone,
  end_date timestamp with time zone
) RETURNS TABLE (
  cart_id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  total_amount numeric,
  created_at timestamp with time zone,
  last_activity_at timestamp with time zone,
  abandoned_hours numeric,
  province_name text,
  municipality_name text,
  address text,
  item_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.id as cart_id,
    ac.customer_name,
    ac.customer_phone,
    ac.customer_email,
    ac.total_amount,
    ac.created_at,
    ac.last_activity_at,
    EXTRACT(EPOCH FROM (NOW() - ac.last_activity_at))/3600 AS abandoned_hours,
    p.name_ar AS province_name,
    m.name_ar AS municipality_name,
    ac.address,
    jsonb_array_length(ac.cart_items) AS item_count
  FROM 
    abandoned_carts ac
  LEFT JOIN 
    yalidine_provinces_global p ON ac.province::int = p.id
  LEFT JOIN 
    yalidine_municipalities_global m ON ac.municipality::int = m.id
  WHERE 
    ac.organization_id = org_id
    AND ac.status = 'pending'
    AND ac.created_at BETWEEN start_date AND end_date
  ORDER BY 
    ac.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- استخدام الدالة
-- SELECT * FROM export_abandoned_carts_data('7a91c81f-347f-4aff-8a67-b6dc4ee0f29a', '2023-01-01', '2023-12-31');

-- إنشاء دالة لإرسال إشعار عند تحديث الطلبات المتروكة
CREATE OR REPLACE FUNCTION notify_refresh_materialized_views() RETURNS void AS $$
BEGIN
  -- إرسال إشعار لقناة refresh_materialized_views
  PERFORM pg_notify('refresh_materialized_views', 'refresh');
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة لتنفيذ عملية التحديث عند استلام الإشعار
CREATE OR REPLACE FUNCTION listen_and_refresh_abandoned_carts() RETURNS void AS $$
DECLARE
  last_refresh TIMESTAMP WITH TIME ZONE := NULL;
  channel_name TEXT := 'refresh_materialized_views';
  notification RECORD;
  current_time_var TIMESTAMP WITH TIME ZONE;
BEGIN
  -- الاستماع إلى قناة الإشعارات
  LISTEN refresh_materialized_views;
  
  -- حلقة مستمرة لانتظار الإشعارات
  LOOP
    -- انتظار الإشعار التالي بوقت انتظار محدد (30 ثانية)
    SELECT * INTO notification FROM pg_notify;
    
    -- حساب الوقت الحالي
    current_time_var := CLOCK_TIMESTAMP();
    
    -- إذا لم يتم تلقي أي إشعار خلال 30 ثانية، تحقق من احتياجنا للتحديث
    IF notification.channel = channel_name OR 
       (last_refresh IS NULL OR current_time_var - last_refresh > INTERVAL '5 minutes') THEN
      -- تنفيذ التحديث للجداول المُجمعة
      RAISE NOTICE 'Refreshing materialized views at %', current_time_var;
      
      -- تحديث الجداول المُجمعة باستخدام CONCURRENTLY إذا كان ممكنًا
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY abandoned_carts_view;
        REFRESH MATERIALIZED VIEW CONCURRENTLY abandoned_carts_stats;
        RAISE NOTICE 'Materialized views refreshed successfully with CONCURRENTLY';
      EXCEPTION
        WHEN OTHERS THEN
          -- في حالة حدوث خطأ، حاول التحديث بدون CONCURRENTLY
          RAISE NOTICE 'Error refreshing with CONCURRENTLY, falling back to regular refresh: %', SQLERRM;
          REFRESH MATERIALIZED VIEW abandoned_carts_view;
          REFRESH MATERIALIZED VIEW abandoned_carts_stats;
          RAISE NOTICE 'Materialized views refreshed successfully without CONCURRENTLY';
      END;
      
      -- تحديث وقت آخر تحديث
      last_refresh := current_time_var;
    END IF;
    
    -- تأخير لتجنب الاستهلاك المفرط للموارد (5 ثواني)
    PERFORM pg_sleep(5);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مهمة لتحديث الجداول المُجمعة كل 5 دقائق
-- ملاحظة: pg_background_launch غير متوفر في Supabase، لذا نستخدم cron job بسيط
SELECT cron.schedule('refresh_abandoned_carts', '*/5 * * * *', $$ 
  -- تحديث الجداول المُجمعة كل 5 دقائق
  REFRESH MATERIALIZED VIEW CONCURRENTLY abandoned_carts_view;
  REFRESH MATERIALIZED VIEW CONCURRENTLY abandoned_carts_stats;
$$); 