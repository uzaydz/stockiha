-- إضافة نظام الحدود للطلبيات الإلكترونية
-- لخطة التجار الإلكترونيين المبتدئين

-- 1. إضافة عمود لحساب الطلبيات الإلكترونية الشهرية لكل مؤسسة
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS online_orders_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS online_orders_limit INTEGER,
ADD COLUMN IF NOT EXISTS store_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS store_block_reason TEXT;

-- 2. تحديث جدول خطط الإشتراك لإضافة حد الطلبيات الإلكترونية
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS max_online_orders INTEGER;

-- 3. إنشاء جدول لتتبع استخدام الطلبيات الإلكترونية الشهري
CREATE TABLE IF NOT EXISTS monthly_online_orders_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    year_month TEXT NOT NULL, -- Format: YYYY-MM
    orders_count INTEGER DEFAULT 0,
    orders_limit INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, year_month)
);

-- 4. إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_monthly_online_orders_usage_org_year_month
ON monthly_online_orders_usage(organization_id, year_month);

-- 5. إضافة خطة التجار الإلكترونيين المبتدئين
INSERT INTO subscription_plans (
    name, code, description, features, monthly_price, yearly_price,
    trial_period_days, limits, is_active, is_popular, display_order,
    max_online_orders
) VALUES (
    'تجار إلكترونيين مبتدئين',
    'ecommerce_starter',
    'خطة مثالية للتجار الإلكترونيين المبتدئين - 100 طلبية شهرياً فقط',
    '[
        "100 طلبية إلكترونية شهرياً",
        "متجر إلكتروني كامل الميزات",
        "إدارة منتجات ومخزون",
        "تقارير المبيعات الأساسية",
        "دعم فني عبر البريد الإلكتروني",
        "إمكانية ترقية للمزيد من الطلبيات"
    ]'::JSONB,
    1000, 12000,
    5,
    '{"max_users": 1, "max_products": 50, "max_pos": 0}'::JSONB,
    TRUE, FALSE, 4,
    100 -- حد الطلبيات الإلكترونية
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    features = EXCLUDED.features,
    monthly_price = EXCLUDED.monthly_price,
    yearly_price = EXCLUDED.yearly_price,
    limits = EXCLUDED.limits,
    max_online_orders = EXCLUDED.max_online_orders,
    updated_at = NOW();

-- 6. دالة لحساب الطلبيات الإلكترونية الشهرية
CREATE OR REPLACE FUNCTION calculate_monthly_online_orders(p_organization_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_current_month TEXT;
    v_orders_count INTEGER;
BEGIN
    -- الحصول على الشهر الحالي
    v_current_month := TO_CHAR(NOW(), 'YYYY-MM');

    -- حساب عدد الطلبيات في الشهر الحالي
    SELECT COUNT(*)
    INTO v_orders_count
    FROM online_orders
    WHERE organization_id = p_organization_id
      AND TO_CHAR(created_at, 'YYYY-MM') = v_current_month;

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

-- 7. دالة للتحقق من تجاوز الحد المسموح
CREATE OR REPLACE FUNCTION check_online_orders_limit(p_organization_id UUID)
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

    -- حساب الطلبيات الحالية
    v_current_orders := calculate_monthly_online_orders(p_organization_id);

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

-- 8. دالة لإعادة تعيين عداد الطلبيات شهرياً
CREATE OR REPLACE FUNCTION reset_monthly_online_orders()
RETURNS void AS $$
DECLARE
    v_previous_month TEXT;
    v_current_month TEXT;
BEGIN
    -- الحصول على الشهر السابق والحالي
    v_previous_month := TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY-MM');
    v_current_month := TO_CHAR(NOW(), 'YYYY-MM');

    -- إعادة تعيين العداد لجميع المؤسسات
    UPDATE organizations
    SET online_orders_this_month = 0
    WHERE id IN (
        SELECT organization_id
        FROM monthly_online_orders_usage
        WHERE year_month = v_previous_month
    );

    -- إنشاء سجلات للشهر الجديد
    INSERT INTO monthly_online_orders_usage (organization_id, year_month, orders_count)
    SELECT DISTINCT organization_id, v_current_month, 0
    FROM monthly_online_orders_usage
    WHERE year_month = v_previous_month
    ON CONFLICT (organization_id, year_month) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 9. تحديث دالة process_online_order للتحقق من الحدود
CREATE OR REPLACE FUNCTION process_online_order_with_limits(
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
    -- التحقق من الحدود أولاً
    v_limit_check := check_online_orders_limit(p_organization_id);

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
    PERFORM check_online_orders_limit(p_organization_id);

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 10. إنشاء مهمة مجدولة لإعادة تعيين العداد شهرياً
-- يمكن تنفيذها يدوياً أو عبر cron job
CREATE OR REPLACE FUNCTION schedule_monthly_reset()
RETURNS void AS $$
BEGIN
    -- إنشاء مهمة للتنفيذ في بداية كل شهر
    -- يمكن استدعاؤها عبر cron job أو scheduled task
    PERFORM reset_monthly_online_orders();
END;
$$ LANGUAGE plpgsql;

-- 11. إنشاء عرض لمراقبة حالة المتاجر المحظورة
CREATE OR REPLACE VIEW blocked_stores_view AS
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
    END as status
FROM organizations o
LEFT JOIN monthly_online_orders_usage mou ON o.id = mou.organization_id
    AND mou.year_month = TO_CHAR(NOW(), 'YYYY-MM')
LEFT JOIN organization_subscriptions os ON o.id = os.organization_id
    AND os.status = 'active'
LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
WHERE o.store_blocked = TRUE OR sp.max_online_orders IS NOT NULL;

-- 12. فهارس إضافية للأداء
CREATE INDEX IF NOT EXISTS idx_organizations_store_blocked ON organizations(store_blocked);
CREATE INDEX IF NOT EXISTS idx_organizations_online_orders_limit ON organizations(online_orders_limit);

-- فهرس للبحث السريع في الطلبيات حسب المؤسسة والتاريخ
-- استخدام فهرس بسيط بدلاً من الدالة غير الثابتة
CREATE INDEX IF NOT EXISTS idx_online_orders_organization_created
ON online_orders(organization_id, created_at DESC);

-- فهرس مركب للاستعلامات الشائعة
CREATE INDEX IF NOT EXISTS idx_online_orders_org_status_created
ON online_orders(organization_id, status, created_at DESC);
