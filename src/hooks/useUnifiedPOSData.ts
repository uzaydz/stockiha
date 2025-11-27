/**
 * useUnifiedPOSData - Hook موحد لبيانات POS
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 *
 * - يمنع التكرار ويحسن الأداء
 * - يستخدم deltaWriteService بدلاً من inventoryDB
 */

import { useEffect, useMemo, useRef } from 'react';
import { sqliteDB, isSQLiteAvailable } from '@/lib/db/sqliteAPI';
import { dbInitManager } from '@/lib/db/DatabaseInitializationManager';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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
import { isAppOnline, markNetworkOnline, markNetworkOffline } from '@/utils/networkStatus';
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
  } catch {}
  return fallback;
};

// ⚡ دالة لحفظ البيانات في قاعدة البيانات المحلية باستخدام Delta Sync
const hydrateLocalDBFromResponse = async (
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

    // ⚡ حفظ المنتجات باستخدام Delta Sync
    if (Array.isArray(products)) {
      for (const product of products) {
        if (!product?.id) continue;

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

        const localProduct: LocalProduct = {
          ...(product as any),
          id: product.id,
          organization_id: (product as any).organization_id ?? orgId,
          created_at: createdAt,
          updated_at: updatedAt,
          localUpdatedAt: now,
          synced: true,
          syncStatus: undefined,
          pendingOperation: undefined,
          lastSyncAttempt: now,
          stock_quantity: Number.isFinite(Number(stock)) ? Number(stock) : 0,
          stockQuantity: Number.isFinite(Number(stock)) ? Number(stock) : 0,
          actual_stock_quantity:
            (product as any).actual_stock_quantity ??
            (product as any).stock_quantity ??
            (product as any).stockQuantity ??
            stock
        };

        await deltaWriteService.saveFromServer('products', localProduct);
      }
      console.log(`[hydrateLocalDB] ⚡ تم حفظ ${products.length} منتج`);
    }

    // ⚡ حفظ العملاء باستخدام Delta Sync
    if (Array.isArray(customers)) {
      for (const customer of customers) {
        if (!customer?.id) continue;

        const createdAt = parseDateToISOString((customer as any).created_at, now);
        const updatedAt = parseDateToISOString(
          (customer as any).updated_at ?? createdAt,
          createdAt
        );

        const localCustomer: LocalCustomer = {
          id: customer.id,
          name: customer.name ?? 'عميل',
          email: customer.email ?? '',
          phone: customer.phone ?? '',
          organization_id: (customer as any).organization_id ?? orgId,
          created_at: createdAt,
          updated_at: updatedAt,
          synced: true,
          syncStatus: 'synced',
          localUpdatedAt: now,
          pendingOperation: undefined,
          lastSyncAttempt: now
        };

        await deltaWriteService.saveFromServer('customers', localCustomer);
      }
      console.log(`[hydrateLocalDB] ⚡ تم حفظ ${customers.length} عميل`);
    }

    // ⚡ حفظ الطلبات باستخدام Delta Sync
    if (Array.isArray(recent_orders)) {
      for (const order of recent_orders) {
        if (!order?.id) continue;

        const createdAt = parseDateToISOString((order as any).created_at, now);
        const updatedAt = parseDateToISOString(
          (order as any).updated_at ?? createdAt,
          createdAt
        );

        const localOrder: LocalPOSOrder = {
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
          consider_remaining_as_partial: Boolean((order as any).consider_remaining_as_partial ?? false),
          status: 'synced',
          synced: true,
          syncStatus: 'synced',
          pendingOperation: undefined,
          created_at: createdAt,
          updated_at: updatedAt,
          lastSyncAttempt: now,
          error: undefined,
          order_number: (order as any).order_number ||
            (order as any).orderNumber ||
            String((order as any).customer_order_number ?? order.id),
          localCreatedAt: createdAt,
          local_order_number: Number((order as any).customer_order_number ?? 0) || 0,
          remote_order_id: (order as any).remote_order_id ?? order.id,
          remote_customer_order_number: (order as any).customer_order_number ?? null,
          payload: undefined,
          metadata: (order as any).metadata ?? null,
          message: undefined,
          pending_updates: null,
          extra_fields: (order as any).extra_fields ?? {
            remote_status: (order as any).status ?? 'unknown'
          }
        };

        await deltaWriteService.saveFromServer('pos_orders', localOrder);
      }
      console.log(`[hydrateLocalDB] ⚡ تم حفظ ${recent_orders.length} طلب`);
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
    if (isSQLiteAvailable()) {
      try { await dbInitManager.initialize(orgId); } catch { }
      const res = await sqliteDB.getPOSOfflineCacheById(cacheKey);
      const cached = res.success ? (res.data as CachedPOSResponse | null) : null;
      if (cached?.data) {
        console.warn('[UnifiedPOSData][Cache] استخدام البيانات المخزنة (SQLite)', {
          orgId,
          cacheKey,
          productCount: cached.data.data?.products?.length ?? 0,
          cachedAt: cached.timestamp
        });
        return cached.data;
      }
    }
  } catch (error) {
    console.error('[UnifiedPOSData][Cache] فشل تحميل البيانات من SQLite', error);
  }
  return null;
};

