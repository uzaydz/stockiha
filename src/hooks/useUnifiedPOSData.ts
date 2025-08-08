import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';

// =====================================================
// 🚀 Hook موحد لبيانات POS - يمنع التكرار ويحسن الأداء
// =====================================================

interface CompletePOSData {
  products: any[];
  subscriptions: any[];
  subscription_categories: any[];
  product_categories: any[];
  pos_settings: any;
  organization_apps: any[];
  users: any[];
  customers: any[];
  recent_orders: any[];
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

interface CompletePOSResponse {
  success: boolean;
  data?: CompletePOSData;
  meta?: {
    execution_time_ms: number;
    data_timestamp: string;
    organization_id: string;
  };
  error?: string;
  error_code?: string;
}

interface POSDataOptions {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

// Hook موحد لبيانات POS - يستخدم cache مشترك
export const useUnifiedPOSData = (options: POSDataOptions = {}) => {
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();

  const {
    page = 1,
    limit = 50,
    search,
    categoryId,
    enabled = true,
    staleTime = 15 * 60 * 1000, // 15 دقيقة افتراضياً
    gcTime = 30 * 60 * 1000 // 30 دقيقة افتراضياً
  } = options;

  const {
    data: response,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['unified-pos-data', currentOrganization?.id, page, limit, search, categoryId],
    queryFn: async (): Promise<CompletePOSResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('معرف المؤسسة مطلوب');
      }

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

      // إذا لم تكن هناك خاصية success، افترض أن البيانات صحيحة
      return {
        success: true,
        data: responseData as CompletePOSData,
        meta: {
          execution_time_ms: 0,
          data_timestamp: new Date().toISOString(),
          organization_id: currentOrganization.id
        }
      };
    },
    enabled: enabled && !!currentOrganization?.id && (search === undefined || search.length === 0 || search.length >= 2),
    staleTime,
    gcTime,
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
    networkMode: 'online',
    meta: {
      persist: false
    }
  });

  // استخراج البيانات من الاستجابة
  const typedResponse = response as CompletePOSResponse | undefined;
  const posData = typedResponse?.success ? typedResponse.data : null;
  const executionStats = typedResponse?.meta;
  const hasError = !typedResponse?.success || !!error;
  const errorMessage = typedResponse?.error || error?.message;

  // دوال مساعدة للتحديث السريع
  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['unified-pos-data'] });
  };

  const refreshData = async (): Promise<void> => {
    await refetch();
  };

  // تحديث جزئي للبيانات في الـ cache
  const updateProductInCache = (productId: string, updatedProduct: any) => {
    queryClient.setQueryData(
      ['unified-pos-data', currentOrganization?.id],
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
      ['unified-pos-data', currentOrganization?.id],
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
                  quantity: Math.max(0, size.quantity + quantityChange)
                };
              });

              // إعادة حساب كمية اللون
              const totalColorQuantity = updatedSizes?.reduce((sum: number, size: any) => sum + size.quantity, 0) || 0;

              return {
                ...color,
                sizes: updatedSizes,
                quantity: totalColorQuantity
              };
            });

            // إعادة حساب المخزون الإجمالي
            const totalStock = updatedColors?.reduce((sum: number, color: any) => sum + color.quantity, 0) || 0;

            return {
              ...product,
              colors: updatedColors,
              stock_quantity: totalStock,
              actual_stock_quantity: totalStock
            };
          } else if (colorId) {
            // تحديث لون معين
            const updatedColors = product.colors?.map((color: any) => {
              if (color.id !== colorId) return color;
              return {
                ...color,
                quantity: Math.max(0, color.quantity + quantityChange)
              };
            });

            const totalStock = updatedColors?.reduce((sum: number, color: any) => sum + color.quantity, 0) || 0;

            return {
              ...product,
              colors: updatedColors,
              stock_quantity: totalStock,
              actual_stock_quantity: totalStock
            };
          } else {
            // تحديث المنتج الأساسي
            return {
              ...product,
              stock_quantity: Math.max(0, product.stock_quantity + quantityChange),
              actual_stock_quantity: Math.max(0, product.actual_stock_quantity + quantityChange)
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
  };

  // دالة للحصول على مخزون منتج معين
  const getProductStock = (
    productId: string, 
    colorId?: string, 
    sizeId?: string
  ): number => {
    if (!posData?.products) return 0;

    const product = posData.products.find(p => p.id === productId);
    if (!product) return 0;

    if (colorId && sizeId) {
      const color = product.colors?.find((c: any) => c.id === colorId);
      const size = color?.sizes?.find((s: any) => s.id === sizeId);
      return size?.quantity || 0;
    } else if (colorId) {
      const color = product.colors?.find((c: any) => c.id === colorId);
      return color?.quantity || 0;
    } else {
      return product.actual_stock_quantity || product.stock_quantity || 0;
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
    subscriptions: posData?.subscriptions || [],
    subscriptionCategories: posData?.subscription_categories || [],
    productCategories: posData?.product_categories || [],
    posSettings: posData?.pos_settings,
    organizationApps: posData?.organization_apps || [],
    users: posData?.users || [],
    customers: posData?.customers || [],
    recentOrders: posData?.recent_orders || [],
    inventoryStats: posData?.inventory_stats,
    orderStats: posData?.order_stats,

    // دوال التحديث
    invalidateCache,
    refreshData,
    updateProductInCache,
    updateProductStockInCache,
    getProductStock,

    // معلومات الأداء
    executionTime: executionStats?.execution_time_ms,
    dataTimestamp: executionStats?.data_timestamp,
  };
};

export default useUnifiedPOSData;
