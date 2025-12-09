/**
 * useUnifiedPOSData - Hook موحد لبيانات POS
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 *
 * - يمنع التكرار ويحسن الأداء
 * - يستخدم deltaWriteService بدلاً من inventoryDB
 */

import { useEffect, useMemo, useRef } from 'react';
// ⚡ تم إزالة sqliteDB و isSQLiteAvailable - PowerSync متاح دائماً
// import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { dbInitManager } from '@/lib/db/DatabaseInitializationManager';
import { useQuery, useQueryClient } from '@tanstack/react-query';
// ⚡ تم إزالة استيراد supabase - القراءة الآن فقط من SQLite
import { useTenant } from '@/context/TenantContext';
import type { LocalProduct, LocalCustomer, LocalPOSOrder, LocalOrganizationSubscription } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { getLocalCategories } from '@/lib/api/categories';
import { localPosSettingsService } from '@/api/localPosSettingsService';
import {
  mapLocalProductToPOSProduct,
  mapLocalSubscriptionToService,
  mapLocalCategoryToSubscriptionCategory,
  ensureArray
} from '@/context/POSDataContext';
// ⚡ تم إزالة استيراد networkStatus - لم يعد مطلوباً في Hook
import { imageOfflineService } from '@/services/ImageOfflineService';

// =====================================================
// 🚀 Hook موحد لبيانات POS - يمنع التكرار ويحسن الأداء
// =====================================================

interface CompletePOSData {
  products: any[];
  pagination?: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
  subscriptions: any[];
  subscription_categories: any[];
  product_categories: any[];
  pos_settings: any;
  organization_apps: any[];
  users: any[];
  customers: any[];
  recent_orders: any[];
  inventory_stats: {
    totalProducts: number;
    outOfStockProducts: number;
    totalStock: number;
  };
  order_stats: {
    totalPosOrders: number;
    todayOrders: number;
    totalSales: number;
    todaySales: number;
  };
}

interface CompletePOSResponse {
  success: boolean;
  data?: CompletePOSData;
  meta?: {
    execution_time_ms: number;
    data_timestamp: string;
    organization_id: string;
  };
  error?: string;
  error_code?: string;
}

