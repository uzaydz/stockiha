// استيراد النسخة العالمية من React
import React from './lib/react-global.js';
import ReactDOM from 'react-dom/client';

// التأكد من أن window.React متاح قبل أي شيء آخر
if (typeof window !== 'undefined' && (!window.React || !window.React.useLayoutEffect)) {
  console.warn('تعريف React عالمياً من main.tsx');
  window.React = window.React || React;
  
  // التأكد من توفر useLayoutEffect
  if (!React.useLayoutEffect) {
    console.warn('استبدال useLayoutEffect بـ useEffect في main.tsx');
    React.useLayoutEffect = React.useEffect;
  }
  
  if (!window.React.useLayoutEffect) {
    window.React.useLayoutEffect = React.useLayoutEffect || React.useEffect;
  }
}

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
    __REACT_POLYFILL_APPLIED?: boolean;
    __applyReactPolyfill?: (react: typeof React) => void;
    React: typeof React;
    ReactDOM: any;
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
        console.log('[Router] استئناف أحداث التوجيه بعد العودة للتبويب');
        window.__ROUTER_EVENTS_PAUSED = false;
      }
    } else {
      // تسجيل وقت مغادرة التبويب
      window.__LAST_URL_CHANGE_TIME = Date.now();
      
      // عند مغادرة التبويب، تحديد حالة غير نشط
      window.__REACT_APP_ACTIVE = false;
      
      // إيقاف مؤقت لأحداث التوجيه
      window.__ROUTER_EVENTS_PAUSED = true;
      console.log('[Router] إيقاف مؤقت لأحداث التوجيه');
    }
  });

  // تخزين الدوال الأصلية للتوجيه
  window.history.__originalPushState = window.history.pushState;
  window.history.__originalReplaceState = window.history.replaceState;
  
  // إعادة تعريف pushState لمنع إعادة التهيئة وتحسين التعامل مع التبديل بين التبويبات
  window.history.pushState = function() {
    // فحص الحالة النشطة للتطبيق
    if (window.__ROUTER_EVENTS_PAUSED) {
      console.log('[Router] تجاهل pushState أثناء التبديل بين علامات التبويب');
      return;
    }
    
    const [state, title, url] = arguments;
    
    // تجنب التنقلات المكررة
    if (window.history.__latestUrl === url) {
      console.log('[Router] تجنب التنقل المكرر إلى:', url);
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
      console.log('[Router] تجاهل replaceState أثناء التبديل بين علامات التبويب');
      return;
    }
    
    const [state, title, url] = arguments;
    
    if (window.history.__latestUrl === url) {
      console.log('[Router] تجنب استبدال الحالة المكرر:', url);
      return;
    }
    
    window.__LAST_NAVIGATION_TYPE = 'replaceState';
    window.history.__latestUrl = url?.toString();
    
    return window.history.__originalReplaceState?.apply(this, arguments);
  };
  
  // تعديل سلوك التنقل الخلفي/الأمامي لمنع إعادة التحميل غير الضرورية
  window.addEventListener('popstate', (event) => {
    if (window.__ROUTER_EVENTS_PAUSED) {
      console.log('[Router] تجاهل حدث popstate أثناء التبديل بين التبويبات');
      event.stopImmediatePropagation();
    } else {
      window.__LAST_NAVIGATION_TYPE = 'popState';
    }
  }, true);
}

// التأكد من أن React موجود عالمياً مرة أخرى قبل التقديم
if (typeof window !== 'undefined' && !window.React.createElement) {
  window.React.createElement = React.createElement;
}

const TenantWithTheme = ({ children }: { children: React.ReactNode }) => {
  return (
    <TenantProvider>
      <TenantThemeConnector>
        {children}
      </TenantThemeConnector>
    </TenantProvider>
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  // إزالة StrictMode في الإنتاج لمنع التحميل المزدوج
  process.env.NODE_ENV === 'production' ? (
    <BrowserRouter {...browserRouterOptions}>
      <AuthProvider>
        <TenantWithTheme>
          <App />
          <Toaster />
        </TenantWithTheme>
      </AuthProvider>
    </BrowserRouter>
  ) : (
    <React.StrictMode>
      <BrowserRouter {...browserRouterOptions}>
        <AuthProvider>
          <TenantWithTheme>
            <App />
            <Toaster />
          </TenantWithTheme>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  ),
);
