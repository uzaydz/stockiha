-- ==============================================
-- إصلاح تضارب دوال إنشاء المكونات الافتراضية للمتجر
-- تاريخ الإنشاء: 2025-01-15
-- الهدف: حل مشكلة إنشاء 3 مكونات بدلاً من 6 عند إنشاء مؤسسات جديدة
-- ==============================================

BEGIN;

-- ==============================================
-- 1. حذف الـ triggers المتضاربة
-- ==============================================

-- حذف trigger_organization_store_init الذي يسبب التضارب
DROP TRIGGER IF EXISTS trigger_organization_store_init ON organizations;

-- حذف الدالة المسببة للمشكلة
DROP FUNCTION IF EXISTS trigger_init_store_settings();

-- حذف الدالة التي تنشئ 3 مكونات فقط
DROP FUNCTION IF EXISTS initialize_store_settings(UUID);

-- ==============================================
-- 2. التأكد من وجود الدالة الصحيحة
-- ==============================================

-- تحديث الدالة المحسنة للتأكد من إنشاء 6 مكونات
CREATE OR REPLACE FUNCTION create_default_store_components_enhanced(organization_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    components_created INTEGER := 0;
    result_message TEXT;
BEGIN
    -- التحقق من عدم وجود مكونات مسبقاً
    IF EXISTS (SELECT 1 FROM store_settings WHERE organization_id = create_default_store_components_enhanced.organization_id) THEN
        RETURN 'المكونات موجودة بالفعل للمؤسسة: ' || organization_id;
    END IF;

    -- إنشاء المكونات واحداً تلو الآخر مع معالجة الأخطاء
    
    -- 1. البانر الرئيسي (Hero)
    BEGIN
        INSERT INTO store_settings (id, organization_id, component_type, settings, is_active, order_index, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            organization_id,
            'hero',
            jsonb_build_object(
                'title', 'أهلاً بك في سطوكيها',
                'description', 'تسوق أحدث المنتجات بأفضل الأسعار في الجزائر',
                'imageUrl', 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                'primaryButton', jsonb_build_object('text', 'تسوق الآن', 'link', '/products'),
                'secondaryButton', jsonb_build_object('text', 'معلومات أكثر', 'link', '/about'),
                'primaryButtonStyle', 'primary',
                'secondaryButtonStyle', 'primary',
                'trustBadges', jsonb_build_array(
                    jsonb_build_object('id', 'badge1', 'icon', 'Truck', 'text', 'شحن سريع'),
                    jsonb_build_object('id', 'badge2', 'icon', 'ShieldCheck', 'text', 'ضمان جودة'),
                    jsonb_build_object('id', 'badge3', 'icon', 'Gem', 'text', 'خدمة متميزة')
                ),
                '_isVisible', true
            ),
            true, 1, NOW(), NOW()
        );
        components_created := components_created + 1;
        RAISE NOTICE 'تم إنشاء مكون Hero للمؤسسة: %', organization_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'خطأ في إنشاء مكون Hero: %', SQLERRM;
    END;

    -- 2. فئات المنتجات (Categories)
    BEGIN
        INSERT INTO store_settings (id, organization_id, component_type, settings, is_active, order_index, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            organization_id,
            'categories',
            jsonb_build_object(
                'title', 'تسوق حسب الفئة',
                'description', 'استكشف منتجاتنا حسب الفئة',
                'layout', 'grid',
                'displayCount', 6,
                'selectionMethod', 'automatic',
                'selectedCategories', jsonb_build_array(),
                'showDescription', true,
                'showProductCount', true,
                'showImages', true,
                'displayStyle', 'cards',
                'backgroundStyle', 'light',
                'showViewAllButton', true,
                '_isVisible', true
            ),
            true, 2, NOW(), NOW()
        );
        components_created := components_created + 1;
        RAISE NOTICE 'تم إنشاء مكون Categories للمؤسسة: %', organization_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'خطأ في إنشاء مكون Categories: %', SQLERRM;
    END;

    -- 3. المنتجات المميزة (Featured Products)
    BEGIN
        INSERT INTO store_settings (id, organization_id, component_type, settings, is_active, order_index, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            organization_id,
            'featuredproducts',
            jsonb_build_object(
                'title', 'منتجات مميزة',
                'description', 'اكتشف مجموعتنا المختارة من المنتجات المميزة',
                'displayCount', 4,
                'sortBy', 'popularity',
                'showRatings', true,
                'categoryId', null,
                '_isVisible', true
            ),
            true, 3, NOW(), NOW()
        );
        components_created := components_created + 1;
        RAISE NOTICE 'تم إنشاء مكون Featured Products للمؤسسة: %', organization_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'خطأ في إنشاء مكون Featured Products: %', SQLERRM;
    END;

    -- 4. عن سطوكيها (About)
    BEGIN
        INSERT INTO store_settings (id, organization_id, component_type, settings, is_active, order_index, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            organization_id,
            'about',
            jsonb_build_object(
                'title', 'عن سطوكيها',
                'subtitle', 'متجر إلكتروني جزائري موثوق به منذ سنوات',
                'description', 'تأسست سطوكيها بهدف تقديم منتجات عالية الجودة وخدمات متميزة للعملاء في الجزائر. نحن نفخر بتوفير تجربة تسوق سهلة وآمنة مع ضمان أفضل الأسعار والجودة العالية.',
                'features', jsonb_build_array(
                    'منتجات أصلية بضمان الوكيل',
                    'شحن سريع لجميع ولايات الجزائر',
                    'دعم فني متخصص',
                    'خدمة ما بعد البيع'
                ),
                'image', 'https://images.unsplash.com/photo-1612690669207-fed642192c40?q=80&w=1740',
                'storeInfo', jsonb_build_object(
                    'yearFounded', 2024,
                    'customersCount', 100,
                    'productsCount', 50,
                    'branches', 1
                ),
                '_isVisible', true
            ),
            true, 4, NOW(), NOW()
        );
        components_created := components_created + 1;
        RAISE NOTICE 'تم إنشاء مكون About للمؤسسة: %', organization_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'خطأ في إنشاء مكون About: %', SQLERRM;
    END;

    -- 5. آراء العملاء (Testimonials)
    BEGIN
        INSERT INTO store_settings (id, organization_id, component_type, settings, is_active, order_index, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            organization_id,
            'testimonials',
            jsonb_build_object(
                'title', 'آراء عملائنا',
                'description', 'استمع إلى تجارب عملائنا الحقيقية مع منتجاتنا وخدماتنا',
                'visibleCount', 3,
                'backgroundColor', 'default',
                'cardStyle', 'default',
                '_isVisible', true
            ),
            true, 5, NOW(), NOW()
        );
        components_created := components_created + 1;
        RAISE NOTICE 'تم إنشاء مكون Testimonials للمؤسسة: %', organization_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'خطأ في إنشاء مكون Testimonials: %', SQLERRM;
    END;

    -- 6. تذييل الصفحة (Footer)
    BEGIN
        INSERT INTO store_settings (id, organization_id, component_type, settings, is_active, order_index, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            organization_id,
            'footer',
            jsonb_build_object(
                'storeName', 'سطوكيها',
                'logoUrl', '',
                'description', 'متجر إلكتروني جزائري متخصص في بيع أحدث المنتجات التقنية والإلكترونية بأفضل الأسعار وجودة عالية.',
                'socialLinks', jsonb_build_array(
                    jsonb_build_object('platform', 'facebook', 'url', 'https://facebook.com'),
                    jsonb_build_object('platform', 'twitter', 'url', 'https://twitter.com'),
                    jsonb_build_object('platform', 'instagram', 'url', 'https://instagram.com')
                ),
                'contactInfo', jsonb_build_object(
                    'phone', '+213 21 123 456',
                    'email', 'info@stokia.com',
                    'address', 'الجزائر العاصمة، الجزائر'
                ),
                'footerSections', jsonb_build_array(
                    jsonb_build_object(
                        'id', 'links1',
                        'title', 'روابط سريعة',
                        'links', jsonb_build_array(
                            jsonb_build_object('id', 'home', 'text', 'الرئيسية', 'url', '/'),
                            jsonb_build_object('id', 'products', 'text', 'المنتجات', 'url', '/products'),
                            jsonb_build_object('id', 'categories', 'text', 'الفئات', 'url', '/categories'),
                            jsonb_build_object('id', 'about', 'text', 'من نحن', 'url', '/about')
                        )
                    ),
                    jsonb_build_object(
                        'id', 'links2',
                        'title', 'خدمة العملاء',
                        'links', jsonb_build_array(
                            jsonb_build_object('id', 'support', 'text', 'الدعم الفني', 'url', '/support'),
                            jsonb_build_object('id', 'contact', 'text', 'اتصل بنا', 'url', '/contact'),
                            jsonb_build_object('id', 'faq', 'text', 'الأسئلة الشائعة', 'url', '/faq'),
                            jsonb_build_object('id', 'returns', 'text', 'سياسة الإرجاع', 'url', '/returns')
                        )
                    )
                ),
                'features', jsonb_build_array(
                    jsonb_build_object('id', '1', 'icon', 'Truck', 'title', 'شحن سريع', 'description', 'توصيل مجاني للطلبات +5000 دج'),
                    jsonb_build_object('id', '2', 'icon', 'CreditCard', 'title', 'دفع آمن', 'description', 'طرق دفع متعددة 100% آمنة'),
                    jsonb_build_object('id', '3', 'icon', 'Heart', 'title', 'ضمان الجودة', 'description', 'منتجات عالية الجودة معتمدة'),
                    jsonb_build_object('id', '4', 'icon', 'ShieldCheck', 'title', 'دعم 24/7', 'description', 'مساعدة متوفرة طول اليوم')
                ),
                'copyrightText', '',
                'showSocialLinks', true,
                'showContactInfo', true,
                'showFeatures', true,
                'showNewsletter', true,
                'newsletterSettings', jsonb_build_object(
                    'enabled', true,
                    'title', 'النشرة البريدية',
                    'description', 'اشترك في نشرتنا البريدية للحصول على آخر العروض والتحديثات.',
                    'placeholder', 'البريد الإلكتروني',
                    'buttonText', 'اشتراك'
                ),
                'showPaymentMethods', true,
                'paymentMethods', jsonb_build_array('visa', 'mastercard', 'paypal', 'mada'),
                'legalLinks', jsonb_build_array(
                    jsonb_build_object('id', 'privacy', 'text', 'سياسة الخصوصية', 'url', '/privacy'),
                    jsonb_build_object('id', 'terms', 'text', 'شروط الاستخدام', 'url', '/terms')
                ),
                '_isVisible', true
            ),
            true, 6, NOW(), NOW()
        );
        components_created := components_created + 1;
        RAISE NOTICE 'تم إنشاء مكون Footer للمؤسسة: %', organization_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'خطأ في إنشاء مكون Footer: %', SQLERRM;
    END;

    result_message := 'تم إنشاء ' || components_created || ' مكونات من أصل 6 للمؤسسة: ' || organization_id;
    RAISE NOTICE '%', result_message;
    
    RETURN result_message;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'خطأ عام في إنشاء المكونات: ' || SQLERRM;
END;
$$;

-- إعادة إنشاء trigger الصحيح
CREATE OR REPLACE FUNCTION trigger_create_default_store_components_enhanced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_msg TEXT;
BEGIN
    -- استخدام الدالة المحسّنة
    SELECT create_default_store_components_enhanced(NEW.id) INTO result_msg;
    RAISE NOTICE 'نتيجة إنشاء المكونات: %', result_msg;
    
    RETURN NEW;
END;
$$;

-- التأكد من وجود trigger واحد فقط
DROP TRIGGER IF EXISTS organizations_after_insert ON organizations;

CREATE TRIGGER organizations_after_insert
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_store_components_enhanced();

-- ==============================================
-- 3. إصلاح المؤسسات الناقصة المكونات
-- ==============================================

-- دالة لإصلاح المؤسسات الناقصة
CREATE OR REPLACE FUNCTION fix_missing_store_components()
RETURNS TABLE(
    org_id UUID,
    org_name TEXT,
    org_subdomain TEXT,
    before_count INTEGER,
    after_count INTEGER,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_record RECORD;
    before_components INTEGER;
    after_components INTEGER;
    missing_components TEXT[] := ARRAY[]::TEXT[];
    result_msg TEXT;
BEGIN
    -- المرور على المؤسسات التي لديها أقل من 6 مكونات
    FOR org_record IN (
        SELECT 
            o.id,
            o.name,
            o.subdomain,
            COUNT(ss.id) as current_components
        FROM organizations o
        LEFT JOIN store_settings ss ON o.id = ss.organization_id
        WHERE o.created_at > NOW() - INTERVAL '30 days'  -- المؤسسات الحديثة فقط
        GROUP BY o.id, o.name, o.subdomain
        HAVING COUNT(ss.id) < 6
        ORDER BY COUNT(ss.id) ASC
    ) LOOP
        -- حفظ العدد قبل الإصلاح
        before_components := org_record.current_components;
        
        -- تحديد المكونات المفقودة
        missing_components := ARRAY[]::TEXT[];
        
        -- فحص كل مكون (استخدام store_settings.organization_id للوضوح)
        IF NOT EXISTS (SELECT 1 FROM store_settings WHERE store_settings.organization_id = org_record.id AND component_type = 'hero') THEN
            missing_components := array_append(missing_components, 'hero');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM store_settings WHERE store_settings.organization_id = org_record.id AND component_type = 'categories') THEN
            missing_components := array_append(missing_components, 'categories');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM store_settings WHERE store_settings.organization_id = org_record.id AND component_type = 'featuredproducts') THEN
            missing_components := array_append(missing_components, 'featuredproducts');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM store_settings WHERE store_settings.organization_id = org_record.id AND component_type = 'about') THEN
            missing_components := array_append(missing_components, 'about');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM store_settings WHERE store_settings.organization_id = org_record.id AND component_type = 'testimonials') THEN
            missing_components := array_append(missing_components, 'testimonials');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM store_settings WHERE store_settings.organization_id = org_record.id AND component_type = 'footer') THEN
            missing_components := array_append(missing_components, 'footer');
        END IF;
        
        -- إضافة المكونات المفقودة
        IF array_length(missing_components, 1) > 0 THEN
            RAISE NOTICE 'إصلاح المؤسسة % - المكونات المفقودة: %', org_record.name, missing_components;
            
            -- حذف المكونات الموجودة أولاً لضمان عدم التداخل
            DELETE FROM store_settings WHERE store_settings.organization_id = org_record.id;
            
            -- إنشاء المكونات الكاملة
            SELECT create_default_store_components_enhanced(org_record.id) INTO result_msg;
        END IF;
        
        -- حساب العدد بعد الإصلاح
        SELECT COUNT(*) INTO after_components 
        FROM store_settings 
        WHERE store_settings.organization_id = org_record.id;
        
        -- إرجاع النتيجة (تغيير أسماء المتغيرات لتجنب التضارب)
        org_id := org_record.id;
        org_name := org_record.name;
        org_subdomain := org_record.subdomain;
        before_count := before_components;
        after_count := after_components;
        status := CASE 
            WHEN after_components = 6 THEN 'تم الإصلاح بنجاح'
            ELSE 'إصلاح جزئي: ' || after_components || '/6'
        END;
        
        RETURN NEXT;
    END LOOP;
