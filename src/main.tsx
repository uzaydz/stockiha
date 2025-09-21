// ===========================================
// 🚀 نقطة البداية الرئيسية المبسطة
// ===========================================

// استيراد المكونات المنفصلة
import {
  performanceTracker,
  earlyLoadScheduler,
  faviconManager,
  productPageManager,
  reactDevToolsManager
} from './managers';
import { productionOptimizer } from './utils/productionOptimizer';

// حقل يحدد ما إذا كان الدخول من تطبيق المتجر أم من منصة عامة
const IS_STORE_ENTRY = (window as any).__STORE_ENTRY__ === true;

// 🎯 بدء تتبع الأداء (المتجر فقط)
if (IS_STORE_ENTRY) {
  performanceTracker.log('بدء تشغيل التطبيق', {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent.substring(0, 50) + '...'
  });
}

// 🎨 تهيئة معالج أخطاء CSS (مؤجل)
// import './utils/cssErrorHandler';

// 🚀 تهيئة الأنظمة الأساسية
const initializeCoreSystems = () => {
  // قائمة النطاقات العامة التي تعرض صفحة الهبوط
  const PUBLIC_DOMAINS = [
    'ktobi.online',
    'www.ktobi.online',
    'stockiha.com',
    'www.stockiha.com',
    'stockiha.pages.dev'
  ];

  // دالة للتحقق من localhost
  const isLocalhostDomain = (hostname: string) => {
    return hostname === 'localhost' ||
           hostname === '127.0.0.1' ||
           hostname.startsWith('localhost:') ||
           hostname.startsWith('127.0.0.1:');
  };

  // فحص النطاق - لا نحمل بيانات المتجر في النطاقات العامة
  const currentHostname = window.location.hostname;
  const isPublicDomain = PUBLIC_DOMAINS.includes(currentHostname);
  const isLocalhost = isLocalhostDomain(currentHostname);

  // إذا لم نكن في وضع متجر (entry منفصل) وكان النطاق عاماً أو localhost root، لا نطبع ولا نفعّل أنظمة المتجر
  const isStoreEntry = (window as any).__STORE_ENTRY__ === true;
  const isLocalRoot = isLocalhost && !currentHostname.includes('.') && currentHostname === 'localhost';

  if (isStoreEntry) {
    console.log('🏪 [MAIN.TSX] تشغيل من تطبيق المنصة ولكن تم تحديد STORE ENTRY = true - إيقاف أنظمة المتجر هنا');
  }

  if (!isPublicDomain && !isStoreEntry) {
    // على المنصة العامة قد نرغب فقط بالـ landing؛ لذلك لا نفعّل أنظمة المتجر إن لم يكن entry المتجر
    console.log('🌐 [MAIN.TSX] نطاق منصة/تطوير - تخطي تحميل بيانات المتجر في التطبيق العام', { hostname: currentHostname });
  } else if (!isPublicDomain && isStoreEntry) {
    console.log('🏪 [MAIN.TSX] بدء تحميل البيانات الأولية للمتجر فوراً', { hostname: currentHostname, isLocalhost });
    setTimeout(() => earlyLoadScheduler.start(), 0);
  }

  // تطبيق الفافيكون: في تطبيق المنصة لا نغيّر الأيقونة ولا العنوان
  if (isStoreEntry) {
    setTimeout(() => {
      faviconManager.initialize();
    }, 50); // تقليل من 500ms إلى 50ms لتسريع أكبر
  }

  // بدء preload المنتج إذا لزم الأمر
  // لا تسبق صفحات المنتج إلا في تطبيق المتجر أو عندما نكون في صفحة منتج داخل التطبيق العام صراحة
  if (isStoreEntry) {
    productPageManager.preloadIfNeeded();
  }

// تطبيق تحسينات الإنتاج إذا لزم الأمر
  const hostname = window.location.hostname;
  const isProduction = !hostname.includes('localhost') && hostname.includes('.com');

  if (isProduction) {
    console.log('🏭 [MAIN.TSX] تطبيق تحسينات الإنتاج للنطاق:', hostname);
    productionOptimizer.applyAllProductionOptimizations().catch(console.warn);
  }
};

// تهيئة الأنظمة الأساسية
initializeCoreSystems();

// ===========================================
// ⚛️ إعداد React وتهيئة التطبيق
// ===========================================

// 🚀 Core React - Essential Only
import React from 'react';
import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';

// 🔍 تتبع انتهاء الاستيراد الأساسي
const REACT_IMPORTS_TIME = performance.now();
performanceTracker.mark('react-imports-complete');

