const MAIN_START_TIME = performance.now();
console.log('🎯 [MAIN.TSX] بدء تشغيل التطبيق', {
  timestamp: new Date().toISOString(),
  startTime: MAIN_START_TIME,
  url: window.location.href,
  userAgent: navigator.userAgent.substring(0, 50) + '...'
});

// 🎨 تهيئة معالج أخطاء CSS — سيتم تأجيله لتقليل JS المبدئي
// import './utils/cssErrorHandler';

// font debugger removed after resolving the issue

// ✅ تم تحديث النظام لتحميل جميع صور الألوان دائماً

// ⚡ تحسين: تحميل فوري ومتزامن للبيانات الأولية
const startEarlyPreloads = async () => {
  const preloadStartTime = performance.now();
  try {
    console.log('🚀 [MAIN.TSX] بدء تحميل البيانات الأولية للمتجر', {
      timing: preloadStartTime - MAIN_START_TIME
    });
    
    const [earlyPreloadResult, productPreloadResult] = await Promise.allSettled([
      import('./utils/earlyPreload').then(m => m.startEarlyPreload()),
      // تخطي product page preload هنا لأنه يحتاج إلى معاملات محددة
      Promise.resolve({ success: true, data: null })
    ]);

    if (earlyPreloadResult.status === 'fulfilled' && earlyPreloadResult.value.success) {
      const preloadEndTime = performance.now();
      console.log('✅ [MAIN.TSX] تم تحميل البيانات الأولية بنجاح', {
        timing: preloadEndTime - preloadStartTime,
        totalTime: preloadEndTime - MAIN_START_TIME,
        dataSize: JSON.stringify(earlyPreloadResult.value.data || {}).length
      });
      
      // إرسال حدث لإعلام المكونات أن البيانات جاهزة
      window.dispatchEvent(new CustomEvent('storeInitDataReady', {
        detail: {
          data: earlyPreloadResult.value.data,
          timestamp: Date.now(),
          loadTime: preloadEndTime - preloadStartTime
        }
      }));

      // حفظ البيانات في window object للوصول السريع
      (window as any).__EARLY_STORE_DATA__ = {
        data: earlyPreloadResult.value.data,
        timestamp: Date.now()
      };
      
      // 🚀 تطبيق فوري للألوان والإعدادات
      const data = earlyPreloadResult.value.data;
      console.log('🎨 [main.tsx] فحص البيانات للألوان:', {
        hasData: !!data,
        hasOrgSettings: !!data?.organization_settings,
        settingsKeys: data?.organization_settings ? Object.keys(data.organization_settings) : [],
        primaryColor: data?.organization_settings?.theme_primary_color,
        secondaryColor: data?.organization_settings?.theme_secondary_color,
        accentColor: data?.organization_settings?.accent_color,
        // إضافة معلومات إضافية للفهم
        rawSettings: data?.organization_settings
      });
      
      if (data?.organization_settings) {
        const settings = data.organization_settings;
        
        // تطبيق الألوان فوراً - استخدام الأسماء الصحيحة من قاعدة البيانات
        if (settings.theme_primary_color) {
          console.log('🎯 [main.tsx] تطبيق فوري للون الأساسي:', settings.theme_primary_color);
          document.documentElement.style.setProperty('--primary-color', settings.theme_primary_color);
          document.documentElement.style.setProperty('--primary', settings.theme_primary_color);
          document.documentElement.style.setProperty('--color-primary', settings.theme_primary_color);
          document.documentElement.style.setProperty('--tw-color-primary', settings.theme_primary_color);
        } else {
          console.log('⚠️ [main.tsx] لا يوجد لون أساسي في البيانات');
        }
        
        if (settings.theme_secondary_color) {
          console.log('🎯 [main.tsx] تطبيق فوري للون الثانوي:', settings.theme_secondary_color);
          document.documentElement.style.setProperty('--secondary-color', settings.theme_secondary_color);
          document.documentElement.style.setProperty('--secondary', settings.theme_secondary_color);
        } else {
          console.log('⚠️ [main.tsx] لا يوجد لون ثانوي في البيانات');
        }
        
        if (settings.accent_color) {
          console.log('🎯 [main.tsx] تطبيق فوري للون التمييز:', settings.accent_color);
          document.documentElement.style.setProperty('--accent-color', settings.accent_color);
          document.documentElement.style.setProperty('--accent', settings.accent_color);
        } else {
          console.log('⚠️ [main.tsx] لا يوجد لون تمييز في البيانات');
        }
        
        // تطبيق اتجاه النص حسب اللغة
        const language = settings.default_language || 'en';
        if (language === 'ar') {
          document.documentElement.dir = 'rtl';
          document.documentElement.lang = 'ar';
        } else {
          document.documentElement.dir = 'ltr';
          document.documentElement.lang = language;
        }
        
        console.log('🌐 [main.tsx] تطبيق اللغة والاتجاه:', {
          language,
          direction: language === 'ar' ? 'rtl' : 'ltr'
        });
      }
    } else {
      const failTime = performance.now();
      console.error('❌ [MAIN.TSX] فشل في تحميل البيانات الأولية', {
        timing: failTime - preloadStartTime,
        totalTime: failTime - MAIN_START_TIME,
        error: earlyPreloadResult.status === 'rejected' ? earlyPreloadResult.reason : 'غير محدد'
      });
    }

    if (productPreloadResult.status === 'fulfilled') {
      console.log('✅ [main.tsx] منتج preload مكتمل');
    }
  } catch (error) {
    const errorTime = performance.now();
    console.error('❌ [MAIN.TSX] خطأ في تحميل البيانات', {
      error: error instanceof Error ? error.message : String(error),
      timing: errorTime - preloadStartTime,
      totalTime: errorTime - MAIN_START_TIME,
      stack: error instanceof Error ? error.stack?.substring(0, 200) : undefined
    });
  }
};

