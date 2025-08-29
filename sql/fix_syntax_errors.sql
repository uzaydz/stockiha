-- إصلاح أخطاء syntax في ملف setup_ecommerce_starter_plan.sql
-- يُشغل في حالة وجود أخطاء في التنفيذ

-- 1. التحقق من وجود أي دوال مفقودة
DO $$
BEGIN
    -- التحقق من وجود دالة create_ecommerce_starter_trial
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'create_ecommerce_starter_trial'
    ) THEN
        RAISE NOTICE 'إنشاء دالة create_ecommerce_starter_trial المفقودة...';

        CREATE OR REPLACE FUNCTION create_ecommerce_starter_trial(p_organization_id UUID)
        RETURNS void AS $$
        BEGIN
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
    END IF;
END $$;

-- 2. إضافة تعليقات للدوال المفقودة إذا لزم الأمر
DO $$
DECLARE
    v_function_count INTEGER;
BEGIN
    -- عد الدوال الموجودة
    SELECT COUNT(*)
    INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'upgrade_to_ecommerce_starter',
        'add_online_orders_credits',
        'get_store_status',
        'get_ecommerce_starter_stats',
        'monthly_ecommerce_maintenance'
    );

    RAISE NOTICE 'تم العثور على % دالة من أصل 5 دوال مطلوبة', v_function_count;

    IF v_function_count < 5 THEN
        RAISE NOTICE 'بعض الدوال مفقودة. يرجى إعادة تشغيل setup_ecommerce_starter_plan.sql';
    END IF;
END $$;

-- 3. التحقق من صحة الجداول والعروض
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_view_exists BOOLEAN;
BEGIN
    -- التحقق من جدول monthly_online_orders_usage
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'monthly_online_orders_usage'
    ) INTO v_table_exists;

    IF NOT v_table_exists THEN
        RAISE NOTICE 'جدول monthly_online_orders_usage مفقود. يرجى تشغيل add_online_orders_limits.sql أولاً';
    END IF;

    -- التحقق من عرض eligible_for_ecommerce_starter
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'eligible_for_ecommerce_starter'
    ) INTO v_view_exists;

    IF NOT v_view_exists THEN
        RAISE NOTICE 'عرض eligible_for_ecommerce_starter مفقود. يرجى إعادة تشغيل setup_ecommerce_starter_plan.sql';
    END IF;

    RAISE NOTICE 'فحص الجداول والعروض مكتمل';
END $$;

-- 4. إنشاء دالة للاختبار السريع
CREATE OR REPLACE FUNCTION test_ecommerce_starter_setup()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- اختبار 1: وجود الخطة
    RETURN QUERY
    SELECT
        'خطة التجار الإلكترونيين المبتدئين'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM subscription_plans
            WHERE code = 'ecommerce_starter'
        ) THEN 'موجودة' ELSE 'مفقودة' END,
        CASE WHEN EXISTS (
            SELECT 1 FROM subscription_plans
            WHERE code = 'ecommerce_starter'
        ) THEN 'الخطة جاهزة للاستخدام' ELSE 'يرجى إعادة تشغيل setup_ecommerce_starter_plan.sql' END;

    -- اختبار 2: جدول الاستخدام الشهري
    RETURN QUERY
    SELECT
        'جدول الاستخدام الشهري'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'monthly_online_orders_usage'
        ) THEN 'موجود' ELSE 'مفقود' END,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'monthly_online_orders_usage'
        ) THEN 'الجدول جاهز' ELSE 'يرجى تشغيل add_online_orders_limits.sql' END;

    -- اختبار 3: الدوال المطلوبة
    RETURN QUERY
    SELECT
        'الدوال المطلوبة'::TEXT,
        CASE WHEN (
            SELECT COUNT(*) FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname IN (
                'create_ecommerce_starter_trial',
                'upgrade_to_ecommerce_starter',
                'add_online_orders_credits',
                'get_store_status',
                'get_ecommerce_starter_stats'
            )
        ) = 5 THEN 'مكتملة' ELSE 'ناقصة' END,
        CASE WHEN (
            SELECT COUNT(*) FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname IN (
                'create_ecommerce_starter_trial',
                'upgrade_to_ecommerce_starter',
                'add_online_orders_credits',
                'get_store_status',
                'get_ecommerce_starter_stats'
            )
        ) = 5 THEN 'جميع الدوال متوفرة' ELSE 'بعض الدوال مفقودة' END;

    -- اختبار 4: الأعمدة المطلوبة
    RETURN QUERY
    SELECT
        'الأعمدة المطلوبة'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'organizations'
            AND column_name = 'online_orders_limit'
        ) THEN 'موجودة' ELSE 'مفقودة' END,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'organizations'
            AND column_name = 'online_orders_limit'
        ) THEN 'الأعمدة جاهزة' ELSE 'يرجى تشغيل add_online_orders_limits.sql' END;
END;
$$ LANGUAGE plpgsql;

-- 5. تشغيل الاختبار
DO $$
BEGIN
    RAISE NOTICE 'بدء اختبار إعداد خطة التجار الإلكترونيين المبتدئين...';
END $$;

-- عرض نتائج الاختبار
SELECT * FROM test_ecommerce_starter_setup();

-- نهاية ملف الإصلاح
DO $$
BEGIN
    RAISE NOTICE 'تم فحص النظام بنجاح. تحقق من النتائج أعلاه.';
    RAISE NOTICE 'إذا كانت هناك أي مشاكل، أعد تشغيل الملفات بالترتيب الصحيح:';
    RAISE NOTICE '1. add_online_orders_limits.sql';
    RAISE NOTICE '2. setup_ecommerce_starter_plan.sql';
    RAISE NOTICE '3. fix_syntax_errors.sql (إذا لزم الأمر)';
END $$;
