// =================================================================
// 🚀 DATA REFRESH HELPERS - نظام التحديث الفوري المتطور
// =================================================================

import { QueryClient } from '@tanstack/react-query';
import { forceDataRefresh } from '@/lib/ultimateRequestController';
import { UnifiedRequestManager } from '@/lib/unifiedRequestManager';
import { CentralRequestManager } from '@/api/centralRequestManager';
import { StoreRequestOptimizer } from '@/api/storeRequestOptimizer';
import { invalidateOrganizationCache } from '@/lib/cache/storeCache';

let globalQueryClient: QueryClient | null = null;

export const setGlobalQueryClient = (queryClient: QueryClient) => {
  globalQueryClient = queryClient;
};

// =================================================================
// 🎯 CORE CACHE INVALIDATION SYSTEM
// =================================================================

interface RefreshOptions {
  organizationId?: string;
  immediate?: boolean;
  clearAllCaches?: boolean;
  showNotification?: boolean;
}

/**
 * مسح شامل لجميع طبقات الـ Cache
 */
const clearAllCacheLayers = async (pattern?: string, organizationId?: string) => {
  console.log('🧹 Clearing all cache layers...', { pattern, organizationId });

  // 1. مسح UltimateRequestController cache
  if (typeof window !== 'undefined' && (window as any).requestController) {
    if (pattern) {
      (window as any).requestController.invalidateDataCache(pattern);
    } else {
      (window as any).requestController.clearAllCaches();
    }
  }

  // 2. مسح UnifiedRequestManager cache
  if (pattern) {
    UnifiedRequestManager.clearCache(pattern);
  } else {
    UnifiedRequestManager.clearCache();
  }

  // 3. مسح CentralRequestManager cache
  const centralManager = CentralRequestManager.getInstance();
  if (organizationId) {
    await centralManager.clearOrganizationCache(organizationId);
  } else {
    await centralManager.clearAllCaches();
  }

  // 4. مسح StoreRequestOptimizer cache (إذا كان متاحاً)
  try {
    const storeOptimizer = StoreRequestOptimizer.getInstance();
    // مسح الـ global cache الخاص به
    if ((storeOptimizer as any).clearCache) {
      (storeOptimizer as any).clearCache();
    }
  } catch (error) {
    // StoreRequestOptimizer قد لا يكون متاحاً دائماً
  }

  // 5. مسح storeCache
  if (organizationId) {
    await invalidateOrganizationCache(organizationId);
  }

  console.log('✅ All cache layers cleared');
};

/**
 * إجبار تحديث React Query مع تجاوز جميع القيود
 */
const forceReactQueryInvalidation = async (queryKeys: string[], organizationId?: string) => {
  if (!globalQueryClient) return;

  console.log('🔄 Force invalidating React Query...', queryKeys);

  // استخدام forceDataRefresh لتجاوز UltimateRequestController
  forceDataRefresh(queryKeys);

  // استخدام الدالة الأصلية لـ invalidateQueries
  const originalInvalidateQueries = (globalQueryClient.invalidateQueries as any).__original;
  
  if (originalInvalidateQueries) {
    // تحديث شامل لجميع الاستعلامات المرتبطة
    for (const key of queryKeys) {
      await Promise.all([
        originalInvalidateQueries.call(globalQueryClient, { queryKey: [key] }),
        originalInvalidateQueries.call(globalQueryClient, { queryKey: [key, organizationId] }),
        originalInvalidateQueries.call(globalQueryClient, { predicate: (query: any) => 
          query.queryKey.some((k: string) => k.includes(key))
        })
      ]);
    }
  } else {
    // Fallback للدالة العادية
    for (const key of queryKeys) {
      await globalQueryClient.invalidateQueries({ 
        queryKey: [key], 
        exact: false,
        type: 'all'
      });
    }
  }

  console.log('✅ React Query invalidated');
};

// =================================================================
// 🎯 SPECIFIC REFRESH FUNCTIONS
// =================================================================

/**
 * تحديث فوري للمنتجات بعد العمليات
 */
export const refreshAfterProductOperation = async (
  operation: 'create' | 'update' | 'delete',
  options: RefreshOptions = {}
) => {
  const { organizationId, immediate = true } = options;
  
  console.log(`🔄 [Products] Refreshing after ${operation}...`);

  // تأخير قصير للسماح للعملية بالانتهاء
  const delay = immediate ? 0 : 100;
  
  setTimeout(async () => {
    try {
      // 1. مسح جميع طبقات الـ cache
      await clearAllCacheLayers('product', organizationId);
      
      // 2. إجبار تحديث React Query
      const productQueryKeys = [
        'products',
        'pos-products', 
        'pos-products-enhanced',
        'product-categories',
        'subscription-categories',
        'inventory',
        'product-stock'
      ];
      
      await forceReactQueryInvalidation(productQueryKeys, organizationId);
      
      console.log('✅ [Products] Refreshed successfully');
    } catch (error) {
      console.error('❌ [Products] Refresh failed:', error);
    }
  }, delay);
};

