-- ملف SQL لحل مشكلة عدم ظهور المكونات الافتراضية للمؤسسات الجديدة
-- تاريخ الإنشاء: 2025-01-10

-- ==============================================
-- 1. التشخيص والبحث عن المشكلة
-- ==============================================

-- فحص المؤسسة الحالية
DO $$
DECLARE
    org_id UUID := '53e9be87-ae91-466d-a80a-c07685c3e3b9';
    components_count INTEGER;
    trigger_exists BOOLEAN;
    function_exists BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'تشخيص مشكلة المكونات الافتراضية';
    RAISE NOTICE '========================================';
    
    -- التحقق من المؤسسة
    RAISE NOTICE 'فحص المؤسسة: %', org_id;
    
    -- عد المكونات الموجودة
    SELECT COUNT(*) INTO components_count 
    FROM store_settings 
    WHERE organization_id = org_id;
    
    RAISE NOTICE 'عدد المكونات الموجودة: %', components_count;
    
    -- التحقق من وجود الدالة
    SELECT EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'create_default_store_components'
    ) INTO function_exists;
    
    RAISE NOTICE 'وجود دالة إنشاء المكونات: %', function_exists;
    
    -- التحقق من وجود الـ trigger
    SELECT EXISTS(
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'organizations_after_insert'
        AND event_object_table = 'organizations'
    ) INTO trigger_exists;
    
    RAISE NOTICE 'وجود الـ trigger: %', trigger_exists;
    
    -- عرض المكونات الموجودة
    IF components_count > 0 THEN
        RAISE NOTICE 'المكونات الموجودة:';
        FOR rec IN 
            SELECT component_type, is_active, order_index 
            FROM store_settings 
            WHERE organization_id = org_id 
            ORDER BY order_index
        LOOP
            RAISE NOTICE '  - %: نشط=%, ترتيب=%', rec.component_type, rec.is_active, rec.order_index;
        END LOOP;
    END IF;
    
    RAISE NOTICE '========================================';
END;
$$;

-- ==============================================
-- 2. حل مشكلة المؤسسة الحالية
-- ==============================================

-- حذف المكونات الخاطئة وإعادة إنشائها
DO $$
DECLARE
    org_id UUID := '53e9be87-ae91-466d-a80a-c07685c3e3b9';
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE 'إصلاح مكونات المؤسسة: %', org_id;
    
    -- حذف المكونات الموجودة
    DELETE FROM store_settings WHERE organization_id = org_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'تم حذف % مكون قديم', deleted_count;
    
    -- إنشاء المكونات الصحيحة
    INSERT INTO store_settings (id, organization_id, component_type, settings, is_active, order_index, created_at, updated_at)
    VALUES 
        -- البانر الرئيسي (Hero)
        (
            gen_random_uuid(),
            org_id,
            'hero',
            jsonb_build_object(
                'title', 'أهلاً بك في سطوكيها',
                'description', 'تسوق أحدث المنتجات بأفضل الأسعار في الجزائر',
                'imageUrl', 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                'primaryButton', jsonb_build_object(
                    'text', 'تسوق الآن',
                    'link', '/products'
                ),
                'secondaryButton', jsonb_build_object(
                    'text', 'معلومات أكثر',
                    'link', '/about'
                ),
                'primaryButtonStyle', 'primary',
                'secondaryButtonStyle', 'primary',
                'trustBadges', jsonb_build_array(
                    jsonb_build_object('id', 'badge1', 'icon', 'Truck', 'text', 'شحن سريع'),
                    jsonb_build_object('id', 'badge2', 'icon', 'ShieldCheck', 'text', 'ضمان جودة'),
                    jsonb_build_object('id', 'badge3', 'icon', 'Gem', 'text', 'خدمة متميزة')
                ),
                '_isVisible', true
            ),
            true,
            1,
            NOW(),
            NOW()
        ),
        -- فئات المنتجات (Categories)
        (
            gen_random_uuid(),
            org_id,
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
            true,
            2,
            NOW(),
            NOW()
        ),
        -- المنتجات المميزة (Featured Products)
        (
            gen_random_uuid(),
            org_id,
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
            true,
            3,
            NOW(),
            NOW()
        ),
        -- عن سطوكيها (About)
        (
            gen_random_uuid(),
            org_id,
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
            true,
            4,
            NOW(),
            NOW()
        ),
        -- آراء العملاء (Testimonials)
        (
            gen_random_uuid(),
            org_id,
            'testimonials',
            jsonb_build_object(
                'title', 'آراء عملائنا',
                'description', 'استمع إلى تجارب عملائنا الحقيقية مع منتجاتنا وخدماتنا',
                'visibleCount', 3,
                'backgroundColor', 'default',
                'cardStyle', 'default',
                '_isVisible', true
            ),
            true,
            5,
            NOW(),
            NOW()
        ),
        -- تذييل الصفحة (Footer)
        (
            gen_random_uuid(),
            org_id,
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
            true,
            6,
            NOW(),
            NOW()
        );
    
    RAISE NOTICE 'تم إنشاء 6 مكونات جديدة بنجاح للمؤسسة';