// 🚀 بدء preloads: تأجيل إلى الخمول لتقليل زمن حظر الإقلاع وعدد الطلبات المبكرة
try {
  const scheduleEarlyPreload = () => startEarlyPreloads();
  if (typeof (window as any).requestIdleCallback === 'function') {
    (window as any).requestIdleCallback(scheduleEarlyPreload, { timeout: 1200 });
  } else {
    setTimeout(scheduleEarlyPreload, 800);
  }
} catch {
  setTimeout(() => startEarlyPreloads(), 800);
}

// 🎯 تطبيق فافيكون مبكراً اعتماداً على بيانات preload/الإعدادات المحلية لتفادي الأيقونة الافتراضية
(function applyEarlyFavicon() {
  try {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const parts = hostname.split('.');
    const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
    const platformDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
    const isPlatform = platformDomains.some(d => hostname.endsWith(d));
    const hasSubdomain = !isLocalhost && isPlatform && parts.length > 2 && parts[0] !== 'www';
    const isCustomDomain = !isLocalhost && !isPlatform;

    // استخراج معرف المؤسسة أولاً
    let orgId: string | null = localStorage.getItem('bazaar_organization_id');
    let iconUrl: string | null = null;

    if (orgId) {
      try {
        const settingsRaw = localStorage.getItem(`bazaar_org_settings_${orgId}`);
        if (settingsRaw) {
          const settings = JSON.parse(settingsRaw);
          iconUrl = settings?.favicon_url || settings?.logo_url || null;
        }
      } catch {}
    }

    // إذا لم نجد، جرّب بيانات early preload وفق المعرّف المتاح
    if (!iconUrl) {
      let storeIdentifier: string | null = null;
      if (isLocalhost && parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127') {
        storeIdentifier = parts[0];
      } else if (hasSubdomain) {
        storeIdentifier = parts[0];
      } else if (isCustomDomain) {
        storeIdentifier = hostname.startsWith('www.') ? hostname.substring(4) : hostname;
      }

      if (storeIdentifier) {
        try {
          const earlyRaw = localStorage.getItem(`early_preload_${storeIdentifier}`);
          if (earlyRaw) {
            const early = JSON.parse(earlyRaw);
            const data = early?.data;
            iconUrl = data?.organization_settings?.favicon_url || data?.organization_settings?.logo_url || null;
          }
        } catch {}
      }
    }

    if (iconUrl) {
      // إزالة أيقونات حالية مضافة في index.html
      document.querySelectorAll('link[rel*="icon"]').forEach((el) => el.parentElement?.removeChild(el));

      const withBust = `${iconUrl}?v=${Date.now()}`;

      const linkIcon = document.createElement('link');
      linkIcon.rel = 'icon';
      linkIcon.type = 'image/png';
      linkIcon.href = withBust;
      document.head.appendChild(linkIcon);

      const linkApple = document.createElement('link');
      linkApple.rel = 'apple-touch-icon';
      linkApple.href = withBust;
      document.head.appendChild(linkApple);
    }
  } catch {}
})();

