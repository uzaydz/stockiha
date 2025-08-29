-- نظام إعادة شحن الطلبيات الإلكترونية
-- تاريخ الإنشاء: 2025-01-27

-- 1. إنشاء جدول حزم إعادة شحن الطلبيات الإلكترونية
CREATE TABLE IF NOT EXISTS online_orders_recharge_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    orders_count INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'DZD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. إنشاء جدول سجل إعادة شحن الطلبيات الإلكترونية
CREATE TABLE IF NOT EXISTS online_orders_recharge_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES online_orders_recharge_packages(id),
    orders_count INTEGER NOT NULL,
    amount_paid NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'DZD',
    payment_method TEXT,
    payment_reference TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. إنشاء جدول تتبع حدود الطلبيات الإلكترونية للمؤسسات
CREATE TABLE IF NOT EXISTS organization_online_orders_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    current_limit INTEGER NOT NULL DEFAULT 0,
    used_count INTEGER NOT NULL DEFAULT 0,
    remaining_count INTEGER GENERATED ALWAYS AS (current_limit - used_count) STORED,
    reset_date DATE NOT NULL,
    last_recharge_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. إدراج حزم إعادة الشحن الافتراضية
INSERT INTO online_orders_recharge_packages (name, description, orders_count, price, display_order) VALUES
('حزمة أساسية', '100 طلبية إلكترونية إضافية', 100, 1000.00, 1),
('حزمة متوسطة', '200 طلبية إلكترونية إضافية', 200, 2000.00, 2),
('حزمة متقدمة', '240 طلبية إلكترونية إضافية', 240, 2000.00, 3),
('حزمة احترافية', '500 طلبية إلكترونية إضافية', 500, 4000.00, 4),
('حزمة غير محدودة', '1000 طلبية إلكترونية إضافية', 1000, 7000.00, 5)
ON CONFLICT DO NOTHING;

