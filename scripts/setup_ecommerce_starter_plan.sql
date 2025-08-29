-- سكريبت إعداد خطة التجار الإلكترونيين المبتدئين
-- يجب تشغيله بعد تطبيق add_online_orders_limits.sql

-- 1. إنشاء الوظائف المساعدة إذا لم تكن موجودة

-- دالة لإنشاء اشتراك تجريبي للخطة الجديدة
CREATE OR REPLACE FUNCTION create_ecommerce_starter_trial(p_organization_id UUID)
RETURNS void AS $$
BEGIN
    -- إدراج اشتراك تجريبي لمدة 5 أيام
    INSERT INTO organization_subscriptions (
        organization_id,
        plan_id,
        status,
        billing_cycle,
        start_date,
        end_date,
        trial_ends_at,
        amount_paid,
        currency,
        is_auto_renew
    )
    SELECT
        p_organization_id,
        sp.id,
        'trial',
        'monthly',
        NOW(),
        NOW() + INTERVAL '5 days',
        NOW() + INTERVAL '5 days',
        0,
        'DZD',
        FALSE
    FROM subscription_plans sp
    WHERE sp.code = 'ecommerce_starter';

    -- تحديث حالة المؤسسة
    UPDATE organizations
    SET
        subscription_status = 'trial',
        subscription_tier = 'starter',
        subscription_id = (
            SELECT id FROM organization_subscriptions
            WHERE organization_id = p_organization_id
            ORDER BY created_at DESC LIMIT 1
        ),
        online_orders_limit = 100
    WHERE id = p_organization_id;

    RAISE NOTICE 'تم إنشاء اشتراك تجريبي للمؤسسة %', p_organization_id;
END;
$$ LANGUAGE plpgsql;

-- إشعار نجاح إنشاء الدالة
DO $$
BEGIN
    RAISE NOTICE 'تم إنشاء دالة create_ecommerce_starter_trial بنجاح';
END $$;

-- 2. إنشاء عرض للمؤسسات المؤهلة للخطة الجديدة
CREATE OR REPLACE VIEW eligible_for_ecommerce_starter AS
SELECT
    o.id,
    o.name,
    o.created_at,
    CASE
        WHEN o.subscription_status IS NULL THEN 'جديد'
        WHEN o.subscription_status = 'expired' THEN 'منتهي'
        WHEN o.subscription_status = 'trial' AND o.created_at < NOW() - INTERVAL '5 days' THEN 'جاهز للترقية'
        ELSE 'غير مؤهل'
    END as eligibility_status,
    o.subscription_status,
    o.created_at + INTERVAL '5 days' as trial_ends_at
FROM organizations o
WHERE (
    o.subscription_status IS NULL OR
    o.subscription_status IN ('trial', 'expired')
) AND
o.created_at > NOW() - INTERVAL '30 days';

-- 3. إنشاء وظيفة لترقية المؤسسة للخطة الجديدة
CREATE OR REPLACE FUNCTION upgrade_to_ecommerce_starter(p_organization_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_plan_id UUID;
    v_subscription_id UUID;
BEGIN
    -- الحصول على معرف الخطة
    SELECT id INTO v_plan_id
    FROM subscription_plans
    WHERE code = 'ecommerce_starter';

    IF v_plan_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'خطة التجار الإلكترونيين غير موجودة');
    END IF;

    -- إنشاء اشتراك جديد
    INSERT INTO organization_subscriptions (
        organization_id,
        plan_id,
        status,
        billing_cycle,
        start_date,
        end_date,
        amount_paid,
        currency,
        is_auto_renew
    ) VALUES (
        p_organization_id,
        v_plan_id,
        'active',
        'monthly',
        NOW(),
        NOW() + INTERVAL '1 month',
        1000,
        'DZD',
        TRUE
    ) RETURNING id INTO v_subscription_id;

    -- تحديث المؤسسة
    UPDATE organizations
    SET
        subscription_status = 'active',
        subscription_tier = 'starter',
        subscription_id = v_subscription_id,
        online_orders_limit = 100,
        store_blocked = FALSE,
        store_block_reason = NULL
    WHERE id = p_organization_id;

    -- إنشاء سجل الاستخدام الأولي
    INSERT INTO monthly_online_orders_usage (
        organization_id,
        year_month,
        orders_count,
        orders_limit
    ) VALUES (
        p_organization_id,
        TO_CHAR(NOW(), 'YYYY-MM'),
        0,
        100
    ) ON CONFLICT (organization_id, year_month)
    DO UPDATE SET orders_limit = 100;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم الترقية لخطة التجار الإلكترونيين المبتدئين بنجاح',
        'subscription_id', v_subscription_id,
        'plan_id', v_plan_id
    );
END;
$$ LANGUAGE plpgsql;