/**
 * تحديث فوري للفئات بعد العمليات
 */
export const refreshAfterCategoryOperation = async (
  operation: 'create' | 'update' | 'delete',
  options: RefreshOptions = {}
) => {
  const { organizationId, immediate = true } = options;
  
  console.log(`🔄 [Categories] Refreshing after ${operation}...`);

  const delay = immediate ? 0 : 100;
  
  setTimeout(async () => {
    try {
      // 1. مسح جميع طبقات الـ cache
      await clearAllCacheLayers('categor', organizationId);
      
      // 2. إجبار تحديث React Query
      const categoryQueryKeys = [
        'categories',
        'product-categories',
        'pos-product-categories',
        'subscription-categories',
        'unified_categories'
      ];
      
      await forceReactQueryInvalidation(categoryQueryKeys, organizationId);
      
      console.log('✅ [Categories] Refreshed successfully');
    } catch (error) {
      console.error('❌ [Categories] Refresh failed:', error);
    }
  }, delay);
};

/**
 * تحديث فوري للطلبات بعد العمليات
 */
export const refreshAfterOrderOperation = async (
  operation: 'create' | 'update' | 'delete',
  options: RefreshOptions = {}
) => {
  const { organizationId, immediate = true } = options;
  
  console.log(`🔄 [Orders] Refreshing after ${operation}...`);

  const delay = immediate ? 0 : 100;
  
  setTimeout(async () => {
    try {
      await clearAllCacheLayers('order', organizationId);
      
      const orderQueryKeys = [
        'orders',
        'pos-orders',
        'dashboard-orders',
        'order-stats',
        'recent-orders'
      ];
      
      await forceReactQueryInvalidation(orderQueryKeys, organizationId);
      
      console.log('✅ [Orders] Refreshed successfully');
    } catch (error) {
      console.error('❌ [Orders] Refresh failed:', error);
    }
  }, delay);
};

/**
 * تحديث فوري للمخزون بعد العمليات
 */
export const refreshAfterInventoryOperation = async (
  operation: 'create' | 'update' | 'delete',
  options: RefreshOptions = {}
) => {
  const { organizationId, immediate = true } = options;
  
  console.log(`🔄 [Inventory] Refreshing after ${operation}...`);

  const delay = immediate ? 0 : 100;
  
  setTimeout(async () => {
    try {
      await clearAllCacheLayers('inventory', organizationId);
      
      const inventoryQueryKeys = [
        'inventory',
        'product-stock',
        'inventory-stats',
        'stock-alerts'
      ];
      
      await forceReactQueryInvalidation(inventoryQueryKeys, organizationId);
      
      console.log('✅ [Inventory] Refreshed successfully');
    } catch (error) {
      console.error('❌ [Inventory] Refresh failed:', error);
    }
  }, delay);
};

/**
 * تحديث فوري للإعدادات بعد العمليات
 */
export const refreshAfterSettingsOperation = async (
  operation: 'create' | 'update' | 'delete',
  options: RefreshOptions = {}
) => {
  const { organizationId, immediate = true } = options;
  
  console.log(`🔄 [Settings] Refreshing after ${operation}...`);

  const delay = immediate ? 0 : 100;
  
  setTimeout(async () => {
    try {
      await clearAllCacheLayers('settings', organizationId);
      
      const settingsQueryKeys = [
        'organization-settings',
        'pos-settings',
        'store-settings',
        'theme-settings'
      ];
      
      await forceReactQueryInvalidation(settingsQueryKeys, organizationId);
      
      console.log('✅ [Settings] Refreshed successfully');
    } catch (error) {
      console.error('❌ [Settings] Refresh failed:', error);
    }
  }, delay);
};

/**
 * تحديث فوري للاشتراكات بعد العمليات
 */
export const refreshAfterSubscriptionOperation = async (
  operation: 'create' | 'update' | 'delete',
  options: RefreshOptions = {}
) => {
  const { organizationId, immediate = true } = options;
  
  console.log(`🔄 [Subscriptions] Refreshing after ${operation}...`);

  const delay = immediate ? 0 : 100;
  
  setTimeout(async () => {
    try {
      await clearAllCacheLayers('subscription', organizationId);
      
      const subscriptionQueryKeys = [
        'subscriptions',
        'organization-subscriptions',
        'pos-subscriptions',
        'subscription-services'
      ];
      
      await forceReactQueryInvalidation(subscriptionQueryKeys, organizationId);
      
      console.log('✅ [Subscriptions] Refreshed successfully');
    } catch (error) {
      console.error('❌ [Subscriptions] Refresh failed:', error);
    }
  }, delay);
};

