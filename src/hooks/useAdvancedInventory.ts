/**
 * 🏭 Advanced Inventory Hook
 * Hook متقدم لإدارة المخزون - يدعم جميع أنواع البيع
 *
 * يدعم:
 * - البيع بالقطعة (piece)
 * - البيع بالوزن (weight)
 * - البيع بالكرتون (box)
 * - البيع بالمتر (meter)
 * - الألوان والمقاسات
 * - العمل أوفلاين وأونلاين
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  getLocalProductsPage,
  fastSearchLocalProducts,
  getLocalProductStats,
} from '@/lib/api/offlineProductsAdapter';
import { transformDatabaseProduct } from '@/lib/api/pos-products-api';
import { advancedInventoryService } from '@/services/AdvancedInventoryService';
import type {
  AdvancedInventoryProduct,
  AdvancedInventoryFilters,
  AdvancedInventoryStats,
  SellingUnitType,
  StockStatus,
} from '@/components/inventory/types';
import type { StockUpdateParams } from '@/components/inventory/StockUpdateAdvanced';

// =====================================================
// الأنواع الداخلية
// =====================================================

interface UseAdvancedInventoryOptions {
  initialFilters?: Partial<AdvancedInventoryFilters>;
  autoSync?: boolean;
  syncInterval?: number;
}

interface UseAdvancedInventoryReturn {
  // البيانات
  products: AdvancedInventoryProduct[];
  stats: AdvancedInventoryStats | null;
  total: number;
  filtered: number;
  totalPages: number;

  // الحالة
  loading: boolean;
  updating: boolean;
  syncing: boolean;
  isOnline: boolean;
  unsyncedCount: number;

  // الفلاتر
  filters: AdvancedInventoryFilters;
  updateFilters: (newFilters: Partial<AdvancedInventoryFilters>) => void;
  goToPage: (page: number) => void;
  resetFilters: () => void;

  // الإجراءات
  updateStock: (params: StockUpdateParams) => Promise<boolean>;
  refresh: () => void;
  syncNow: () => Promise<number>;
}

// =====================================================
// الفلاتر الافتراضية
// =====================================================

const DEFAULT_FILTERS: AdvancedInventoryFilters = {
  search: '',
  stockFilter: 'all',
  sellingType: 'all',
  sortBy: 'created_at', // الأحدث أولاً افتراضياً
  sortOrder: 'desc',
  page: 1,
  pageSize: 50,
  includeInactive: false,
};

// =====================================================
// Hook الرئيسي
// =====================================================

export function useAdvancedInventory(
  options: UseAdvancedInventoryOptions = {}
): UseAdvancedInventoryReturn {
  const { initialFilters = {}, autoSync = true, syncInterval = 30000 } = options;

  const { user } = useAuth();
  const organizationId = user?.user_metadata?.organization_id;

  // الحالة
  const [products, setProducts] = useState<AdvancedInventoryProduct[]>([]);
  const [stats, setStats] = useState<AdvancedInventoryStats | null>(null);
  const [filters, setFilters] = useState<AdvancedInventoryFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [total, setTotal] = useState(0);
  const [filtered, setFiltered] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // مراقبة حالة الاتصال
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // تحويل المنتج إلى الشكل المتقدم
  const transformToAdvancedProduct = useCallback((product: any): AdvancedInventoryProduct => {
    const stockQuantity = product.stock_quantity ?? product.stockQuantity ?? 0;

    return {
      id: product.id,
      name: product.name,
      sku: product.sku || null,
      barcode: product.barcode || null,
      // ⚡ دعم thumbnail_base64 للعمل Offline
      thumbnail_image: product.thumbnail_image || product.thumbnailImage || null,
      thumbnail_base64: product.thumbnail_base64 || null,

      // المخزون الأساسي
      stock_quantity: stockQuantity,
      price: Number(product.price || 0),
      purchase_price: product.purchase_price ? Number(product.purchase_price) : null,

      // البيع بالوزن
      sell_by_weight: Boolean(product.sell_by_weight),
      weight_unit: product.weight_unit || 'kg',
      price_per_weight_unit: product.price_per_weight_unit ? Number(product.price_per_weight_unit) : undefined,
      purchase_price_per_weight_unit: product.purchase_price_per_weight_unit ? Number(product.purchase_price_per_weight_unit) : undefined,
      available_weight: product.available_weight ? Number(product.available_weight) : 0,
      total_weight_purchased: product.total_weight_purchased ? Number(product.total_weight_purchased) : 0,
      min_weight_per_sale: product.min_weight_per_sale ? Number(product.min_weight_per_sale) : undefined,
      max_weight_per_sale: product.max_weight_per_sale ? Number(product.max_weight_per_sale) : undefined,

      // البيع بالكرتون
      sell_by_box: Boolean(product.sell_by_box),
      units_per_box: product.units_per_box ? Number(product.units_per_box) : undefined,
      box_price: product.box_price ? Number(product.box_price) : undefined,
      box_purchase_price: product.box_purchase_price ? Number(product.box_purchase_price) : undefined,
      box_barcode: product.box_barcode || undefined,
      available_boxes: product.available_boxes ? Number(product.available_boxes) : 0,
      total_boxes_purchased: product.total_boxes_purchased ? Number(product.total_boxes_purchased) : 0,
      allow_single_unit_sale: product.allow_single_unit_sale !== false,

      // البيع بالمتر
      sell_by_meter: Boolean(product.sell_by_meter),
      meter_unit: product.meter_unit || 'm',
      price_per_meter: product.price_per_meter ? Number(product.price_per_meter) : undefined,
      purchase_price_per_meter: product.purchase_price_per_meter ? Number(product.purchase_price_per_meter) : undefined,
      available_length: product.available_length ? Number(product.available_length) : 0,
      total_meters_purchased: product.total_meters_purchased ? Number(product.total_meters_purchased) : 0,
      min_meters_per_sale: product.min_meters_per_sale ? Number(product.min_meters_per_sale) : undefined,
      roll_length_meters: product.roll_length_meters ? Number(product.roll_length_meters) : undefined,

      // التتبع
      track_expiry: Boolean(product.track_expiry),
      track_serial_numbers: Boolean(product.track_serial_numbers),
      track_batches: Boolean(product.track_batches),

      // المتغيرات
      has_variants: Boolean(product.has_variants || product.colors?.length),
      colors: Array.isArray(product.colors) ? product.colors.map((c: any) => ({
        id: c.id,
        name: c.name,
        color_code: c.color_code,
        quantity: c.quantity || 0,
        has_sizes: Boolean(c.has_sizes),
        sizes: Array.isArray(c.sizes) ? c.sizes.map((s: any) => ({
          id: s.id,
          name: s.name || s.size_name,
          quantity: s.quantity || 0,
        })) : [],
      })) : [],
      variant_count: Array.isArray(product.colors) ? product.colors.length : 0,
      total_variant_stock: product.total_variants_stock ?? stockQuantity,

      // حالة المخزون
      stock_status: (stockQuantity === 0
        ? 'out-of-stock'
        : stockQuantity <= (product.min_stock_level || 5)
        ? 'low-stock'
        : 'in-stock') as StockStatus,
      min_stock_level: product.min_stock_level,
      reorder_level: product.reorder_level,

      // معلومات إضافية
      category: product.category,
      category_id: product.category_id,
      is_active: product.is_active !== false,
    };
  }, []);

  // تحميل المنتجات
  const loadInventory = useCallback(async () => {
    if (!organizationId) {
      console.log('📦 [AdvancedInventory] No organizationId');
      return;
    }

    setLoading(true);

    try {
      const forceLocal = typeof window !== 'undefined' &&
        window.localStorage.getItem('inventory_use_cache') === '1';
      const useLocal = !isOnline || forceLocal;

      console.log('📦 [AdvancedInventory] Loading...', { useLocal, isOnline, filters });

      if (useLocal) {
        // التحميل من قاعدة البيانات المحلية
        const pageIndex = (filters.page || 1) - 1;
        const pageSize = filters.pageSize || 50;
        const search = (filters.search || '').trim();

        let items: any[] = [];
        let totalCount = 0;

        if (search) {
          const results = await fastSearchLocalProducts(organizationId, search, { limit: 2000 });
          items = results.map(transformDatabaseProduct);
          totalCount = items.length;
        } else {
          // ⚡ الترتيب: الأحدث أولاً افتراضياً
          let sortByLocal: 'name' | 'price' | 'stock' | 'created' = 'created';
          if (filters.sortBy === 'name') sortByLocal = 'name';
          else if (filters.sortBy === 'stock') sortByLocal = 'stock';
          else if (filters.sortBy === 'price') sortByLocal = 'price';

          const result = await getLocalProductsPage(organizationId, {
            offset: pageIndex * pageSize,
            limit: pageSize,
            includeInactive: filters.includeInactive,
            sortBy: sortByLocal,
            sortOrder: filters.sortOrder === 'asc' ? 'ASC' : 'DESC',
          });
          items = result.products.map(transformDatabaseProduct);
          totalCount = result.total;
        }

        // تطبيق الفلاتر
        let filteredItems = items;

        // فلتر حالة المخزون
        if (filters.stockFilter !== 'all') {
          filteredItems = filteredItems.filter((item) => {
            const qty = item.stock_quantity ?? 0;
            switch (filters.stockFilter) {
              case 'in-stock': return qty > 5;
              case 'low-stock': return qty > 0 && qty <= 5;
              case 'out-of-stock': return qty === 0;
              default: return true;
            }
          });
        }

        // فلتر نوع البيع
        if (filters.sellingType !== 'all') {
          filteredItems = filteredItems.filter((item) => {
            switch (filters.sellingType) {
              case 'weight': return item.sell_by_weight;
              case 'box': return item.sell_by_box;
              case 'meter': return item.sell_by_meter;
              case 'piece': return !item.sell_by_weight && !item.sell_by_box && !item.sell_by_meter;
              default: return true;
            }
          });
        }

        const transformedProducts = filteredItems.map(transformToAdvancedProduct);

        setProducts(transformedProducts);
        setTotal(totalCount);
        setFiltered(filteredItems.length);
        setTotalPages(Math.ceil(filteredItems.length / pageSize));

      } else {
        // ⚡ التحميل من Supabase - استخدام الاستعلام المباشر (أسرع وأكثر موثوقية)
        // RPC get_inventory_advanced غير متوفر في Supabase، نستخدم الاستعلام المباشر
        console.log('📦 [AdvancedInventory] Using direct query (no RPC)');
        await loadInventoryFallback();
      }

      console.log('✅ [AdvancedInventory] Loaded successfully');

    } catch (error) {
      console.error('❌ [AdvancedInventory] Load failed:', error);
      toast.error('فشل تحميل المخزون');
    } finally {
      setLoading(false);
    }
  }, [organizationId, filters, isOnline, transformToAdvancedProduct]);

  // التحميل البديل (fallback)
  const loadInventoryFallback = useCallback(async () => {
    if (!organizationId) return;

    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          colors:product_colors(
            id, name, color_code, quantity, has_sizes,
            sizes:product_sizes(id, size_name, quantity)
          )
        `)
        .eq('organization_id', organizationId);

      // البحث
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`);
      }

      // فلتر نوع البيع
      if (filters.sellingType === 'weight') {
        query = query.eq('sell_by_weight', true);
      } else if (filters.sellingType === 'box') {
        query = query.eq('sell_by_box', true);
      } else if (filters.sellingType === 'meter') {
        query = query.eq('sell_by_meter', true);
      }

      // الترتيب - الافتراضي: الأحدث أولاً
      if (filters.sortBy === 'stock') {
        query = query.order('stock_quantity', { ascending: filters.sortOrder === 'asc' });
      } else if (filters.sortBy === 'price') {
        query = query.order('price', { ascending: filters.sortOrder === 'asc' });
      } else if (filters.sortBy === 'name') {
        query = query.order('name', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false }); // الأحدث أولاً
      }

      // الترقيم
      const offset = ((filters.page || 1) - 1) * (filters.pageSize || 50);
      query = query.range(offset, offset + (filters.pageSize || 50) - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      let transformedProducts = (data || []).map(transformToAdvancedProduct);

      // فلتر حالة المخزون بعد التحميل
      if (filters.stockFilter !== 'all') {
        transformedProducts = transformedProducts.filter((p) => p.stock_status === filters.stockFilter);
      }

      setProducts(transformedProducts);
      setTotal(count || transformedProducts.length);
      setFiltered(transformedProducts.length);
      setTotalPages(Math.ceil(transformedProducts.length / (filters.pageSize || 50)));

    } catch (error) {
      console.error('❌ [AdvancedInventory] Fallback failed:', error);
    }
  }, [organizationId, filters, transformToAdvancedProduct]);

  // تحميل الإحصائيات
  const loadStats = useCallback(async () => {
    if (!organizationId) return;

    try {
      const forceLocal = typeof window !== 'undefined' &&
        window.localStorage.getItem('inventory_use_cache') === '1';
      const useLocal = !isOnline || forceLocal;

      if (useLocal) {
        const localStats = await getLocalProductStats(organizationId);
        const allProducts = await getLocalProductsPage(organizationId, {
          offset: 0,
          limit: 10000,
          includeInactive: true,
          sortBy: 'name',
        });

        // حساب إحصائيات أنواع البيع
        let weightProducts = 0;
        let boxProducts = 0;
        let meterProducts = 0;
        let totalValue = 0;

        allProducts.products.forEach((p: any) => {
          if (p.sell_by_weight) weightProducts++;
          if (p.sell_by_box) boxProducts++;
          if (p.sell_by_meter) meterProducts++;
          totalValue += (p.stock_quantity || 0) * (p.purchase_price || p.price || 0);
        });

        setStats({
          total_products: localStats.totalProducts,
          in_stock: localStats.activeProducts - localStats.outOfStockProducts,
          low_stock: localStats.lowStockProducts,
          out_of_stock: localStats.outOfStockProducts,
          total_value: totalValue,
          weight_products: weightProducts,
          box_products: boxProducts,
          meter_products: meterProducts,
        });

      } else {
        const { data, error } = await supabase
          .from('products')
          .select('stock_quantity, purchase_price, price, sell_by_weight, sell_by_box, sell_by_meter')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if (error) throw error;

        const products = data || [];
        let inStock = 0;
        let lowStock = 0;
        let outOfStock = 0;
        let totalValue = 0;
        let weightProducts = 0;
        let boxProducts = 0;
        let meterProducts = 0;

        products.forEach((p) => {
          const qty = p.stock_quantity || 0;
          const price = p.purchase_price || p.price || 0;
          totalValue += qty * Number(price);

          if (qty === 0) outOfStock++;
          else if (qty <= 5) lowStock++;
          else inStock++;

          if (p.sell_by_weight) weightProducts++;
          if (p.sell_by_box) boxProducts++;
          if (p.sell_by_meter) meterProducts++;
        });

        setStats({
          total_products: products.length,
          in_stock: inStock,
          low_stock: lowStock,
          out_of_stock: outOfStock,
          total_value: totalValue,
          weight_products: weightProducts,
          box_products: boxProducts,
          meter_products: meterProducts,
        });
      }

    } catch (error) {
      console.error('❌ [AdvancedInventory] Stats load failed:', error);
    }
  }, [organizationId, isOnline]);

  // تحديث المخزون
  const updateStock = useCallback(async (params: StockUpdateParams): Promise<boolean> => {
    if (!organizationId) {
      toast.error('لم يتم تحديد المؤسسة');
      return false;
    }

    setUpdating(true);

    try {
      const forceLocal = typeof window !== 'undefined' &&
        window.localStorage.getItem('inventory_use_cache') === '1';
      const useLocal = !isOnline || forceLocal;

      // حساب الكمية النهائية
      const currentProduct = products.find(p => p.id === params.productId);
      if (!currentProduct) {
        toast.error('المنتج غير موجود');
        return false;
      }

      // الحصول على الكمية الحالية
      let currentQuantity = 0;
      if (params.sizeId && params.colorId) {
        const color = currentProduct.colors?.find(c => c.id === params.colorId);
        const size = color?.sizes?.find(s => s.id === params.sizeId);
        currentQuantity = size?.quantity || 0;
      } else if (params.colorId) {
        const color = currentProduct.colors?.find(c => c.id === params.colorId);
        currentQuantity = color?.quantity || 0;
      } else {
        switch (params.sellingUnitType) {
          case 'weight':
            currentQuantity = currentProduct.available_weight || 0;
            break;
          case 'box':
            currentQuantity = currentProduct.available_boxes || 0;
            break;
          case 'meter':
            currentQuantity = currentProduct.available_length || 0;
            break;
          default:
            currentQuantity = currentProduct.stock_quantity || 0;
        }
      }

      // حساب الكمية الجديدة
      let newQuantity = 0;
      const quantity = params.quantityPieces || params.weightAmount || params.boxesAmount || params.metersAmount || 0;

      switch (params.operation) {
        case 'add':
          newQuantity = currentQuantity + quantity;
          break;
        case 'subtract':
          newQuantity = Math.max(0, currentQuantity - quantity);
          break;
        case 'set':
          newQuantity = quantity;
          break;
      }

      if (useLocal) {
        // التحديث المحلي
        console.log('📦 [AdvancedInventory] Updating locally:', params);

        if (params.operation === 'add') {
          await advancedInventoryService.addInventory({
            productId: params.productId,
            organizationId,
            unitType: params.sellingUnitType,
            quantityPieces: params.quantityPieces,
            weightAdded: params.weightAmount,
            metersAdded: params.metersAmount,
            boxesAdded: params.boxesAmount,
            unitCost: params.unitCost,
            batchNumber: params.batchNumber,
            notes: params.notes,
          }, isOnline);
        } else {
          await advancedInventoryService.deductInventory({
            productId: params.productId,
            organizationId,
            sellingUnitType: params.sellingUnitType,
            quantityPieces: params.quantityPieces,
            weightSold: params.weightAmount,
            metersSold: params.metersAmount,
            boxesSold: params.boxesAmount,
            colorId: params.colorId,
            sizeId: params.sizeId,
            notes: params.notes,
          }, isOnline);
        }

        toast.success(isOnline ? 'تم تحديث المخزون بنجاح' : '✅ تم الحفظ محلياً - سيتم المزامنة عند الاتصال');

      } else {
        // التحديث أونلاين - استخدام التحديث المباشر (بدون RPC)
        console.log('📦 [AdvancedInventory] Updating online (direct):', params);

        // تحديث مباشر بناءً على نوع المتغير
        if (params.sizeId) {
          const { error } = await supabase
            .from('product_sizes')
            .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
            .eq('id', params.sizeId);
          if (error) throw error;
        } else if (params.colorId) {
          const { error } = await supabase
            .from('product_colors')
            .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
            .eq('id', params.colorId);
          if (error) throw error;
        } else {
          const updateData: any = { updated_at: new Date().toISOString() };

          switch (params.sellingUnitType) {
            case 'weight':
              updateData.available_weight = newQuantity;
              break;
            case 'box':
              updateData.available_boxes = newQuantity;
              break;
            case 'meter':
              updateData.available_length = newQuantity;
              break;
            default:
              updateData.stock_quantity = newQuantity;
          }

          const { error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', params.productId);
          if (error) throw error;
        }

        toast.success('تم تحديث المخزون بنجاح');
      }

      // تحديث الحالة المحلية
      setProducts(prev => prev.map(p => {
        if (p.id !== params.productId) return p;

        const updated = { ...p };

        if (params.sizeId && params.colorId) {
          updated.colors = p.colors?.map(c => {
            if (c.id !== params.colorId) return c;
            return {
              ...c,
              sizes: c.sizes?.map(s =>
                s.id === params.sizeId ? { ...s, quantity: newQuantity } : s
              ),
            };
          });
        } else if (params.colorId) {
          updated.colors = p.colors?.map(c =>
            c.id === params.colorId ? { ...c, quantity: newQuantity } : c
          );
        } else {
          switch (params.sellingUnitType) {
            case 'weight':
              updated.available_weight = newQuantity;
              break;
            case 'box':
              updated.available_boxes = newQuantity;
              break;
            case 'meter':
              updated.available_length = newQuantity;
              break;
            default:
              updated.stock_quantity = newQuantity;
          }
        }

        return updated;
      }));

      return true;

    } catch (error: any) {
      console.error('❌ [AdvancedInventory] Update failed:', error);
      toast.error(error?.message || 'فشل تحديث المخزون');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [organizationId, products, isOnline]);

  // المزامنة الآن
  const syncNow = useCallback(async (): Promise<number> => {
    if (!organizationId || !isOnline) return 0;

    setSyncing(true);

    try {
      const result = await advancedInventoryService.syncPendingMovements(organizationId);
      if (result.synced > 0) {
        toast.success(`تمت مزامنة ${result.synced} عملية`);
        loadInventory();
        loadStats();
      }
      setUnsyncedCount(0);
      return result.synced;
    } catch (error) {
      console.error('❌ [AdvancedInventory] Sync failed:', error);
      return 0;
    } finally {
      setSyncing(false);
    }
  }, [organizationId, isOnline, loadInventory, loadStats]);

  // تحديث الفلاتر
  const updateFilters = useCallback((newFilters: Partial<AdvancedInventoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // الانتقال إلى صفحة
  const goToPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  // إعادة تعيين الفلاتر
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // التحديث
  const refresh = useCallback(() => {
    loadInventory();
    loadStats();
  }, [loadInventory, loadStats]);

  // التحميل الأولي
  useEffect(() => {
    if (organizationId) {
      loadInventory();
    }
  }, [organizationId, filters.page, filters.search, filters.stockFilter, filters.sellingType, filters.sortBy]);

  // تحميل الإحصائيات مرة واحدة
  useEffect(() => {
    if (organizationId) {
      loadStats();
    }
  }, [organizationId]);

  // المزامنة التلقائية
  useEffect(() => {
    if (!autoSync || !organizationId) return;

    const handleOnline = () => {
      console.log('🌐 [AdvancedInventory] Online - syncing...');
      syncNow();
    };

    window.addEventListener('online', handleOnline);

    const intervalId = setInterval(() => {
      if (isOnline) {
        syncNow();
      }
    }, syncInterval);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(intervalId);
    };
  }, [autoSync, organizationId, isOnline, syncInterval, syncNow]);

  // ⚡ الاستماع لأحداث تحديث المنتجات (للتحديث الفوري بعد الإنشاء)
  useEffect(() => {
    const handleProductsUpdated = (event: CustomEvent) => {
      console.log('📦 [AdvancedInventory] Products updated event received:', event.detail);
      // تحديث فوري للقائمة
      loadInventory();
      loadStats();
    };

    window.addEventListener('products-updated', handleProductsUpdated as EventListener);

    return () => {
      window.removeEventListener('products-updated', handleProductsUpdated as EventListener);
    };
  }, [loadInventory, loadStats]);

  return {
    // البيانات
    products,
    stats,
    total,
    filtered,
    totalPages,

    // الحالة
    loading,
    updating,
    syncing,
    isOnline,
    unsyncedCount,

    // الفلاتر
    filters,
    updateFilters,
    goToPage,
    resetFilters,

    // الإجراءات
    updateStock,
    refresh,
    syncNow,
  };
}

export default useAdvancedInventory;
