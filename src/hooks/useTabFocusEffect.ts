import { useEffect, useRef, useState } from 'react';
import { isElectron } from '@/lib/isElectron';

interface TabFocusOptions {
  onFocus?: () => void | (() => void);
  onBlur?: () => void;
  fastReturnThreshold?: number;
}

/**
 * خطاف لإدارة تأثيرات تغيير التركيز على علامة التبويب مع الحماية من إعادة التحميل غير الضرورية
 * 
 * @param options خيارات التكوين مع دوال الاستدعاء للتركيز وفقدان التركيز
 * @param dependencies مصفوفة التبعيات التي تؤثر على متى يجب تشغيل الدالة من جديد
 */
export function useTabFocusEffect(
  options: TabFocusOptions,
  dependencies: any[] = []
) {
  const { 
    onFocus,
    onBlur,
    fastReturnThreshold = 1000 * 60 * 5
  } = options;
  
  const lastFocusTime = useRef<number>(Date.now());
  const onFocusRef = useRef<(() => void | (() => void)) | undefined>(onFocus);
  const onBlurRef = useRef<(() => void) | undefined>(onBlur);
  const cleanupRef = useRef<(() => void) | undefined | void>(undefined);
  const [isVisible, setIsVisible] = useState<boolean>(document.visibilityState === 'visible');
  const lastVisibleState = useRef<boolean>(document.visibilityState === 'visible');
  // تحديد ما إذا كان التطبيق يعمل في بيئة Electron
  const isRunningInElectron = isElectron();

  // إذا كان هناك عميل React Query عالمي، نستخدمه لتعليق وإعادة تفعيل الاستعلامات
  const getQueryClient = () => {
    if (typeof window !== 'undefined') {
      return (window as any).__REACT_QUERY_GLOBAL_CLIENT;
    }
    return null;
  };

  // تحديث المراجع عند تغيير دوال الاستدعاء
  useEffect(() => {
    onFocusRef.current = onFocus;
    onBlurRef.current = onBlur;
  }, [onFocus, onBlur]);

  useEffect(() => {
    /**
     * معالج تغيير وضع الرؤية للصفحة
     */
    const handleVisibilityChange = () => {
      const isTabVisible = document.visibilityState === 'visible';
      const now = Date.now();
      
      // تجنب إعادة التحميل إذا لم يتغير الوضع
      if (isTabVisible === lastVisibleState.current) {
        return;
      }
      
      lastVisibleState.current = isTabVisible;
      setIsVisible(isTabVisible);
      
      if (isTabVisible) {
        const timeSinceLastFocus = now - lastFocusTime.current;
        
        // تسجيل للتصحيح
        
        
        // تنظيف أي عملية سابقة قبل تنفيذ الوظيفة من جديد
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = undefined;
        }
        
        // استدعاء وظيفة onFocus فقط إذا كان التطبيق يعمل في بيئة Electron
        if (onFocusRef.current && isRunningInElectron) {
          // استدعاء وظيفة التركيز وتخزين دالة التنظيف إن وجدت
          cleanupRef.current = onFocusRef.current();
          
          // استئناف عمليات الـ mutations المتوقفة فقط
          const queryClient = getQueryClient();
          if (queryClient) {
            queryClient.resumePausedMutations();
          }
        } else {
          // في حالة المتصفح، لا نقوم بأي تحديث للاستعلامات، فقط نستأنف المعاملات
          const queryClient = getQueryClient();
          if (queryClient) {
            queryClient.resumePausedMutations();
            // منع إبطال صلاحية الاستعلامات في المتصفح
            queryClient.setDefaultOptions({
              queries: {
                refetchOnWindowFocus: false,
                refetchOnMount: false,
                refetchOnReconnect: false,
              }
            });
          }
        }
      } else {
        // تحديث وقت آخر تركيز عند مغادرة التبويب
        lastFocusTime.current = now;
        
        // استدعاء وظيفة فقدان التركيز إن وجدت
        if (onBlurRef.current) {
          onBlurRef.current();
        }
        
        // تعليق استعلامات React Query عند مغادرة التبويب
        const queryClient = getQueryClient();
        if (queryClient) {
          queryClient.cancelQueries();
        }
      }
    };

    // تسجيل معالج الحدث
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // تنظيف عند إزالة المكون
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = undefined;
      }
    };
  }, [fastReturnThreshold, ...dependencies]); // إضافة التبعيات إلى مصفوفة التبعيات

  // توفير وظائف مساعدة للتحقق من حالة التبويب
  return {
    isVisible,
    isHidden: !isVisible,
    isElectron: isRunningInElectron,
    checkIfRecentlyReturned: () => {
      const timeSinceLastFocus = Date.now() - lastFocusTime.current;
      return timeSinceLastFocus < fastReturnThreshold;
    },
    resetFocusTime: () => {
      lastFocusTime.current = Date.now();
    }
  };
}

export default useTabFocusEffect; 