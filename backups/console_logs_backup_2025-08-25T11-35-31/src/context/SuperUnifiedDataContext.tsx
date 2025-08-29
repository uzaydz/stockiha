// ================================================================
// 🚀 SuperUnifiedDataContext - الحل النهائي لمشكلة الاستدعاءات المكررة  
// يجلب جميع البيانات في استدعاء واحد فقط بدلاً من 40+ استدعاء
// ================================================================

import React, { createContext, useContext, useMemo, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';
import { supabase } from '@/lib/supabase';

// ================================================================
// 📋 أنواع البيانات الموحدة
// ================================================================

interface GlobalData {
  organization: any;
  user: any;
  settings: {
    organization_settings: any;
    pos_settings: any;
  };
  products: any[];
  categories: {
    product_categories: any[];
    subscription_categories: any[];
    subscription_services: any[];
  };
  customers_and_users: {
    customers: any[];
    users: any[];
  };
  apps_and_subscription: {
    organization_apps: any[];
    active_subscription: any[];
  };
  stats: {
    pos_order_stats: any;
    sales_summary: any;
    inventory_status: any;
    total_expenses: any;
  };
  orders: {
    recent_orders: any[];
    recent_online_orders: any[];
  };
  additional_data: {
    provinces_global: any[];
    top_categories: any;
    top_products: any;
    visitor_analytics?: any;
    online_order_analytics?: any;
  };
  fetched_at: string;
  organization_id: string;
}

// أنواع البيانات للـ Context
interface SuperUnifiedDataContextType {
  // البيانات المجمعة
  globalData: GlobalData | null;
  
  // حالات التحميل والأخطاء
  isLoading: boolean;
  error: string | null;
  
  // دوال التحديث
  refreshData: () => void;
  invalidateData: () => void;
  
  // بيانات مباشرة للسهولة
  organization: any;
  currentUser: any;
  organizationSettings: any;
  posSettings: any;
  products: any[];
  productCategories: any[];
  subscriptionServices: any[];
  customers: any[];
  users: any[];
  organizationApps: any[];
  activeSubscription: any;
  recentOrders: any[];
  recentOnlineOrders: any[];
  dashboardStats: any;
  provincesGlobal: any[];
  
  // معلومات إضافية
  lastFetched: Date | null;
  isFresh: boolean;
}

// ================================================================
// 🎯 إنشاء Context
// ================================================================

const SuperUnifiedDataContext = createContext<SuperUnifiedDataContextType | undefined>(undefined);

// ================================================================
// 🔧 دالة جلب البيانات الموحدة
// ================================================================

// إضافة كاش محسن للبيانات الموحدة
const globalDataCache = new Map<string, { data: GlobalData; timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 دقيقة للبيانات الموحدة
const SESSION_CACHE_KEY = 'global_data_cache';

// دالة للحصول من sessionStorage
const getFromSessionStorage = (cacheKey: string) => {
  try {
    const cached = sessionStorage.getItem(`${SESSION_CACHE_KEY}_${cacheKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.timestamp && parsed.data) {
        return parsed;
      }
    }
  } catch (error) {
    // تجاهل أخطاء sessionStorage
  }
  return null;
};

// دالة للحفظ في sessionStorage
const saveToSessionStorage = (cacheKey: string, data: GlobalData, timestamp: number) => {
  try {
    const cacheData = {
      data,
      timestamp
    };
    sessionStorage.setItem(`${SESSION_CACHE_KEY}_${cacheKey}`, JSON.stringify(cacheData));
  } catch (error) {
    // تجاهل أخطاء sessionStorage
  }
};

const fetchGlobalData = async (organizationId: string, userId?: string): Promise<GlobalData> => {
  try {
    
    // التحقق من sessionStorage أولاً (يبقى بعد تحديث الصفحة)
    const cacheKey = `global_data_${organizationId}_${userId || 'no_user'}`;
    const sessionCached = getFromSessionStorage(cacheKey);
    const now = Date.now();

    if (sessionCached && (now - sessionCached.timestamp) < CACHE_DURATION) {
      return sessionCached.data;
    }
    
    // التحقق من كاش الذاكرة
    const cached = globalDataCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      // حفظ في sessionStorage أيضاً
      saveToSessionStorage(cacheKey, cached.data, now);
      return cached.data;
    }
    
    // التحقق من الاتصال بـ Supabase أولاً
    if (!supabase) {
      throw new Error('Supabase client غير متوفر');
    }

    // استخدام دالة SQL الموحدة مع معالجة أفضل للأخطاء
    const { data, error } = await (supabase as any).rpc('get_global_data_complete', {
      p_organization_id: organizationId,
      p_user_id: userId
    });

    if (error) {
      
      // التحقق من نوع الخطأ لتوفير رسائل أفضل
      if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
        throw new Error('خطأ في الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
      } else if (error.message?.includes('Function not found')) {
        throw new Error('الدالة المطلوبة غير موجودة في قاعدة البيانات');
      } else {
        throw new Error(`فشل في جلب البيانات: ${error.message}`);
      }
    }

    if (!data) {
      throw new Error('لم يتم العثور على بيانات');
    }

    const result = Array.isArray(data) ? data[0] : data;

    // تحويل البيانات إلى الشكل المطلوب مع معالجة صحيحة لبيانات التطبيقات
    const globalData: GlobalData = {
      organization: result.organization || null,
      user: result.user || null,
      settings: result.settings || null,
      products: result.products || [],
      categories: result.categories || [],
      customers_and_users: {
        customers: result.customers_and_users?.customers || [],
        users: result.customers_and_users?.users || [],
      },
      apps_and_subscription: {
        organization_apps: result.apps_and_subscription?.organization_apps || [],
        active_subscription: result.apps_and_subscription?.active_subscription || [],
      },
      stats: {
        pos_order_stats: result.stats?.order_stats || null,
        sales_summary: result.stats?.order_stats || null,
        inventory_status: result.stats?.inventory_summary || null,
        total_expenses: result.total_expenses || null,
      },
      orders: {
        recent_orders: result.orders?.recent_orders || [],
        recent_online_orders: result.orders?.recent_online_orders || [],
      },
      additional_data: {
        provinces_global: result.additional_data?.provinces_global || [],
        top_categories: result.additional_data?.top_selling_products || null,
        top_products: result.additional_data?.top_selling_products || null,
        visitor_analytics: result.additional_data?.visitor_analytics || null,
        online_order_analytics: result.additional_data?.online_order_analytics || null,
      },
      fetched_at: new Date().toISOString(),
      organization_id: organizationId,
    };

    // حفظ في كاش الذاكرة
    globalDataCache.set(cacheKey, {
      data: globalData,
      timestamp: now
    });

    // حفظ في sessionStorage
    saveToSessionStorage(cacheKey, globalData, now);

    return globalData;

  } catch (error) {
    throw error;
  }
};

// ================================================================
// 📱 مكون Provider
// ================================================================

interface SuperUnifiedDataProviderProps {
  children: ReactNode;
}

export const SuperUnifiedDataProvider: React.FC<SuperUnifiedDataProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  
  const organizationId = currentOrganization?.id;
  
  // مدة انتعاش البيانات (5 دقائق)
  const staleTime = 5 * 60 * 1000;
  
  // جلب البيانات باستخدام React Query مع إعدادات محسنة
  const {
    data: globalData,
    isLoading,
    error,
    refetch: refreshData
  } = useQuery({
    queryKey: ['global-data', organizationId, user?.id],
    queryFn: () => fetchGlobalData(organizationId!, user?.id),
    enabled: !!organizationId,
    staleTime,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      // عدم إعادة المحاولة في حالة أخطاء الشبكة المستمرة
      if (error?.message?.includes('Failed to fetch') && failureCount >= 2) {
        return false;
      }
      // إعادة المحاولة حتى 3 مرات للأخطاء الأخرى
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // تأخير متزايد
  });

  // دالة لإلغاء صحة البيانات وإعادة التحميل
  const invalidateData = () => {
    queryClient.invalidateQueries({
      queryKey: ['global-data']
    });
  };

  // استخلاص البيانات للوصول المباشر
  const organization = globalData?.organization || null;
  const currentUser = globalData?.user || null;
  const organizationSettings = globalData?.settings?.organization_settings || null;
  const posSettings = globalData?.settings?.pos_settings || null;
  const products = globalData?.products || [];
  const productCategories = globalData?.categories?.product_categories || [];
  const subscriptionServices = globalData?.categories?.subscription_services || [];
  const customers = globalData?.customers_and_users?.customers || [];
  const users = globalData?.customers_and_users?.users || [];
  const organizationApps = globalData?.apps_and_subscription?.organization_apps || [];
  const activeSubscription = globalData?.apps_and_subscription?.active_subscription?.[0] || null;
  const recentOrders = globalData?.orders?.recent_orders || [];
  const recentOnlineOrders = globalData?.orders?.recent_online_orders || [];
  // تحويل البيانات الإحصائية إلى الشكل المطلوب من StatsGrid
  const dashboardStats = useMemo(() => {
    if (!globalData?.stats) return null;
    
    const stats = globalData.stats;
    
    // استخدام البيانات الفعلية من الطلبات الحديثة
    const recentOrdersRevenue = globalData.orders?.recent_orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    const recentOnlineOrdersRevenue = globalData.orders?.recent_online_orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    const totalRevenue = recentOrdersRevenue + recentOnlineOrdersRevenue;
    
    const totalOrders = (globalData.orders?.recent_orders?.length || 0) + 
                       (globalData.orders?.recent_online_orders?.length || 0);
    
    // حساب الطلبات حسب الحالة من البيانات الفعلية
    const pendingOrders = globalData.orders?.recent_orders?.filter(order => order.status === 'pending')?.length || 0;
    const processingOrders = globalData.orders?.recent_orders?.filter(order => order.status === 'processing')?.length || 0;
    const completedOrders = globalData.orders?.recent_orders?.filter(order => order.status === 'completed')?.length || 0;
    
    // إضافة الطلبات الأونلاين
    const onlinePendingOrders = globalData.orders?.recent_online_orders?.filter(order => order.status === 'pending')?.length || 0;
    const onlineProcessingOrders = globalData.orders?.recent_online_orders?.filter(order => order.status === 'processing')?.length || 0;
    const onlineCompletedOrders = globalData.orders?.recent_online_orders?.filter(order => order.status === 'delivered')?.length || 0;
    
    // إنشاء بنية SalesSummary
    const salesSummary = {
      daily: totalRevenue * 0.1, // تقدير 10% من الإجمالي يومياً
      weekly: totalRevenue * 0.3, // تقدير 30% من الإجمالي أسبوعياً  
      monthly: totalRevenue, // استخدام الإجمالي الفعلي شهرياً
      annual: totalRevenue * 12 // تقدير سنوي
    };
    
    const revenueSummary = {
      daily: totalRevenue * 0.1,
      weekly: totalRevenue * 0.3,
      monthly: totalRevenue,
      annual: totalRevenue * 12
    };
    
    // الأرباح (افتراض هامش ربح 20%)
    const profitSummary = {
      daily: salesSummary.daily * 0.2,
      weekly: salesSummary.weekly * 0.2,
      monthly: salesSummary.monthly * 0.2,
      annual: salesSummary.annual * 0.2
    };
    
    return {
      sales: salesSummary,
      revenue: revenueSummary,
      profits: profitSummary,
      orders: {
        total: totalOrders,
        pending: pendingOrders + onlinePendingOrders,
        processing: processingOrders + onlineProcessingOrders,
        completed: completedOrders + onlineCompletedOrders
      },
      inventory: stats.inventory_status || {}
    };
  }, [globalData?.stats, globalData?.orders]);
  const provincesGlobal = globalData?.additional_data?.provinces_global || [];

  // معلومات إضافية
  const lastFetched = globalData?.fetched_at ? new Date(globalData.fetched_at) : null;
  const isFresh = lastFetched ? (Date.now() - lastFetched.getTime()) < staleTime : false;

  // 🚨 تحديث البيانات العامة في window للمشاركة مع appInitializer - محسن مع debouncing
  useEffect(() => {
    if (globalData && organization?.id) {
      // debounce لمنع التحديثات المفرطة
      const timeoutId = setTimeout(() => {
        try {
          const currentData = (window as any).__SUPER_UNIFIED_DATA__;
          const newTimestamp = Date.now();
          
          // فقط إذا كانت البيانات مختلفة أو قديمة
          if (!currentData || 
              currentData.organization?.id !== organization.id ||
              (newTimestamp - currentData.timestamp) > 30000) { // 30 ثانية
            (window as any).__SUPER_UNIFIED_DATA__ = {
              organization,
              organizationSettings,
              posSettings,
              activeSubscription,
              organizationApps,
              timestamp: newTimestamp
            };
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ [SuperUnifiedData] خطأ في تحديث window data:', error);
          }
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [
    organization?.id, // فقط المعرف
    organizationSettings?.id, // فقط المعرف
    posSettings?.id, // فقط المعرف
    activeSubscription?.id, // فقط المعرف
    organizationApps?.length // فقط الطول
  ]);

  // إعداد قيمة Context
  const contextValue = useMemo<SuperUnifiedDataContextType>(() => ({
    // البيانات المجمعة
    globalData,
    
    // حالات التحميل والأخطاء
    isLoading,
    error: error?.message || null,
    
    // دوال التحديث
    refreshData,
    invalidateData,
    
    // بيانات مباشرة للسهولة
    organization,
    currentUser,
    organizationSettings,
    posSettings,
    products,
    productCategories,
    subscriptionServices,
    customers,
    users,
    organizationApps,
    activeSubscription,
    recentOrders,
    recentOnlineOrders,
    dashboardStats,
    provincesGlobal,
    
    // معلومات إضافية
    lastFetched,
    isFresh
  }), [
    globalData, isLoading, error, refreshData, invalidateData,
    organization, currentUser, organizationSettings, posSettings,
    products, productCategories, subscriptionServices, customers, users,
    organizationApps, activeSubscription, recentOrders, recentOnlineOrders,
    dashboardStats, provincesGlobal, lastFetched, isFresh
  ]);

  return (
    <SuperUnifiedDataContext.Provider value={contextValue}>
      {children}
    </SuperUnifiedDataContext.Provider>
  );
};

// ================================================================
// 🪝 Hook للوصول لـ Context
// ================================================================

export const useSuperUnifiedData = (): SuperUnifiedDataContextType => {
  const context = useContext(SuperUnifiedDataContext);
  if (context === undefined) {
    throw new Error('useSuperUnifiedData must be used within a SuperUnifiedDataProvider');
  }
  return context;
};

// ================================================================
// 🎯 Hooks مخصصة للوصول للبيانات
// ================================================================

// Hook للحصول على معلومات المنظمة
export const useOrganizationData = () => {
  const { organization, organizationSettings } = useSuperUnifiedData();
  return { organization, organizationSettings };
};

// Hook للحصول على المنتجات والفئات
export const useProductsData = () => {
  const { products, productCategories } = useSuperUnifiedData();
  return { products, productCategories };
};

// Hook للحصول على بيانات العملاء والمستخدمين
export const useUsersData = () => {
  const { customers, users, currentUser } = useSuperUnifiedData();
  return { customers, users, currentUser };
};

// Hook للحصول على بيانات العملاء فقط
export const useCustomersData = () => {
  const { customers } = useSuperUnifiedData();
  return { customers };
};

// Hook للحصول على إحصائيات لوحة التحكم
export const useDashboardStats = () => {
  const { dashboardStats, recentOrders, recentOnlineOrders } = useSuperUnifiedData();
  return { dashboardStats, recentOrders, recentOnlineOrders };
};

// Hook للحصول على التطبيقات والاشتراكات
export const useAppsData = () => {
  const { organizationApps, activeSubscription } = useSuperUnifiedData();

  return { organizationApps, activeSubscription };
};

// Hook للحصول على إعدادات POS
export const usePOSData = () => {
  const { posSettings, products, customers } = useSuperUnifiedData();
  return { posSettings, products, customers };
};

// ================================================================
// 📊 دوال مساعدة للبيانات
// ================================================================

// دالة للتحقق من تفعيل تطبيق معين
export const useIsAppEnabled = (appId: string): boolean => {
  const { organizationApps } = useSuperUnifiedData();
  const app = organizationApps?.find((app: any) => app.app_id === appId);
  const isEnabled = Boolean(app?.is_enabled);

  return isEnabled;
};

// دالة للحصول على إعدادات تطبيق معين
export const useAppConfiguration = (appId: string): any => {
  const { organizationApps } = useSuperUnifiedData();
  const app = organizationApps?.find((app: any) => app.app_id === appId);
  return app?.configuration || {};
};

// دالة للحصول على حالة الاشتراك
export const useSubscriptionStatus = () => {
  const { organization, activeSubscription } = useSuperUnifiedData();
  
  return {
    isActive: organization?.subscription_status === 'active',
    subscriptionTier: organization?.subscription_tier || 'free',
    subscriptionDetails: activeSubscription,
    expiresAt: activeSubscription?.end_date
  };
};

// Export أساسي للـ Context
export default SuperUnifiedDataContext;
