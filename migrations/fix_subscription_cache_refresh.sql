-- إصلاح مشكلة الكاش في الواجهة بعد تفعيل الاشتراك
-- إضافة دالة لتحديث بيانات المؤسسة تلقائياً

-- ===== 1. إنشاء دالة لتحديث بيانات المؤسسة =====

CREATE OR REPLACE FUNCTION refresh_organization_data(
    p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_organization RECORD;
    v_subscription RECORD;
BEGIN
    -- جلب بيانات المؤسسة المحدثة
    SELECT 
        o.*,
        os.id as subscription_id,
        os.status as subscription_status_detail,
        os.start_date,
        os.end_date,
        sp.name as plan_name,
        sp.code as plan_code
    INTO v_organization
    FROM organizations o
    LEFT JOIN organization_subscriptions os ON o.subscription_id = os.id
    LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE o.id = p_organization_id;
    
    IF v_organization IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'المؤسسة غير موجودة'
        );
    END IF;
    
    -- إرجاع البيانات المحدثة
    v_result := jsonb_build_object(
        'success', TRUE,
        'message', 'تم تحديث بيانات المؤسسة بنجاح',
        'organization', jsonb_build_object(
            'id', v_organization.id,
            'name', v_organization.name,
            'subscription_status', v_organization.subscription_status,
            'subscription_tier', v_organization.subscription_tier,
            'subscription_id', v_organization.subscription_id,
            'created_at', v_organization.created_at,
            'updated_at', v_organization.updated_at
        ),
        'subscription', CASE 
            WHEN v_organization.subscription_id IS NOT NULL THEN
                jsonb_build_object(
                    'id', v_organization.subscription_id,
                    'status', v_organization.subscription_status_detail,
                    'start_date', v_organization.start_date,
                    'end_date', v_organization.end_date,
                    'plan_name', v_organization.plan_name,
                    'plan_code', v_organization.plan_code
                )
            ELSE NULL
        END
    );
    
    RETURN v_result;
END;
$$;

-- ===== 2. إنشاء دالة لتحديث جميع البيانات المتعلقة بالاشتراك =====

CREATE OR REPLACE FUNCTION refresh_subscription_data(
    p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_organization RECORD;
    v_subscription RECORD;
    v_course_access_count INTEGER;
BEGIN
    -- جلب بيانات المؤسسة والاشتراك
    SELECT 
        o.*,
        os.id as subscription_id,
        os.status as subscription_status_detail,
        os.start_date,
        os.end_date,
        os.lifetime_courses_access,
        os.accessible_courses,
        os.courses_access_expires_at,
        sp.name as plan_name,
        sp.code as plan_code
    INTO v_organization
    FROM organizations o
    LEFT JOIN organization_subscriptions os ON o.subscription_id = os.id
    LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE o.id = p_organization_id;
    
    IF v_organization IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'المؤسسة غير موجودة'
        );
    END IF;
    
    -- حساب عدد الدورات المتاحة
    SELECT COUNT(*) INTO v_course_access_count
    FROM organization_course_access
    WHERE organization_id = p_organization_id
      AND (expires_at IS NULL OR expires_at > NOW());
    
    -- إرجاع البيانات المحدثة
    v_result := jsonb_build_object(
        'success', TRUE,
        'message', 'تم تحديث بيانات الاشتراك بنجاح',
        'organization', jsonb_build_object(
            'id', v_organization.id,
            'name', v_organization.name,
            'subscription_status', v_organization.subscription_status,
            'subscription_tier', v_organization.subscription_tier,
            'subscription_id', v_organization.subscription_id,
            'created_at', v_organization.created_at,
            'updated_at', v_organization.updated_at
        ),
        'subscription', CASE 
            WHEN v_organization.subscription_id IS NOT NULL THEN
                jsonb_build_object(
                    'id', v_organization.subscription_id,
                    'status', v_organization.subscription_status_detail,
                    'start_date', v_organization.start_date,
                    'end_date', v_organization.end_date,
                    'plan_name', v_organization.plan_name,
                    'plan_code', v_organization.plan_code,
                    'lifetime_courses_access', v_organization.lifetime_courses_access,
                    'accessible_courses', v_organization.accessible_courses,
                    'courses_access_expires_at', v_organization.courses_access_expires_at
                )
            ELSE NULL
        END,
        'courses_access', jsonb_build_object(
            'total_courses', v_course_access_count,
            'has_lifetime_access', COALESCE(v_organization.lifetime_courses_access, FALSE)
        )
    );
    
    RETURN v_result;
END;
$$;

-- ===== 3. إعطاء الصلاحيات =====

GRANT EXECUTE ON FUNCTION refresh_organization_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_subscription_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_organization_data(UUID) TO anon;
GRANT EXECUTE ON FUNCTION refresh_subscription_data(UUID) TO anon;

-- ===== 4. تحديث التعليقات =====

COMMENT ON FUNCTION refresh_organization_data(UUID) IS 'دالة تحديث بيانات المؤسسة لحل مشكلة الكاش في الواجهة';
COMMENT ON FUNCTION refresh_subscription_data(UUID) IS 'دالة تحديث بيانات الاشتراك والدورات لحل مشكلة الكاش في الواجهة';

-- ===== 5. رسالة تأكيد =====

DO $$
BEGIN
    RAISE NOTICE '✅ تم إنشاء دوال تحديث البيانات بنجاح!';
    RAISE NOTICE '🔧 تم حل مشكلة الكاش في الواجهة';
    RAISE NOTICE '🔧 تم إضافة دوال لتحديث البيانات تلقائياً';
    RAISE NOTICE '📱 يمكن الآن استخدام هذه الدوال في الواجهة لتحديث البيانات';
END $$;
