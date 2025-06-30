// 🚀 PERFORMANCE OPTIMIZATION: Critical CSS Injection (أولاً قبل كل شيء)
import { injectCriticalCSS } from './utils/criticalCss';

// حقن Critical CSS فوراً قبل أي شيء آخر
if (typeof document !== 'undefined') {
  injectCriticalCSS();
}

// استيراد ملف polyfill لـ module قبل أي استيراد آخر
import './lib/module-polyfill';

// تهيئة Sentry
import './sentry';

// تهيئة النظام الموحد مبكراً لتجنب العميل الطارئ
import { getSupabaseClient } from './lib/supabase-unified';

// تهيئة معالج أخطاء 406
import { initializeHttp406Handler } from './lib/http406Handler';

// 🔧 تطبيق إصلاحات الكاش والمصادقة
// Removed deprecated auth fixes import

// تطبيق النظام الموحد للثيمات فوراً قبل تحميل React
import { applyInstantTheme, cleanupOldThemes } from './lib/themeManager';

// تطبيق الثيم الفوري مع إعادة المحاولة
const applyThemeWithRetry = () => {
  // تطبيق الثيم الفوري فوراً
  applyInstantTheme();
  
  // محاولة إعادة تطبيق الثيم بعد 100 ملي ثانية للتأكد من التطبيق
  setTimeout(() => {
    applyInstantTheme();
    
    // تنظيف الثيمات القديمة
    cleanupOldThemes();
    
    // محاولة أخيرة بعد 500 ملي ثانية (عند اكتمال تحميل DOM)
    setTimeout(applyInstantTheme, 500);
  }, 100);
};

// تطبيق الثيم الفوري لمنع الوميض
applyThemeWithRetry();

// تهيئة النظام الموحد فوراً لمنع إنشاء العميل الطارئ
if (typeof window !== 'undefined') {
  try {
    // تهيئة العميل المتزامن الآن - سيتم استيراده ديناميكياً لاحقاً
    import('./lib/supabase-unified').then(({ getSupabaseClient }) => {
      getSupabaseClient();
    }).catch((error) => {
    });
  } catch (error) {
    // تجاهل الأخطاء في المرحلة الأولية
  }
}

// إضافة مستمع لحدث تحميل الصفحة لإعادة تطبيق الثيم
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', applyInstantTheme);
}

// تهيئة معالج أخطاء 406 فوراً
if (typeof window !== 'undefined') {
  try {
    // فحص ما إذا كان المعالج مهيأ بالفعل
    if (!(window as any).originalFetch) {
      
      // تهيئة المعالج
      initializeHttp406Handler();
      
      // التحقق من التهيئة الناجحة
      if (typeof (window as any).disable406Handler === 'function' && 
          typeof (window as any).enable406Handler === 'function') {
        
        // محاولة تعطيل ثم إعادة تفعيل المعالج للتحقق من عمله
        (window as any).disable406Handler();
        (window as any).enable406Handler();
      } else {
      }
      
      // إعادة المحاولة بعد تحميل DOM
      window.addEventListener('DOMContentLoaded', () => {
        if (!(window as any).disable406Handler) {
          initializeHttp406Handler();
        }
      });
    } else {
    }
  } catch (error) {
    
    // محاولة إعادة التهيئة بعد فترة قصيرة
    setTimeout(() => {
      try {
        initializeHttp406Handler();
      } catch (retryError) {
      }
    }, 1000);
  }
}

// إصلاح createContext وأخرى: تأكد من تحميل React APIs قبل أي شيء آخر
// (window as any).React = (window as any).React || {}; // إزالة أو تعليق هذا

// إصلاح useLayoutEffect قبل أي استيراد
// تعريف مباشر في النطاق العالمي لضمان التنفيذ قبل أي شيء آخر
/* (function() { // تعليق هذا البلوك بالكامل مؤقتًا، سيتم التعامل مع useLayoutEffect بشكل أفضل بعد استيراد React
  if (typeof window !== 'undefined') {
    // محاولة التعرف على React العالمي
    const _React = (window as any).React || null;
    if (_React) {
      // احتفظ بنسخة من النسخة الأصلية لـ useLayoutEffect إذا كانت موجودة
      const originalUseLayoutEffect = _React.useLayoutEffect;
      // استبدل بنسخة آمنة
      _React.useLayoutEffect = function() {
        return typeof window !== 'undefined' 
          ? (originalUseLayoutEffect || _React.useEffect).apply(this, arguments) 
          : (_React.useEffect || function(){}).apply(this, arguments);
      };
    }
  }
})(); */

// استيراد ملف إصلاح React في Vercel
// import './lib/vercel-react-fix.js'; // تعليق هذا

// تصريح بـ React للتأكد من وجوده في النطاق العالمي
import React from 'react'; // يجب أن يكون هذا من أوائل الاستيرادات
import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';

