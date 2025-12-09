/**
 * useProductsForPrinting - جلب المنتجات للطباعة (محلي أولاً)
 * 
 * ⚡ المميزات:
 * - يجلب من SQLite أولاً (سريع وأوفلاين)
 * - Fallback للسيرفر إذا لم تتوفر البيانات محلياً
 * - دعم البحث والفلترة
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenant } from '@/context/TenantContext';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { supabase } from '@/lib/supabase';

// =====================================================
// Types
// =====================================================

export interface ProductForBarcode {
  product_id: string;
  product_name: string;
  product_price: string | number;
  product_sku: string;
  product_barcode: string | null;
  stock_quantity: number;
  organization_name: string;
  product_slug: string | null;
  organization_domain: string | null;
  organization_subdomain: string | null;
}

export interface UseProductsForPrintingOptions {
  enabled?: boolean;
  searchQuery?: string;
  sortBy?: 'name' | 'price' | 'stock' | 'sku';
  sortOrder?: 'asc' | 'desc';
  stockFilter?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface UseProductsForPrintingResult {
  products: ProductForBarcode[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  dataSource: 'local' | 'server';
}

// =====================================================
// Hook
// =====================================================

export const useProductsForPrinting = (
  options: UseProductsForPrintingOptions = {}
): UseProductsForPrintingResult => {
  const { currentOrganization } = useTenant();
  const [dataSource, setDataSource] = useState<'local' | 'server'>('local');

  const {
    enabled = true,
    searchQuery = '',
    sortBy = 'name',
    sortOrder = 'asc',
    stockFilter = 'all'
  } = options;

  /**
   * ⚡ جلب المنتجات من SQLite
   */
  const fetchFromLocal = useCallback(async (): Promise<ProductForBarcode[]> => {
    if (!currentOrganization?.id) {
      return [];
    }

    try {
      // بناء الاستعلام
      let sql = `
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.price as product_price,
          COALESCE(p.sku, p.id) as product_sku,
          p.barcode as product_barcode,
          COALESCE(p.stock_quantity, 0) as stock_quantity,
          COALESCE(o.name, 'المتجر') as organization_name,
          p.slug as product_slug,
          o.domain as organization_domain,
          o.subdomain as organization_subdomain
        FROM products p
        LEFT JOIN organizations o ON p.organization_id = o.id
        WHERE p.organization_id = ?
          AND (p.is_active = 1 OR p.is_active IS NULL)
      `;

      const params: any[] = [currentOrganization.id];

      // إضافة البحث
      if (searchQuery.trim()) {
        sql += ` AND (
          p.name LIKE ? OR 
          p.sku LIKE ? OR 
          p.barcode LIKE ?
        )`;
        const searchTerm = `%${searchQuery.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // إضافة فلتر المخزون
      switch (stockFilter) {
        case 'in_stock':
          sql += ' AND p.stock_quantity > 5';
          break;
        case 'low_stock':
          sql += ' AND p.stock_quantity > 0 AND p.stock_quantity <= 5';
          break;
        case 'out_of_stock':
          sql += ' AND p.stock_quantity = 0';
          break;
      }

      // إضافة الترتيب
      const sortColumn = {
        name: 'p.name',
        price: 'p.price',
        stock: 'p.stock_quantity',
        sku: 'p.sku'
      }[sortBy] || 'p.name';

      sql += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
      sql += ' LIMIT 1000';

      // ⚡ استخدام PowerSync مباشرة
      if (!powerSyncService.db) {
        console.warn('[useProductsForPrinting] PowerSync DB not initialized');
        return [];
      }
      const results = await powerSyncService.query<any[]>({ sql, params });

      console.log(`[useProductsForPrinting] ⚡ تم جلب ${results.length} منتج من SQLite`);
      setDataSource('local');

      return results.map(row => ({
        product_id: row.product_id,
        product_name: row.product_name,
        product_price: row.product_price,
        product_sku: row.product_sku || row.product_id,
        product_barcode: row.product_barcode,
        stock_quantity: row.stock_quantity || 0,
        organization_name: row.organization_name || 'المتجر',
        product_slug: row.product_slug,
        organization_domain: row.organization_domain,
        organization_subdomain: row.organization_subdomain
      }));
    } catch (error) {
      console.warn('[useProductsForPrinting] فشل جلب البيانات من SQLite:', error);
      return [];
    }
  }, [currentOrganization?.id, searchQuery, sortBy, sortOrder, stockFilter]);

  /**
   * 🌐 جلب المنتجات من السيرفر
   */
  const fetchFromServer = useCallback(async (): Promise<ProductForBarcode[]> => {
    if (!currentOrganization?.id) {
      return [];
    }

    try {
      // محاولة استخدام الدالة المحسنة
      const { data, error } = await supabase.rpc('get_products_for_barcode_printing_enhanced' as any, {
        p_organization_id: currentOrganization.id,
        p_search_query: searchQuery || null,
        p_sort_by: sortBy,
        p_sort_order: sortOrder,
        p_stock_filter: stockFilter,
        p_price_min: null,
        p_price_max: null,
        p_limit: 1000,
        p_offset: 0
      });

      if (error) {
        // Fallback للدالة القديمة
        const { data: legacyData, error: legacyError } = await supabase.rpc(
          'get_products_for_barcode_printing' as any,
          { p_organization_id: currentOrganization.id }
        );

        if (legacyError) throw legacyError;

        console.log(`[useProductsForPrinting] 🌐 تم جلب ${(legacyData as any[])?.length || 0} منتج من السيرفر (legacy)`);
        setDataSource('server');
        return (legacyData as ProductForBarcode[]) || [];
      }

      console.log(`[useProductsForPrinting] 🌐 تم جلب ${(data as any[])?.length || 0} منتج من السيرفر`);
      setDataSource('server');
      return (data as ProductForBarcode[]) || [];
    } catch (error) {
      console.error('[useProductsForPrinting] فشل جلب البيانات من السيرفر:', error);
      throw error;
    }
  }, [currentOrganization?.id, searchQuery, sortBy, sortOrder, stockFilter]);

  /**
   * ⚡ الدالة الرئيسية: Offline-First (محلي أولاً، ثم سيرفر فقط عند الاتصال)
   */
  const fetchProducts = useCallback(async (): Promise<ProductForBarcode[]> => {
    // ⚡ 1. محاولة محلية أولاً (PowerSync متاح دائماً)
    const localProducts = await fetchFromLocal();
    if (localProducts.length > 0) {
      return localProducts;
    }

    // 2. Fallback للسيرفر فقط إذا كان متصل
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (isOnline) {
      try {
        return await fetchFromServer();
      } catch (error) {
        console.warn('[useProductsForPrinting] ⚠️ فشل جلب البيانات من السيرفر:', error);
        // إرجاع مصفوفة فارغة بدلاً من رمي خطأ
        return [];
      }
    } else {
      console.log('[useProductsForPrinting] 📴 غير متصل - إرجاع بيانات محلية فقط');
      return [];
    }
  }, [fetchFromLocal, fetchFromServer]);

  // استخدام React Query
  const {
    data: products = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['products-for-printing', currentOrganization?.id, searchQuery, sortBy, sortOrder, stockFilter],
    queryFn: fetchProducts,
    enabled: enabled && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 10 * 60 * 1000 // 10 دقائق
  });

  return {
    products,
    isLoading,
    error: error as Error | null,
    refetch,
    dataSource
  };
};

export default useProductsForPrinting;
