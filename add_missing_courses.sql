-- إضافة الدورات المفقودة في قاعدة البيانات
-- التاريخ: 2025-01-27
-- الغرض: إضافة دورات traditional-business و service-providers
-- ملاحظة: الدورات متاحة فقط للمشتركين النشطين، وليس للمؤسسات في فترة التجربة

BEGIN;

-- ===== 1. إضافة دورة التجار التقليديين =====
INSERT INTO courses (
    title,
    slug,
    description,
    icon,
    color,
    order_index,
    is_active
) VALUES (
    'دورة التجار التقليديين: من المحل إلى المنصة الرقمية مع سطوكيها',
    'traditional-business',
    'دورة شاملة مصممة خصيصاً للتجار التقليديين لتعلم كيفية استخدام منصة سطوكيها لإدارة متاجرهم التقليدية وتحويلها إلى تجارة إلكترونية متكاملة مع ربط نقطة البيع والمخزون والمحاسبة',
    '🏪',
    'bg-orange-500',
    5,
    true
) ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    order_index = EXCLUDED.order_index,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ===== 2. إضافة دورة مقدمي الخدمات والتصليحات =====
INSERT INTO courses (
    title,
    slug,
    description,
    icon,
    color,
    order_index,
    is_active
) VALUES (
    'دورة مقدمي الخدمات والتصليحات مع سطوكيها',
    'service-providers',
    'دورة شاملة لتعلم كيفية إدارة مراكز الخدمات والتصليحات باستخدام نظام سطوكيها المتطور مع تتبع الطلبيات، إدارة الطوابير، وإشعارات SMS التلقائية للعملاء',
    '🔧',
    'bg-cyan-500',
    6,
    true
) ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    order_index = EXCLUDED.order_index,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ===== 3. منح الوصول للدورات الجديدة للمشتركين النشطين فقط =====

-- منح الوصول لدورة التجار التقليديين للمشتركين النشطين
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
  AND c.slug = 'traditional-business'
  AND os.end_date >= NOW() -- اشتراكات لم تنتهي صلاحيتها
  AND os.billing_cycle != 'trial' -- استثناء الاشتراكات التجريبية
ON CONFLICT (organization_id, course_id) 
DO UPDATE SET
    access_type = EXCLUDED.access_type,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW(),
    notes = EXCLUDED.notes;

-- منح الوصول لدورة مقدمي الخدمات للمشتركين النشطين
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
  AND c.slug = 'service-providers'
  AND os.end_date >= NOW() -- اشتراكات لم تنتهي صلاحيتها
  AND os.billing_cycle != 'trial' -- استثناء الاشتراكات التجريبية
ON CONFLICT (organization_id, course_id) 
DO UPDATE SET
    access_type = EXCLUDED.access_type,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW(),
    notes = EXCLUDED.notes;

-- ===== 4. التحقق من النتائج =====

DO $$
DECLARE
    v_traditional_course_id UUID;
    v_service_providers_course_id UUID;
    v_traditional_access_count INTEGER;
    v_service_providers_access_count INTEGER;
    v_total_organizations INTEGER;
    v_active_subscriptions INTEGER;
BEGIN
    -- الحصول على معرفات الدورات الجديدة
    SELECT id INTO v_traditional_course_id FROM courses WHERE slug = 'traditional-business';
    SELECT id INTO v_service_providers_course_id FROM courses WHERE slug = 'service-providers';
    
    -- حساب عدد المؤسسات الإجمالي
    SELECT COUNT(*) INTO v_total_organizations FROM organizations WHERE is_active = true;
    
    -- حساب عدد الاشتراكات النشطة (غير تجريبية)
    SELECT COUNT(*) INTO v_active_subscriptions 
    FROM organization_subscriptions 
    WHERE status = 'active' 
      AND billing_cycle != 'trial'
      AND end_date >= NOW();
    
    -- حساب عدد سجلات الوصول
    SELECT COUNT(*) INTO v_traditional_access_count 
    FROM organization_course_access 
    WHERE course_id = v_traditional_course_id;
    
    SELECT COUNT(*) INTO v_service_providers_access_count 
    FROM organization_course_access 
    WHERE course_id = v_service_providers_course_id;
    
    RAISE NOTICE '=== تقرير إضافة الدورات المفقودة ===';
    RAISE NOTICE 'إجمالي المؤسسات: %', v_total_organizations;
    RAISE NOTICE 'الاشتراكات النشطة (غير تجريبية): %', v_active_subscriptions;
    
    RAISE NOTICE 'دورة التجار التقليديين: % (معرف: %)', 
        CASE WHEN v_traditional_course_id IS NOT NULL THEN 'تم إنشاؤها بنجاح' ELSE 'فشل في الإنشاء' END,
        v_traditional_course_id;
    RAISE NOTICE 'عدد سجلات الوصول لدورة التجار التقليديين: %', v_traditional_access_count;
    
    RAISE NOTICE 'دورة مقدمي الخدمات: % (معرف: %)', 
        CASE WHEN v_service_providers_course_id IS NOT NULL THEN 'تم إنشاؤها بنجاح' ELSE 'فشل في الإنشاء' END,
        v_service_providers_course_id;
    RAISE NOTICE 'عدد سجلات الوصول لدورة مقدمي الخدمات: %', v_service_providers_access_count;
    
    RAISE NOTICE '=== ملاحظة مهمة ===';
    RAISE NOTICE 'الدورات متاحة فقط للمشتركين النشطين (غير التجريبيين)';
    RAISE NOTICE 'المؤسسات في فترة التجربة لا يمكنها الوصول للدورات';
    RAISE NOTICE '=== انتهى الإضافة بنجاح ===';
END $$;

COMMIT;