// ⚡ دالة لتحميل البيانات الأولية من قاعدة البيانات المحلية باستخدام Delta Sync
const loadInitialDataFromLocalDB = async (
  orgId: string,
  page: number,
  limit: number,
  search?: string,
  categoryId?: string
) => {
  const logPrefix = '[UnifiedPOSData][LocalDB]';
  console.info(`${logPrefix} ===== بدء loadInitialDataFromLocalDB (Delta Sync) =====`, {
    orgId,
    page,
    limit,
    search: search ?? null,
    categoryId: categoryId ?? null
  });

  try {
    // ⚡ استخدام Delta Sync بدلاً من inventoryDB
    const [
      localProducts,
      localCategories,
      localSettings,
      localSubscriptions,
      localCustomers,
      localOrders
    ] = await Promise.all([
      deltaWriteService.getAll<LocalProduct>('products', orgId),
      getLocalCategories(),
      localPosSettingsService.get(orgId),
      deltaWriteService.getAll<LocalOrganizationSubscription>('organization_subscriptions' as any, orgId).catch(() => []),
      deltaWriteService.getAll<LocalCustomer>('customers', orgId).catch(() => []),
      deltaWriteService.getAll<LocalPOSOrder>('pos_orders', orgId).catch(() => [])
    ]);

    // ⚡ جلب الألوان والمقاسات من جداولها المنفصلة
    const productIds = localProducts.map(p => p.id);
    let colorsMap: Map<string, any[]> = new Map();
    let sizesMap: Map<string, any[]> = new Map();

    if (productIds.length > 0) {
      try {
        const allColors = await deltaWriteService.query<any>(
          'product_colors',
          `SELECT * FROM product_colors WHERE product_id IN (${productIds.map(() => '?').join(',')})`,
          productIds
        );

        const allSizes = await deltaWriteService.query<any>(
          'product_sizes',
          `SELECT * FROM product_sizes WHERE product_id IN (${productIds.map(() => '?').join(',')})`,
          productIds
        );

        // تجميع الألوان حسب product_id
        for (const color of allColors || []) {
          if (!colorsMap.has(color.product_id)) {
            colorsMap.set(color.product_id, []);
          }
          colorsMap.get(color.product_id)!.push(color);
        }

        // تجميع المقاسات حسب color_id
        for (const size of allSizes || []) {
          if (!sizesMap.has(size.color_id)) {
            sizesMap.set(size.color_id, []);
          }
          sizesMap.get(size.color_id)!.push(size);
        }

        // ربط المقاسات بالألوان
        for (const [, colors] of colorsMap) {
          for (const color of colors) {
            color.sizes = sizesMap.get(color.id) || [];
            color.product_sizes = color.sizes;
          }
        }

        console.info(`${logPrefix} 🎨 تم تحميل الألوان والمقاسات:`, {
          colors: allColors?.length || 0,
          sizes: allSizes?.length || 0
        });
      } catch (variantError) {
        console.warn(`${logPrefix} ⚠️ Error loading variants:`, variantError);
      }
    }

    // إضافة الألوان للمنتجات
    const productsWithColors = localProducts.map(product => {
      const colors = colorsMap.get(product.id) || [];
      return {
        ...product,
        colors: colors.length > 0 ? colors : (product as any).colors || [],
        product_colors: colors.length > 0 ? colors : (product as any).product_colors || [],
        variants: colors.length > 0 ? colors : (product as any).variants || []
      };
    });

    console.info(`${logPrefix} ⚡ تم تحميل الكيانات من Delta Sync`, {
      products: productsWithColors.length,
      categories: localCategories.length,
      subscriptions: localSubscriptions.length,
      customers: localCustomers.length,
      orders: localOrders.length,
      hasSettings: Boolean(localSettings),
      colorsLoaded: Array.from(colorsMap.values()).flat().length,
      sizesLoaded: Array.from(sizesMap.values()).flat().length
    });

    const mappedProducts = productsWithColors.map(mapLocalProductToPOSProduct);
    const normalizedSearch = search?.trim().toLowerCase() || '';

    const filteredProducts = mappedProducts.filter((product) => {
      const matchesCategory =
        !categoryId || categoryId === '' || product.category_id === categoryId;

      if (!normalizedSearch) return matchesCategory;

      const name = (product.name || '').toLowerCase();
      const barcode = (product.barcode || '').toLowerCase();
      const productColors = ensureArray(product.colors) as any[];
      const matchesVariant = productColors.some((color: any) => {
        const colorName = (color?.name || '').toLowerCase();
        const colorBarcode = (color?.barcode || '').toLowerCase();
        const colorSizes = ensureArray(color?.sizes) as any[];
        const sizeMatch = colorSizes.some((size: any) => {
          const sizeName = (size?.size_name || '').toLowerCase();
          const sizeBarcode = (size?.barcode || '').toLowerCase();
          return sizeName.includes(normalizedSearch) || sizeBarcode.includes(normalizedSearch);
        });
        return colorName.includes(normalizedSearch) || colorBarcode.includes(normalizedSearch) || Boolean(sizeMatch);
      });

      return matchesCategory && (name.includes(normalizedSearch) || barcode.includes(normalizedSearch) || matchesVariant);
    });

    const safeLimit = limit > 0 ? limit : filteredProducts.length || 1;
    const startIndex = (page - 1) * safeLimit;
    const endIndex = startIndex + safeLimit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

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

    const sortedOrders = [...(localOrders || [])].sort(
      (a, b) => new Date(b.created_at ?? b.updated_at ?? 0).getTime() - new Date(a.created_at ?? a.updated_at ?? 0).getTime()
    );

    const recentOrders = sortedOrders.slice(0, 10).map(order => ({
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

    const totalProductsCount = mappedProducts.length;
    const outOfStockProducts = mappedProducts.filter(
      product => (product.actual_stock_quantity ?? product.stock_quantity ?? 0) <= 0
    ).length;
    const totalStock = mappedProducts.reduce(
      (sum, product) => sum + (product.actual_stock_quantity ?? product.stock_quantity ?? 0),
      0
    );

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const totalPosOrders = sortedOrders.length;
    const todayOrders = sortedOrders.filter(order => {
      const createdAt = new Date(order.created_at ?? order.updated_at ?? 0).getTime();
      return createdAt >= startOfDay;
    });

    const totalSales = sortedOrders.reduce((sum, order) => sum + (order.total ?? 0), 0);
    const todaySales = todayOrders.reduce((sum, order) => sum + (order.total ?? 0), 0);

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
        products: paginatedProducts,
        pagination: {
          current_page: page,
          total_pages: safeLimit > 0 ? Math.max(1, Math.ceil(filteredProducts.length / safeLimit)) : 1,
          total_count: filteredProducts.length,
          per_page: safeLimit,
          has_next_page: endIndex < filteredProducts.length,
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
          totalProducts: totalProductsCount,
          outOfStockProducts,
          totalStock
        },
        order_stats: {
          totalPosOrders,
          todayOrders: todayOrders.length,
          totalSales,
          todaySales
        }
      },
      meta: {
        execution_time_ms: 0,
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

      const navigatorOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const isOffline = !navigatorOnline || !isAppOnline();

      if (isOffline) {
        console.warn('[UnifiedPOSData] وضع عدم الاتصال - استخدام البيانات المحلية');

        const offlineData = await loadInitialDataFromLocalDB(
          currentOrganization.id,
          page,
          limit,
          search,
          categoryId
        );

        if (offlineData) {
          console.info('[UnifiedPOSData] ⚡ تم تحميل البيانات من Delta Sync بنجاح');
          return offlineData;
        }

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
      }

      try {
        const { data, error } = await supabase.rpc('get_complete_pos_data_optimized' as any, {
          p_organization_id: currentOrganization.id,
          p_products_page: page,
          p_products_limit: limit,
          p_search: search || null,
          p_category_id: categoryId || null
        });

        if (error) throw new Error(`خطأ في جلب بيانات POS: ${error.message}`);
        if (!data) throw new Error('لم يتم إرجاع أي بيانات من الخادم');

        const responseData = Array.isArray(data) ? data[0] : data;

        if (responseData && typeof responseData === 'object' && 'success' in responseData) {
          if (!responseData.success) {
            throw new Error(responseData.error || 'فشل في جلب البيانات');
          }
          const finalResponse = responseData as CompletePOSResponse;
          markNetworkOnline();
          await hydrateLocalDBFromResponse(currentOrganization.id, finalResponse);
          return finalResponse;
        }

        const finalResponse: CompletePOSResponse = {
          success: true,
          data: responseData as CompletePOSData,
          meta: {
            execution_time_ms: 0,
            data_timestamp: new Date().toISOString(),
            organization_id: currentOrganization.id
          }
        };
        markNetworkOnline();
        await hydrateLocalDBFromResponse(currentOrganization.id, finalResponse);
        return finalResponse;
      } catch (fetchError) {
        console.error('[UnifiedPOSData] فشل جلب البيانات - استخدام البيانات المحلية', fetchError);
        markNetworkOffline({ force: true });

        const offlineData = await loadInitialDataFromLocalDB(
          currentOrganization.id,
          page,
          limit,
          search,
          categoryId
        );

        if (offlineData) {
          console.info('[UnifiedPOSData] ⚡ تم استخدام البيانات المحلية بعد فشل الجلب');
          return offlineData;
        }

        throw fetchError;
      }
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

  const updateProductStockInCache = (
    productId: string,
    colorId: string | null,
    sizeId: string | null,
    quantityChange: number
  ) => {
    applyUpdateToPOSQueries((oldData) => {
      if (!oldData?.success || !oldData.data) return oldData;

      const updatedProducts = oldData.data.products.map((product) => {
        if (product.id !== productId) return product;

        const baseStock = product.actual_stock_quantity ?? product.stockQuantity ?? product.stock_quantity ?? 0;
        const clamp = (value: number) => Math.max(0, value);

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

        const totalStock = clamp(baseStock + quantityChange);
        return applyTotalStock(product, totalStock);
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
