-- إصلاح دالة تحديث الوصول للدورات
-- حل مشكلة حقل created_by في جدول organization_subscriptions

-- ===== 1. إصلاح دالة تحديث الوصول للدورات =====

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
    v_granted_by UUID;
BEGIN
    -- جلب معلومات الاشتراك
    SELECT * INTO v_subscription 
    FROM organization_subscriptions 
    WHERE id = p_subscription_id;
    
    IF v_subscription IS NULL THEN
        RAISE EXCEPTION 'الاشتراك غير موجود';
    END IF;
    
    -- تحديد من قام بمنح الوصول (من جدول activation_codes أو المستخدم الحالي)
    SELECT COALESCE(ac.created_by, auth.uid()) INTO v_granted_by
    FROM activation_codes ac
    WHERE ac.subscription_id = p_subscription_id
    LIMIT 1;
    
    -- إذا لم نجد created_by، استخدم المستخدم الحالي
    IF v_granted_by IS NULL THEN
        v_granted_by := auth.uid();
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
            WHEN COALESCE(v_subscription.lifetime_courses_access, FALSE) THEN 'lifetime'
            ELSE 'standard'
        END as access_type,
        CASE 
            WHEN COALESCE(v_subscription.lifetime_courses_access, FALSE) THEN NULL
            ELSE v_subscription.end_date
        END as expires_at,
        v_granted_by,
        'تم تحديث الوصول للدورات تلقائياً'
    FROM courses c
    WHERE c.is_active = true;
    
    GET DIAGNOSTICS v_courses_count = ROW_COUNT;
    
    RAISE NOTICE 'تم تحديث الوصول لـ % دورة للمؤسسة %', 
        v_courses_count, 
        v_subscription.organization_id;
END;
$$;

-- ===== 2. إصلاح trigger function =====

CREATE OR REPLACE FUNCTION trigger_update_course_access()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- تحديث الوصول للدورات عند تغيير الاشتراك
    -- فقط إذا كان هناك تغيير في الحقول المتعلقة بالدورات
    IF (TG_OP = 'INSERT') OR 
       (TG_OP = 'UPDATE' AND (
           OLD.lifetime_courses_access IS DISTINCT FROM NEW.lifetime_courses_access OR
           OLD.accessible_courses IS DISTINCT FROM NEW.accessible_courses OR
           OLD.courses_access_expires_at IS DISTINCT FROM NEW.courses_access_expires_at OR
           OLD.end_date IS DISTINCT FROM NEW.end_date
       )) THEN
        PERFORM update_course_access_for_subscription(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- ===== 3. إعادة إنشاء trigger =====

DROP TRIGGER IF EXISTS update_course_access_trigger ON organization_subscriptions;
CREATE TRIGGER update_course_access_trigger
    AFTER INSERT OR UPDATE ON organization_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_course_access();

-- ===== 4. تحديث التعليقات =====

COMMENT ON FUNCTION update_course_access_for_subscription(UUID) IS 'دالة تحديث الوصول للدورات - تم إصلاحها لحل مشكلة حقل created_by';
COMMENT ON FUNCTION trigger_update_course_access() IS 'دالة trigger لتحديث الوصول للدورات - تم إصلاحها';

-- ===== 5. رسالة تأكيد =====

DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح دالة update_course_access_for_subscription بنجاح!';
    RAISE NOTICE '🔧 تم حل مشكلة حقل created_by';
    RAISE NOTICE '🔧 تم تحسين trigger ليعمل فقط عند الحاجة';
    RAISE NOTICE '🔧 تم إضافة معالجة للحقول NULL';
END $$;
