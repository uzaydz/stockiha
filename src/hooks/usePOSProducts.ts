/**
 * ⚡ usePOSProducts - v5.0 (PowerSync Reactive + Pagination Fix)
 * ============================================================
 *
 * 🚀 Hook محسّن لمنتجات POS - إصلاح مشكلة الـ Pagination
 *
 * ============================================================
 */

import { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { mapLocalProductToPOSProduct } from '@/context/POSDataContext';

// =====================================================
// 📦 Types
// =====================================================

interface POSProductsOptions {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  stockFilter?: 'all' | 'in_stock' | 'out_of_stock';
  enabled?: boolean;
}

interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_count: number;
  per_page: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

// =====================================================
// 🎯 Main Hook
// =====================================================

// Counter لتتبع instances
let instanceCounter = 0;

export const usePOSProducts = (options: POSProductsOptions = {}) => {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  // Instance ID للتشخيص
  const instanceIdRef = useRef(++instanceCounter);
  const instanceId = instanceIdRef.current;

  // استخراج القيم
  const page = options.page ?? 1;
  const limit = options.limit ?? 30;
  const search = options.search ?? '';
  const categoryId = options.categoryId ?? '';
  const stockFilter = options.stockFilter ?? 'all';
  const enabled = options.enabled ?? true;

  // Debug log (فقط عند تغيير الصفحة فعلياً)
  const prevPageRef = useRef(page);
  if (prevPageRef.current !== page) {
    console.log(`[usePOSProducts#${instanceId}] 📄 Page changed: ${prevPageRef.current} -> ${page}`);
    prevPageRef.current = page;
  }

  // State للمنتجات المعالجة
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs للقيم الحالية (لتجنب stale closures)
  const currentParamsRef = useRef({ page, limit, search, categoryId, stockFilter, orgId, enabled });
  currentParamsRef.current = { page, limit, search, categoryId, stockFilter, orgId, enabled };

  // Refs للتحكم
  const isMountedRef = useRef(true);
  const fetchIdRef = useRef(0);
  // ⚡ ref لتجاهل الـ fetch التالي (بعد تحديث الكاش محلياً)
  const skipNextFetchRef = useRef(false);
  const skipNextFetchUntilRef = useRef(0);

  // ⚡ استعلام مراقبة - يكتشف أي تغيير في جدول products
  const watchSql = useMemo(() => {
    if (!orgId || !enabled) {
      return 'SELECT 1 WHERE 0';
    }
    return `SELECT MAX(updated_at) as last_update, COUNT(*) as total FROM products WHERE organization_id = ?`;
  }, [orgId, enabled]);

  const watchParams = useMemo(() => {
    if (!orgId || !enabled) return [];
    return [orgId];
  }, [orgId, enabled]);

  const { data: watchData, isLoading: isWatchLoading } = useQuery<any>(watchSql, watchParams);
  const dataChangeKey = watchData?.[0]?.last_update || watchData?.[0]?.total || 0;

  // ⚡ دالة الجلب
  const fetchProducts = useCallback(async (fetchId: number, forceRefresh: boolean = false) => {
    const params = currentParamsRef.current;

    if (!params.orgId || !params.enabled) {
      setProducts([]);
      setPagination(null);
      setIsLoadingProducts(false);
      return;
    }

    // ⚡ تجاهل الـ fetch إذا كان الكاش قد تم تحديثه محلياً (لتجنب الكتابة فوق التحديث)
    if (!forceRefresh && (skipNextFetchRef.current || Date.now() < skipNextFetchUntilRef.current)) {
      console.log(`[usePOSProducts] ⏭️ Skipping fetch - local cache update in progress (until=${skipNextFetchUntilRef.current}, now=${Date.now()})`);
      skipNextFetchRef.current = false;
      return;
    }

    console.log(`[usePOSProducts] 📄 Fetching page ${params.page}, limit ${params.limit}, fetchId=${fetchId}`);

    setIsLoadingProducts(true);
    setError(null);

    try {
      const startTime = Date.now();

      const result = await deltaWriteService.searchProductsSmart({
        organizationId: params.orgId,
        search: params.search?.trim() || undefined,
        categoryId: params.categoryId && params.categoryId !== 'all' ? params.categoryId : undefined,
        page: params.page,
        limit: params.limit,
        isActive: true,
        stockFilter: params.stockFilter
      });

      // التحقق من أن هذا هو آخر طلب وأن الـ component لا يزال mounted
      if (!isMountedRef.current || fetchId !== fetchIdRef.current) {
        console.log(`[usePOSProducts] ⚠️ Skipping stale response (fetchId=${fetchId}, current=${fetchIdRef.current})`);
        return;
      }

      const mappedProducts = result.products.map(mapLocalProductToPOSProduct);

      const duration = Date.now() - startTime;
      console.log(`[usePOSProducts] ⚡ Got ${mappedProducts.length}/${result.totalCount} products in ${duration}ms (page ${params.page}/${result.totalPages})`);

      // ⚡ DEBUG: تسجيل أول منتج بالمتر للتحقق من القيم
      const meterProduct = mappedProducts.find((p: any) => p.sell_by_meter || p.selling_unit_type === 'meter');
      if (meterProduct) {
        console.log(`[usePOSProducts] 📏 Sample meter product after fetch:`, {
          name: meterProduct.name,
          available_length: meterProduct.available_length,
          stock_quantity: meterProduct.stock_quantity,
          sell_by_meter: meterProduct.sell_by_meter,
          selling_unit_type: meterProduct.selling_unit_type
        });
      }

      setProducts(mappedProducts);
      setPagination({
        current_page: params.page,
        total_pages: result.totalPages,
        total_count: result.totalCount,
        per_page: params.limit,
        has_next_page: params.page < result.totalPages,
        has_prev_page: params.page > 1
      });
    } catch (err: any) {
      console.error('[usePOSProducts] ❌ Error:', err);
      if (isMountedRef.current && fetchId === fetchIdRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      }
    } finally {
      if (isMountedRef.current && fetchId === fetchIdRef.current) {
        setIsLoadingProducts(false);
      }
    }
  }, []);

  // ⚡ ref لتتبع أول تحميل
  const isInitialLoadRef = useRef(true);
  const lastDataChangeKeyRef = useRef(dataChangeKey);

  // ⚡ تأثير التحديث عند تغيير المعاملات
  useEffect(() => {
    // ⚡ تجاهل التغيير الأولي في dataChangeKey (من 0 إلى القيمة الفعلية)
    const isDataChangeKeyUpdate = lastDataChangeKeyRef.current !== dataChangeKey;
    lastDataChangeKeyRef.current = dataChangeKey;

    // إذا كان هذا التغيير الأولي في dataChangeKey فقط، تجاهله
    if (isInitialLoadRef.current && isDataChangeKeyUpdate && fetchIdRef.current > 0) {
      console.log(`[usePOSProducts#${instanceId}] ⏭️ Skipping initial dataChangeKey update`);
      isInitialLoadRef.current = false;
      return;
    }
    isInitialLoadRef.current = false;

    // Debug: فقط عند التغييرات الفعلية
    if (process.env.NODE_ENV === 'development') {
      console.log(`[usePOSProducts#${instanceId}] 🔄 Params changed - page=${page}, search="${search}", enabled=${enabled}`);
    }

    // إنشاء ID جديد لهذا الطلب
    fetchIdRef.current += 1;
    const currentFetchId = fetchIdRef.current;

    // تأخير بسيط للـ debounce
    const timeoutId = setTimeout(() => {
      fetchProducts(currentFetchId);
    }, 30);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [page, limit, search, categoryId, stockFilter, orgId, enabled, dataChangeKey, fetchProducts]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // =====================================================
  // 🔧 Helper Functions
  // =====================================================

  const refreshData = useCallback(async () => {
    // ⚡ إعادة تعيين علامة التجاهل عند التحديث اليدوي
    skipNextFetchRef.current = false;
    skipNextFetchUntilRef.current = 0;
    fetchIdRef.current += 1;
    await fetchProducts(fetchIdRef.current, true); // forceRefresh = true
  }, [fetchProducts]);

  const invalidateCache = useCallback(() => {
    // ⚡ إعادة تعيين علامة التجاهل عند إبطال الكاش
    skipNextFetchRef.current = false;
    skipNextFetchUntilRef.current = 0;
    fetchIdRef.current += 1;
    fetchProducts(fetchIdRef.current, true); // forceRefresh = true
  }, [fetchProducts]);

  // ⚡ تحديث المخزون في الكاش - مع دعم جميع أنواع البيع
  const updateProductStockInCache = useCallback((
    productId: string,
    colorId: string | null,
    sizeId: string | null,
    quantityChange: number,
    // ⚡ معاملات جديدة لأنواع البيع المتقدمة
    sellingUnit?: 'piece' | 'weight' | 'meter' | 'box'
  ) => {
    console.log('[updateProductStockInCache] 📦 Updating stock:', {
      productId,
      colorId,
      sizeId,
      quantityChange,
      sellingUnit
    });

    // ⚡ تعيين علامة تجاهل الـ fetch التالي لمدة 3 ثوانٍ
    // هذا يمنع الـ watch query من الكتابة فوق التحديث المحلي
    skipNextFetchRef.current = true;
    skipNextFetchUntilRef.current = Date.now() + 3000; // 3 ثوانٍ
    console.log('[updateProductStockInCache] ⏭️ Set skip flag - will ignore fetches until', new Date(skipNextFetchUntilRef.current).toISOString());

    setProducts(prev =>
      prev.map(product => {
        if (product.id !== productId) return product;

        const clamp = (val: number) => Math.max(0, val);

        // ⚡ تحديد نوع البيع من المعامل أو من المنتج
        const effectiveUnit = sellingUnit ||
          product.selling_unit_type ||
          product.sellingUnit ||
          (product.sell_by_meter ? 'meter' :
           product.sell_by_weight ? 'weight' :
           product.sell_by_box ? 'box' : 'piece');

        if (colorId && sizeId) {
          const updatedColors = (product.colors || []).map((color: any) => {
            if (color.id !== colorId) return color;
            const updatedSizes = (color.sizes || []).map((size: any) => {
              if (size.id !== sizeId) return size;
              return { ...size, quantity: clamp((size.quantity || 0) + quantityChange) };
            });
            const colorTotal = updatedSizes.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
            return { ...color, sizes: updatedSizes, quantity: colorTotal };
          });
          const productTotal = updatedColors.reduce((sum: number, c: any) => sum + (c.quantity || 0), 0);
          return {
            ...product,
            colors: updatedColors,
            product_colors: updatedColors,
            stock_quantity: productTotal,
            stockQuantity: productTotal,
            actual_stock_quantity: productTotal
          };
        }

        if (colorId) {
          const updatedColors = (product.colors || []).map((color: any) => {
            if (color.id !== colorId) return color;
            return { ...color, quantity: clamp((color.quantity || 0) + quantityChange) };
          });
          const productTotal = updatedColors.reduce((sum: number, c: any) => sum + (c.quantity || 0), 0);
          return {
            ...product,
            colors: updatedColors,
            product_colors: updatedColors,
            stock_quantity: productTotal,
            stockQuantity: productTotal,
            actual_stock_quantity: productTotal
          };
        }

        // ⚡ تحديث المخزون حسب نوع البيع
        switch (effectiveUnit) {
          case 'meter':
            const newLength = clamp((product.available_length || 0) + quantityChange);
            console.log('[updateProductStockInCache] 📏 Updating meter stock:', {
              old: product.available_length,
              change: quantityChange,
              new: newLength
            });
            return {
              ...product,
              available_length: newLength,
              stock_quantity: clamp((product.stock_quantity || 0) + quantityChange),
              stockQuantity: clamp((product.stockQuantity || 0) + quantityChange),
              actual_stock_quantity: clamp((product.actual_stock_quantity || 0) + quantityChange)
            };

          case 'weight':
            const newWeight = clamp((product.available_weight || 0) + quantityChange);
            console.log('[updateProductStockInCache] ⚖️ Updating weight stock:', {
              old: product.available_weight,
              change: quantityChange,
              new: newWeight
            });
            return {
              ...product,
              available_weight: newWeight,
              stock_quantity: clamp((product.stock_quantity || 0) + quantityChange),
              stockQuantity: clamp((product.stockQuantity || 0) + quantityChange),
              actual_stock_quantity: clamp((product.actual_stock_quantity || 0) + quantityChange)
            };

          case 'box':
            const newBoxes = clamp((product.available_boxes || 0) + quantityChange);
            console.log('[updateProductStockInCache] 📦 Updating box stock:', {
              old: product.available_boxes,
              change: quantityChange,
              new: newBoxes
            });
            return {
              ...product,
              available_boxes: newBoxes,
              stock_quantity: clamp((product.stock_quantity || 0) + quantityChange),
              stockQuantity: clamp((product.stockQuantity || 0) + quantityChange),
              actual_stock_quantity: clamp((product.actual_stock_quantity || 0) + quantityChange)
            };

          default: // piece
            const newStock = clamp((product.stock_quantity || 0) + quantityChange);
            console.log('[updateProductStockInCache] 🔢 Updating piece stock:', {
              old: product.stock_quantity,
              change: quantityChange,
              new: newStock
            });
            return {
              ...product,
              stock_quantity: newStock,
              stockQuantity: newStock,
              actual_stock_quantity: newStock
            };
        }
      })
    );
  }, []);

  // الحصول على مخزون منتج
  const getProductStock = useCallback((
    productId: string,
    colorId?: string,
    sizeId?: string
  ): number => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;

    const productColors = product.colors || product.product_colors || [];

    if (colorId && sizeId) {
      const color = productColors.find((c: any) => c.id === colorId);
      const colorSizes = color?.sizes || [];
      const size = colorSizes.find((s: any) => s.id === sizeId);
      return size?.quantity || 0;
    } else if (colorId) {
      const color = productColors.find((c: any) => c.id === colorId);
      return color?.quantity || 0;
    } else {
      return product.actual_stock_quantity || product.stock_quantity || product.stockQuantity || 0;
    }
  }, [products]);

  // البحث بالباركود
  const findByBarcode = useCallback(async (barcode: string) => {
    if (!orgId) return null;
    return deltaWriteService.findByBarcode(orgId, barcode);
  }, [orgId]);

  // =====================================================
  // 📤 Return
  // =====================================================

  return {
    products,
    pagination,
    isLoading: isLoadingProducts || isWatchLoading,
    isRefetching: isLoadingProducts && products.length > 0,
    error,
    errorMessage: error,
    currentPage: page,
    totalPages: pagination?.total_pages || 1,
    totalCount: pagination?.total_count || 0,
    hasNextPage: pagination?.has_next_page || false,
    hasPrevPage: pagination?.has_prev_page || false,
    refreshData,
    invalidateCache,
    updateProductStockInCache,
    getProductStock,
    findByBarcode,
    source: 'powersync-reactive'
  };
};

export default usePOSProducts;
