// =================================================================
// 🚀 DATA REFRESH HELPERS - نظام التحديث الفوري المتطور
// =================================================================

import { QueryClient } from '@tanstack/react-query';
// تم حذف UltimateRequestController
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

};

/**
 * إجبار تحديث React Query مع تجاوز جميع القيود
 */
const forceReactQueryInvalidation = async (queryKeys: string[], organizationId?: string) => {
  if (!globalQueryClient) return;

  console.log('🔄 [Data Refresh Helpers] إجبار تحديث React Query...', { queryKeys, organizationId });

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
    // Fallback للدالة العادية مع forceRefresh
    for (const key of queryKeys) {
      await globalQueryClient.invalidateQueries({ 
        queryKey: [key], 
        exact: false,
        type: 'all'
      });
      
      // تحديث إضافي مع معرف المؤسسة
      if (organizationId) {
        await globalQueryClient.invalidateQueries({ 
          queryKey: [key, organizationId], 
          exact: false,
          type: 'all'
        });
      }
    }
  }

  console.log('✅ [Data Refresh Helpers] تم تحديث React Query بنجاح');
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

  console.log('🎯 [Data Refresh Helpers] تحديث تلقائي للمنتجات:', {
    operation,
    organizationId,
    immediate,
    timestamp: new Date().toISOString()
  });

  const delay = immediate ? 0 : 100;
  
  setTimeout(async () => {
    try {
      console.log('🔄 [Data Refresh Helpers] بدء عملية التحديث التلقائي للمنتجات...');
      
      await clearAllCacheLayers('products', organizationId);
      console.log('✅ [Data Refresh Helpers] تم مسح جميع طبقات Cache للمنتجات');
      
      const productQueryKeys = [
        'products',
        'product-list',
        'pos-products',
        'dashboard-products',
        'product_list',
        'store-products',
        'all-products',
        `products-${organizationId}`,
        `product-list-${organizationId}`,
        `pos-products-${organizationId}`,
        `dashboard-products-${organizationId}`
      ];
      
      console.log('🚀 [Data Refresh Helpers] تحديث React Query للمفاتيح:', productQueryKeys);
      
      for (const key of productQueryKeys) {
        await forceDataRefresh(key, { forceRefresh: true });
      }
      
      // تحديث إضافي للمفاتيح بدون forceRefresh
      await Promise.all(
        productQueryKeys.map(key => 
          forceDataRefresh(key)
        )
      );
      
      console.log('✅ [Data Refresh Helpers] تم تحديث React Query للمنتجات بنجاح');
      
      // إرسال إشعار للمكونات
      const eventData = {
        operation,
        organizationId,
        timestamp: new Date().toISOString()
      };
      
      const customEvent = new CustomEvent('products-updated', { detail: eventData });
      window.dispatchEvent(customEvent);
      
      console.log('📢 [Data Refresh Helpers] تم إرسال CustomEvent للمنتجات');
      
    } catch (error) {
      console.error('❌ [Data Refresh Helpers] خطأ في التحديث التلقائي للمنتجات:', error);
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

  console.log('🎯 [Data Refresh Helpers] تحديث تلقائي للفئات:', {
    operation,
    organizationId,
    immediate,
    timestamp: new Date().toISOString()
  });

  const delay = immediate ? 0 : 100;
  
  setTimeout(async () => {
    try {
      console.log('🔄 [Data Refresh Helpers] بدء عملية التحديث التلقائي للفئات...');
      
      await clearAllCacheLayers('categories', organizationId);
      console.log('✅ [Data Refresh Helpers] تم مسح جميع طبقات Cache للفئات');
      
      const categoryQueryKeys = [
        'categories',
        'product-categories', 
        'pos-product-categories',
        'subscription-categories',
        'product_categories',
        'store-categories',
        'dashboard-categories'
      ];
      
      // إضافة مفاتيح خاصة بالمؤسسة
      if (organizationId) {
        categoryQueryKeys.push(
          `categories-${organizationId}`,
          `product-categories-${organizationId}`,
          `pos-categories-${organizationId}`
        );
      }
      
      console.log('🚀 [Data Refresh Helpers] تحديث React Query للمفاتيح:', categoryQueryKeys);
      
      await forceReactQueryInvalidation(categoryQueryKeys, organizationId);
      
      console.log('✅ [Data Refresh Helpers] تم تحديث React Query للفئات بنجاح');
      
      // إشعار خاص للفئات
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('categoriesUpdated', { 
          detail: { 
            operation, 
            organizationId,
            timestamp: new Date().toISOString()
          } 
        }));
        console.log('📢 [Data Refresh Helpers] تم إرسال CustomEvent للفئات');
      }
      
    } catch (error) {
      console.error('❌ [Data Refresh Helpers] خطأ في تحديث الفئات:', {
        error,
        operation,
        organizationId,
        timestamp: new Date().toISOString()
      });
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
      
    } catch (error) {
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
      
    } catch (error) {
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
      
    } catch (error) {
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
      
    } catch (error) {
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
      
    } catch (error) {
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

  try {
    // مسح شامل لجميع الـ caches
    await clearAllCacheLayers(undefined, organizationId);
    
    // تحديث شامل لـ React Query
    if (globalQueryClient) {
      forceDataRefresh(); // بدون معاملات = تحديث شامل
      await globalQueryClient.invalidateQueries({ type: 'all' });
    }
    
  } catch (error) {
  }
};

/**
 * دالة موحدة للتحديث بعد أي عملية mutation
 */
export const refreshAfterMutation = async (
  dataType: 'products' | 'categories' | 'orders' | 'inventory' | 'settings' | 'subscriptions' | 'apps' | 'all',
  operation: 'create' | 'update' | 'delete' = 'update',
  options: RefreshOptions = {}
) => {
  console.log('🎯 [Data Refresh Helpers] تحديث موحد بعد العملية:', {
    dataType,
    operation,
    options,
    timestamp: new Date().toISOString()
  });

  if (dataType === 'all') {
    // تحديث شامل لجميع أنواع البيانات
    const entityTypes: ('products' | 'categories' | 'orders' | 'inventory' | 'settings' | 'subscriptions' | 'apps')[] = [
      'products', 'categories', 'orders', 'inventory', 'settings', 'subscriptions', 'apps'
    ];
    
    // تحديث متوازي لجميع الأنواع
    await Promise.all(
      entityTypes.map(entityType => 
        forceRefreshAfterCRUD(entityType, operation, options)
      )
    );
  } else {
    // تحديث نوع بيانات محدد باستخدام النظام المحسن الجديد
    await forceRefreshAfterCRUD(dataType, operation, options);
  }
};

// =================================================================
// 🎯 ENHANCED REFRESH FUNCTION - دالة التحديث المحسنة الجديدة
// =================================================================

/**
 * دالة محسنة جديدة للتحديث الفوري بعد العمليات CRUD
 * تستخدم النظام المطور forceRefreshAfterMutation
 */
export const forceRefreshAfterCRUD = async (
  entityType: 'products' | 'categories' | 'orders' | 'inventory' | 'settings' | 'subscriptions' | 'apps',
  operation: 'create' | 'update' | 'delete' = 'update',
  options: RefreshOptions = {}
) => {
  const { organizationId, immediate = true } = options;

  console.log('🚀 [Data Refresh Helpers] تحديث محسن بعد العملية:', {
    entityType,
    operation,
    organizationId,
    immediate,
    timestamp: new Date().toISOString()
  });

  const delay = immediate ? 0 : 50;
  
  setTimeout(async () => {
    try {
      // 🎯 الطريقة الجديدة المحسنة - مسح شامل لجميع أنواع cache أولاً
      if (typeof window !== 'undefined' && (window as any).forceInvalidateAllCache && organizationId) {
        console.log('🧹 [Data Refresh Helpers] مسح شامل لجميع أنواع cache...');
        await (window as any).forceInvalidateAllCache(entityType, organizationId, {});
        console.log('✅ [Data Refresh Helpers] تم مسح جميع أنواع cache بنجاح');
      }

      // 🔄 ثم استخدام UltimateRequestController المحسن
      if (typeof window !== 'undefined' && (window as any).forceRefreshAfterMutation) {
        console.log('🔄 [Data Refresh Helpers] استخدام النظام المحسن الجديد...');
        await (window as any).forceRefreshAfterMutation(entityType);
        console.log('✅ [Data Refresh Helpers] تم التحديث بالنظام المحسن');
      } else {
        // Fallback للطريقة القديمة
        console.log('🔄 [Data Refresh Helpers] استخدام النظام التقليدي...');
        await clearAllCacheLayers(entityType, organizationId);
        
        const queryKeys = getEntityQueryKeys(entityType, organizationId);
        await forceReactQueryInvalidation(queryKeys, organizationId);
        console.log('✅ [Data Refresh Helpers] تم التحديث بالنظام التقليدي');
      }
      
      // إرسال إشعار للمكونات
      const eventData = {
        entityType,
        operation,
        organizationId,
        timestamp: new Date().toISOString()
      };
      
      const customEvent = new CustomEvent(`${entityType}-updated`, { detail: eventData });
      window.dispatchEvent(customEvent);
      
      console.log(`📢 [Data Refresh Helpers] تم إرسال CustomEvent للـ ${entityType}`);
      
    } catch (error) {
      console.error(`❌ [Data Refresh Helpers] خطأ في التحديث التلقائي للـ ${entityType}:`, error);
    }
  }, delay);
};

/**
 * دالة مساعدة للحصول على مفاتيح الاستعلام حسب نوع البيانات
 */
const getEntityQueryKeys = (entityType: string, organizationId?: string): string[] => {
  const baseKeys: Record<string, string[]> = {
    products: [
      'products',
      'product-list',
      'pos-products',
      'dashboard-products',
      'store-products',
      'all-products'
    ],
    categories: [
      'categories',
      'product-categories',
      'pos-categories',
      'subscription-categories',
      'store-categories'
    ],
    orders: [
      'orders',
      'pos-orders',
      'dashboard-orders',
      'order-stats',
      'recent-orders'
    ],
    inventory: [
      'inventory',
      'product-stock',
      'inventory-stats',
      'stock-alerts'
    ],
    settings: [
      'organization-settings',
      'pos-settings',
      'store-settings',
      'theme-settings'
    ],
    subscriptions: [
      'subscriptions',
      'organization-subscriptions',
      'pos-subscriptions',
      'subscription-services'
    ],
    apps: [
      'organization-apps',
      'apps-management',
      'enabled-apps'
    ]
  };

  const keys = baseKeys[entityType] || [entityType];
  
  // إضافة مفاتيح مع معرف المؤسسة
  if (organizationId) {
    const orgKeys = keys.map(key => `${key}-${organizationId}`);
    return [...keys, ...orgKeys];
  }
  
  return keys;
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
