-- ======================================================================
-- حل آمن وشامل لتسجيل المستأجرين
-- يركز على الأمان وأفضل الممارسات
-- محدث ليتوافق مع هيكل قاعدة البيانات الفعلي
-- ======================================================================

-- 1. إنشاء دور خاص للعمليات الآمنة
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tenant_manager') THEN
        CREATE ROLE tenant_manager;
    END IF;
END
$$;

-- منح الصلاحيات اللازمة للدور
GRANT USAGE ON SCHEMA public TO tenant_manager;
GRANT SELECT, INSERT, UPDATE ON public.organizations TO tenant_manager;
GRANT SELECT, INSERT, UPDATE ON public.users TO tenant_manager;
GRANT SELECT, INSERT, UPDATE ON public.organization_subscriptions TO tenant_manager;
GRANT SELECT ON public.subscription_plans TO tenant_manager;

-- 2. وظيفة آمنة للتحقق من صحة البيانات
CREATE OR REPLACE FUNCTION validate_tenant_registration_data(
    p_subdomain TEXT,
    p_organization_name TEXT,
    p_user_email TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    validation_result JSONB := '{}';
    error_messages TEXT[] := '{}';
BEGIN
    -- التحقق من صحة النطاق الفرعي
    IF p_subdomain IS NULL OR LENGTH(TRIM(p_subdomain)) = 0 THEN
        error_messages := array_append(error_messages, 'النطاق الفرعي مطلوب');
    ELSIF LENGTH(p_subdomain) < 3 THEN
        error_messages := array_append(error_messages, 'النطاق الفرعي يجب أن يكون 3 أحرف على الأقل');
    ELSIF LENGTH(p_subdomain) > 63 THEN
        error_messages := array_append(error_messages, 'النطاق الفرعي طويل جداً');
    ELSIF p_subdomain !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND LENGTH(p_subdomain) > 1 THEN
        error_messages := array_append(error_messages, 'النطاق الفرعي يحتوي على أحرف غير صالحة');
    END IF;

    -- التحقق من صحة اسم المؤسسة
    IF p_organization_name IS NULL OR LENGTH(TRIM(p_organization_name)) = 0 THEN
        error_messages := array_append(error_messages, 'اسم المؤسسة مطلوب');
    ELSIF LENGTH(p_organization_name) > 255 THEN
        error_messages := array_append(error_messages, 'اسم المؤسسة طويل جداً');
    END IF;

    -- التحقق من صحة البريد الإلكتروني
    IF p_user_email IS NULL OR LENGTH(TRIM(p_user_email)) = 0 THEN
        error_messages := array_append(error_messages, 'البريد الإلكتروني مطلوب');
    ELSIF p_user_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        error_messages := array_append(error_messages, 'البريد الإلكتروني غير صالح');
    END IF;

    -- التحقق من عدم وجود النطاق الفرعي مسبقاً
    IF EXISTS (SELECT 1 FROM organizations WHERE subdomain = LOWER(p_subdomain)) THEN
        error_messages := array_append(error_messages, 'النطاق الفرعي مستخدم بالفعل');
    END IF;

    -- إرجاع النتيجة
    IF array_length(error_messages, 1) > 0 THEN
        validation_result := jsonb_build_object(
            'valid', false,
            'errors', to_jsonb(error_messages)
        );
    ELSE
        validation_result := jsonb_build_object('valid', true);
    END IF;

    RETURN validation_result;
END;
$$;

-- 3. وظيفة آمنة لإنشاء المؤسسة
CREATE OR REPLACE FUNCTION create_organization_secure(
    p_subdomain TEXT,
    p_name TEXT,
    p_user_id UUID,
    p_user_email TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    new_org_id UUID;
    trial_plan_id UUID;
    new_subscription_id UUID;
    result JSONB;
    validation_result JSONB;
BEGIN
    -- التحقق من صحة البيانات أولاً
    validation_result := validate_tenant_registration_data(p_subdomain, p_name, COALESCE(p_user_email, ''));
    
    IF NOT (validation_result->>'valid')::boolean THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'بيانات غير صالحة',
            'validation_errors', validation_result->'errors'
        );
    END IF;

    -- التحقق من وجود المستخدم
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المستخدم غير موجود في النظام'
        );
    END IF;

    -- الحصول على خطة التجربة المجانية
    SELECT id INTO trial_plan_id 
    FROM subscription_plans 
    WHERE code = 'trial' AND is_active = true 
    LIMIT 1;

    -- إذا لم توجد خطة تجريبية، استخدم الخطة الأساسية
    IF trial_plan_id IS NULL THEN
        SELECT id INTO trial_plan_id 
        FROM subscription_plans 
        WHERE code = 'basic' AND is_active = true 
        LIMIT 1;
    END IF;

    BEGIN
        -- إنشاء المؤسسة
        INSERT INTO organizations (
            id,
            name,
            subdomain,
            owner_id,
            created_at,
            updated_at,
            status
        ) VALUES (
            gen_random_uuid(),
            TRIM(p_name),
            LOWER(TRIM(p_subdomain)),
            p_user_id,
            NOW(),
            NOW(),
            'active'
        ) RETURNING id INTO new_org_id;

        -- إنشاء أو تحديث سجل المستخدم
        INSERT INTO users (
            id,
            email,
            organization_id,
            role,
            created_at,
            updated_at,
            is_active
        ) VALUES (
            p_user_id,
            COALESCE(p_user_email, (SELECT email FROM auth.users WHERE id = p_user_id)),
            new_org_id,
            'owner',
            NOW(),
            NOW(),
            true
        ) ON CONFLICT (id) DO UPDATE SET
            organization_id = new_org_id,
            role = 'owner',
            updated_at = NOW(),
            is_active = true;

        -- إنشاء اشتراك تجريبي إذا توجد خطة
        IF trial_plan_id IS NOT NULL THEN
            INSERT INTO organization_subscriptions (
                id,
                organization_id,
                plan_id,
                status,
                billing_cycle,
                start_date,
                end_date,
                trial_ends_at,
                amount_paid,
                currency,
                is_auto_renew,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                new_org_id,
                trial_plan_id,
                'trial',
                'monthly',
                NOW(),
                NOW() + INTERVAL '30 days',
                NOW() + INTERVAL '5 days',
                0.00,
                'DZD',
                false,
                NOW(),
                NOW()
            ) RETURNING id INTO new_subscription_id;

            -- ربط الاشتراك بالمؤسسة
            UPDATE organizations 
            SET subscription_id = new_subscription_id,
                subscription_tier = 'trial',
                subscription_status = 'trial',
                updated_at = NOW()
            WHERE id = new_org_id;
        END IF;

        result := jsonb_build_object(
            'success', true,
            'organization_id', new_org_id,
            'subscription_id', new_subscription_id,
            'subdomain', LOWER(TRIM(p_subdomain)),
            'message', 'تم إنشاء المؤسسة بنجاح'
        );

    EXCEPTION WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', 'فشل في إنشاء المؤسسة',
            'details', SQLERRM
        );
    END;

    RETURN result;