// تعطيل React DevTools لتحسين الأداء في التطوير والإنتاج
reactDevToolsManager.disable();

// 🎨 تحميل CSS الأساسي
const CSS_START_TIME = performance.now();
import './index.css';
import './App.css';

// 🔤 Font Loading Optimization - تحسين السرعة
document.documentElement.classList.add('font-loading');
// تقليل timeout للخطوط لتسريع العرض
const fontTimeout = setTimeout(() => {
  document.documentElement.classList.remove('font-loading');
  document.documentElement.classList.add('font-loaded');
}, 100); // timeout قصير 100ms

document.fonts.ready.then(() => {
  clearTimeout(fontTimeout);
  document.documentElement.classList.remove('font-loading');
  document.documentElement.classList.add('font-loaded');
}).catch(() => {
  clearTimeout(fontTimeout);
  document.documentElement.classList.remove('font-loading');
  document.documentElement.classList.add('font-error');
});

// 🌐 Browser Router Configuration - تحميل فوري
const BrowserRouter = React.lazy(() =>
  import('react-router-dom').then(module => ({ default: module.BrowserRouter }))
);

// 📱 App Component - تحميل فوري
const App = React.lazy(() => import('./App.tsx'));

// 🚀 Performance Optimizations
const initPerformanceOptimizations = () => {
  // تقليل console errors في production والتطوير
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ').toLowerCase();
    if (
      message.includes('websocket') ||
      message.includes('hmr') ||
      message.includes('vite') ||
      message.includes('failed to connect') ||
      message.includes('devtools') ||
      message.includes('react devtools') ||
      message.includes('violation') ||
      message.includes('message handler took')
    ) {
      return;
    }
    originalError.apply(console, args);
  };

  // تحسين CSS loading
  if (typeof window !== 'undefined') {
    document.documentElement.style.visibility = 'visible';

    // تطبيق الخطوط فوراً - تحسين السرعة
    const applyFonts = () => {
      // تطبيق الخطوط فوراً بدون انتظار
      document.body.classList.add('tajawal-forced');
      
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          document.body.classList.add('tajawal-loaded');
        });
      } else {
        setTimeout(() => {
          document.body.classList.add('tajawal-loaded');
        }, 10); // تقليل من 25ms إلى 10ms
      }
    };

    if (window.requestIdleCallback) {
      window.requestIdleCallback(applyFonts, { timeout: 0 });
    } else {
      setTimeout(applyFonts, 0);
    }
  }
};

initPerformanceOptimizations();

// 🔧 Polyfills - تحسين السرعة
if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  (window as any).requestIdleCallback = function(callback: any, options?: any) {
    const start = Date.now();
    return setTimeout(function() {
      callback({
        didTimeout: false,
        timeRemaining: function() {
          return Math.max(0, 25 - (Date.now() - start)); // تقليل من 50ms إلى 25ms
        }
      });
    }, 0); // تقليل من 1ms إلى 0ms
  };

  (window as any).cancelIdleCallback = function(id: any) {
    clearTimeout(id);
  };
}

// 🔧 Make React globally available
(window as any).React = React;

// 🌐 Browser Router Options
const browserRouterOptions = {
  future: {
    v7_startTransition: true,
    v7_normalizeFormMethod: true,
    v7_relativeSplatPath: true
  },
  basename: '/'
};

// 🎯 App Providers
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
    mainStart: performanceTracker['start'],
    reactImports: REACT_IMPORTS_TIME,
    cssLoad: performance.now() - CSS_START_TIME,
    renderStart: RENDER_START_TIME,
    totalBeforeRender: RENDER_START_TIME - performanceTracker['start']
  };

  performanceTracker.log('بدء رندر التطبيق', {
    timings: (window as any).__APP_TIMING__,
    memoryUsage: (performance as any).memory ? {
      used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB',
      total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + 'MB'
    } : 'غير متوفر'
  });

  // عرض التطبيق فوراً
  if (import.meta.env.DEV) {
    root.render(
      <AppProviders>
        <React.Suspense fallback={null}>
          <App />
        </React.Suspense>
      </AppProviders>
    );
  } else {
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

  // إزالة شاشة التحميل - تحسين السرعة
  try {
    const remove = (window as any).removeInitialLoading;
    if (typeof remove === 'function') {
      requestAnimationFrame(() => remove());
      setTimeout(() => { try { remove(); } catch {} }, 300); // تقليل من 1200ms إلى 300ms
    }
  } catch {}

  const RENDER_END_TIME = performance.now();
  (window as any).__APP_TIMING__.renderEnd = RENDER_END_TIME;
  (window as any).__APP_TIMING__.totalToRender = RENDER_END_TIME - performanceTracker['start'];

  performanceTracker.log('اكتمل رندر التطبيق', {
    renderTime: RENDER_END_TIME - RENDER_START_TIME,
    totalBootTime: RENDER_END_TIME - performanceTracker['start'],
    finalTimings: (window as any).__APP_TIMING__
  });

}

