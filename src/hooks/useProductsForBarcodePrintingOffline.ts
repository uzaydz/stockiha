/**
 * ⚡ Hook محسّن لجلب المنتجات للطباعة مع دعم offline كامل
 * يستخدم PowerSync بدلاً من Supabase RPC
 * يدعم pagination للأداء الأمثل
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePowerSync } from '@/hooks/powersync/usePowerSync';
import { useTenant } from '@/context/TenantContext';

export interface ProductForBarcodePrinting {
  product_id: string;
  product_name: string;
  product_sku: string;
  product_barcode: string | null;
  product_price: number | string;
  product_slug: string | null;
  stock_quantity: number;
  organization_id: string;
  organization_name: string;
  organization_domain: string | null;
  organization_subdomain: string | null;
}

export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ProductsForBarcodeResult {
  products: ProductForBarcodePrinting[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationInfo;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  refresh: () => void;
  totalCount: number;
}

interface UseProductsForBarcodeOptions {
  initialPageSize?: number;
  searchQuery?: string;
  sortBy?: 'name' | 'price' | 'stock' | 'sku';
  sortOrder?: 'asc' | 'desc';
  stockFilter?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  priceMin?: number | null;
  priceMax?: number | null;
}

/**
 * Hook لجلب المنتجات للطباعة مع pagination ودعم offline
 */
