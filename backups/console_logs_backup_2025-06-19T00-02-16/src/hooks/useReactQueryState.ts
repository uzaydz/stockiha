import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isElectron } from '@/lib/isElectron';

/**
 * خطاف مخصص للحفاظ على حالة React Query بين تبديل نوافذ التبويب
 * وتجنب إعادة تحميل البيانات غير الضرورية
 */
export function useReactQueryState() {
  const queryClient = useQueryClient();
  // تحديد ما إذا كان التطبيق يعمل في بيئة Electron
  const isRunningInElectron = isElectron();
  
  // عند تحميل المكون، نقوم بإعداد مستمعي الأحداث لمعالجة تبديل التبويبات
  useEffect(() => {
    // منع التحديث التلقائي المفرط مع السماح بالتحديث الضروري
    if (!isRunningInElectron) {
      
      queryClient.setDefaultOptions({
        queries: {
          refetchOnMount: true, // ✅ السماح بالتحديث عند تحميل المكون
          refetchOnWindowFocus: false,
          refetchOnReconnect: true, // ✅ السماح بإعادة الاتصال
          staleTime: 2 * 60 * 1000, // دقيقتين للسماح بالتحديث الأسرع
          gcTime: 10 * 60 * 1000, // 10 دقائق للتنظيف
        }
      });
    }

    // معالج لحدث الانتقال بين الصفحات
    const handleBeforeUnload = () => {
      // تخزين حالة التطبيق قبل مغادرة الصفحة
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('BAZAAR_APP_STATE_TIMESTAMP', Date.now().toString());
      }
    };
    
    // معالج لحدث تحميل الصفحة
    const handlePageLoad = () => {
      // إذا كنا في متصفح، نمنع التحديث التلقائي المفرط
      if (!isRunningInElectron) {
        
        queryClient.setDefaultOptions({
          queries: {
            refetchOnMount: true, // ✅ السماح بالتحديث عند تحميل المكون
            refetchOnWindowFocus: false,
            refetchOnReconnect: true, // ✅ السماح بإعادة الاتصال
            staleTime: 2 * 60 * 1000, // دقيقتين للسماح بالتحديث الأسرع
            gcTime: 10 * 60 * 1000,
          }
        });
        return;
      }

      // حاول استعادة بيانات التخزين المؤقت من localStorage في Electron
      try {
        const lastStateTime = parseInt(window.localStorage.getItem('BAZAAR_APP_STATE_TIMESTAMP') || '0');
        const now = Date.now();
        const staleDuration = 5 * 60 * 1000; // 5 دقائق
        
        // تعطيل invalidateQueries بشكل كامل لمنع الطلبات المكررة
        // React Query سيعيد استخدام البيانات المخزنة بدلاً من إجراء طلبات جديدة
        console.log('🚫 React Query invalidation disabled to prevent duplicate requests');
      } catch (error) {
      }
    };
    
    // معالج تغير حالة التبويب (مرئي/مخفي)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // إذا كنا في متصفح، نمنع تحديث البيانات عند العودة للتبويب
        if (!isRunningInElectron) {
          
          queryClient.resumePausedMutations(); // استئناف المعاملات فقط
          return;
        }

        // في Electron، نسمح بالتحديث المحدود
        const lastStateTime = parseInt(window.localStorage.getItem('BAZAAR_APP_STATE_TIMESTAMP') || '0');
        const now = Date.now();
        const fastReturnThreshold = 1 * 60 * 1000; // 1 دقيقة

        // استئناف العمليات المتوقفة
        queryClient.resumePausedMutations();
        
        // إبطال صلاحية الاستعلامات النشطة فقط
        if (now - lastStateTime < fastReturnThreshold) {
          
          // queryClient.invalidateQueries({ type: 'active' }); // تم التعليق لمنع الإبطال هنا أيضاً
        } else {
          
          // queryClient.invalidateQueries(); // تم التعليق لمنع الإبطال هنا أيضاً
        }
      } else {
        // عند مغادرة التبويب
        window.localStorage.setItem('BAZAAR_APP_STATE_TIMESTAMP', Date.now().toString());
        // إلغاء آمن للاستعلامات النشطة فقط
        queryClient.cancelQueries({
          predicate: (query) => {
            const state = query.state;
            return state.fetchStatus === 'fetching' || state.status === 'pending';
          }
        });
      }
    };
    
    // تسجيل مستمعي الأحداث
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('load', handlePageLoad);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // تنظيف
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('load', handlePageLoad);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient, isRunningInElectron]);
  
  return null;
}

export default useReactQueryState;
