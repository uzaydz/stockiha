/**
 * ⚡ Query Client Configuration - Best Practices 2025
 * ============================================================
 *
 * 🚀 إعدادات محسّنة للتكامل مع PowerSync:
 *   - لا حاجة لـ refetch - PowerSync يدير التحديثات التلقائية
 *   - networkMode: 'offlineFirst' للعمل بدون اتصال
 *   - staleTime عالي لأن PowerSync يحافظ على البيانات محدّثة
 *
 * المصادر:
 * - https://docs.powersync.com/client-sdk-references/javascript-web
 * - https://www.powersync.com/blog/sqlite-optimizations-for-ultra-high-performance
 * ============================================================
 */

import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// إعدادات React Query محسنة للأداء العالي ومنع الاستدعاءات المكررة
// ⚡ متوافق مع PowerSync reactive queries
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ⚡ تحسين أوقات التخزين المؤقت - تقليل استهلاك الذاكرة
      staleTime: 3 * 60 * 1000, // ⚡ 3 دقائق بدلاً من 10 - لتقليل الذاكرة
      gcTime: 5 * 60 * 1000, // ⚡ 5 دقائق بدلاً من 30 - تنظيف أسرع

      // تحسين إعادة المحاولة - تقليل التأخير
      retry: 1, // محاولة واحدة إضافية لتجنب الفشل المؤقت
      retryDelay: 1000, // ثانية واحدة

      // تحسين سلوك التحديث - تقليل الاستدعاءات غير الضرورية
      refetchOnWindowFocus: false,
      refetchOnReconnect: false, // ⚡ تعطيل - قد يسبب CancelledError عند التنقل السريع
      refetchOnMount: false, // ⚡ تغيير إلى false - يقلل الاستدعاءات المكررة
      refetchInterval: false, // تعطيل التحديث التلقائي

      // ⚡ تحسين الشبكة للعمل offline-first - يمنع CancelledError
      networkMode: 'offlineFirst', // استخدام الكاش أولاً ثم الشبكة

      // تحسين إضافي للأداء
      structuralSharing: true, // مشاركة البنية
      throwOnError: false, // عدم رمي الأخطاء لتجنب التوقف

      // إضافة notifyOnChangeProps لتقليل re-renders
      notifyOnChangeProps: ['data', 'error', 'isLoading', 'isFetching'],
    },
    mutations: {
      retry: 1, // محاولة واحدة إضافية
      retryDelay: 1000,
      networkMode: 'offlineFirst', // ⚡ offlineFirst للمزامنة اللاحقة
      throwOnError: false,
    },
  },
  
  // تحسين إعدادات Cache
  mutationCache: undefined, // تعطيل mutation cache لتوفير الذاكرة
  
  // تحسين إضافي للأداء
});

// تفعيل حفظ React Query محليًا (LocalStorage في سطح المكتب كافٍ وبسيط)
if (typeof window !== 'undefined') {
  const key = 'rq-desktop-cache-v3'; // ⚡ v3 للتخلص من الكاش القديم

  // ⚡ تنظيف الكاش القديمة أولاً لمنع CancelledError
  try {
    window.localStorage.removeItem('rq-desktop-cache-v1');
    window.localStorage.removeItem('rq-desktop-cache-v2');
  } catch {}

  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key,
    throttleTime: 1000,
    serialize: (client) => JSON.stringify(client),
    deserialize: (cached) => {
      try {
        const parsed = JSON.parse(cached);
        // ⚡ تصفية الاستعلامات المعلقة قبل الاستعادة
        if (parsed?.clientState?.queries) {
          parsed.clientState.queries = parsed.clientState.queries.filter(
            (q: any) => q.state?.status === 'success' && q.state?.data !== undefined
          );
        }
        return parsed;
      } catch {
        return { clientState: { queries: [], mutations: [] } };
      }
    }
  });

  try {
    persistQueryClient({
      queryClient,
      persister,
      maxAge: 24 * 60 * 60 * 1000, // يوم واحد
      buster: 'desktop-cache-v3', // ⚡ تحديث للتخلص من الكاش القديم
      dehydrateOptions: {
        // ⚡ لا تحفظ الاستعلامات المعلّقة/الفاشلة لتجنب CancelledError
        shouldDehydrateQuery: (query) => {
          // فقط حفظ الاستعلامات الناجحة التي لديها بيانات
          return query.state.status === 'success' && query.state.data !== undefined;
        }
      },
      hydrateOptions: {
        // ⚡ معالجة الأخطاء أثناء الاستعادة بهدوء
        defaultOptions: {
          queries: {
            // لا ترمي أخطاء للاستعلامات المستعادة
            throwOnError: false,
          }
        }
      }
    });
  } catch (e) {
    // إذا فشلت الاستعادة لأي سبب، احذف الكاش وتابع بدون تعطيل التطبيق
    console.warn('[QueryClient] Cache restoration failed, clearing:', e);
    try { window.localStorage.removeItem(key); } catch {}
  }
}

// ⚡ تنظيف دوري محسّن - يحترم gcTime بدلاً من قيمة ثابتة
export function cleanupQueryCache() {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  queries.forEach((query) => {
    const state = query.state;
    if (state.dataUpdatedAt) {
      const age = Date.now() - state.dataUpdatedAt;
      // ⚡ إزالة الاستعلامات الأقدم من gcTime (5 دقائق)
      const gcTime = (query.options as any).gcTime || 5 * 60 * 1000;
      if (age > gcTime) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    }
  });
}

// ⚡ تنظيف محسّن عند بدء التشغيل
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

if (typeof window !== 'undefined') {
  // تنظيف بعد 5 ثواني من بدء التشغيل (لإعطاء وقت للتهيئة)
  setTimeout(cleanupQueryCache, 5000);

  // ⚡ تنظيف كل 5 دقائق (متوافق مع gcTime الجديد)
  cleanupIntervalId = setInterval(cleanupQueryCache, 5 * 60 * 1000);

  // تنظيف عند إغلاق الصفحة
  window.addEventListener('beforeunload', () => {
    // ⚡ تنظيف الـ interval أولاً
    if (cleanupIntervalId) {
      clearInterval(cleanupIntervalId);
      cleanupIntervalId = null;
    }
    queryClient.clear();
  });
}

// تصدير افتراضي للتوافق
export default queryClient;

// تصدير إضافي للتوافق مع require
if (typeof module !== 'undefined' && module.exports) {
  module.exports = queryClient;
  module.exports.default = queryClient;
}
