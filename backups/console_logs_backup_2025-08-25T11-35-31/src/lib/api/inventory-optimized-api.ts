// API محسن للمخزون مع cache وتقليل الاستدعاءات
// Optimized Inventory API with Caching

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  inventoryCache, 
  userCache, 
  cacheKeys, 
  cacheWithFallback 
} from '@/lib/cache/advanced-cache-system';
import { useCurrentOrganizationId } from '@/hooks/useOptimizedAuth';

// Types
interface InventoryProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  compare_at_price?: number;
  sku: string;
  barcode?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  images?: string[];
  thumbnail_image?: string;
  stock_quantity: number;
  min_stock_level: number;
  reorder_level: number;
  reorder_quantity: number;
  is_digital: boolean;
  is_new?: boolean;
  is_featured?: boolean;
  created_at: string;
  updated_at: string;
  has_variants: boolean;
  use_sizes: boolean;
  stock_status: string;
  stock_value: number;
  reorder_needed: boolean;
  days_since_last_update: number;
  variant_count: number;
  total_variant_stock: number;
  total_count: number;
  filtered_count: number;
}

interface InventoryFilters {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  categoryId?: string;
  stockFilter?: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'reorder-needed';
  sortBy?: 'name' | 'stock' | 'price' | 'created' | 'updated';
  sortOrder?: 'ASC' | 'DESC';
  includeVariants?: boolean;
  includeInactive?: boolean;
}

interface InventoryStats {
  total_products: number;
  active_products: number;
  inactive_products: number;
  in_stock_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  reorder_needed_products: number;
  total_stock_quantity: number;
  total_stock_value: number;
  average_stock_per_product: number;
  digital_products: number;
  physical_products: number;
  products_with_variants: number;
  products_without_variants: number;
  categories_count: number;
  brands_count: number;
  last_week_additions: number;
  last_month_additions: number;
  top_stock_value_category: string;
  lowest_stock_category: string;
}

// Singleton API Manager لتجنب الاستدعاءات المتعددة
class OptimizedInventoryAPI {
  private static instance: OptimizedInventoryAPI;
  private pendingRequests = new Map<string, Promise<any>>();
  private lastRequestTime = new Map<string, number>();
  private readonly REQUEST_THROTTLE = 1000; // 1 second throttle

  static getInstance(): OptimizedInventoryAPI {
    if (!OptimizedInventoryAPI.instance) {
      OptimizedInventoryAPI.instance = new OptimizedInventoryAPI();
    }
    return OptimizedInventoryAPI.instance;
  }

  // جلب معرف المؤسسة مع cache
  private async getCurrentOrganizationId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const cacheKey = cacheKeys.userOrganization(user.id);
    
