/**
 * موفر البيانات الموحد - يحل مشكلة الطلبات المكررة نهائياً
 * يستخدم UnifiedRequestManager لتوفير البيانات لجميع المكونات
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useTenant } from '@/context/TenantContext';
import {
  useUnifiedCategories,
  useUnifiedOrganizationSettings,
  useUnifiedOrganizationSubscriptions,
  useUnifiedSubcategories,
  useUnifiedOrganizationApps,
  UnifiedRequestManager
} from '@/lib/unifiedRequestManager';
import { globalCache, CacheKeys } from '@/lib/globalCache';

interface UnifiedDataContextType {
  // البيانات
  categories: any[];
  organizationSettings: any;
  organizationSubscriptions: any[];
  subcategories: any[];
  organizationApps: any[];
  
  // حالة التحميل
  isLoadingCategories: boolean;
  isLoadingSettings: boolean;
  isLoadingSubscriptions: boolean;
  isLoadingSubcategories: boolean;
  isLoadingApps: boolean;
  
  // حالة الأخطاء
  categoriesError: any;
  settingsError: any;
  subscriptionsError: any;
  subcategoriesError: any;
  appsError: any;
  
  // وظائف مساعدة
  refreshAll: () => void;
  clearCache: (pattern?: string) => void;
  getCacheInfo: () => any;
}

const UnifiedDataContext = createContext<UnifiedDataContextType | undefined>(undefined);

interface UnifiedDataProviderProps {
  children: ReactNode;
}

export const UnifiedDataProvider: React.FC<UnifiedDataProviderProps> = ({ children }) => {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id || '';

  // محاولة الحصول من global cache أولاً
  const cachedData = React.useMemo(() => {
    if (!orgId) return null;

    const categories = globalCache.get(CacheKeys.CATEGORIES(orgId));
    const settings = globalCache.get(CacheKeys.ORGANIZATION_SETTINGS(orgId));
    const subscriptions = globalCache.get(CacheKeys.SUBSCRIPTION_DETAILS(orgId));
    const apps = globalCache.get(CacheKeys.APPS(orgId));
    const subcategories = globalCache.get(CacheKeys.SUBCATEGORIES());

    if (categories && settings && subscriptions && apps && subcategories) {
      return { categories, settings, subscriptions, apps, subcategories };
    }

    return null;
  }, [orgId]);

  // استخدام hooks الموحدة
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
    refetch: refetchCategories
  } = useUnifiedCategories(orgId);

  const {
    data: organizationSettings = null,
    isLoading: isLoadingSettings,
    error: settingsError,
    refetch: refetchSettings
  } = useUnifiedOrganizationSettings(orgId);

  const {
    data: organizationSubscriptions = [],
    isLoading: isLoadingSubscriptions,
    error: subscriptionsError,
    refetch: refetchSubscriptions
  } = useUnifiedOrganizationSubscriptions(orgId);

  const {
    data: subcategories = [],
    isLoading: isLoadingSubcategories,
    error: subcategoriesError,
    refetch: refetchSubcategories
  } = useUnifiedSubcategories();

  const {
    data: organizationApps = [],
    isLoading: isLoadingApps,
    error: appsError,
    refetch: refetchApps
  } = useUnifiedOrganizationApps(orgId);

  // وظيفة تحديث جميع البيانات
  const refreshAll = () => {
    refetchCategories();
    refetchSettings();
    refetchSubscriptions();
    refetchSubcategories();
    refetchApps();
  };

  // وظيفة تنظيف Cache
  const clearCache = (pattern?: string) => {
    UnifiedRequestManager.clearCache(pattern);
  };

  // معلومات Cache للتصحيح
  const getCacheInfo = () => {
    return UnifiedRequestManager.getCacheInfo();
  };

  const contextValue: UnifiedDataContextType = {
    // البيانات
    categories,
    organizationSettings,
    organizationSubscriptions,
    subcategories,
    organizationApps,
    
    // حالة التحميل
    isLoadingCategories,
    isLoadingSettings,
    isLoadingSubscriptions,
    isLoadingSubcategories,
    isLoadingApps,
    
    // حالة الأخطاء
    categoriesError,
    settingsError,
    subscriptionsError,
    subcategoriesError,
    appsError,
    
    // وظائف مساعدة
    refreshAll,
    clearCache,
    getCacheInfo
  };

  return (
    <UnifiedDataContext.Provider value={contextValue}>
      {children}
    </UnifiedDataContext.Provider>
  );
};

/**
 * Hook لاستخدام البيانات الموحدة
 */
export const useUnifiedData = (): UnifiedDataContextType => {
  const context = useContext(UnifiedDataContext);
  if (context === undefined) {
    throw new Error('useUnifiedData must be used within a UnifiedDataProvider');
  }
  return context;
};

/**
 * Hooks مخصصة لأنواع البيانات المختلفة
 */

export const useUnifiedDataCategories = () => {
  const { categories, isLoadingCategories, categoriesError } = useUnifiedData();
  return { categories, isLoading: isLoadingCategories, error: categoriesError };
};

export const useUnifiedDataSettings = () => {
  const { organizationSettings, isLoadingSettings, settingsError } = useUnifiedData();
  return { settings: organizationSettings, isLoading: isLoadingSettings, error: settingsError };
};

export const useUnifiedDataSubscriptions = () => {
  const { organizationSubscriptions, isLoadingSubscriptions, subscriptionsError } = useUnifiedData();
  return { subscriptions: organizationSubscriptions, isLoading: isLoadingSubscriptions, error: subscriptionsError };
};

export const useUnifiedDataSubcategories = () => {
  const { subcategories, isLoadingSubcategories, subcategoriesError } = useUnifiedData();
  return { subcategories, isLoading: isLoadingSubcategories, error: subcategoriesError };
};

export const useUnifiedDataApps = () => {
  const { organizationApps, isLoadingApps, appsError } = useUnifiedData();
  return { apps: organizationApps, isLoading: isLoadingApps, error: appsError };
};

// تصدير مكونات إضافية للراحة
export { UnifiedRequestManager } from '@/lib/unifiedRequestManager';

// إضافة hooks إضافية لتغطية جميع احتياجات البيانات
export const useAllCategories = () => {
  const context = useContext(UnifiedDataContext);
  if (!context) {
    throw new Error('useAllCategories must be used within UnifiedDataProvider');
  }
  return context.categories;
};

export const useAllSubcategories = () => {
  const context = useContext(UnifiedDataContext);
  if (!context) {
    throw new Error('useAllSubcategories must be used within UnifiedDataProvider');
  }
  return context.subcategories;
};

export const useAllSettings = () => {
  const context = useContext(UnifiedDataContext);
  if (!context) {
    throw new Error('useAllSettings must be used within UnifiedDataProvider');
  }
  return context.organizationSettings;
};

export const useAllSubscriptions = () => {
  const context = useContext(UnifiedDataContext);
  if (!context) {
    throw new Error('useAllSubscriptions must be used within UnifiedDataProvider');
  }
  return context.organizationSubscriptions;
};

export const useAllApps = () => {
  const context = useContext(UnifiedDataContext);
  if (!context) {
    throw new Error('useAllApps must be used within UnifiedDataProvider');
  }
  return context.organizationApps;
};
