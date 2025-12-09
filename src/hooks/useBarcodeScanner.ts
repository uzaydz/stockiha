import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';
import { unifiedProductService } from '@/services/UnifiedProductService';

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
  fullProduct?: any;
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
const barcodeCache = new Map<string, BarcodeSearchResponse>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

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
      if (cachedResult && (Date.now() - (cachedResult as any).cachedAt) < CACHE_DURATION) {
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
        (response as any).cachedAt = Date.now();
        barcodeCache.set(cacheKey, response);

        return response;
      }

      // 3️⃣ ⚡ Offline-First: لا يوجد fallback للسيرفر
      console.log(`[BarcodeScanner] ⚠️ المنتج غير موجود محلياً: ${cleanBarcode}`);
      
      const notFoundResponse: BarcodeSearchResponse = {
        success: false,
        search_term: cleanBarcode,
        message: 'المنتج غير موجود محلياً',
        error: 'PRODUCT_NOT_FOUND',
        error_code: 'NOT_FOUND'
      };

      return notFoundResponse;
    },
    onSuccess: (response, barcode) => {
      setLastScannedBarcode(barcode);
    },
    onError: (error: any, barcode) => {
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
