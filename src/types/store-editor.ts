// أنواع المكونات المتاحة
export type ComponentType = 
  | 'hero' 
  | 'category_section' 
  | 'categorysection'  // إضافة للتوافق
  | 'categories'       // إضافة للتوافق مع قاعدة البيانات
  | 'product_categories' 
  | 'featured_products' 
  | 'featuredproducts'  // إضافة للتوافق
  | 'testimonials' 
  | 'customertestimonials'  // إضافة للتوافق
  | 'about' 
  | 'countdownoffers' 
  | 'services' 
  | 'contact'
  | 'footer';

// واجهة مكون المتجر
export interface StoreComponent {
  id: string;
  type: ComponentType;
  settings: any;
  isActive: boolean;
  orderIndex: number;
}

// نماذج الإعدادات الافتراضية لكل مكون
export const defaultComponentSettings = {
  hero: {
    title: 'أحدث المنتجات',
    description: 'تسوق أحدث منتجاتنا المختارة بعناية بأفضل الأسعار التنافسية.',
    primaryButton: {
      text: 'تصفح الكل',
      link: '/products'
    },
    primaryButtonStyle: 'primary',
    secondaryButton: {
      text: 'العروض الخاصة',
      link: '/offers'
    },
    secondaryButtonStyle: 'primary',
    imageUrl: 'https://images.unsplash.com/photo-1522204523234-8729aa6e3d5f?q=80&w=2070&auto=format&fit=crop',
    trustBadges: [
      {
        id: '1',
        text: 'توصيل سريع',
        icon: 'Truck'
      },
      {
        id: '2',
        text: 'دفع آمن',
        icon: 'ShieldCheck'
      },
      {
        id: '3',
        text: 'جودة عالية',
        icon: 'Gem'
      }
    ]
  },
  category_section: {
    title: "تصفح فئات منتجاتنا",
    description: "أفضل الفئات المختارة لتلبية احتياجاتك",
    selectionMethod: "random",
    maxCategories: 6,
    showProductCount: true,
    showDescription: true,
    selectedCategories: [],
    displayStyle: "cards",
    enableViewAll: true,
    backgroundStyle: "light"
  },
  // إضافة للتوافق
  categorysection: {
    title: "تصفح فئات منتجاتنا",
    description: "أفضل الفئات المختارة لتلبية احتياجاتك",
    selectionMethod: "random",
    maxCategories: 6,
    showProductCount: true,
    showDescription: true,
    selectedCategories: [],
    displayStyle: "cards",
    enableViewAll: true,
    backgroundStyle: "light"
  },
  // إضافة للتوافق مع قاعدة البيانات
  categories: {
    title: 'تصفح فئات منتجاتنا',
    description: 'أفضل الفئات المختارة لتلبية احتياجاتك',
    displayCount: 6,
    displayType: 'grid'
  },
  product_categories: {
    title: 'تصفح فئات منتجاتنا',
    description: 'أفضل الفئات المختارة لتلبية احتياجاتك',
    displayCount: 6,
    displayType: 'grid'
  },
  featured_products: {
    title: 'منتجاتنا المميزة',
    description: 'اكتشف أفضل منتجاتنا المختارة بعناية لتناسب احتياجاتك',
    displayCount: 4,
    displayType: 'grid',
    selectionMethod: 'automatic', // automatic, manual
    selectionCriteria: 'featured', // featured, best_selling, newest, discounted
    selectedProducts: [] // قائمة معرفات المنتجات المحددة يدويًا
  },
  // إضافة للتوافق
  featuredproducts: {
    title: 'منتجاتنا المميزة',
    description: 'اكتشف أفضل منتجاتنا المختارة بعناية لتناسب احتياجاتك',
    displayCount: 4,
    displayType: 'grid',
    selectionMethod: 'automatic',
    selectionCriteria: 'featured',
    selectedProducts: []
  },
  testimonials: {
    title: 'آراء عملائنا',
    description: 'استمع إلى تجارب عملائنا الحقيقية مع منتجاتنا وخدماتنا',
    displayCount: 3
  },
  // إضافة للتوافق
  customertestimonials: {
    title: 'آراء عملائنا',
    description: 'استمع إلى تجارب عملائنا الحقيقية مع منتجاتنا وخدماتنا',
    displayCount: 3
  },
  about: {
    title: 'عن متجرنا',
    subtitle: 'متجر إلكترونيات وتقنية متميز',
    description: 'تأسس متجرنا منذ أكثر من عشر سنوات بهدف تقديم أحدث منتجات التكنولوجيا بأسعار منافسة وجودة عالية.',
    imageUrl: 'https://images.unsplash.com/photo-1612690669207-fed642192c40?q=80&w=1740',
    features: [
      'منتجات أصلية بضمان الوكيل',
      'شحن سريع لجميع مناطق المملكة',
      'دعم فني متخصص',
      'خدمة ما بعد البيع'
    ],
    storeInfo: {
      yearFounded: 2010,
      customersCount: 12000,
      productsCount: 1500,
      branches: 6
    }
  },
  countdownoffers: {
    title: 'عروض محدودة بوقت',
    subtitle: 'تسوق الآن قبل انتهاء العروض الحصرية',
    currency: 'دج',
    layout: 'grid',
    maxItems: 3,
    buttonText: 'تسوق الآن',
    theme: 'light',
    showViewAll: false,
    viewAllUrl: '/offers',
    offers: []
  },
  footer: {
    storeName: 'stockiha',
    description: 'مع سطوكيها... كلشي فبلاصتو!',
    logoUrl: '',
    copyrightText: '',
    showSocialLinks: true,
    showContactInfo: true,
    showFeatures: true,
    showNewsletter: true,
    showPaymentMethods: true,
    socialLinks: [
      {
        platform: 'facebook',
        url: 'https://facebook.com/stockiha'
      },
      {
        platform: 'instagram',
        url: 'https://instagram.com/stockiha'
      }
    ],
    contactInfo: {
      phone: '0540240886',
      email: 'info@stockiha.com',
      address: 'خنشلة حي النصر، الجزائر'
    },
    footerSections: [
      {
        id: '1',
        title: 'روابط سريعة',
        links: [
          { id: '1-1', text: 'الصفحة الرئيسية', url: '/', isExternal: false },
          { id: '1-2', text: 'المنتجات', url: '/products', isExternal: false },
          { id: '1-3', text: 'العروض', url: '/offers', isExternal: false },
          { id: '1-4', text: 'اتصل بنا', url: '/contact', isExternal: false }
        ]
      },
      {
        id: '2',
        title: 'خدمة العملاء',
        links: [
          { id: '2-1', text: 'مركز المساعدة', url: '/help', isExternal: false },
          { id: '2-2', text: 'سياسة الشحن', url: '/shipping-policy', isExternal: false },
          { id: '2-3', text: 'سياسة الإرجاع', url: '/return-policy', isExternal: false },
          { id: '2-4', text: 'الأسئلة الشائعة', url: '/faq', isExternal: false }
        ]
      }
    ],
    features: [
      {
        id: '1',
        icon: 'Truck',
        title: 'شحن سريع',
        description: 'توصيل مجاني للطلبات +5000 د.ج'
      },
      {
        id: '2',
        icon: 'CreditCard',
        title: 'دفع آمن',
        description: 'طرق دفع متعددة 100% آمنة'
      },
      {
        id: '3',
        icon: 'Heart',
        title: 'ضمان الجودة',
        description: 'منتجات عالية الجودة معتمدة'
      },
      {
        id: '4',
        icon: 'ShieldCheck',
        title: 'دعم 24/7',
        description: 'مساعدة متوفرة طول اليوم'
      }
    ],
    newsletterSettings: {
      enabled: true,
      title: 'النشرة البريدية',
      description: 'اشترك في نشرتنا البريدية للحصول على آخر العروض والتحديثات.',
      placeholder: 'البريد الإلكتروني',
      buttonText: 'اشتراك'
    },
    paymentMethods: ['visa', 'mastercard', 'paypal'],
    legalLinks: [
      { id: 'legal-1', text: 'شروط الاستخدام', url: '/terms', isExternal: false },
      { id: 'legal-2', text: 'سياسة الخصوصية', url: '/privacy', isExternal: false },
      { id: 'legal-3', text: 'خريطة الموقع', url: '/sitemap', isExternal: false }
    ]
  }
};
