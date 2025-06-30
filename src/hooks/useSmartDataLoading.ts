import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

// =================================================================
// 🎯 useSmartDataLoading - استراتيجية التحميل الذكي
// =================================================================

interface SmartLoadingConfig {
  // ما يجب تحميله
  shouldLoadAppData: boolean;
  shouldLoadPOSData: boolean;
  shouldLoadOrdersData: boolean;
  
  // أولويات التحميل
  priority: {
    appData: 'high' | 'medium' | 'low';
    posData: 'high' | 'medium' | 'low';
    ordersData: 'high' | 'medium' | 'low';
  };
  
  // إعدادات التخزين المؤقت حسب الصفحة
  cacheSettings: {
    appData: {
      staleTime: number;
      gcTime: number;
    };
    posData: {
      staleTime: number;
      gcTime: number;
    };
    ordersData: {
      staleTime: number;
      gcTime: number;
    };
  };
  
  // هل يجب التحديث في الخلفية
  enableBackgroundRefresh: boolean;
  
  // هل يجب استخدام optimistic updates
  enableOptimisticUpdates: boolean;
}

// تعريف متطلبات كل صفحة
const PAGE_DATA_REQUIREMENTS = {
  // الصفحة الرئيسية
  '/': {
    appData: true,
    posData: false,
    ordersData: false,
    priority: { appData: 'high', posData: 'low', ordersData: 'low' }
  },
  
  // لوحة التحكم الرئيسية
  '/dashboard': {
    appData: true,
    posData: true,
    ordersData: true,
    priority: { appData: 'high', posData: 'medium', ordersData: 'medium' }
  },
  
  // صفحة POS
  '/dashboard/pos': {
    appData: true,
    posData: true,
    ordersData: false,
    priority: { appData: 'medium', posData: 'high', ordersData: 'low' }
  },
  
  // صفحة الطلبيات
  '/dashboard/orders': {
    appData: true,
    posData: false,
    ordersData: true,
    priority: { appData: 'medium', posData: 'low', ordersData: 'high' }
  },
  
  // صفحة المنتجات
  '/dashboard/products': {
    appData: true,
    posData: true,
    ordersData: false,
    priority: { appData: 'medium', posData: 'high', ordersData: 'low' }
  },
  
  // صفحة المخزون
  '/dashboard/inventory': {
    appData: true,
    posData: true,
    ordersData: false,
    priority: { appData: 'medium', posData: 'high', ordersData: 'low' }
  },
  
  // صفحة الإعدادات
  '/dashboard/settings': {
    appData: true,
    posData: false,
    ordersData: false,
    priority: { appData: 'high', posData: 'low', ordersData: 'low' }
  },
  
  // صفحة التقارير
  '/dashboard/reports': {
    appData: true,
    posData: true,
    ordersData: true,
    priority: { appData: 'medium', posData: 'medium', ordersData: 'high' }
  },
  
  // صفحة الاشتراكات
  '/dashboard/subscriptions': {
    appData: true,
    posData: true,
    ordersData: false,
    priority: { appData: 'medium', posData: 'high', ordersData: 'low' }
  }
} as const;

// إعدادات التخزين المؤقت حسب الأولوية
const CACHE_SETTINGS_BY_PRIORITY = {
  high: {
    staleTime: 30 * 1000, // 30 ثانية
    gcTime: 5 * 60 * 1000, // 5 دقائق
  },
  medium: {
    staleTime: 2 * 60 * 1000, // دقيقتان
    gcTime: 10 * 60 * 1000, // 10 دقائق
  },
  low: {
    staleTime: 10 * 60 * 1000, // 10 دقائق
    gcTime: 30 * 60 * 1000, // 30 دقيقة
  }
} as const;