/**
 * تحديث فوري لتطبيقات المؤسسة بعد العمليات
 */
export const refreshAfterAppsOperation = async (
  operation: 'create' | 'update' | 'delete',
  options: RefreshOptions = {}
) => {
  const { organizationId, immediate = true } = options;
  
  console.log(`🔄 [Apps] Refreshing after ${operation}...`);

  const delay = immediate ? 0 : 100;
  
  setTimeout(async () => {
    try {
      await clearAllCacheLayers('apps', organizationId);
      
      const appsQueryKeys = [
        'organization-apps',
        'apps-management',
        'enabled-apps'
      ];
      
      await forceReactQueryInvalidation(appsQueryKeys, organizationId);
      
      console.log('✅ [Apps] Refreshed successfully');
    } catch (error) {
      console.error('❌ [Apps] Refresh failed:', error);
    }
  }, delay);
};

// =================================================================
// 🎯 UNIVERSAL REFRESH FUNCTIONS
// =================================================================

/**
 * تحديث شامل لجميع البيانات
 */
export const refreshAllData = async (options: RefreshOptions = {}) => {
  const { organizationId } = options;
  
  console.log('🔄 [Universal] Refreshing ALL data...');

  try {
    // مسح شامل لجميع الـ caches
    await clearAllCacheLayers(undefined, organizationId);
    
    // تحديث شامل لـ React Query
    if (globalQueryClient) {
      forceDataRefresh(); // بدون معاملات = تحديث شامل
      await globalQueryClient.invalidateQueries({ type: 'all' });
    }
    
    console.log('✅ [Universal] All data refreshed successfully');
  } catch (error) {
    console.error('❌ [Universal] Refresh failed:', error);
  }
};

/**
 * دالة مساعدة للاستخدام السريع
 */
export const refreshAfterMutation = async (
  dataType: 'products' | 'categories' | 'orders' | 'inventory' | 'settings' | 'subscriptions' | 'apps' | 'all',
  operation: 'create' | 'update' | 'delete' = 'update',
  options: RefreshOptions = {}
) => {
  console.log(`🎯 [AutoRefresh] ${dataType} after ${operation}`);
  
  switch (dataType) {
    case 'products':
      return refreshAfterProductOperation(operation, options);
    case 'categories':
      return refreshAfterCategoryOperation(operation, options);
    case 'orders':
      return refreshAfterOrderOperation(operation, options);
    case 'inventory':
      return refreshAfterInventoryOperation(operation, options);
    case 'settings':
      return refreshAfterSettingsOperation(operation, options);
    case 'subscriptions':
      return refreshAfterSubscriptionOperation(operation, options);
    case 'apps':
      return refreshAfterAppsOperation(operation, options);
    case 'all':
      return refreshAllData(options);
    default:
      console.warn('❌ Unknown data type:', dataType);
  }
};

// =================================================================
// 🎯 WINDOW FUNCTIONS FOR DEBUGGING
// =================================================================

if (typeof window !== 'undefined') {
  (window as any).refreshAfterMutation = refreshAfterMutation;
  (window as any).refreshAllData = refreshAllData;
  (window as any).refreshAfterProductCreate = (orgId: string) => 
    refreshAfterProductOperation('create', { organizationId: orgId });
  (window as any).refreshAfterCategoryUpdate = (orgId: string) => 
    refreshAfterCategoryOperation('update', { organizationId: orgId });
  (window as any).clearAllCacheLayers = clearAllCacheLayers;
  
  console.log('🛠️ Data refresh helpers available in console:');
  console.log('- refreshAfterMutation(dataType, operation, options)');
  console.log('- refreshAllData(options)');
  console.log('- refreshAfterProductCreate(orgId)');
  console.log('- refreshAfterCategoryUpdate(orgId)');
  console.log('- clearAllCacheLayers(pattern, orgId)');
}

export default {
  refreshAfterProductOperation,
  refreshAfterCategoryOperation,
  refreshAfterOrderOperation,
  refreshAfterInventoryOperation,
  refreshAfterSettingsOperation,
  refreshAfterSubscriptionOperation,
  refreshAfterAppsOperation,
  refreshAllData,
  refreshAfterMutation,
  setGlobalQueryClient,
}; 