import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
// تم حذف UltimateRequestController

// ============================================================================
// 🚀 SMART DATA REFRESH HOOK - نظام التحديث الذكي
// ============================================================================

interface SmartRefreshOptions {
  clearCache?: boolean;
  forceRefresh?: boolean;
  queryKeys?: string[];
  immediate?: boolean;
}

export const useSmartDataRefresh = () => {
  const queryClient = useQueryClient();

  // تحديث ذكي للمنتجات
  const refreshProducts = useCallback(async (options: SmartRefreshOptions = {}) => {
    const { clearCache = true, forceRefresh = true, immediate = true } = options;

    if (clearCache && typeof window !== 'undefined') {
      // مسح cache محدد للمنتجات
      if ((window as any).requestController) {
        (window as any).requestController.invalidateDataCache('products');
        (window as any).requestController.invalidateDataCache('product_categories');
      }
    }

    const productQueryKeys = [
      'products', 'pos-products', 'pos-products-enhanced', 
      'product-categories', 'subscription-categories'
    ];

    if (forceRefresh) {
      forceDataRefresh(productQueryKeys);
    } else {
      productQueryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    }

  }, [queryClient]);

  // تحديث ذكي للفئات
  const refreshCategories = useCallback(async (options: SmartRefreshOptions = {}) => {
    const { clearCache = true, forceRefresh = true } = options;

    if (clearCache && typeof window !== 'undefined') {
      if ((window as any).requestController) {
        (window as any).requestController.invalidateDataCache('categories');
        (window as any).requestController.invalidateDataCache('product_categories');
      }
    }

    const categoryQueryKeys = [
      'categories', 'product-categories', 'pos-product-categories', 
      'subscription-categories'
    ];

    if (forceRefresh) {
      forceDataRefresh(categoryQueryKeys);
    } else {
      categoryQueryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    }

  }, [queryClient]);

  // تحديث ذكي للمخزون
  const refreshInventory = useCallback(async (options: SmartRefreshOptions = {}) => {
    const { clearCache = true, forceRefresh = true } = options;

    if (clearCache && typeof window !== 'undefined') {
      if ((window as any).requestController) {
        (window as any).requestController.invalidateDataCache('inventory');
        (window as any).requestController.invalidateDataCache('product_stock');
      }
    }

    const inventoryQueryKeys = [
      'inventory', 'product-stock', 'inventory-stats'
    ];

    if (forceRefresh) {
      forceDataRefresh(inventoryQueryKeys);
    } else {
      inventoryQueryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    }

  }, [queryClient]);

  // تحديث ذكي للطلبات
  const refreshOrders = useCallback(async (options: SmartRefreshOptions = {}) => {
    const { clearCache = true, forceRefresh = true } = options;

    if (clearCache && typeof window !== 'undefined') {
      if ((window as any).requestController) {
        (window as any).requestController.invalidateDataCache('orders');
        (window as any).requestController.invalidateDataCache('pos_orders');
      }
    }

    const orderQueryKeys = [
      'orders', 'pos-orders', 'dashboard-orders', 'order-stats'
    ];

    if (forceRefresh) {
      forceDataRefresh(orderQueryKeys);
    } else {
      orderQueryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    }

  }, [queryClient]);

  // تحديث ذكي للتطبيقات
  const refreshApps = useCallback(async (options: SmartRefreshOptions = {}) => {
    const { clearCache = true, forceRefresh = true } = options;

    if (clearCache && typeof window !== 'undefined') {
      if ((window as any).requestController) {
        (window as any).requestController.invalidateDataCache('organization_apps');
        (window as any).requestController.invalidateDataCache('get_organization_apps');
      }
    }

    const appsQueryKeys = [
      'organization-apps', 'pos-organization-apps-enhanced'
    ];

    if (forceRefresh) {
      forceDataRefresh(appsQueryKeys);
    } else {
      appsQueryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    }

  }, [queryClient]);

  // تحديث شامل لجميع البيانات
  const refreshAll = useCallback(async (options: SmartRefreshOptions = {}) => {
    const { clearCache = true, forceRefresh = true } = options;

    if (clearCache && typeof window !== 'undefined') {
      if ((window as any).requestController) {
        (window as any).requestController.clearAllCaches();
      }
    }

    if (forceRefresh) {
      forceDataRefresh(); // بدون queryKeys = تحديث شامل
    } else {
      await queryClient.invalidateQueries({ type: 'active' });
    }

  }, [queryClient]);

  // تحديث تلقائي بعد العمليات (مثل إضافة منتج)
  const refreshAfterMutation = useCallback(async (
    mutationType: 'create' | 'update' | 'delete',
    dataType: 'products' | 'categories' | 'inventory' | 'orders' | 'apps' | 'all',
    options: SmartRefreshOptions = {}
  ) => {
    
    // تأخير قصير للسماح للعملية بالانتهاء
    setTimeout(async () => {
      switch (dataType) {
        case 'products':
          await refreshProducts({ ...options, forceRefresh: true });
          break;
        case 'categories':
          await refreshCategories({ ...options, forceRefresh: true });
          break;
        case 'inventory':
          await refreshInventory({ ...options, forceRefresh: true });
          break;
        case 'orders':
          await refreshOrders({ ...options, forceRefresh: true });
          break;
        case 'apps':
          await refreshApps({ ...options, forceRefresh: true });
          break;
        case 'all':
          await refreshAll({ ...options, forceRefresh: true });
          break;
      }
    }, 100);
  }, [refreshProducts, refreshCategories, refreshInventory, refreshOrders, refreshApps, refreshAll]);

  return {
    // دوال التحديث المحددة
    refreshProducts,
    refreshCategories,
    refreshInventory,
    refreshOrders,
    refreshApps,
    refreshAll,
    
    // تحديث تلقائي بعد العمليات
    refreshAfterMutation,
  };
};

export default useSmartDataRefresh;
