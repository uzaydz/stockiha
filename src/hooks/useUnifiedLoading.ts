import { useState, useCallback, useEffect, useMemo } from 'react';

type LoadingState = {
  isPageLoading: boolean;
  isDataLoading: boolean;
  isComponentsLoading: boolean;
  loadedComponents: Set<string>;
  totalComponents: number;
};

type UseUnifiedLoadingReturn = {
  loadingState: LoadingState;
  setPageLoading: (loading: boolean) => void;
  setDataLoading: (loading: boolean) => void;
  setComponentLoading: (componentId: string, loading: boolean) => void;
  setTotalComponents: (total: number) => void;
  isAnyLoading: boolean;
  shouldShowGlobalLoader: boolean;
  getLoadingProgress: () => number;
};

const FINISH_TIMEOUT_MS = 4000;

const createInitialState = (): LoadingState => ({
  isPageLoading: true,
  isDataLoading: true,
  isComponentsLoading: false,
  loadedComponents: new Set<string>(),
  totalComponents: 0,
});

const hasWindowDataReady = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const win: any = window;
  return Boolean(
    win.__EARLY_STORE_DATA__?.data ||
      win.__CURRENT_STORE_DATA__ ||
      win.__PREFETCHED_STORE_DATA__ ||
      win.__SHARED_STORE_DATA__
  );
};

export const useUnifiedLoading = (): UseUnifiedLoadingReturn => {
  const [loadingState, setLoadingState] = useState<LoadingState>(createInitialState);

  const finishDataLoading = useCallback(() => {
    console.log('🧪 [useUnifiedLoading] finishDataLoading invoked');
    setLoadingState((prev) => {
      console.log('🧪 [useUnifiedLoading] finishDataLoading state before', {
        isPageLoading: prev.isPageLoading,
        isDataLoading: prev.isDataLoading,
        totalComponents: prev.totalComponents,
        loadedComponents: prev.loadedComponents.size,
      });
      if (!prev.isPageLoading && !prev.isDataLoading) {
        return prev;
      }

      const shouldKeepComponentsLoading =
        prev.totalComponents > 0 && prev.loadedComponents.size < prev.totalComponents;

      return {
        ...prev,
        isPageLoading: false,
        isDataLoading: false,
        isComponentsLoading: shouldKeepComponentsLoading,
      };
    });
  }, []);

  const setPageLoading = useCallback((loading: boolean) => {
    setLoadingState((prev) => ({ ...prev, isPageLoading: loading }));
  }, []);

  const setDataLoading = useCallback((loading: boolean) => {
    setLoadingState((prev) => ({ ...prev, isDataLoading: loading }));
  }, []);

  const setComponentLoading = useCallback((componentId: string, loading: boolean) => {
    console.log('🧪 [useUnifiedLoading] setComponentLoading', { componentId, loading });
    setLoadingState((prev) => {
      const loadedComponents = new Set(prev.loadedComponents);

      if (loading) {
        loadedComponents.delete(componentId);
      } else {
        loadedComponents.add(componentId);
      }

      const allComponentsLoaded =
        prev.totalComponents > 0 && loadedComponents.size >= prev.totalComponents;

      console.log('🧪 [useUnifiedLoading] setComponentLoading state', {
        totalComponents: prev.totalComponents,
        loadedComponents: loadedComponents.size,
        allComponentsLoaded,
      });

      return {
        ...prev,
        loadedComponents,
        isComponentsLoading: prev.totalComponents > 0 ? !allComponentsLoaded : false,
        isPageLoading: allComponentsLoaded ? false : prev.isPageLoading,
        isDataLoading: allComponentsLoaded ? false : prev.isDataLoading,
      };
    });
  }, []);

  const setTotalComponents = useCallback((total: number) => {
    console.log('🧪 [useUnifiedLoading] setTotalComponents', { total });
    setLoadingState((prev) => {
      const loadedComponents = new Set(prev.loadedComponents);
      const boundedTotal = total < 0 ? 0 : total;
      const allLoaded = boundedTotal > 0 && loadedComponents.size >= boundedTotal;

      console.log('🧪 [useUnifiedLoading] setTotalComponents state', {
        boundedTotal,
        loadedComponents: loadedComponents.size,
        allLoaded,
      });

      return {
        ...prev,
        totalComponents: boundedTotal,
        isComponentsLoading: boundedTotal > 0 ? !allLoaded : false,
        isPageLoading: allLoaded ? false : prev.isPageLoading,
        isDataLoading: allLoaded ? false : prev.isDataLoading,
      };
    });
  }, []);

  useEffect(() => {
    if (hasWindowDataReady()) {
      console.log('🧪 [useUnifiedLoading] window data detected, finishing loading');
      finishDataLoading();
    }
  }, [finishDataLoading]);

  useEffect(() => {
    const handleStoreDataReady = () => finishDataLoading();

    window.addEventListener('storeDataReady', handleStoreDataReady);
    window.addEventListener('storeInitDataReady', handleStoreDataReady);

    return () => {
      window.removeEventListener('storeDataReady', handleStoreDataReady);
      window.removeEventListener('storeInitDataReady', handleStoreDataReady);
    };
  }, [finishDataLoading]);

  useEffect(() => {
    const timeout = window.setTimeout(finishDataLoading, FINISH_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [finishDataLoading]);

  const getLoadingProgress = useCallback(() => {
    const { isPageLoading, isDataLoading, loadedComponents, totalComponents } = loadingState;

    let progress = 0;

    progress += isPageLoading ? 15 : 30;
    progress += isDataLoading ? 15 : 30;

    if (totalComponents === 0) {
      progress += 40;
    } else {
      const ratio = Math.min(1, loadedComponents.size / Math.max(totalComponents, 1));
      progress += Math.max(10, Math.round(ratio * 40));
    }

    return Math.min(100, Math.round(progress));
  }, [loadingState]);

  const isAnyLoading = useMemo(() => {
    return (
      loadingState.isPageLoading ||
      loadingState.isDataLoading ||
      loadingState.isComponentsLoading
    );
  }, [loadingState.isPageLoading, loadingState.isDataLoading, loadingState.isComponentsLoading]);

  const shouldShowGlobalLoader = useMemo(() => {
    if (loadingState.isPageLoading) {
      return true;
    }

    if (loadingState.isDataLoading && loadingState.loadedComponents.size === 0) {
      return true;
    }

    return false;
  }, [loadingState.isPageLoading, loadingState.isDataLoading, loadingState.loadedComponents.size]);

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

export type { UseUnifiedLoadingReturn };
