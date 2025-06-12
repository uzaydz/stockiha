-- دالة إنشاء المكونات الافتراضية للمتجر
CREATE OR REPLACE FUNCTION create_default_store_components(organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    -- عن متجرنا (About)
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
  RAISE NOTICE 'تم إنشاء المكونات الافتراضية للمؤسسة: %', organization_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- لا نفشل العملية إذا حدث خطأ في إنشاء المكونات الافتراضية
    RAISE NOTICE 'خطأ في إنشاء المكونات الافتراضية للمؤسسة %: %', organization_id, SQLERRM;
END;
$$;

-- إنشاء trigger لاستدعاء الدالة تلقائياً عند إنشاء مؤسسة جديدة
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

-- منح الصلاحيات اللازمة
GRANT EXECUTE ON FUNCTION create_default_store_components(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION trigger_create_default_store_components() TO anon, authenticated; 