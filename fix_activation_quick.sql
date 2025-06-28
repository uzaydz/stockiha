-- ===== إصلاح سريع لمشكلة تفعيل الاشتراكات =====
-- هذا الملف يحل المشكلة الأساسية بشكل مباشر

-- الخطوة 1: إصلاح البيانات الموجودة
UPDATE organization_subscriptions 
SET status = 'expired'
WHERE status IN ('active', 'trial') 
  AND end_date < NOW();

-- الخطوة 2: تزامن بيانات المؤسسات مع الاشتراكات النشطة
UPDATE organizations 
SET 
  subscription_id = active_subs.id,
  subscription_tier = active_subs.plan_code,
  subscription_status = active_subs.status
FROM (
  SELECT DISTINCT ON (os.organization_id)
    os.id,
    os.organization_id,
    os.status,
    sp.code as plan_code
  FROM organization_subscriptions os
  JOIN subscription_plans sp ON os.plan_id = sp.id
  WHERE os.status IN ('active', 'trial')
    AND os.end_date >= NOW()
  ORDER BY os.organization_id, os.end_date DESC
) active_subs
WHERE organizations.id = active_subs.organization_id
  AND (
    organizations.subscription_id IS NULL 
    OR organizations.subscription_id != active_subs.id
    OR organizations.subscription_status != active_subs.status
  );

-- الخطوة 3: تحديث المؤسسات التي ليس لديها اشتراك نشط
UPDATE organizations 
SET 
  subscription_id = NULL,
  subscription_tier = 'free',
  subscription_status = 'expired'
WHERE id NOT IN (
  SELECT DISTINCT organization_id 
  FROM organization_subscriptions 
  WHERE status IN ('active', 'trial') 
    AND end_date >= NOW()
)
AND (
  subscription_status != 'expired' 
  OR subscription_tier != 'free'
  OR subscription_id IS NOT NULL
);

-- الخطوة 4: إنشاء دالة محسنة لتفعيل الاشتراك
CREATE OR REPLACE FUNCTION activate_subscription_fixed(
    p_activation_code TEXT,
    p_organization_id UUID
) 
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    subscription_id UUID,
    subscription_end_date TIMESTAMPTZ
) AS $$
DECLARE
    v_code activation_codes;
    v_plan subscription_plans;
    v_subscription_id UUID;
    v_end_date TIMESTAMPTZ;
    v_billing_cycle TEXT;
BEGIN
    -- البحث عن الكود
    SELECT * INTO v_code FROM activation_codes 
    WHERE code = p_activation_code;
    
    -- التحقق من وجود الكود
    IF v_code IS NULL THEN
        RETURN QUERY SELECT FALSE, 'كود التفعيل غير صالح', NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- التحقق من صلاحية الكود
    IF v_code.status != 'active' THEN
        RETURN QUERY SELECT FALSE, 'كود التفعيل غير نشط أو تم استخدامه بالفعل', NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- التحقق من تاريخ انتهاء الصلاحية
    IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
        UPDATE activation_codes 
        SET status = 'expired'
        WHERE id = v_code.id;
        
        RETURN QUERY SELECT FALSE, 'كود التفعيل منتهي الصلاحية', NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- البحث عن خطة الاشتراك
    SELECT * INTO v_plan FROM subscription_plans 
    WHERE id = v_code.plan_id;
    
    -- التحقق من وجود خطة الاشتراك
    IF v_plan IS NULL THEN
        RETURN QUERY SELECT FALSE, 'خطة الاشتراك غير موجودة', NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- استخدام دورة الفوترة من كود التفعيل
    v_billing_cycle := v_code.billing_cycle;
    
    -- حساب تاريخ انتهاء الاشتراك
    v_end_date := NOW() + 
        CASE 
            WHEN v_billing_cycle = 'monthly' THEN INTERVAL '1 month'
            WHEN v_billing_cycle = 'yearly' THEN INTERVAL '1 year'
            ELSE INTERVAL '1 year'
        END;
    
    BEGIN
        -- إنهاء أي اشتراكات نشطة موجودة
        UPDATE organization_subscriptions 
        SET status = 'expired'
        WHERE organization_id = p_organization_id 
          AND status IN ('active', 'trial')
          AND end_date >= NOW();
        
        -- تحديث حالة كود التفعيل
        UPDATE activation_codes 
        SET 
            status = 'used',
            organization_id = p_organization_id,
            used_at = NOW()
        WHERE id = v_code.id;
        
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
            payment_method,
            payment_reference,
            is_auto_renew
        ) VALUES (
            p_organization_id,
            v_code.plan_id,
            'active',
            v_billing_cycle,
            NOW(),
            v_end_date,
            CASE 
                WHEN v_billing_cycle = 'monthly' THEN v_plan.monthly_price
                ELSE v_plan.yearly_price
            END,
            'DZD',
            'activation_code',
            v_code.code,
            FALSE
        ) RETURNING id INTO v_subscription_id;
        
        -- تحديث الكود بمعرف الاشتراك
        UPDATE activation_codes 
        SET subscription_id = v_subscription_id
        WHERE id = v_code.id;
        
        -- تحديث المؤسسة
        UPDATE organizations
        SET 
            subscription_id = v_subscription_id,
            subscription_tier = v_plan.code,
            subscription_status = 'active'
        WHERE id = p_organization_id;
        
        RETURN QUERY SELECT TRUE, 'تم تفعيل الاشتراك بنجاح', v_subscription_id, v_end_date;
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT FALSE, 'حدث خطأ أثناء تفعيل الاشتراك: ' || SQLERRM, NULL::UUID, NULL::TIMESTAMPTZ;
    END;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- الخطوة 5: تحديث دالة التفعيل الأصلية
CREATE OR REPLACE FUNCTION activate_subscription(
    p_activation_code TEXT,
    p_organization_id UUID
) 
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    subscription_id UUID,
    subscription_end_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY SELECT * FROM activate_subscription_fixed(p_activation_code, p_organization_id);
END;
$$ LANGUAGE plpgsql;

-- إشعار النجاح
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح نظام تفعيل الاشتراكات بنجاح!';
    RAISE NOTICE '🔧 الدوال المحدثة:';
    RAISE NOTICE '   - activate_subscription(): محدثة لتعمل بشكل صحيح';
    RAISE NOTICE '   - activate_subscription_fixed(): دالة محسنة جديدة';
    RAISE NOTICE '📊 تم تزامن جميع البيانات في قاعدة البيانات';
END;
$$; 