// 🚀 بدء preload صفحة المنتج إذا كان المستخدم في صفحة منتج (سيتم الاستيراد ديناميكياً)
// import { startProductPagePreload } from './utils/productPagePreloader';

// دالة كشف ما إذا كان المستخدم في صفحة منتج
const isProductPage = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const pathname = window.location.pathname;
  return pathname.includes('/product-purchase-max-v2/') || 
         pathname.includes('/product-purchase/') ||
         pathname.includes('/product/');
};

// دالة استخراج معرف المنتج من المسار
const extractProductIdFromPath = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const pathname = window.location.pathname;
  const productMatch = pathname.match(/\/(?:product-purchase-max-v2|product-purchase|product)\/([^\/]+)/);
  return productMatch ? productMatch[1] : null;
};

// دالة استخراج معرف المؤسسة من النطاق
const extractOrganizationIdFromDomain = async (): Promise<string | null> => {
  try {
    // محاولة فورية من window object
    try {
      const win: any = window as any;
      const early = win.__EARLY_STORE_DATA__?.data || win.__EARLY_STORE_DATA__;
      const shared = win.__SHARED_STORE_DATA__;
      const fromWin = early?.organization_details?.id || early?.organization?.id || shared?.organization?.id;
      if (fromWin) return String(fromWin);
    } catch {}

    const hostname = window.location.hostname;
    const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
    const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
    const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
    const isCustomDomain = !isLocalhost && !isBaseDomain;

    // إذا كان localhost، استخرج subdomain
    if (isLocalhost && hostname.includes('localhost')) {
      const subdomain = hostname.split('.')[0];
      if (subdomain && subdomain !== 'localhost') {
        // استخدم localStorage للحصول على معرف المؤسسة
        const cachedOrg = localStorage.getItem(`early_preload_${subdomain}`);
        if (cachedOrg) {
          const parsed = JSON.parse(cachedOrg);
          // استخرج معرف المؤسسة من البيانات المحفوظة
          if (parsed.data?.organization?.id) {
            return parsed.data.organization.id;
          }
        }
      }
    }

    // للنطاقات المخصصة، نحاول استخراج subdomain أولاً
    if (isCustomDomain) {
      const domainParts = hostname.split('.');
      if (domainParts.length > 2 && domainParts[0] && domainParts[0] !== 'www') {
        const possibleSubdomain = domainParts[0].toLowerCase().trim();

        // ابحث في localStorage باستخدام subdomain المستخرج
        const cachedOrg = localStorage.getItem(`early_preload_${possibleSubdomain}`);
        if (cachedOrg) {
          const parsed = JSON.parse(cachedOrg);
          if (parsed.data?.organization?.id) {
            return parsed.data.organization.id;
          }
        }

        // إذا لم يعمل subdomain، ابحث بالنطاق كاملاً
        const cachedOrgFull = localStorage.getItem(`early_preload_${hostname}`);
        if (cachedOrgFull) {
          const parsed = JSON.parse(cachedOrgFull);
          if (parsed.data?.organization?.id) {
            return parsed.data.organization.id;
          }
        }
      }
    }

    // ابحث في localStorage العام
    const orgId = localStorage.getItem('bazaar_organization_id');
    if (orgId && orgId.length > 10) {
      return orgId;
    }

    return null;
  } catch (error) {
    return null;
  }
};

// خيار A: تعطيل preload الخاص بالمنتج على صفحة المنتج لتوحيد الطلبات ومنع التكرار
const ENABLE_PRODUCT_PRELOADER = false;

// بدء preload صفحة المنتج (معطل افتراضياً)
const startProductPagePreloadIfNeeded = async () => {
  if (!isProductPage() || !ENABLE_PRODUCT_PRELOADER) return;
  // في حال تم تفعيله لاحقاً: سيتم انتظار توفر organizationId عبر الأحداث قبل الجلب
};

// إضافة event listener للاستماع لحفظ بيانات المؤسسة
const handleOrganizationDataSaved = (event: any) => {
  if (event.detail?.organizationId && isProductPage()) {
    const productId = extractProductIdFromPath();
    if (productId) {

      import('./utils/productPagePreloader').then(({ startProductPagePreload }) => startProductPagePreload({
        productId,
        organizationId: event.detail.organizationId,
        // توحيد النطاق مع hook الصفحة لمنع التكرار
        dataScope: 'full',
        forceUltraOnly: false
      })).then(result => {
        if (result.success) {
        } else {
        }
      }).catch(error => {
      });
    }
  }
};