export const useSmartDataLoading = (): SmartLoadingConfig => {
  const location = useLocation();
  
  const config = useMemo(() => {
    const currentPath = location.pathname;
    
    // البحث عن أفضل تطابق للمسار
    let bestMatch = PAGE_DATA_REQUIREMENTS['/'] || {
      appData: true,
      posData: false,
      ordersData: false,
      priority: { appData: 'high', posData: 'low', ordersData: 'low' }
    };
    
    // البحث عن تطابق دقيق أولاً
    if (PAGE_DATA_REQUIREMENTS[currentPath as keyof typeof PAGE_DATA_REQUIREMENTS]) {
      bestMatch = PAGE_DATA_REQUIREMENTS[currentPath as keyof typeof PAGE_DATA_REQUIREMENTS];
    } else {
      // البحث عن تطابق جزئي
      const partialMatches = Object.entries(PAGE_DATA_REQUIREMENTS).filter(([path]) => 
        currentPath.startsWith(path) && path !== '/'
      );
      
      if (partialMatches.length > 0) {
        // اختيار أطول تطابق
        const longestMatch = partialMatches.reduce((longest, current) => 
          current[0].length > longest[0].length ? current : longest
        );
        bestMatch = longestMatch[1];
      }
    }
    
    // تحديد إعدادات التخزين المؤقت
    const cacheSettings = {
      appData: CACHE_SETTINGS_BY_PRIORITY[bestMatch.priority.appData],
      posData: CACHE_SETTINGS_BY_PRIORITY[bestMatch.priority.posData],
      ordersData: CACHE_SETTINGS_BY_PRIORITY[bestMatch.priority.ordersData],
    };
    
    // تحديد ما إذا كانت الصفحة تحتاج تحديث مستمر
    const isRealTimeRoute = currentPath.includes('/pos') || currentPath.includes('/orders');
    const isSettingsRoute = currentPath.includes('/settings');
    
    const smartConfig: SmartLoadingConfig = {
      shouldLoadAppData: bestMatch.appData,
      shouldLoadPOSData: bestMatch.posData,
      shouldLoadOrdersData: bestMatch.ordersData,
      
      priority: bestMatch.priority,
      cacheSettings,
      
      // تمكين التحديث في الخلفية للصفحات الديناميكية
      enableBackgroundRefresh: isRealTimeRoute,
      
      // تمكين optimistic updates للصفحات التفاعلية
      enableOptimisticUpdates: isRealTimeRoute && !isSettingsRoute,
    };
    
    return smartConfig;
  }, [location.pathname]);
  
  return config;
};

// Hook لتحديد ما إذا كانت البيانات مطلوبة للصفحة الحالية
export const useIsDataRequired = () => {
  const config = useSmartDataLoading();
  
  return {
    isAppDataRequired: config.shouldLoadAppData,
    isPOSDataRequired: config.shouldLoadPOSData,
    isOrdersDataRequired: config.shouldLoadOrdersData,
    highPriorityData: Object.entries(config.priority)
      .filter(([_, priority]) => priority === 'high')
      .map(([dataType]) => dataType),
  };
};

// Hook لتحسين إعدادات React Query حسب الصفحة
export const useOptimizedQueryConfig = () => {
  const config = useSmartDataLoading();
  
  return {
    appDataConfig: {
      enabled: config.shouldLoadAppData,
      staleTime: config.cacheSettings.appData.staleTime,
      gcTime: config.cacheSettings.appData.gcTime,
      refetchOnWindowFocus: config.priority.appData === 'high',
      refetchInterval: config.enableBackgroundRefresh && config.priority.appData === 'high' ? 30000 : false,
      retry: config.priority.appData === 'high' ? 3 : 2,
    },
    
    posDataConfig: {
      enabled: config.shouldLoadPOSData,
      staleTime: config.cacheSettings.posData.staleTime,
      gcTime: config.cacheSettings.posData.gcTime,
      refetchOnWindowFocus: config.priority.posData === 'high',
      refetchInterval: config.enableBackgroundRefresh && config.priority.posData === 'high' ? 60000 : false,
      retry: config.priority.posData === 'high' ? 3 : 2,
    },
    
    ordersDataConfig: {
      enabled: config.shouldLoadOrdersData,
      staleTime: config.cacheSettings.ordersData.staleTime,
      gcTime: config.cacheSettings.ordersData.gcTime,
      refetchOnWindowFocus: config.priority.ordersData === 'high',
      refetchInterval: config.enableBackgroundRefresh && config.priority.ordersData === 'high' ? 30000 : false,
      retry: config.priority.ordersData === 'high' ? 3 : 2,
      keepPreviousData: true, // مهم للطلبيات مع pagination
    },
  };
};

// Hook للتحكم في تحديث البيانات تلقائياً
export const useAutoRefresh = () => {
  const config = useSmartDataLoading();
  const location = useLocation();
  
  return {
    shouldAutoRefresh: config.enableBackgroundRefresh,
    refreshInterval: {
      appData: config.priority.appData === 'high' ? 30000 : 120000,
      posData: config.priority.posData === 'high' ? 60000 : 300000,
      ordersData: config.priority.ordersData === 'high' ? 30000 : 120000,
    },
    isRealTimePage: location.pathname.includes('/pos') || location.pathname.includes('/orders'),
  };
};

export default useSmartDataLoading;