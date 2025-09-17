import { useState, useCallback, useEffect, useRef } from 'react';

interface LoadingState {
  isPageLoading: boolean;
  isDataLoading: boolean;
  isComponentsLoading: boolean;
  loadedComponents: Set<string>;
  totalComponents: number;
}

interface UseUnifiedLoadingReturn {
  loadingState: LoadingState;
  setPageLoading: (loading: boolean) => void;
  setDataLoading: (loading: boolean) => void;
  setComponentLoading: (componentId: string, loading: boolean) => void;
  setTotalComponents: (total: number) => void;
  isAnyLoading: boolean;
  shouldShowGlobalLoader: boolean;
  getLoadingProgress: () => number;
}

export const useUnifiedLoading = (): UseUnifiedLoadingReturn => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isPageLoading: true,
    isDataLoading: true,
    isComponentsLoading: false,
    loadedComponents: new Set(),
    totalComponents: 0,
  });

  // 🚨 إضافة timeout إجباري لإنهاء التحميل مع فحص البيانات - محسن لتجنب التكرار
  useEffect(() => {
    const forceStopLoading = setTimeout(() => {
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('🚨 [useUnifiedLoading] Forcing stop loading after timeout');
      }
      setLoadingState(prev => ({
        ...prev,
        isPageLoading: false,
        isDataLoading: false
      }));
    }, 3000); // تقليل إلى 3 ثوان

    // فحص البيانات المتوفرة بالفعل وإيقاف التحميل فوراً
    const checkExistingData = () => {
      const windowEarlyData = (window as any).__EARLY_STORE_DATA__;
      const windowSharedData = (window as any).__SHARED_STORE_DATA__;
      const windowCurrentData = (window as any).__CURRENT_STORE_DATA__;
      const windowPrefetchedData = (window as any).__PREFETCHED_STORE_DATA__;
      
      if (windowEarlyData?.data || windowSharedData || windowCurrentData || windowPrefetchedData) {
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.log('🎯 [useUnifiedLoading] Data already available, stopping loading immediately');
        }
        setLoadingState(prev => ({
          ...prev,
          isPageLoading: false,
          isDataLoading: false
        }));
        clearTimeout(forceStopLoading);
        return true;
      }
      return false;
    };

    // فحص البيانات فوراً
    if (!checkExistingData()) {
      // 🚀 استماع لحدث البيانات الجاهزة لإنهاء التحميل مبكراً
      const handleStoreDataReady = () => {
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.log('🎯 [useUnifiedLoading] Store data ready, stopping loading');
        }
        setLoadingState(prev => ({
          ...prev,
          isPageLoading: false,
          isDataLoading: false
        }));
        clearTimeout(forceStopLoading);
      };

      window.addEventListener('storeDataReady', handleStoreDataReady);
      window.addEventListener('storeInitDataReady', handleStoreDataReady);

      return () => {
        clearTimeout(forceStopLoading);
        window.removeEventListener('storeDataReady', handleStoreDataReady);
        window.removeEventListener('storeInitDataReady', handleStoreDataReady);
      };
    }

    return () => clearTimeout(forceStopLoading);
  }, []);

  // استخدام refs لتجنب dependency issues
  const loadingStateRef = useRef(loadingState);
  loadingStateRef.current = loadingState;

  const setPageLoading = useCallback((loading: boolean) => {
    setLoadingState(prev => {
      const newState = { ...prev, isPageLoading: loading };
      return newState;
    });
  }, []);

  const setDataLoading = useCallback((loading: boolean) => {
    setLoadingState(prev => {
      const newState = { ...prev, isDataLoading: loading };
      return newState;
    });
  }, []);

  const setComponentLoading = useCallback((componentId: string, loading: boolean) => {
    setLoadingState(prev => {
      const newLoadedComponents = new Set(prev.loadedComponents);
      if (!loading) {
        newLoadedComponents.add(componentId);
        // 
      } else {
        newLoadedComponents.delete(componentId);
      }
      
      return {
        ...prev,
        loadedComponents: newLoadedComponents,
        isComponentsLoading: newLoadedComponents.size < prev.totalComponents
      };
    });
  }, []);

  const setTotalComponents = useCallback((total: number) => {
    setLoadingState(prev => ({ 
      ...prev, 
      totalComponents: total,
      isComponentsLoading: prev.loadedComponents.size < total
    }));
  }, []);

  // حساب التقدم المحسن - إخفاء عند 60%
  const getLoadingProgress = useCallback(() => {
    const current = loadingStateRef.current;
    let progress = 0;
    
    // مرحلة تحميل الصفحة (0-30%)
    if (!current.isPageLoading) {
      progress += 30;
    } else {
      progress += 15; // تقدم جزئي
    }
    
    // مرحلة تحميل البيانات (30-60%) - الوصول إلى 60% = إخفاء
    if (!current.isDataLoading) {
      progress += 30;
    } else {
      progress += 15; // تقدم جزئي
    }
    
    // مرحلة تحميل المكونات (60-100%) - بمجرد تحميل أول مكون = 60%
    if (current.totalComponents > 0 && current.loadedComponents.size > 0) {
      // بمجرد تحميل أول مكون، نصل إلى 60% على الأقل
      const componentProgress = Math.max(30, (current.loadedComponents.size / current.totalComponents) * 40);
      progress += componentProgress;
    } else if (current.totalComponents === 0) {
      // إذا لم تكن هناك مكونات، اعتبر هذه المرحلة مكتملة
      progress += 40;
    }
    
    return Math.min(Math.round(progress), 100);
  }, []);

  // تحديد ما إذا كان هناك أي تحميل جاري
  const isAnyLoading = loadingState.isPageLoading || loadingState.isDataLoading || loadingState.isComponentsLoading;

  // تحديد ما إذا كان يجب عرض مؤشر التحميل العام - إخفاء بمجرد تحميل أول مكون
  const shouldShowGlobalLoader = loadingState.isPageLoading || 
    (loadingState.isDataLoading && loadingState.loadedComponents.size === 0);
    
  // تقليل رسائل التصحيح لتجنب التأثير على الأداء
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) { // 10% فقط
    console.log('🎯 [useUnifiedLoading] shouldShowGlobalLoader:', {
      isPageLoading: loadingState.isPageLoading,
      isDataLoading: loadingState.isDataLoading,
      loadedComponentsSize: loadingState.loadedComponents.size,
      shouldShowGlobalLoader
    });
  }


  // إيقاف تحميل الصفحة تلقائياً بمجرد تحميل البيانات أو أول مكون
  useEffect(() => {
    const { isDataLoading, loadedComponents } = loadingState;

    // إيقاف التحميل بمجرد تحميل البيانات أو أول مكون
    if (!isDataLoading || loadedComponents.size > 0) {
      const timer = setTimeout(() => {
        setPageLoading(false);
      }, 0); // ✅ إزالة التأخير لتحسين الأداء
      
      return () => clearTimeout(timer);
    }
  }, [loadingState.isDataLoading, loadingState.loadedComponents.size, setPageLoading]);

  // إضافة timeout أمان عام مُحسن - وقت قصير
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      setLoadingState({
        isPageLoading: false,
        isDataLoading: false,
        isComponentsLoading: false,
        loadedComponents: new Set(['safety-component']), // إضافة مكون وهمي لإيقاف التحميل
        totalComponents: 1,
      });
    }, 3000); // ✅ زيادة الوقت إلى 3 ثوانٍ لحل مشكلة التحميل السريع جداً

    return () => clearTimeout(safetyTimeout);
  }, []); // يتم تشغيله مرة واحدة فقط عند التحميل

  // إيقاف التحميل التلقائي عند عدم وجود أي نشاط لفترة قصيرة
  useEffect(() => {
    if (isAnyLoading) {
      const activityTimeout = setTimeout(() => {
        setLoadingState(prev => ({
          ...prev,
          isPageLoading: false,
          isDataLoading: false,
          isComponentsLoading: false,
          loadedComponents: new Set(['activity-timeout']), // إضافة مكون وهمي
          totalComponents: Math.max(prev.totalComponents, 1)
        }));
      }, 2000); // ✅ زيادة الوقت إلى ثانيتين لحل مشكلة التحميل السريع جداً
      
      return () => clearTimeout(activityTimeout);
    }
  }, [isAnyLoading]);

  return {
    loadingState,
    setPageLoading,
    setDataLoading,
    setComponentLoading,
    setTotalComponents,
    isAnyLoading,
    shouldShowGlobalLoader,
    getLoadingProgress,
  };
};