END;
$$;

-- تشغيل إصلاح المؤسسات الناقصة
SELECT * FROM fix_missing_store_components();

-- ==============================================
-- 4. التحقق النهائي
-- ==============================================

-- عرض إحصائيات المؤسسات والمكونات
SELECT 
    'إحصائيات نهائية' as report_type,
    COUNT(DISTINCT o.id) as total_organizations,
    COUNT(ss.id) as total_components,
    ROUND(AVG(component_counts.component_count), 2) as avg_components_per_org
FROM organizations o
LEFT JOIN store_settings ss ON o.id = ss.organization_id
LEFT JOIN (
    SELECT organization_id, COUNT(*) as component_count
    FROM store_settings
    GROUP BY organization_id
) component_counts ON o.id = component_counts.organization_id
WHERE o.created_at > NOW() - INTERVAL '30 days';

-- عرض المؤسسات مع عدد مكوناتها
SELECT 
    o.name,
    o.subdomain,
    COUNT(ss.id) as components_count,
    CASE 
        WHEN COUNT(ss.id) = 6 THEN '✅ مكتمل'
        WHEN COUNT(ss.id) = 0 THEN '❌ لا توجد مكونات'
        ELSE '⚠️ ناقص (' || COUNT(ss.id) || '/6)'
    END as status
FROM organizations o
LEFT JOIN store_settings ss ON o.id = ss.organization_id
WHERE o.created_at > NOW() - INTERVAL '30 days'
GROUP BY o.id, o.name, o.subdomain
ORDER BY COUNT(ss.id) ASC;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION create_default_store_components_enhanced(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION trigger_create_default_store_components_enhanced() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION fix_missing_store_components() TO anon, authenticated;

COMMIT;

-- ==============================================
-- رسالة نهائية
-- ==============================================
SELECT 'تم إصلاح مشكلة تضارب دوال إنشاء المكونات الافتراضية بنجاح!' as final_message;