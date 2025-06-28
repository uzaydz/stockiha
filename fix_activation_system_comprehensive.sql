-- ===== إصلاح شامل لنظام تفعيل الاشتراكات =====
-- هذا الملف يحل المشاكل التالية:
-- 1. عدم تزامن البيانات بين organizations و organization_subscriptions
-- 2. مشكلة UNIQUE constraint عند تفعيل كود جديد
-- 3. إصلاح الاشتراكات المنتهية التي لا تزال تظهر كنشطة
-- 4. ضمان التحديث الصحيح لجميع الجداول المرتبطة

-- ===== الخطوة 1: إصلاح البيانات الموجودة =====

-- 1.1 تحديث حالة الاشتراكات المنتهية
UPDATE organization_subscriptions 
SET status = 'expired'
WHERE status IN ('active', 'trial') 
  AND end_date < NOW();

-- 1.2 تزامن بيانات organizations مع الاشتراكات النشطة
UPDATE organizations 
SET 
  subscription_id = os.id,
  subscription_tier = sp.code,
  subscription_status = os.status
FROM organization_subscriptions os
JOIN subscription_plans sp ON os.plan_id = sp.id
WHERE organizations.id = os.organization_id
  AND os.status IN ('active', 'trial')
  AND os.end_date >= NOW()
  AND (
    organizations.subscription_id IS NULL 
    OR organizations.subscription_id != os.id
    OR organizations.subscription_status != os.status
  );

-- 1.3 تحديث المؤسسات التي ليس لديها اشتراك نشط
UPDATE organizations 
SET 
  subscription_id = NULL,
  subscription_tier = 'free',
  subscription_status = 'expired'
WHERE id NOT IN (
  SELECT organization_id 
  FROM organization_subscriptions 
  WHERE status IN ('active', 'trial') 
    AND end_date >= NOW()
)
AND (
  subscription_status != 'expired' 
  OR subscription_tier != 'free'
  OR subscription_id IS NOT NULL
);

-- ===== الخطوة 2: إنشاء دالة محسنة لتفعيل الاشتراك =====

CREATE OR REPLACE FUNCTION activate_subscription_improved(
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
    v_organization organizations;
    v_existing_subscription organization_subscriptions;
    v_subscription_id UUID;
    v_end_date TIMESTAMPTZ;
    v_billing_cycle TEXT;
    v_success BOOLEAN := FALSE;
    v_message TEXT := 'حدث خطأ غير معروف';
    v_user_id UUID;
BEGIN
    -- سجل البيانات للتشخيص
    RAISE NOTICE 'Activating code: % for organization: %', p_activation_code, p_organization_id;
    
    -- التحقق من وجود المؤسسة
    SELECT * INTO v_organization FROM organizations
    WHERE id = p_organization_id;
    
    IF v_organization IS NULL THEN
        v_user_id := auth.uid();
        IF v_user_id IS NULL THEN
            v_message := 'يجب تسجيل الدخول لتفعيل كود الاشتراك';
            RETURN QUERY SELECT v_success, v_message, NULL::UUID, NULL::TIMESTAMPTZ;
            RETURN;
        END IF;
    END IF;

    -- البحث عن الكود
    SELECT * INTO v_code FROM activation_codes 
    WHERE code = p_activation_code;
    
    -- التحقق من وجود الكود
    IF v_code IS NULL THEN
        v_message := 'كود التفعيل غير صالح';
        RETURN QUERY SELECT v_success, v_message, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- التحقق من صلاحية الكود
    IF v_code.status != 'active' THEN
        v_message := 'كود التفعيل غير نشط أو تم استخدامه بالفعل';
        RETURN QUERY SELECT v_success, v_message, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- التحقق من تاريخ انتهاء الصلاحية
    IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
        UPDATE activation_codes 
        SET status = 'expired'
        WHERE id = v_code.id;
        
        v_message := 'كود التفعيل منتهي الصلاحية';
        RETURN QUERY SELECT v_success, v_message, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- البحث عن خطة الاشتراك
    SELECT * INTO v_plan FROM subscription_plans 
    WHERE id = v_code.plan_id;
    
    -- التحقق من وجود خطة الاشتراك
    IF v_plan IS NULL THEN
        v_message := 'خطة الاشتراك غير موجودة';
        RETURN QUERY SELECT v_success, v_message, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- استخدام دورة الفوترة من كود التفعيل
    v_billing_cycle := v_code.billing_cycle;
    
    -- حساب تاريخ انتهاء الاشتراك بناءً على فترة الفوترة
    v_end_date := NOW() + 
        CASE 
            WHEN v_billing_cycle = 'monthly' THEN INTERVAL '1 month'
            WHEN v_billing_cycle = 'yearly' THEN INTERVAL '1 year'
            ELSE INTERVAL '1 year' -- الافتراضي هو سنوي
        END;
    
    -- البحث عن اشتراك نشط موجود
    SELECT * INTO v_existing_subscription 
    FROM organization_subscriptions 
    WHERE organization_id = p_organization_id 
      AND status IN ('active', 'trial')
      AND end_date >= NOW();
    
    -- بدء معاملة قاعدة البيانات
    BEGIN
        -- إذا كان هناك اشتراك نشط، قم بإنهائه أولاً
        IF v_existing_subscription.id IS NOT NULL THEN
            UPDATE organization_subscriptions 
            SET 
                status = 'expired',
                updated_at = NOW()
            WHERE id = v_existing_subscription.id;
            
            -- إضافة سجل في تاريخ الاشتراكات
            INSERT INTO subscription_history (
                organization_id,
                plan_id,
                action,
                from_status,
                to_status,
                notes,
                created_at
            ) VALUES (
                p_organization_id,
                v_existing_subscription.plan_id,
                'expired',
                'active',
                'expired',
                'تم إنهاء الاشتراك السابق لتفعيل اشتراك جديد بالكود: ' || v_code.code,
                NOW()
            );
        END IF;
        
        -- تحديث حالة كود التفعيل
        UPDATE activation_codes 
        SET 
            status = 'used',
            organization_id = p_organization_id,
            used_at = NOW()
        WHERE id = v_code.id;
        
        -- إنشاء اشتراك جديد للمؤسسة
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
            'DZD', -- العملة الافتراضية
            'activation_code', -- طريقة الدفع هي كود التفعيل
            v_code.code, -- مرجع الدفع هو الكود نفسه
            FALSE -- لا يتم تجديد الاشتراك تلقائياً
        ) RETURNING id INTO v_subscription_id;
        
        -- تحديث الكود بمعرف الاشتراك
        UPDATE activation_codes 
        SET subscription_id = v_subscription_id
        WHERE id = v_code.id;
        
        -- تحديث المؤسسة بمعرف الاشتراك الجديد
        UPDATE organizations
        SET 
            subscription_id = v_subscription_id,
            subscription_tier = v_plan.code,
            subscription_status = 'active'
        WHERE id = p_organization_id;
        
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
            p_organization_id,
            v_code.plan_id,
            'created',
            COALESCE(v_existing_subscription.status, 'none'),
            'active',
            'تم تفعيل الاشتراك باستخدام كود التفعيل: ' || v_code.code,
            NOW()
        );
        
        v_success := TRUE;
        v_message := 'تم تفعيل الاشتراك بنجاح';
        
        RETURN QUERY SELECT v_success, v_message, v_subscription_id, v_end_date;
    EXCEPTION
        WHEN OTHERS THEN
            v_message := 'حدث خطأ أثناء تفعيل الاشتراك: ' || SQLERRM;
            RETURN QUERY SELECT FALSE, v_message, NULL::UUID, NULL::TIMESTAMPTZ;
    END;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ===== الخطوة 3: إنشاء دالة للتحقق من تزامن البيانات =====

