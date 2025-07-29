import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';

// =====================================================
// 🔍 Hook للسكانر والبحث السريع بالباركود
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
    onProductFound,
    onProductNotFound,
    onError,
    autoAddToCart = false,
    showNotifications = true
  } = options;

  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  // Mutation للبحث بالباركود مع Cache
  const searchMutation = useMutation({
    mutationFn: async (barcode: string): Promise<BarcodeSearchResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('معرف المؤسسة مطلوب');
      }

      const cleanBarcode = barcode.trim();
      const cacheKey = `${currentOrganization.id}-${cleanBarcode}`;
      
      // التحقق من Cache أولاً
      const cachedResult = barcodeCache.get(cacheKey);
      if (cachedResult && (Date.now() - (cachedResult as any).cachedAt) < CACHE_DURATION) {
        console.log('💾 [useBarcodeScanner] استخدام النتيجة من Cache:', cleanBarcode);
        return cachedResult;
      }

      console.log('🌐 [useBarcodeScanner] البحث في قاعدة البيانات:', cleanBarcode);
      const { data, error } = await supabase.rpc('search_product_by_barcode' as any, {
        p_organization_id: currentOrganization.id,
        p_barcode: cleanBarcode
      });

      if (error) {
        throw new Error(`خطأ في البحث بالباركود: ${error.message}`);
      }

      const result = data as BarcodeSearchResponse;
      
      // حفظ النتيجة في Cache
      (result as any).cachedAt = Date.now();
      barcodeCache.set(cacheKey, result);
      
      // تنظيف Cache القديم (حد أقصى 100 عنصر)
      if (barcodeCache.size > 100) {
        const firstKey = barcodeCache.keys().next().value;
        barcodeCache.delete(firstKey);
      }

      return result;
    },
    onSuccess: (response, barcode) => {
      console.log('📊 [useBarcodeScanner] نتيجة البحث:', response);
      setLastScannedBarcode(barcode);
      
      if (response.success && response.data) {
        console.log('✅ [useBarcodeScanner] تم العثور على المنتج:', response.data);
        
        if (showNotifications) {
          toast.success(`✅ تم العثور على المنتج!`, {
            description: `${response.data.name} - المخزون: ${response.data.actual_stock_quantity} - السعر: ${response.data.price} دج`,
            duration: 3000,
            position: "top-center"
          });
        }
        onProductFound?.(response.data);
      } else {
        console.warn('❌ [useBarcodeScanner] لم يتم العثور على المنتج:', response);
        
        if (showNotifications) {
          toast.error('❌ لم يتم العثور على المنتج', {
            description: `الباركود: ${barcode} غير موجود في النظام`,
            duration: 4000,
            position: "top-center"
          });
        }
        onProductNotFound?.(barcode);
      }
    },
    onError: (error: any, barcode) => {
      console.error('💥 [useBarcodeScanner] خطأ في البحث:', error);
      setLastScannedBarcode(barcode);
      const errorMessage = error?.message || 'حدث خطأ أثناء البحث';
      
      if (showNotifications) {
        toast.error('💥 خطأ في البحث', {
          description: `فشل البحث عن الباركود: ${barcode}\nالخطأ: ${errorMessage}`,
          duration: 5000,
          position: "top-center"
        });
      }
      onError?.(errorMessage);
    }
  });

  // دالة البحث الرئيسية
  const searchByBarcode = useCallback((barcode: string) => {
    console.log('🔍 [useBarcodeScanner] بدء البحث بالباركود:', barcode);
    
    if (!barcode || barcode.trim() === '') {
      console.warn('⚠️ [useBarcodeScanner] باركود فارغ أو غير صحيح');
      toast.error('الرجاء إدخال باركود صحيح');
      return;
    }

    if (!currentOrganization?.id) {
      console.error('❌ [useBarcodeScanner] معرف المؤسسة مفقود');
      toast.error('خطأ: معرف المؤسسة مطلوب');
      return;
    }

    const cleanBarcode = barcode.trim();
    console.log('🚀 [useBarcodeScanner] بدء البحث للباركود:', cleanBarcode);
    setIsScanning(true);
    
    // إشعار بدء البحث
    toast.loading(`🔍 جاري البحث عن الباركود: ${cleanBarcode}`, {
      id: `search-${cleanBarcode}`,
      duration: 5000
    });
    
    searchMutation.mutate(cleanBarcode, {
      onSettled: () => {
        console.log('✅ [useBarcodeScanner] انتهاء البحث');
        setIsScanning(false);
        // إلغاء إشعار التحميل
        toast.dismiss(`search-${cleanBarcode}`);
      }
    });
  }, [searchMutation, currentOrganization]);

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