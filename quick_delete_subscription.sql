-- ===== حذف سريع لاشتراك العميل uzayduz330i30@gmail.com =====

-- الخطوة 1: إلغاء الاشتراك الحالي
UPDATE organization_subscriptions 
SET status = 'expired'
WHERE id = 'e22c3c34-f707-4ed4-86d4-cfb6b94657a8';

-- الخطوة 2: إعادة تعيين المؤسسة للحالة المجانية
UPDATE organizations
SET 
    subscription_id = NULL,
    subscription_tier = 'free',
    subscription_status = 'expired'
WHERE id = '6c2ed605-0880-4e40-af50-78f80f7283bb';

-- التحقق من النتيجة
SELECT 
    'النتيجة' as status,
    o.id as organization_id,
    o.name as organization_name,
    o.subscription_status,
    o.subscription_tier,
    o.subscription_id,
    u.email
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'uzayduz330i30@gmail.com';

-- رسالة نجاح
SELECT '✅ تم حذف الاشتراك بنجاح - يمكن الآن تفعيل كود جديد' as message; 