// 🚀 Service Workers Cleanup
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    const hasActiveWorkers = registrations.length > 0;
    registrations.forEach(registration => {
      registration.unregister();
    });

    if (hasActiveWorkers && !import.meta.env.DEV) {
      setTimeout(() => {
        window.location.reload();
      }, 500); // تقليل من 1000ms إلى 500ms
    }
  });

  (window as any).clearServiceWorkers = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach((registration, index) => {
          registration.unregister().then(() => {
            console.log(`تم إلغاء تسجيل Service Worker ${index + 1}`);
          });
        });
        if (registrations.length > 0) {
          console.log(`تم إلغاء تسجيل ${registrations.length} Service Worker`);
        }
      });
    } else {
      console.log('Service Workers غير مدعوم');
    }
  };
}

// 🚀 تحسين: انتظار محسّن للبيانات المبكرة - أسرع وأكثر فعالية
if (typeof window !== 'undefined') {
  const waitForEarlyData = () => {
    const startWait = performance.now();
    // تقليل الوقت المسموح بشكل كبير لتحسين الأداء
    let maxWait = 200; // تقليل إلى 200ms بدلاً من 500ms لتسريع أكبر

    try {
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink || 0;

        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          maxWait = 1000; // تقليل إلى 1 ثانية بدلاً من 2 ثانية
        } else if (effectiveType === '3g' || (effectiveType === '4g' && downlink < 0.5)) {
          maxWait = 600; // تقليل إلى 600ms بدلاً من 1.5 ثانية
        } else if (effectiveType === '4g' && downlink >= 0.5) {
          maxWait = 400; // تقليل إلى 400ms بدلاً من 800ms
        }
      }

      // فحص الأجهزة المحمولة - تقليل التأخير
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('mobile') || userAgent.includes('android')) {
        maxWait = Math.max(maxWait, 500); // تقليل إلى 500ms بدلاً من 1 ثانية
      }

      if (!navigator.onLine) {
        maxWait = 200; // تقليل إلى 200ms
      }
    } catch {
      maxWait = 300; // fallback محسّن أكثر
    }

    const checkData = () => {
      const win = window as any;
      const hasData = !!(
        win.__EARLY_STORE_DATA__?.data ||
        win.__CURRENT_STORE_DATA__ ||
        win.__PREFETCHED_STORE_DATA__
      );

      if (hasData || (performance.now() - startWait) > maxWait) {
        // البيانات متوفرة أو انتهى الوقت - ابدأ الرندر
        if (!hasData) {
          console.log('⏳ [MAIN.TSX] بدء الرندر بدون بيانات مبكرة');
        } else {
          console.log('✅ [MAIN.TSX] البيانات المبكرة متوفرة - بدء الرندر');
        }
        return;
      }

      // انتظر قليلاً وتحقق مرة أخرى
      setTimeout(checkData, 25); // تسريع الفحص إلى 25ms بدلاً من 50ms
    };

    checkData();
  };

  // ابدأ فحص البيانات المبكرة
  waitForEarlyData();
}

// 🚀 Immediate Theme Application - تطبيق الثيم فوراً لتجنب التأخير
const applyThemeImmediately = () => {
  // تطبيق الثيم فوراً بدلاً من التأخير
  import('./lib/themeManager').then(({ applyInstantTheme }) => {
    applyInstantTheme();
  }).catch(() => {});
};

// تطبيق الثيم فوراً - تحسين السرعة
if (typeof window !== 'undefined') {
  // تطبيق الثيم فوراً بدون setTimeout
  applyThemeImmediately();
}

// 🚀 Deferred Systems - تحميل باقي الأنظمة غير الحرجة لاحقاً (محسن للأداء)
const deferNonCriticalSystems = () => {
  // الأنظمة غير الحرجة - تقليل العمليات
};

// تحميل الأنظمة غير الحرجة مع تأخير محسّن حسب الشبكة - تسريع
if (typeof window !== 'undefined') {
  const isSlowNetwork = () => {
    try {
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        return effectiveType === 'slow-2g' || effectiveType === '2g' ||
               (effectiveType === '3g' && connection.downlink < 0.5);
      }
      return !navigator.onLine; // افتراضياً سريعة إلا إذا كانت غير متصلة
    } catch {
      return false; // افتراضياً سريعة
    }
  };

  const deferDelay = isSlowNetwork() ? 100 : 25; // تقليل التأخير بشكل أكبر
  const idleTimeout = isSlowNetwork() ? 50 : 25; // timeout أقصر بكثير

  if (window.requestIdleCallback) {
    window.requestIdleCallback(deferNonCriticalSystems, { timeout: idleTimeout });
  } else {
    setTimeout(deferNonCriticalSystems, deferDelay);
  }
}

