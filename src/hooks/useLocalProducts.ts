/**
 * ⚡ useLocalProducts - v2.0 (PowerSync Reactive)
 * ============================================================
 *
 * 🚀 Hook للمنتجات المحلية يستخدم:
 *   - useQuery من @powersync/react (reactive)
 *   - تحديث تلقائي عند أي تغيير
 *   - لا يستخدم getAll() أبداً
 *
 * ============================================================
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

// ========================================
// 📦 Types
// ========================================

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  price: number;
  cost_price: number | null;
  quantity: number;
  min_quantity: number | null;
  category_id: string | null;
  subcategory_id: string | null;
  is_active: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
  image_url: string | null;
}

export interface ProductWithDetails extends Product {
  category_name?: string;
  subcategory_name?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
}

export interface ProductSubcategory {
  id: string;
  name: string;
  category_id: string;
  organization_id: string;
}

export interface ProductFilters {
  search?: string;
  category_id?: string;
  subcategory_id?: string;
  is_active?: boolean;
}

export interface UseLocalProductsOptions {
  filters?: ProductFilters;
  page?: number;
  limit?: number;
  autoFetch?: boolean;
}

export interface UseLocalProductsResult {
  products: Product[];
  loading: boolean;
  error: Error | null;
  total: number;
  page: number;
  hasMore: boolean;

  // Actions
  refetch: () => Promise<void>;
  setPage: (page: number) => void;
  setFilters: (filters: ProductFilters) => void;
  search: (query: string) => Promise<Product[]>;

  // Single product
  getProduct: (id: string) => Promise<ProductWithDetails | null>;
  getByBarcode: (barcode: string) => Promise<ProductWithDetails | null>;

  // Categories
  categories: ProductCategory[];
  subcategories: ProductSubcategory[];
  loadCategories: () => Promise<void>;
  loadSubcategories: (categoryId?: string) => Promise<void>;

  // Stats
  stats: {
    total: number;
    active: number;
    lowStock: number;
    outOfStock: number;
  } | null;
  loadStats: () => Promise<void>;
}

// ========================================
// 🎯 Main Hook
// ========================================

export function useLocalProducts(options: UseLocalProductsOptions = {}): UseLocalProductsResult {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const {
    filters: initialFilters = {},
    page: initialPage = 1,
    limit = 50,
  } = options;

  const [page, setPage] = useState(initialPage);
  const [filters, setFiltersState] = useState<ProductFilters>(initialFilters);

  // ⚡ استعلام المنتجات (Reactive)
  const productsQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT * FROM products
      WHERE organization_id = ?
    `;
    const queryParams: any[] = [orgId];

    // فلتر النشط
    if (filters.is_active !== undefined) {
      query += ` AND is_active = ?`;
      queryParams.push(filters.is_active ? 1 : 0);
    } else {
      query += ` AND (is_active = 1 OR is_active IS NULL)`;
    }

    // فلتر التصنيف
    if (filters.category_id) {
      query += ` AND category_id = ?`;
      queryParams.push(filters.category_id);
    }

    // فلتر التصنيف الفرعي
    if (filters.subcategory_id) {
      query += ` AND subcategory_id = ?`;
      queryParams.push(filters.subcategory_id);
    }

    // فلتر البحث
    if (filters.search && filters.search.length >= 2) {
      query += ` AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)`;
      const searchPattern = `%${filters.search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Pagination - ⚡ ترتيب المنتجات الجديدة أولاً
    const offset = (page - 1) * limit;
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    return { sql: query, params: queryParams };
  }, [orgId, filters, page, limit]);

  const { data: productsData, isLoading, error: queryError } = useQuery<Product>(
    productsQuery.sql,
    productsQuery.params
  );

  // ⚡ استعلام العدد الإجمالي
  const countQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count', params: [] };
    }

    let query = `SELECT COUNT(*) as count FROM products WHERE organization_id = ?`;
    const queryParams: any[] = [orgId];

    if (filters.is_active !== undefined) {
      query += ` AND is_active = ?`;
      queryParams.push(filters.is_active ? 1 : 0);
    } else {
      query += ` AND (is_active = 1 OR is_active IS NULL)`;
    }

    if (filters.category_id) {
      query += ` AND category_id = ?`;
      queryParams.push(filters.category_id);
    }

    if (filters.search && filters.search.length >= 2) {
      query += ` AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)`;
      const searchPattern = `%${filters.search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    return { sql: query, params: queryParams };
  }, [orgId, filters]);

  const { data: countData } = useQuery<{ count: number }>(countQuery.sql, countQuery.params);

  // ⚡ استعلام التصنيفات
  const { data: categoriesData } = useQuery<ProductCategory>(
    orgId ? `SELECT * FROM product_categories WHERE organization_id = ? ORDER BY name` : 'SELECT 1 WHERE 0',
    orgId ? [orgId] : []
  );

  // ⚡ استعلام الإحصائيات
  const statsQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as total, 0 as active, 0 as low_stock, 0 as out_of_stock', params: [] };
    }
    return {
      sql: `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 OR is_active IS NULL THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN quantity <= COALESCE(min_quantity, 5) AND quantity > 0 THEN 1 ELSE 0 END) as low_stock,
          SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock
        FROM products
        WHERE organization_id = ?
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: statsData } = useQuery<any>(statsQuery.sql, statsQuery.params);

  // تحويل البيانات
  const products = useMemo(() => {
    if (!productsData) return [];
    return productsData.map(p => ({
      ...p,
      price: Number(p.price) || 0,
      cost_price: p.cost_price ? Number(p.cost_price) : null,
      quantity: Number(p.quantity) || 0,
      min_quantity: p.min_quantity ? Number(p.min_quantity) : null,
      is_active: Boolean(p.is_active),
    }));
  }, [productsData]);

  const total = countData?.[0]?.count ? Number(countData[0].count) : 0;
  const hasMore = products.length < total;

  const categories = categoriesData || [];
  const [subcategories, setSubcategories] = useState<ProductSubcategory[]>([]);

  const stats = useMemo(() => {
    if (!statsData || statsData.length === 0) return null;
    const row = statsData[0];
    return {
      total: Number(row.total) || 0,
      active: Number(row.active) || 0,
      lowStock: Number(row.low_stock) || 0,
      outOfStock: Number(row.out_of_stock) || 0
    };
  }, [statsData]);

  // ========================================
  // 🔧 Helper Functions
  // ========================================

  const setFilters = useCallback((newFilters: ProductFilters) => {
    setFiltersState(newFilters);
    setPage(1);
  }, []);

  const refetch = useCallback(async () => {
    // مع PowerSync، البيانات تتحدث تلقائياً
    console.log('[useLocalProducts] Data refreshes automatically via PowerSync');
  }, []);

  const search = useCallback(async (query: string): Promise<Product[]> => {
    // البحث يتم عبر تحديث الفلاتر
    setFiltersState(prev => ({ ...prev, search: query }));
    return products.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.sku?.toLowerCase().includes(query.toLowerCase()) ||
      p.barcode?.includes(query)
    );
  }, [products]);

  const getProduct = useCallback(async (id: string): Promise<ProductWithDetails | null> => {
    const product = products.find(p => p.id === id);
    return product || null;
  }, [products]);

  const getByBarcode = useCallback(async (barcode: string): Promise<ProductWithDetails | null> => {
    const product = products.find(p => p.barcode === barcode);
    return product || null;
  }, [products]);

  const loadCategories = useCallback(async () => {
    // التصنيفات تُحمّل تلقائياً مع PowerSync
  }, []);

  const loadSubcategories = useCallback(async (categoryId?: string) => {
    // التصنيفات الفرعية تُحمّل عند الحاجة
  }, []);

  const loadStats = useCallback(async () => {
    // الإحصائيات تُحمّل تلقائياً مع PowerSync
  }, []);

  return {
    products,
    loading: isLoading,
    error: queryError || null,
    total,
    page,
    hasMore,
    refetch,
    setPage,
    setFilters,
    search,
    getProduct,
    getByBarcode,
    categories,
    subcategories,
    loadCategories,
    loadSubcategories,
    stats,
    loadStats
  };
}

// ========================================
// 🔧 Single Product Hook
// ========================================

export function useLocalProduct(productId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !productId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM products WHERE id = ? AND organization_id = ? LIMIT 1',
      params: [productId, orgId]
    };
  }, [productId, orgId]);

  const { data, isLoading, error } = useQuery<Product>(sql, params);

  const product = useMemo(() => {
    if (!data || data.length === 0) return null;
    const p = data[0];
    return {
      ...p,
      price: Number(p.price) || 0,
      cost_price: p.cost_price ? Number(p.cost_price) : null,
      quantity: Number(p.quantity) || 0,
    };
  }, [data]);

  const refetch = useCallback(async () => {
    // مع PowerSync، البيانات تتحدث تلقائياً
  }, []);

  return { product, loading: isLoading, error: error || null, refetch };
}

// ========================================
// 🔧 Product Search Hook
// ========================================

export function useProductSearch(debounceMs: number = 300) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const [query, setQuery] = useState('');

  const { sql, params } = useMemo(() => {
    if (!orgId || query.length < 2) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    const searchPattern = `%${query}%`;
    return {
      sql: `
        SELECT * FROM products
        WHERE organization_id = ?
          AND (is_active = 1 OR is_active IS NULL)
          AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)
        ORDER BY created_at DESC
        LIMIT 50
      `,
      params: [orgId, searchPattern, searchPattern, searchPattern]
    };
  }, [orgId, query]);

  const { data, isLoading } = useQuery<Product>(sql, params);

  return {
    query,
    setQuery,
    results: data || [],
    loading: isLoading
  };
}

export default useLocalProducts;
