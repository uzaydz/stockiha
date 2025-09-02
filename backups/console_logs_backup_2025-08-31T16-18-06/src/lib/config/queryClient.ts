import { QueryClient } from '@tanstack/react-query';

// إعدادات React Query محسنة للأداء العالي
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // تحسين أوقات التخزين المؤقت - تقليل إعادة الجلب
      staleTime: 5 * 60 * 1000, // 5 دقائق افتراضياً للبيانات الثقيلة
      gcTime: 10 * 60 * 1000, // 10 دقائق للذاكرة
      
      // تحسين إعادة المحاولة - تقليل التأخير
      retry: 0, // لا توجد محاولات إضافية لتسريع الاستجابة
      retryDelay: 500, // نصف ثانية فقط
      
      // تحسين سلوك التحديث - منع التحديث غير الضروري
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false, // لا تعيد الجلب إلا إذا كانت البيانات قديمة
      
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
  
  // تحسين إضافي للأداء
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

// تصدير افتراضي للتوافق
export default queryClient;

// تصدير إضافي للتوافق مع require
if (typeof module !== 'undefined' && module.exports) {
  module.exports = queryClient;
  module.exports.default = queryClient;
}
