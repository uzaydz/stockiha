// أنواع المكونات المتاحة
export type ComponentType = 'Hero' | 'CategorySection' | 'ProductCategories' | 'FeaturedProducts' | 'CustomerTestimonials' | 'About' | 'countdownoffers';

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
  Hero: {
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
  CategorySection: {
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
  ProductCategories: {
    title: 'تصفح فئات منتجاتنا',
    description: 'أفضل الفئات المختارة لتلبية احتياجاتك',
    displayCount: 6,
    displayType: 'grid'
  },
  FeaturedProducts: {
    title: 'منتجاتنا المميزة',
    description: 'اكتشف أفضل منتجاتنا المختارة بعناية لتناسب احتياجاتك',
    displayCount: 4,
    displayType: 'grid',
    selectionMethod: 'automatic', // automatic, manual
    selectionCriteria: 'featured', // featured, best_selling, newest, discounted
    selectedProducts: [] // قائمة معرفات المنتجات المحددة يدويًا
  },
  CustomerTestimonials: {
    title: 'آراء عملائنا',
    description: 'استمع إلى تجارب عملائنا الحقيقية مع منتجاتنا وخدماتنا',
    displayCount: 3
  },
  About: {
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
  }
}; 