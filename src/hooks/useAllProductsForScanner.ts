import { useState, useEffect, useCallback, useRef } from 'react';
import { useTenant } from '@/context/TenantContext';
import { localProductSearchService, BarcodeSearchResult } from '@/services/LocalProductSearchService';

// ⚡ v3.0: Module-level deduplication للتحكم الشامل
let _lastLoggedCount = -1;
let _isGloballyChecking = false;

interface ScannerProduct {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  sku?: string;
  stock_quantity: number;
  actual_stock_quantity: number;
  has_variants: boolean;
  category?: string;
  category_id?: string;
  thumbnail_image?: string;
  wholesale_price?: number;
  allow_retail?: boolean;
  allow_wholesale?: boolean;
  colors?: Array<{
    id: string;
    name: string;
    color_code?: string;
    quantity: number;
    barcode?: string;
    has_sizes: boolean;
    sizes?: Array<{
      id: string;
      name: string;
      quantity: number;
      barcode?: string;
    }>;
  }>;
}

/**
 * Hook محسّن للسكانر العام
 * ⚡ التحسينات:
 * - لا يحمّل كل المنتجات في الذاكرة
 * - يبحث مباشرة في SQLite (O(1) للباركود مع index)
 * - Fallback للسيرفر فقط عند عدم وجود البيانات محلياً
 */
export const useAllProductsForScanner = () => {
  const { currentOrganization } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localProductsCount, setLocalProductsCount] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // التحقق من وجود بيانات محلية عند التحميل
  useEffect(() => {
    const checkLocalData = async () => {
      if (!currentOrganization?.id) {
        setIsLoading(false);
        return;
      }

      // ⚡ v3.0: منع التحقق المتزامن عبر جميع الـ instances
      if (_isGloballyChecking) {
        return;
      }
      _isGloballyChecking = true;

      try {
        setIsLoading(true);
        const count = await localProductSearchService.getLocalProductsCount(currentOrganization.id);
        setLocalProductsCount(count);
        setIsReady(count > 0);
        setError(null);

        // ⚡ v3.0: سجل فقط عند تغيير العدد (global)
        if (_lastLoggedCount !== count) {
          _lastLoggedCount = count;
          console.log(`[useAllProductsForScanner] ✅ ${count} منتج متاح محلياً للبحث`);
        }
      } catch (err) {
        console.error('[useAllProductsForScanner] خطأ في التحقق من البيانات المحلية:', err);
        setError(err instanceof Error ? err.message : 'خطأ غير معروف');
        setIsReady(false);
      } finally {
        setIsLoading(false);
        _isGloballyChecking = false;
      }
    };

    checkLocalData();
  }, [currentOrganization?.id]);

  /**
   * ⚡ البحث السريع بالباركود - مباشرة من SQLite
   */
  const searchByBarcode = useCallback(async (barcode: string): Promise<ScannerProduct | null> => {
    if (!barcode || !currentOrganization?.id) return null;

    try {
      const result = await localProductSearchService.searchByBarcode(
        currentOrganization.id,
        barcode.trim()
      );

      if (result) {
        // تحويل النتيجة إلى ScannerProduct
        return convertToScannerProduct(result);
      }

      return null;
    } catch (err) {
      console.error('[useAllProductsForScanner] خطأ في البحث بالباركود:', err);
      return null;
    }
  }, [currentOrganization?.id]);

  /**
   * البحث بالـ SKU - مباشرة من SQLite
   */
  const searchBySku = useCallback(async (sku: string): Promise<ScannerProduct | null> => {
    if (!sku || !currentOrganization?.id) return null;

    try {
      const results = await localProductSearchService.quickSearch(
        currentOrganization.id,
        sku.trim(),
        1
      );

      if (results.length > 0 && results[0].sku?.toLowerCase() === sku.trim().toLowerCase()) {
        return results[0] as unknown as ScannerProduct;
      }

      return null;
    } catch (err) {
      console.error('[useAllProductsForScanner] خطأ في البحث بالـ SKU:', err);
      return null;
    }
  }, [currentOrganization?.id]);

  /**
   * البحث بالاسم (جزئي) - مباشرة من SQLite
   */
  const searchByName = useCallback(async (name: string, limit: number = 20): Promise<ScannerProduct[]> => {
    if (!name || !currentOrganization?.id) return [];

    try {
      const results = await localProductSearchService.quickSearch(
        currentOrganization.id,
        name.trim(),
        limit
      );

      return results as unknown as ScannerProduct[];
    } catch (err) {
      console.error('[useAllProductsForScanner] خطأ في البحث بالاسم:', err);
      return [];
    }
  }, [currentOrganization?.id]);

  /**
   * إعادة تحميل عدد المنتجات
   */
  const refetch = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      setIsLoading(true);
      const count = await localProductSearchService.getLocalProductsCount(currentOrganization.id);
      setLocalProductsCount(count);
      setIsReady(count > 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id]);

  /**
   * الحصول على إحصائيات المنتجات
   */
  const getStats = useCallback(() => {
    return {
      totalProducts: localProductsCount,
      productsWithBarcode: 0, // سيتم حسابها عند الحاجة
      productsWithVariants: 0,
      totalVariants: 0
    };
  }, [localProductsCount]);

  return {
    // البيانات - لم نعد نحمّل كل المنتجات!
    products: [], // فارغ - البحث يتم مباشرة من SQLite
    isLoading,
    error,

    // العمليات - الآن async وتبحث مباشرة في SQLite
    searchByBarcode,
    searchBySku,
    searchByName,
    refetch,

    // الإحصائيات
    stats: getStats(),

    // معلومات الحالة
    isReady,
    totalCount: localProductsCount
  };
};

/**
 * تحويل نتيجة البحث إلى ScannerProduct
 */
function convertToScannerProduct(result: BarcodeSearchResult): ScannerProduct {
  const fullProduct = result.fullProduct;
  
  return {
    id: result.id,
    name: result.name,
    price: result.price,
    barcode: result.barcode,
    stock_quantity: result.stock_quantity,
    actual_stock_quantity: result.actual_stock_quantity,
    has_variants: fullProduct?.has_variants || false,
    category_id: result.category_id,
    thumbnail_image: result.thumbnail_image,
    wholesale_price: result.wholesale_price,
    allow_retail: result.allow_retail,
    allow_wholesale: result.allow_wholesale,
    colors: fullProduct?.colors || [],
    // إضافة معلومات المتغير المحدد
    ...(result.variant_info && {
      _selectedVariant: result.variant_info
    })
  };
}
