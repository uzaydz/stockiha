-- إصلاح مشكلة تفعيل الاشتراك - إضافة SECURITY DEFINER
-- هذا الإصلاح يحل مشكلة "cannot execute UPDATE in a read-only transaction"

-- إنشاء دالة تفعيل الاشتراك المحسنة مع SECURITY DEFINER
CREATE OR REPLACE FUNCTION activate_subscription_improved(
    p_activation_code TEXT,
    p_organization_id UUID
) 
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    subscription_id UUID,
    subscription_end_date TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER -- هذا يسمح للدالة بالعمل بصلاحيات مالك الدالة
AS $$
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
$$;

-- تحديث الدالة الرئيسية لتستخدم SECURITY DEFINER أيضاً
CREATE OR REPLACE FUNCTION activate_subscription(
    p_activation_code TEXT,
    p_organization_id UUID
) 
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    subscription_id UUID,
    subscription_end_date TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER -- إضافة SECURITY DEFINER هنا أيضاً
AS $$
BEGIN
    -- استخدام الدالة المحسنة
    RETURN QUERY SELECT * FROM activate_subscription_improved(p_activation_code, p_organization_id);
END;
$$;

-- إعطاء صلاحيات التنفيذ للدالتين لجميع المستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION activate_subscription_improved(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_subscription(TEXT, UUID) TO authenticated;

-- إعطاء صلاحيات التنفيذ للمستخدمين المجهولين أيضاً (إذا كان مطلوباً)
GRANT EXECUTE ON FUNCTION activate_subscription_improved(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION activate_subscription(TEXT, UUID) TO anon;

-- تعليق توضيحي
COMMENT ON FUNCTION activate_subscription_improved IS 'دالة تفعيل الاشتراك المحسنة مع SECURITY DEFINER لحل مشكلة القراءة فقط';
COMMENT ON FUNCTION activate_subscription IS 'دالة تفعيل الاشتراك الرئيسية مع SECURITY DEFINER';
