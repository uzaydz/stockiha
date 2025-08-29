-- إصلاح مشكلة الوصول للدورات
-- التاريخ: 2025-01-27
-- المشكلة: جدول organization_course_access فارغ، الدورات لا تظهر

BEGIN;

-- ===== 1. منح الوصول للدورات لجميع المؤسسات النشطة =====

-- إنشاء سجلات الوصول للدورات لجميع المؤسسات النشطة
INSERT INTO organization_course_access (
    organization_id,
    course_id,
    access_type,
    expires_at,
    granted_by,
    notes
)
SELECT 
    os.organization_id,
    c.id,
    CASE 
        WHEN os.lifetime_courses_access THEN 'lifetime'
        ELSE 'standard'
    END as access_type,
    CASE 
        WHEN os.lifetime_courses_access THEN NULL -- مدى الحياة
        ELSE os.end_date -- تاريخ انتهاء الاشتراك
    END as expires_at,
    (SELECT id FROM users WHERE is_super_admin = true LIMIT 1) as granted_by,
    CASE 
        WHEN os.lifetime_courses_access THEN 'تم منح الوصول للدورات مدى الحياة تلقائياً'
        ELSE 'تم منح الوصول للدورات حسب مدة الاشتراك تلقائياً'
    END as notes
FROM organization_subscriptions os
CROSS JOIN courses c
WHERE os.status = 'active'
  AND c.is_active = true
  AND os.end_date >= NOW() -- اشتراكات لم تنتهي صلاحيتها
ON CONFLICT (organization_id, course_id) 
DO UPDATE SET
    access_type = EXCLUDED.access_type,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW(),
    notes = EXCLUDED.notes;

-- ===== 2. منح الوصول للدورات للمؤسسات في فترة التجربة =====

-- إنشاء سجلات الوصول للدورات للمؤسسات في فترة التجربة
INSERT INTO organization_course_access (
    organization_id,
    course_id,
    access_type,
    expires_at,
    granted_by,
    notes
)
SELECT 
    o.id,
    c.id,
    'standard' as access_type,
    o.created_at + INTERVAL '30 days' as expires_at, -- 30 يوم تجربة
    (SELECT id FROM users WHERE is_super_admin = true LIMIT 1) as granted_by,
    'تم منح الوصول للدورات خلال فترة التجربة (30 يوم)'
FROM organizations o
CROSS JOIN courses c
WHERE o.subscription_status = 'trial'
  AND c.is_active = true
  AND o.created_at + INTERVAL '30 days' >= NOW() -- لم تنتهي فترة التجربة
ON CONFLICT (organization_id, course_id) 
DO UPDATE SET
    access_type = EXCLUDED.access_type,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW(),
    notes = EXCLUDED.notes;

-- ===== 3. تحديث اشتراكات المؤسسات لتفعيل الوصول للدورات =====

-- تحديث جميع الاشتراكات النشطة لتفعيل الوصول للدورات
UPDATE organization_subscriptions 
SET 
    lifetime_courses_access = false, -- افتراضي: وصول عادي
    accessible_courses = '[]'::jsonb, -- جميع الدورات
    courses_access_expires_at = end_date -- نفس تاريخ انتهاء الاشتراك
WHERE status = 'active';

-- ===== 4. إنشاء دالة لتحديث الوصول للدورات تلقائياً =====

