-- إنشاء جداول أكواد التفعيل
-- تاريخ: 07-07-2023

-- جدول دفعات أكواد التفعيل
CREATE TABLE IF NOT EXISTS public.activation_code_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    CONSTRAINT activation_code_batches_count_positive CHECK (count >= 0)
);

-- إضافة فهارس على جدول دفعات أكواد التفعيل
CREATE INDEX IF NOT EXISTS idx_activation_code_batches_plan_id ON public.activation_code_batches(plan_id);
CREATE INDEX IF NOT EXISTS idx_activation_code_batches_created_at ON public.activation_code_batches(created_at);

-- جدول أكواد التفعيل
CREATE TABLE IF NOT EXISTS public.activation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    batch_id UUID REFERENCES public.activation_code_batches(id),
    organization_id UUID REFERENCES public.organizations(id),
    subscription_id UUID REFERENCES public.subscriptions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES public.users(id)
);

-- إضافة فهارس على جدول أكواد التفعيل
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON public.activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_status ON public.activation_codes(status);
CREATE INDEX IF NOT EXISTS idx_activation_codes_plan_id ON public.activation_codes(plan_id);
CREATE INDEX IF NOT EXISTS idx_activation_codes_batch_id ON public.activation_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_activation_codes_organization_id ON public.activation_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_activation_codes_created_at ON public.activation_codes(created_at);
CREATE INDEX IF NOT EXISTS idx_activation_codes_expires_at ON public.activation_codes(expires_at);

-- إنشاء دالة لإنشاء مجموعة من أكواد التفعيل
CREATE OR REPLACE FUNCTION public.create_activation_codes(
    p_batch_id UUID,
    p_plan_id UUID,
    p_count INTEGER,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_code VARCHAR(20);
    v_collision_count INTEGER := 0;
    v_max_attempts INTEGER := 3;
    v_created_count INTEGER := 0;
BEGIN
    -- التحقق من صلاحية المعاملات
    IF p_count <= 0 THEN
        RAISE EXCEPTION 'عدد الأكواد يجب أن يكون أكبر من 0';
    END IF;
    
    -- تحديث عدد الأكواد في جدول الدفعات
    UPDATE public.activation_code_batches
    SET count = p_count
    WHERE id = p_batch_id;
    
    -- إنشاء الأكواد واحدًا تلو الآخر
    WHILE v_created_count < p_count LOOP
        -- إنشاء كود عشوائي بتنسيق XXXX-XXXX-XXXX-XXXX
        -- استخدام الأحرف والأرقام فقط مع استبعاد الأحرف المتشابهة
        v_code := 
            (SELECT UPPER(
                SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4) || '-' ||
                SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4) || '-' ||
                SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4) || '-' ||
                SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)
            ));
            
        -- استبدال الأحرف المتشابهة بأحرف أخرى
        v_code := REPLACE(v_code, '0', SUBSTRING('23456789' FROM (FLOOR(RANDOM() * 8) + 1)::INT FOR 1));
        v_code := REPLACE(v_code, 'O', SUBSTRING('ABCDEFGHJKLMNPQRSTUVWXYZ' FROM (FLOOR(RANDOM() * 24) + 1)::INT FOR 1));
        v_code := REPLACE(v_code, 'I', SUBSTRING('ABCDEFGHJKLMNPQRSTUVWXYZ' FROM (FLOOR(RANDOM() * 24) + 1)::INT FOR 1));
        v_code := REPLACE(v_code, 'L', SUBSTRING('ABCDEFGHJKLMNPQRSTUVWXYZ' FROM (FLOOR(RANDOM() * 24) + 1)::INT FOR 1));
        
        -- محاولة إضافة الكود، وتجاهل الكود في حالة التكرار
        BEGIN
            INSERT INTO public.activation_codes (
                code,
                status,
                plan_id,
                batch_id,
                expires_at,
                notes,
                created_by
            ) VALUES (
                v_code,
                'active',
                p_plan_id,
                p_batch_id,
                p_expires_at,
                p_notes,
                p_created_by
            );
            
            v_created_count := v_created_count + 1;
            v_collision_count := 0; -- إعادة ضبط عداد التصادمات عند نجاح الإضافة
            
        EXCEPTION WHEN unique_violation THEN
            -- في حالة وجود تكرار، زيادة عداد التصادمات
            v_collision_count := v_collision_count + 1;
            
            -- التوقف إذا كان هناك الكثير من التصادمات المتتالية
            IF v_collision_count > v_max_attempts THEN
                RAISE WARNING 'تم تجاوز الحد الأقصى من المحاولات المتتالية للتصادم. تم إنشاء % كود من أصل %', v_created_count, p_count;
                EXIT;
            END IF;
        END;
    END LOOP;
    
    -- التحقق من إنشاء العدد المطلوب من الأكواد
    IF v_created_count < p_count THEN
        RAISE WARNING 'تم إنشاء % كود فقط من أصل % المطلوبة', v_created_count, p_count;
    ELSE
        RAISE NOTICE 'تم إنشاء % كود بنجاح', v_created_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على إحصائيات دفعة أكواد التفعيل
