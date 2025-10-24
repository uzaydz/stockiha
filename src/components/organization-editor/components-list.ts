import { ComponentMeta, CategorySectionSettings, FeaturedProductsSettings, AboutSectionSettings, FooterSectionSettings, TestimonialSectionSettings } from './types';

export const COMPONENTS: ComponentMeta[] = [
  {
    id: 'hero',
    type: 'hero',
    name: 'القسم الرئيسي (Hero)',
    description: 'قسم بانر جذاب مع أزرار دعوة لاتخاذ إجراء وصورة خلفية.',
    isActive: true,
    orderIndex: 0
  },
  {
    id: 'product_categories',
    type: 'product_categories',
    name: 'فئات المنتجات',
    description: 'عرض الفئات الفعلية وتوجيه العملاء للتصفح بسهولة.',
    isActive: true,
    orderIndex: 1
  },
  {
    id: 'featured_products',
    type: 'featured_products',
    name: 'المنتجات المميزة',
    description: 'عرض أبرز المنتجات المختارة تلقائياً أو يدوياً.',
    isActive: true,
    orderIndex: 2
  },
  {
    id: 'testimonials',
    type: 'testimonials',
    name: 'آراء العملاء',
    description: 'تعزيز الثقة من خلال تجارب العملاء الحقيقية.',
    isActive: true,
    orderIndex: 3
  },
  {
    id: 'about',
    type: 'about',
    name: 'عن المؤسسة',
    description: 'تعريف المؤسسة وأهم المعلومات الرئيسية عنها.',
    isActive: true,
    orderIndex: 4
  },
  {
    id: 'footer',
    type: 'footer',
    name: 'تذييل الصفحة',
    description: 'عرض معلومات الاتصال، الروابط الهامة، وسائل الدفع والحقوق.',
    isActive: true,
    orderIndex: 6
  }
];

export const DEFAULT_HERO_SETTINGS = {
  imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop&crop=center',
  title: 'أحدث المنتجات',
  description: 'تسوق أحدث منتجاتنا المختارة بعناية بأفضل الأسعار التنافسية.',
  primaryButtonText: 'تصفح الكل',
  primaryButtonLink: '/products',
  secondaryButtonText: 'العروض الخاصة',
  secondaryButtonLink: '/offers',
  primaryButton: {
    text: 'تصفح الكل',
    link: '/products'
  },
  secondaryButton: {
    text: 'العروض الخاصة',
    link: '/offers'
  },
  primaryButtonStyle: 'primary' as const,
  secondaryButtonStyle: 'outline' as const,
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
  ],
  selectedProducts: [],
  showProducts: true,
  productsDisplay: 'grid',
  productsLimit: 4,
  productsType: 'featured' as const,
  organization_id: ''
};

export const DEFAULT_CATEGORY_SETTINGS: CategorySectionSettings = {
  title: "تصفح فئات منتجاتنا",
  description: "أفضل الفئات المختارة لتلبية احتياجاتك",
  selectionMethod: "automatic",
  maxCategories: 6,
  displayCount: 6,
  showProductCount: true,
  showDescription: true,
  showImages: true,
  enableHoverEffects: true,
  selectedCategories: [],
  displayStyle: "cards",
  enableViewAll: true,
  showViewAllButton: true,
  backgroundStyle: "light",
  organization_id: ''
};

export const DEFAULT_FEATURED_PRODUCTS_SETTINGS: FeaturedProductsSettings = {
  title: 'منتجات مميزة',
  description: 'اكتشف مجموعتنا المختارة بعناية من المنتجات الأكثر تميزاً.',
  displayCount: 4,
  displayType: 'grid' as const,
  selectionMethod: 'automatic' as const,
  selectionCriteria: 'featured' as const,
  showPrices: true,
  showRatings: true,
  showAddToCart: true,
  showBadges: true,
  showViewAllButton: true,
  selectedProducts: [] as string[],
  categoryId: null as string | null,
  organization_id: ''
};

