/**
 * ⚡ Performance Configuration - تكوين الأداء
 * إعدادات محسنة لسرعة التحميل والتوجه للمتجر
 */

export const PERFORMANCE_CONFIG = {
  // ⚡ إعدادات الكشف المبكر للنطاق
  EARLY_DOMAIN_DETECTION: {
    ENABLED: true,
    TIMEOUT: 200, // 200ms للكشف المبكر
    CACHE_TTL: 5 * 60 * 1000, // 5 دقائق
    PRIORITY_DOMAINS: [
      'ktobi.online',
      'www.ktobi.online', 
      'stockiha.com',
      'www.stockiha.com'
    ]
  },

  // 🚀 إعدادات التحميل السريع
  FAST_LOADING: {
    ENABLED: true,
    STORE_LOADING_DELAY: 100, // 100ms للمتجر
    GENERAL_LOADING_DELAY: 300, // 300ms للصفحات العامة
    SKIP_AUTH_FOR_STORE: true, // تخطي المصادقة للمتجر
    SKIP_TENANT_FOR_STORE: true, // تخطي TenantContext للمتجر
  },

  // 🗃️ إعدادات التخزين المؤقت
  CACHING: {
    ENABLED: true,
    DOMAIN_INFO_TTL: 10 * 60 * 1000, // 10 دقائق
    PAGE_TYPE_TTL: 5 * 60 * 1000, // 5 دقائق
    ORGANIZATION_TTL: 15 * 60 * 1000, // 15 دقيقة
  },

  // 🔐 إعدادات المصادقة المحسنة
  AUTH_OPTIMIZATION: {
    ENABLED: true,
    SKIP_SESSION_CHECK_FOR_STORE: true,
    LAZY_AUTH_LOADING: true,
    AUTH_TIMEOUT: 3000, // 3 ثواني
  },

  // 🏪 إعدادات المتجر المحسنة
  STORE_OPTIMIZATION: {
    ENABLED: true,
    PRELOAD_STORE_DATA: true,
    SKIP_UNNECESSARY_PROVIDERS: true,
    STORE_LOADING_PRIORITY: 'high',
  },

  // 📱 إعدادات التحميل التدريجي
  PROGRESSIVE_LOADING: {
    ENABLED: true,
    SHOW_STORE_FIRST: true,
    LOAD_AUTH_BACKGROUND: true,
    LOAD_TENANT_BACKGROUND: true,
  },

  // 🎯 إعدادات تحديد نوع الصفحة
  PAGE_TYPE_DETECTION: {
    ENABLED: true,
    EARLY_DETECTION: true,
    CACHE_RESULTS: true,
    FALLBACK_TO_DEFAULT: true,
  },

  // 🔄 إعدادات التحديث في الخلفية
  BACKGROUND_UPDATES: {
    ENABLED: true,
    UPDATE_AUTH_BACKGROUND: true,
    UPDATE_TENANT_BACKGROUND: true,
    UPDATE_STORE_DATA_BACKGROUND: true,
  }
};

/**
 * 🚀 إعدادات التحميل السريع للمتجر
 */
export const STORE_FAST_LOADING_CONFIG = {
  // تخطي المزودين غير الضرورية للمتجر
  SKIP_PROVIDERS: [
    'NotificationsProvider',
    'DashboardDataProvider',
    'SuperUnifiedDataProvider'
  ],

  // المزودين الأساسية للمتجر فقط
  ESSENTIAL_PROVIDERS: [
    'SupabaseProvider',
    'ThemeProvider',
    'ShopProvider',
    'StoreProvider'
  ],

  // تأخير تحميل المزودين غير الأساسية
  LAZY_PROVIDERS: [
    'AuthProvider',
    'TenantProvider',
    'UserProvider'
  ],

  // أولوية تحميل البيانات
  DATA_PRIORITY: {
    HIGH: ['storeInfo', 'products', 'categories'],
    MEDIUM: ['organization', 'user', 'settings'],
    LOW: ['analytics', 'notifications', 'advanced_features']
  }
};

/**
 * ⚡ إعدادات الأداء للنطاقات المخصصة
 */
export const CUSTOM_DOMAIN_PERFORMANCE = {
  // الكشف المبكر للنطاق
  EARLY_DETECTION: {
    ENABLED: true,
    TIMEOUT: 100, // 100ms
    CACHE_KEY: 'bazaar_early_domain_detection',
    PRIORITY: 'critical'
  },

  // تخطي فحوصات المصادقة للنطاقات المخصصة
  SKIP_AUTH_CHECKS: {
    ENABLED: true,
    FOR_PUBLIC_STORE: true,
    FOR_PRODUCT_PAGES: true,
    FOR_STORE_PAGES: true
  },

  // تحميل البيانات الأساسية أولاً
  PRIORITY_LOADING: {
    STORE_INFO: true,
    PRODUCTS: true,
    CATEGORIES: true,
    THEME: true
  }
};