END;
$$;

-- ==============================================
-- 3. فحص وحل مشاكل النظام التلقائي
-- ==============================================

-- تحديث الدالة لحل مشكلة التحقق من المكونات الموجودة
CREATE OR REPLACE FUNCTION create_default_store_components_fixed(organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- حذف أي مكونات موجودة أولاً (لإعادة الإنشاء الصحيح)
    DELETE FROM store_settings WHERE organization_id = create_default_store_components_fixed.organization_id;
    
    -- إدراج المكونات الافتراضية للمتجر
    INSERT INTO store_settings (id, organization_id, component_type, settings, is_active, order_index, created_at, updated_at)
    VALUES 
        -- البانر الرئيسي (Hero)
        (
            gen_random_uuid(),
            organization_id,
            'hero',
            jsonb_build_object(
                'title', 'أهلاً بك في سطوكيها',
                'description', 'تسوق أحدث المنتجات بأفضل الأسعار في الجزائر',
                'imageUrl', 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                'primaryButton', jsonb_build_object(
                    'text', 'تسوق الآن',
                    'link', '/products'
                ),
                'secondaryButton', jsonb_build_object(
                    'text', 'معلومات أكثر',
                    'link', '/about'
                ),
                'primaryButtonStyle', 'primary',
                'secondaryButtonStyle', 'primary',
                'trustBadges', jsonb_build_array(
                    jsonb_build_object('id', 'badge1', 'icon', 'Truck', 'text', 'شحن سريع'),
                    jsonb_build_object('id', 'badge2', 'icon', 'ShieldCheck', 'text', 'ضمان جودة'),
                    jsonb_build_object('id', 'badge3', 'icon', 'Gem', 'text', 'خدمة متميزة')
                ),
                '_isVisible', true
            ),
            true,
            1,
            NOW(),
            NOW()
        ),
        -- فئات المنتجات (Categories)
        (
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
            true,
            2,
            NOW(),
            NOW()
        ),
        -- المنتجات المميزة (Featured Products) - استخدام featuredproducts
        (
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
            true,
            3,
            NOW(),
            NOW()
        ),
        -- عن سطوكيها (About)
        (
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
            true,
            4,
            NOW(),
            NOW()
        ),
        -- آراء العملاء (Testimonials)
        (
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
            true,
            5,
            NOW(),
            NOW()
        ),
        -- تذييل الصفحة (Footer)
        (
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
            true,
            6,
            NOW(),
            NOW()
        );
    
    RAISE NOTICE 'تم إنشاء المكونات الافتراضية لسطوكيها للمؤسسة: %', organization_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في إنشاء المكونات الافتراضية للمؤسسة %: %', organization_id, SQLERRM;
END;
$$;

-- ==============================================
-- 4. إنشاء Trigger محسن
-- ==============================================

-- دالة trigger محسنة
CREATE OR REPLACE FUNCTION trigger_create_default_store_components_fixed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- إنشاء المكونات الافتراضية للمؤسسة الجديدة
    PERFORM create_default_store_components_fixed(NEW.id);
    
    RETURN NEW;
END;
$$;

-- حذف الـ trigger القديم وإنشاء الجديد
DROP TRIGGER IF EXISTS organizations_after_insert ON organizations;

CREATE TRIGGER organizations_after_insert_fixed
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_store_components_fixed();

-- ==============================================
-- 5. اختبار النظام الجديد
-- ==============================================

-- اختبار إنشاء مؤسسة جديدة (محاكاة)
DO $$
DECLARE
    test_org_id UUID;
    components_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'اختبار النظام المحدث';
    RAISE NOTICE '========================================';
    
    -- محاكاة إنشاء مؤسسة جديدة
    test_org_id := gen_random_uuid();
    
    RAISE NOTICE 'اختبار إنشاء مكونات لمؤسسة تجريبية: %', test_org_id;
    
    -- تشغيل الدالة يدوياً
    PERFORM create_default_store_components_fixed(test_org_id);
    
    -- عد المكونات المنشأة
    SELECT COUNT(*) INTO components_count 
    FROM store_settings 
    WHERE organization_id = test_org_id;
    
    RAISE NOTICE 'تم إنشاء % مكون للمؤسسة التجريبية', components_count;
    
    -- حذف البيانات التجريبية
    DELETE FROM store_settings WHERE organization_id = test_org_id;
    
    IF components_count = 6 THEN
        RAISE NOTICE '✅ النظام يعمل بشكل صحيح!';
    ELSE
        RAISE NOTICE '❌ يوجد مشكلة في النظام - عدد المكونات غير صحيح';
    END IF;
    
    RAISE NOTICE '========================================';
END;
$$;

-- ==============================================
-- 6. إنشاء دالة لإصلاح المؤسسات الموجودة
-- ==============================================

CREATE OR REPLACE FUNCTION fix_all_organizations_components()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_record RECORD;
    fixed_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'بدء إصلاح مكونات جميع المؤسسات...';
    
    FOR org_record IN 
        SELECT o.id, o.name, o.subdomain 
        FROM organizations o
    LOOP
        total_count := total_count + 1;
        
        -- إصلاح مكونات كل مؤسسة
        PERFORM create_default_store_components_fixed(org_record.id);
        fixed_count := fixed_count + 1;
        
        RAISE NOTICE 'تم إصلاح المؤسسة: % (%)', org_record.name, org_record.subdomain;
    END LOOP;
    
    RAISE NOTICE 'تم إصلاح % من أصل % مؤسسة', fixed_count, total_count;
END;
$$;

-- ==============================================
-- 7. تقرير نهائي
-- ==============================================

DO $$
DECLARE
    total_orgs INTEGER;
    orgs_with_six_components INTEGER;
    current_org_components INTEGER;
BEGIN
    -- إحصائيات عامة
    SELECT COUNT(*) INTO total_orgs FROM organizations;
    
    -- المؤسسات التي تحتوي على 6 مكونات
    SELECT COUNT(DISTINCT organization_id) INTO orgs_with_six_components
    FROM store_settings 
    WHERE organization_id IN (
        SELECT organization_id 
        FROM store_settings 
        GROUP BY organization_id 
        HAVING COUNT(*) = 6
    );
    
    -- فحص المؤسسة الحالية
    SELECT COUNT(*) INTO current_org_components
    FROM store_settings 
    WHERE organization_id = '53e9be87-ae91-466d-a80a-c07685c3e3b9';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'تقرير نهائي - حالة المكونات الافتراضية';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'إجمالي المؤسسات: %', total_orgs;
    RAISE NOTICE 'المؤسسات التي تحتوي على 6 مكونات: %', orgs_with_six_components;
    RAISE NOTICE 'المؤسسة الحالية (moussalaomoussa): % مكون', current_org_components;
    RAISE NOTICE '========================================';
    
    IF current_org_components = 6 THEN
        RAISE NOTICE '✅ تم إصلاح مشكلة المؤسسة الحالية بنجاح!';
    ELSE
        RAISE NOTICE '❌ لا تزال هناك مشكلة في المؤسسة الحالية';
    END IF;
    
    RAISE NOTICE 'استخدم الدالة fix_all_organizations_components() لإصلاح جميع المؤسسات';
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION create_default_store_components_fixed(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION trigger_create_default_store_components_fixed() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fix_all_organizations_components() TO anon, authenticated, service_role;

-- نهاية الملف 