import { useCallback } from 'react';
import { useTenant } from '@/context/TenantContext';
import { forceRefreshAfterCRUD } from '@/lib/data-refresh-helpers';

// ============================================================================
// 🚀 AUTO REFRESH HOOK - نظام التحديث التلقائي المحسن
// ============================================================================

export interface AutoRefreshOptions {
  immediate?: boolean;
  showNotification?: boolean;
}

/**
 * Hook لاستخدام التحديث التلقائي بعد العمليات CRUD
 */
export const useAutoRefresh = () => {
  const { currentOrganization } = useTenant();

  const refreshAfterCreate = useCallback(
    async (
      entityType: 'products' | 'categories' | 'orders' | 'inventory' | 'settings' | 'subscriptions' | 'apps',
      options: AutoRefreshOptions = {}
    ) => {
      await forceRefreshAfterCRUD(entityType, 'create', {
        organizationId: currentOrganization?.id,
        ...options
      });
    },
    [currentOrganization?.id]
  );

  const refreshAfterUpdate = useCallback(
    async (
      entityType: 'products' | 'categories' | 'orders' | 'inventory' | 'settings' | 'subscriptions' | 'apps',
      options: AutoRefreshOptions = {}
    ) => {
      await forceRefreshAfterCRUD(entityType, 'update', {
        organizationId: currentOrganization?.id,
        ...options
      });
    },
    [currentOrganization?.id]
  );

  const refreshAfterDelete = useCallback(
    async (
      entityType: 'products' | 'categories' | 'orders' | 'inventory' | 'settings' | 'subscriptions' | 'apps',
      options: AutoRefreshOptions = {}
    ) => {
      await forceRefreshAfterCRUD(entityType, 'delete', {
        organizationId: currentOrganization?.id,
        ...options
      });
    },
    [currentOrganization?.id]
  );

  const refreshAfterOperation = useCallback(
    async (
      entityType: 'products' | 'categories' | 'orders' | 'inventory' | 'settings' | 'subscriptions' | 'apps',
      operation: 'create' | 'update' | 'delete',
      options: AutoRefreshOptions = {}
    ) => {
      await forceRefreshAfterCRUD(entityType, operation, {
        organizationId: currentOrganization?.id,
        ...options
      });
    },
    [currentOrganization?.id]
  );

  // دوال مباشرة لكل نوع بيانات
  const refreshProducts = useCallback(
    (operation: 'create' | 'update' | 'delete' = 'update', options: AutoRefreshOptions = {}) =>
      refreshAfterOperation('products', operation, options),
    [refreshAfterOperation]
  );

  const refreshCategories = useCallback(
    (operation: 'create' | 'update' | 'delete' = 'update', options: AutoRefreshOptions = {}) =>
      refreshAfterOperation('categories', operation, options),
    [refreshAfterOperation]
  );

  const refreshOrders = useCallback(
    (operation: 'create' | 'update' | 'delete' = 'update', options: AutoRefreshOptions = {}) =>
      refreshAfterOperation('orders', operation, options),
    [refreshAfterOperation]
  );

  const refreshInventory = useCallback(
    (operation: 'create' | 'update' | 'delete' = 'update', options: AutoRefreshOptions = {}) =>
      refreshAfterOperation('inventory', operation, options),
    [refreshAfterOperation]
  );

  const refreshSettings = useCallback(
    (operation: 'create' | 'update' | 'delete' = 'update', options: AutoRefreshOptions = {}) =>
      refreshAfterOperation('settings', operation, options),
    [refreshAfterOperation]
  );

  return {
    // دوال العمليات العامة
    refreshAfterCreate,
    refreshAfterUpdate,
    refreshAfterDelete,
    refreshAfterOperation,

    // دوال مباشرة لكل نوع بيانات
    refreshProducts,
    refreshCategories,
    refreshOrders,
    refreshInventory,
    refreshSettings,

    // معلومات المؤسسة
    organizationId: currentOrganization?.id,
  };
};

export default useAutoRefresh;
