-- إصلاح مشاكل نظام الحدود للطلبيات الإلكترونية
-- يُشغل بعد تطبيق add_online_orders_limits.sql

-- 1. إصلاح مشكلة الفهارس غير الثابتة
DO $$
BEGIN
    -- حذف الفهرس المشكوك فيه إذا كان موجوداً
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'online_orders'
        AND indexname = 'idx_online_orders_organization_created_month'
    ) THEN
        DROP INDEX IF EXISTS idx_online_orders_organization_created_month;
        RAISE NOTICE 'تم حذف الفهرس المشكوك فيه: idx_online_orders_organization_created_month';
    END IF;

    -- إنشاء فهارس آمنة بدلاً منها
    CREATE INDEX IF NOT EXISTS idx_online_orders_org_created_desc
    ON online_orders(organization_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_online_orders_org_status_created
    ON online_orders(organization_id, status, created_at DESC);

    RAISE NOTICE 'تم إنشاء الفهارس البديلة بنجاح';
END $$;

-- 2. إصلاح دالة calculate_monthly_online_orders لتجنب مشاكل الأداء
CREATE OR REPLACE FUNCTION calculate_monthly_online_orders_optimized(p_organization_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_current_month TEXT;
    v_orders_count INTEGER := 0;
BEGIN
    -- الحصول على الشهر الحالي بطريقة آمنة
    v_current_month := TO_CHAR(NOW(), 'YYYY-MM');

    -- حساب عدد الطلبيات في الشهر الحالي بطريقة محسنة
    SELECT COUNT(*)
    INTO v_orders_count
    FROM online_orders
    WHERE organization_id = p_organization_id
      AND created_at >= DATE_TRUNC('month', NOW())
      AND created_at < DATE_TRUNC('month', NOW() + INTERVAL '1 month');

    -- تحديث أو إدراج السجل في جدول الاستخدام
    INSERT INTO monthly_online_orders_usage (
        organization_id, year_month, orders_count
    ) VALUES (
        p_organization_id, v_current_month, v_orders_count
    ) ON CONFLICT (organization_id, year_month)
    DO UPDATE SET
        orders_count = v_orders_count,
        updated_at = NOW();

    RETURN v_orders_count;
END;
$$ LANGUAGE plpgsql;

-- 3. إصلاح دالة check_online_orders_limit لاستخدام الدالة المحسنة
CREATE OR REPLACE FUNCTION check_online_orders_limit_fixed(p_organization_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_current_orders INTEGER;
    v_max_orders INTEGER;
    v_result JSONB;
BEGIN
    -- الحصول على الحد المسموح من خطة الإشتراك
    SELECT sp.max_online_orders
    INTO v_max_orders
    FROM organizations o
    LEFT JOIN organization_subscriptions os ON o.id = os.organization_id AND os.status = 'active'
    LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE o.id = p_organization_id;

    -- إذا لم يكن هناك حد محدد، لا توجد قيود
    IF v_max_orders IS NULL THEN
        RETURN jsonb_build_object(
            'can_order', true,
            'current_orders', 0,
            'max_orders', null,
            'remaining_orders', null,
            'is_blocked', false
        );
    END IF;

    -- حساب الطلبيات الحالية باستخدام الدالة المحسنة
    v_current_orders := calculate_monthly_online_orders_optimized(p_organization_id);

    -- التحقق من التجاوز
    IF v_current_orders >= v_max_orders THEN
        -- حظر المتجر
        UPDATE organizations
        SET store_blocked = TRUE,
            store_block_reason = 'تجاوز حد الطلبيات الإلكترونية الشهرية'
        WHERE id = p_organization_id;

        v_result := jsonb_build_object(
            'can_order', false,
            'current_orders', v_current_orders,
            'max_orders', v_max_orders,
            'remaining_orders', 0,
            'is_blocked', true,
            'message', 'تم تجاوز حد الطلبيات الإلكترونية الشهرية'
        );
    ELSE
        -- فك حظر المتجر إذا كان محظوراً بسبب هذا السبب
        UPDATE organizations
        SET store_blocked = FALSE,
            store_block_reason = NULL
        WHERE id = p_organization_id
          AND store_block_reason = 'تجاوز حد الطلبيات الإلكترونية الشهرية';

        v_result := jsonb_build_object(
            'can_order', true,
            'current_orders', v_current_orders,
            'max_orders', v_max_orders,
            'remaining_orders', v_max_orders - v_current_orders,
            'is_blocked', false
        );
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 4. تحديث دالة process_online_order_with_limits لاستخدام الدالة المصلحة
CREATE OR REPLACE FUNCTION process_online_order_with_limits_fixed(
  p_full_name TEXT,
  p_phone TEXT,
  p_province TEXT,
  p_municipality TEXT,
  p_product_id UUID,
  p_organization_id UUID,
  p_address TEXT DEFAULT '',
  p_city TEXT DEFAULT NULL,
  p_delivery_company TEXT DEFAULT '',
  p_delivery_option TEXT DEFAULT 'home',
  p_payment_method TEXT DEFAULT 'cod',
  p_notes TEXT DEFAULT '',
  p_product_color_id UUID DEFAULT NULL,
  p_product_size_id UUID DEFAULT NULL,
  p_size_name TEXT DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1,
  p_unit_price NUMERIC DEFAULT 0,
  p_total_price NUMERIC DEFAULT 0,
  p_delivery_fee NUMERIC DEFAULT 0,
  p_form_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_stop_desk_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_limit_check JSONB;
    v_result JSONB;
BEGIN
    -- التحقق من الحدود أولاً باستخدام الدالة المصلحة
    v_limit_check := check_online_orders_limit_fixed(p_organization_id);

    IF NOT (v_limit_check->>'can_order')::BOOLEAN THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'error', 'تجاوز حد الطلبيات الإلكترونية',
            'details', v_limit_check->>'message',
            'limit_info', v_limit_check
        );
    END IF;

    -- إذا كان مسموحاً، معالجة الطلبية
    v_result := process_online_order_new(
        p_full_name, p_phone, p_province, p_municipality,
        p_product_id, p_organization_id, p_address, p_city,
        p_delivery_company, p_delivery_option, p_payment_method,
        p_notes, p_product_color_id, p_product_size_id, p_size_name,
        p_quantity, p_unit_price, p_total_price, p_delivery_fee,
        p_form_data, p_metadata, p_stop_desk_id
    );

    -- إعادة التحقق من الحدود بعد إنشاء الطلبية
    PERFORM check_online_orders_limit_fixed(p_organization_id);

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 5. إنشاء عرض محسن للمراقبة
CREATE OR REPLACE VIEW blocked_stores_view_fixed AS
SELECT
    o.id,
    o.name as organization_name,
    o.store_blocked,
    o.store_block_reason,
    mou.orders_count as current_month_orders,
    mou.orders_limit as monthly_limit,
    sp.name as subscription_plan,
    sp.max_online_orders,
    CASE
        WHEN o.store_blocked THEN 'محظور'
        ELSE 'نشط'
    END as status,
    -- إضافة معلومات إضافية للتشخيص
    o.created_at as organization_created_at,
    mou.year_month,
    mou.updated_at as last_usage_update
FROM organizations o
LEFT JOIN monthly_online_orders_usage mou ON o.id = mou.organization_id
    AND mou.year_month = TO_CHAR(NOW(), 'YYYY-MM')
LEFT JOIN organization_subscriptions os ON o.id = os.organization_id
    AND os.status = 'active'
LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
WHERE o.store_blocked = TRUE OR sp.max_online_orders IS NOT NULL;

-- 6. إنشاء دالة لإعادة بناء إحصائيات الاستخدام (في حالة الحاجة)
CREATE OR REPLACE FUNCTION rebuild_monthly_usage_stats()
RETURNS void AS $$
DECLARE
    v_org_record RECORD;
    v_current_month TEXT;
BEGIN
    v_current_month := TO_CHAR(NOW(), 'YYYY-MM');

    -- حذف السجلات القديمة للشهر الحالي
    DELETE FROM monthly_online_orders_usage
    WHERE year_month = v_current_month;

    -- إعادة بناء الإحصائيات لجميع المؤسسات
    FOR v_org_record IN
        SELECT DISTINCT organization_id
        FROM online_orders
        WHERE created_at >= DATE_TRUNC('month', NOW())
          AND created_at < DATE_TRUNC('month', NOW() + INTERVAL '1 month')
    LOOP
        -- حساب وتحديث إحصائيات كل مؤسسة
        PERFORM calculate_monthly_online_orders_optimized(v_org_record.organization_id);
    END LOOP;

    RAISE NOTICE 'تم إعادة بناء إحصائيات الاستخدام الشهرية بنجاح';
END;
$$ LANGUAGE plpgsql;

-- 7. إضافة تعليقات توضيحية للدوال
COMMENT ON FUNCTION calculate_monthly_online_orders_optimized(UUID) IS 'حساب محسن للطلبيات الشهرية بدون استخدام دوال غير ثابتة';
COMMENT ON FUNCTION check_online_orders_limit_fixed(UUID) IS 'دالة محسنة للتحقق من حدود الطلبيات الإلكترونية';
COMMENT ON FUNCTION process_online_order_with_limits_fixed(UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, JSONB, JSONB, UUID) IS 'دالة محسنة لمعالجة الطلبيات مع التحقق من الحدود';
COMMENT ON VIEW blocked_stores_view_fixed IS 'عرض محسن للمراقبة مع معلومات إضافية للتشخيص';

-- 8. إنشاء فهارس إضافية محسنة
CREATE INDEX IF NOT EXISTS idx_online_orders_org_created_month_safe
ON online_orders(organization_id, DATE_TRUNC('month', created_at));

CREATE INDEX IF NOT EXISTS idx_online_orders_created_at_month
ON online_orders(DATE_TRUNC('month', created_at), organization_id);

-- 9. اختبار الدوال الجديدة
DO $$
DECLARE
    v_test_result JSONB;
BEGIN
    -- اختبار الدالة المحسنة إذا كانت هناك مؤسسات
    IF EXISTS (SELECT 1 FROM organizations LIMIT 1) THEN
        SELECT check_online_orders_limit_fixed(organization_id)
        INTO v_test_result
        FROM (SELECT id as organization_id FROM organizations LIMIT 1) org;

        RAISE NOTICE 'تم اختبار الدالة بنجاح: %', v_test_result->>'can_order';
    ELSE
        RAISE NOTICE 'لا توجد مؤسسات للاختبار، لكن الدوال تم إنشاؤها بنجاح';
    END IF;
END $$;

-- نهاية ملف الإصلاح
RAISE NOTICE 'تم إصلاح جميع مشاكل نظام الحدود للطلبيات الإلكترونية بنجاح!';
RAISE NOTICE 'الدوال الجديدة:';
RAISE NOTICE '- calculate_monthly_online_orders_optimized()';
RAISE NOTICE '- check_online_orders_limit_fixed()';
RAISE NOTICE '- process_online_order_with_limits_fixed()';
RAISE NOTICE '- rebuild_monthly_usage_stats()';
RAISE NOTICE 'العرض الجديد: blocked_stores_view_fixed';