CREATE OR REPLACE FUNCTION public.get_activation_code_batch_statistics(
    p_batch_id UUID
) RETURNS TABLE (
    total_codes BIGINT,
    active_codes BIGINT,
    used_codes BIGINT,
    expired_codes BIGINT,
    revoked_codes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) AS total_codes,
        COUNT(*) FILTER (WHERE status = 'active') AS active_codes,
        COUNT(*) FILTER (WHERE status = 'used') AS used_codes,
        COUNT(*) FILTER (WHERE status = 'expired') AS expired_codes,
        COUNT(*) FILTER (WHERE status = 'revoked') AS revoked_codes
    FROM
        public.activation_codes
    WHERE
        batch_id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- دالة لتفعيل اشتراك باستخدام كود التفعيل
CREATE OR REPLACE FUNCTION public.activate_subscription(
    p_activation_code VARCHAR(20),
    p_organization_id UUID
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    subscription_id UUID,
    subscription_end_date TIMESTAMPTZ
) AS $$
DECLARE
    v_activation_code public.activation_codes%ROWTYPE;
    v_plan public.subscription_plans%ROWTYPE;
    v_subscription_id UUID;
    v_end_date TIMESTAMPTZ;
    v_organization public.organizations%ROWTYPE;
BEGIN
    -- التحقق من وجود المؤسسة
    SELECT * INTO v_organization FROM public.organizations WHERE id = p_organization_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            'المؤسسة غير موجودة',
            NULL::UUID,
            NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- البحث عن كود التفعيل
    SELECT * INTO v_activation_code FROM public.activation_codes WHERE code = p_activation_code;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            'كود التفعيل غير موجود',
            NULL::UUID,
            NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- التحقق من حالة كود التفعيل
    IF v_activation_code.status <> 'active' THEN
        RETURN QUERY SELECT 
            FALSE,
            CASE 
                WHEN v_activation_code.status = 'used' THEN 'كود التفعيل مستخدم بالفعل'
                WHEN v_activation_code.status = 'expired' THEN 'كود التفعيل منتهي الصلاحية'
                WHEN v_activation_code.status = 'revoked' THEN 'كود التفعيل ملغي'
                ELSE 'كود التفعيل غير نشط'
            END,
            NULL::UUID,
            NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- التحقق من تاريخ انتهاء صلاحية الكود
    IF v_activation_code.expires_at IS NOT NULL AND v_activation_code.expires_at < NOW() THEN
        -- تحديث حالة الكود إلى "منتهي"
        UPDATE public.activation_codes
        SET status = 'expired'
        WHERE id = v_activation_code.id;
        
        RETURN QUERY SELECT 
            FALSE,
            'كود التفعيل منتهي الصلاحية',
            NULL::UUID,
            NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- الحصول على معلومات خطة الاشتراك
    SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_activation_code.plan_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            'خطة الاشتراك غير موجودة',
            NULL::UUID,
            NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- حساب تاريخ انتهاء الاشتراك بناءً على فترة الفوترة
    v_end_date := NOW() + 
        CASE 
            WHEN v_plan.billing_period = 'monthly' THEN INTERVAL '1 month'
            WHEN v_plan.billing_period = 'quarterly' THEN INTERVAL '3 months'
            WHEN v_plan.billing_period = 'semi_annual' THEN INTERVAL '6 months'
            WHEN v_plan.billing_period = 'annual' THEN INTERVAL '1 year'
            ELSE INTERVAL '0'
        END;
    
    -- إنشاء اشتراك جديد
    INSERT INTO public.subscriptions (
        organization_id,
        plan_id,
        status,
        start_date,
        end_date,
        activation_code_id,
        payment_status
    ) VALUES (
        p_organization_id,
        v_plan.id,
        'active',
        NOW(),
        v_end_date,
        v_activation_code.id,
        'paid'
    ) RETURNING id INTO v_subscription_id;
    
    -- تحديث كود التفعيل
    UPDATE public.activation_codes
    SET 
        status = 'used',
        organization_id = p_organization_id,
        subscription_id = v_subscription_id,
        used_at = NOW()
    WHERE id = v_activation_code.id;
    
    -- إرجاع النتيجة الناجحة
    RETURN QUERY SELECT 
        TRUE,
        'تم تفعيل الاشتراك بنجاح: ' || v_plan.name,
        v_subscription_id,
        v_end_date;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لتشغيل مرة واحدة في اليوم لتحديث حالة الأكواد المنتهية
CREATE OR REPLACE FUNCTION public.expire_activation_codes() RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.activation_codes
    SET status = 'expired'
    WHERE 
        status = 'active' AND 
        expires_at IS NOT NULL AND 
        expires_at < NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- تشغيل وظيفة انتهاء صلاحية الأكواد المنتهية
SELECT public.expire_activation_codes(); 