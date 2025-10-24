-- 🎯 دالة RPC شاملة لحساب الزكاة حسب الشريعة الإسلامية
-- تحسب الزكاة للمتاجر والتجار بطريقة دقيقة ومفصلة
-- تدعم المرونة في التعامل مع البيانات المختلفة

-- 🗑️ حذف النسخ القديمة من الدالة لتجنب التعارض
DROP FUNCTION IF EXISTS calculate_zakat(UUID, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS calculate_zakat(UUID, TIMESTAMP WITH TIME ZONE, BOOLEAN);
DROP FUNCTION IF EXISTS calculate_zakat(UUID, TIMESTAMP WITH TIME ZONE, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS calculate_zakat(UUID, TIMESTAMP WITH TIME ZONE, BOOLEAN, BOOLEAN, NUMERIC);
DROP FUNCTION IF EXISTS calculate_zakat_detailed(UUID, TIMESTAMP WITH TIME ZONE, BOOLEAN);
DROP FUNCTION IF EXISTS calculate_zakat_with_options(UUID, TIMESTAMP WITH TIME ZONE, BOOLEAN, BOOLEAN, NUMERIC);

-- ✅ إنشاء الدالة الرئيسية للحساب الزكاة
CREATE OR REPLACE FUNCTION calculate_zakat(
    p_organization_id UUID,
    p_calculation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_include_detailed_breakdown BOOLEAN DEFAULT TRUE,
    p_include_zakat_suggestions BOOLEAN DEFAULT TRUE,
    p_custom_gold_price NUMERIC DEFAULT NULL
)
RETURNS TABLE(
    -- معلومات أساسية
    calculation_date TIMESTAMP WITH TIME ZONE,
    total_capital_value NUMERIC,
    total_zakat_amount NUMERIC,
    zakat_percentage NUMERIC,

    -- تفاصيل رأس المال
    inventory_value NUMERIC,
    cash_value NUMERIC,
    receivables_value NUMERIC,
    profits_value NUMERIC,
    other_assets NUMERIC,

    -- تفاصيل الزكاة
    inventory_zakat NUMERIC,
    cash_zakat NUMERIC,
    receivables_zakat NUMERIC,
    profits_zakat NUMERIC,

    -- معلومات النصاب
    nisab_threshold NUMERIC,
    current_gold_price NUMERIC,
    is_above_nisab BOOLEAN,

    -- تفاصيل إضافية
    detailed_breakdown JSONB,
    zakat_suggestions JSONB,

    -- معلومات إضافية
    total_products_count INTEGER,
    total_orders_count INTEGER,
    last_inventory_update TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    -- متغيرات رأس المال
    v_inventory_value NUMERIC := 0;
    v_cash_value NUMERIC := 0;
    v_receivables_value NUMERIC := 0;
    v_profits_value NUMERIC := 0;
    v_other_assets NUMERIC := 0;
    v_total_capital_value NUMERIC := 0;

    -- متغيرات الزكاة
    v_inventory_zakat NUMERIC := 0;
    v_cash_zakat NUMERIC := 0;
    v_receivables_zakat NUMERIC := 0;
    v_profits_zakat NUMERIC := 0;
    v_total_zakat_amount NUMERIC := 0;

    -- معلومات النصاب
    v_nisab_threshold NUMERIC := 0;
    v_current_gold_price NUMERIC := COALESCE(p_custom_gold_price, 85 * 2800); -- 85 جرام × سعر الجرام (افتراضي)
    v_is_above_nisab BOOLEAN := FALSE;

    -- إحصائيات إضافية
    v_total_products_count INTEGER := 0;
    v_total_orders_count INTEGER := 0;
    v_last_inventory_update TIMESTAMP WITH TIME ZONE;

    -- متغيرات التفاصيل
    v_detailed_breakdown JSONB;
    v_zakat_suggestions JSONB;

    -- قيم الزكاة الثابتة
    ZAKAT_RATE CONSTANT NUMERIC := 0.025; -- 2.5%
    NISAB_GRAMS_GOLD CONSTANT NUMERIC := 85;
    DEFAULT_GOLD_PRICE_PER_GRAM CONSTANT NUMERIC := 2800; -- سعر افتراضي للجرام

BEGIN
    -- 📊 1. حساب سعر الذهب الحالي
    IF p_custom_gold_price IS NOT NULL THEN
        v_current_gold_price := p_custom_gold_price;
    ELSE
        -- محاولة الحصول على سعر الذهب من جدول العملات إن وجد
        -- تحقق من وجود الجدول والعمود أولاً
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'digital_currencies'
        ) THEN
            -- تحقق من وجود العمود price_per_gram
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'digital_currencies' AND column_name = 'price_per_gram'
            ) THEN
                SELECT COALESCE(price_per_gram, DEFAULT_GOLD_PRICE_PER_GRAM)
                INTO v_current_gold_price
                FROM digital_currencies
                WHERE symbol = 'GOLD' AND organization_id = p_organization_id
                LIMIT 1;
            ELSE
                -- إذا لم يكن العمود موجود، استخدم السعر الافتراضي
                v_current_gold_price := DEFAULT_GOLD_PRICE_PER_GRAM;
            END IF;
        ELSE
            -- إذا لم يكن الجدول موجود، استخدم السعر الافتراضي
            v_current_gold_price := DEFAULT_GOLD_PRICE_PER_GRAM;
        END IF;
    END IF;

    -- 💰 2. حساب النصاب (85 جرام ذهب)
    v_nisab_threshold := NISAB_GRAMS_GOLD * v_current_gold_price;

    -- 📦 3. حساب قيمة المخزون (بسعر الشراء)
    -- تشمل المنتجات الفعالة ذات المخزون الموجب فقط (استبعاد الكميات السلبية)
    SELECT
        COALESCE(SUM(
            CASE
                WHEN p.purchase_price IS NOT NULL AND p.stock_quantity > 0 THEN
                    p.purchase_price * p.stock_quantity
                WHEN p.unit_purchase_price IS NOT NULL AND p.stock_quantity > 0 THEN
                    p.unit_purchase_price * p.stock_quantity
                ELSE 0
            END
        ), 0),
        COUNT(CASE WHEN p.stock_quantity > 0 AND COALESCE(p.is_active, TRUE) = TRUE THEN 1 END),
        MAX(COALESCE(p.last_inventory_update, p.updated_at, p.created_at))
    INTO v_inventory_value, v_total_products_count, v_last_inventory_update
    FROM products p
    WHERE p.organization_id = p_organization_id
    AND COALESCE(p.is_active, TRUE) = TRUE
    AND p.stock_quantity > 0;

    -- 💵 4. حساب النقود في الصندوق (جميع المبالغ المدفوعة نقداً)
    SELECT COALESCE(SUM(
        CASE
            WHEN payment_status IN ('paid', 'completed', 'مكتمل', 'مدفوع')
            AND (payment_method ILIKE '%cash%' OR payment_method ILIKE '%نقد%' OR payment_method ILIKE '%كاش%')
            THEN total
            ELSE 0
        END
    ), 0)
    INTO v_cash_value
    FROM orders
    WHERE organization_id = p_organization_id
    AND DATE(created_at) <= DATE(p_calculation_date)
    AND status IN ('completed', 'مكتمل', 'مدفوع');

    -- 💳 5. حساب المدفوعات المستحقة (الديون المستحقة للمتجر)
    SELECT COALESCE(SUM(remaining_amount), 0)
    INTO v_receivables_value
    FROM orders
    WHERE organization_id = p_organization_id
    AND DATE(created_at) <= DATE(p_calculation_date)
    AND status IN ('completed', 'مكتمل', 'مدفوع')
    AND remaining_amount > 0;

    -- 📈 6. حساب الأرباح المحققة (من التحليلات المالية)
    -- استخدام دالة التحليلات المالية الموجودة
    SELECT COALESCE(total_net_profit, 0)
    INTO v_profits_value
    FROM get_complete_financial_analytics(
        p_organization_id,
        date_trunc('year', p_calculation_date),
        p_calculation_date,
        NULL::UUID,
        NULL::UUID,        -- p_branch_id
        NULL::TEXT,        -- p_transaction_type
        NULL::TEXT,        -- p_payment_method
        NULL::NUMERIC,     -- p_min_amount
        NULL::NUMERIC,     -- p_max_amount
        TRUE,              -- p_include_partial_payments
        TRUE               -- p_include_refunds
    )
    LIMIT 1;

    -- 🏦 7. حساب الأصول الأخرى (إن وجدت)
    -- يمكن إضافة حسابات أخرى حسب الحاجة
    v_other_assets := 0;

    -- 💎 8. حساب إجمالي رأس المال
    v_total_capital_value := v_inventory_value + v_cash_value + v_receivables_value +
                           v_profits_value + v_other_assets;

    -- ⚖️ 9. التحقق من النصاب
    v_is_above_nisab := v_total_capital_value >= v_nisab_threshold;

    -- 💰 10. حساب الزكاة لكل نوع (فقط إذا كان فوق النصاب)
    IF v_is_above_nisab THEN
        v_inventory_zakat := v_inventory_value * ZAKAT_RATE;
        v_cash_zakat := v_cash_value * ZAKAT_RATE;
        v_receivables_zakat := v_receivables_value * ZAKAT_RATE;
        v_profits_zakat := v_profits_value * ZAKAT_RATE;
    END IF;

    -- 📊 11. إجمالي الزكاة
    v_total_zakat_amount := v_inventory_zakat + v_cash_zakat + v_receivables_zakat + v_profits_zakat;

    -- 📋 12. إنشاء التفاصيل المفصلة
    IF p_include_detailed_breakdown THEN
        v_detailed_breakdown := jsonb_build_object(
            'capital_breakdown', jsonb_build_object(
                'inventory', jsonb_build_object(
                    'value', v_inventory_value,
                    'zakat_amount', v_inventory_zakat,
                    'products_count', v_total_products_count,
                    'avg_purchase_price', CASE
                        WHEN v_total_products_count > 0 THEN v_inventory_value / v_total_products_count
                        ELSE 0
                    END
                ),
                'cash', jsonb_build_object(
                    'value', v_cash_value,
                    'zakat_amount', v_cash_zakat
                ),
                'receivables', jsonb_build_object(
                    'value', v_receivables_value,
                    'zakat_amount', v_receivables_zakat
                ),
                'profits', jsonb_build_object(
                    'value', v_profits_value,
                    'zakat_amount', v_profits_zakat
                )
            ),
            'nisab_info', jsonb_build_object(
                'threshold', v_nisab_threshold,
                'gold_price_per_gram', v_current_gold_price,
                'is_above_nisab', v_is_above_nisab
            ),
            'zakat_calculation', jsonb_build_object(
                'zakat_rate', ZAKAT_RATE,
                'total_capital', v_total_capital_value,
                'total_zakat', v_total_zakat_amount
            )
        );
    ELSE
        v_detailed_breakdown := '{}'::jsonb;
    END IF;

    -- 💡 13. إنشاء اقتراحات للزكاة
    IF p_include_zakat_suggestions THEN
        v_zakat_suggestions := jsonb_build_object(
            'distribution_suggestions', jsonb_build_array(
                jsonb_build_object(
                    'category', 'الفقراء والمساكين',
                    'percentage', 100,
                    'description', 'توزيع الزكاة على الفقراء والمحتاجين في المجتمع'
                )
            ),
            'payment_tips', jsonb_build_array(
                'يمكن دفع الزكاة نقداً أو عيناً',
                'يفضل دفع الزكاة قبل انتهاء السنة المالية',
                'يمكن تقسيط دفع الزكاة على مدار العام',
                'يُستحب إخراج الزكاة في شهر رمضان'
            ),
            'optimization_tips', jsonb_build_array(
                'راجع المخزون بانتظام لضمان دقة الحساب',
                'احتفظ بسجلات دقيقة للمبيعات والمشتريات',
                'استشر أهل العلم للأمور المستجدة',
                'يمكن خصم الديون من رأس المال قبل حساب الزكاة'
            )
        );
    ELSE
        v_zakat_suggestions := '{}'::jsonb;
    END IF;

    -- 📊 14. حساب إجمالي الطلبات
    SELECT COUNT(*)
    INTO v_total_orders_count
    FROM orders
    WHERE organization_id = p_organization_id
    AND DATE(created_at) <= DATE(p_calculation_date)
    AND status IN ('completed', 'مكتمل', 'مدفوع');

    -- 📋 15. إرجاع النتائج
    RETURN QUERY
    SELECT
        p_calculation_date,
        v_total_capital_value,
        v_total_zakat_amount,
        ZAKAT_RATE * 100,
        v_inventory_value,
        v_cash_value,
        v_receivables_value,
        v_profits_value,
        v_other_assets,
        v_inventory_zakat,
        v_cash_zakat,
        v_receivables_zakat,
        v_profits_zakat,
        v_nisab_threshold,
        v_current_gold_price,
        v_is_above_nisab,
        v_detailed_breakdown,
        v_zakat_suggestions,
        v_total_products_count,
        v_total_orders_count,
        v_last_inventory_update;

END;
$$ LANGUAGE plpgsql;

-- 📝 تعليق على الدالة
COMMENT ON FUNCTION calculate_zakat(UUID, TIMESTAMP WITH TIME ZONE, BOOLEAN, BOOLEAN, NUMERIC) IS
'دالة شاملة لحساب الزكاة حسب الشريعة الإسلامية:
- تحسب رأس المال من المخزون والنقود والديون والأرباح
- تتحقق من النصاب (85 جرام ذهب)
- تحسب الزكاة بنسبة 2.5%
- توفر تفاصيل مفصلة واقتراحات للتوزيع
- تدعم تخصيص سعر الذهب للحساب';

-- ✅ إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_zakat_products_org_active
ON products(organization_id, is_active, stock_quantity)
WHERE is_active = TRUE AND stock_quantity > 0;

CREATE INDEX IF NOT EXISTS idx_zakat_orders_org_status
ON orders(organization_id, status, created_at, payment_status, payment_method)
WHERE status = 'completed';

-- 🎉 اختبار الدالة
-- SELECT * FROM calculate_zakat(
--     'your-organization-id'::UUID,
--     NOW(),
--     TRUE,
--     TRUE,
--     2800 -- سعر الذهب للجرام
-- );