// الاستماع لأحداث حفظ بيانات المؤسسة
if (ENABLE_PRODUCT_PRELOADER) {
  window.addEventListener('organizationDataSaved', handleOrganizationDataSaved);
  window.addEventListener('domain-detected', handleOrganizationDataSaved);
}

// بدء preload صفحة المنتج
startProductPagePreloadIfNeeded();

// i18n is initialized lazily via I18nSEOWrapper to keep initial JS small

// 🎨 تحميل CSS المؤجل لتحسين الأداء (تم استيراده أعلى الملف بالفعل)
// import { loadNonCriticalCSSAfterPageLoad } from './utils/loadNonCriticalCSS';
// تأجيل تحسينات الأداء العامة لتقليل JS المبدئي
// import './utils/performanceOptimizations';

// 🚀 Core React - Essential Only
import React from 'react';
import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';

// 🔍 تتبع انتهاء الاستيراد الأساسي
const REACT_IMPORTS_TIME = performance.now();

// 🚫 تعطيل React DevTools Hook مبكراً لتفعيل Fast Refresh
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // التحقق من وجود الخاصية قبل محاولة حذفها
  if (window.hasOwnProperty('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
    try {
      // محاولة حذف الخاصية بطريقة آمنة
      const descriptor = Object.getOwnPropertyDescriptor(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__');
      if (descriptor && descriptor.configurable) {
        delete (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      } else if (descriptor && descriptor.writable) {
        // إذا كانت الخاصية قابلة للكتابة، نقوم بتعطيلها
        (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
          isDisabled: true,
          supportsFiber: false,
          supportsProfiling: false,
          inject: () => {},
          on: () => {},
          off: () => {},
          sub: () => {},
          rendererPackageName: 'react-dom',
          version: '18.0.0',
          rendererConfig: {},
          hook: null
        };
      } else {
        // إذا كانت الخاصية محمية تماماً، نتجاهلها
      }
    } catch (e) {
      // تجاهل الأخطاء إذا كانت الخاصية محمية
      
      // محاولة تعطيلها بطريقة أخرى
      try {
        // محاولة إعادة تعريف الخاصية إذا كانت قابلة للإعادة التعريف
        const descriptor = Object.getOwnPropertyDescriptor(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__');
        if (descriptor && descriptor.configurable) {
          Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
            value: {
              isDisabled: true,
              supportsFiber: false,
              supportsProfiling: false,
              inject: () => {},
              on: () => {},
              off: () => {},
              sub: () => {},
              rendererPackageName: 'react-dom',
              version: '18.0.0',
              rendererConfig: {},
              hook: null
            },
            writable: false,
            configurable: false
          });
        } else {
        }
      } catch (disableError) {
      }
    }
  }
  
  // إنشاء hook فارغ فقط إذا لم يكن موجوداً بالفعل
  if (!window.hasOwnProperty('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
    try {
      Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
        value: {
          isDisabled: true,
          supportsFiber: false,
          supportsProfiling: false,
          inject: () => {},
          on: () => {},
          off: () => {},
          sub: () => {},
          rendererPackageName: 'react-dom',
          version: '18.0.0',
          rendererConfig: {},
          hook: null
        },
        writable: true,
        configurable: true
      });
    } catch (e) {
    }
  }
}

// 🎨 تحميل CSS الأساسي أولاً
const CSS_START_TIME = performance.now();
import './index.css';
import './App.css';
import { loadNonCriticalCSSAfterPageLoad } from './utils/loadNonCriticalCSS';
// تحميل CSS غير الحرج والخطوط بعد الإقلاع - معطل لأن CSS محمل مع HTML
// loadNonCriticalCSSAfterPageLoad();
const CSS_END_TIME = performance.now();

// 🔤 Font Loading Optimization - CSS فقط، بدون JavaScript
document.documentElement.classList.add('font-loading');