    return cacheWithFallback(
      userCache,
      cacheKey,
      async () => {
        // محاولة أولى: البحث بـ auth_user_id
        let { data, error } = await supabase
          .from('users')
          .select('organization_id')
          .eq('auth_user_id', user.id)
          .single();

        // إذا فشل، جرب البحث بـ id
        if (error || !data?.organization_id) {
          const { data: idData, error: idError } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();
            
          if (!idError && idData?.organization_id) {
            data = idData;
            error = null;
          }
        }

        if (error || !data?.organization_id) {
          throw new Error('Organization not found');
        }

        return data.organization_id;
      },
      10 * 60 * 1000 // 10 minutes cache
    );
  }

  // منع الاستدعاءات المتكررة خلال فترة قصيرة
  private shouldThrottleRequest(key: string): boolean {
    const lastTime = this.lastRequestTime.get(key);
    const now = Date.now();
    
    if (lastTime && now - lastTime < this.REQUEST_THROTTLE) {
      return true;
    }
    
    this.lastRequestTime.set(key, now);
    return false;
  }

  // جلب منتجات المخزون مع pagination وcache
  async getInventoryProducts(filters: InventoryFilters = {}): Promise<InventoryProduct[]> {
    const {
      page = 1,
      pageSize = 50,
      searchQuery = '',
      categoryId,
      stockFilter = 'all',
      sortBy = 'name',
      sortOrder = 'ASC',
      includeVariants = true,
      includeInactive = false
    } = filters;

    const orgId = await this.getCurrentOrganizationId();
    
    // إنشاء مفتاح cache مع جميع المعاملات
    const filterKey = JSON.stringify({
      page, pageSize, searchQuery, categoryId, stockFilter, 
      sortBy, sortOrder, includeVariants, includeInactive
    });
    const cacheKey = cacheKeys.inventoryProducts(orgId, filterKey);

    // التحقق من throttling
    if (this.shouldThrottleRequest(`products:${cacheKey}`)) {
      const cached = inventoryCache.get<InventoryProduct[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // منع الاستدعاءات المتعددة لنفس الطلب
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = cacheWithFallback(
      inventoryCache,
      cacheKey,
      async () => {
        const { data, error } = await (supabase as any).rpc('get_inventory_products_paginated', {
          p_organization_id: orgId,
          p_page: page,
          p_page_size: pageSize,
          p_search_query: searchQuery || null,
          p_category_id: categoryId || null,
          p_stock_filter: stockFilter,
          p_sort_by: sortBy,
          p_sort_order: sortOrder,
          p_include_variants: includeVariants,
          p_include_inactive: includeInactive
        });

        if (error) {
          throw new Error(`خطأ في جلب منتجات المخزون: ${error.message}`);
        }

        return data || [];
      },
      2 * 60 * 1000 // 2 minutes cache
    );

    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // جلب إحصائيات المخزون مع cache
  async getInventoryStats(): Promise<InventoryStats> {
    const orgId = await this.getCurrentOrganizationId();
    const cacheKey = cacheKeys.inventoryStats(orgId);

    // التحقق من throttling
    if (this.shouldThrottleRequest(`stats:${cacheKey}`)) {
      const cached = inventoryCache.get<InventoryStats>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return cacheWithFallback(
      inventoryCache,
      cacheKey,
      async () => {
        const { data, error } = await (supabase as any).rpc('get_inventory_advanced_stats', {
          p_organization_id: orgId
        });

        if (error) {
          throw new Error(`خطأ في جلب إحصائيات المخزون: ${error.message}`);
        }

        return data?.[0] || {
          total_products: 0,
          active_products: 0,
          inactive_products: 0,
          in_stock_products: 0,
          low_stock_products: 0,
          out_of_stock_products: 0,
          reorder_needed_products: 0,
          total_stock_quantity: 0,
          total_stock_value: 0,
          average_stock_per_product: 0,
          digital_products: 0,
          physical_products: 0,
          products_with_variants: 0,
          products_without_variants: 0,
          categories_count: 0,
          brands_count: 0,
          last_week_additions: 0,
          last_month_additions: 0,
          top_stock_value_category: '',
          lowest_stock_category: ''
        };
      },
      5 * 60 * 1000 // 5 minutes cache للإحصائيات
    );
  }

  // جلب تفاصيل منتج مع cache
  async getProductDetails(productId: string): Promise<any> {
    const orgId = await this.getCurrentOrganizationId();
    const cacheKey = cacheKeys.productDetails(orgId, productId);

    return cacheWithFallback(
      inventoryCache,
      cacheKey,
      async () => {
        const { data, error } = await (supabase as any).rpc('get_product_inventory_details', {
          p_organization_id: orgId,
          p_product_id: productId
        });

        if (error) {
          throw new Error(`خطأ في جلب تفاصيل المنتج: ${error.message}`);
        }

        return data?.[0] || null;
      },
      3 * 60 * 1000 // 3 minutes cache
    );
  }

  // بحث سريع مع cache
  async searchProducts(query: string, limit: number = 20): Promise<any[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const orgId = await this.getCurrentOrganizationId();
    const cacheKey = `search:${orgId}:${query}:${limit}`;

    return cacheWithFallback(
      inventoryCache,
      cacheKey,
      async () => {
        const { data, error } = await (supabase as any).rpc('search_inventory_autocomplete', {
          p_organization_id: orgId,
          p_search_query: query,
          p_limit: limit
        });

        if (error) {
          throw new Error(`خطأ في البحث: ${error.message}`);
        }

        return data || [];
      },
      1 * 60 * 1000 // 1 minute cache للبحث
    );
  }

  // تحديث مجمع للمخزون
  async bulkUpdateInventory(updates: any[], updatedBy?: string): Promise<any> {
    const orgId = await this.getCurrentOrganizationId();

    const { data, error } = await (supabase as any).rpc('bulk_update_inventory', {
      p_organization_id: orgId,
      p_updates: JSON.stringify(updates),
      p_updated_by: updatedBy || null
    });

    if (error) {
      throw new Error(`خطأ في التحديث المجمع: ${error.message}`);
    }

    // مسح cache المتعلق بالمخزون بعد التحديث
    this.clearInventoryCache(orgId);

    return data?.[0] || {};
  }

  // مسح cache المخزون
  clearInventoryCache(orgId?: string): void {
    if (orgId) {
      inventoryCache.deleteByPrefix(`inventory:products:${orgId}`);
      inventoryCache.deleteByPrefix(`inventory:stats:${orgId}`);
      inventoryCache.deleteByPrefix(`product:details:${orgId}`);
      inventoryCache.deleteByPrefix(`search:${orgId}`);
    } else {
      inventoryCache.clear();
    }
  }

  // مسح pending requests
  clearPendingRequests(): void {
    this.pendingRequests.clear();
    this.lastRequestTime.clear();
  }
}

// Export singleton instance
export const optimizedInventoryAPI = OptimizedInventoryAPI.getInstance();

// Helper hooks للاستخدام في المكونات
export function useOptimizedInventoryProducts(filters: InventoryFilters = {}) {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Cache محسن للمنتجات
  const productsCache = useMemo(() => new Map<string, { data: InventoryProduct[]; timestamp: number }>(), []);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

  const getCacheKey = useCallback((filters: InventoryFilters) => {
    return `products:${JSON.stringify(filters)}`;
  }, []);

  const getCachedProducts = useCallback((filters: InventoryFilters) => {
    const cacheKey = getCacheKey(filters);
    const cached = productsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    
    return null;
  }, [productsCache, getCacheKey]);

  const setCachedProducts = useCallback((filters: InventoryFilters, data: InventoryProduct[]) => {
    const cacheKey = getCacheKey(filters);
    productsCache.set(cacheKey, { data, timestamp: Date.now() });
  }, [productsCache, getCacheKey]);

  const fetchProducts = useCallback(async () => {
    // فحص cache أولاً
    const cached = getCachedProducts(filters);
    if (cached) {
      setProducts(cached);
      return;
    }

    // فحص throttling
    const now = Date.now();
    if (now - lastFetchTime < 2000) { // 2 ثانية
      console.log('🚫 [useOptimizedInventoryProducts] Throttled request');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastFetchTime(now);

    try {
      const data = await optimizedInventoryAPI.getInventoryProducts(filters);
      setProducts(data);
      setCachedProducts(filters, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في جلب المنتجات');
    } finally {
      setIsLoading(false);
    }
  }, [filters, getCachedProducts, setCachedProducts, lastFetchTime]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // تنظيف cache دوري
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of productsCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          productsCache.delete(key);
        }
      }
    }, 5 * 60 * 1000); // زيادة من دقيقتين إلى 5 دقائق

    return () => clearInterval(cleanupInterval);
  }, [productsCache]);

  return { products, isLoading, error, refetch: fetchProducts };
}