// إذا كنت بحاجة ماسة لجعل React متاحًا عالميًا (غير مستحسن بشكل عام):
(window as any).React = React; // إلغاء تعليق هذا وتفعيله

// استيراد ملف إصلاح React
// import './lib/react-compat.js'; // تعليق هذا مرة أخرى للتجربة

// Importar los polyfills específicos para env.mjs antes de cualquier otro módulo
import './lib/env-polyfill';
// Importar los polyfills generales
import './lib/polyfills';
// استيراد ملف polyfills الجديد لحل مشاكل التوافق
import './polyfills';

// استيراد ملف تسجيل مكونات محرر المتجر
import './lib/register-components';

// تهيئة نظام الترجمة
import './i18n/index';

import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { UserProvider } from './context/UserContext';
import { Toaster } from "./components/ui/toaster";
import { ThemeProvider } from './context/ThemeContext';
import { registerGlobalErrorHandler } from './lib/electron-errors';
import type { ElectronAPI } from './types/electron';
import { initializeReact } from './lib/react-init';
import { SentryErrorBoundary } from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools"; // تم تعطيلها مؤقتاً
import { enableRequestInterception } from './lib/requestInterceptor';
import { authSingleton } from './lib/authSingleton';
import { productionDebugger, prodLog } from './utils/productionDebug';

// 🔍 تشخيص متطور للـ chunks
import './utils/debugChunkLoader';

// 🛠️ أدوات تشخيص تحديث البيانات
import './utils/debugDataRefresh';

// 🚀 تهيئة أنظمة الأداء المتقدمة
import { initPerformanceSystems } from './lib/performance-config';

// 🚨 Emergency Interval Protection - الحماية الطارئة
// import './lib/emergency-interval-killer';

// إضافة التعريفات اللازمة للمتغيرات العالمية
declare global {
  interface Window {
    __REACT_APP_ACTIVE: boolean;
    __ROUTER_EVENTS_PAUSED: boolean;
    __REACT_QUERY_GLOBAL_CLIENT: any;
    __LAST_NAVIGATION_TYPE: 'pushState' | 'replaceState' | 'popState' | null;
    __NAVIGATION_HISTORY: Array<string>;
    __LAST_URL_CHANGE_TIME: number;
    __PREVENT_DUPLICATE_RENDER: boolean;
    electronAPI?: ElectronAPI;
  }

  // إضافة معلومات للنافذة لتعزيز كشف التنقلات المكررة
  interface History {
    __originalPushState?: typeof window.history.pushState;
    __originalReplaceState?: typeof window.history.replaceState;
    __lastState?: any;
    __latestUrl?: string;
  }
}

// 🚀 تفعيل أنظمة الأداء فوراً
if (typeof window !== 'undefined') {
  // تفعيل فوري لأنظمة الأداء
  try {
    initPerformanceSystems();
  } catch (error) {
  }
}

// Registrar el manejador de errores de Electron
if (window.electronAPI) {
  registerGlobalErrorHandler();
}

// تحسين الأداء ومنع إعادة التحميل الكامل عند العودة من علامة تبويب أخرى
if (typeof window !== 'undefined') {
  // تعيين متغيرات عامة أساسية فقط
  window.__REACT_APP_ACTIVE = true;
  window.__NAVIGATION_HISTORY = [];
  window.__LAST_URL_CHANGE_TIME = Date.now();
  window.__PREVENT_DUPLICATE_RENDER = false;

  // تحسين أساسي لحالة التبويب دون تعطيل التنقل
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      window.__REACT_APP_ACTIVE = true;
      window.__LAST_URL_CHANGE_TIME = Date.now();
      
      // إعادة تفعيل أحداث التوجيه عند العودة للتبويب
      if (window.__ROUTER_EVENTS_PAUSED) {
        window.__ROUTER_EVENTS_PAUSED = false;
      }
    } else {
      window.__REACT_APP_ACTIVE = false;
      window.__LAST_URL_CHANGE_TIME = Date.now();
    }
  });

  // منع معالجة الأحداث المتضاربة دون تعطيل التنقل الطبيعي
  let isNavigating = false;
  
  // تحسين popstate فقط لتجنب التداخل
  window.addEventListener('popstate', (event) => {
    // السماح بالتنقل الطبيعي مع تحسين طفيف
    if (!isNavigating) {
      isNavigating = true;
      window.__LAST_NAVIGATION_TYPE = 'popState';
      
      // إعادة تعيين الحالة بعد فترة قصيرة
      setTimeout(() => {
        isNavigating = false;
      }, 100);
    }
  }, false); // تغيير إلى false لتجنب التقاط الأحداث قبل الوقت
}

// إصلاح useLayoutEffect قبل أي استيراد
if (typeof window !== 'undefined') {
  const _React = (window as any).React;
  if (_React) {
    _React.useLayoutEffect = typeof window !== 'undefined' 
      ? _React.useLayoutEffect 
      : _React.useEffect;
  }
}