// 🔌 Supabase Loader (محسن للأداء)
const getSupabaseLoadDelay = () => {
  try {
    const connection = (navigator as any).connection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
        return 500; // تقليل إلى 500ms بدلاً من 1 ثانية
      }
      if (effectiveType === '4g' && connection.downlink < 1) {
        return 200; // تقليل إلى 200ms بدلاً من 500ms
      }
    }
    return !navigator.onLine ? 500 : 100; // تسريع أكبر للشبكات السريعة
  } catch {
    return 150; // تأخير افتراضي محسّن أكثر
  }
};

setTimeout(() => {
  (window as any).loadSupabase = () => {
    return import('./lib/polyfills')
      .catch(() => undefined)
      .then(() => import('./lib/supabase-unified'))
      .then(({ getSupabaseClient }) => getSupabaseClient())
      .catch(() => undefined);
  };
}, getSupabaseLoadDelay());

// 🚀 Optimized System Loading - دمج جميع التحميلات المتأخرة في دفعة واحدة (محسن)
const loadOptimizedSystems = () => {
  // تحديد التأخير حسب نوع الشبكة - تقليل التأخيرات
  const getOptimalDelay = () => {
    try {
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') return 500; // تقليل من 1000ms
        if (effectiveType === '3g') return 300; // تقليل من 800ms
        if (effectiveType === '4g' && connection.downlink < 1) return 200; // تقليل من 500ms
      }
      return navigator.onLine ? 100 : 400; // تسريع أكبر للشبكات السريعة
    } catch {
      return 150; // تأخير افتراضي محسّن أكثر
    }
  };

  const optimalDelay = getOptimalDelay();

  setTimeout(async () => {
    const startTime = performance.now();
    console.log('🚀 [MAIN.TSX] بدء تحميل الأنظمة المتأخرة - TIME:', startTime);

    try {
      // تحميل جميع الأنظمة المتأخرة بالتوازي
      const systemPromises = [
        // CSP Error Handler
        import('./utils/cspErrorHandler').then(({ initCSPErrorHandler }) => {
          try { initCSPErrorHandler(); } catch {}
        }).catch(() => {}),

        // WebView Fixes - Instagram
        import('./utils/instagramWebViewFix').then(({ initInstagramWebViewFix, isInstagramWebView }) => {
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
        }).catch(() => {}),

        // General WebView Fixes
        import('./utils/inAppWebView').then(({ initInAppWebViewFix, isInAppWebView }) => {
          try {
            if (isInAppWebView()) {
              initInAppWebViewFix({
                disableAnimations: true,
                requireUserInteractionForTrackers: true,
                interactionTimeoutMs: 8000,
              });
            }
          } catch {}
        }).catch(() => {}),
      ];

      // تحميل الأنظمة بالتوازي
      await Promise.all(systemPromises);
      console.log('✅ [MAIN.TSX] اكتمل تحميل الأنظمة الأساسية - TIME:', performance.now());

      // تحميل Conditional Preloader بناءً على نوع الصفحة
      const isProductPage = window.location.pathname.includes('/product-purchase-max-v3/') ||
                           window.location.pathname.includes('/product-purchase-max-v2/') ||
                           window.location.pathname.includes('/product-purchase/') ||
                           window.location.pathname.includes('/product/');

      if (isProductPage) {
        import('./utils/productPageOptimizer' as any).then((module: any) => {
          console.log('📦 [MAIN.TSX] تم تحميل Product Page Optimizer');
        }).catch(() => {});
      } else {
        import('./utils/conditionalPreloader' as any).then((module: any) => {
          console.log('🔄 [MAIN.TSX] تم تحميل Conditional Preloader');
        }).catch(() => {});
      }

      const totalTime = performance.now() - startTime;
      console.log('🏁 [MAIN.TSX] اكتمل تحميل جميع الأنظمة:', {
        totalTime,
        systemsCount: systemPromises.length,
        time: performance.now()
      });

    } catch (error) {
      console.warn('⚠️ [MAIN.TSX] خطأ في تحميل الأنظمة:', error);
    }
  }, optimalDelay);
};

// تشغيل التحميل المحسن
loadOptimizedSystems();