export function useOptimizedInventoryStats() {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Cache محسن للإحصائيات
  const statsCache = useMemo(() => new Map<string, { data: InventoryStats; timestamp: number }>(), []);
  const STATS_CACHE_DURATION = 15 * 60 * 1000; // زيادة من 10 دقائق إلى 15 دقيقة

  const getCachedStats = useCallback(() => {
    const cached = statsCache.get('global');
    
    if (cached && Date.now() - cached.timestamp < STATS_CACHE_DURATION) {
      return cached.data;
    }
    
    return null;
  }, [statsCache]);

  const setCachedStats = useCallback((data: InventoryStats) => {
    statsCache.set('global', { data, timestamp: Date.now() });
  }, [statsCache]);

  const fetchStats = useCallback(async () => {
    // فحص cache أولاً
    const cached = getCachedStats();
    if (cached) {
      setStats(cached);
      return;
    }

    // فحص throttling
    const now = Date.now();
    if (now - lastFetchTime < 10000) { // زيادة من 5 ثانية إلى 10 ثانية
      console.log('🚫 [useOptimizedInventoryStats] Throttled request');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastFetchTime(now);

    try {
      const data = await optimizedInventoryAPI.getInventoryStats();
      setStats(data);
      setCachedStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في جلب الإحصائيات');
    } finally {
      setIsLoading(false);
    }
  }, [getCachedStats, setCachedStats, lastFetchTime]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // تنظيف cache دوري
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of statsCache.entries()) {
        if (now - value.timestamp > STATS_CACHE_DURATION) {
          statsCache.delete(key);
        }
      }
    }, 10 * 60 * 1000); // زيادة من 5 دقائق إلى 10 دقائق

    return () => clearInterval(cleanupInterval);
  }, [statsCache]);

  return { stats, isLoading, error, refetch: fetchStats };
}

// Export individual functions for backward compatibility
export const getInventoryProductsPaginated = (filters: InventoryFilters) => 
  optimizedInventoryAPI.getInventoryProducts(filters);

export const getInventoryAdvancedStats = () => 
  optimizedInventoryAPI.getInventoryStats();

export const getProductInventoryDetails = (productId: string) => 
  optimizedInventoryAPI.getProductDetails(productId);

export const searchInventoryAutocomplete = (query: string, limit?: number) => 
  optimizedInventoryAPI.searchProducts(query, limit);

export const bulkUpdateInventory = (updates: any[], updatedBy?: string) => 
  optimizedInventoryAPI.bulkUpdateInventory(updates, updatedBy);

export default optimizedInventoryAPI;
