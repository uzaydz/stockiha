/**
 * Optimized Inventory Hook - Single RPC Call
 * Hook المخزون المحسّن - استدعاء واحد فقط
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchInventoryOptimized,
  fetchInventoryStatsQuick,
  type InventoryProduct,
  type InventoryFilters,
} from '@/lib/api/inventory-optimized';
import { updateVariantInventory } from '@/services/InventoryService';
import { toast } from 'sonner';
import { 
  getLocalProductsPage,
  fastSearchLocalProducts,
  getLocalProductStats
} from '@/lib/api/offlineProductsAdapter';
import { transformDatabaseProduct } from '@/lib/api/pos-products-api';

export interface StockUpdatePayload {
  product_id: string;
  variant_id?: string;
  quantity: number;
  operation: 'set' | 'add' | 'subtract';
  note?: string;
}

interface InventoryStats {
  total_products: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  total_value: number;
}

export function useInventoryOptimized(initialFilters: InventoryFilters = {}) {
  const { user } = useAuth();
  const organizationId = user?.user_metadata?.organization_id;

  // State
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({
    page: 1,
    pageSize: 50,
    ...initialFilters,
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [total, setTotal] = useState(0);
  const [filtered, setFiltered] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Load inventory with single RPC call
  const loadInventory = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const offlineMode = typeof navigator !== 'undefined' ? !navigator.onLine : false;
      const forceLocal = typeof window !== 'undefined' && window.localStorage.getItem('inventory_use_cache') === '1';
      if (offlineMode || forceLocal) {
        // تصفح محلي مفهرس
        const pageIndex = (filters.page || 1) - 1;
        const pageSize = filters.pageSize || 50;
        const search = (filters.search || '').trim();
        let items: any[] = [];
        let totalCount = 0;
        if (search) {
          const local = await fastSearchLocalProducts(organizationId, search, { limit: 2000 });
          items = local.map(transformDatabaseProduct);
          totalCount = items.length;
        } else {
          const res = await getLocalProductsPage(organizationId, { offset: pageIndex * pageSize, limit: pageSize, includeInactive: true, sortBy: 'name' });
          items = (res.products as any[]).map(transformDatabaseProduct);
          totalCount = res.total;
        }
        const mapToInventory = (p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || null,
          stock_quantity: p.stock_quantity ?? p.stockQuantity ?? 0,
          price: Number(p.price || 0),
          purchase_price: (p.purchase_price != null) ? Number(p.purchase_price) : null,
          thumbnail_image: p.thumbnail_image || p.thumbnailImage || null,
          has_variants: Boolean(p.has_variants || p.colors?.length || p.variants?.length),
          stock_status: (p.stock_quantity ?? p.stockQuantity ?? 0) === 0
            ? 'out-of-stock'
            : ((p.stock_quantity ?? p.stockQuantity ?? 0) <= 5 ? 'low-stock' : 'in-stock'),
          variant_count: Array.isArray(p.colors) ? p.colors.length : 0,
          total_variant_stock: p.total_variants_stock ?? p.actual_stock_quantity ?? (p.stock_quantity ?? 0),
          colors: Array.isArray(p.colors) ? p.colors : [],
          total_count: totalCount,
          filtered_count: totalCount,
        });
        const invProducts = items.map(mapToInventory);
        setProducts(invProducts);
        setTotal(totalCount);
        setFiltered(totalCount);
        setTotalPages(Math.ceil(totalCount / (filters.pageSize || 50)));
      } else {
        const result = await fetchInventoryOptimized(organizationId, filters);
        setProducts(result.products);
        setTotal(result.total);
        setFiltered(result.filtered);
        setTotalPages(result.totalPages);
      }

      try {
        const offlineMode2 = typeof navigator !== 'undefined' ? !navigator.onLine : false;
        const forceLocal2 = typeof window !== 'undefined' && window.localStorage.getItem('inventory_use_cache') === '1';
        if (offlineMode2 || forceLocal2) {
          console.log('📦 Inventory loaded (local):', {
            total,
            filtered,
            page: filters.page || 1,
            totalPages,
          });
        } else {
          console.log('📦 Inventory loaded (online):', {
            total,
            filtered,
            page: filters.page || 1,
            totalPages,
          });
        }
      } catch {}
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('فشل تحميل المخزون');
    } finally {
      setLoading(false);
    }
  }, [organizationId, filters]);

  // Load stats separately (lighter query)
  const loadStats = useCallback(async () => {
    if (!organizationId) return;

    try {
      const offlineMode = typeof navigator !== 'undefined' ? !navigator.onLine : false;
      const forceLocal = typeof window !== 'undefined' && window.localStorage.getItem('inventory_use_cache') === '1';
      if (offlineMode || forceLocal) {
        const s = await getLocalProductStats(organizationId);
        // تقريب إجمالي القيمة محلياً بسرعة (قيمة تقريبية من السعر * الكمية)
        const allLocal = await getLocalProductsPage(organizationId, { offset: 0, limit: 10000, includeInactive: true, sortBy: 'name' });
        const total_value = (allLocal.products as any[]).reduce((acc, p: any) => {
          const qty = p.stock_quantity ?? 0;
          const price = p.purchase_price ?? p.price ?? 0;
          return acc + (Number(qty) * Number(price));
        }, 0);
        setStats({
          total_products: s.totalProducts,
          in_stock: s.activeProducts - s.outOfStockProducts,
          low_stock: s.lowStockProducts,
          out_of_stock: s.outOfStockProducts,
          total_value: total_value
        });
      } else {
        const statsData = await fetchInventoryStatsQuick(organizationId);
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [organizationId]);

  // Update stock
  const updateStock = useCallback(
    async (payload: StockUpdatePayload) => {
      setUpdating(true);
      try {
        // حساب الكمية الجديدة بناءً على نوع العملية
        const currentProduct = products.find(p => p.id === payload.product_id);
        
        if (!currentProduct) {
          toast.error('المنتج غير موجود');
          return false;
        }

        let newQuantity = payload.quantity;
        
        if (payload.operation !== 'set') {
          let currentQuantity = currentProduct.stock_quantity || 0;
          
          if (payload.variant_id) {
            // البحث عن الكمية الحالية للمتغير
            const colors = currentProduct.colors || [];
            for (const color of colors) {
              if (color.id === payload.variant_id) {
                currentQuantity = color.quantity || 0;
                break;
              }
              if (color.sizes) {
                const size = color.sizes.find(s => s.id === payload.variant_id);
                if (size) {
                  currentQuantity = size.quantity || 0;
                  break;
                }
              }
            }
          }
          
          if (payload.operation === 'add') {
            newQuantity = currentQuantity + payload.quantity;
          } else if (payload.operation === 'subtract') {
            newQuantity = Math.max(0, currentQuantity - payload.quantity);
          }
        }

        // استخدام الخدمة الموجودة
        const result = await updateVariantInventory({
          productId: payload.product_id,
          variantId: payload.variant_id || null,
          newQuantity: newQuantity,
          operationType: 'manual',
          notes: payload.note || '',
        });

        if (result.success) {
          toast.success('تم تحديث المخزون بنجاح');
          
          // Update local state optimistically
          setProducts(prevProducts => 
            prevProducts.map(p => {
              if (p.id === payload.product_id) {
                if (!payload.variant_id) {
                  // Update main product stock
                  return { ...p, stock_quantity: newQuantity };
                }
                
                // Update variant stock
                return {
                  ...p,
                  colors: (p.colors || []).map(color => {
                    if (color.id === payload.variant_id) {
                      return { ...color, quantity: newQuantity };
                    }
                    return {
                      ...color,
                      sizes: (color.sizes || []).map(size => 
                        size.id === payload.variant_id 
                          ? { ...size, quantity: newQuantity }
                          : size
                      )
                    };
                  })
                };
              }
              return p;
            })
          );
          
          // Reload stats only (lighter query)
          loadStats();
          
          return true;
        } else {
          toast.error(result.message || 'فشل تحديث المخزون');
          return false;
        }
      } catch (error: any) {
        console.error('❌ Update stock error:', error);
        toast.error(error?.message || 'حدث خطأ أثناء التحديث');
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [loadInventory, loadStats, products]
  );

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<InventoryFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Go to page
  const goToPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  // Refresh
  const refresh = useCallback(() => {
    loadInventory();
    loadStats();
  }, [loadInventory, loadStats]);

  // Initial load - only when filters change
  useEffect(() => {
    if (!organizationId) return;
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, filters.page, filters.search, filters.stockFilter, filters.sortBy]);

  // Load stats only once on mount
  useEffect(() => {
    if (!organizationId) return;
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  return {
    // Data
    products,
    stats,
    total,
    filtered,
    totalPages,
    
    // State
    loading,
    updating,
    
    // Filters
    filters,
    updateFilters,
    goToPage,
    
    // Actions
    updateStock,
    refresh,
  };
}
