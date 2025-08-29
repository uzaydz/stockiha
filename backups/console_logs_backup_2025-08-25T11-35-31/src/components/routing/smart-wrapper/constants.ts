/**
 * 🎯 Smart Provider Wrapper - Constants & Configurations
 * ثوابت ومتغيرات النظام الذكي للـ Providers
 */

import { ProviderConfigMap, OptimizationConfig } from './types';

/**
 * ⚡ إعدادات الأداء والتحسين (مبسط)
 */
export const PERFORMANCE_CONFIG: OptimizationConfig = {
  enableMemoization: true,
  enableFontOptimization: true,
  enableDuplicateDetection: false,
  maxConcurrentRequests: 3
};

/**
 * ⏱️ حدود زمنية للأداء (بالميلي ثانية)
 */
export const PERFORMANCE_THRESHOLDS = {
  WRAPPER_RENDER: 100,           // إنذار إذا تجاوز الـ wrapper 100ms
  USE_EFFECT: 5,                 // إنذار إذا تجاوز useEffect 5ms
  PAGE_TYPE_DETERMINATION: 10,   // إنذار إذا تجاوز تحديد نوع الصفحة 10ms
  PROVIDERS_CREATION: 50,        // إنذار إذا تجاوز إنشاء Providers 50ms
  FONT_OPTIMIZATION: 20          // إنذار إذا تجاوز تحسين الخطوط 20ms
} as const;

/**
 * 🌐 النطاقات المدعومة في المنصة
 */
export const PLATFORM_DOMAINS = [
  'stockiha.com',
  'www.stockiha.com',
  'ktobi.online',
  'www.ktobi.online'
] as const;

/**
 * 🔤 خطوط النظام
 */
export const FONT_CONFIG = {
  PRIMARY_FONT_FAMILY: '"TajawalForced", "Tajawal", "Arial Unicode MS", "Tahoma", "Arial", sans-serif',
  FONT_STYLE_ID: 'font-override-style',
  FONT_CLASS: 'tajawal-forced'
} as const;

/**
 * ⏳ توقيتات التأخير
 */
export const DELAYS = {
  FONT_APPLICATION: 50,          // تأخير تطبيق الخطوط
  CACHE_CLEANUP: 300000,         // تنظيف الـ cache كل 5 دقائق
  PERFORMANCE_REPORT: 10000      // تقرير الأداء كل 10 ثوان
} as const;

/**
 * 🎯 تكوينات الـ Providers لكل نوع صفحة
 * مُحسّنة لتقليل التحميل وزيادة الأداء
 */