// تحقق سريع من تحميل الخطوط
document.fonts.ready.then(() => {
  document.documentElement.classList.remove('font-loading');
  document.documentElement.classList.add('font-loaded');
}).catch(() => {
  document.documentElement.classList.remove('font-loading');
  document.documentElement.classList.add('font-error');
});
const ROUTER_START_TIME = performance.now();
// Defer BrowserRouter import to reduce initial bundle
const BrowserRouter = React.lazy(() => 
  import('react-router-dom').then(module => ({ default: module.BrowserRouter }))
);
const ROUTER_END_TIME = performance.now();

const APP_START_TIME = performance.now();
// Defer App import to reduce initial JS execution
const App = React.lazy(() => import('./App.tsx'));
const APP_END_TIME = performance.now();

// 🔧 Make React globally available if needed
(window as any).React = React;

// ⚡ Essential polyfills only

// 🚫 نظام منع الطلبات المتكررة + preload manager سيتم تأجيلهما لتقليل JS المبدئي
// import { initializeRequestBlocker } from './lib/requestBlocker';
// import './lib/preloadManager';

// 🔧 إضافة polyfill لـ requestIdleCallback
if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  (window as any).requestIdleCallback = function(callback: any, options?: any) {
    const start = Date.now();
    return setTimeout(function() {
      callback({
        didTimeout: false,
        timeRemaining: function() {
          return Math.max(0, 50 - (Date.now() - start));
        }
      });
    }, 1);
  };
  
  (window as any).cancelIdleCallback = function(id: any) {
    clearTimeout(id);
  };
}

// 🚀 تطبيق تحسينات الأداء فوراً
const initPerformanceOptimizations = () => {
  // تقليل console errors في production
  if (import.meta.env.PROD) {
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ').toLowerCase();
      
      // تجاهل أخطاء WebSocket و HMR في production
      if (
        message.includes('websocket') ||
        message.includes('hmr') ||
        message.includes('vite') ||
        message.includes('failed to connect')
      ) {
        return;
      }
      
      // عرض الأخطاء الأخرى
      originalError.apply(console, args);
    };
  }

  // تحسين CSS loading
  if (typeof window !== 'undefined') {
    // منع FOUC (Flash of Unstyled Content)
    document.documentElement.style.visibility = 'visible';
    
    // تطبيق الخطوط فوراً لخفض LCP
    const applyFonts = () => {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          // تطبيق الخطوط
          document.body.classList.add('tajawal-forced');
        });
      } else {
        // fallback للمتصفحات القديمة
        setTimeout(() => {
          document.body.classList.add('tajawal-forced');
        }, 25); // ✅ تقليل من 50ms إلى 25ms لتحسين الأداء
      }
    };
    
    // استخدام requestIdleCallback إذا كان متوفراً، وإلا استخدم setTimeout
    if (window.requestIdleCallback) {
      window.requestIdleCallback(applyFonts, { timeout: 0 }); // ✅ إزالة التأخير لحل مشكلة عرض المتجر
    } else {
      setTimeout(applyFonts, 0); // ✅ إزالة التأخير لحل مشكلة عرض المتجر
    }
  }
};

initPerformanceOptimizations();

// 🚫 تفعيل نظام منع الطلبات المتكررة — مؤجل لتقليل Boot-up
if (typeof window !== 'undefined') {
  const enableBlocker = () => {
    import('./lib/requestBlocker')
      .then(({ initializeRequestBlocker }) => initializeRequestBlocker())
      .catch(() => {});
    // تفعيل preload manager بعد blocker
    import('./lib/preloadManager').catch(() => {});
  };
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(enableBlocker, { timeout: 2000 });
  } else {
    setTimeout(enableBlocker, 1200);
  }
}

// تم نقل إدارة QueryClient إلى SmartProviderWrapper باستخدام '@/lib/config/queryClient'

// 🌐 Browser Router Configuration
const browserRouterOptions = {
  future: {
    v7_startTransition: true,
    v7_normalizeFormMethod: true,
    v7_relativeSplatPath: true
  },
  basename: '/'
};

// Simple loading component (kept for potential future use)
const SimpleLoader = () => null;

// 🎯 Essential Providers Only - optimized for performance
const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <React.Suspense fallback={null}>
      <BrowserRouter future={browserRouterOptions.future}>
        {children}
      </BrowserRouter>
    </React.Suspense>
  );
};

// 🎨 Render Application
const rootElement = document.getElementById('root');
let root = (rootElement as any)?.__reactRootContainer;

