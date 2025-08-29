-- اختبار واجهة مستخدم خطة التجار الإلكترونيين المبتدئين
-- يُشغل للتأكد من أن جميع المكونات تعمل بشكل صحيح

-- 1. إنشاء مؤسسة تجريبية للاختبار
DO $$
DECLARE
    test_org_id UUID := '550e8400-e29b-41d4-a716-446655440000';
    test_user_id UUID := '660e8400-e29b-41d4-a716-446655440001';
BEGIN
    -- إدراج مستخدم تجريبي
    INSERT INTO users (id, name, email, auth_user_id, role)
    VALUES (test_user_id, 'مستخدم تجريبي', 'test@example.com', test_user_id::text, 'admin')
    ON CONFLICT (auth_user_id) DO NOTHING;

    -- إدراج مؤسسة تجريبية
    INSERT INTO organizations (id, name, subscription_status, subscription_tier)
    VALUES (test_org_id, 'متجر تجريبي للتجارة الإلكترونية', 'active', 'starter')
    ON CONFLICT (id) DO UPDATE SET
        subscription_status = 'active',
        subscription_tier = 'starter';

    -- ربط المستخدم بالمؤسسة
    INSERT INTO users (organization_id)
    VALUES (test_org_id)
    WHERE auth_user_id = test_user_id::text
    ON CONFLICT (auth_user_id) DO UPDATE SET organization_id = test_org_id;

    RAISE NOTICE 'تم إنشاء المؤسسة التجريبية: %', test_org_id;
END $$;

-- 2. إنشاء اشتراك تجريبي في الخطة الجديدة
DO $$
DECLARE
    test_org_id UUID := '550e8400-e29b-41d4-a716-446655440000';
    plan_id UUID;
    subscription_id UUID;
BEGIN
    -- الحصول على معرف الخطة
    SELECT id INTO plan_id
    FROM subscription_plans
    WHERE code = 'ecommerce_starter';

    IF plan_id IS NULL THEN
        RAISE EXCEPTION 'خطة التجار الإلكترونيين المبتدئين غير موجودة';
    END IF;

    -- إدراج اشتراك تجريبي
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
        test_org_id,
        plan_id,
        'active',
        'monthly',
        NOW(),
        NOW() + INTERVAL '1 month',
        1000,
        'DZD',
        TRUE
    ) RETURNING id INTO subscription_id;

    -- تحديث المؤسسة
    UPDATE organizations
    SET
        subscription_id = subscription_id,
        online_orders_limit = 100,
        store_blocked = FALSE,
        store_block_reason = NULL
    WHERE id = test_org_id;

    RAISE NOTICE 'تم إنشاء اشتراك تجريبي: %', subscription_id;
END $$;

-- 3. إنشاء بيانات طلبيات تجريبية
DO $$
DECLARE
    test_org_id UUID := '550e8400-e29b-41d4-a716-446655440000';
    customer_id UUID;
    product_id UUID;
    i INTEGER;
BEGIN
    -- إدراج عميل تجريبي
    INSERT INTO guest_customers (name, phone, organization_id)
    VALUES ('عميل تجريبي', '0551234567', test_org_id)
    RETURNING id INTO customer_id;

    -- إدراج منتج تجريبي
    INSERT INTO products (name, description, price, organization_id, stock_quantity)
    VALUES ('منتج تجريبي', 'منتج للاختبار', 1000, test_org_id, 100)
    RETURNING id INTO product_id;

    -- إدراج 25 طلبية تجريبية (مما يعني 75 طلبية متبقية)
    FOR i IN 1..25 LOOP
        INSERT INTO online_orders (
            customer_id,
            organization_id,
            subtotal,
            tax,
            discount,
            total,
            status,
            payment_method,
            payment_status,
            shipping_method,
            shipping_cost,
            notes,
            customer_order_number,
            created_at
        ) VALUES (
            customer_id,
            test_org_id,
            1000, -- سعر المنتج
            0,
            0,
            1100, -- الإجمالي مع الشحن
            'completed',
            'cod',
            'pending',
            'home_delivery',
            100,
            'طلبية تجريبية رقم ' || i,
            i,
            NOW() - INTERVAL '1 day' * (26 - i) -- توزيع على الأيام الماضية
        );
    END LOOP;

    RAISE NOTICE 'تم إدراج 25 طلبية تجريبية للمؤسسة %', test_org_id;
END $$;

-- 4. تحديث إحصائيات الاستخدام
DO $$
DECLARE
    test_org_id UUID := '550e8400-e29b-41d4-a716-446655440000';
BEGIN
    PERFORM calculate_monthly_online_orders_optimized(test_org_id);
    RAISE NOTICE 'تم تحديث إحصائيات الاستخدام الشهرية';
END $$;

-- 5. اختبار دالة التحقق من الحدود
DO $$
DECLARE
    test_org_id UUID := '550e8400-e29b-41d4-a716-446655440000';
    limit_check JSONB;
