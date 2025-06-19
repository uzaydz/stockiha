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
  // بدء تهيئة النظام الموحد بشكل غير متزامن
  getSupabaseClient().catch(() => {
    // تجاهل الأخطاء في المرحلة الأولية
  });
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
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { initializeSupabaseUnified } from './lib/supabase-unified';
import { enableRequestInterception } from './lib/requestInterceptor';
import { AuthSingleton } from './lib/authSingleton';
import { productionDebugger, prodLog } from './utils/productionDebug';
import { debugProduction } from '@/utils/productionDebug';
import { checkBuildIntegrity } from '@/utils/buildCheck';

// 🔍 تشخيص متطور للـ chunks
import './utils/debugChunkLoader';

// 🛠️ أدوات تشخيص تحديث البيانات
import './utils/debugDataRefresh';

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

// Registrar el manejador de errores de Electron
if (window.electronAPI) {
  registerGlobalErrorHandler();
}

// تحسين الأداء ومنع إعادة التحميل الكامل عند العودة من علامة تبويب أخرى
if (typeof window !== 'undefined') {
  // تعيين متغيرات عامة لتتبع حالة التطبيق والتنقل
  window.__REACT_APP_ACTIVE = true;
  window.__NAVIGATION_HISTORY = [];
  window.__LAST_URL_CHANGE_TIME = Date.now();
  window.__PREVENT_DUPLICATE_RENDER = false;

  // تسجيل مستمعي الأحداث للتعامل مع حالة علامة التبويب
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // تسجيل وقت العودة للتبويب
      const lastHideTime = window.__LAST_URL_CHANGE_TIME;
      const currentTime = Date.now();
      const timeDiff = currentTime - lastHideTime;
      
      // عند العودة للتبويب، تجنب إعادة التحميل الكامل
      window.__REACT_APP_ACTIVE = true;

      // منع التحديث المزدوج للمكونات عند العودة خلال فترة قصيرة (30 ثانية)
      window.__PREVENT_DUPLICATE_RENDER = timeDiff < 30000;
      
      // إيقاف إعادة التحميل المستمر
      if (window.__ROUTER_EVENTS_PAUSED) {
        
        window.__ROUTER_EVENTS_PAUSED = false;
      }
    } else {
      // تسجيل وقت مغادرة التبويب
      window.__LAST_URL_CHANGE_TIME = Date.now();
      
      // عند مغادرة التبويب، تحديد حالة غير نشط
      window.__REACT_APP_ACTIVE = false;
      
      // إيقاف مؤقت لأحداث التوجيه
      window.__ROUTER_EVENTS_PAUSED = true;
      
    }
  });

  // تخزين الدوال الأصلية للتوجيه
  window.history.__originalPushState = window.history.pushState;
  window.history.__originalReplaceState = window.history.replaceState;
  
  // إعادة تعريف pushState لمنع إعادة التهيئة وتحسين التعامل مع التبديل بين التبويبات
  window.history.pushState = function() {
    // فحص الحالة النشطة للتطبيق
    if (window.__ROUTER_EVENTS_PAUSED) {
      
      return;
    }
    
    const [state, title, url] = arguments;
    
    // تجنب التنقلات المكررة
    if (window.history.__latestUrl === url) {
      
      return;
    }
    
    // تحديث التاريخ لتتبع التنقلات
    window.__LAST_NAVIGATION_TYPE = 'pushState';
    window.history.__latestUrl = url?.toString();
    
    if (url && window.__NAVIGATION_HISTORY) {
      window.__NAVIGATION_HISTORY.push(url.toString());
      if (window.__NAVIGATION_HISTORY.length > 10) {
        window.__NAVIGATION_HISTORY.shift();
      }
    }
    
    return window.history.__originalPushState?.apply(this, arguments);
  };
  
  // إعادة تعريف replaceState بطريقة مماثلة
  window.history.replaceState = function() {
    if (window.__ROUTER_EVENTS_PAUSED) {
      
      return;
    }
    
    const [state, title, url] = arguments;
    
    if (window.history.__latestUrl === url) {
      
      return;
    }
    
    window.__LAST_NAVIGATION_TYPE = 'replaceState';
    window.history.__latestUrl = url?.toString();
    
    return window.history.__originalReplaceState?.apply(this, arguments);
  };
  
  // تعديل سلوك التنقل الخلفي/الأمامي لمنع إعادة التحميل غير الضرورية
  window.addEventListener('popstate', (event) => {
    if (window.__ROUTER_EVENTS_PAUSED) {
      
      event.stopImmediatePropagation();
    } else {
      window.__LAST_NAVIGATION_TYPE = 'popState';
    }
  }, true);
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
    
    // تهيئة مبكرة للنظام الموحد
    const { getSupabaseClient } = await import('@/lib/supabase-unified');
    
    // بدء تهيئة الـ client في الخلفية
    getSupabaseClient().then(() => {
    }).catch((error) => {
      // لا نوقف التطبيق، فقط تحذير
    });
    
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

// تشغيل تشخيص الإنتاج
debugProduction();

// فحص سلامة البناء
checkBuildIntegrity();

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
import '@/utils/forceProductionInit';
import '@/utils/productionSystemCheck';

// Force import للتأكد من تحميل أنظمة التحسين في الإنتاج
import './lib/cache/deduplication';
import './context/POSDataContext';
import { debugProduction } from '@/utils/productionDebug';
import { checkBuildIntegrity } from '@/utils/buildCheck';