-- 4. إنشاء وظيفة لإضافة طلبيات إضافية
CREATE OR REPLACE FUNCTION add_online_orders_credits(
    p_organization_id UUID,
    p_additional_orders INTEGER,
    p_amount_paid NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_current_limit INTEGER;
    v_new_limit INTEGER;
BEGIN
    -- الحصول على الحد الحالي
    SELECT COALESCE(online_orders_limit, 0)
    INTO v_current_limit
    FROM organizations
    WHERE id = p_organization_id;

    -- حساب الحد الجديد
    v_new_limit := v_current_limit + p_additional_orders;

    -- تحديث الحد في المؤسسة
    UPDATE organizations
    SET
        online_orders_limit = v_new_limit,
        store_blocked = FALSE,
        store_block_reason = NULL
    WHERE id = p_organization_id;

    -- تحديث الحد في جدول الاستخدام الشهري
    UPDATE monthly_online_orders_usage
    SET orders_limit = v_new_limit
    WHERE organization_id = p_organization_id
      AND year_month = TO_CHAR(NOW(), 'YYYY-MM');

    -- تسجيل المعاملة (يمكن ربطها بجدول المعاملات المالية)
    INSERT INTO subscription_transactions (
        organization_id,
        service_name,
        provider,
        transaction_type,
        amount,
        payment_method,
        payment_status,
        description
    ) VALUES (
        p_organization_id,
        'إضافة طلبيات إلكترونية',
        'نظام الإشتراكات',
        'sale',
        p_amount_paid,
        'online',
        'completed',
        format('إضافة %s طلبية إلكترونية', p_additional_orders)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', format('تم إضافة %s طلبية إلكترونية بنجاح', p_additional_orders),
        'new_limit', v_new_limit,
        'amount_paid', p_amount_paid
    );
END;
$$ LANGUAGE plpgsql;

-- 5. إنشاء وظيفة للتحقق من حالة المتجر
CREATE OR REPLACE FUNCTION get_store_status(p_organization_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_limit_info JSONB;
    v_store_blocked BOOLEAN;
    v_block_reason TEXT;
BEGIN
    -- التحقق من حدود الطلبيات
    v_limit_info := check_online_orders_limit(p_organization_id);

    -- الحصول على حالة الحظر
    SELECT store_blocked, store_block_reason
    INTO v_store_blocked, v_block_reason
    FROM organizations
    WHERE id = p_organization_id;

    RETURN jsonb_build_object(
        'organization_id', p_organization_id,
        'is_blocked', v_store_blocked,
        'block_reason', v_block_reason,
        'limit_info', v_limit_info,
        'can_operate', NOT v_store_blocked AND (v_limit_info->>'can_order')::BOOLEAN,
        'recommendation', CASE
            WHEN v_store_blocked THEN 'يرجى دفع المستحقات أو ترقية الخطة'
            WHEN NOT (v_limit_info->>'can_order')::BOOLEAN THEN 'تم تجاوز حد الطلبيات الشهرية'
            ELSE 'المتجر يعمل بشكل طبيعي'
        END
    );
END;
$$ LANGUAGE plpgsql;

-- 6. إنشاء وظيفة لإحصائيات الخطة
CREATE OR REPLACE FUNCTION get_ecommerce_starter_stats()
RETURNS JSONB AS $$
DECLARE
    v_total_subscribers INTEGER;
    v_active_subscribers INTEGER;
    v_blocked_stores INTEGER;
    v_avg_usage DECIMAL;
    v_total_revenue NUMERIC;
BEGIN
    -- إجمالي المشتركين في الخطة
    SELECT COUNT(*)
    INTO v_total_subscribers
    FROM organization_subscriptions os
    JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE sp.code = 'ecommerce_starter';

    -- المشتركين النشطين
    SELECT COUNT(*)
    INTO v_active_subscribers
    FROM organization_subscriptions os
    JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE sp.code = 'ecommerce_starter' AND os.status = 'active';

    -- المتاجر المحظورة
    SELECT COUNT(*)
    INTO v_blocked_stores
    FROM organizations o
    WHERE o.store_blocked = TRUE;

    -- متوسط الاستخدام
    SELECT COALESCE(AVG(orders_count), 0)
    INTO v_avg_usage
    FROM monthly_online_orders_usage mou
    JOIN organizations o ON mou.organization_id = o.id
    JOIN organization_subscriptions os ON o.id = os.organization_id
    JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE sp.code = 'ecommerce_starter'
      AND mou.year_month = TO_CHAR(NOW(), 'YYYY-MM');

    -- إجمالي الإيرادات
    SELECT COALESCE(SUM(os.amount_paid), 0)
    INTO v_total_revenue
    FROM organization_subscriptions os
    JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE sp.code = 'ecommerce_starter' AND os.status = 'active';

    RETURN jsonb_build_object(
        'total_subscribers', v_total_subscribers,
        'active_subscribers', v_active_subscribers,
        'blocked_stores', v_blocked_stores,
        'avg_monthly_usage', v_avg_usage,
        'total_revenue', v_total_revenue,
        'generated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 7. إنشاء مهمة مجدولة للتنظيف الشهري (cron job)
CREATE OR REPLACE FUNCTION monthly_ecommerce_maintenance()
RETURNS void AS $$
BEGIN
    -- إعادة تعيين العدادات الشهرية
    PERFORM reset_monthly_online_orders();

    -- فك حظر المتاجر التي دفع مستحقاتها (يمكن تخصيص هذا حسب الاحتياجات)
    UPDATE organizations
    SET store_blocked = FALSE, store_block_reason = NULL
    WHERE store_blocked = TRUE
      AND store_block_reason = 'تجاوز حد الطلبيات الإلكترونية الشهرية'
      AND online_orders_this_month < online_orders_limit;

    -- تسجيل الإحصائيات الشهرية
    INSERT INTO maintenance_log (action, details, created_at)
    VALUES (
        'monthly_ecommerce_maintenance',
        get_ecommerce_starter_stats(),
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 8. إنشاء عرض للمراقبة اليومية
CREATE OR REPLACE VIEW ecommerce_starter_monitoring AS
SELECT
    o.id,
    o.name,
    o.store_blocked,
    o.store_block_reason,
    mou.orders_count,
    mou.orders_limit,
    CASE
        WHEN mou.orders_count >= mou.orders_limit THEN 'محظور'
        WHEN mou.orders_count >= mou.orders_limit * 0.8 THEN 'قريب من الحد'
        ELSE 'طبيعي'
    END as usage_status,
    sp.name as plan_name,
    os.status as subscription_status,
    os.end_date,
    o.created_at
FROM organizations o
LEFT JOIN monthly_online_orders_usage mou ON o.id = mou.organization_id
    AND mou.year_month = TO_CHAR(NOW(), 'YYYY-MM')
LEFT JOIN organization_subscriptions os ON o.id = os.organization_id
    AND os.status = 'active'
LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
WHERE sp.code = 'ecommerce_starter' OR sp.code IS NULL;

-- 9. إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_ecommerce_starter_org_id ON monthly_online_orders_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_starter_year_month ON monthly_online_orders_usage(year_month);
CREATE INDEX IF NOT EXISTS idx_ecommerce_starter_orders_count ON monthly_online_orders_usage(orders_count);
CREATE INDEX IF NOT EXISTS idx_organizations_online_orders_limit ON organizations(online_orders_limit);
CREATE INDEX IF NOT EXISTS idx_organizations_store_blocked ON organizations(store_blocked);

-- فهرس للبحث السريع في الطلبيات حسب المؤسسة والتاريخ
CREATE INDEX IF NOT EXISTS idx_online_orders_org_created_desc ON online_orders(organization_id, created_at DESC);

-- فهرس للاستعلامات المركبة الشائعة
CREATE INDEX IF NOT EXISTS idx_online_orders_org_status_created ON online_orders(organization_id, status, created_at DESC);

-- 10. إدراج بيانات تجريبية (اختياري)
-- يمكن حذف هذا القسم في بيئة الإنتاج
/*
DO $$
DECLARE
    test_org_id UUID := gen_random_uuid();
BEGIN
    -- إدراج مؤسسة تجريبية
    INSERT INTO organizations (id, name, subscription_status)
    VALUES (test_org_id, 'متجر تجريبي للتجارة الإلكترونية', 'trial');

    -- إنشاء اشتراك تجريبي
    PERFORM create_ecommerce_starter_trial(test_org_id);

    RAISE NOTICE 'تم إنشاء مؤسسة تجريبية: %', test_org_id;
END $$;
*/

COMMENT ON TABLE monthly_online_orders_usage IS 'تتبع استخدام الطلبيات الإلكترونية الشهري لخطة التجار المبتدئين';
COMMENT ON COLUMN organizations.online_orders_limit IS 'الحد الأقصى للطلبيات الإلكترونية الشهرية';
COMMENT ON COLUMN organizations.store_blocked IS 'حالة حظر المتجر عند تجاوز الحدود';
COMMENT ON COLUMN subscription_plans.max_online_orders IS 'الحد الأقصى للطلبيات الإلكترونية في الخطة';

-- نهاية السكريبت - إشعارات النجاح
DO $$
BEGIN
    RAISE NOTICE 'تم إعداد خطة التجار الإلكترونيين المبتدئين بنجاح!';
    RAISE NOTICE 'يمكنك الآن استخدام الوظائف التالية:';
    RAISE NOTICE '1. create_ecommerce_starter_trial(organization_id) - إنشاء اشتراك تجريبي';
    RAISE NOTICE '2. upgrade_to_ecommerce_starter(organization_id) - ترقية للخطة المدفوعة';
    RAISE NOTICE '3. add_online_orders_credits(organization_id, orders_count, amount) - إضافة طلبيات';
    RAISE NOTICE '4. get_store_status(organization_id) - التحقق من حالة المتجر';
    RAISE NOTICE '5. get_ecommerce_starter_stats() - إحصائيات الخطة';
    RAISE NOTICE '6. monthly_ecommerce_maintenance() - الصيانة الشهرية';
END $$;
