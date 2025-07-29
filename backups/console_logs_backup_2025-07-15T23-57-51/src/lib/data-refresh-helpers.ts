// =================================================================
// 🚀 DATA REFRESH HELPERS - نظام التحديث الفوري المتطور
// =================================================================

import { QueryClient } from '@tanstack/react-query';
// تم حذف UltimateRequestController
import { UnifiedRequestManager } from '@/lib/unifiedRequestManager';
import { CentralRequestManager } from '@/api/centralRequestManager';
import { StoreRequestOptimizer } from '@/api/storeRequestOptimizer';
import { invalidateOrganizationCache } from '@/lib/cache/storeCache';
import { clearOptimizedStoreCache } from '@/api/optimizedStoreDataService';

let globalQueryClient: QueryClient | null = null;

export const setGlobalQueryClient = (queryClient: QueryClient) => {
  globalQueryClient = queryClient;
};

/**
 * دالة إجبار تحديث البيانات
 */
export const forceDataRefresh = async (queryKey?: string | string[], options?: { forceRefresh?: boolean }) => {
  if (!globalQueryClient) return;
  
  try {
    if (typeof queryKey === 'string') {
      await globalQueryClient.invalidateQueries({ 
        queryKey: [queryKey], 
        exact: false,
        type: 'all'
      });
    } else if (Array.isArray(queryKey)) {
      for (const key of queryKey) {
        await globalQueryClient.invalidateQueries({ 
          queryKey: [key], 
          exact: false,
          type: 'all'
        });
      }
    } else {
      // تحديث شامل لجميع الاستعلامات
      await globalQueryClient.invalidateQueries();
    }
  } catch (error) {
  }
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

  // 6. مسح optimized-store-api cache (localStorage)
  try {
    const { clearStoreCache } = await import('@/api/optimized-store-api');
    if (organizationId) {
      // الحصول على subdomain للمؤسسة
      const orgSubdomain = localStorage.getItem(`org_${organizationId}_subdomain`);
      if (orgSubdomain) {
        clearStoreCache(orgSubdomain);
      } else {
        // إذا لم نجد subdomain محدد، نمسح كل البيانات
        clearStoreCache();
      }
    } else {
      clearStoreCache();
    }
  } catch (error) {
    // fallback: مسح مباشر من localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('store_data_')) {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_timestamp`);
      }
    });
  }

};

/**
 * إجبار تحديث React Query مع تجاوز جميع القيود
 */
