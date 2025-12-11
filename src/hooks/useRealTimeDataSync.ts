/**
 * 🚀 نظام التحديث في الزمن الحقيقي - الحل الشامل
 * يحل جميع مشاكل عدم تحديث البيانات نهائياً
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RealTimeUpdateOptions {
  showNotification?: boolean;
  invalidateRelated?: boolean;
  bypassCache?: boolean;
  immediate?: boolean;
}

interface UpdateOperationData {
  type: 'create' | 'update' | 'delete';
  entity: 'product' | 'category' | 'order' | 'app' | 'organization';
  id?: string;
  data?: any;
}

export const useRealTimeDataSync = () => {
  const queryClient = useQueryClient();

  /**
   * 🎯 تحديث فوري وموثوق للبيانات
   */
  const syncData = useCallback(async (
    operation: UpdateOperationData,
    options: RealTimeUpdateOptions = {}
  ) => {
    const {
      showNotification = false,
      invalidateRelated = true,
      bypassCache = true,
      immediate = true
    } = options;

    try {
      // 1. مسح الـ Cache المتضارب فوراً
      if (bypassCache) {
        await clearAllCacheLayers(operation.entity);
      }

      // 2. تحديث React Query مباشرة
      await forceQueryInvalidation(operation.entity);

      // 3. تحديث البيانات المرتبطة
      if (invalidateRelated) {
        await invalidateRelatedQueries(operation.entity);
      }

      // 4. تحديث فوري للـ UI
      if (immediate) {
        await queryClient.refetchQueries({
          type: 'active',
          stale: true
        });
      }

      if (showNotification) {
        toast.success('تم تحديث البيانات');
      }

    } catch (error) {
      if (showNotification) {
        toast.error('فشل في تحديث البيانات');
      }
    }
  }, [queryClient]);

  /**
   * 🧹 مسح جميع طبقات الـ Cache
   */
  const clearAllCacheLayers = useCallback(async (entity: string) => {
    // مسح Ultimate Request Controller
    if (typeof window !== 'undefined') {
      const controller = (window as any).requestController;
      if (controller) {
        controller.invalidateDataCache(entity);
      }

      // مسح Performance Analytics
      const analytics = (window as any).performanceAnalytics;
      if (analytics?.clearSpecificCache) {
        analytics.clearSpecificCache(entity);
      }

      // مسح Global Request Deduplicator
      // 🔧 Fix: استخدام طريقة آمنة للحذف مع التحقق من قابلية التعديل
      const deduplicator = (window as any).globalRequestDeduplicator;
      if (deduplicator && typeof deduplicator === 'object') {
        try {
          const keysToDelete = Object.keys(deduplicator).filter(key => key.includes(entity));
          for (const key of keysToDelete) {
            // التحقق من أن الخاصية قابلة للحذف
            const descriptor = Object.getOwnPropertyDescriptor(deduplicator, key);
            if (descriptor?.configurable !== false) {
              delete deduplicator[key];
            }
          }
        } catch {
          // تجاهل الأخطاء في حالة الـ frozen objects
        }
      }
    }
  }, []);

  /**
   * ⚡ إجبار React Query على التحديث
   */
  const forceQueryInvalidation = useCallback(async (entity: string) => {
    const queryKeys = getEntityQueryKeys(entity);
    
    // استخدام الدالة الأصلية مباشرة لتجاوز الحماية
    const originalInvalidate = (queryClient as any).invalidateQueries;
    
    for (const key of queryKeys) {
      try {
        // إجبار الإبطال مباشرة
        await originalInvalidate.__original?.({ queryKey: [key] }) || 
              await originalInvalidate({ queryKey: [key], exact: true });
        
      } catch (error) {
      }
    }
  }, [queryClient]);

  /**
   * 🔗 تحديث الاستعلامات المرتبطة
   */
  const invalidateRelatedQueries = useCallback(async (entity: string) => {
    const relatedEntities = getRelatedEntities(entity);
    
    for (const relatedEntity of relatedEntities) {
      await forceQueryInvalidation(relatedEntity);
    }
  }, [forceQueryInvalidation]);

  /**
   * 📱 تحديث سريع للمنتجات (الاستخدام الأكثر شيوعاً)
   */
  const syncProducts = useCallback(async (options?: RealTimeUpdateOptions) => {
    await syncData(
      { type: 'update', entity: 'product' },
      { showNotification: true, ...options }
    );
  }, [syncData]);

  /**
   * 📂 تحديث سريع للفئات
   */
  const syncCategories = useCallback(async (options?: RealTimeUpdateOptions) => {
    await syncData(
      { type: 'update', entity: 'category' },
      { showNotification: true, ...options }
    );
  }, [syncData]);

  /**
   * 📦 تحديث سريع للطلبات
   */
  const syncOrders = useCallback(async (options?: RealTimeUpdateOptions) => {
    await syncData(
      { type: 'update', entity: 'order' },
      { showNotification: true, ...options }
    );
  }, [syncData]);

  /**
   * 🎯 تحديث بعد العمليات (للاستخدام في المكونات)
   */
  const syncAfterOperation = useCallback(async (
    operation: UpdateOperationData,
    options?: RealTimeUpdateOptions
  ) => {
    // تأخير قصير للسماح للعملية بالانتهاء
    setTimeout(async () => {
      await syncData(operation, {
        showNotification: true,
        immediate: true,
        ...options
      });
    }, 100);
  }, [syncData]);

  /**
   * 🔄 تحديث شامل لجميع البيانات
   */
  const syncAll = useCallback(async (options?: RealTimeUpdateOptions) => {
    
    const entities = ['product', 'category', 'order', 'app', 'organization'];
    
    for (const entity of entities) {
      await syncData(
        { type: 'update', entity: entity as any },
        { showNotification: false, ...options }
      );
    }
    
    if (options?.showNotification !== false) {
      toast.success('تم تحديث جميع البيانات');
    }
  }, [syncData]);

  return {
    // الدوال الأساسية
    syncData,
    syncAfterOperation,
    syncAll,
    
    // دوال سريعة للكيانات الشائعة
    syncProducts,
    syncCategories,
    syncOrders,
    
    // دوال مساعدة
    clearAllCacheLayers,
    forceQueryInvalidation,
  };
};

/**
 * 🗝️ الحصول على مفاتيح الاستعلام لكل كيان
 */
function getEntityQueryKeys(entity: string): string[] {
  const keyMaps: Record<string, string[]> = {
    product: [
      'products',
      'pos-products', 
      'pos-products-enhanced',
      'dashboard-products',
      'product-list',
      'inventory',
      'product-stock',
      'pos-dashboard-data'
    ],
    category: [
      'categories',
      'product-categories',
      'pos-product-categories',
      'subscription-categories'
    ],
    order: [
      'orders',
      'pos-orders',
      'dashboard-orders',
      'order-stats',
      'recent-orders'
    ],
    app: [
      'organization-apps',
      'pos-organization-apps',
      'pos-organization-apps-enhanced',
      'apps-list'
    ],
    organization: [
      'organization-data',
      'organization-settings',
      'tenant-data'
    ]
  };

  return keyMaps[entity] || [entity];
}

/**
 * 🔗 الحصول على الكيانات المرتبطة
 */
function getRelatedEntities(entity: string): string[] {
  const relationMaps: Record<string, string[]> = {
    product: ['category', 'inventory'],
    category: ['product'],
    order: ['product', 'inventory'],
    app: [],
    organization: ['product', 'category', 'order', 'app']
  };

  return relationMaps[entity] || [];
}

export default useRealTimeDataSync;
