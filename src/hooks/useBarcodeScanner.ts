import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';
import { unifiedProductService } from '@/services/UnifiedProductService';
import { getProductByBarcode as getProductByBarcodeRemote } from '@/lib/products/productServiceV2';
import type { GetProductV2Result, ProductVariant } from '@/lib/products/types';
import { syncProductByIdentifierFromServer } from '@/api/syncService';

// =====================================================
// 🔍 Hook للسكانر والبحث السريع بالباركود
// ⚡ محسّن: يبحث محلياً أولاً ثم السيرفر
// =====================================================

interface BarcodeSearchResult {
  id: string;
  name: string;
  price: number;
  barcode: string;
  stock_quantity: number;
  actual_stock_quantity: number;
  type: 'main_product' | 'color_variant' | 'size_variant';
  found_in: string;
  variant_info?: {
    color_id?: string;
    color_name?: string;
    color_code?: string;
    size_id?: string;
    size_name?: string;
    variant_number?: number;
    has_sizes?: boolean;
  };
  thumbnail_image?: string;
  category?: string;
  category_id?: string;
  wholesale_price?: number;
  allow_retail?: boolean;
  allow_wholesale?: boolean;
  fullProduct?: unknown;
}

interface BarcodeSearchResponse {
  success: boolean;
  data?: BarcodeSearchResult;
  search_term: string;
  message: string;
  error?: string;
  error_code?: string;
}

interface BarcodeScannerOptions {
  onProductFound?: (product: BarcodeSearchResult) => void;
  onProductNotFound?: (barcode: string) => void;
  onError?: (error: string) => void;
  autoAddToCart?: boolean;
  showNotifications?: boolean;
}

// Cache محلي للباركودات للتجنب من الاستدعاءات المتكررة
type CachedBarcodeSearchResponse = BarcodeSearchResponse & { cachedAt: number };
const barcodeCache = new Map<string, CachedBarcodeSearchResponse>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

type POSProductFromV2 = NonNullable<GetProductV2Result['product']> & {
  colors: Array<{
    id: string;
    product_id: string;
    name: string;
    color_code: string;
    image_url: string | null;
    quantity: number;
    is_default: boolean;
    barcode: string | null;
    has_sizes: boolean;
    price: number | null;
    purchase_price: number | null;
    sizes: Array<{
      id: string;
      product_id: string;
      color_id: string | null;
      size_name: string;
      quantity: number;
      price: number | null;
      purchase_price: number | null;
      barcode: string | null;
      is_default: boolean;
    }>;
  }>;
  images: unknown[];
};

function buildPOSProductFromV2(result: GetProductV2Result): POSProductFromV2 | null {
  const product = result.product;
  if (!product) return null;

  const variants: ProductVariant[] = result.variants || [];
  const colors = variants.map((variant) => ({
    id: variant.id || `${product.id}:${variant.name}`,
    product_id: product.id,
    name: variant.name,
    color_code: variant.color_code || '',
    image_url: variant.image_url || null,
    quantity: Number(variant.quantity) || 0,
    is_default: Boolean(variant.is_default),
    barcode: variant.barcode || null,
    has_sizes: Boolean(variant.has_sizes),
    price: variant.price ?? null,
    purchase_price: variant.purchase_price ?? null,
    sizes: (variant.sizes || []).map((size) => ({
      id: size.id || `${variant.id || variant.name}:${size.name}`,
      product_id: product.id,
      color_id: variant.id || null,
      size_name: size.name,
      quantity: Number(size.quantity) || 0,
      price: size.price ?? null,
      purchase_price: size.purchase_price ?? null,
      barcode: size.barcode || null,
      is_default: Boolean(size.is_default),
    })),
  }));

  return {
    ...product,
    has_variants: Boolean(product.has_variants || colors.length > 0),
    colors,
    images: result.images || [],
  };
}