END;
$$;

-- 4. وظيفة آمنة للتحقق من توفر النطاق الفرعي
CREATE OR REPLACE FUNCTION check_subdomain_availability_secure(
    p_subdomain TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    is_available BOOLEAN := false;
    suggested_alternatives TEXT[] := '{}';
    counter INTEGER := 1;
    temp_subdomain TEXT;
BEGIN
    -- التحقق من صحة النطاق الفرعي
    IF p_subdomain IS NULL OR LENGTH(TRIM(p_subdomain)) = 0 THEN
        RETURN jsonb_build_object(
            'available', false,
            'error', 'النطاق الفرعي مطلوب'
        );
    END IF;

    -- تنظيف النطاق الفرعي
    p_subdomain := LOWER(TRIM(p_subdomain));

    -- التحقق من التوفر
    SELECT NOT EXISTS (
        SELECT 1 FROM organizations 
        WHERE subdomain = p_subdomain
    ) INTO is_available;

    -- إذا لم يكن متوفراً، اقتراح بدائل
    IF NOT is_available THEN
        WHILE counter <= 5 LOOP
            temp_subdomain := p_subdomain || counter::TEXT;
            IF NOT EXISTS (SELECT 1 FROM organizations WHERE subdomain = temp_subdomain) THEN
                suggested_alternatives := array_append(suggested_alternatives, temp_subdomain);
            END IF;
            counter := counter + 1;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'available', is_available,
        'subdomain', p_subdomain,
        'suggestions', CASE 
            WHEN NOT is_available THEN to_jsonb(suggested_alternatives)
            ELSE '[]'::jsonb
        END
    );
END;
$$;