export const PROVIDER_CONFIGS: ProviderConfigMap = {
  /**
   * 🌟 صفحة الشكر - أخف ما يمكن
   */
  'thank-you': {
    core: true,
    auth: true,        // للحصول على معلومات المؤسسة
    tenant: true,
    unifiedData: false,
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: false,
  },

  /**
   * 🛍️ صفحات المنتجات العامة - محسنة للسرعة
   */
  'public-product': {
    core: true,
    auth: true,        // مطلوب للمؤسسة
    tenant: true,
    unifiedData: false,    // نستخدم ProductPageProvider بدلاً منه
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: true,     // Provider محسن للمنتجات فقط
  },

  /**
   * 🏪 صفحات المتجر العامة - متوازنة
   */
  'public-store': {
    core: true,
    auth: true,
    tenant: true,
    unifiedData: false,    // تجنب البيانات الثقيلة
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: false,
    productsPage: true,    // لصفحة المنتجات المتعددة
    storePage: true,       // للصفحة الرئيسية للمتجر
  },

  /**
   * ⚡ متجر Max - أقصى أداء مع جميع الميزات
   */
  'max-store': {
    core: true,
    auth: true,
    tenant: true,
    unifiedData: false,    // نستخدم providers محسنة
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: true,     // للمنتجات
    storePage: true,       // للصفحة الرئيسية
    productsPage: true,    // لصفحة المنتجات
  },

  /**
   * 🔐 صفحات المصادقة - خفيفة وآمنة
   */
  'auth': {
    core: true,
    auth: true,
    tenant: true,          // لمعلومات المؤسسة
    unifiedData: false,
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: false,
  },

  /**
   * 📊 لوحة التحكم - كامل المواصفات
   */
  'dashboard': {
    core: true,
    auth: true,
    tenant: true,
    unifiedData: true,     // جميع البيانات مطلوبة
    organizationData: false,   // متضمنة في SuperUnified
    dashboard: false,      // متضمنة في SuperUnified
    shop: false,          // متضمنة في SuperUnified
    apps: true,           // مطلوب للتطبيقات
    productPage: false,
    notifications: true,   // مطلوب للإشعارات
  },

  /**
   * 💰 نقطة البيع - متوازنة مع التطبيقات
   */
  'pos': {
    core: true,
    auth: true,
    tenant: true,
    unifiedData: true,     // للتطبيقات والقوائم
    organizationData: false,
    dashboard: false,
    shop: true,           // مطلوب لـ POS
    apps: true,           // للخدمات مثل repair-services
    productPage: false,
    storePage: false,
    productsPage: false,
  },

  /**
   * 📋 طلبيات نقطة البيع - محسنة مع RPC واحد
   */
  'pos-orders': {
    core: true,
    auth: true,
    tenant: true,
    unifiedData: false,    // ❌ إيقاف SuperUnifiedDataProvider
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: true,            // ✅ مطلوب للتحقق من حالة التطبيق
    productPage: false,
    storePage: false,
    productsPage: false,
    notifications: true,   // مطلوب للإشعارات
  },

  /**
   * 👨‍💼 الإدارة العليا - مبسطة وآمنة
   */
  'super-admin': {
    core: true,
    auth: true,
    tenant: false,         // لا نحتاج مؤسسة محددة
    unifiedData: false,
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: false,
  },

  /**
   * ☎️ مركز الاتصال - بيانات العملاء والطلبات
   */
  'call-center': {
    core: true,
    auth: true,
    tenant: true,
    unifiedData: true,         // للطلبات والعملاء
    organizationData: true,    // لبيانات المؤسسة
    dashboard: false,
    shop: false,
    apps: true,               // للتطبيقات المرتبطة
    productPage: false,
  },

  /**
   * 🌐 صفحات الهبوط - تسويقية خفيفة
   */
  'landing': {
    core: true,
    auth: true,            // لمعلومات المؤسسة
    tenant: true,
    unifiedData: false,
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: false,
    notifications: true,   // مطلوب للـ Navbar
  },

  /**
   * 📄 صفحات بسيطة - أدنى حد
   */
  'minimal': {
    core: true,
    auth: true,        // مطلوب للـ PublicRoute
    tenant: false,
    unifiedData: false,
    organizationData: false,
    dashboard: false,
    shop: false,
    apps: false,
    productPage: false,
  },
};

/**
 * 🔍 أنماط المسارات لتحديد نوع الصفحة
 */
export const PATH_PATTERNS = {
  PRODUCT_PURCHASE: [
    '/product-purchase-max',
    '/product-purchase-max-v2',
    '/product-max',
    '/product-public',
    /^\/products\/[^\/]+$/    // منتج واحد محدد
  ],
  
  PUBLIC_STORE: [
    '/products',
    '/category/',
    '/products/details/'
  ],
  
  AUTH: [
    '/login',
    '/signup', 
    '/admin/signup',
    '/tenant/signup',
    '/forgot-password',
    '/reset-password'
  ],
  
  DASHBOARD: [
    '/dashboard'
  ],
  
  POS: [
    '/pos',
    '/dashboard/pos-advanced'
  ],
  
  POS_ORDERS: [
    '/dashboard/pos-orders'
  ],
  
  LANDING: [
    '/features',
    '/pricing',
    '/contact',
    '/landing-page-builder',
    '/form-builder'
  ]
} as const;

/**
 * 📊 حدود الأداء لتحذيرات مختلفة
 */
export const WARNING_LEVELS = {
  INFO: 0,
  WARNING: 1, 
  ERROR: 2,
  CRITICAL: 3
} as const;

/**
 * 🎯 أولويات التحسين
 */
export const OPTIMIZATION_PRIORITIES = {
  CRITICAL: ['core', 'auth'],
  HIGH: ['tenant', 'productPage'],
  MEDIUM: ['shop', 'apps'],
  LOW: ['dashboard', 'unifiedData']
} as const;
