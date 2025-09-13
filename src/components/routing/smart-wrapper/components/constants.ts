/**
 * ⚙️ Constants for Smart Wrapper Components
 * الثوابت لمكونات Smart Wrapper
 */

/**
 * ثوابت الأداء
 */
export const PERFORMANCE_CONSTANTS = {
  // أوقات الانتظار
  DEBOUNCE_DELAY: 300,
  THROTTLE_LIMIT: 100,
  LOADING_TIMEOUT: 8000,
  RETRY_DELAY: 100,
  
  // أولويات التحميل
  PRIORITIES: {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
  },
  
  // أحجام الحزم
  BUNDLE_SIZES: {
    SMALL: 50 * 1024,    // 50KB
    MEDIUM: 200 * 1024,  // 200KB
    LARGE: 500 * 1024    // 500KB
  }
} as const;

/**
 * ثوابت النطاقات
 */
export const DOMAIN_CONSTANTS = {
  // النطاقات العامة
  PUBLIC_DOMAINS: [
    'ktobi.online',
    'www.ktobi.online',
    'stockiha.com',
    'www.stockiha.com',
    'stockiha.pages.dev'
  ],
  
  // النطاقات المحلية
  LOCAL_DOMAINS: [
    'localhost',
    '127.0.0.1'
  ],
  
  // النطاقات المخصصة
  CUSTOM_DOMAIN_PATTERNS: [
    /^[a-zA-Z0-9-]+\.ktobi\.online$/,
    /^[a-zA-Z0-9-]+\.stockiha\.com$/
  ]
} as const;

/**
 * ثوابت أنواع الصفحات
 */
export const PAGE_TYPE_CONSTANTS = {
  // أنواع الصفحات العامة
  PUBLIC_TYPES: [
    'max-store',
    'public-store',
    'public-product'
  ],
  
  // أنواع الصفحات الخاصة
  PRIVATE_TYPES: [
    'admin',
    'dashboard',
    'console'
  ],
  
  // الأنواع الافتراضية
  DEFAULT_TYPE: 'minimal'
} as const;

/**
 * ثوابت الأحداث
 */
export const EVENT_CONSTANTS = {
  // أحداث الأداء
  PERFORMANCE_EVENTS: {
    PAGE_TYPE_DETECTED: 'bazaar:page-type-detected',
    SMART_WRAPPER_READY: 'bazaar:smart-wrapper-ready',
    COMPONENT_LOADED: 'bazaar:component-loaded'
  },
  
  // أحداث الأخطاء
  ERROR_EVENTS: {
    COMPONENT_ERROR: 'bazaar:component-error',
    LOADING_ERROR: 'bazaar:loading-error'
  }
} as const;
