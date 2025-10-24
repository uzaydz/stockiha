import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// إعدادات React Query محسنة للأداء العالي ومنع الاستدعاءات المكررة
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // تحسين أوقات التخزين المؤقت - توازن بين الأداء والبيانات الحديثة
      staleTime: 10 * 60 * 1000, // 10 دقائق - زيادة لتقليل الاستدعاءات المكررة
      gcTime: 30 * 60 * 1000, // 30 دقيقة - زيادة للحفاظ على البيانات في الذاكرة
      
      // تحسين إعادة المحاولة - تقليل التأخير
      retry: 1, // محاولة واحدة إضافية لتجنب الفشل المؤقت
      retryDelay: 1000, // ثانية واحدة
      
      // تحسين سلوك التحديث - تقليل الاستدعاءات غير الضرورية
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // إعادة التحميل عند استعادة الاتصال
      refetchOnMount: true, // استخدام true مع staleTime أطول - React Query لن يعيد الجلب إذا كانت البيانات حديثة
      refetchInterval: false, // تعطيل التحديث التلقائي
      
      // تحسين الشبكة - أولوية للسرعة
      networkMode: 'online', // العمل فقط عند الاتصال
      
      // تحسين إضافي للأداء
      structuralSharing: true, // مشاركة البنية
      throwOnError: false, // عدم رمي الأخطاء لتجنب التوقف
      
      // إضافة notifyOnChangeProps لتقليل re-renders
      notifyOnChangeProps: ['data', 'error', 'isLoading', 'isFetching'],
    },
    mutations: {
      retry: 1, // محاولة واحدة إضافية
      retryDelay: 1000,
      networkMode: 'online',
      throwOnError: false,
    },
  },
  
  // تحسين إعدادات Cache
  mutationCache: undefined, // تعطيل mutation cache لتوفير الذاكرة
  
  // تحسين إضافي للأداء
});

// تفعيل حفظ React Query محليًا (LocalStorage في سطح المكتب كافٍ وبسيط)
if (typeof window !== 'undefined') {
  const key = 'rq-desktop-cache-v2';
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key,
    throttleTime: 1000,
    serialize: (client) => JSON.stringify(client),
    deserialize: (cached) => JSON.parse(cached)
  });

  try {
    persistQueryClient({
      queryClient,
      persister,
      maxAge: 24 * 60 * 60 * 1000, // يوم واحد
      buster: 'desktop-cache-v1',
      dehydrateOptions: {
        // لا تحفظ الاستعلامات المعلّقة/الفاشلة لتجنب أخطاء الاستعادة
        shouldDehydrateQuery: (query) => query.state.status === 'success'
      }
    });
  } catch (e) {
    // إذا فشلت الاستعادة لأي سبب، احذف الكاش وتابع بدون تعطيل التطبيق
    try { window.localStorage.removeItem(key); } catch {}
  }
}

// تنظيف دوري مبسط
export function cleanupQueryCache() {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  queries.forEach((query) => {
    const state = query.state;
    if (state.dataUpdatedAt) {
      const age = Date.now() - state.dataUpdatedAt;
      // إزالة الاستعلامات الأقدم من 10 دقائق (بدلاً من 24 ساعة)
      if (age > 10 * 60 * 1000) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    }
  });
}

// تنظيف سريع عند بدء التشغيل
if (typeof window !== 'undefined') {
  // تنظيف فوري
  setTimeout(cleanupQueryCache, 1000);
  
  // تنظيف كل 10 دقائق (بدلاً من كل ساعة)
  setInterval(cleanupQueryCache, 10 * 60 * 1000);
  
  // تنظيف عند إغلاق الصفحة
  window.addEventListener('beforeunload', () => {
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