if (rootElement && !root) {
  root = ReactDOM.createRoot(rootElement);
  (rootElement as any).__reactRootContainer = root;
}

  if (root) {
  const RENDER_START_TIME = performance.now();
  
  // حفظ الأوقات عالمياً
  (window as any).__APP_TIMING__ = {
    mainStart: MAIN_START_TIME,
    reactImports: REACT_IMPORTS_TIME,
    cssLoad: CSS_END_TIME - CSS_START_TIME,
    routerLoad: ROUTER_END_TIME - ROUTER_START_TIME,
    appLoad: APP_END_TIME - APP_START_TIME,
    renderStart: RENDER_START_TIME,
    totalBeforeRender: RENDER_START_TIME - MAIN_START_TIME
  };
  
  console.log('⚡ [MAIN.TSX] بدء رندر التطبيق', {
    timings: (window as any).__APP_TIMING__,
    memoryUsage: (performance as any).memory ? {
      used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB',
      total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + 'MB'
    } : 'غير متوفر'
  });
  
  // إزالة فرض الخط عبر الجافاسكربت لضمان اتساق CSS
  
  // عرض التطبيق فوراً - بدون StrictMode في التطوير
  if (import.meta.env.DEV) {
    // في التطوير: بدون StrictMode لتقليل إعادة الرندر
    root.render(
      <AppProviders>
        <React.Suspense fallback={null}>
          <App />
        </React.Suspense>
      </AppProviders>
    );
  } else {
    // في الإنتاج: مع StrictMode للأمان
    root.render(
      <StrictMode>
        <AppProviders>
          <React.Suspense fallback={null}>
            <App />
          </React.Suspense>
        </AppProviders>
      </StrictMode>
    );
  }
  
  // ✅ إزالة شاشة التحميل بأسرع ما يمكن بعد أول رندر
  try {
    const remove = (window as any).removeInitialLoading;
    if (typeof remove === 'function') {
      requestAnimationFrame(() => remove());
      // احتياط: في حال لم تنجح rAF لسبب ما
      setTimeout(() => { try { remove(); } catch {} }, 1200);
    }
  } catch {}

  // 🎨 بدء تحميل CSS غير الحرج بعد تشغيل التطبيق - معطل لأن CSS محمل مع HTML
  // loadNonCriticalCSSAfterPageLoad();
  
  const RENDER_END_TIME = performance.now();
  
  // حفظ وقت انتهاء الرندر
  (window as any).__APP_TIMING__.renderEnd = RENDER_END_TIME;
  (window as any).__APP_TIMING__.totalToRender = RENDER_END_TIME - MAIN_START_TIME;
  
  console.log('🎉 [MAIN.TSX] اكتمل رندر التطبيق', {
    renderTime: RENDER_END_TIME - RENDER_START_TIME,
    totalBootTime: RENDER_END_TIME - MAIN_START_TIME,
    finalTimings: (window as any).__APP_TIMING__
  });

  // 📊 إضافة مراقبة شاملة للأداء
  setTimeout(() => {
    const performanceReport = {
      totalBootTime: RENDER_END_TIME - MAIN_START_TIME,
      memoryUsage: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      } : 'غير متوفر',
      navigationTiming: performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming,
      resourceTiming: performance.getEntriesByType('resource').length,
      url: window.location.href,
      userAgent: navigator.userAgent.substring(0, 100) + '...'
    };
    
    console.log('📊 [MAIN.TSX] تقرير الأداء الشامل', performanceReport);
    
    // حفظ التقرير في window للوصول إليه لاحقاً
    (window as any).__PERFORMANCE_REPORT__ = performanceReport;
  }, 2000);

} else {
}

// 🚀 تنظيف Service Workers القديمة (تم حذف Service Worker لأنه يسبب مشاكل في الأداء)
if ('serviceWorker' in navigator) {
  // إلغاء تسجيل جميع Service Workers القديمة أولاً
  navigator.serviceWorker.getRegistrations().then(registrations => {
    const hasActiveWorkers = registrations.length > 0;
    registrations.forEach(registration => {
      
      registration.unregister();
    });

    // إذا كان هناك Service Workers نشطة، أعد تحميل الصفحة (تعطيل في التطوير)
    if (hasActiveWorkers && !import.meta.env.DEV) {
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  });

  // أداة تنظيف Service Worker متاحة عبر console
  (window as any).clearServiceWorkers = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        
        registrations.forEach((registration, index) => {
          
          registration.unregister().then(() => {
            
          });
        });
        if (registrations.length > 0) {
          
        }
      });
    } else {
      
    }
  };

  // Service Worker cleanup function available globally
}