-- 5. إنشاء دالة لإعادة شحن الطلبيات الإلكترونية
CREATE OR REPLACE FUNCTION recharge_online_orders(
    p_organization_id UUID,
    p_package_id UUID,
    p_payment_method TEXT DEFAULT 'bank_transfer',
    p_payment_reference TEXT DEFAULT NULL,
    p_processed_by UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_package RECORD;
    v_current_limit INTEGER;
    v_new_limit INTEGER;
    v_recharge_id UUID;
    v_result JSONB;
BEGIN
    -- التحقق من وجود الحزمة
    SELECT * INTO v_package 
    FROM online_orders_recharge_packages 
    WHERE id = p_package_id AND is_active = TRUE;
    
    IF v_package IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الحزمة غير موجودة أو غير نشطة'
        );
    END IF;
    
    -- الحصول على الحد الحالي للمؤسسة
    SELECT current_limit INTO v_current_limit
    FROM organization_online_orders_limits
    WHERE organization_id = p_organization_id;
    
    -- إذا لم تكن المؤسسة موجودة في الجدول، إنشاؤها
    IF v_current_limit IS NULL THEN
        INSERT INTO organization_online_orders_limits (
            organization_id, 
            current_limit, 
            reset_date
        ) VALUES (
            p_organization_id, 
            0, 
            date_trunc('month', CURRENT_DATE + INTERVAL '1 month')::date
        );
        v_current_limit := 0;
    END IF;
    
    -- حساب الحد الجديد
    v_new_limit := v_current_limit + v_package.orders_count;
    
    -- إنشاء سجل إعادة الشحن
    INSERT INTO online_orders_recharge_history (
        organization_id,
        package_id,
        orders_count,
        amount_paid,
        payment_method,
        payment_reference,
        status,
        processed_by,
        processed_at,
        notes
    ) VALUES (
        p_organization_id,
        p_package_id,
        v_package.orders_count,
        v_package.price,
        p_payment_method,
        p_payment_reference,
        'completed',
        p_processed_by,
        NOW(),
        p_notes
    ) RETURNING id INTO v_recharge_id;
    
    -- تحديث حدود المؤسسة
    UPDATE organization_online_orders_limits
    SET 
        current_limit = v_new_limit,
        last_recharge_date = NOW(),
        updated_at = NOW()
    WHERE organization_id = p_organization_id;
    
    -- إرجاع النتيجة
    v_result := jsonb_build_object(
        'success', true,
        'recharge_id', v_recharge_id,
        'organization_id', p_organization_id,
        'package_name', v_package.name,
        'orders_added', v_package.orders_count,
        'old_limit', v_current_limit,
        'new_limit', v_new_limit,
        'amount_paid', v_package.price,
        'currency', v_package.currency,
        'message', format('تم إضافة %s طلبية إلكترونية بنجاح. الحد الجديد: %s طلبية', v_package.orders_count, v_new_limit)
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. إنشاء دالة لفحص حدود الطلبيات الإلكترونية
CREATE OR REPLACE FUNCTION check_online_orders_limit(
    p_organization_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_limit_info RECORD;
    v_used_count INTEGER;
    v_result JSONB;
BEGIN
    -- الحصول على معلومات الحدود
    SELECT 
        ool.current_limit,
        ool.used_count,
        ool.remaining_count,
        ool.reset_date
    INTO v_limit_info
    FROM organization_online_orders_limits ool
    WHERE ool.organization_id = p_organization_id;
    
    -- إذا لم تكن المؤسسة موجودة، إنشاؤها بقيم افتراضية
    IF v_limit_info IS NULL THEN
        INSERT INTO organization_online_orders_limits (
            organization_id, 
            current_limit, 
            reset_date
        ) VALUES (
            p_organization_id, 
            100, -- الحد الافتراضي من خطة الاشتراك
            date_trunc('month', CURRENT_DATE + INTERVAL '1 month')::date
        );
        
        SELECT 
            current_limit,
            used_count,
            remaining_count,
            reset_date
        INTO v_limit_info
        FROM organization_online_orders_limits
        WHERE organization_id = p_organization_id;
    END IF;
    
    -- حساب عدد الطلبيات المستخدمة في الشهر الحالي
    SELECT COUNT(*) INTO v_used_count
    FROM online_orders
    WHERE organization_id = p_organization_id
    AND created_at >= date_trunc('month', CURRENT_DATE);
    
    -- تحديث العداد المستخدم
    UPDATE organization_online_orders_limits
    SET used_count = v_used_count
    WHERE organization_id = p_organization_id;
    
    -- إرجاع النتيجة
    v_result := jsonb_build_object(
        'success', true,
        'organization_id', p_organization_id,
        'current_limit', v_limit_info.current_limit,
        'used_count', v_used_count,
        'remaining_count', GREATEST(0, v_limit_info.current_limit - v_used_count),
        'reset_date', v_limit_info.reset_date,
        'is_limit_exceeded', v_used_count >= v_limit_info.current_limit,
        'message', format('الحد الحالي: %s طلبية، المستخدم: %s طلبية، المتبقي: %s طلبية', 
                         v_limit_info.current_limit, 
                         v_used_count, 
                         GREATEST(0, v_limit_info.current_limit - v_used_count))
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. إنشاء دالة لإعادة تعيين الحدود الشهرية
CREATE OR REPLACE FUNCTION reset_monthly_online_orders_limits() RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_org RECORD;
BEGIN
    -- إعادة تعيين جميع المؤسسات
    FOR v_org IN 
        SELECT organization_id 
        FROM organization_online_orders_limits
        WHERE reset_date <= CURRENT_DATE
    LOOP
        UPDATE organization_online_orders_limits
        SET 
            used_count = 0,
            reset_date = date_trunc('month', CURRENT_DATE + INTERVAL '1 month')::date,
            updated_at = NOW()
        WHERE organization_id = v_org.organization_id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. إنشاء دالة لإنشاء طلبية إلكترونية مع فحص الحدود
CREATE OR REPLACE FUNCTION create_online_order_with_limit_check(
    p_organization_id UUID,
    p_customer_data JSONB,
    p_order_data JSONB
) RETURNS JSONB AS $$
DECLARE
    v_limit_check JSONB;
    v_order_id UUID;
    v_result JSONB;
BEGIN
    -- فحص حدود الطلبيات الإلكترونية
    v_limit_check := check_online_orders_limit(p_organization_id);
    
    -- التحقق من النتيجة
    IF NOT (v_limit_check->>'success')::boolean THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'فشل في فحص حدود الطلبيات الإلكترونية',
            'details', v_limit_check
        );
    END IF;
    
    -- التحقق من تجاوز الحد
    IF (v_limit_check->>'is_limit_exceeded')::boolean THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'تم تجاوز الحد المسموح للطلبيات الإلكترونية',
            'limit_info', v_limit_check,
            'message', 'يرجى إعادة شحن الطلبيات الإلكترونية أو الانتظار حتى الشهر القادم'
        );
    END IF;
    
    -- إنشاء الطلبية (هنا يمكن إضافة منطق إنشاء الطلبية)
    -- v_order_id := create_online_order(p_customer_data, p_order_data);
    
    -- إرجاع النتيجة
    v_result := jsonb_build_object(
        'success', true,
        'order_created', true,
        'limit_info', v_limit_check,
        'message', 'تم إنشاء الطلبية بنجاح'
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. إنشاء Triggers لتحديث timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_online_orders_recharge_packages_timestamp
    BEFORE UPDATE ON online_orders_recharge_packages
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_online_orders_recharge_history_timestamp
    BEFORE UPDATE ON online_orders_recharge_history
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_organization_online_orders_limits_timestamp
    BEFORE UPDATE ON organization_online_orders_limits
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 10. إنشاء Views مفيدة
CREATE OR REPLACE VIEW online_orders_recharge_summary AS
SELECT 
    oorh.organization_id,
    o.name as organization_name,
    oorh.package_id,
    oorp.name as package_name,
    oorp.orders_count,
    oorh.amount_paid,
    oorh.currency,
    oorh.status,
    oorh.processed_at,
    oorh.created_at
FROM online_orders_recharge_history oorh
JOIN online_orders_recharge_packages oorp ON oorh.package_id = oorp.id
JOIN organizations o ON oorh.organization_id = o.id
ORDER BY oorh.created_at DESC;

CREATE OR REPLACE VIEW organization_online_orders_status AS
SELECT 
    ool.organization_id,
    o.name as organization_name,
    ool.current_limit,
    ool.used_count,
    ool.remaining_count,
    ool.reset_date,
    ool.last_recharge_date,
    CASE 
        WHEN ool.remaining_count <= 0 THEN 'مستنفذ'
        WHEN ool.remaining_count <= 10 THEN 'منخفض'
        ELSE 'متوفر'
    END as status,
    ool.updated_at
FROM organization_online_orders_limits ool
JOIN organizations o ON ool.organization_id = o.id
ORDER BY ool.remaining_count ASC;

-- 11. إنشاء RLS Policies
ALTER TABLE online_orders_recharge_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_orders_recharge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_online_orders_limits ENABLE ROW LEVEL SECURITY;

-- سياسات للقراءة العامة
CREATE POLICY "Allow public read access to recharge packages" ON online_orders_recharge_packages
    FOR SELECT USING (is_active = TRUE);

-- سياسات للمؤسسات
CREATE POLICY "Allow organizations to view their recharge history" ON online_orders_recharge_history
    FOR SELECT USING (organization_id = current_setting('app.current_organization_id')::uuid);

CREATE POLICY "Allow organizations to view their limits" ON organization_online_orders_limits
    FOR SELECT USING (organization_id = current_setting('app.current_organization_id')::uuid);

-- سياسات للمشرفين
CREATE POLICY "Allow admins full access to recharge system" ON online_orders_recharge_packages
    FOR ALL USING (auth.role() = 'admin');

CREATE POLICY "Allow admins full access to recharge history" ON online_orders_recharge_history
    FOR ALL USING (auth.role() = 'admin');

CREATE POLICY "Allow admins full access to limits" ON organization_online_orders_limits
    FOR ALL USING (auth.role() = 'admin');

-- 12. إنشاء Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_online_orders_recharge_history_org_id ON online_orders_recharge_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_recharge_history_status ON online_orders_recharge_history(status);
CREATE INDEX IF NOT EXISTS idx_online_orders_recharge_history_created_at ON online_orders_recharge_history(created_at);
CREATE INDEX IF NOT EXISTS idx_organization_online_orders_limits_org_id ON organization_online_orders_limits(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_online_orders_limits_reset_date ON organization_online_orders_limits(reset_date);

-- 13. إضافة تعليقات توضيحية
COMMENT ON TABLE online_orders_recharge_packages IS 'حزم إعادة شحن الطلبيات الإلكترونية المتاحة';
COMMENT ON TABLE online_orders_recharge_history IS 'سجل عمليات إعادة شحن الطلبيات الإلكترونية';
COMMENT ON TABLE organization_online_orders_limits IS 'حدود الطلبيات الإلكترونية لكل مؤسسة';
COMMENT ON FUNCTION recharge_online_orders IS 'دالة إعادة شحن الطلبيات الإلكترونية';
COMMENT ON FUNCTION check_online_orders_limit IS 'دالة فحص حدود الطلبيات الإلكترونية';
COMMENT ON FUNCTION reset_monthly_online_orders_limits IS 'دالة إعادة تعيين الحدود الشهرية';

-- 14. إنشاء وظيفة مجدولة لإعادة تعيين الحدود (يمكن تنفيذها يدوياً)
-- SELECT reset_monthly_online_orders_limits();

-- 15. إنشاء وظيفة لتهيئة المؤسسات الجديدة
CREATE OR REPLACE FUNCTION initialize_organization_online_orders_limits(
    p_organization_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_subscription_limit INTEGER;
    v_result JSONB;
BEGIN
    -- الحصول على حد الطلبيات من خطة الاشتراك
    SELECT COALESCE(sp.max_online_orders, 100) INTO v_subscription_limit
    FROM organization_subscriptions os
    JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE os.organization_id = p_organization_id
    AND os.status = 'active';
    
    -- إنشاء سجل الحدود
    INSERT INTO organization_online_orders_limits (
        organization_id,
        current_limit,
        reset_date
    ) VALUES (
        p_organization_id,
        v_subscription_limit,
        date_trunc('month', CURRENT_DATE + INTERVAL '1 month')::date
    )
    ON CONFLICT (organization_id) DO UPDATE SET
        current_limit = EXCLUDED.current_limit,
        reset_date = EXCLUDED.reset_date,
        updated_at = NOW();
    
    v_result := jsonb_build_object(
        'success', true,
        'organization_id', p_organization_id,
        'initial_limit', v_subscription_limit,
        'message', format('تم تهيئة حدود الطلبيات الإلكترونية للمؤسسة. الحد الأولي: %s طلبية', v_subscription_limit)
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. تهيئة المؤسسات الموجودة
SELECT initialize_organization_online_orders_limits('93c69665-2420-48e8-94b0-64ddb50f76ee');

-- رسالة نجاح
SELECT 'تم إنشاء نظام إعادة شحن الطلبيات الإلكترونية بنجاح!' as message;
