import { useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApps } from '@/context/AppsContext';
import { useTenant } from '@/context/TenantContext';
import { useShop } from '@/context/ShopContext';

// Cache للبيانات المشتركة
const CONTEXT_CACHE = new Map<string, {
  data: any;
  timestamp: number;
  ttl: number;
}>();

const CONTEXT_CACHE_TTL = 10 * 60 * 1000; // 10 دقائق

interface OptimizedPOSContextsData {
  // بيانات المصادقة
  user: any;
  userProfile: any;
  isAuthenticated: boolean;
  
  // بيانات المؤسسة
  currentOrganization: any;
  organizationId: string | null;
  
  // بيانات التطبيقات
  isAppEnabled: (appName: string) => boolean;
  availableApps: any[];
  organizationApps: any[];
  
  // بيانات المتجر
  shopProducts: any[];
  shopServices: any[];
  shopUsers: any[];
  shopOrders: any[];
  addOrder: (order: any) => Promise<any>;
  
  // حالة التحميل
  isLoading: boolean;
  authLoading: boolean;
  tenantLoading: boolean;
  appsLoading: boolean;
  shopLoading: boolean;
  
  // أخطاء
  errors: {
    auth?: string;
    tenant?: string;
    apps?: string;
    shop?: string;
  };
  
  // دوال التحديث
  refreshAuth: () => void;
  refreshTenant: () => void;
  refreshApps: () => void;
  refreshShop: () => void;
}

/**
 * Hook محسن لدمج جميع الـ contexts المستخدمة في نقطة البيع المحسنة
 * يمنع الاستدعاءات المتكررة ويحسن الأداء
 */
export const useOptimizedPOSContexts = (): OptimizedPOSContextsData => {
  // مراجع لمنع الاستدعاءات المتكررة
  const contextsInitializedRef = useRef(false);
  const lastInitTimeRef = useRef(0);
  const cacheKeyRef = useRef<string>('');

  // استخدام الـ contexts الأساسية
  const { user, userProfile, loading: authLoading } = useAuth();
  const { currentOrganization, isLoading: tenantLoading } = useTenant();
  const { isAppEnabled, availableApps, organizationApps, isLoading: appsLoading } = useApps();
  const { 
    products: shopProducts, 
    services: shopServices, 
    users: shopUsers, 
    orders: shopOrders, 
    addOrder, 
    isLoading: shopLoading 
  } = useShop();

  // دالة للحصول على البيانات من cache
  const getCachedData = (key: string) => {
    const cached = CONTEXT_CACHE.get(key);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return cached.data;
    }
    return null;
  };

  // دالة لحفظ البيانات في cache
  const setCachedData = (key: string, data: any, ttl: number = CONTEXT_CACHE_TTL) => {
    CONTEXT_CACHE.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  };

  // تهيئة الـ contexts مرة واحدة فقط
  useEffect(() => {
    if (!contextsInitializedRef.current && currentOrganization?.id) {
      contextsInitializedRef.current = true;
      lastInitTimeRef.current = Date.now();
      cacheKeyRef.current = `pos_contexts_${currentOrganization.id}`;
      
      // حفظ البيانات الأولية في cache
      const initialData = {
        user,
        userProfile,
        currentOrganization,
        availableApps,
        organizationApps,
        shopProducts,
        shopServices,
        shopUsers,
        shopOrders
      };
      
      setCachedData(cacheKeyRef.current, initialData);
    }
  }, [currentOrganization?.id, user, userProfile, availableApps, organizationApps, shopProducts, shopServices, shopUsers, shopOrders]);

  // تجميع البيانات مع cache
  const optimizedData = useMemo(() => {
    const cacheKey = `pos_contexts_${currentOrganization?.id}`;
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData && !authLoading && !tenantLoading && !appsLoading && !shopLoading) {
      return cachedData;
    }

    const data = {
      // بيانات المصادقة
      user,
      userProfile,
      isAuthenticated: !!user,
      
      // بيانات المؤسسة
      currentOrganization,
      organizationId: currentOrganization?.id || null,
      
      // بيانات التطبيقات
      isAppEnabled,
      availableApps,
      organizationApps,
      
      // بيانات المتجر
      shopProducts,
      shopServices,
      shopUsers,
      shopOrders,
      addOrder,
      
      // حالة التحميل
      isLoading: authLoading || tenantLoading || appsLoading || shopLoading,
      authLoading,
      tenantLoading,
      appsLoading,
      shopLoading,
      
      // أخطاء (يمكن إضافتها لاحقاً)
      errors: {},
      
      // دوال التحديث (يمكن إضافتها لاحقاً)
      refreshAuth: () => {},
      refreshTenant: () => {},
      refreshApps: () => {},
      refreshShop: () => {}
    };

    // حفظ في cache إذا كانت البيانات كاملة
    if (!data.isLoading && data.organizationId) {
      setCachedData(cacheKey, data);
    }

    return data;
  }, [
    user, userProfile, currentOrganization, isAppEnabled, availableApps, organizationApps,
    shopProducts, shopServices, shopUsers, shopOrders, addOrder,
    authLoading, tenantLoading, appsLoading, shopLoading
  ]);

  return optimizedData;
};

/**
 * Hook مساعد لتنظيف cache عند تغيير المؤسسة
 */
export const usePOSContextsCacheCleanup = () => {
  const { currentOrganization } = useTenant();
  
  useEffect(() => {
    return () => {
      // تنظيف cache عند إلغاء تحميل المكون
      if (currentOrganization?.id) {
        CONTEXT_CACHE.delete(`pos_contexts_${currentOrganization.id}`);
      }
    };
  }, [currentOrganization?.id]);
};

/**
 * Hook لمراقبة أداء الـ contexts
 */
export const usePOSContextsPerformance = () => {
  const { isLoading, authLoading, tenantLoading, appsLoading, shopLoading } = useOptimizedPOSContexts();
  
  const performanceMetrics = useMemo(() => {
    const loadingStates = [authLoading, tenantLoading, appsLoading, shopLoading];
    const activeLoaders = loadingStates.filter(Boolean).length;
    
    return {
      totalLoadingTime: isLoading ? 'جاري التحميل...' : 'مكتمل',
      activeContexts: activeLoaders,
      cacheSize: CONTEXT_CACHE.size,
      cacheHitRate: 0 // يمكن حسابها لاحقاً
    };
  }, [isLoading, authLoading, tenantLoading, appsLoading, shopLoading]);

  return performanceMetrics;
};
