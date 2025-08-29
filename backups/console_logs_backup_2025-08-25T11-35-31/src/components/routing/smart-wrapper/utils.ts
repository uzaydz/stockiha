/**
 * 🛠️ Smart Provider Wrapper - Utilities & Helpers
 * أدوات ومساعدات محسنة لنظام الـ Provider الذكي
 */

import { 
  PageType, 
  DomainInfo, 
  PageTypeResult, 
  PerformanceMetrics,
  PerformanceWarning,
  PerformanceWarningType,
  CacheInfo
} from './types';
import { 
  PLATFORM_DOMAINS, 
  PATH_PATTERNS, 
  PROVIDER_CONFIGS,
  PERFORMANCE_THRESHOLDS,
  PERFORMANCE_CONFIG,
  FONT_CONFIG
} from './constants';

/**
 * 🎯 Cache للنتائج المحسوبة
 */
const PAGE_TYPE_CACHE = new Map<string, { pageType: PageType; timestamp: number }>();
const DOMAIN_INFO_CACHE = new Map<string, DomainInfo>();
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

/**
 * 📊 متتبع الأداء العالمي
 */
export const PERFORMANCE_TRACKER: PerformanceMetrics = {
  totalRenders: 0,
  totalDuplicates: 0,
  averageTime: 0,
  warnings: [],
  currentPageType: null,
  lastRenderDuration: 0
};

/**
 * 🗂️ معلومات الـ Cache
 */
export const CACHE_TRACKER: CacheInfo = {
  lastRenderedPageType: null,
  lastRenderedPathname: null,
  cacheHits: 0,
  cacheMisses: 0
};

/**
 * 🌐 استخراج معلومات النطاق والدومين
 */
export const extractDomainInfo = (): DomainInfo => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  
  // تحقق من الـ cache أولاً
  const cached = DOMAIN_INFO_CACHE.get(hostname);
  if (cached) return cached;

  // 🔥 تحسين: فحص الكشف المبكر للنطاق
  let earlyDomainInfo: DomainInfo | null = null;
  try {
    const isEarlyDetected = sessionStorage.getItem('bazaar_early_domain_detection') === 'true';
    const earlyHostname = sessionStorage.getItem('bazaar_early_hostname');
    const earlySubdomain = sessionStorage.getItem('bazaar_early_subdomain');
    
    if (isEarlyDetected && earlyHostname === hostname) {
      console.log('🚀 SmartWrapper: استخدام الكشف المبكر للنطاق:', { earlyHostname, earlySubdomain });
      
      const isLocalhost = hostname.includes('localhost');
      const isPlatformDomain = PLATFORM_DOMAINS.includes(hostname as any);
      
      earlyDomainInfo = {
        hostname,
        isLocalhost,
        subdomain: earlySubdomain,
        customDomain: !isPlatformDomain && !earlySubdomain ? hostname : null,
        isPlatformDomain
      };
      
      // حفظ في الـ cache
      DOMAIN_INFO_CACHE.set(hostname, earlyDomainInfo);
      return earlyDomainInfo;
    }
  } catch (e) {
    console.warn('تحذير: فشل في قراءة الكشف المبكر للنطاق:', e);
  }

  const isLocalhost = hostname.includes('localhost');
  const isPlatformDomain = PLATFORM_DOMAINS.includes(hostname as any);
  
  let subdomain: string | null = null;
  let customDomain: string | null = null;

  if (isLocalhost) {
    // localhost: البحث عن subdomain
    const parts = hostname.split('.');
    if (parts.length > 1) {
      subdomain = parts[0];
    }
  } else if (isPlatformDomain) {
    // نطاق المنصة - لا subdomain
    subdomain = null;
  } else {
    // التحقق من subdomain أو custom domain
    if (hostname.includes('stockiha.com') || hostname.includes('ktobi.online')) {
      const parts = hostname.split('.');
      if (parts.length > 2 && parts[0] !== 'www') {
        subdomain = parts[0];
      }
    } else {
      // custom domain
      customDomain = hostname;
    }
  }

  const domainInfo: DomainInfo = {
    hostname,
    isLocalhost,
    subdomain,
    customDomain,
    isPlatformDomain
  };

  // حفظ في الـ cache
  DOMAIN_INFO_CACHE.set(hostname, domainInfo);
  
  return domainInfo;
};

/**
 * 🎯 تحديد نوع الصفحة من المسار بشكل محسن
 */
export const determinePageType = (pathname: string): PageType => {
  // تنظيف الـ cache القديم أولاً
  cleanupCache();
  
  // التحقق من الـ cache
  const cacheKey = pathname;
  const cached = PAGE_TYPE_CACHE.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    CACHE_TRACKER.cacheHits++;
    return cached.pageType;
  }

  CACHE_TRACKER.cacheMisses++;
  const domainInfo = extractDomainInfo();
  let pageType: PageType;

  // 🔥 تحسين: استخدام switch بدلاً من if متداخلة
  if (domainInfo.isPlatformDomain) {
    pageType = determinePageTypeForPlatformDomain(pathname);
  } else {
    pageType = determinePageTypeForSubdomainOrCustom(pathname, domainInfo);
  }

  // حفظ في الـ cache
  PAGE_TYPE_CACHE.set(cacheKey, { 
    pageType, 
    timestamp: Date.now() 
  });

  return pageType;
};

