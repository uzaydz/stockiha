-- ===== حذف اشتراك أي عميل =====
-- قم بتغيير البريد الإلكتروني في المتغير أدناه

-- ⚠️ تحديد البريد الإلكتروني للعميل هنا ⚠️
-- غير البريد الإلكتروني في السطر أدناه

DO $$
DECLARE
    v_organization_id UUID;
    v_subscription_id UUID;
    v_customer_email TEXT := 'uzayduz330i30@gmail.com'; -- ⚠️ غير البريد الإلكتروني هنا
    v_org_name TEXT;
    v_plan_name TEXT;
BEGIN
    -- التحقق من وجود المتغير
    IF v_customer_email IS NULL OR v_customer_email = '' THEN
        RAISE EXCEPTION 'يجب تحديد البريد الإلكتروني للعميل';
    END IF;
    
    RAISE NOTICE '🔍 البحث عن العميل: %', v_customer_email;
    
    -- جلب معرف المؤسسة واسمها
    SELECT u.organization_id, o.name 
    INTO v_organization_id, v_org_name
    FROM users u
    JOIN organizations o ON u.organization_id = o.id
    WHERE u.email = v_customer_email;
    
    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'العميل % غير موجود في النظام', v_customer_email;
    END IF;
    
    RAISE NOTICE '📋 المؤسسة: % (ID: %)', v_org_name, v_organization_id;
    
    -- جلب معرف الاشتراك الحالي واسم الخطة
    SELECT o.subscription_id, sp.name
    INTO v_subscription_id, v_plan_name
    FROM organizations o
    LEFT JOIN organization_subscriptions os ON o.subscription_id = os.id
    LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE o.id = v_organization_id;
    
    IF v_subscription_id IS NULL THEN
        RAISE NOTICE '⚠️ العميل ليس لديه اشتراك نشط حالياً';
        RETURN;
    END IF;
    
    RAISE NOTICE '📦 الاشتراك الحالي: % (ID: %)', v_plan_name, v_subscription_id;
    
    -- الخطوة 1: إلغاء الاشتراك الحالي
    UPDATE organization_subscriptions 
    SET 
        status = 'canceled',
        updated_at = NOW()
    WHERE id = v_subscription_id;
    
    RAISE NOTICE '❌ تم إلغاء الاشتراك';
    
    -- الخطوة 2: إعادة تعيين المؤسسة للحالة المجانية
    UPDATE organizations
    SET 
        subscription_id = NULL,
        subscription_tier = 'free',
        subscription_status = 'expired',
        updated_at = NOW()
    WHERE id = v_organization_id;
    
    RAISE NOTICE '🆓 تم تحويل المؤسسة للحالة المجانية';
    
    -- الخطوة 3: إضافة سجل في تاريخ الاشتراكات
    INSERT INTO subscription_history (
        organization_id,
        plan_id,
        action,
        from_status,
        to_status,
        notes,
        created_at
    ) 
    SELECT 
        v_organization_id,
        os.plan_id,
        'canceled',
        'active',
        'canceled',
        format('تم إلغاء الاشتراك يدوياً للعميل: %s (المؤسسة: %s)', v_customer_email, v_org_name),
        NOW()
    FROM organization_subscriptions os
    WHERE os.id = v_subscription_id;
    
    RAISE NOTICE '📝 تم إضافة سجل في تاريخ الاشتراكات';
    
    -- الخطوة 4: إعادة تعيين أكواد التفعيل المرتبطة (اختياري)
    UPDATE activation_codes 
    SET 
        organization_id = NULL,
        subscription_id = NULL,
        status = 'active',
        used_at = NULL
    WHERE organization_id = v_organization_id 
      AND status = 'used';
    
    GET DIAGNOSTICS v_subscription_id = ROW_COUNT;
    
    IF v_subscription_id > 0 THEN
        RAISE NOTICE '🔄 تم إعادة تعيين % كود تفعيل', v_subscription_id;
    END IF;
    
    RAISE NOTICE '✅ تم حذف/إلغاء اشتراك العميل % بنجاح', v_customer_email;
    RAISE NOTICE '🎯 يمكن الآن تفعيل كود جديد للعميل';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'خطأ أثناء حذف الاشتراك: %', SQLERRM;
END;
$$;

-- التحقق من النتيجة النهائية
SELECT 
    '✅ النتيجة النهائية' as status,
    o.id as organization_id,
    o.name as organization_name,
    o.subscription_status,
    o.subscription_tier,
    o.subscription_id,
    u.email,
    CASE 
        WHEN o.subscription_id IS NULL THEN '🆓 جاهز لتفعيل كود جديد'
        ELSE '⚠️ لا يزال لديه اشتراك'
    END as ready_for_activation
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.email = v_customer_email;

-- عرض آخر الاشتراكات للتحقق
SELECT 
    '📊 سجل الاشتراكات' as info,
    os.id,
    os.status,
    os.start_date,
    os.end_date,
    sp.name as plan_name,
    os.updated_at
FROM organization_subscriptions os
JOIN subscription_plans sp ON os.plan_id = sp.id
WHERE os.organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE email = v_customer_email
)
ORDER BY os.updated_at DESC
LIMIT 5; 