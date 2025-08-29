-- إضافة خاصية الدورات مدى الحياة لأكواد التفعيل
-- التاريخ: 2025-01-27
-- الهدف: تمكين إنشاء أكواد تفعيل تمنح الوصول لجميع دورات سطوكيها مدى الحياة

BEGIN;

-- ===== 1. تعديل جدول activation_codes =====

-- إضافة حقل للدورات مدى الحياة
ALTER TABLE public.activation_codes 
ADD COLUMN IF NOT EXISTS lifetime_courses_access BOOLEAN DEFAULT FALSE;

-- إضافة حقل لتحديد نوع الوصول للدورات
ALTER TABLE public.activation_codes 
ADD COLUMN IF NOT EXISTS courses_access_type VARCHAR(20) DEFAULT 'standard' 
CHECK (courses_access_type IN ('standard', 'lifetime', 'premium'));

-- إضافة حقل لتحديد الدورات المفتوحة
ALTER TABLE public.activation_codes 
ADD COLUMN IF NOT EXISTS accessible_courses JSONB DEFAULT '[]'::JSONB;

-- إضافة فهارس جديدة
CREATE INDEX IF NOT EXISTS idx_activation_codes_lifetime_courses ON activation_codes(lifetime_courses_access);
CREATE INDEX IF NOT EXISTS idx_activation_codes_courses_access_type ON activation_codes(courses_access_type);

-- ===== 2. تعديل جدول activation_code_batches =====

-- إضافة حقل للدورات مدى الحياة
ALTER TABLE public.activation_code_batches 
ADD COLUMN IF NOT EXISTS lifetime_courses_access BOOLEAN DEFAULT FALSE;

-- إضافة حقل لتحديد نوع الوصول للدورات
ALTER TABLE public.activation_code_batches 
ADD COLUMN IF NOT EXISTS courses_access_type VARCHAR(20) DEFAULT 'standard' 
CHECK (courses_access_type IN ('standard', 'lifetime', 'premium'));

-- إضافة فهارس جديدة
CREATE INDEX IF NOT EXISTS idx_activation_code_batches_lifetime_courses ON activation_code_batches(lifetime_courses_access);
CREATE INDEX IF NOT EXISTS idx_activation_code_batches_courses_access_type ON activation_code_batches(courses_access_type);

-- ===== 3. تعديل جدول organization_subscriptions =====

-- إضافة حقل للدورات مدى الحياة
ALTER TABLE public.organization_subscriptions 
ADD COLUMN IF NOT EXISTS lifetime_courses_access BOOLEAN DEFAULT FALSE;

-- إضافة حقل لتحديد الدورات المفتوحة
ALTER TABLE public.organization_subscriptions 
ADD COLUMN IF NOT EXISTS accessible_courses JSONB DEFAULT '[]'::JSONB;

-- إضافة حقل لتاريخ انتهاء صلاحية الدورات
ALTER TABLE public.organization_subscriptions 
ADD COLUMN IF NOT EXISTS courses_access_expires_at TIMESTAMPTZ;

-- إضافة فهارس جديدة
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_lifetime_courses ON organization_subscriptions(lifetime_courses_access);
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_courses_access ON organization_subscriptions(accessible_courses);

-- ===== 4. إنشاء جدول إدارة الوصول للدورات =====

CREATE TABLE IF NOT EXISTS organization_course_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    access_type VARCHAR(20) NOT NULL DEFAULT 'standard' 
        CHECK (access_type IN ('standard', 'lifetime', 'premium')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL يعني مدى الحياة
    granted_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, course_id)
);

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_organization_course_access_org_id ON organization_course_access(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_course_access_course_id ON organization_course_access(course_id);
CREATE INDEX IF NOT EXISTS idx_organization_course_access_type ON organization_course_access(access_type);
CREATE INDEX IF NOT EXISTS idx_organization_course_access_expires ON organization_course_access(expires_at);

-- ===== 5. إنشاء دالة تفعيل الاشتراك مع الدورات =====

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
            v_code.lifetime_courses_access, -- الوصول للدورات مدى الحياة
            v_code.accessible_courses, -- الدورات المفتوحة
            CASE 
                WHEN v_code.lifetime_courses_access THEN NULL -- مدى الحياة
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
        IF v_code.lifetime_courses_access THEN
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
                v_code.created_by,
                'تم منح الوصول عبر كود التفعيل: ' || v_code.code
            FROM courses c
            WHERE c.is_active = true
            ON CONFLICT (organization_id, course_id) 
            DO UPDATE SET
                access_type = EXCLUDED.access_type,
                expires_at = EXCLUDED.expires_at,
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
            created_at
        ) VALUES (
            p_organization_id,
            v_code.plan_id,
            'created',
            COALESCE(v_existing_subscription.status, 'none'),
            'active',
            'تم تفعيل الاشتراك باستخدام كود التفعيل: ' || v_code.code || 
            CASE 
                WHEN v_code.lifetime_courses_access THEN ' مع الوصول للدورات مدى الحياة'
                ELSE ''
            END,
            NOW()
        );
        
        v_success := TRUE;
        v_message := 'تم تفعيل الاشتراك بنجاح' || 
                    CASE 
                        WHEN v_code.lifetime_courses_access THEN ' مع الوصول لجميع دورات سطوكيها مدى الحياة'
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

