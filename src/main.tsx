// استيراد ملف polyfill لـ module قبل أي استيراد آخر
import './lib/module-polyfill';

// تهيئة Sentry
import './sentry';

// تهيئة معالج أخطاء 406
import { initHttp406Handler } from './lib/http406Handler';

// تطبيق النظام الموحد للثيمات فوراً قبل تحميل React
import { applyInstantTheme } from './lib/themeManager';

// تطبيق الثيم الفوري لمنع الوميض
applyInstantTheme();

// تهيئة معالج أخطاء 406 فوراً
if (typeof window !== 'undefined') {
  initHttp406Handler();
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

import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { Toaster } from "./components/ui/toaster";
import { ThemeProvider } from './context/ThemeContext';
import { registerGlobalErrorHandler } from './lib/electron-errors';
import type { ElectronAPI } from './types/electron';
import { initializeReact } from './lib/react-init';
import { SentryErrorBoundary } from './components/ErrorBoundary';

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
        <TenantThemeConnector>
          {children}
        </TenantThemeConnector>
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
    v7_normalizeFormMethod: true
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
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </SentryErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);
