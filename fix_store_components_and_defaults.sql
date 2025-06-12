-- ملف SQL شامل لحل مشاكل المكونات وإضافة النظام الافتراضي لسطوكيها
-- تاريخ الإنشاء: $(date)

-- ==============================================
-- 1. تنظيف المكونات المكررة
-- ==============================================

-- حذف المكونات المكررة للمنتجات المميزة (الاحتفاظ بـ featuredproducts فقط)
DELETE FROM store_settings 
WHERE component_type = 'featured_products' 
AND EXISTS (
    SELECT 1 FROM store_settings ss2 
    WHERE ss2.organization_id = store_settings.organization_id 
    AND ss2.component_type = 'featuredproducts'
);

-- تحديث ترتيب المكونات لإزالة الفجوات
WITH ordered_components AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY order_index, created_at) as new_order
    FROM store_settings
)
UPDATE store_settings 
SET order_index = ordered_components.new_order
FROM ordered_components
WHERE store_settings.id = ordered_components.id;

-- ==============================================
-- 2. دالة إنشاء المكونات الافتراضية لسطوكيها
-- ==============================================

CREATE OR REPLACE FUNCTION create_default_store_components(organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من عدم وجود مكونات مسبقاً لتجنب التكرار
  IF EXISTS (SELECT 1 FROM store_settings WHERE organization_id = create_default_store_components.organization_id) THEN
    RAISE NOTICE 'المكونات موجودة بالفعل للمؤسسة: %', organization_id;
    RETURN;
  END IF;

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
    -- المنتجات المميزة (Featured Products)
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
        'description', 'تأسست سطوكيها بهدف تقديم منتجات عالية الجودة وخدمات متميزة للعملاء في الجزائر. نحن نفخر بتوفير تجربة تسوق سهلة وآمنة مع ضمان أفضل الأسعار والجودة العالية. نلتزم دائمًا بتوفير منتجات أصلية وضمان رضا عملائنا التام.',
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
    
  -- سجل في النشاط
  RAISE NOTICE 'تم إنشاء المكونات الافتراضية لسطوكيها للمؤسسة: %', organization_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- لا نفشل العملية إذا حدث خطأ في إنشاء المكونات الافتراضية
    RAISE NOTICE 'خطأ في إنشاء المكونات الافتراضية للمؤسسة %: %', organization_id, SQLERRM;
END;
$$;

-- ==============================================
-- 3. دالة الـ Trigger لإنشاء المكونات تلقائياً
-- ==============================================

CREATE OR REPLACE FUNCTION trigger_create_default_store_components()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إنشاء المكونات الافتراضية للمؤسسة الجديدة
  PERFORM create_default_store_components(NEW.id);
  
  RETURN NEW;
END;
$$;

-- حذف الـ trigger إذا كان موجوداً مسبقاً
DROP TRIGGER IF EXISTS organizations_after_insert ON organizations;

-- إنشاء الـ trigger
CREATE TRIGGER organizations_after_insert
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_store_components();

-- ==============================================
-- 4. إضافة المكونات الافتراضية للمؤسسات الموجودة التي لا تحتوي على مكونات
-- ==============================================

DO $$
DECLARE
    org_record RECORD;
    components_count INTEGER;
BEGIN
    -- البحث عن المؤسسات التي لا تحتوي على مكونات متجر
    FOR org_record IN 
        SELECT o.id, o.name 
        FROM organizations o
        WHERE NOT EXISTS (
            SELECT 1 FROM store_settings ss 
            WHERE ss.organization_id = o.id
        )
    LOOP
        -- إضافة المكونات الافتراضية لكل مؤسسة
        PERFORM create_default_store_components(org_record.id);
        
        -- التحقق من نجاح الإضافة
        SELECT COUNT(*) INTO components_count 
        FROM store_settings 
        WHERE organization_id = org_record.id;
        
        RAISE NOTICE 'تم إضافة % مكون للمؤسسة: % (ID: %)', components_count, org_record.name, org_record.id;
    END LOOP;
    
    RAISE NOTICE 'تم الانتهاء من إضافة المكونات الافتراضية لجميع المؤسسات';
END;
$$;

-- ==============================================
-- 5. منح الصلاحيات اللازمة
-- ==============================================

GRANT EXECUTE ON FUNCTION create_default_store_components(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION trigger_create_default_store_components() TO anon, authenticated, service_role;

-- ==============================================
-- 6. تحديث إعدادات RLS إذا لزم الأمر
-- ==============================================

-- التأكد من أن policies الخاصة بـ store_settings تسمح بالعمليات المطلوبة
DO $$
BEGIN
    -- التحقق من وجود policy للإدراج
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'store_settings' 
        AND policyname LIKE '%insert%'
    ) THEN
        -- إنشاء policy للإدراج إذا لم تكن موجودة
        CREATE POLICY "store_settings_insert_policy" ON store_settings
            FOR INSERT TO authenticated, service_role
            WITH CHECK (true);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'تحذير: فشل في إنشاء أو تحديث policies: %', SQLERRM;
END;
$$;

-- ==============================================
-- 7. اختبار الدالة (اختياري)
-- ==============================================

-- يمكن تشغيل هذا الاختبار لمؤسسة محددة:
-- SELECT create_default_store_components('YOUR_ORGANIZATION_ID_HERE');

-- ==============================================
-- 8. تقرير نهائي
-- ==============================================

DO $$
DECLARE
    total_orgs INTEGER;
    orgs_with_components INTEGER;
    orgs_without_components INTEGER;
BEGIN
    -- إحصائيات نهائية
    SELECT COUNT(*) INTO total_orgs FROM organizations;
    
    SELECT COUNT(DISTINCT organization_id) INTO orgs_with_components 
    FROM store_settings;
    
    orgs_without_components := total_orgs - orgs_with_components;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'تقرير إعداد المكونات الافتراضية لسطوكيها';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'إجمالي المؤسسات: %', total_orgs;
    RAISE NOTICE 'المؤسسات التي تحتوي على مكونات: %', orgs_with_components;
    RAISE NOTICE 'المؤسسات بدون مكونات: %', orgs_without_components;
    RAISE NOTICE '========================================';
    
    IF orgs_without_components = 0 THEN
        RAISE NOTICE '✅ تم بنجاح! جميع المؤسسات تحتوي على مكونات افتراضية';
    ELSE
        RAISE NOTICE '⚠️  هناك % مؤسسة لا تزال بدون مكونات', orgs_without_components;
    END IF;
END;
$$;

-- نهاية الملف 