-- 5. وظيفة تشخيصية آمنة
CREATE OR REPLACE FUNCTION diagnose_tenant_registration_secure(
    p_user_id UUID DEFAULT NULL,
    p_subdomain TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY INVOKER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    diagnosis JSONB := '{}';
    auth_user_exists BOOLEAN := false;
    public_user_exists BOOLEAN := false;
    org_exists BOOLEAN := false;
    subscription_exists BOOLEAN := false;
    org_subscription_id UUID;
BEGIN
    -- التحقق من المستخدم في auth.users
    IF p_user_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM auth.users WHERE id = p_user_id
        ) INTO auth_user_exists;
        
        -- التحقق من المستخدم في public.users
        SELECT EXISTS (
            SELECT 1 FROM users WHERE id = p_user_id
        ) INTO public_user_exists;
    END IF;

    -- التحقق من المؤسسة
    IF p_subdomain IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM organizations WHERE subdomain = LOWER(p_subdomain)
        ) INTO org_exists;
        
        -- الحصول على معرف الاشتراك من المؤسسة
        SELECT subscription_id INTO org_subscription_id
        FROM organizations 
        WHERE subdomain = LOWER(p_subdomain);
        
        -- التحقق من الاشتراك
        SELECT EXISTS (
            SELECT 1 FROM organization_subscriptions s
            WHERE s.id = org_subscription_id
            OR EXISTS (
                SELECT 1 FROM organizations o 
                WHERE o.subdomain = LOWER(p_subdomain) 
                AND s.organization_id = o.id
            )
        ) INTO subscription_exists;
    END IF;

    diagnosis := jsonb_build_object(
        'user_id', p_user_id,
        'subdomain', p_subdomain,
        'auth_user_exists', auth_user_exists,
        'public_user_exists', public_user_exists,
        'organization_exists', org_exists,
        'subscription_exists', subscription_exists,
        'org_subscription_id', org_subscription_id,
        'timestamp', NOW()
    );

    RETURN diagnosis;
END;
$$;

-- 6. وظيفة تنظيف البيانات الفاسدة (آمنة)
CREATE OR REPLACE FUNCTION cleanup_orphaned_registration_data_secure()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    cleanup_result JSONB;
    orphaned_users_count INTEGER := 0;
    orphaned_orgs_count INTEGER := 0;
    orphaned_subs_count INTEGER := 0;
BEGIN
    -- تنظيف المستخدمين بدون مؤسسات صالحة
    WITH orphaned_users AS (
        DELETE FROM users 
        WHERE organization_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM organizations 
            WHERE id = users.organization_id
        )
        RETURNING id
    )
    SELECT COUNT(*) FROM orphaned_users INTO orphaned_users_count;

    -- تنظيف المؤسسات بدون مالكين صالحين
    WITH orphaned_orgs AS (
        DELETE FROM organizations 
        WHERE owner_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = organizations.owner_id
        )
        RETURNING id
    )
    SELECT COUNT(*) FROM orphaned_orgs INTO orphaned_orgs_count;

    -- تنظيف الاشتراكات بدون مؤسسات صالحة
    WITH orphaned_subs AS (
        DELETE FROM organization_subscriptions 
        WHERE organization_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM organizations 
            WHERE id = organization_subscriptions.organization_id
        )
        RETURNING id
    )
    SELECT COUNT(*) FROM orphaned_subs INTO orphaned_subs_count;

    cleanup_result := jsonb_build_object(
        'success', true,
        'cleaned_users', orphaned_users_count,
        'cleaned_organizations', orphaned_orgs_count,
        'cleaned_subscriptions', orphaned_subs_count,
        'timestamp', NOW()
    );

    RETURN cleanup_result;
END;
$$;

-- 7. تحديث سياسات الأمان
-- سياسة للمؤسسات
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization" ON organizations
    FOR SELECT USING (
        owner_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = organizations.id
        )
    );

-- سياسة للمستخدمين
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
CREATE POLICY "Users can view users in their organization" ON users
    FOR SELECT USING (
        id = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- سياسة للاشتراكات
DROP POLICY IF EXISTS "Users can view their organization subscription" ON organization_subscriptions;
CREATE POLICY "Users can view their organization subscription" ON organization_subscriptions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- سياسة خاصة بالسوبر أدمين تسمح بالإدارة الكاملة للاشتراكات
DROP POLICY IF EXISTS "Super admin manage organization subscriptions" ON organization_subscriptions;
CREATE POLICY "Super admin manage organization subscriptions" ON organization_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
              AND users.is_super_admin = TRUE
        )
        OR auth.role() = 'service_role'
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
              AND users.is_super_admin = TRUE
        )
        OR auth.role() = 'service_role'
    );

-- 8. منح الصلاحيات للوظائف
GRANT EXECUTE ON FUNCTION validate_tenant_registration_data TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_organization_secure TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_subdomain_availability_secure TO authenticated, anon;
GRANT EXECUTE ON FUNCTION diagnose_tenant_registration_secure TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_registration_data_secure TO authenticated;