interface POSDataOptions {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

interface CachedPOSResponse {
  timestamp: string;
  data: CompletePOSResponse;
}

const parseDateToISOString = (value: unknown, fallback: string): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  const timestamp = Number.isFinite(Number(value)) ? Number(value) : NaN;
  if (!Number.isNaN(timestamp)) {
    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  try {
    const date = new Date(value as any);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  } catch { }
  return fallback;
};

// ⚡ دالة لحفظ البيانات في قاعدة البيانات المحلية باستخدام Delta Sync
// ⚡ يتم استدعاؤها من posDataSyncService عند المزامنة
export const hydrateLocalDBFromResponse = async (
  orgId: string,
  response: CompletePOSResponse
) => {
  if (!response?.data) return;

  const { products, customers, recent_orders } = response.data;
  if ((!products || products.length === 0) &&
    (!customers || customers.length === 0) &&
    (!recent_orders || recent_orders.length === 0)) {
    return;
  }

  // بدء تحميل الصور في الخلفية
  if (products && products.length > 0) {
    imageOfflineService.processProductsImages(products).catch(err => {
      console.error('[UnifiedPOSData] Error processing offline images:', err);
    });
  }

  const now = new Date().toISOString();

  try {
    console.log('[hydrateLocalDB] ⚡ بدء حفظ البيانات باستخدام Delta Sync', {
      orgId,
      productsCount: products?.length || 0,
      customersCount: customers?.length || 0,
      ordersCount: recent_orders?.length || 0
    });

    // ⚡ حفظ المنتجات باستخدام Batch UPSERT الحقيقي (أسرع 20x)
    if (Array.isArray(products) && products.length > 0) {
      const localProducts: LocalProduct[] = products
        .filter(p => p?.id)
        .map(product => {
          const createdAt = parseDateToISOString(
            (product as any).created_at ?? product.createdAt,
            now
          );
          const updatedAt = parseDateToISOString(
            (product as any).updated_at ?? product.updatedAt ?? createdAt,
            createdAt
          );
          const stock =
            (product as any).stock_quantity ??
            (product as any).stockQuantity ??
            (product as any).actual_stock_quantity ??
            0;

          return {
            ...(product as any),
            id: product.id,
            organization_id: (product as any).organization_id ?? orgId,
            created_at: createdAt,
            updated_at: updatedAt,
            localUpdatedAt: now,
            synced: 1,
            stock_quantity: Number.isFinite(Number(stock)) ? Number(stock) : 0,
            actual_stock_quantity:
              (product as any).actual_stock_quantity ??
              (product as any).stock_quantity ??
              (product as any).stockQuantity ??
              stock
          };
        });

      // ⚡ استخدام Batch UPSERT الحقيقي - جملة SQL واحدة لكل 100 منتج!
      console.log(`[hydrateLocalDB] ⚡ حفظ ${localProducts.length} منتج باستخدام Batch UPSERT...`);
      const startTime = Date.now();

      const batchResult = await deltaWriteService.upsertBatch('products', localProducts);

      const duration = Date.now() - startTime;
      console.log(`[hydrateLocalDB] ✅ تم حفظ ${batchResult.count} منتج في ${duration}ms (${Math.round(localProducts.length / (duration / 1000))} منتج/ثانية)`);

      if (batchResult.errors > 0) {
        console.warn(`[hydrateLocalDB] ⚠️ فشل حفظ ${batchResult.errors} منتج`);
      }
    }

    // ⚡ حفظ العملاء باستخدام Batch UPSERT الحقيقي
    if (Array.isArray(customers) && customers.length > 0) {
      const localCustomers: LocalCustomer[] = customers
        .filter(c => c?.id)
        .map(customer => {
          const createdAt = parseDateToISOString((customer as any).created_at, now);
          const updatedAt = parseDateToISOString(
            (customer as any).updated_at ?? createdAt,
            createdAt
          );

          return {
            id: customer.id,
            name: customer.name ?? 'عميل',
            email: customer.email ?? '',
            phone: customer.phone ?? '',
            organization_id: (customer as any).organization_id ?? orgId,
            created_at: createdAt,
            updated_at: updatedAt,
            synced: 1
          };
        });

      // ⚡ استخدام Batch UPSERT الحقيقي
      const batchResult = await deltaWriteService.upsertBatch('customers', localCustomers);
      console.log(`[hydrateLocalDB] ⚡ تم حفظ ${batchResult.count} عميل`);
    }

    // ⚡ حفظ الطلبات باستخدام Batch UPSERT الحقيقي
    if (Array.isArray(recent_orders) && recent_orders.length > 0) {
      const localOrders: LocalPOSOrder[] = recent_orders
        .filter(o => o?.id)
        .map(order => {
          const createdAt = parseDateToISOString((order as any).created_at, now);
          const updatedAt = parseDateToISOString(
            (order as any).updated_at ?? createdAt,
            createdAt
          );

          return {
            id: order.id,
            organization_id: (order as any).organization_id ?? orgId,
            employee_id: (order as any).employee_id ?? null,
            customer_id: (order as any).customer_id ?? null,
            customer_name: (order as any).customer_name ?? 'عميل نقاط البيع',
            subtotal: Number((order as any).subtotal ?? (order as any).total ?? 0),
            total: Number((order as any).total ?? 0),
            discount: Number((order as any).discount ?? 0),
            amount_paid: Number((order as any).amount_paid ?? (order as any).total ?? 0),
            payment_method: (order as any).payment_method ?? 'cash',
            payment_status: (order as any).payment_status ?? 'pending',
            notes: (order as any).notes ?? '',
            remaining_amount: Number((order as any).remaining_amount ?? 0),
            status: 'synced',
            synced: 1,
            created_at: createdAt,
            updated_at: updatedAt,
            order_number: (order as any).order_number ||
              (order as any).orderNumber ||
              String((order as any).customer_order_number ?? order.id)
          };
        });

      // ⚡ استخدام Batch UPSERT الحقيقي
      const batchResult = await deltaWriteService.upsertBatch('orders', localOrders);
      console.log(`[hydrateLocalDB] ⚡ تم حفظ ${batchResult.count} طلب`);
    }

    console.log('[hydrateLocalDB] ⚡ اكتملت عملية الحفظ بنجاح');
  } catch (error) {
    console.error('[hydrateLocalDB] فشل حفظ البيانات:', error);
  }
};

const buildCacheKey = (
  orgId: string,
  page: number,
  limit: number,
  search?: string,
  categoryId?: string
) =>
  `org:${orgId}:page:${page}:limit:${limit}:search:${search ?? ''}:category:${categoryId ?? ''}`;

const shouldCacheQuery = (
  page: number,
  search?: string,
  categoryId?: string
) => {
  const hasSearch = Boolean(search && search.trim().length > 0);
  const hasCategory = Boolean(categoryId && categoryId.trim().length > 0);
  return page === 1 && !hasSearch && !hasCategory;
};

const loadCachedCompletePOSData = async (
  orgId: string,
  page: number,
  limit: number,
  search?: string,
  categoryId?: string
): Promise<CompletePOSResponse | null> => {
  try {
    const cacheKey = buildCacheKey(orgId, page, limit, search, categoryId);
    // ⚡ استخدام PowerSync مباشرة
    if (!powerSyncService.db) {
      console.warn('[useUnifiedPOSData] PowerSync DB not initialized');
      return null;
    }
    const res = await powerSyncService.queryOne<any>({
      sql: 'SELECT * FROM pos_offline_cache WHERE id = ?',
      params: [cacheKey]
    });
    const cached = res ? (res as CachedPOSResponse | null) : null;
    if (cached?.data) {
      console.warn('[UnifiedPOSData][Cache] استخدام البيانات المخزنة (SQLite)', {
        orgId,
        cacheKey,
        productCount: cached.data.data?.products?.length ?? 0,
        cachedAt: cached.timestamp
      });
      return cached.data;
    }
  } catch (error) {
    console.error('[UnifiedPOSData][Cache] فشل تحميل البيانات من SQLite', error);
  }
  return null;
};

// ⚡ دالة لتحميل البيانات الأولية من قاعدة البيانات المحلية (محسّنة 2025)
// تستخدم SQL-level filtering و pagination بدلاً من تحميل كل شيء للذاكرة
const loadInitialDataFromLocalDB = async (
  orgId: string,
  page: number,
  limit: number,
  search?: string,
  categoryId?: string
) => {
  const logPrefix = '[UnifiedPOSData][LocalDB]';
  const startTime = Date.now();
  console.info(`${logPrefix} ===== بدء loadInitialDataFromLocalDB (Smart SQL) =====`, {
    orgId,
    page,
    limit,
    search: search ?? null,
    categoryId: categoryId ?? null
  });

  try {
    // ⚡ استخدام الدوال الذكية - SQL filtering & pagination
    // هذا يجلب فقط المنتجات المطلوبة بدلاً من كل المنتجات!
    const [
      productsResult,
      productStats,
      orderStats,
      localCategories,
      localSettings,
      localSubscriptions,
      localCustomers,
      recentOrdersResult
    ] = await Promise.all([
      // ⚡ جلب المنتجات مع فلترة SQL - فقط ما نحتاجه!
      deltaWriteService.searchProductsSmart({
        organizationId: orgId,
        search,
        categoryId,
        page,
        limit,
        isActive: true
      }),
      // ⚡ إحصائيات المنتجات - SQL aggregation
      deltaWriteService.getProductStats(orgId),
      // ⚡ إحصائيات الطلبات - SQL aggregation
      deltaWriteService.getOrderStats(orgId),
      // الفئات
      getLocalCategories(),
      // الإعدادات
      localPosSettingsService.get(orgId),
      // الاشتراكات
      deltaWriteService.getAll<LocalOrganizationSubscription>('organization_subscriptions' as any, orgId).catch(() => []),
      // العملاء
      deltaWriteService.getAll<LocalCustomer>('customers', orgId, { limit: 100 }).catch(() => []),
      // آخر 10 طلبات فقط
      deltaWriteService.getOrdersSmart({
        organizationId: orgId,
        page: 1,
        limit: 10
      }).catch(() => ({ orders: [], totalCount: 0, page: 1, totalPages: 1 }))
    ]);

    // ⚡ المنتجات جاهزة مع الألوان والمقاسات من searchProductsSmart
    const mappedProducts = productsResult.products.map(mapLocalProductToPOSProduct);

    const duration = Date.now() - startTime;
    console.info(`${logPrefix} ⚡ تم التحميل في ${duration}ms`, {
      productsLoaded: mappedProducts.length,
      totalProducts: productsResult.totalCount,
      categories: localCategories.length,
      subscriptions: localSubscriptions.length,
      customers: localCustomers.length,
      recentOrders: recentOrdersResult.orders.length,
      hasSettings: Boolean(localSettings)
    });

    const productCategories = localCategories
      .filter(category => category.organization_id === orgId && (!category.type || category.type === 'product'))
      .map(category => ({
        id: category.id,
        name: category.name,
        description: category.description ?? '',
        organization_id: category.organization_id,
        is_active: category.is_active !== false,
        created_at: category.created_at ?? new Date().toISOString(),
        updated_at: category.updated_at ?? category.created_at ?? new Date().toISOString()
      }));

    const subscriptionCategories = localCategories
      .filter(category => category.organization_id === orgId && (!category.type || category.type === 'service'))
      .map(mapLocalCategoryToSubscriptionCategory);

    const mappedSubscriptions = (localSubscriptions || []).map(mapLocalSubscriptionToService);

    const customers = (localCustomers || []).map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      created_at: customer.created_at,
      updated_at: customer.updated_at ?? customer.created_at,
      organization_id: customer.organization_id
    }));

    const recentOrders = recentOrdersResult.orders.map(order => ({
      id: order.id,
      organization_id: order.organization_id,
      customer_id: order.customer_id ?? null,
      customer_name: order.customer_name ?? 'عميل نقاط البيع',
      total: order.total ?? 0,
      subtotal: order.subtotal ?? 0,
      amount_paid: order.amount_paid ?? 0,
      payment_status: order.payment_status ?? 'pending',
      status: order.status ?? 'pending_sync',
      created_at: order.created_at,
      updated_at: order.updated_at ?? order.created_at,
      remaining_amount: order.remaining_amount ?? 0
    }));

    const organizationApps = [
      {
        id: 'offline-pos',
        organization_id: orgId,
        app_id: 'pos-system',
        is_enabled: true,
        installed_at: new Date().toISOString(),
        configuration: {}
      },
      {
        id: 'offline-subscription',
        organization_id: orgId,
        app_id: 'subscription-services',
        is_enabled: true,
        installed_at: new Date().toISOString(),
        configuration: {}
      }
    ];

    // إذا لم تكن هناك منتجات، حاول تحميل من الكاش
    if (!mappedProducts.length && shouldCacheQuery(page, search, categoryId)) {
      const cachedResponse = await loadCachedCompletePOSData(orgId, page, limit, search, categoryId);
      if (cachedResponse) {
        await hydrateLocalDBFromResponse(orgId, cachedResponse);
        return cachedResponse;
      }
    }

    return {
      success: true,
      data: {
        products: mappedProducts,
        pagination: {
          current_page: page,
          total_pages: productsResult.totalPages,
          total_count: productsResult.totalCount,
          per_page: limit,
          has_next_page: page < productsResult.totalPages,
          has_prev_page: page > 1
        },
        product_categories: productCategories,
        subscriptions: mappedSubscriptions,
        subscription_categories: subscriptionCategories,
        pos_settings: localSettings ?? null,
        organization_apps: organizationApps,
        users: [],
        customers,
        recent_orders: recentOrders,
        inventory_stats: {
          totalProducts: productStats.totalProducts,
          outOfStockProducts: productStats.outOfStock,
          totalStock: productStats.totalStock
        },
        order_stats: {
          totalPosOrders: orderStats.totalOrders,
          todayOrders: orderStats.todayOrders,
          totalSales: orderStats.totalSales,
          todaySales: orderStats.todaySales
        }
      },
      meta: {
        execution_time_ms: duration,
        data_timestamp: new Date().toISOString(),
        organization_id: orgId
      }
    };
  } catch (error) {
    console.error('[UnifiedPOSData][LocalDB] فشل تحميل البيانات الأولية', { orgId, error });
    return null;
  }
};