// 🚀 تأجيل الأنظمة غير الحرجة لما بعد التفاعل الأول
const deferNonCriticalSystems = () => {
  const deferStartTime = performance.now();
  console.log('⏰ [MAIN.TSX] بدء تحميل الأنظمة غير الحرجة', {
    timing: deferStartTime - MAIN_START_TIME
  });
  
  // إزالة تأجيل i18n لحل مشكلة useTranslation
  // import('./i18n/index').catch(() => {});
  import('./lib/themeManager').then(({ applyInstantTheme }) => {
    const themeTime = performance.now();
    console.log('🎨 [MAIN.TSX] تطبيق الثيم', {
      timing: themeTime - deferStartTime
    });
    applyInstantTheme();
  }).catch(() => {});
};

// استخدام requestIdleCallback إذا كان متوفراً، وإلا استخدم setTimeout
if (typeof window !== 'undefined') {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(deferNonCriticalSystems, { timeout: 500 }); // زيادة لتحسين LCP
  } else {
    setTimeout(deferNonCriticalSystems, 500); // زيادة لتحسين LCP
  }
}

// 🔌 تحميل Supabase عند الطلب فقط لتقليل LCP
// (window as any).loadSupabase = () => {
//   return import('./lib/supabase-unified')
//     .then(({ getSupabaseClient }) => getSupabaseClient())
//     .catch(() => undefined);
// };

// تأجيل تحميل Supabase حتى بعد اكتمال التطبيق
setTimeout(() => {
  (window as any).loadSupabase = () => {
    // Load lightweight polyfills only when Supabase is actually needed
    return import('./lib/polyfills')
      .catch(() => undefined)
      .then(() => import('./lib/supabase-unified'))
      .then(({ getSupabaseClient }) => getSupabaseClient())
      .catch(() => undefined);
  };
}, 1000); // زيادة إلى 1000ms لتحسين LCP

// 🛡️ تهيئة معالج أخطاء CSP — مؤجل أكثر لتقليل Boot-up
setTimeout(() => {
  import('./utils/cspErrorHandler')
    .then(({ initCSPErrorHandler }) => {
      try { initCSPErrorHandler(); } catch {}
    })
    .catch(() => {});
}, 1500);

// 📱 تهيئة إصلاحات Instagram WebView — مؤجلة لما بعد الإقلاع
setTimeout(() => {
  import('./utils/instagramWebViewFix')
    .then(({ initInstagramWebViewFix, isInstagramWebView }) => {
      try {
        if (isInstagramWebView()) {
          initInstagramWebViewFix({
            enableChunkRetry: true,
            maxRetryAttempts: 3,
            retryDelay: 2000,
            bundleSizeThreshold: 500 * 1024,
            enableServiceWorkerFix: true,
            enableCSPFix: true
          });
        }
      } catch {}
    })
    .catch(() => {});
}, 2000);

// 📱 إصلاحات عامة لكل WebViews (Facebook/Instagram/TikTok/Android WebView)
setTimeout(() => {
  import('./utils/inAppWebView')
    .then(({ initInAppWebViewFix, isInAppWebView }) => {
      try {
        if (isInAppWebView()) {
          initInAppWebViewFix({
            disableAnimations: true,
            requireUserInteractionForTrackers: true,
            interactionTimeoutMs: 8000,
          });
        }
      } catch {}
    })
    .catch(() => {});
}, 1800);

// Initialize conditional preloader (محسن للأداء)
setTimeout(() => {
  // فحص إذا كان المستخدم في صفحة منتج
  const isProductPage = window.location.pathname.includes('/product-purchase-max-v3/') ||
                       window.location.pathname.includes('/product-purchase-max-v2/') ||
                       window.location.pathname.includes('/product-purchase/') ||
                       window.location.pathname.includes('/product/');
  
  if (isProductPage) {
    // تحسين خاص لصفحات المنتجات
    import('./utils/productPageOptimizer').then(({ productPageOptimizer }) => {
      // Product page optimizer initialized
    }).catch(() => {});
  } else {
    // تحميل ذكي للمكونات الأخرى
    import('./utils/conditionalPreloader').then(({ conditionalPreloader }) => {
      // Conditional preloader initialized
    }).catch(() => {});
  }
}, 200); // تقليل التأخير لتحسين الأداء
