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
import { updateProductStock, syncInventoryData } from '@/lib/db/inventoryDB';

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
    if (!organizationId) {
      console.log('📦 [Inventory] No organizationId, skipping load');
      return;
    }

    console.log('📦 [Inventory] Starting load...', { organizationId, filters });
    setLoading(true);
    try {
      const offlineMode = typeof navigator !== 'undefined' ? !navigator.onLine : false;
      const forceLocal = typeof window !== 'undefined' && window.localStorage.getItem('inventory_use_cache') === '1';
      console.log('📦 [Inventory] Mode check:', { offlineMode, forceLocal, navigatorOnLine: navigator?.onLine });

      if (offlineMode || forceLocal) {
        console.log('📦 [Inventory] Using OFFLINE/LOCAL mode');
        // تصفح محلي مفهرس
        const pageIndex = (filters.page || 1) - 1;
        const pageSize = filters.pageSize || 50;
        const search = (filters.search || '').trim();
        let items: any[] = [];
        let totalCount = 0;

        console.log('📦 [Inventory] Fetching from local DB...', { pageIndex, pageSize, search });

        if (search) {
          const local = await fastSearchLocalProducts(organizationId, search, { limit: 2000 });
          console.log('📦 [Inventory] Search results:', { count: local.length });
          items = local.map(transformDatabaseProduct);
          totalCount = items.length;
        } else {
          const res = await getLocalProductsPage(organizationId, { offset: pageIndex * pageSize, limit: pageSize, includeInactive: true, sortBy: 'name' });
          console.log('📦 [Inventory] Page results:', { products: res.products.length, total: res.total });
          console.log('🖼️ [Inventory] RAW product from SQLite:', {
            id: res.products[0]?.id,
            name: res.products[0]?.name,
            thumbnail_image: res.products[0]?.thumbnail_image,
            thumbnailImage: (res.products[0] as any)?.thumbnailImage,
            images: res.products[0]?.images
          });
          items = (res.products as any[]).map(transformDatabaseProduct);
          totalCount = res.total;
        }

        console.log('📦 [Inventory] Items before mapping:', { count: items.length, first: items[0] });
        console.log('🖼️ [Inventory] After transformDatabaseProduct:', {
          id: items[0]?.id,
          thumbnail_image: items[0]?.thumbnail_image,
          thumbnailImage: items[0]?.thumbnailImage,
          images: items[0]?.images
        });
        const mapToInventory = (p: any): InventoryProduct => ({
          id: p.id,
          name: p.name,
          sku: p.sku || null,
          stock_quantity: p.stock_quantity ?? p.stockQuantity ?? 0,
          price: Number(p.price || 0),
          purchase_price: (p.purchase_price != null) ? Number(p.purchase_price) : null,
          thumbnail_image: p.thumbnail_image || p.thumbnailImage || null,
          has_variants: Boolean(p.has_variants || p.colors?.length || p.variants?.length),
          stock_status: ((p.stock_quantity ?? p.stockQuantity ?? 0) === 0
            ? 'out-of-stock'
            : ((p.stock_quantity ?? p.stockQuantity ?? 0) <= 5 ? 'low-stock' : 'in-stock')) as 'in-stock' | 'low-stock' | 'out-of-stock',
          variant_count: Array.isArray(p.colors) ? p.colors.length : 0,
          total_variant_stock: p.total_variants_stock ?? p.actual_stock_quantity ?? (p.stock_quantity ?? 0),
          colors: Array.isArray(p.colors) ? p.colors : [],
          total_count: totalCount,
          filtered_count: totalCount,
        });
        const invProducts = items.map(mapToInventory);
        console.log('📦 [Inventory] Mapped products:', { count: invProducts.length, first: invProducts[0] });
        console.log('🖼️ [Inventory] FINAL thumbnail_image value:', {
          id: invProducts[0]?.id,
          name: invProducts[0]?.name,
          thumbnail_image: invProducts[0]?.thumbnail_image
        });

        setProducts(invProducts);
        setTotal(totalCount);
        setFiltered(totalCount);
        setTotalPages(Math.ceil(totalCount / (filters.pageSize || 50)));

        console.log('✅ [Inventory] State updated (OFFLINE):', {
          productsCount: invProducts.length,
          total: totalCount,
          totalPages: Math.ceil(totalCount / (filters.pageSize || 50))
        });
      } else {
        console.log('📦 [Inventory] Using ONLINE mode');
        const result = await fetchInventoryOptimized(organizationId, filters);
        setProducts(result.products);
        setTotal(result.total);
        setFiltered(result.filtered);
        setTotalPages(result.totalPages);

        console.log('✅ [Inventory] State updated (ONLINE):', {
          productsCount: result.products.length,
          total: result.total,
          totalPages: result.totalPages
        });
      }
    } catch (error) {
      console.error('❌ [Inventory] Failed to load inventory:', error);
      toast.error('فشل تحميل المخزون');
    } finally {
      setLoading(false);
      console.log('📦 [Inventory] Loading finished');
    }
  }, [organizationId, filters]);

  // Load stats separately (lighter query)
  const loadStats = useCallback(async () => {
    if (!organizationId) {
      console.log('📊 [Stats] No organizationId, skipping load');
      return;
    }

    console.log('📊 [Stats] Starting load...', { organizationId });
    try {
      const offlineMode = typeof navigator !== 'undefined' ? !navigator.onLine : false;
      const forceLocal = typeof window !== 'undefined' && window.localStorage.getItem('inventory_use_cache') === '1';
      console.log('📊 [Stats] Mode check:', { offlineMode, forceLocal });

      if (offlineMode || forceLocal) {
        console.log('📊 [Stats] Loading from local DB...');
        const s = await getLocalProductStats(organizationId);
        console.log('📊 [Stats] Local stats:', s);

        // تقريب إجمالي القيمة محلياً بسرعة (قيمة تقريبية من السعر * الكمية)
        const allLocal = await getLocalProductsPage(organizationId, { offset: 0, limit: 10000, includeInactive: true, sortBy: 'name' });
        console.log('📊 [Stats] All local products for value calc:', { count: allLocal.products.length });

        const total_value = (allLocal.products as any[]).reduce((acc, p: any) => {
          const qty = p.stock_quantity ?? 0;
          const price = p.purchase_price ?? p.price ?? 0;
          return acc + (Number(qty) * Number(price));
        }, 0);

        const finalStats = {
          total_products: s.totalProducts,
          in_stock: s.activeProducts - s.outOfStockProducts,
          low_stock: s.lowStockProducts,
          out_of_stock: s.outOfStockProducts,
          total_value: total_value
        };

        console.log('✅ [Stats] Setting stats (OFFLINE):', finalStats);
        setStats(finalStats);
      } else {
        console.log('📊 [Stats] Loading from server...');
        const statsData = await fetchInventoryStatsQuick(organizationId);
        console.log('✅ [Stats] Setting stats (ONLINE):', statsData);
        setStats(statsData);
      }
    } catch (error) {
      console.error('❌ [Stats] Failed to load stats:', error);
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

        // 🔥 تحديد الوضع: أونلاين أو أوفلاين
        const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
        const forceLocal = typeof window !== 'undefined' && window.localStorage.getItem('inventory_use_cache') === '1';

        if (isOffline || forceLocal) {
          // ✅ الوضع الأوفلاين: استخدام inventoryDB
          console.log('📦 [Offline] حفظ تحديث المخزون محلياً:', {
            productId: payload.product_id,
            variantId: payload.variant_id,
            newQuantity,
            operation: payload.operation
          });

          try {
            // حساب التغيير (delta) بدلاً من القيمة المطلقة
            let currentQuantity = currentProduct.stock_quantity || 0;
            if (payload.variant_id) {
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

            const delta = newQuantity - currentQuantity;

            // حفظ محلياً مع تتبع العملية
            await updateProductStock({
              product_id: payload.product_id,
              variant_id: payload.variant_id,
              quantity: delta, // التغيير (موجب أو سالب)
              reason: payload.operation === 'set' ? 'manual_set' : payload.operation === 'add' ? 'manual_add' : 'manual_subtract',
              notes: payload.note || `${payload.operation}: ${payload.quantity}`,
              created_by: organizationId || 'unknown'
            });

            toast.success('✅ تم حفظ التحديث محلياً - سيتم المزامنة عند الاتصال');

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

            // Reload stats
            loadStats();

            return true;
          } catch (offlineError: any) {
            console.error('❌ [Offline] فشل حفظ التحديث محلياً:', offlineError);
            toast.error('فشل حفظ التحديث محلياً: ' + (offlineError?.message || 'خطأ غير معروف'));
            return false;
          }
        } else {
          // 🌐 الوضع الأونلاين: استخدام الخدمة الأصلية
          console.log('🌐 [Online] إرسال تحديث المخزون للسيرفر:', {
            productId: payload.product_id,
            variantId: payload.variant_id,
            newQuantity,
            operation: payload.operation
          });

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
        }
      } catch (error: any) {
        console.error('❌ Update stock error:', error);
        toast.error(error?.message || 'حدث خطأ أثناء التحديث');
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [loadStats, products, organizationId]
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

  // 🔄 Auto-sync inventory when coming back online
  useEffect(() => {
    if (!organizationId) return;

    let intervalId: NodeJS.Timeout | null = null;

    const handleOnline = async () => {
      console.log('🌐 [Auto-Sync] اتصال الإنترنت متاح - بدء المزامنة التلقائية...');

      try {
        // مزامنة العمليات المعلقة
        const syncedCount = await syncInventoryData();

        if (syncedCount > 0) {
          console.log(`✅ [Auto-Sync] تمت مزامنة ${syncedCount} عملية مخزون`);
          toast.success(`تمت مزامنة ${syncedCount} عملية مخزون`);

          // تحديث البيانات بعد المزامنة
          refresh();
        } else {
          console.log('✅ [Auto-Sync] لا توجد عمليات معلقة للمزامنة');
        }
      } catch (error) {
        console.error('❌ [Auto-Sync] فشلت المزامنة التلقائية:', error);
      }
    };

    // الاستماع لحدث العودة أونلاين
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);

      // التحقق الدوري كل 30 ثانية (في حالة عدم تشغيل حدث online)
      intervalId = setInterval(async () => {
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
        if (isOnline) {
          try {
            const syncedCount = await syncInventoryData();
            if (syncedCount > 0) {
              console.log(`✅ [Periodic-Sync] تمت مزامنة ${syncedCount} عملية مخزون`);
              toast.success(`تمت مزامنة ${syncedCount} عملية مخزون`);
              refresh();
            }
          } catch (error) {
            // تجاهل الأخطاء في المزامنة الدورية
          }
        }
      }, 30000); // كل 30 ثانية
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [organizationId, refresh]);

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