// Hook موحد لبيانات POS
export const useUnifiedPOSData = (options: POSDataOptions = {}) => {
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();

  const {
    page = 1,
    limit = 50,
    search,
    categoryId,
    enabled = true,
    staleTime = 15 * 60 * 1000,
    gcTime = 30 * 60 * 1000
  } = options;

  const isSearchValid = search === undefined || search.length === 0 || search.length >= 2;
  const queryKey = useMemo(
    () => ['unified-pos-data', currentOrganization?.id, page, limit, search, categoryId] as const,
    [currentOrganization?.id, page, limit, search, categoryId]
  );

  const {
    data: response,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<CompletePOSResponse> => {
      console.log('[UnifiedPOSData] ===== بدء queryFn =====', {
        orgId: currentOrganization?.id,
        page,
        limit,
        search,
        categoryId
      });

      if (!currentOrganization?.id) {
        throw new Error('معرف المؤسسة مطلوب');
      }

      // ⚡ توحيد مسار القراءة: القراءة دائمًا من SQLite فقط
      // المزامنة تحدث في الخلفية عبر posDataSyncService
      console.log('[UnifiedPOSData] ⚡ قراءة البيانات من SQLite فقط (Offline-First)');

      const localData = await loadInitialDataFromLocalDB(
        currentOrganization.id,
        page,
        limit,
        search,
        categoryId
      );

      if (localData) {
        console.info('[UnifiedPOSData] ✅ تم تحميل البيانات من SQLite بنجاح');
        return localData;
      }

      // ⚡ إذا لم توجد بيانات محلية، حاول المزامنة الأولية من السيرفر
      console.warn('[UnifiedPOSData] ⚠️ لا توجد بيانات محلية - محاولة المزامنة الأولية...');

      try {
        const { syncPOSDataFromServer } = await import('@/services/posDataSyncService');
        const syncResult = await syncPOSDataFromServer({
          organizationId: currentOrganization.id,
          page,
          limit,
          search,
          categoryId
        });

        if (syncResult.success) {
          console.log('[UnifiedPOSData] ✅ تمت المزامنة الأولية - إعادة تحميل البيانات المحلية');
          // إعادة تحميل البيانات بعد المزامنة
          const freshLocalData = await loadInitialDataFromLocalDB(
            currentOrganization.id,
            page,
            limit,
            search,
            categoryId
          );
          if (freshLocalData) {
            return freshLocalData;
          }
        } else {
          console.warn('[UnifiedPOSData] ⚠️ فشلت المزامنة الأولية:', syncResult.error);
        }
      } catch (syncError) {
        console.error('[UnifiedPOSData] ❌ خطأ في المزامنة الأولية:', syncError);
      }

      // إذا فشل كل شيء، إرجاع بيانات فارغة
      console.warn('[UnifiedPOSData] ⚠️ إرجاع بيانات فارغة');
      return {
        success: true,
        data: {
          products: [],
          subscriptions: [],
          subscription_categories: [],
          product_categories: [],
          pos_settings: null,
          organization_apps: [],
          users: [],
          customers: [],
          recent_orders: [],
          inventory_stats: { totalProducts: 0, outOfStockProducts: 0, totalStock: 0 },
          order_stats: { totalPosOrders: 0, todayOrders: 0, totalSales: 0, todaySales: 0 },
          pagination: {
            current_page: page,
            total_pages: 1,
            total_count: 0,
            per_page: limit,
            has_next_page: false,
            has_prev_page: false
          }
        },
        meta: {
          execution_time_ms: 0,
          data_timestamp: new Date().toISOString(),
          organization_id: currentOrganization.id
        }
      };
    },
    enabled: enabled && !!currentOrganization?.id && isSearchValid,
    staleTime,
    gcTime,
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
    networkMode: 'offlineFirst',
    meta: { persist: false }
  });

  const initializedQueriesRef = useRef<Set<string>>(new Set());
  const queryKeyString = JSON.stringify(queryKey);

  // ⚡ الاستماع لحدث تحديث الصور وإعادة تحميل البيانات
  useEffect(() => {
    const handleImagesUpdated = () => {
      console.log('[useUnifiedPOSData] 📡 Received products-images-updated event, refreshing...');
      refetch();
    };

    const handleProductOperationCompleted = () => {
      console.log('[useUnifiedPOSData] 📡 Received product-operation-completed event, refreshing...');
      refetch();
    };

    window.addEventListener('products-images-updated', handleImagesUpdated);
    window.addEventListener('product-operation-completed', handleProductOperationCompleted);

    return () => {
      window.removeEventListener('products-images-updated', handleImagesUpdated);
      window.removeEventListener('product-operation-completed', handleProductOperationCompleted);
    };
  }, [refetch]);

  useEffect(() => {
    if (initializedQueriesRef.current.has(queryKeyString)) return;
    if (!enabled || !currentOrganization?.id || !isSearchValid) return;

    let isCancelled = false;

    const ensureLocalInitialData = async () => {
      if (initializedQueriesRef.current.has(queryKeyString)) return;

      const existingData = queryClient.getQueryData(queryKey) as CompletePOSResponse | undefined;
      if (existingData?.success && existingData.data?.products?.length) {
        initializedQueriesRef.current.add(queryKeyString);
        return;
      }

      const localData = await loadInitialDataFromLocalDB(
        currentOrganization.id,
        page,
        limit,
        search,
        categoryId
      );

      if (isCancelled || !localData) return;

      const latestData = queryClient.getQueryData(queryKey) as CompletePOSResponse | undefined;
      if (!latestData || !latestData.success || !latestData.data?.products?.length) {
        queryClient.setQueryData(queryKey, localData);
        initializedQueriesRef.current.add(queryKeyString);
      } else {
        initializedQueriesRef.current.add(queryKeyString);
      }
    };

    ensureLocalInitialData().catch(localError => {
      console.error('تعذر تعيين البيانات الأولية من قاعدة البيانات المحلية:', localError);
    });

    return () => { isCancelled = true; };
  }, [enabled, currentOrganization?.id, isSearchValid, queryKeyString]);

  const typedResponse = response as CompletePOSResponse | undefined;
  const posData = typedResponse?.success ? typedResponse.data : null;
  const executionStats = typedResponse?.meta;
  const hasError = !typedResponse?.success || !!error;
  const errorMessage = typedResponse?.error || error?.message;

  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['unified-pos-data'] });
  };

  const refreshData = async (): Promise<void> => {
    await refetch();
  };

  const applyUpdateToPOSQueries = (
    updater: (data: CompletePOSResponse | undefined) => CompletePOSResponse | undefined
  ) => {
    if (!currentOrganization?.id) return;

    const relatedQueries = queryClient.getQueriesData<CompletePOSResponse>({
      queryKey: ['unified-pos-data', currentOrganization.id],
      exact: false
    });

    for (const [key, data] of relatedQueries) {
      const nextValue = updater(data);
      if (nextValue !== data) {
        queryClient.setQueryData(key, nextValue);
      }
    }
  };

  const updateProductInCache = (productId: string, updatedProduct: any) => {
    applyUpdateToPOSQueries((oldData) => {
      if (!oldData?.success || !oldData.data) return oldData;

      const updatedProducts = oldData.data.products.map((product) => {
        if (product.id !== productId) return product;

        const nextStockQuantity =
          updatedProduct.stockQuantity ?? updatedProduct.stock_quantity ??
          product.stockQuantity ?? product.stock_quantity ?? 0;
        const nextActualStock =
          updatedProduct.actual_stock_quantity ?? updatedProduct.stock_quantity ??
          product.actual_stock_quantity ?? product.stock_quantity ?? nextStockQuantity;

        return {
          ...product,
          ...updatedProduct,
          stock_quantity: nextStockQuantity,
          stockQuantity: nextStockQuantity,
          actual_stock_quantity: nextActualStock,
          total_variants_stock: updatedProduct.total_variants_stock ?? nextStockQuantity
        };
      });

      return { ...oldData, data: { ...oldData.data, products: updatedProducts } };
    });
  };

  // ⚡ تحديث المخزون في الكاش - مع دعم جميع أنواع البيع
  const updateProductStockInCache = (
    productId: string,
    colorId: string | null,
    sizeId: string | null,
    quantityChange: number,
    // ⚡ معامل جديد لتحديد نوع البيع
    sellingUnit?: 'piece' | 'weight' | 'meter' | 'box'
  ) => {
    applyUpdateToPOSQueries((oldData) => {
      if (!oldData?.success || !oldData.data) return oldData;

      const updatedProducts = oldData.data.products.map((product) => {
        if (product.id !== productId) return product;

        const baseStock = product.actual_stock_quantity ?? product.stockQuantity ?? product.stock_quantity ?? 0;
        const clamp = (value: number) => Math.max(0, value);

        // ⚡ تحديد نوع البيع من المعامل أو من المنتج
        const effectiveUnit = sellingUnit ||
          (product as any).selling_unit_type ||
          (product as any).sellingUnit ||
          ((product as any).sell_by_meter ? 'meter' :
           (product as any).sell_by_weight ? 'weight' :
           (product as any).sell_by_box ? 'box' : 'piece');

        const recalculateTotalFromColors = (colors: any[] | undefined) => {
          if (!Array.isArray(colors)) return 0;
          return colors.reduce((sum, color) => sum + clamp(Number(color?.quantity ?? 0)), 0);
        };

        const applyTotalStock = (nextProduct: any, total: number) => ({
          ...nextProduct,
          stock_quantity: total,
          stockQuantity: total,
          actual_stock_quantity: total,
          total_variants_stock: total
        });

        if (colorId && sizeId) {
          const productColors = ensureArray(product.colors) as any[];
          const updatedColors = productColors.map((color: any) => {
            if (color.id !== colorId) return color;

            const colorSizes = ensureArray(color.sizes) as any[];
            const updatedSizes = colorSizes.map((size: any) => {
              if (size.id !== sizeId) return size;
              return { ...size, quantity: clamp(Number(size?.quantity ?? 0) + quantityChange) };
            });

            const totalColorQuantity = updatedSizes?.reduce(
              (sum: number, size: any) => sum + clamp(Number(size?.quantity ?? 0)), 0
            ) || 0;

            return { ...color, sizes: updatedSizes, quantity: totalColorQuantity };
          });

          const totalStock = recalculateTotalFromColors(updatedColors);
          return applyTotalStock({ ...product, colors: updatedColors }, totalStock);
        }

        if (colorId) {
          const productColors = ensureArray(product.colors) as any[];
          const updatedColors = productColors.map((color: any) => {
            if (color.id !== colorId) return color;
            return { ...color, quantity: clamp(Number(color?.quantity ?? 0) + quantityChange) };
          });

          const totalStock = recalculateTotalFromColors(updatedColors);
          return applyTotalStock({ ...product, colors: updatedColors }, totalStock);
        }

        // ⚡ تحديث المخزون حسب نوع البيع
        switch (effectiveUnit) {
          case 'meter':
            const newLength = clamp((product as any).available_length || 0) + quantityChange;
            return {
              ...product,
              available_length: clamp(newLength),
              stock_quantity: clamp(baseStock + quantityChange),
              stockQuantity: clamp(baseStock + quantityChange),
              actual_stock_quantity: clamp(baseStock + quantityChange)
            };

          case 'weight':
            const newWeight = clamp((product as any).available_weight || 0) + quantityChange;
            return {
              ...product,
              available_weight: clamp(newWeight),
              stock_quantity: clamp(baseStock + quantityChange),
              stockQuantity: clamp(baseStock + quantityChange),
              actual_stock_quantity: clamp(baseStock + quantityChange)
            };

          case 'box':
            const newBoxes = clamp((product as any).available_boxes || 0) + quantityChange;
            return {
              ...product,
              available_boxes: clamp(newBoxes),
              stock_quantity: clamp(baseStock + quantityChange),
              stockQuantity: clamp(baseStock + quantityChange),
              actual_stock_quantity: clamp(baseStock + quantityChange)
            };

          default: // piece
            const totalStock = clamp(baseStock + quantityChange);
            return applyTotalStock(product, totalStock);
        }
      });

      return { ...oldData, data: { ...oldData.data, products: updatedProducts } };
    });
  };

  const getProductStock = (productId: string, colorId?: string, sizeId?: string): number => {
    if (!posData?.products) return 0;

    const product = posData.products.find(p => p.id === productId);
    if (!product) return 0;

    const productColors = ensureArray(product.colors) as any[];

    if (colorId && sizeId) {
      const color = productColors.find((c: any) => c.id === colorId);
      const colorSizes = ensureArray(color?.sizes) as any[];
      const size = colorSizes.find((s: any) => s.id === sizeId);
      return size?.quantity || 0;
    } else if (colorId) {
      const color = productColors.find((c: any) => c.id === colorId);
      return color?.quantity || 0;
    } else {
      return product.actual_stock_quantity || product.stock_quantity || 0;
    }
  };

  return {
    posData,
    isLoading,
    isRefetching,
    error: hasError,
    errorMessage,
    executionStats,

    products: posData?.products || [],
    pagination: (posData as any)?.pagination || undefined,
    subscriptions: posData?.subscriptions || [],
    subscriptionCategories: posData?.subscription_categories || [],
    productCategories: posData?.product_categories || [],
    posSettings: posData?.pos_settings,
    organizationApps: posData?.organization_apps || [],
    users: posData?.users || [],
    customers: posData?.customers || [],
    recentOrders: posData?.recent_orders || [],
    inventoryStats: posData?.inventory_stats,
    orderStats: posData?.order_stats,

    invalidateCache,
    refreshData,
    updateProductInCache,
    updateProductStockInCache,
    getProductStock,

    executionTime: executionStats?.execution_time_ms,
    dataTimestamp: executionStats?.data_timestamp,
  };
};

export default useUnifiedPOSData;
