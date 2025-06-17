import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { optimizedStoreService } from '@/services/OptimizedStoreService';

// =================================================================
// 🚀 STORE CONTEXT - إدارة حالة المتجر المحسنة
// =================================================================

interface StoreState {
  organizationData: any | null;
  storeSettings: any | null;
  components: any[];
  categories: any[];
  featuredProducts: any[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  cacheStats: any | null;
}

type StoreAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_STORE_DATA'; payload: Partial<StoreState> }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'UPDATE_COMPONENTS'; payload: any[] }
  | { type: 'UPDATE_CATEGORIES'; payload: any[] }
  | { type: 'UPDATE_FEATURED_PRODUCTS'; payload: any[] }
  | { type: 'SET_CACHE_STATS'; payload: any }
  | { type: 'INVALIDATE_CACHE' }
  | { type: 'RESET_STATE' };

const initialState: StoreState = {
  organizationData: null,
  storeSettings: null,
  components: [],
  categories: [],
  featuredProducts: [],
  isLoading: false,
  error: null,
  lastUpdated: 0,
  cacheStats: null,
};

// =================================================================
// 🎯 Store Reducer - إدارة التحديثات بكفاءة
// =================================================================
const storeReducer = (state: StoreState, action: StoreAction): StoreState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_STORE_DATA':
      return { 
        ...state, 
        ...action.payload, 
        lastUpdated: Date.now(),
        isLoading: false,
        error: null 
      };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'UPDATE_COMPONENTS':
      return { 
        ...state, 
        components: action.payload, 
        lastUpdated: Date.now() 
      };
    
    case 'UPDATE_CATEGORIES':
      return { 
        ...state, 
        categories: action.payload, 
        lastUpdated: Date.now() 
      };
    
    case 'UPDATE_FEATURED_PRODUCTS':
      return { 
        ...state, 
        featuredProducts: action.payload, 
        lastUpdated: Date.now() 
      };
    
    case 'SET_CACHE_STATS':
      return { ...state, cacheStats: action.payload };
    
    case 'INVALIDATE_CACHE':
      return { ...state, lastUpdated: 0 };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
};

// =================================================================
// 🎯 Store Context Definition
// =================================================================
interface StoreContextType {
  state: StoreState;
  dispatch: React.Dispatch<StoreAction>;
  loadStoreData: (subdomain: string, forceReload?: boolean) => Promise<void>;
  updateComponents: (components: any[]) => void;
  updateCategories: (categories: any[]) => void;
  updateFeaturedProducts: (products: any[]) => void;
  invalidateCache: (subdomain: string, orgId?: string) => Promise<void>;
  getCacheStats: () => void;
  resetStore: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

// =================================================================
// 🚀 Store Provider Component
// =================================================================
export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(storeReducer, initialState);

  // =================================================================
  // 🎯 تحميل بيانات المتجر
  // =================================================================
  const loadStoreData = useCallback(async (subdomain: string, forceReload = false) => {
    if (!subdomain) {
      dispatch({ type: 'SET_ERROR', payload: 'لم يتم تحديد نطاق المتجر' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // إذا كان هناك طلب لإعادة التحميل، قم بتنظيف الكاش أولاً
      if (forceReload) {
        await optimizedStoreService.clearStoreCache(subdomain);
      }

      const data = await optimizedStoreService.getStoreDataOptimized(subdomain);
      
      if (data) {
        dispatch({
          type: 'SET_STORE_DATA',
          payload: {
            organizationData: data.organizationData,
            storeSettings: data.storeSettings,
            components: data.components || [],
            categories: data.categories || [],
            featuredProducts: data.featuredProducts || [],
          }
        });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'لم يتم العثور على بيانات المتجر' });
      }
    } catch (error: any) {
      console.error('Error loading store data:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'خطأ في تحميل بيانات المتجر' });
    }
  }, []);

  // =================================================================
  // 🎯 تحديث المكونات
  // =================================================================
  const updateComponents = useCallback((components: any[]) => {
    dispatch({ type: 'UPDATE_COMPONENTS', payload: components });
  }, []);

  // =================================================================
  // 🎯 تحديث الفئات
  // =================================================================
  const updateCategories = useCallback((categories: any[]) => {
    dispatch({ type: 'UPDATE_CATEGORIES', payload: categories });
  }, []);

  // =================================================================
  // 🎯 تحديث المنتجات المميزة
  // =================================================================
  const updateFeaturedProducts = useCallback((products: any[]) => {
    dispatch({ type: 'UPDATE_FEATURED_PRODUCTS', payload: products });
  }, []);

  // =================================================================
  // 🎯 تنظيف الكاش
  // =================================================================
  const invalidateCache = useCallback(async (subdomain: string, orgId?: string) => {
    try {
      await optimizedStoreService.clearStoreCache(subdomain);
      dispatch({ type: 'INVALIDATE_CACHE' });
    } catch (error: any) {
      console.error('Error invalidating cache:', error);
    }
  }, []);

  // =================================================================
  // 🎯 الحصول على إحصائيات الكاش
  // =================================================================
  const getCacheStats = useCallback(() => {
    try {
      const stats = optimizedStoreService.getPerformanceStats();
      dispatch({ type: 'SET_CACHE_STATS', payload: stats });
    } catch (error) {
      console.error('Error getting cache stats:', error);
    }
  }, []);

  // =================================================================
  // 🎯 إعادة تعيين المتجر
  // =================================================================
  const resetStore = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  // =================================================================
  // 🎯 تحديث إحصائيات الكاش دورياً
  // =================================================================
  useEffect(() => {
    const interval = setInterval(() => {
      getCacheStats();
    }, 30000); // كل 30 ثانية

    return () => clearInterval(interval);
  }, [getCacheStats]);

  // =================================================================
  // 🎯 Context Value
  // =================================================================
  const contextValue: StoreContextType = {
    state,
    dispatch,
    loadStoreData,
    updateComponents,
    updateCategories,
    updateFeaturedProducts,
    invalidateCache,
    getCacheStats,
    resetStore,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
};

// =================================================================
// 🎯 Custom Hook لاستخدام Store Context
// =================================================================
export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
};

// =================================================================
// 🎯 Custom Hook للبيانات الأساسية فقط
// =================================================================
export const useStoreBasics = () => {
  const { state } = useStore();
  return {
    organizationData: state.organizationData,
    storeSettings: state.storeSettings,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
  };
};

// =================================================================
// 🎯 Custom Hook للمكونات فقط
// =================================================================
export const useStoreComponents = () => {
  const { state, updateComponents } = useStore();
  return {
    components: state.components,
    updateComponents,
    isLoading: state.isLoading,
  };
};

// =================================================================
// 🎯 Custom Hook للفئات والمنتجات
// =================================================================
export const useStoreProducts = () => {
  const { state, updateCategories, updateFeaturedProducts } = useStore();
  return {
    categories: state.categories,
    featuredProducts: state.featuredProducts,
    updateCategories,
    updateFeaturedProducts,
    isLoading: state.isLoading,
  };
};

// =================================================================
// 🎯 Custom Hook لإحصائيات الأداء
// =================================================================
export const useStorePerformance = () => {
  const { state, getCacheStats, invalidateCache } = useStore();
  return {
    cacheStats: state.cacheStats,
    lastUpdated: state.lastUpdated,
    getCacheStats,
    invalidateCache,
  };
};

export default StoreContext; 