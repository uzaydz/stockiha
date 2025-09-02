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
        // console.log('✅ تم تحميل مكون:', componentId, '- المكونات المحملة:', newLoadedComponents.size, '/', prev.totalComponents);
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

  // إضافة console.log لتتبع حالة التحميل
  useEffect(() => {
  }, [shouldShowGlobalLoader, loadingState.isPageLoading, loadingState.isDataLoading, loadingState.loadedComponents.size]);

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
