import './utils/performance-monitor';

// 🔤 Font Loading Optimization
document.documentElement.classList.add('font-loading');

// تحميل الخطوط بشكل غير متزامن
const fontPromises = [
  new FontFace('Tajawal', 'url(/fonts/tajawal-regular.woff2)', { weight: '400' }).load(),
  new FontFace('Tajawal', 'url(/fonts/tajawal-medium.woff2)', { weight: '500' }).load(),
  new FontFace('Tajawal', 'url(/fonts/tajawal-bold.woff2)', { weight: '700' }).load()
];

Promise.allSettled(fontPromises).then(results => {
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      document.fonts.add(result.value);
    }
  });
  
  // إشارة بأن الخطوط تم تحميلها
  document.documentElement.classList.remove('font-loading');
  document.documentElement.classList.add('font-loaded');
  
  console.log('✅ تم تحميل الخطوط بنجاح');
}).catch(error => {
  console.warn('⚠️  فشل في تحميل بعض الخطوط:', error);
  document.documentElement.classList.remove('font-loading');
  document.documentElement.classList.add('font-error');
});


// 🚀 Core React - Essential Only

import React from 'react';
import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';

// ✅ Essential imports only for web
// 🎨 تحميل CSS أولاً لضمان تطبيق الخطوط قبل React
import './index.css';
import './App.css';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';
import { SharedStoreDataProvider } from './context/SharedStoreDataContext';
import { Toaster } from "./components/ui/toaster";
import App from './App.tsx';
import { initPerformanceOptimizations } from './utils/performanceOptimizer';

// 🔧 Make React globally available if needed
(window as any).React = React;

// ⚡ Essential polyfills only
import './lib/polyfills';

// 🚫 نظام منع الطلبات المتكررة - يجب أن يحمل أولاً
import { initializeRequestBlocker } from './lib/requestBlocker';

// 📊 نظام إدارة preload لمنع التحذيرات
import './lib/preloadManager';

// 🔄 أداة إعادة تعيين التحميل (للتطوير)
import './utils/loadingReset';

// 🚀 تطبيق تحسينات الأداء فوراً
initPerformanceOptimizations();

// 🚫 تفعيل نظام منع الطلبات المتكررة
initializeRequestBlocker();

// 🎯 Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// 🌐 جعل QueryClient متاحاً عالمياً للتنظيف الشامل
if (typeof window !== 'undefined') {
  (window as any).queryClient = queryClient;
}

// 🌐 Browser Router Configuration
const browserRouterOptions = {
  future: {
    v7_startTransition: true,
    v7_normalizeFormMethod: true,
    v7_relativeSplatPath: true
  },
  basename: '/'
};

// 🎨 ThemeProvider Wrapper محسن - نسخة واحدة فقط
const ThemeProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentOrganization, isLoading, error } = useTenant();
  const [organizationId, setOrganizationId] = React.useState<string | undefined>(undefined);
  const [hasInitialized, setHasInitialized] = React.useState(false);
  const logTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // تحديث معرف المؤسسة فقط عند الحاجة
  React.useEffect(() => {
    if (!isLoading && currentOrganization?.id && currentOrganization.id !== organizationId) {
      // إلغاء أي timeout سابق
      if (logTimeoutRef.current) {
        clearTimeout(logTimeoutRef.current);
      }
      
      // تسجيل مع تأخير لتجنب التكرار
      logTimeoutRef.current = setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
        }
      }, 100);
      
      setOrganizationId(currentOrganization.id);
      setHasInitialized(true);
    } else if (!isLoading && !currentOrganization && hasInitialized) {
      // المستخدم غير مرتبط بمؤسسة
      setOrganizationId(undefined);
    }
  }, [currentOrganization?.id, isLoading, organizationId, hasInitialized]);
  
  // تسجيل الأخطاء (مرة واحدة فقط)
  React.useEffect(() => {
    if (error && process.env.NODE_ENV === 'development') {
    }
  }, [error]);
  
  // تنظيف الموارد
  React.useEffect(() => {
    return () => {
      if (logTimeoutRef.current) {
        clearTimeout(logTimeoutRef.current);
      }
    };
  }, []);
  
  // **استخدام مرجع ثابت للـ ThemeProvider** لمنع إعادة الإنشاء
  const themeProviderKey = React.useMemo(() => 
    `theme-provider-${organizationId || 'global'}`, 
    [organizationId]
  );
  
  return (
    <ThemeProvider key={themeProviderKey} initialOrganizationId={organizationId}>
      {children}
    </ThemeProvider>
  );
};

// استيراد AppWrapper و GlobalLoadingProvider
import AppWrapper from './components/AppWrapper';
import { GlobalLoadingProvider } from './components/store/GlobalLoadingManager';

// 🎯 Essential Providers Only
const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter future={browserRouterOptions.future}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TenantProvider>
            <UserProvider>
              <SharedStoreDataProvider>
                <ThemeProviderWrapper>
                  <GlobalLoadingProvider>
                    <AppWrapper>
                      {children}
                      <Toaster />
                    </AppWrapper>
                  </GlobalLoadingProvider>
                </ThemeProviderWrapper>
              </SharedStoreDataProvider>
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