-- 9. إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain_lower ON organizations (LOWER(subdomain));
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations (owner_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users (organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_organization_id ON organization_subscriptions (organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_plan_id ON organization_subscriptions (plan_id);

-- 10. تسجيل العمليات (Audit Log)
CREATE TABLE IF NOT EXISTS tenant_registration_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    subdomain TEXT,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهرس للتدقيق
CREATE INDEX IF NOT EXISTS idx_tenant_audit_created_at ON tenant_registration_audit (created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_user_id ON tenant_registration_audit (user_id);

-- وظيفة تسجيل العمليات
CREATE OR REPLACE FUNCTION log_tenant_registration_audit(
    p_user_id UUID,
    p_subdomain TEXT,
    p_action TEXT,
    p_status TEXT,
    p_details JSONB DEFAULT NULL
) RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO tenant_registration_audit (
        user_id,
        subdomain,
        action,
        status,
        details,
        created_at
    ) VALUES (
        p_user_id,
        p_subdomain,
        p_action,
        p_status,
        p_details,
        NOW()
    );
END;
$$;

-- تطبيق تسجيل العمليات في الوظائف الرئيسية
CREATE OR REPLACE FUNCTION create_organization_secure_with_audit(
    p_subdomain TEXT,
    p_name TEXT,
    p_user_id UUID,
    p_user_email TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    result JSONB;
BEGIN
    -- تسجيل بداية العملية
    PERFORM log_tenant_registration_audit(
        p_user_id,
        p_subdomain,
        'create_organization_attempt',
        'started',
        jsonb_build_object('name', p_name, 'email', p_user_email)
    );

    -- تنفيذ العملية
    result := create_organization_secure(p_subdomain, p_name, p_user_id, p_user_email);

    -- تسجيل النتيجة
    PERFORM log_tenant_registration_audit(
        p_user_id,
        p_subdomain,
        'create_organization_result',
        CASE WHEN (result->>'success')::boolean THEN 'success' ELSE 'failed' END,
        result
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_organization_secure_with_audit TO authenticated, anon;

-- 11. وظيفة للتحقق من وجود الجداول المطلوبة
CREATE OR REPLACE FUNCTION check_required_tables_exist()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tables_exist BOOLEAN := true;
BEGIN
    -- التحقق من وجود الجداول المطلوبة
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
        RAISE NOTICE '⚠️ جدول subscription_plans غير موجود';
        tables_exist := false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_subscriptions') THEN
        RAISE NOTICE '⚠️ جدول organization_subscriptions غير موجود';
        tables_exist := false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        RAISE NOTICE '⚠️ جدول organizations غير موجود';
        tables_exist := false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE '⚠️ جدول users غير موجود';
        tables_exist := false;
    END IF;
    
    RETURN tables_exist;
END;
$$;

-- 12. إنشاء خطط الاشتراك الافتراضية إذا لم تكن موجودة
DO $$
BEGIN
    -- التحقق من وجود الجداول أولاً
    IF check_required_tables_exist() THEN
        -- إنشاء خطط الاشتراك إذا كانت الجداول موجودة
        INSERT INTO subscription_plans (
            id, name, code, description, features, monthly_price, yearly_price, 
            trial_period_days, limits, is_active, is_popular, display_order
        ) VALUES 
        (
            gen_random_uuid(),
            'تجريبي',
            'trial',
            'تجربة مجانية كاملة الميزات لمدة 5 أيام',
            '["نقطة بيع واحدة", "حتى 3 مستخدمين", "حتى 100 منتج", "ميزات أساسية"]'::JSONB,
            0, 0, 5,
            '{"max_users": 3, "max_products": 100, "max_pos": 1}'::JSONB,
            true, false, 0
        ),
        (
            gen_random_uuid(),
            'أساسي', 
            'basic',
            'للشركات الصغيرة والمتاجر الفردية',
            '["نقطة بيع واحدة", "حتى 3 مستخدمين", "حتى 100 منتج", "التقارير الأساسية"]'::JSONB,
            3999, 39990, 5,
            '{"max_users": 3, "max_products": 100, "max_pos": 1}'::JSONB,
            true, false, 1
        )
        ON CONFLICT (code) DO NOTHING;
        
        RAISE NOTICE '✅ تم التحقق من خطط الاشتراك الافتراضية';
    ELSE
        RAISE NOTICE '⚠️ لا يمكن إنشاء خطط الاشتراك - بعض الجداول مفقودة';
    END IF;
END;
$$;

-- ======================================================================
-- ملاحظات الأمان والتحديثات:
-- 1. تم تحديث الجداول لتستخدم organization_subscriptions بدلاً من subscriptions
-- 2. إضافة ربط الاشتراك بالمؤسسة عبر subscription_id
-- 3. إنشاء خطط اشتراك افتراضية
-- 4. تحسين وظيفة التشخيص لتتعامل مع الهيكل الجديد
-- 5. جميع الميزات الأمنية محفوظة مع التحديثات
-- 6. سياسات RLS محدثة للجداول الصحيحة
-- 7. فهارس محسنة للأداء
-- ====================================================================== 