CREATE OR REPLACE FUNCTION sync_organization_subscription_data()
RETURNS TABLE (
    organization_id UUID,
    fixed_issue TEXT,
    old_status TEXT,
    new_status TEXT
) AS $$
DECLARE
    rec RECORD;
    v_active_subscription organization_subscriptions;
BEGIN
    -- البحث عن المؤسسات التي تحتاج إلى تزامن
    FOR rec IN 
        SELECT DISTINCT o.id as org_id, o.subscription_status as current_status
        FROM organizations o
        LEFT JOIN organization_subscriptions os ON o.subscription_id = os.id
        WHERE (
            -- حالة 1: المؤسسة تشير لاشتراك منتهي أو غير موجود
            (o.subscription_id IS NOT NULL AND (os.id IS NULL OR os.status = 'expired' OR os.end_date < NOW()))
            OR
            -- حالة 2: المؤسسة لا تشير لاشتراك لكن لديها اشتراك نشط
            (o.subscription_id IS NULL AND EXISTS (
                SELECT 1 FROM organization_subscriptions os2
                WHERE os2.organization_id = o.id 
                  AND os2.status IN ('active', 'trial') 
                  AND os2.end_date >= NOW()
            ))
            OR
            -- حالة 3: المؤسسة تشير لاشتراك خاطئ
            (o.subscription_id IS NOT NULL AND os.organization_id != o.id)
        )
    LOOP
        -- البحث عن الاشتراك النشط الصحيح
        SELECT * INTO v_active_subscription
        FROM organization_subscriptions os3
        WHERE os3.organization_id = rec.org_id 
          AND os3.status IN ('active', 'trial') 
          AND os3.end_date >= NOW()
        ORDER BY os3.end_date DESC
        LIMIT 1;
        
        IF v_active_subscription.id IS NOT NULL THEN
            -- تحديث المؤسسة بالاشتراك النشط
            UPDATE organizations
            SET 
                subscription_id = v_active_subscription.id,
                subscription_tier = (
                    SELECT code FROM subscription_plans WHERE id = v_active_subscription.plan_id
                ),
                subscription_status = v_active_subscription.status
            WHERE id = rec.org_id;
            
            RETURN QUERY SELECT 
                rec.org_id,
                'تم ربط الاشتراك النشط',
                rec.current_status,
                v_active_subscription.status;
        ELSE
            -- لا يوجد اشتراك نشط، تحديث المؤسسة لحالة منتهية
            UPDATE organizations
            SET 
                subscription_id = NULL,
                subscription_tier = 'free',
                subscription_status = 'expired'
            WHERE id = rec.org_id;
            
            RETURN QUERY SELECT 
                rec.org_id,
                'تم تحديث الحالة لمنتهية',
                rec.current_status,
                'expired'::TEXT;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ===== الخطوة 4: إنشاء دالة للمراقبة المستمرة =====

