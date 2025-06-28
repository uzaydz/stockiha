-- ===== حذف اشتراك العميل uzayduz330i30@gmail.com =====
-- هذا الملف سيحذف الاشتراك الحالي ويعيد تعيين المؤسسة للحالة المجانية

-- الخطوة 1: الحصول على معرف المؤسسة للعميل
DO $$
DECLARE
    v_organization_id UUID;
    v_subscription_id UUID;
    v_customer_email TEXT := 'uzayduz330i30@gmail.com';
BEGIN
    -- جلب معرف المؤسسة
    SELECT organization_id INTO v_organization_id
    FROM users 
    WHERE email = v_customer_email;
    
    IF v_organization_id IS NULL THEN
        RAISE NOTICE 'العميل % غير موجود', v_customer_email;
        RETURN;
    END IF;
    
    -- جلب معرف الاشتراك الحالي
    SELECT subscription_id INTO v_subscription_id
    FROM organizations 
    WHERE id = v_organization_id;
    
    RAISE NOTICE 'معرف المؤسسة: %', v_organization_id;
    RAISE NOTICE 'معرف الاشتراك: %', v_subscription_id;
    
    -- الخطوة 2: تحديث حالة الاشتراك إلى منتهي بدلاً من حذفه
    IF v_subscription_id IS NOT NULL THEN
        UPDATE organization_subscriptions 
        SET 
            status = 'canceled',
            updated_at = NOW()
        WHERE id = v_subscription_id;
        
        RAISE NOTICE 'تم إلغاء الاشتراك: %', v_subscription_id;
    END IF;
    
    -- الخطوة 3: إعادة تعيين المؤسسة للحالة المجانية
    UPDATE organizations
    SET 
        subscription_id = NULL,
        subscription_tier = 'free',
        subscription_status = 'expired',
        updated_at = NOW()
    WHERE id = v_organization_id;
    
    -- الخطوة 4: إضافة سجل في تاريخ الاشتراكات
    IF v_subscription_id IS NOT NULL THEN
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
            'تم إلغاء الاشتراك يدوياً لإعادة التفعيل للعميل: ' || v_customer_email,
            NOW()
        FROM organization_subscriptions os
        WHERE os.id = v_subscription_id;
    END IF;
    
    -- الخطوة 5: البحث عن أكواد التفعيل المرتبطة وإعادة تعيينها (اختياري)
    UPDATE activation_codes 
    SET 
        organization_id = NULL,
        subscription_id = NULL,
        status = 'active',
        used_at = NULL
    WHERE organization_id = v_organization_id 
      AND status = 'used';
    
    RAISE NOTICE '✅ تم حذف/إلغاء اشتراك العميل % بنجاح', v_customer_email;
    RAISE NOTICE '📧 المؤسسة أصبحت في الحالة المجانية ويمكن تفعيل كود جديد';
    
END;
$$;

-- التحقق من النتيجة
SELECT 
    'بعد الحذف' as status,
    o.id as organization_id,
    o.name as organization_name,
    o.subscription_status,
    o.subscription_tier,
    o.subscription_id,
    u.email
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'uzayduz330i30@gmail.com';

-- عرض الاشتراكات المتاحة للتحقق
SELECT 
    'الاشتراكات المرتبطة' as info,
    os.id,
    os.status,
    os.start_date,
    os.end_date,
    sp.name as plan_name
FROM organization_subscriptions os
JOIN subscription_plans sp ON os.plan_id = sp.id
WHERE os.organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE email = 'uzayduz330i30@gmail.com'
)
ORDER BY os.created_at DESC; 