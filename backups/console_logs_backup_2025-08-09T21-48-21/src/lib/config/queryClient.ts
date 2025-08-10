import { QueryClient } from '@tanstack/react-query';

// إعدادات React Query محسنة للأداء العالي
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // تحسين أوقات التخزين المؤقت - تقليل التأخير
      staleTime: 30 * 1000, // 30 ثانية فقط للبيانات الحديثة
      gcTime: 2 * 60 * 1000, // دقيقتان فقط للذاكرة
      
      // تحسين إعادة المحاولة - تقليل التأخير
      retry: 0, // لا توجد محاولات إضافية لتسريع الاستجابة
      retryDelay: 500, // نصف ثانية فقط
      
      // تحسين سلوك التحديث - منع التحديث غير الضروري
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: 'always', // تحديث دائماً عند التحميل
      
      // تحسين الشبكة - أولوية للسرعة
      networkMode: 'online', // العمل فقط عند الاتصال
      
      // تحسين إضافي للأداء
      structuralSharing: true, // مشاركة البنية
      throwOnError: false, // عدم رمي الأخطاء لتجنب التوقف
    },
    mutations: {
      retry: 0, // لا توجد محاولات إضافية
      retryDelay: 500,
      networkMode: 'online',
      throwOnError: false,
    },
  },
  
  // تحسين إعدادات Cache
  mutationCache: undefined, // تعطيل mutation cache لتوفير الذاكرة
  
  // تحسين Logger
  logger: {
    log: () => {}, // تعطيل السجلات لتحسين الأداء
    warn: () => {},
    error: console.error, // الاحتفاظ بالأخطاء فقط
  },
});

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

export default queryClient;
