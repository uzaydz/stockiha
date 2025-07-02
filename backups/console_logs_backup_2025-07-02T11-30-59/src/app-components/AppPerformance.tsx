// ⏱️ تتبع بدء تحميل App.tsx
const appTsxStartTime = performance.now();
const pageStartTime = (window as any).pageLoadStartTime || performance.now();

console.log('🚀 App.tsx: بدء تنفيذ المكون', {
  appTsxStartTimeMs: Math.round(appTsxStartTime - pageStartTime),
  timeFromPageStart: (appTsxStartTime - pageStartTime).toFixed(2) + 'ms'
});

// ============ إعدادات الأداء والتحليلات - سريع ============
import { QueryClient } from '@tanstack/react-query';
import { setGlobalQueryClient } from '../lib/data-refresh-helpers';
import { isSupabaseReady } from '../lib/supabase-unified';
import { enableRequestInterception } from '../lib/requestInterceptor';
import { isElectron } from '../lib/isElectron';

// استخدام QueryClient من main.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

// ============ تهيئة الأنظمة الأساسية ============
export const initializeAppSystems = () => {
  // تفعيل اعتراض الطلبات بعد التحقق من جاهزية النظام الموحد
  setTimeout(() => {
    let attempts = 0;
    const tryEnableInterception = () => {
      attempts++;
      if (isSupabaseReady()) {
        enableRequestInterception();
      } else if (attempts < 50) {
        setTimeout(tryEnableInterception, 100);
      } else {
        enableRequestInterception();
      }
    };
    tryEnableInterception();
  }, 100);

  // تفعيل نظام منع الطلبات المكررة
  if (typeof window !== 'undefined') {
    import('../lib/cache/deduplication').then(({ deduplicateRequest, clearCache }) => {
      (window as any).deduplicateRequest = deduplicateRequest;
      (window as any).clearRequestCache = clearCache;
    }).catch(() => {
      console.warn('فشل في تحميل نظام منع الطلبات المكررة');
    });
  }

  // تهيئة نظام التحديث المتطور
  setGlobalQueryClient(queryClient);

  // Lazy load heavy analytics and debugging tools
  setTimeout(() => {
    Promise.all([
      import('../lib/analytics/initializePerformanceAnalytics').then(({ initializePerformanceAnalytics }) => initializePerformanceAnalytics()),
      import('../lib/cache/cache-debugger-init').then(({ initializeCacheDebugger }) => initializeCacheDebugger())
    ]).catch(() => {});
  }, 200);
};

// ============ إعدادات التطوير ============
export const setupDevelopmentTools = () => {
  if (import.meta.env.DEV) {
    // دوال سهلة الوصول للتطوير
    (window as any).forceRefreshAfterMutation = (
      dataType: 'products' | 'categories' | 'orders' | 'inventory' | 'settings' | 'subscriptions' | 'apps' | 'all' = 'all',
      operation: 'create' | 'update' | 'delete' = 'update'
    ) => {
      import('../lib/data-refresh-helpers').then(({ refreshAfterMutation }) => {
        refreshAfterMutation(dataType, operation);
      });
    };

    // دوال محددة للبيانات الشائعة
    (window as any).refreshProducts = () => (window as any).forceRefreshAfterMutation('products', 'update');
    (window as any).refreshCategories = () => (window as any).forceRefreshAfterMutation('categories', 'update');
    (window as any).refreshOrders = () => (window as any).forceRefreshAfterMutation('orders', 'update');
    (window as any).refreshInventory = () => (window as any).forceRefreshAfterMutation('inventory', 'update');
    (window as any).refreshAll = () => (window as any).forceRefreshAfterMutation('all', 'update');
  }
};

// ============ إعدادات البيئة ============
export const setupEnvironmentSettings = () => {
  const isRunningInElectron = isElectron();

  // وضع علامة عالمية على نوع البيئة
  if (typeof window !== 'undefined') {
    (window as any).__IS_ELECTRON_APP = isRunningInElectron;
    
    // منع المزامنة والتحديث التلقائي في المتصفح
    if (!isRunningInElectron) {
      (window as any).__SYNC_DISABLED_IN_BROWSER = true;
      (window as any).__PREVENT_AUTO_REFRESH = true;
    }
  }

  // إعدادات QueryClient حسب البيئة
  if (typeof window !== 'undefined') {
    (window as any).__REACT_QUERY_GLOBAL_CLIENT = queryClient;

    // إعدادات إضافية بناءً على البيئة
    if (!isRunningInElectron) {
      // تعطيل إضافي للتحديث التلقائي في المتصفح
      queryClient.setDefaultOptions({
        queries: {
          ...queryClient.getDefaultOptions().queries,
          refetchOnWindowFocus: false,
          refetchOnMount: true, // ✅ السماح بالتحديث عند تحميل المكون
          refetchOnReconnect: true, // ✅ السماح بإعادة الاتصال
        }
      });
    }

    // معالج تغيير التبويب
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (isRunningInElectron) {
          // استئناف الـ mutations قيد التنفيذ
          queryClient.resumePausedMutations();
        } else {
          queryClient.resumePausedMutations();
          
          // تأكيد تعطيل التحديث التلقائي المفرط مع السماح بالتحديث الضروري
          queryClient.setDefaultOptions({
            queries: {
              refetchOnWindowFocus: false,
              refetchOnMount: true,
              refetchOnReconnect: true,
              staleTime: 0, // 🚫 CACHE DISABLED - Always fresh
              gcTime: 0, // 🚫 CACHE DISABLED - No cache retention
            }
          });
        }
      } else {
        // إلغاء آمن للاستعلامات النشطة فقط
        queryClient.cancelQueries({
          predicate: (query) => {
            const state = query.state;
            return state.fetchStatus === 'fetching' || state.status === 'pending';
          }
        });
      }
    });
  }
};

// ============ تهيئة شاملة ============
export const initializeApp = () => {
  console.log('🎯 App Component: بدء تحميل المكون', {
    appComponentStartTimeMs: Math.round(performance.now() - pageStartTime),
    timeFromPageStart: (performance.now() - pageStartTime).toFixed(2) + 'ms'
  });

  initializeAppSystems();
  setupDevelopmentTools();
  setupEnvironmentSettings();
};

export { queryClient, appTsxStartTime, pageStartTime }; 