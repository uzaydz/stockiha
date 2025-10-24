/**
 * Modern Inventory Hook - Using Existing InventoryService
 * نظام Hook للمخزون - يستخدم الخدمات الموجودة
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchInventoryProducts,
  fetchInventoryStats,
  updateVariantInventory,
  type InventoryProduct,
  type InventoryStats,
  type InventoryFilters,
} from '@/services/InventoryService';
import { toast } from 'sonner';

export interface StockUpdatePayload {
  product_id: string;
  variant_id?: string;
  quantity: number;
  operation: 'set' | 'add' | 'subtract';
  note?: string;
}

export function useInventoryModern(initialFilters: InventoryFilters = {}) {
  const { user } = useAuth();

  // State
  const [items, setItems] = useState<InventoryProduct[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [total, setTotal] = useState(0);
  const [filtered, setFiltered] = useState(0);

  // Load inventory
  const loadInventory = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [inventoryData, statsData] = await Promise.all([
        fetchInventoryProducts(filters),
        fetchInventoryStats(),
      ]);

      setItems(inventoryData.products);
      setTotal(inventoryData.totalCount);
      setFiltered(inventoryData.filteredCount);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('فشل تحميل المخزون');
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  // Update stock using existing service
  const updateStock = useCallback(
    async (payload: StockUpdatePayload) => {
      setUpdating(true);
      try {
        // حساب الكمية الجديدة بناءً على نوع العملية
        // نحتاج أولاً للحصول على المنتج لمعرفة الكمية الحالية
        const currentItem = items.find(item => item.id === payload.product_id);
        
        if (!currentItem) {
          toast.error('المنتج غير موجود');
          return false;
        }

        // حساب الكمية الجديدة
        let newQuantity = payload.quantity;
        
        // إذا كانت العملية ليست "set"، نحتاج للكمية الحالية
        if (payload.operation !== 'set') {
          // الحصول على الكمية الحالية للمتغير المحدد
          let currentQuantity = currentItem.stockQuantity || 0;
          
          if (payload.variant_id) {
            // البحث عن الكمية الحالية للمتغير (لون أو مقاس)
            const colors = (currentItem as any).colors || [];
            for (const color of colors) {
              if (color.id === payload.variant_id) {
                currentQuantity = color.quantity || 0;
                break;
              }
              if (color.sizes) {
                const size = color.sizes.find((s: any) => s.id === payload.variant_id);
                if (size) {
                  currentQuantity = size.quantity || 0;
                  break;
                }
              }
            }
          }
          
          // حساب الكمية الجديدة بناءً على العملية
          if (payload.operation === 'add') {
            newQuantity = currentQuantity + payload.quantity;
          } else if (payload.operation === 'subtract') {
            newQuantity = Math.max(0, currentQuantity - payload.quantity);
          }
        }
        
        console.log('📦 Updating stock:', {
          product_id: payload.product_id,
          variant_id: payload.variant_id,
          operation: payload.operation,
          quantity: payload.quantity,
          newQuantity,
        });

        // استخدام الخدمة الموجودة مع الكمية الجديدة
        const result = await updateVariantInventory({
          productId: payload.product_id,
          variantId: payload.variant_id || null,
          newQuantity: newQuantity,
          operationType: 'manual',
          notes: payload.note || '',
        });

        if (result.success) {
          toast.success('تم تحديث المخزون بنجاح');
          
          // Reload after update
          setTimeout(() => loadInventory(), 500);
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
    [loadInventory, items]
  );

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<InventoryFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Refresh
  const refresh = useCallback(() => {
    loadInventory();
  }, [loadInventory]);

  // Initial load
  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  return {
    // Data
    items,
    stats,
    total,
    filtered,
    
    // State
    loading,
    updating,
    
    // Filters
    filters,
    updateFilters,
    
    // Actions
    updateStock,
    refresh,
  };
}