export const DEFAULT_ABOUT_SETTINGS: AboutSectionSettings = {
  title: 'عن متجرنا',
  subtitle: 'متجر إلكترونيات وتقنية متميز',
  description: 'تأسس متجرنا منذ أكثر من عشر سنوات بهدف تقديم أحدث منتجات التكنولوجيا بأسعار منافسة وجودة عالية. نحن نفخر بتوفير تجربة تسوق متميزة لعملائنا من خلال فريق متخصص يقدم المشورة والدعم الفني المستمر.',
  features: [
    'منتجات أصلية بضمان الوكيل',
    'شحن سريع لجميع ولايات الجزائر',
    'دعم فني متخصص',
    'خدمة ما بعد البيع'
  ],
  image: 'https://images.unsplash.com/photo-1612690669207-fed642192c40?q=80&w=1740&auto=format&fit=crop&q=80',
  storeInfo: {
    yearFounded: 2010,
    customersCount: 12000,
    productsCount: 1500,
    branches: 6
  },
  organization_id: ''
};

export const DEFAULT_FOOTER_SETTINGS: FooterSectionSettings = {
  storeName: 'متجرنا',
  logoUrl: '',
  description: 'متجر إلكتروني متخصص في بيع أحدث المنتجات التقنية والإلكترونية بأفضل الأسعار وجودة عالية.',
  socialLinks: [
    { platform: 'facebook', url: 'https://facebook.com' },
    { platform: 'twitter', url: 'https://twitter.com' },
    { platform: 'instagram', url: 'https://instagram.com' }
  ],
  contactInfo: {
    phone: '+213 21 123 456',
    email: 'info@store.com',
    address: 'الجزائر العاصمة، الجزائر'
  },
  footerSections: [
    {
      id: 'links1',
      title: 'روابط سريعة',
      links: [
        { id: 'home', text: 'الرئيسية', url: '/' },
        { id: 'products', text: 'المنتجات', url: '/products' },
        { id: 'categories', text: 'الفئات', url: '/categories' },
        { id: 'about', text: 'من نحن', url: '/about' }
      ]
    },
    {
      id: 'links2',
      title: 'خدمة العملاء',
      links: [
        { id: 'support', text: 'الدعم الفني', url: '/support' },
        { id: 'contact', text: 'اتصل بنا', url: '/contact' },
        { id: 'faq', text: 'الأسئلة الشائعة', url: '/faq' },
        { id: 'returns', text: 'سياسة الإرجاع', url: '/returns' }
      ]
    }
  ],
  features: [
    {
      id: '1',
      icon: 'Truck',
      title: 'شحن سريع',
      description: 'توصيل مجاني للطلبات +500 ريال'
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
  showSocialLinks: true,
  showContactInfo: true,
  showFeatures: true,
  showNewsletter: true,
  newsletterSettings: {
    enabled: true,
    title: 'النشرة البريدية',
    description: 'اشترك في نشرتنا البريدية للحصول على آخر العروض والتحديثات.',
    placeholder: 'البريد الإلكتروني',
    buttonText: 'اشتراك'
  },
  showPaymentMethods: true,
  paymentMethods: ['visa', 'mastercard', 'paypal', 'mada'],
  legalLinks: [
    { id: 'privacy', text: 'سياسة الخصوصية', url: '/privacy' },
    { id: 'terms', text: 'شروط الاستخدام', url: '/terms' }
  ],
  organization_id: ''
};

export const DEFAULT_TESTIMONIAL_SETTINGS: TestimonialSectionSettings = {
  title: "آراء عملائنا",
  subtitle: "اكتشف ما يقوله عملاؤنا عن تجربتهم معنا",
  autoPlay: true,
  autoPlayDelay: 5000,
  showRating: true,
  showNavigation: true,
  displayStyle: "carousel",
  maxTestimonials: 6,
  showStats: true,
  showProductInfo: true,
  backgroundStyle: "light",
  selectedTestimonials: [],
  organization_id: ''
};