BEGIN
    -- اختبار الدالة المحسنة
    SELECT check_online_orders_limit_fixed(test_org_id) INTO limit_check;

    RAISE NOTICE 'نتيجة فحص الحدود: %', limit_check;

    -- التحقق من النتائج
    IF (limit_check->>'can_order')::BOOLEAN THEN
        RAISE NOTICE '✅ يمكن إنشاء طلبيات جديدة';
    ELSE
        RAISE NOTICE '❌ لا يمكن إنشاء طلبيات جديدة: %', limit_check->>'message';
    END IF;

    RAISE NOTICE '📊 الطلبيات المستخدمة: % من %',
        limit_check->>'current_orders',
        limit_check->>'max_orders';
END $$;

-- 6. عرض بيانات الاختبار النهائية
DO $$
DECLARE
    test_org_id UUID := '550e8400-e29b-41d4-a716-446655440000';
BEGIN
    RAISE NOTICE '=== بيانات المؤسسة التجريبية ===';

    -- عرض بيانات المؤسسة
    RAISE NOTICE 'المؤسسة: %', (SELECT name FROM organizations WHERE id = test_org_id);
    RAISE NOTICE 'الحالة: %', (SELECT subscription_status FROM organizations WHERE id = test_org_id);
    RAISE NOTICE 'الخطة: %', (SELECT subscription_tier FROM organizations WHERE id = test_org_id);

    -- عرض بيانات الاشتراك
    RAISE NOTICE 'الحد المسموح: %', (SELECT online_orders_limit FROM organizations WHERE id = test_org_id);

    -- عرض إحصائيات الطلبيات
    RAISE NOTICE 'عدد الطلبيات هذا الشهر: %',
        (SELECT COUNT(*) FROM online_orders
         WHERE organization_id = test_org_id
         AND created_at >= DATE_TRUNC('month', NOW()));

    -- عرض بيانات الاستخدام
    RAISE NOTICE 'إحصائيات الاستخدام: %',
        (SELECT row_to_json(mou) FROM monthly_online_orders_usage mou
         WHERE organization_id = test_org_id
         AND year_month = TO_CHAR(NOW(), 'YYYY-MM'));
END $$;

-- 7. اختبار العرض المحسن
SELECT
    '=== عرض المتاجر المحظورة ===' as info,
    COUNT(*) as blocked_stores_count
FROM blocked_stores_view_fixed
WHERE is_blocked = TRUE;

-- عرض تفاصيل المتجر التجريبي
SELECT
    o.id,
    o.name,
    o.store_blocked,
    o.online_orders_limit,
    mou.orders_count,
    mou.orders_limit,
    sp.name as plan_name,
    CASE
        WHEN o.store_blocked THEN 'محظور'
        ELSE 'نشط'
    END as status,
    CASE
        WHEN mou.orders_count >= mou.orders_limit THEN 'محظور'
        WHEN mou.orders_count >= mou.orders_limit * 0.8 THEN 'قريب من الحد'
        ELSE 'طبيعي'
    END as usage_status
FROM organizations o
LEFT JOIN monthly_online_orders_usage mou ON o.id = mou.organization_id
    AND mou.year_month = TO_CHAR(NOW(), 'YYYY-MM')
LEFT JOIN organization_subscriptions os ON o.id = os.organization_id
LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
WHERE o.id = '550e8400-e29b-41d4-a716-446655440000';

-- 8. إرشادات الاختبار اليدوي
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== إرشادات الاختبار اليدوي ===';
    RAISE NOTICE '1. قم بتسجيل الدخول بالمؤسسة التجريبية';
    RAISE NOTICE '2. تحقق من ظهور عداد الطلبيات في النافبار';
    RAISE NOTICE '3. يجب أن يظهر: 75 (100 - 25 طلبية مستخدمة)';
    RAISE NOTICE '4. تحقق من ظهور الإشعارات تحت النافبار';
    RAISE NOTICE '5. جرب إنشاء طلبيات جديدة للتحقق من العداد';
    RAISE NOTICE '6. عند الوصول لـ100 طلبية، يجب حظر المتجر';
    RAISE NOTICE '';
    RAISE NOTICE '=== لإزالة البيانات التجريبية ===';
    RAISE NOTICE 'DELETE FROM monthly_online_orders_usage WHERE organization_id = ''550e8400-e29b-41d4-a716-446655440000'';';
    RAISE NOTICE 'DELETE FROM online_orders WHERE organization_id = ''550e8400-e29b-41d4-a716-446655440000'';';
    RAISE NOTICE 'DELETE FROM products WHERE organization_id = ''550e8400-e29b-41d4-a716-446655440000'';';
    RAISE NOTICE 'DELETE FROM guest_customers WHERE organization_id = ''550e8400-e29b-41d4-a716-446655440000'';';
    RAISE NOTICE 'DELETE FROM organization_subscriptions WHERE organization_id = ''550e8400-e29b-41d4-a716-446655440000'';';
    RAISE NOTICE 'DELETE FROM organizations WHERE id = ''550e8400-e29b-41d4-a716-446655440000'';';
    RAISE NOTICE 'DELETE FROM users WHERE auth_user_id = ''660e8400-e29b-41d4-a716-446655440001'';';
END $$;

-- نهاية الاختبار
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 تم إعداد البيانات التجريبية بنجاح!';
    RAISE NOTICE 'يمكنك الآن اختبار عداد الطلبيات في النافبار';
    RAISE NOTICE 'المتجر التجريبي لديه 75 طلبية متبقية من أصل 100';
END $$;