/**
 * 🌐 تحديد نوع الصفحة لنطاقات المنصة
 */
const determinePageTypeForPlatformDomain = (pathname: string): PageType => {
  if (pathname === '/') return 'landing';
  
  // استخدام Map للأداء الأفضل
  const pathTypeMap = new Map<string, PageType>([
    ['/pos', 'pos'],
    ['/dashboard/pos-advanced', 'pos'],
    ['/dashboard/pos-orders', 'pos-orders'],
    ['/super-admin', 'super-admin']
  ]);

  // التحقق المباشر أولاً
  if (pathTypeMap.has(pathname)) {
    return pathTypeMap.get(pathname)!;
  }

  // التحقق من الأنماط
  if (PATH_PATTERNS.AUTH.some(pattern => pathname.includes(pattern))) {
    return 'auth';
  }
  
  if (PATH_PATTERNS.DASHBOARD.some(pattern => pathname.includes(pattern))) {
    return 'dashboard';
  }
  
  if (PATH_PATTERNS.LANDING.some(pattern => pathname.includes(pattern))) {
    return 'landing';
  }
  
  if (pathname.includes('/call-center')) {
    return 'call-center';
  }

  return 'minimal';
};

/**
 * 🏪 تحديد نوع الصفحة للنطاقات الفرعية أو المخصصة
 */
const determinePageTypeForSubdomainOrCustom = (pathname: string, domainInfo: DomainInfo): PageType => {
  const hasSubdomainOrCustom = domainInfo.subdomain || domainInfo.customDomain;

  // صفحة الشكر دائماً خفيفة
  if (pathname === '/thank-you') {
    return 'thank-you';
  }

  // الصفحة الرئيسية مع subdomain = Max Store
  if (pathname === '/' && hasSubdomainOrCustom) {
    return 'max-store';
  }

  // صفحات المنتجات
  if (isProductPath(pathname) && hasSubdomainOrCustom) {
    return 'public-product';
  }

  // صفحات المتجر
  if (isStorePath(pathname) && hasSubdomainOrCustom) {
    return 'public-store';
  }

  // للـ localhost بدون subdomain
  if (domainInfo.isLocalhost && !domainInfo.subdomain) {
    return determinePageTypeForLocalhost(pathname);
  }

  return 'minimal';
};

/**
 * 🏠 تحديد نوع الصفحة لـ localhost
 */
const determinePageTypeForLocalhost = (pathname: string): PageType => {
  if (PATH_PATTERNS.AUTH.some(pattern => pathname.includes(pattern))) {
    return 'auth';
  }
  
  if (pathname === '/pos' || pathname === '/dashboard/pos-advanced') {
    return 'pos';
  }
  
  if (pathname === '/dashboard/pos-orders') {
    return 'pos-orders';
  }
  
  if (PATH_PATTERNS.DASHBOARD.some(pattern => pathname.includes(pattern))) {
    return 'dashboard';
  }
  
  if (pathname.includes('/super-admin')) {
    return 'super-admin';
  }
  
  if (pathname.includes('/call-center')) {
    return 'call-center';
  }

  return 'landing'; // بدلاً من minimal للحصول على AuthProvider
};

/**
 * 🛍️ التحقق من مسارات المنتجات
 */
const isProductPath = (pathname: string): boolean => {
  return PATH_PATTERNS.PRODUCT_PURCHASE.some(pattern => {
    if (typeof pattern === 'string') {
      return pathname.includes(pattern);
    }
    return pattern.test(pathname);
  });
};

/**
 * 🏪 التحقق من مسارات المتجر
 */
const isStorePath = (pathname: string): boolean => {
  return PATH_PATTERNS.PUBLIC_STORE.some(pattern => pathname.includes(pattern));
};

/**
 * 🧹 تنظيف الـ cache من البيانات القديمة
 */
const cleanupCache = (): void => {
  const now = Date.now();
  
  for (const [key, value] of PAGE_TYPE_CACHE.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      PAGE_TYPE_CACHE.delete(key);
    }
  }
};

/**
 * 📊 إضافة تحذير أداء
 */
export const addPerformanceWarning = (
  type: PerformanceWarningType,
  data: any,
  pageType?: PageType,
  pathname?: string
): void => {


  const warning: PerformanceWarning = {
    type,
    data,
    timestamp: Date.now(),
    pageType,
    pathname
  };

  PERFORMANCE_TRACKER.warnings.push(JSON.stringify(warning));
  
  // الاحتفاظ بآخر 50 تحذير فقط
  if (PERFORMANCE_TRACKER.warnings.length > 50) {
    PERFORMANCE_TRACKER.warnings = PERFORMANCE_TRACKER.warnings.slice(-50);
  }

  // طباعة التحذيرات الحرجة
  if (type === 'VERY_SLOW_WRAPPER' || type === 'MEMORY_LEAK_DETECTED') {
    console.warn(`🚨 [SmartWrapper] ${type}:`, data);
  }
};

