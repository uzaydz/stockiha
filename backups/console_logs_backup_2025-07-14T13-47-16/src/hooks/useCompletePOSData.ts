import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { useCallback, useMemo } from 'react';

// =====================================================
// 🚀 Hook لاستخدام RPC الجديد لجلب جميع بيانات POS
// =====================================================

interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_count: number;
  per_page: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

interface CompletePOSData {
  products: any[];
  pagination: PaginationInfo;
  subscriptions: any[];
  subscription_categories: any[];
  product_categories: any[];
  pos_settings: any;
  organization_apps: any[];
  users: any[];
  customers: any[];
  recent_orders: any[];
  subscription_services: any[];
  organization_settings: {
    id: string;
    organization_id: string;
    site_name?: string;
    default_language?: string;
    theme_primary_color?: string;
    theme_secondary_color?: string;
    theme_mode?: string;
    logo_url?: string;
    favicon_url?: string;
    custom_css?: string;
    custom_js?: string;
    custom_header?: string;
    custom_footer?: string;
    enable_registration?: boolean;
    enable_public_site?: boolean;
    display_text_with_logo?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  subscription_status: any;
  inventory_stats: {
    totalProducts: number;
    outOfStockProducts: number;
    totalStock: number;
  };
  order_stats: {
    totalPosOrders: number;
    todayOrders: number;
    totalSales: number;
    todaySales: number;
  };
}

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

interface CompletePOSResponse {
  success: boolean;
  data?: CompletePOSData;
  meta?: {
    execution_time_ms: number;
    data_timestamp: string;
    organization_id: string;
    version: string;
    search_params?: {
      page: number;
      limit: number;
      search?: string;
      category_id?: string;
    };
    performance: {
      query_time: string;
      status: 'excellent' | 'good' | 'acceptable' | 'slow';
    };
  };
  error?: string;
  error_code?: string;
}

interface POSDataOptions {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}

export const useCompletePOSData = (options: POSDataOptions = {}) => {
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  
  const {
    page = 1,
    limit = 50,
    search,
    categoryId
  } = options;

  const {
    data: response,
    isLoading,
    error,
    refetch,
    isRefetching,
    isPlaceholderData
  } = useQuery({
    queryKey: ['complete-pos-data', currentOrganization?.id, page, limit, search, categoryId],
    queryFn: async (): Promise<CompletePOSResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('معرف المؤسسة مطلوب');
      }

      try {
        const { data, error } = await supabase.rpc('get_complete_pos_data_optimized' as any, {
          p_organization_id: currentOrganization.id,
          p_products_page: page,
          p_products_limit: limit,
          p_search: search || null,
          p_category_id: categoryId || null
        });

        if (error) {
          throw new Error(`خطأ في جلب بيانات POS: ${error.message}`);
        }

        // التحقق من صحة الاستجابة
        if (!data) {
          throw new Error('لم يتم إرجاع أي بيانات من الخادم');
        }

        // إذا كانت الاستجابة مصفوفة، خذ العنصر الأول
        const responseData = Array.isArray(data) ? data[0] : data;

        // التحقق من وجود خاصية success
        if (responseData && typeof responseData === 'object' && 'success' in responseData) {
          if (!responseData.success) {
            throw new Error(responseData.error || 'فشل في جلب البيانات');
          }
          return responseData as CompletePOSResponse;
        }

        // إذا لم تكن هناك خاصية success، فافترض النجاح
        return {
          success: true,
          data: responseData,
          meta: {
            execution_time_ms: 0,
            data_timestamp: new Date().toISOString(),
            organization_id: currentOrganization.id
          }
        } as CompletePOSResponse;

      } catch (error: any) {
        throw error;
      }
    },
    enabled: !!currentOrganization?.id,
    staleTime: 2 * 60 * 1000, // تقليل إلى دقيقتين
    gcTime: 5 * 60 * 1000, // تقليل إلى 5 دقائق
    retry: 2, // تقليل المحاولات
    retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 5000), // تقليل التأخير
    placeholderData: (previousData) => previousData, // ✅ الحفاظ على البيانات السابقة أثناء التحميل
  } as any);

  // استخراج البيانات من الاستجابة مع معالجة محسنة
  const typedResponse = response as CompletePOSResponse | undefined;
  const posData = typedResponse?.success && typedResponse.data ? typedResponse.data : null;
  const executionStats = typedResponse?.meta;
  
  // تحسين معالجة الأخطاء
  const hasError = !!error || (typedResponse && !typedResponse.success);
  const errorMessage = error?.message || typedResponse?.error || 'حدث خطأ غير معروف';
  
  // تسجيل حالة البيانات للتشخيص

  // دوال مساعدة للتحديث السريع
  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['complete-pos-data'] });
  };

  const refreshData = async (): Promise<void> => {
    try {
      const result = await refetch();
    } catch (error) {
      throw error;
    }
  };

  // دالة البحث بالباركود
  const searchByBarcode = async (barcode: string): Promise<BarcodeSearchResponse> => {
    if (!currentOrganization?.id) {
      throw new Error('معرف المؤسسة مطلوب');
    }

    try {
      const { data, error } = await supabase.rpc('search_product_by_barcode' as any, {
        p_organization_id: currentOrganization.id,
        p_barcode: barcode.trim()
      });

      if (error) {
        throw new Error(`خطأ في البحث بالباركود: ${error.message}`);
      }

      return data as BarcodeSearchResponse;
    } catch (error: any) {
      throw error;
    }
  };

  // تحديث جزئي للبيانات في الـ cache
  const updateProductInCache = (productId: string, updatedProduct: any) => {
    queryClient.setQueryData(
      ['complete-pos-data', currentOrganization?.id],
      (oldData: CompletePOSResponse | undefined) => {
        if (!oldData?.success || !oldData.data) return oldData;

        const updatedProducts = oldData.data.products.map(product =>
          product.id === productId ? { ...product, ...updatedProduct } : product
        );

        return {
          ...oldData,
          data: {
            ...oldData.data,
            products: updatedProducts
          }
        };
      }
    );
  };

  // تحديث مخزون المنتج في الـ cache
  const updateProductStockInCache = (
    productId: string, 
    colorId: string | null, 
    sizeId: string | null, 
    quantityChange: number
  ) => {

    queryClient.setQueryData(
      ['complete-pos-data', currentOrganization?.id],
      (oldData: CompletePOSResponse | undefined) => {
        if (!oldData?.success || !oldData.data) return oldData;

        const updatedProducts = oldData.data.products.map(product => {
          if (product.id !== productId) return product;

          // تحديث المخزون حسب نوع المتغير
          if (colorId && sizeId) {
            // تحديث مقاس معين في لون معين
            const updatedColors = product.colors?.map((color: any) => {
              if (color.id !== colorId) return color;
              
              const updatedSizes = color.sizes?.map((size: any) => {
                if (size.id !== sizeId) return size;
                return {
                  ...size,
                  stock_quantity: Math.max(0, (size.stock_quantity || 0) + quantityChange)
                };
              }) || [];

              return { ...color, sizes: updatedSizes };
            }) || [];

            return { ...product, colors: updatedColors };
          } else if (colorId && !sizeId) {
            // ✅ إصلاح: تحديث لون فقط
            const updatedColors = product.colors?.map((color: any) => {
              if (color.id !== colorId) return color;
              return {
                ...color,
                stock_quantity: Math.max(0, (color.stock_quantity || 0) + quantityChange)
              };
            }) || [];

            return { ...product, colors: updatedColors };
          } else {
            // تحديث المخزون الأساسي للمنتج
            return {
              ...product,
              stock_quantity: Math.max(0, (product.stock_quantity || 0) + quantityChange)
            };
          }
        });

        return {
          ...oldData,
          data: {
            ...oldData.data,
            products: updatedProducts
          }
        };
      }
    );

    // ✅ إجبار React Query على إعادة العرض
    queryClient.invalidateQueries({ 
      queryKey: ['complete-pos-data', currentOrganization?.id],
      exact: true,
      refetchType: 'none' // لا نريد إعادة جلب البيانات، فقط re-render
    });

  };

  // ✅ دالة جديدة: الحصول على المنتج بالمخزون المُحدث من cache
  const getUpdatedProduct = useCallback((productId: string) => {
    const cachedData = queryClient.getQueryData<CompletePOSResponse>(['complete-pos-data', currentOrganization?.id]);
    
    // إذا كان لدينا بيانات محدثة في cache، استخدمها أولاً
    if (cachedData?.success && cachedData.data) {
      const cachedProduct = cachedData.data.products.find(p => p.id === productId);
      if (cachedProduct) {
        return cachedProduct;
      }
    }
    
    // كخطة احتياطية، ابحث في البيانات الأصلية
    return posData?.products.find(p => p.id === productId);
  }, [queryClient, currentOrganization?.id, posData?.products]);

  // ✅ منتجات reactive مُحدثة تُحفز re-render عند التغيير
  const updatedProducts = useMemo(() => {
    // الحصول على البيانات المُحدثة من cache
    const cachedData = queryClient.getQueryData<CompletePOSResponse>(['complete-pos-data', currentOrganization?.id]);
    
    // إذا كان لدينا بيانات محدثة في cache، استخدمها
    if (cachedData?.success && cachedData.data?.products) {
      return cachedData.data.products;
    }
    
    // كخطة احتياطية، استخدم البيانات الأصلية
    return posData?.products || [];
  }, [
    // ✅ إضافة dependencies لضمان إعادة التحديث عند تغيير cache
    queryClient.getQueryState(['complete-pos-data', currentOrganization?.id])?.dataUpdatedAt, 
    posData?.products,
    currentOrganization?.id,
    // ✅ إضافة تبعية للbرص cache data لضمان التحديث
    queryClient.getQueryData(['complete-pos-data', currentOrganization?.id])
  ]);

  // دالة للحصول على مخزون منتج معين
  const getProductStock = (
    productId: string, 
    colorId?: string, 
    sizeId?: string
  ): number => {
    // ✅ استخدام getUpdatedProduct للحصول على أحدث مخزون
    const product = getUpdatedProduct(productId);
    if (!product) return 0;

    if (colorId && sizeId) {
      const color = product.colors?.find((c: any) => c.id === colorId);
      const size = color?.sizes?.find((s: any) => s.id === sizeId);
      return size?.stock_quantity || 0;
    } else if (colorId) {
      const color = product.colors?.find((c: any) => c.id === colorId);
      return color?.stock_quantity || 0;
    } else {
      return product.stock_quantity || 0;
    }
  };

  return {
    // البيانات الأساسية
    posData,
    isLoading,
    isRefetching,
    error: hasError,
    errorMessage,
    executionStats,

    // البيانات المنفصلة للسهولة
    products: posData?.products || [],
    pagination: posData?.pagination || {
      current_page: 1,
      total_pages: 1,
      total_count: 0,
      per_page: limit,
      has_next_page: false,
      has_prev_page: false
    },
    subscriptions: posData?.subscription_services || [], // ✅ إصلاح: استخدام subscription_services بدلاً من subscriptions
    subscriptionCategories: posData?.subscription_categories || [],
    productCategories: posData?.product_categories || [],
    posSettings: posData?.pos_settings,
    organizationApps: posData?.organization_apps || [],
    users: posData?.users || [],
    customers: posData?.customers || [],
    recentOrders: posData?.recent_orders || [],
    subscriptionServices: posData?.subscription_services || [],
    organizationSettings: posData?.organization_settings,
    subscriptionStatus: posData?.subscription_status,
    inventoryStats: posData?.inventory_stats,
    orderStats: posData?.order_stats,

    // دوال التحديث
    invalidateCache,
    refreshData,
    updateProductInCache,
    updateProductStockInCache,
    getProductStock,
    searchByBarcode,
    getUpdatedProduct,
    updatedProducts,

    // معاملات البحث الحالية
    currentPage: page,
    pageSize: limit,
    searchQuery: search,
    categoryFilter: categoryId,

    // معلومات الأداء
    executionTime: executionStats?.execution_time_ms,
    dataTimestamp: executionStats?.data_timestamp ? new Date(executionStats.data_timestamp) : undefined,
    performanceStatus: executionStats?.performance?.status,
  };
};

export default useCompletePOSData;
