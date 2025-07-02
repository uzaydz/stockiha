// 🚀 Core React - Essential Only

import React from 'react';
import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';



// ✅ Essential imports only for web
// 🎨 تحميل CSS أولاً لضمان تطبيق الخطوط قبل React
import './index.css';
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { UserProvider } from './context/UserContext';
import { Toaster } from "./components/ui/toaster";
import { ThemeProvider } from './context/ThemeContext';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initPerformanceOptimizations } from './utils/performanceOptimizer';

// 🔧 Make React globally available if needed
(window as any).React = React;

// ⚡ Essential polyfills only
import './lib/env-polyfill';
import './lib/polyfills';

// 🚀 تطبيق تحسينات الأداء فوراً
initPerformanceOptimizations();

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

// 🎨 ThemeProvider Wrapper لجلب organizationId من TenantContext
const ThemeProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentOrganization, isLoading, error } = useTenant();
  
  console.log('🎯 [ThemeProviderWrapper] حالة المؤسسة:', {
    organizationId: currentOrganization?.id,
    organizationName: currentOrganization?.name,
    isLoading,
    hasError: !!error,
    timestamp: new Date().toLocaleTimeString()
  });
  
  // إذا كان هناك خطأ، أظهر رسالة الخطأ
  if (error) {
    console.error('❌ [ThemeProviderWrapper] خطأ في تحميل المؤسسة:', error);
  }
  
  return (
    <ThemeProvider initialOrganizationId={currentOrganization?.id}>
      {children}
    </ThemeProvider>
  );
};

// 🎯 Essential Providers Only
const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter future={browserRouterOptions.future}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TenantProvider>
            <UserProvider>
              <ThemeProviderWrapper>
                {children}
                <Toaster />
              </ThemeProviderWrapper>
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
        // إضافة خطوط احتياطية
        const style = document.createElement('style');
        style.textContent = `
          * { font-family: 'Arial Unicode MS', 'Tahoma', 'Arial', sans-serif !important; }
        `;
        document.head.appendChild(style);
      }
    } catch (error) {
      // تجاهل أخطاء الخطوط
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

} else {
  console.error('❌ فشل في العثور على root element');
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
