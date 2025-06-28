-- ===== إصلاح شامل لمشكلة عدم تزامن بيانات الاشتراكات =====
-- هذا الملف يحل المشكلة نهائياً لجميع المؤسسات الحالية والمستقبلية

-- الخطوة 1: إصلاح البيانات الموجودة
-- تحديث حالة الاشتراكات المنتهية
UPDATE organization_subscriptions 
SET status = 'expired'
WHERE status IN ('active', 'trial') 
  AND end_date < NOW();

-- الخطوة 2: تزامن بيانات المؤسسات مع الاشتراكات النشطة
UPDATE organizations 
SET 
  subscription_id = active_subs.subscription_id,
  subscription_tier = active_subs.plan_code,
  subscription_status = 'active',
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (os.organization_id)
    os.id as subscription_id,
    os.organization_id,
    sp.code as plan_code
  FROM organization_subscriptions os
  JOIN subscription_plans sp ON os.plan_id = sp.id
  WHERE os.status = 'active'
    AND os.end_date > NOW()
  ORDER BY os.organization_id, os.end_date DESC
) active_subs
WHERE organizations.id = active_subs.organization_id;

-- الخطوة 3: تحديث المؤسسات التي ليس لديها اشتراك نشط إلى trial
UPDATE organizations 
SET 
  subscription_id = NULL,
  subscription_tier = 'trial',
  subscription_status = 'trial',
  updated_at = NOW()
WHERE id NOT IN (
  SELECT DISTINCT organization_id 
  FROM organization_subscriptions 
  WHERE status = 'active' 
    AND end_date > NOW()
)
AND subscription_status != 'trial';

-- الخطوة 4: إنشاء دالة محسنة لتفعيل الاشتراك
CREATE OR REPLACE FUNCTION activate_subscription_with_code(
    org_id UUID,
    code TEXT
) 
RETURNS JSONB AS $$
DECLARE
    v_code activation_codes;
    v_plan subscription_plans;
    v_subscription_id UUID;
    v_end_date TIMESTAMPTZ;
    v_billing_cycle TEXT;
    v_result JSONB;
BEGIN
    -- البحث عن الكود
    SELECT * INTO v_code FROM activation_codes 
    WHERE code = activate_subscription_with_code.code
      AND status = 'active';
    
    -- التحقق من وجود الكود
    IF v_code IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'كود التفعيل غير صالح أو تم استخدامه بالفعل'
        );
    END IF;
    
    -- التحقق من تاريخ انتهاء الصلاحية
    IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
        UPDATE activation_codes 
        SET status = 'expired'
        WHERE id = v_code.id;
        
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'كود التفعيل منتهي الصلاحية'
        );
    END IF;
    
    -- البحث عن خطة الاشتراك
    SELECT * INTO v_plan FROM subscription_plans 
    WHERE id = v_code.plan_id;
    
    -- التحقق من وجود خطة الاشتراك
    IF v_plan IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'خطة الاشتراك غير موجودة'
        );
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
        WHERE organization_id = org_id 
          AND status = 'active'
          AND end_date > NOW();
        
        -- تحديث حالة كود التفعيل
        UPDATE activation_codes 
        SET 
            status = 'used',
            organization_id = org_id,
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
            org_id,
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
        
        -- تحديث المؤسسة فوراً
        UPDATE organizations
        SET 
            subscription_id = v_subscription_id,
            subscription_tier = v_plan.code,
            subscription_status = 'active',
            updated_at = NOW()
        WHERE id = org_id;
        
        -- إنشاء سجل في تاريخ الاشتراكات
        INSERT INTO subscription_history (
            organization_id,
            plan_id,
            action,
            from_status,
            to_status,
            notes,
            created_at
        ) VALUES (
            org_id,
            v_code.plan_id,
            'created',
            'trial',
            'active',
            'تم تفعيل الاشتراك باستخدام كود التفعيل: ' || v_code.code,
            NOW()
        );
        
        v_result := jsonb_build_object(
            'success', TRUE,
            'message', 'تم تفعيل الاشتراك بنجاح',
            'subscription_id', v_subscription_id,
            'subscription_end_date', v_end_date
        );
        
        RETURN v_result;
        
    EXCEPTION
        WHEN unique_violation THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'message', 'المؤسسة لديها اشتراك نشط بالفعل'
            );
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'message', 'حدث خطأ أثناء تفعيل الاشتراك: ' || SQLERRM
            );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- الخطوة 5: إنشاء trigger لضمان التزامن التلقائي
CREATE OR REPLACE FUNCTION sync_organization_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- عند إنشاء أو تحديث اشتراك نشط
    IF NEW.status = 'active' AND NEW.end_date > NOW() THEN
        UPDATE organizations
        SET 
            subscription_id = NEW.id,
            subscription_status = 'active',
            subscription_tier = (
                SELECT code FROM subscription_plans WHERE id = NEW.plan_id
            ),
            updated_at = NOW()
        WHERE id = NEW.organization_id;
    
    -- عند إنهاء الاشتراك
    ELSIF NEW.status IN ('expired', 'cancelled') OR NEW.end_date <= NOW() THEN
        -- التحقق من عدم وجود اشتراكات نشطة أخرى
        IF NOT EXISTS (
            SELECT 1 FROM organization_subscriptions 
            WHERE organization_id = NEW.organization_id 
              AND status = 'active' 
              AND end_date > NOW()
              AND id != NEW.id
        ) THEN
            UPDATE organizations
            SET 
                subscription_id = NULL,
                subscription_status = 'trial',
                subscription_tier = 'trial',
                updated_at = NOW()
            WHERE id = NEW.organization_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger
DROP TRIGGER IF EXISTS sync_organization_subscription_trigger ON organization_subscriptions;
CREATE TRIGGER sync_organization_subscription_trigger
    AFTER INSERT OR UPDATE ON organization_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION sync_organization_subscription();

-- الخطوة 6: إنشاء مهمة دورية لتنظيف الاشتراكات المنتهية
CREATE OR REPLACE FUNCTION cleanup_expired_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- تحديث الاشتراكات المنتهية
    UPDATE organization_subscriptions 
    SET status = 'expired'
    WHERE status = 'active' 
      AND end_date <= NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- تحديث المؤسسات التي لا تملك اشتراكات نشطة
    UPDATE organizations 
    SET 
        subscription_id = NULL,
        subscription_status = 'trial',
        subscription_tier = 'trial',
        updated_at = NOW()
    WHERE id NOT IN (
        SELECT DISTINCT organization_id 
        FROM organization_subscriptions 
        WHERE status = 'active' 
          AND end_date > NOW()
    )
    AND subscription_status = 'active';
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- تشغيل التنظيف فوراً
SELECT cleanup_expired_subscriptions();

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org_status_enddate 
ON organization_subscriptions(organization_id, status, end_date);

CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status 
ON organizations(subscription_status);

-- رسالة نجاح
DO $$
BEGIN
    RAISE NOTICE 'تم إصلاح مشكلة تزامن بيانات الاشتراكات بنجاح!';
    RAISE NOTICE 'جميع المؤسسات تم تحديث بياناتها لتتطابق مع الاشتراكات النشطة.';
    RAISE NOTICE 'تم إنشاء trigger تلقائي لضمان التزامن في المستقبل.';
END $$; 