CREATE OR REPLACE FUNCTION update_course_access_for_subscription(
    p_subscription_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subscription organization_subscriptions;
    v_courses_count INTEGER;
BEGIN
    -- جلب معلومات الاشتراك
    SELECT * INTO v_subscription 
    FROM organization_subscriptions 
    WHERE id = p_subscription_id;
    
    IF v_subscription IS NULL THEN
        RAISE EXCEPTION 'الاشتراك غير موجود';
    END IF;
    
    -- حذف الوصول القديم
    DELETE FROM organization_course_access 
    WHERE organization_id = v_subscription.organization_id;
    
    -- إنشاء الوصول الجديد
    INSERT INTO organization_course_access (
        organization_id,
        course_id,
        access_type,
        expires_at,
        granted_by,
        notes
    )
    SELECT 
        v_subscription.organization_id,
        c.id,
        CASE 
            WHEN v_subscription.lifetime_courses_access THEN 'lifetime'
            ELSE 'standard'
        END as access_type,
        CASE 
            WHEN v_subscription.lifetime_courses_access THEN NULL
            ELSE v_subscription.end_date
        END as expires_at,
        v_subscription.created_by,
        'تم تحديث الوصول للدورات تلقائياً'
    FROM courses c
    WHERE c.is_active = true;
    
    GET DIAGNOSTICS v_courses_count = ROW_COUNT;
    
    RAISE NOTICE 'تم تحديث الوصول لـ % دورة للمؤسسة %', 
        v_courses_count, 
        v_subscription.organization_id;
END;
$$;

-- ===== 5. إنشاء trigger لتحديث الوصول تلقائياً =====

-- إنشاء trigger function
CREATE OR REPLACE FUNCTION trigger_update_course_access()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- تحديث الوصول للدورات عند تغيير الاشتراك
    PERFORM update_course_access_for_subscription(NEW.id);
    RETURN NEW;
END;
$$;

-- إنشاء trigger
DROP TRIGGER IF EXISTS update_course_access_trigger ON organization_subscriptions;
CREATE TRIGGER update_course_access_trigger
    AFTER INSERT OR UPDATE ON organization_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_course_access();

-- ===== 6. إنشاء دالة لفحص الوصول للدورات =====

CREATE OR REPLACE FUNCTION check_organization_courses_access(
    p_organization_id UUID
)
RETURNS TABLE (
    course_id UUID,
    course_title TEXT,
    access_type TEXT,
    is_accessible BOOLEAN,
    expires_at TIMESTAMPTZ,
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
        COALESCE(oca.access_type, 'none') as access_type,
        CASE 
            WHEN oca.expires_at IS NULL THEN TRUE -- مدى الحياة
            WHEN oca.expires_at > NOW() THEN TRUE -- لم تنتهي الصلاحية
            ELSE FALSE -- انتهت الصلاحية
        END as is_accessible,
        oca.expires_at,
        CASE 
            WHEN oca.expires_at IS NULL THEN TRUE
            ELSE FALSE
        END as is_lifetime
    FROM courses c
    LEFT JOIN organization_course_access oca ON 
        c.id = oca.course_id AND 
        oca.organization_id = p_organization_id
    WHERE c.is_active = true
    ORDER BY c.order_index, c.title;
END;
$$;

-- ===== 7. إعطاء الصلاحيات =====

GRANT EXECUTE ON FUNCTION update_course_access_for_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_organization_courses_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_course_access_for_subscription(UUID) TO anon;
GRANT EXECUTE ON FUNCTION check_organization_courses_access(UUID) TO anon;

-- ===== 8. التحقق من النتائج =====

DO $$
DECLARE
    v_total_access INTEGER;
    v_active_subscriptions INTEGER;
    v_trial_organizations INTEGER;
BEGIN
    -- حساب إجمالي سجلات الوصول
    SELECT COUNT(*) INTO v_total_access FROM organization_course_access;
    
    -- حساب الاشتراكات النشطة
    SELECT COUNT(*) INTO v_active_subscriptions 
    FROM organization_subscriptions 
    WHERE status = 'active';
    
    -- حساب المؤسسات في فترة التجربة
    SELECT COUNT(*) INTO v_trial_organizations 
    FROM organizations 
    WHERE subscription_status = 'trial';
    
    RAISE NOTICE '=== تقرير إصلاح الوصول للدورات ===';
    RAISE NOTICE 'إجمالي سجلات الوصول: %', v_total_access;
    RAISE NOTICE 'الاشتراكات النشطة: %', v_active_subscriptions;
    RAISE NOTICE 'المؤسسات في فترة التجربة: %', v_trial_organizations;
    RAISE NOTICE '=== انتهى الإصلاح بنجاح ===';
END $$;

COMMIT;