/**
 * ⏱️ قياس وقت تنفيذ دالة
 */
export const measurePerformance = <T>(
  fn: () => T,
  warningType: PerformanceWarningType,
  threshold: number,
  context?: any
): T => {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  if (duration > threshold) {
    addPerformanceWarning(warningType, {
      duration,
      threshold,
      context
    });
  }

  return result;
};

/**
 * 🎨 تطبيق الخطوط المحسن
 */
export const applyFontsOptimized = (): void => {
  if (!PERFORMANCE_CONFIG.enableFontOptimization) return;

  requestAnimationFrame(() => {
    const start = performance.now();
    
    // إضافة class للجسم
    document.body.classList.add(FONT_CONFIG.FONT_CLASS);
    
    // إنشاء stylesheet مرة واحدة فقط
    if (!document.getElementById(FONT_CONFIG.FONT_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = FONT_CONFIG.FONT_STYLE_ID;
      style.textContent = `
        .${FONT_CONFIG.FONT_CLASS} * {
          font-family: ${FONT_CONFIG.PRIMARY_FONT_FAMILY} !important;
        }
      `;
      document.head.appendChild(style);
    }

    const duration = performance.now() - start;
    if (duration > PERFORMANCE_THRESHOLDS.FONT_OPTIMIZATION) {
      addPerformanceWarning('FONT_OPTIMIZATION_SLOW', { duration });
    }
  });
};

/**
 * 📊 الحصول على تقرير الأداء
 */
export const getPerformanceReport = () => {
  return {
    ...PERFORMANCE_TRACKER,
    cacheInfo: CACHE_TRACKER,
    cacheSize: PAGE_TYPE_CACHE.size,
    domainCacheSize: DOMAIN_INFO_CACHE.size
  };
};

/**
 * 🧹 إعادة تعيين مقاييس الأداء
 */
export const resetPerformanceMetrics = (): void => {
  PERFORMANCE_TRACKER.totalRenders = 0;
  PERFORMANCE_TRACKER.totalDuplicates = 0;
  PERFORMANCE_TRACKER.averageTime = 0;
  PERFORMANCE_TRACKER.warnings = [];
  PERFORMANCE_TRACKER.currentPageType = null;
  PERFORMANCE_TRACKER.lastRenderDuration = 0;
  
  CACHE_TRACKER.cacheHits = 0;
  CACHE_TRACKER.cacheMisses = 0;
  
  PAGE_TYPE_CACHE.clear();
  DOMAIN_INFO_CACHE.clear();
};

/**
 * 📊 الحصول على تقرير الأداء المفصل
 */
export const getDetailedPerformanceReport = () => {
  return {
    performance: { ...PERFORMANCE_TRACKER },
    cache: { ...CACHE_TRACKER },
    cacheStats: {
      pageTypeCacheSize: PAGE_TYPE_CACHE.size,
      domainCacheSize: DOMAIN_INFO_CACHE.size,
      hitRatio: CACHE_TRACKER.cacheHits / (CACHE_TRACKER.cacheHits + CACHE_TRACKER.cacheMisses) || 0
    },
    recommendations: generatePerformanceRecommendations(),
    timestamp: Date.now()
  };
};

/**
 * 💡 توليد توصيات الأداء
 */
const generatePerformanceRecommendations = (): string[] => {
  const recommendations: string[] = [];
  
  if (PERFORMANCE_TRACKER.averageTime > 50) {
    recommendations.push('يُنصح بتقليل عمق تداخل الـ Providers');
  }
  
  if (PERFORMANCE_TRACKER.totalDuplicates > PERFORMANCE_TRACKER.totalRenders * 0.2) {
    recommendations.push('نسبة عالية من التحميل المتكرر - راجع منطق التوجيه');
  }
  
  if (PERFORMANCE_TRACKER.warnings.length > 20) {
    recommendations.push('عدد كبير من تحذيرات الأداء - راجع العمليات البطيئة');
  }

  const hitRatio = CACHE_TRACKER.cacheHits / (CACHE_TRACKER.cacheHits + CACHE_TRACKER.cacheMisses);
  if (hitRatio < 0.7) {
    recommendations.push('كفاءة الـ Cache منخفضة - راجع استراتيجية التخزين المؤقت');
  }

  if (recommendations.length === 0) {
    recommendations.push('الأداء محسن بشكل ممتاز! 🚀');
  }

  return recommendations;
};

/**
 * 🎯 الحصول على نتيجة تحديد نوع الصفحة الكاملة
 */
export const getPageTypeResult = (pathname: string): PageTypeResult => {
  const pageType = determinePageType(pathname);
  const config = PROVIDER_CONFIGS[pageType];
  const domainInfo = extractDomainInfo();
  const cached = PAGE_TYPE_CACHE.has(pathname);

  return {
    pageType,
    config,
    domainInfo,
    cached
  };
};