const TenantWithTheme = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      <TenantProvider>
        <UserProvider>
          <TenantThemeConnector>
            {children}
          </TenantThemeConnector>
        </UserProvider>
      </TenantProvider>
    </AuthProvider>
  );
};

const TenantThemeConnector = ({ children }: { children: React.ReactNode }) => {
  const { currentOrganization } = useTenant();
  
  return (
    <ThemeProvider initialOrganizationId={currentOrganization?.id}>
      {children}
    </ThemeProvider>
  );
};

// تحسين خيارات BrowserRouter لمنع إعادة التحميل
const browserRouterOptions = {
  // تمكين النسخة المستقبلية من React Router يحسن أداء التنقل
  future: {
    v7_startTransition: true,
    v7_normalizeFormMethod: true,
    v7_relativeSplatPath: true
  },
  // تخفيف الحمل أثناء التنقل
  basename: '/'
};

// تهيئة React قبل أي شيء آخر
initializeReact();

// مكون لتنظيم المزودين
const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SentryErrorBoundary>
      <BrowserRouter future={browserRouterOptions.future}>
        <AuthProvider>
          <TenantProvider>
            <UserProvider>
              <ThemeProvider>
                {children}
              </ThemeProvider>
            </UserProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </SentryErrorBoundary>
  );
};

const rootElement = document.getElementById('root');
let root = (rootElement as any)?.__reactRootContainer;

if (rootElement && !root) {
  root = ReactDOM.createRoot(rootElement);
  (rootElement as any).__reactRootContainer = root;
}

// Render the application
if (root) {
  root.render(
    <React.StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </React.StrictMode>
  );
} else {
}

// 🚀 PERFORMANCE OPTIMIZATION: Register Advanced Service Worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw-advanced.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, could notify user
              
              // Send message to new SW to skip waiting
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
      
      // Listen for SW controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Reload when new SW takes control
        window.location.reload();
      });
      
    } catch (error) {
    }
  });
}

/**
 * تهيئة مبكرة للنظام الموحد لمنع مشاكل Race Conditions
 */
async function initializeApp() {
  try {
    
    // تم إزالة تهيئة Supabase client هنا لتجنب التكرار
    
    // تهيئة Production Debug System
    prodLog('info', '🚀 App initialization started', { 
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    // تم حذف تهيئة النظام الموحد للطلبات - الملف غير موجود

  } catch (error) {
    // المتابعة رغم الأخطاء لضمان عمل التطبيق
  }
}

// بدء التهيئة
initializeApp();

// تم تجميد وظائف التشخيص مؤقتاً لحل تعارضات الاستيراد

// التأكد من تهيئة أنظمة التحسين فوراً

// تهيئة فورية وإجبارية لنظام deduplication
const initializeOptimizationSystems = async () => {
  try {
    // تحميل الأنظمة المتوفرة بشكل متوازي
    const [
      deduplicationModule,
      posDataContext
    ] = await Promise.all([
      import('./lib/cache/deduplication'),
      import('./context/POSDataContext')
    ]);

    // تم حذف تهيئة requestSystem - الملف غير موجود
    
  } catch (error) {
  }
};

// تشغيل التهيئة فوراً
initializeOptimizationSystems();

// =================================================================
// 🚀 CRITICAL: Force Production Initialization FIRST
// =================================================================

// 🚨 تحميل نظام منع التكرار المحسن أولاً قبل أي شيء آخر
import './lib/requestDeduplicationGlobal';
import './lib/supabaseRequestInterceptor';

// إضافة مدير الطلبات الشامل الجديد
import('@/lib/requestManager').then((module) => {
  try {
    // تحسين التحميل التدريجي للطلبات
    const requestManagerModule = module;
    
    // تفعيل مدير الطلبات - استخدام getInstance بدلاً من initializeRequestManager
    const manager = requestManagerModule.requestManager;
    manager.setMaxConcurrentRequests(3);
    
    console.log('🚀 تم تفعيل مدير الطلبات بنجاح');
  } catch (error) {
    console.warn('⚠️ فشل في تحميل مدير الطلبات:', error);
  }
}).catch((error) => {
  console.warn('⚠️ فشل في استيراد مدير الطلبات:', error);
});

// Force تفعيل فوري للنظام
if (typeof window !== 'undefined') {
}

import '@/utils/forceProductionInit';
import '@/utils/productionSystemCheck';

// Force import للتأكد من تحميل أنظمة التحسين في الإنتاج
import './lib/cache/deduplication';
import './context/POSDataContext';

import './i18n';
import './lib/performance/optimizations';
import { disableConsoleInProduction } from './lib/performance/optimizations';

// تطبيق تحسينات الأداء
disableConsoleInProduction();

// تأكيد أن النظام يعمل
if (typeof window !== 'undefined') {
}