-- ===== 6. تحديث الدالة الرئيسية =====

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
SECURITY DEFINER
AS $$
BEGIN
    -- استخدام الدالة المحسنة مع الدورات
    RETURN QUERY SELECT 
        success, 
        message, 
        subscription_id, 
        subscription_end_date 
    FROM activate_subscription_with_courses(p_activation_code, p_organization_id);
END;
$$;

-- ===== 7. إنشاء دالة للحصول على الوصول للدورات =====

CREATE OR REPLACE FUNCTION get_organization_courses_access(
    p_organization_id UUID
)
RETURNS TABLE (
    course_id UUID,
    course_title TEXT,
    access_type TEXT,
    granted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN,
    is_lifetime BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        oca.access_type,
        oca.granted_at,
        oca.expires_at,
        CASE 
            WHEN oca.expires_at IS NULL THEN TRUE -- مدى الحياة
            WHEN oca.expires_at > NOW() THEN TRUE -- لم تنتهي الصلاحية
            ELSE FALSE -- انتهت الصلاحية
        END as is_active,
        CASE 
            WHEN oca.expires_at IS NULL THEN TRUE
            ELSE FALSE
        END as is_lifetime
    FROM organization_course_access oca
    JOIN courses c ON c.id = oca.course_id
    WHERE oca.organization_id = p_organization_id
      AND c.is_active = true
    ORDER BY c.order_index, c.title;
END;
$$;

-- ===== 8. إعطاء الصلاحيات =====

-- إعطاء صلاحيات التنفيذ للدوال الجديدة
GRANT EXECUTE ON FUNCTION activate_subscription_with_courses(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_courses_access(UUID) TO authenticated;

-- إعطاء صلاحيات التنفيذ للمستخدمين المجهولين أيضاً
GRANT EXECUTE ON FUNCTION activate_subscription_with_courses(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_organization_courses_access(UUID) TO anon;

-- ===== 9. إنشاء RLS policies للجدول الجديد =====

ALTER TABLE organization_course_access ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة
CREATE POLICY "organization_course_access_select_policy" 
ON organization_course_access
FOR SELECT 
USING (
    -- السوبر أدمن يرى كل شيء
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    )
    OR
    -- مسؤولو المؤسسات يرون دورات مؤسستهم
    (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND is_org_admin = true
        )
        AND organization_id = (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    )
    OR
    -- المستخدمون يمكنهم رؤية دورات مؤسستهم
    (
        auth.role() = 'authenticated' 
        AND organization_id = (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    )
);

-- سياسة الإدراج (السوبر أدمن فقط)
CREATE POLICY "organization_course_access_insert_policy" 
ON organization_course_access
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    )
);

-- سياسة التحديث (السوبر أدمن فقط)
CREATE POLICY "organization_course_access_update_policy" 
ON organization_course_access
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    )
);

-- سياسة الحذف (السوبر أدمن فقط)
CREATE POLICY "organization_course_access_delete_policy" 
ON organization_course_access
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    )
);

-- ===== 10. التعليقات التوضيحية =====

COMMENT ON FUNCTION activate_subscription_with_courses IS 'دالة تفعيل الاشتراك مع منح الوصول للدورات مدى الحياة';
COMMENT ON FUNCTION get_organization_courses_access IS 'دالة للحصول على الوصول للدورات لمؤسسة معينة';
COMMENT ON TABLE organization_course_access IS 'جدول إدارة الوصول للدورات للمؤسسات';

-- ===== 11. التحقق من النتائج =====
DO $$
BEGIN
    RAISE NOTICE '=== تقرير إضافة خاصية الدورات مدى الحياة ===';
    RAISE NOTICE 'تم إضافة الحقول الجديدة لـ activation_codes';
    RAISE NOTICE 'تم إضافة الحقول الجديدة لـ activation_code_batches';
    RAISE NOTICE 'تم إضافة الحقول الجديدة لـ organization_subscriptions';
    RAISE NOTICE 'تم إنشاء جدول organization_course_access';
    RAISE NOTICE 'تم إنشاء دالة activate_subscription_with_courses';
    RAISE NOTICE 'تم تحديث دالة activate_subscription';
    RAISE NOTICE 'تم إنشاء دالة get_organization_courses_access';
    RAISE NOTICE 'تم إنشاء RLS policies للجدول الجديد';
    RAISE NOTICE '=== انتهى التطبيق بنجاح ===';
END $$;

COMMIT;