export function useProductsForBarcodePrintingOffline(
  options: UseProductsForBarcodeOptions = {}
): ProductsForBarcodeResult {
  const {
    initialPageSize = 50,
    searchQuery = '',
    sortBy = 'name',
    sortOrder = 'asc',
    stockFilter = 'all',
    priceMin = null,
    priceMax = null
  } = options;

  const { db, isReady } = usePowerSync();
  const { currentOrganization } = useTenant();

  const [products, setProducts] = useState<ProductForBarcodePrinting[]>([]);
  const [allProductsCount, setAllProductsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // ⚡ Ref للـ timeout الخاص بـ loading indicator
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * ⚡ جلب المنتجات من PowerSync مع الفلاتر
   */
  const fetchProducts = useCallback(async () => {
    // ⚡ التحقق من جاهزية PowerSync أولاً
    if (!isReady) {
      console.log('[BarcodeProducts] ⏳ Waiting for PowerSync to be ready...');
      setIsLoading(true);
      return;
    }

    if (!db) {
      console.log('[BarcodeProducts] ❌ PowerSync DB not available');
      setProducts([]);
      setAllProductsCount(0);
      setIsLoading(false);
      return;
    }

    if (!currentOrganization?.id) {
      console.log('[BarcodeProducts] ❌ No organization ID');
      setProducts([]);
      setAllProductsCount(0);
      setIsLoading(false);
      return;
    }

    console.log('[BarcodeProducts] 🔍 Fetching products for org:', currentOrganization.id);

    // ⚡ مسح أي timeout سابق
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // ⚡ بدء الجلب
    setIsFetching(true);
    setError(null);

    // ⚡ عرض loading indicator فقط إذا استغرق أكثر من 200ms
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(true);
    }, 200);

    try {
      // بناء query أساسي
      let whereConditions: string[] = [`p.organization_id = ?`];
      let params: any[] = [currentOrganization.id];

      // إضافة فلتر البحث
      if (searchQuery.trim()) {
        whereConditions.push(`(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`);
        const searchPattern = `%${searchQuery.trim()}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      // إضافة فلتر المخزون
      if (stockFilter !== 'all') {
        switch (stockFilter) {
          case 'in_stock':
            whereConditions.push(`p.stock_quantity > 5`);
            break;
          case 'low_stock':
            whereConditions.push(`p.stock_quantity > 0 AND p.stock_quantity <= 5`);
            break;
          case 'out_of_stock':
            whereConditions.push(`p.stock_quantity = 0`);
            break;
        }
      }

      // إضافة فلتر السعر
      if (priceMin !== null) {
        whereConditions.push(`p.price >= ?`);
        params.push(priceMin);
      }
      if (priceMax !== null) {
        whereConditions.push(`p.price <= ?`);
        params.push(priceMax);
      }

      const whereClause = whereConditions.join(' AND ');

      // ⚡ جلب إجمالي العدد أولاً
      const countQuery = `SELECT COUNT(*) as total FROM products p WHERE ${whereClause}`;
      console.log('[BarcodeProducts] 📊 Count query:', countQuery, params);

      const countResult = await db.execute(countQuery, params);
      const totalCount = countResult.rows?._array?.[0]?.total || 0;
      console.log('[BarcodeProducts] 📊 Total count:', totalCount);

      setAllProductsCount(totalCount);

      if (totalCount === 0) {
        console.log('[BarcodeProducts] ⚠️ No products found');
        setProducts([]);
        setIsLoading(false);
        return;
      }

      // حساب الترتيب
      let orderByClause = 'name ASC';
      switch (sortBy) {
        case 'name':
          orderByClause = `name ${sortOrder.toUpperCase()}`;
          break;
        case 'price':
          orderByClause = `price ${sortOrder.toUpperCase()}`;
          break;
        case 'stock':
          orderByClause = `stock_quantity ${sortOrder.toUpperCase()}`;
          break;
        case 'sku':
          orderByClause = `sku ${sortOrder.toUpperCase()}`;
          break;
      }

      // ⚡ جلب البيانات مع pagination
      const offset = (currentPage - 1) * pageSize;
      const query = `
        SELECT
          p.id as product_id,
          p.name as product_name,
          p.sku as product_sku,
          p.barcode as product_barcode,
          p.price as product_price,
          p.slug as product_slug,
          COALESCE(p.stock_quantity, 0) as stock_quantity,
          p.organization_id,
          o.name as organization_name,
          o.domain as organization_domain,
          o.subdomain as organization_subdomain
        FROM products p
        LEFT JOIN organizations o ON p.organization_id = o.id
        WHERE ${whereClause}
        ORDER BY p.${orderByClause}
        LIMIT ? OFFSET ?
      `;

      const result = await db.execute(query, [...params, pageSize, offset]);
      const rows = result.rows?._array || [];

      const formattedProducts: ProductForBarcodePrinting[] = rows.map((row: any) => ({
        product_id: row.product_id,
        product_name: row.product_name || '',
        product_sku: row.product_sku || '',
        product_barcode: row.product_barcode,
        product_price: row.product_price || 0,
        product_slug: row.product_slug,
        stock_quantity: row.stock_quantity || 0,
        organization_id: row.organization_id,
        organization_name: row.organization_name || '',
        organization_domain: row.organization_domain,
        organization_subdomain: row.organization_subdomain
      }));

      setProducts(formattedProducts);
      console.log(`[BarcodeProducts] ✅ تم جلب ${formattedProducts.length} منتج من ${totalCount} (صفحة ${currentPage})`);
    } catch (err: any) {
      console.error('[BarcodeProducts] ❌ خطأ في جلب المنتجات:', err);
      setError(err.message || 'حدث خطأ في جلب المنتجات');
      setProducts([]);
      setAllProductsCount(0);
    } finally {
      // ⚡ مسح timeout ووقف كل من loading و fetching
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [
    isReady,
    db,
    currentOrganization?.id,
    currentPage,
    pageSize,
    searchQuery,
    sortBy,
    sortOrder,
    stockFilter,
    priceMin,
    priceMax
  ]);

  // جلب البيانات عند التغيير
  useEffect(() => {
    fetchProducts();

    // ⚡ تنظيف timeout عند unmount
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [fetchProducts]);

  // حساب معلومات pagination
  const pagination: PaginationInfo = useMemo(() => {
    const totalPages = Math.ceil(allProductsCount / pageSize);
    return {
      currentPage,
      pageSize,
      totalItems: allProductsCount,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    };
  }, [currentPage, pageSize, allProductsCount]);

  // دوال التحكم بالصفحات
  const goToPage = useCallback((page: number) => {
    const totalPages = Math.ceil(allProductsCount / pageSize);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [allProductsCount, pageSize]);

  const nextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [pagination.hasNextPage]);

  const previousPage = useCallback(() => {
    if (pagination.hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [pagination.hasPreviousPage]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // العودة للصفحة الأولى عند تغيير حجم الصفحة
  }, []);

  const refresh = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    isLoading,
    error,
    pagination,
    goToPage,
    nextPage,
    previousPage,
    setPageSize: handleSetPageSize,
    refresh,
    totalCount: allProductsCount
  };
}
