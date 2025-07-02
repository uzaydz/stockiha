// ⏱️ تتبع بدء تحميل main.tsx
const mainTsxStartTime = performance.now();
const pageStartTime = (window as any).pageLoadStartTime || performance.now();
console.log('📦 main.tsx: بدء تنفيذ الملف', {
  mainTsxStartTimeMs: Math.round(mainTsxStartTime - pageStartTime),
  timeFromPageStart: (mainTsxStartTime - pageStartTime).toFixed(2) + 'ms'
});

// 🚀 Core React - Essential Only
const reactImportStartTime = performance.now();
console.log('⚛️ main.tsx: بدء استيراد React', {
  reactImportStartTimeMs: Math.round(reactImportStartTime - pageStartTime)
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';

const reactImportEndTime = performance.now();
console.log('⚛️ main.tsx: اكتمل استيراد React', {
  reactImportTimeMs: Math.round(reactImportEndTime - reactImportStartTime),
  totalTimeFromPageMs: Math.round(reactImportEndTime - pageStartTime)
});

// ✅ Essential imports only for web
// 🎨 تحميل CSS أولاً لضمان تطبيق الخطوط قبل React
import './index.css';
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { UserProvider } from './context/UserContext';
import { Toaster } from "./components/ui/toaster";
import { ThemeProvider } from './context/ThemeContext';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// 🔧 Make React globally available if needed
(window as any).React = React;

// ⚡ Essential polyfills only
import './lib/env-polyfill';
import './lib/polyfills';

// 🎯 Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// 🌐 Browser Router Configuration
const browserRouterOptions = {
  future: {
    v7_startTransition: true,
    v7_normalizeFormMethod: true,
    v7_relativeSplatPath: true
  },
  basename: '/'
};

// 🎯 Essential Providers Only
const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter future={browserRouterOptions.future}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TenantProvider>
            <UserProvider>
              <ThemeProvider>
                {children}
                <Toaster />
              </ThemeProvider>
            </UserProvider>
          </TenantProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
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
  const renderStartTime = performance.now();
  console.log('🎨 main.tsx: بدء render React Application', {
    renderStartTimeMs: Math.round(renderStartTime - pageStartTime)
  });

  // 🎨 تطبيق فوري للخطوط قبل render
  document.body.classList.add('tajawal-forced');
  document.documentElement.style.fontFamily = "'TajawalForced', 'Tajawal', 'Arial Unicode MS', 'Tahoma', 'Arial', sans-serif";
  
  // 🔤 ضمان تحميل الخطوط قبل عرض التطبيق
  const ensureFontsLoaded = async () => {
    try {
      // انتظار تحميل الخطوط
      await document.fonts.ready;
      
      // التحقق من وجود خطوط Tajawal
      const tajawalFonts = Array.from(document.fonts).filter(font => 
        font.family === 'TajawalForced' && font.status === 'loaded'
      );
      
      if (tajawalFonts.length === 0) {
        console.warn('⚠️ Tajawal fonts not loaded, forcing fallback...');
        // إضافة خطوط احتياطية
        const style = document.createElement('style');
        style.textContent = `
          * { font-family: 'Arial Unicode MS', 'Tahoma', 'Arial', sans-serif !important; }
        `;
        document.head.appendChild(style);
      } else {
        console.log('✅ Tajawal fonts loaded successfully:', tajawalFonts.length);
      }
    } catch (error) {
      console.error('❌ Font loading error:', error);
    }
  };
  
  // تشغيل التطبيق مع ضمان الخطوط
  ensureFontsLoaded().then(() => {
    root.render(
      <AppProviders>
        <App />
      </AppProviders>
    );
  });

  const renderEndTime = performance.now();
  console.log('✅ main.tsx: اكتمل render React Application', {
    renderTimeMs: Math.round(renderEndTime - renderStartTime),
    totalTimeFromPageMs: Math.round(renderEndTime - pageStartTime)
  });
} else {
  console.error('❌ main.tsx: فشل في العثور على root element');
}

// 🚀 Immediate Critical Loading - No Delay
Promise.allSettled([
  // Load i18n system immediately  
  import('./i18n/index').catch(() => {}),
  
  // Load Supabase client immediately
  import('./lib/supabase-unified')
    .then(({ getSupabaseClient }) => getSupabaseClient())
    .catch(() => {}),
  
  // Load theme system immediately
  import('./lib/themeManager').then(({ applyInstantTheme }) => {
    applyInstantTheme();
  }).catch(() => {})
]);

// Defer non-critical systems
setTimeout(() => {
  import('./lib/performance-config').catch(() => {});
}, 500);

// 🛠️ Service Worker (Production Only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw-advanced.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
      
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
      
    } catch (error) {
      // Ignore service worker errors
    }
  });
}
