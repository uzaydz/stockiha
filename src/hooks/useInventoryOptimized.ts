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
      const result = await fetchInventoryOptimized(organizationId, filters);
      
      setProducts(result.products);
      setTotal(result.total);
      setFiltered(result.filtered);
      setTotalPages(result.totalPages);

      console.log('📦 Inventory loaded:', {
        products: result.products.length,
        total: result.total,
        filtered: result.filtered,
        page: result.page,
        totalPages: result.totalPages,
      });
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
      const statsData = await fetchInventoryStatsQuick(organizationId);
      setStats(statsData);
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