CREATE OR REPLACE FUNCTION monitor_and_fix_subscriptions()
RETURNS TABLE (
    total_fixed INTEGER,
    expired_subscriptions INTEGER,
    synced_organizations INTEGER
) AS $$
DECLARE
    v_expired_count INTEGER;
    v_synced_count INTEGER;
BEGIN
    -- تحديث الاشتراكات المنتهية
    UPDATE organization_subscriptions 
    SET status = 'expired'
    WHERE status IN ('active', 'trial') 
      AND end_date < NOW();
    
    GET DIAGNOSTICS v_expired_count = ROW_COUNT;
    
    -- تزامن بيانات المؤسسات
    SELECT COUNT(*) INTO v_synced_count
    FROM sync_organization_subscription_data();
    
    RETURN QUERY SELECT v_expired_count + v_synced_count, v_expired_count, v_synced_count;
END;
$$ LANGUAGE plpgsql;

-- ===== الخطوة 5: إنشاء Triggers للحفاظ على التزامن =====

-- Trigger لتحديث بيانات المؤسسة عند تغيير الاشتراك
CREATE OR REPLACE FUNCTION update_organization_on_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_code TEXT;
BEGIN
    -- جلب كود الخطة
    SELECT code INTO v_plan_code 
    FROM subscription_plans 
    WHERE id = COALESCE(NEW.plan_id, OLD.plan_id);
    
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- تحديث المؤسسة عند إنشاء أو تحديث اشتراك
        IF NEW.status IN ('active', 'trial') AND NEW.end_date >= NOW() THEN
            UPDATE organizations
            SET 
                subscription_id = NEW.id,
                subscription_tier = v_plan_code,
                subscription_status = NEW.status
            WHERE id = NEW.organization_id;
        ELSIF NEW.status = 'expired' OR NEW.end_date < NOW() THEN
            -- التحقق من عدم وجود اشتراك نشط آخر
            IF NOT EXISTS (
                SELECT 1 FROM organization_subscriptions os4
                WHERE os4.organization_id = NEW.organization_id 
                  AND os4.id != NEW.id
                  AND os4.status IN ('active', 'trial') 
                  AND os4.end_date >= NOW()
            ) THEN
                UPDATE organizations
                SET 
                    subscription_id = NULL,
                    subscription_tier = 'free',
                    subscription_status = 'expired'
                WHERE id = NEW.organization_id;
            END IF;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- تحديث المؤسسة عند حذف اشتراك
        IF NOT EXISTS (
            SELECT 1 FROM organization_subscriptions os5
            WHERE os5.organization_id = OLD.organization_id 
              AND os5.id != OLD.id
              AND os5.status IN ('active', 'trial') 
              AND os5.end_date >= NOW()
        ) THEN
            UPDATE organizations
            SET 
                subscription_id = NULL,
                subscription_tier = 'free',
                subscription_status = 'expired'
            WHERE id = OLD.organization_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- إنشاء أو استبدال الـ Trigger
DROP TRIGGER IF EXISTS trigger_update_organization_subscription ON organization_subscriptions;
CREATE TRIGGER trigger_update_organization_subscription
    AFTER INSERT OR UPDATE OR DELETE ON organization_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_organization_on_subscription_change();

-- ===== الخطوة 6: تحديث دالة التفعيل الأصلية لتستخدم الدالة المحسنة =====

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
    -- استخدام الدالة المحسنة
    RETURN QUERY SELECT * FROM activate_subscription_improved(p_activation_code, p_organization_id);
END;
$$ LANGUAGE plpgsql;

-- ===== الخطوة 7: تشغيل الإصلاحات الأولية =====

-- تشغيل مراقبة وإصلاح الاشتراكات
SELECT * FROM monitor_and_fix_subscriptions();

-- تشغيل تزامن البيانات
SELECT * FROM sync_organization_subscription_data();

-- ===== رسالة النجاح =====
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح نظام تفعيل الاشتراكات بنجاح!';
    RAISE NOTICE '📊 الدوال المتاحة:';
    RAISE NOTICE '   - activate_subscription_improved(): دالة تفعيل محسنة';
    RAISE NOTICE '   - sync_organization_subscription_data(): تزامن البيانات';
    RAISE NOTICE '   - monitor_and_fix_subscriptions(): مراقبة وإصلاح مستمر';
    RAISE NOTICE '🔄 تم إنشاء Triggers للحفاظ على تزامن البيانات تلقائياً';
END;
$$; 