/**
 * 🎯 إعدادات الأداء للصفحات العامة
 */
export const PUBLIC_PAGE_PERFORMANCE = {
  // تخطي المزودين غير الضرورية
  SKIP_PROVIDERS: [
    'AuthProvider',
    'TenantProvider',
    'UserProvider',
    'NotificationsProvider'
  ],

  // المزودين الأساسية فقط
  ESSENTIAL_PROVIDERS: [
    'SupabaseProvider',
    'ThemeProvider'
  ],

  // تحميل البيانات الأساسية
  ESSENTIAL_DATA: [
    'theme',
    'basic_content'
  ]
};

/**
 * 🏪 إعدادات الأداء لنقطة البيع (POS)
 */
export const POS_PERFORMANCE_CONFIG = {
  // ⚡ تعطيل الأنيميشن على الأجهزة الضعيفة
  ANIMATIONS: {
    ENABLED: false, // تعطيل كل الأنيميشن
    DISABLE_FRAMER_MOTION: true,
    DISABLE_TRANSITIONS: true,
    DISABLE_HOVER_EFFECTS: true,
    SIMPLE_MODE: true
  },

  // 🎨 تقليل التأثيرات المرئية
  VISUAL_EFFECTS: {
    DISABLE_SHADOWS: true,
    DISABLE_BLUR: true,
    DISABLE_GRADIENTS: true,
    DISABLE_BACKDROP_FILTER: true,
    SIMPLE_BORDERS: true
  },

  // 📦 تحسين عرض المنتجات
  PRODUCTS: {
    ITEMS_PER_PAGE: 20, // بدلاً من 50
    USE_VIRTUAL_SCROLL: true,
    LAZY_LOAD_IMAGES: true,
    IMAGE_QUALITY: 'low', // low, medium, high
    THUMBNAIL_SIZE: 100, // px
    DEBOUNCE_SEARCH: 300 // ms
  },

  // 🔄 تحسين الـ Rendering
  RENDERING: {
    USE_MEMO: true,
    USE_CALLBACK: true,
    BATCH_UPDATES: true,
    DEFER_NON_CRITICAL: true
  },

  // 💾 تحسين الـ Caching
  CACHING: {
    ENABLED: true,
    PRODUCTS_TTL: 5 * 60 * 1000, // 5 دقائق
    CART_TTL: 30 * 60 * 1000, // 30 دقيقة
    SETTINGS_TTL: 10 * 60 * 1000 // 10 دقائق
  },

  // 🚀 تحسين التحميل
  LOADING: {
    LAZY_LOAD_DIALOGS: true,
    LAZY_LOAD_MODALS: true,
    PRELOAD_CRITICAL_ONLY: true,
    SPLIT_CHUNKS: true
  },

  // 🔍 تحسين البحث
  SEARCH: {
    DEBOUNCE_MS: 300,
    MIN_CHARS: 2,
    MAX_RESULTS: 50,
    CACHE_RESULTS: true
  },

  // 📱 إعدادات الأجهزة
  DEVICE_DETECTION: {
    AUTO_DETECT_PERFORMANCE: true,
    LOW_END_THRESHOLD: 4, // GB RAM
    REDUCE_QUALITY_ON_LOW_END: true
  }
};

/**
 * 🎯 كشف الأجهزة الضعيفة
 */
export const isLowEndDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // كشف بناءً على الذاكرة
  const memory = (navigator as any).deviceMemory;
  if (memory && memory < POS_PERFORMANCE_CONFIG.DEVICE_DETECTION.LOW_END_THRESHOLD) {
    return true;
  }
  
  // كشف بناءً على عدد المعالجات
  const cores = navigator.hardwareConcurrency;
  if (cores && cores < 4) {
    return true;
  }
  
  return false;
};

/**
 * 🎨 الحصول على إعدادات الأنيميشن
 */
export const getAnimationConfig = () => {
  const isLowEnd = isLowEndDevice();
  
  if (isLowEnd || POS_PERFORMANCE_CONFIG.ANIMATIONS.SIMPLE_MODE) {
    return {
      initial: {},
      animate: {},
      exit: {},
      transition: { duration: 0 }
    };
  }
  
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.2 }
  };
};

export default PERFORMANCE_CONFIG;