export const useBarcodeScanner = (options: BarcodeScannerOptions = {}) => {
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  
  const {
    showNotifications = true
  } = options;

  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  // Mutation للبحث بالباركود - محلي أولاً ثم السيرفر
  const searchMutation = useMutation({
    mutationFn: async (barcode: string): Promise<BarcodeSearchResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('معرف المؤسسة مطلوب');
      }

      const cleanBarcode = barcode.trim();
      const cacheKey = `${currentOrganization.id}-${cleanBarcode}`;
      
      // 1️⃣ التحقق من Cache أولاً
      const cachedResult = barcodeCache.get(cacheKey);
      if (cachedResult && (Date.now() - cachedResult.cachedAt) < CACHE_DURATION) {
        console.log(`[BarcodeScanner] ✅ وُجد في Cache: ${cleanBarcode}`);
        return cachedResult;
      }

      // 2️⃣ ⚡ البحث محلياً في PowerSync أولاً
      console.log(`[BarcodeScanner] 🔍 البحث محلياً عن: ${cleanBarcode}`);
      unifiedProductService.setOrganizationId(currentOrganization.id);
      const localResult = await unifiedProductService.getProductByBarcode(cleanBarcode);

      if (localResult) {
        console.log(`[BarcodeScanner] ✅ وُجد محلياً: ${localResult.name}`);
        const response: BarcodeSearchResponse = {
          success: true,
          data: {
            id: localResult.id,
            name: localResult.name,
            price: localResult.price,
            barcode: cleanBarcode,
            stock_quantity: localResult.stock_quantity,
            actual_stock_quantity: localResult.stock_quantity,
            type: 'main_product',
            found_in: 'local',
            thumbnail_image: localResult.thumbnail_image,
            category_id: localResult.category_id,
            fullProduct: localResult
          } as BarcodeSearchResult,
          search_term: cleanBarcode,
          message: `تم العثور على المنتج: ${localResult.name}`
        };

        // حفظ في Cache
        const cached: CachedBarcodeSearchResponse = { ...response, cachedAt: Date.now() };
        barcodeCache.set(cacheKey, cached);

        return response;
      }

      // 3️⃣ 🌐 محاولة البحث من السيرفر إذا كان متاحاً
      const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
      if (isOnline) {
        try {
          // أولاً: محاولة حفظ المنتج محلياً بسرعة (إذا كان موجوداً على السيرفر لكن غير متزامن بعد)
          try {
            const syncResult = await syncProductByIdentifierFromServer(currentOrganization.id, cleanBarcode);
            if (syncResult.success) {
              const retryLocal = await unifiedProductService.getProductByBarcode(cleanBarcode);
              if (retryLocal) {
                const response: BarcodeSearchResponse = {
                  success: true,
                  data: {
                    id: retryLocal.id,
                    name: retryLocal.name,
                    price: retryLocal.price,
                    barcode: cleanBarcode,
                    stock_quantity: retryLocal.stock_quantity,
                    actual_stock_quantity: retryLocal.stock_quantity,
                    type: 'main_product',
                    found_in: 'local_after_sync',
                    thumbnail_image: retryLocal.thumbnail_image,
                    category_id: retryLocal.category_id,
                    fullProduct: retryLocal
                  } as BarcodeSearchResult,
                  search_term: cleanBarcode,
                  message: `تم العثور على المنتج بعد المزامنة: ${retryLocal.name}`
                };

                const cached: CachedBarcodeSearchResponse = { ...response, cachedAt: Date.now() };
                barcodeCache.set(cacheKey, cached);
                return response;
              }
            }
          } catch (err: unknown) {
            console.debug('[BarcodeScanner] Background sync prefetch skipped:', err);
          }

          console.log(`[BarcodeScanner] 🌐 البحث في السيرفر عن: ${cleanBarcode}`);
          const remote = await getProductByBarcodeRemote(cleanBarcode, currentOrganization.id, 'pos');

          if (remote?.success && remote.product) {
            const posProduct = buildPOSProductFromV2(remote);
            if (posProduct) {
              // حفظ المنتج محلياً بالخلفية للاستخدام Offline لاحقاً
              try {
                void syncProductByIdentifierFromServer(currentOrganization.id, cleanBarcode);
              } catch (err: unknown) {
                console.debug('[BarcodeScanner] Background sync failed to start:', err);
              }

              const response: BarcodeSearchResponse = {
                success: true,
                data: {
                  id: posProduct.id,
                  name: posProduct.name,
                  price: Number(posProduct.price) || 0,
                  barcode: cleanBarcode,
                  stock_quantity: Number(posProduct.stock_quantity) || 0,
                  actual_stock_quantity: Number(posProduct.stock_quantity) || 0,
                  type: 'main_product',
                  found_in: 'server',
                  thumbnail_image: posProduct.thumbnail_image,
                  category_id: posProduct.category_id,
                  wholesale_price: posProduct.wholesale_price,
                  allow_retail: posProduct.wholesale?.allow_retail,
                  allow_wholesale: posProduct.wholesale?.allow_wholesale,
                  fullProduct: posProduct
                } as BarcodeSearchResult,
                search_term: cleanBarcode,
                message: `تم العثور على المنتج (من السيرفر): ${posProduct.name}`
              };

              const cached: CachedBarcodeSearchResponse = { ...response, cachedAt: Date.now() };
              barcodeCache.set(cacheKey, cached);

              // تلميح للتطبيق لتحديث قوائم المنتجات إن كانت موجودة
              try {
                queryClient.invalidateQueries();
              } catch (err: unknown) {
                console.debug('[BarcodeScanner] Failed to invalidate queries:', err);
              }

              return response;
            }
          }

          console.log(`[BarcodeScanner] ⚠️ غير موجود في السيرفر أيضاً: ${cleanBarcode}`, {
            error: remote?.error
          });
        } catch (e) {
          console.warn('[BarcodeScanner] ⚠️ فشل البحث في السيرفر:', e);
        }
      }

      // 4️⃣ ⚡ Offline-First: غير موجود محلياً (ولا يمكن/لم ينجح البحث في السيرفر)
      console.log(`[BarcodeScanner] ⚠️ المنتج غير موجود محلياً: ${cleanBarcode}`);
      
      const notFoundResponse: BarcodeSearchResponse = {
        success: false,
        search_term: cleanBarcode,
        message: isOnline ? 'المنتج غير موجود محلياً' : 'المنتج غير موجود محلياً (أنت غير متصل بالإنترنت)',
        error: 'PRODUCT_NOT_FOUND',
        error_code: 'NOT_FOUND'
      };

      return notFoundResponse;
    },
    onSuccess: (response, barcode) => {
      setLastScannedBarcode(barcode);
    },
    onError: (_error: unknown, barcode) => {
      setLastScannedBarcode(barcode);
    }
  });

  // دالة البحث الرئيسية
  const searchByBarcode = useCallback((barcode: string) => {
    
    if (!barcode || barcode.trim() === '') {
      const errorMsg = 'الرجاء إدخال باركود صحيح';
      if (showNotifications) toast.error(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }

    if (!currentOrganization?.id) {
      const errorMsg = 'خطأ: معرف المؤسسة مطلوب';
      if (showNotifications) toast.error(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }

    const cleanBarcode = barcode.trim();
    setIsScanning(true);
    
    if (showNotifications) {
      toast.loading(`🔍 جاري البحث عن الباركود: ${cleanBarcode}`, {
        id: `search-${cleanBarcode}`,
        duration: 5000
      });
    }
    
    return searchMutation.mutateAsync(cleanBarcode)
      .finally(() => {
        setIsScanning(false);
        if (showNotifications) {
          toast.dismiss(`search-${cleanBarcode}`);
        }
      });
  }, [searchMutation, currentOrganization, showNotifications]);

  // دالة محاكاة السكانر (يمكن استبدالها بمكتبة سكانر حقيقية)
  const simulateBarcodeScan = useCallback((barcode: string) => {
    searchByBarcode(barcode);
  }, [searchByBarcode]);

  // إعداد listener للسكانر (يمكن توسيعه لدعم أجهزة السكانر الحقيقية)
  const startScanning = useCallback(() => {
    setIsScanning(true);
    // هنا يمكن إضافة كود لبدء السكانر الفعلي
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    // هنا يمكن إضافة كود لإيقاف السكانر
  }, []);

  // إحصائيات البحث
  const getSearchStats = useCallback(() => {
    return {
      lastScannedBarcode,
      isLoading: searchMutation.isPending,
      isScanning,
      lastSearchResult: searchMutation.data,
      searchError: searchMutation.error?.message,
      searchCount: searchMutation.data ? 1 : 0 // يمكن توسيعه لحفظ التاريخ
    };
  }, [lastScannedBarcode, isScanning, searchMutation]);

  // تنظيف البيانات
  const resetScanner = useCallback(() => {
    setLastScannedBarcode('');
    setIsScanning(false);
    searchMutation.reset();
  }, [searchMutation]);

  return {
    // الدوال الرئيسية
    searchByBarcode,
    simulateBarcodeScan,
    startScanning,
    stopScanning,
    resetScanner,

    // الحالة
    isLoading: searchMutation.isPending,
    isScanning,
    lastScannedBarcode,
    lastSearchResult: searchMutation.data,
    error: searchMutation.error?.message,

    // البيانات
    foundProduct: searchMutation.data?.success ? searchMutation.data.data : null,
    searchMessage: searchMutation.data?.message,

    // الإحصائيات
    getSearchStats,

    // معلومات إضافية
    isSuccess: searchMutation.isSuccess,
    isError: searchMutation.isError,
  };
};

export default useBarcodeScanner;
