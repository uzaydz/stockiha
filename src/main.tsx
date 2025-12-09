// 🔧 إصلاح مشكلة compose-refs مع React 19 - يجب أن يكون أول استيراد
import '@/lib/patchComposeRefs';

import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './apps/AdminApp';
// ⚡ ConnectivityService يبدأ تلقائياً بشكل كسول عند استيراده من أي مكان
// لا نستورده هنا لتجنب حجب التحميل الأولي

import './index.css';
import './App.css';
import { ensureCustomFontsLoaded } from './utils/fontLoader';
import '@/lib/diagnostics/diagnosticsConsole';

// إلغاء تسجيل أي Service Worker متبقٍ (المشروع مكتبي بالكامل)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister().catch(() => {});
    });
  }).catch(() => {});
}

// تسريع التحميل للتطبيق المكتبي
if (typeof window !== 'undefined' &&
    window.navigator &&
    window.navigator.userAgent &&
    window.navigator.userAgent.includes('Electron')) {
  console.log('🖥️ تطبيق مكتبي مكتشف - تسريع التحميل');
  // تعطيل console في الإنتاج للتطبيق المكتبي
  if (import.meta.env.PROD) {
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
  }
}

console.log('🔥 [ENTRY] بدء تحميل main.tsx');
console.log('🔥 [ENTRY] window.location:', window.location.href);

// مسارات الإدارة فقط - صفحة الهبوط لا تحتاج لأي منطق كشف نطاقات
const ADMIN_PATH_PREFIXES = [
  '/dashboard',
  '/pos',
  '/call-center',
  '/super-admin',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/tenant/signup',
  '/admin/signup',
  '/setup-organization',
  '/redirect'
];

// كشف نوع التطبيق مع دعم التطبيق المكتبي
const detectAppVariant = (): 'admin' => {
  // كشف إذا كان التطبيق يعمل في Electron (تطبيق مكتبي)
  const isElectron = typeof window !== 'undefined' && (
    (window as any).electronAPI !== undefined ||
    (window.navigator &&
     window.navigator.userAgent &&
     window.navigator.userAgent.includes('Electron'))
  );

  const isDesktopApp = isElectron;

  console.log('🖥️ [APP] كشف نوع التطبيق:');
  console.log('  - isElectron:', isElectron);
  console.log('  - isDesktopApp:', isDesktopApp);
  console.log('  - userAgent:', window.navigator?.userAgent);

  if (isDesktopApp) {
    console.log('  - تم كشف تطبيق مكتبي - توجيه للإدارة');
    return 'admin';
  }

  // تحقق من المسارات الإدارية
  const currentPath = window.location.pathname;
  const isAdminRoute = ADMIN_PATH_PREFIXES.some(prefix => currentPath.startsWith(prefix));

  console.log('  - currentPath:', currentPath);
  console.log('  - isAdminRoute:', isAdminRoute);

  if (isAdminRoute) {
    return 'admin';
  }

  // هذا المشروع خاص بلوحة التحكم فقط
  return 'admin';
};

// Font loading helpers - محسّن لـ Electron
(() => {
  document.documentElement.classList.add('font-loading');
  
  // للتطبيق المكتبي: تطبيق الفونت مباشرة بدون انتظار طويل
  const isElectron = window.navigator?.userAgent?.includes('Electron');
  const fontTimeout = setTimeout(() => {
    document.documentElement.classList.remove('font-loading');
    document.documentElement.classList.add('font-loaded');
  }, isElectron ? 50 : 100);

  document.fonts
    .ready
    .then(() => {
      clearTimeout(fontTimeout);
      document.documentElement.classList.remove('font-loading');
      document.documentElement.classList.add('font-loaded');
    })
    .catch(() => {
      clearTimeout(fontTimeout);
      document.documentElement.classList.remove('font-loading');
      document.documentElement.classList.add('font-loaded');
  });
})();

// تحميل الفونتات برمجياً
const fontsReady = ensureCustomFontsLoaded().catch(() => {
  console.warn('⚠️ فشل تحميل بعض الفونتات، سيتم استخدام fallback');
});

if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  (window as any).requestIdleCallback = function (callback: any) {
    const start = Date.now();
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 25 - (Date.now() - start))
      });
    }, 0);
  };

  (window as any).cancelIdleCallback = function (id: number) {
    clearTimeout(id);
  };
}

(window as any).React = React;

const rootElement = document.getElementById('root');
let root = (rootElement as any)?.__reactRootContainer;

if (rootElement && !root) {
  root = ReactDOM.createRoot(rootElement);
  (rootElement as any).__reactRootContainer = root;
}

const bootstrap = async () => {
  // التأكد من جاهزية الفونتات قبل العرض
  await Promise.race([
    fontsReady,
    new Promise(resolve => setTimeout(resolve, 300))
  ]);
  console.log('🚀 [MAIN] بدء bootstrap');
  console.log('🚀 [MAIN] navigator.userAgent:', navigator.userAgent);
  console.log('🚀 [MAIN] document.readyState:', document.readyState);
  const startTime = performance.now();

  const variant = detectAppVariant();
  console.log('📊 [MAIN] تم كشف نوع التطبيق:', variant, 'في', performance.now() - startTime, 'ms');

  // كشف التطبيق المكتبي (Electron)
  const isElectron = typeof window !== 'undefined' && (
    (window as any).electronAPI !== undefined ||
    (window.navigator &&
     window.navigator.userAgent &&
     window.navigator.userAgent.includes('Electron'))
  );

  if (isElectron) {
    console.log('🖥️ [MAIN] تطبيق مكتبي مكتشف (Electron)');
  }

  if (import.meta.env.DEV) {
    console.log('[Bootstrap] Selected app variant:', variant);
  }

  // للمتاجر والإدارة - استخدام static import لحل مشكلة Electron
  if (root) {
    root.render(
      import.meta.env.DEV ? (
        <AdminApp />
      ) : (
        <React.StrictMode>
          <AdminApp />
        </React.StrictMode>
      )
    );
  }
};

bootstrap();

const applyFonts = () => {
  document.body.classList.add('tajawal-forced');

  const markLoaded = () => document.body.classList.add('tajawal-loaded');

  if (fontsReady) {
    fontsReady.then(markLoaded).catch(markLoaded);
  } else if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(markLoaded).catch(markLoaded);
  } else {
    setTimeout(markLoaded, 10);
  }
};

if (typeof window !== 'undefined') {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(applyFonts, { timeout: 0 });
  } else {
    setTimeout(applyFonts, 0);
  }
}
