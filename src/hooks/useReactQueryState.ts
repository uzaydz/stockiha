import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * خطاف مخصص لإدارة حالة React Query مع منع تراكم الكاش
 * يحسن الأداء ويمنع ارتفاع استهلاك الذاكرة
 */
export function useReactQueryState() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // إعداد خيارات React Query المحسنة مع تنظيف دوري
    queryClient.setDefaultOptions({
      queries: {
        refetchOnMount: true,        // ✅ تحديث عند تحميل المكون
        refetchOnWindowFocus: false, // ❌ منع التحديث عند التركيز على النافذة
        refetchOnReconnect: false,   // ❌ منع التحديث عند إعادة الاتصال (لتقليل الطلبات)
        staleTime: 1 * 60 * 1000,    // البيانات صالحة لدقيقة واحدة فقط
        gcTime: 3 * 60 * 1000,       // تنظيف البيانات بعد 3 دقائق
        retry: 1,                    // محاولة واحدة فقط
        retryDelay: 1000,           // ثانية واحدة بين المحاولات
      }
    });

    // تنظيف دوري للكاش كل 5 دقائق
    const cleanupInterval = setInterval(() => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      queries.forEach((query) => {
        const state = query.state;
        if (state.dataUpdatedAt) {
          const age = Date.now() - state.dataUpdatedAt;
          // إزالة البيانات الأقدم من 5 دقائق
          if (age > 5 * 60 * 1000) {
            queryClient.removeQueries({ queryKey: query.queryKey });
          }
        }
      });
    }, 5 * 60 * 1000); // كل 5 دقائق

    // تنظيف عند تغير حالة التبويب
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // عند إخفاء التبويب، نظف البيانات القديمة
        queryClient.invalidateQueries({
          predicate: (query) => {
            const state = query.state;
            if (state.dataUpdatedAt) {
              const age = Date.now() - state.dataUpdatedAt;
              return age > 2 * 60 * 1000; // البيانات الأقدم من دقيقتين
            }
            return false;
          }
        });
      }
    };

    // تنظيف عند إغلاق الصفحة
    const handleBeforeUnload = () => {
      queryClient.clear();
    };

    // إضافة مستمعي الأحداث
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // تنظيف عند إلغاء التحميل
    return () => {
      clearInterval(cleanupInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [queryClient]);
}

export default useReactQueryState;
