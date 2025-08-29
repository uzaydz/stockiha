-- إصلاح دالة تفعيل الاشتراك مع الدورات
-- حل مشكلة حقل created_by وحقول أخرى

CREATE OR REPLACE FUNCTION activate_subscription_with_courses(
    p_activation_code TEXT,
    p_organization_id UUID
) 
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    subscription_id UUID,
    subscription_end_date TIMESTAMPTZ,
    courses_access_granted BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
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
    v_courses_access_granted BOOLEAN := FALSE;
    v_user_id UUID;
    v_granted_by UUID;
BEGIN
    -- سجل البيانات للتشخيص
    RAISE NOTICE 'Activating code: % for organization: %', p_activation_code, p_organization_id;
    
    -- الحصول على معرف المستخدم الحالي
    v_user_id := auth.uid();
    
    -- التحقق من وجود المؤسسة
    SELECT * INTO v_organization FROM organizations
    WHERE id = p_organization_id;
    
    IF v_organization IS NULL THEN
        IF v_user_id IS NULL THEN
            v_message := 'يجب تسجيل الدخول لتفعيل كود الاشتراك';
            RETURN QUERY SELECT v_success, v_message, NULL::UUID, NULL::TIMESTAMPTZ, v_courses_access_granted;
            RETURN;
        END IF;
    END IF;

    -- البحث عن الكود
    SELECT * INTO v_code FROM activation_codes 
    WHERE code = p_activation_code;
    
    -- التحقق من وجود الكود
    IF v_code IS NULL THEN
        v_message := 'كود التفعيل غير صالح';
        RETURN QUERY SELECT v_success, v_message, NULL::UUID, NULL::TIMESTAMPTZ, v_courses_access_granted;
        RETURN;
    END IF;
    
    -- التحقق من حالة الكود
    IF v_code.status != 'active' THEN
        v_message := 'كود التفعيل غير نشط أو تم استخدامه بالفعل';
        RETURN QUERY SELECT v_success, v_message, NULL::UUID, NULL::TIMESTAMPTZ, v_courses_access_granted;
        RETURN;
    END IF;
    
    -- التحقق من تاريخ انتهاء الصلاحية
    IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
        UPDATE activation_codes 
        SET status = 'expired'
        WHERE id = v_code.id;
        
        v_message := 'كود التفعيل منتهي الصلاحية';
        RETURN QUERY SELECT v_success, v_message, NULL::UUID, NULL::TIMESTAMPTZ, v_courses_access_granted;
        RETURN;
    END IF;
    
    -- البحث عن خطة الاشتراك
    SELECT * INTO v_plan FROM subscription_plans 
    WHERE id = v_code.plan_id;
    
    -- التحقق من وجود خطة الاشتراك
    IF v_plan IS NULL THEN
        v_message := 'خطة الاشتراك غير موجودة';
        RETURN QUERY SELECT v_success, v_message, NULL::UUID, NULL::TIMESTAMPTZ, v_courses_access_granted;
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
    
    -- تحديد من قام بمنح الوصول (إما من الكود أو المستخدم الحالي)
    v_granted_by := COALESCE(v_code.created_by, v_user_id);
    
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
                created_at,
                created_by
            ) VALUES (
                p_organization_id,
                v_existing_subscription.plan_id,
                'expired',
                'active',
                'expired',
                'تم إنهاء الاشتراك السابق لتفعيل اشتراك جديد بالكود: ' || v_code.code,
                NOW(),
                v_granted_by
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
            is_auto_renew,
            lifetime_courses_access,
            accessible_courses,
            courses_access_expires_at
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
            FALSE, -- لا يتم تجديد الاشتراك تلقائياً
            COALESCE(v_code.lifetime_courses_access, FALSE), -- الوصول للدورات مدى الحياة
            COALESCE(v_code.accessible_courses, '[]'::JSONB), -- الدورات المفتوحة
            CASE 
                WHEN COALESCE(v_code.lifetime_courses_access, FALSE) THEN NULL -- مدى الحياة
                ELSE v_end_date -- نفس تاريخ انتهاء الاشتراك
            END
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
        
        -- منح الوصول للدورات إذا كان مطلوباً
        IF COALESCE(v_code.lifetime_courses_access, FALSE) THEN
            -- منح الوصول لجميع الدورات النشطة مدى الحياة
            INSERT INTO organization_course_access (
                organization_id, 
                course_id, 
                access_type, 
                expires_at,
                granted_by,
                notes
            )
            SELECT 
                p_organization_id,
                c.id,
                COALESCE(v_code.courses_access_type, 'lifetime'),
                NULL, -- NULL يعني مدى الحياة
                v_granted_by,
                'تم منح الوصول عبر كود التفعيل: ' || v_code.code
            FROM courses c
            WHERE c.is_active = true
            ON CONFLICT (organization_id, course_id) 
            DO UPDATE SET
                access_type = EXCLUDED.access_type,
                expires_at = EXCLUDED.expires_at,
                granted_by = EXCLUDED.granted_by,
                updated_at = NOW();
            
            v_courses_access_granted := TRUE;
        END IF;
        
        -- إنشاء سجل في تاريخ الاشتراكات
        INSERT INTO subscription_history (
            organization_id,
            plan_id,
            action,
            from_status,
            to_status,
            notes,
            created_at,
            created_by
        ) VALUES (
            p_organization_id,
            v_code.plan_id,
            'created',
            COALESCE(v_existing_subscription.status, 'none'),
            'active',
            'تم تفعيل الاشتراك باستخدام كود التفعيل: ' || v_code.code || 
            CASE 
                WHEN COALESCE(v_code.lifetime_courses_access, FALSE) THEN ' مع الوصول للدورات مدى الحياة'
                ELSE ''
            END,
            NOW(),
            v_granted_by
        );
        
        v_success := TRUE;
        v_message := 'تم تفعيل الاشتراك بنجاح' || 
                    CASE 
                        WHEN COALESCE(v_code.lifetime_courses_access, FALSE) THEN ' مع الوصول لجميع دورات سطوكيها مدى الحياة'
                        ELSE ''
                    END;
        
        RETURN QUERY SELECT v_success, v_message, v_subscription_id, v_end_date, v_courses_access_granted;
    EXCEPTION
        WHEN OTHERS THEN
            v_message := 'حدث خطأ أثناء تفعيل الاشتراك: ' || SQLERRM;
            RETURN QUERY SELECT FALSE, v_message, NULL::UUID, NULL::TIMESTAMPTZ, v_courses_access_granted;
    END;
    
    RETURN;
END;
$$;

-- تحديث التعليقات
COMMENT ON FUNCTION activate_subscription_with_courses(TEXT, UUID) IS 'دالة تفعيل الاشتراك مع منح الوصول للدورات - تم إصلاحها لحل مشكلة حقل created_by';

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح دالة activate_subscription_with_courses بنجاح!';
    RAISE NOTICE '🔧 تم حل مشكلة حقل created_by';
    RAISE NOTICE '🔧 تم إضافة معالجة للحقول NULL';
    RAISE NOTICE '🔧 تم تحسين التعامل مع الأخطاء';
END $$;