const forceReactQueryInvalidation = async (queryKeys: string[], organizationId?: string) => {
  if (!globalQueryClient) return;

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

  const delay = immediate ? 0 : 50; // تقليل التأخير
  
  setTimeout(async () => {
    try {
      // تحديث محسن: فقط المفاتيح الضرورية
      const essentialKeys = [
        'products',
        'dashboard-products',
        `products-${organizationId}`
      ];

      // تحديث واحد فقط لكل مفتاح
      await Promise.all(
        essentialKeys.map(key => 
          forceDataRefresh(key, { forceRefresh: true })
        )
      );

      // إرسال إشعار مبسط للمكونات
      const customEvent = new CustomEvent('products-updated', { 
        detail: { operation, organizationId, timestamp: Date.now() } 
      });
      window.dispatchEvent(customEvent);

    } catch (error) {
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

  // 🚀 تحسين: تقليل التأخير وتجنب setTimeout غير الضروري
  const delay = immediate ? 0 : 50;
  
  // 🎯 تجنب setTimeout إذا كان immediate = true
  const executeRefresh = async () => {
    try {
      // 🧹 مسح cache محسن - فقط المناطق الضرورية
      await clearAllCacheLayers('categories', organizationId);
      
      // 📋 مفاتيح محسنة - إزالة المفاتيح غير الضرورية
      const categoryQueryKeys = [
        'categories',
        'product-categories', 
        'store-categories',
        'dashboard-categories'
      ];
      
      // إضافة مفاتيح خاصة بالمؤسسة فقط عند الحاجة
      if (organizationId) {
        categoryQueryKeys.push(`categories-${organizationId}`);
      }

      // 🔄 تحديث React Query محسن
      await forceReactQueryInvalidation(categoryQueryKeys, organizationId);

      // 🎉 إشعارات محسنة - تجنب DOM manipulation غير الضروري
      if (typeof window !== 'undefined') {
        // استخدام requestIdleCallback لتجنب blocking
        const notifyUpdates = () => {
          window.dispatchEvent(new CustomEvent('categoriesUpdated', { 
            detail: { 
              operation, 
              organizationId,
              timestamp: new Date().toISOString()
            } 
          }));
        };

        if (window.requestIdleCallback) {
          window.requestIdleCallback(notifyUpdates);
        } else {
          setTimeout(notifyUpdates, 0);
        }
        
        // 🧹 مسح localStorage محسن - بدون إجبار re-render
        if (operation === 'delete' || operation === 'update') {
          // استخدام requestIdleCallback لتجنب blocking main thread
          const cleanupCache = () => {
            try {
              // مسح localStorage cache للمتجر
              const keys = Object.keys(localStorage);
              const keysToRemove = keys.filter(key => 
                key.includes('store_data') || 
                key.includes('useSharedStoreData') || 
                key.includes('categories') || 
                key.includes('store_basic_')
              );
              
              keysToRemove.forEach(key => localStorage.removeItem(key));
              
              // مسح global cache بطريقة محسنة
              if ((window as any).globalStoreDataCache) {
                const globalCache = (window as any).globalStoreDataCache;
                const globalTimestamp = (window as any).globalCacheTimestamp;
                
                Object.keys(globalCache).forEach(key => {
                  if (key.includes('store-data') || (organizationId && key.includes(organizationId))) {
                    delete globalCache[key];
                    if (globalTimestamp) delete globalTimestamp[key];
                  }
                });
              }
              
              // مسح optimizedStoreDataService cache
              if (organizationId) {
                const orgSubdomain = localStorage.getItem(`org_${organizationId}_subdomain`) || 
                                  localStorage.getItem('bazaar_organization_subdomain') ||
                                  window.location.hostname.split('.')[0];
                if (orgSubdomain) {
                  try {
                    clearOptimizedStoreCache(orgSubdomain);
                  } catch (error) {
                    // تجاهل الأخطاء في مسح cache إضافي
                  }
                }
              }
            } catch (error) {
              // تجاهل الأخطاء في cleanup
            }
          };

          if (window.requestIdleCallback) {
            window.requestIdleCallback(cleanupCache);
          } else {
            setTimeout(cleanupCache, 100);
          }
        }
      }
      
    } catch (error) {
      // تجاهل الأخطاء في refresh
    }
  };

  // تنفيذ فوري أو مؤجل حسب الحاجة
  if (immediate) {
    await executeRefresh();
  } else {
    setTimeout(executeRefresh, delay);
  }
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

  const delay = immediate ? 0 : 50;
  
  setTimeout(async () => {
    try {
      // 🎯 الطريقة الجديدة المحسنة - مسح شامل لجميع أنواع cache أولاً
      if (typeof window !== 'undefined' && (window as any).forceInvalidateAllCache && organizationId) {
        await (window as any).forceInvalidateAllCache(entityType, organizationId, {});
      }

      // 🔄 ثم استخدام UltimateRequestController المحسن
      if (typeof window !== 'undefined' && (window as any).forceRefreshAfterMutation) {
        await (window as any).forceRefreshAfterMutation(entityType);
      } else {
        // Fallback للطريقة القديمة
        await clearAllCacheLayers(entityType, organizationId);
        
        const queryKeys = getEntityQueryKeys(entityType, organizationId);
        await forceReactQueryInvalidation(queryKeys, organizationId);
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

    } catch (error) {
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
