import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';

// =====================================================
// 🚀 Hook لاستخدام RPC الجديد لجلب جميع بيانات POS
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

export const useCompletePOSData = () => {
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();

  const {
    data: response,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['complete-pos-data', currentOrganization?.id],
    queryFn: async (): Promise<CompletePOSResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('معرف المؤسسة مطلوب');
      }

      const { data, error } = await supabase.rpc('get_complete_pos_data_optimized' as any, {
        p_organization_id: currentOrganization.id
      });

      if (error) {
        throw new Error(`خطأ في جلب بيانات POS: ${error.message}`);
      }

      return data as CompletePOSResponse;
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 10 * 60 * 1000, // 10 دقائق (استبدال cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // استخراج البيانات من الاستجابة
  const typedResponse = response as CompletePOSResponse | undefined;
  const posData = typedResponse?.success ? typedResponse.data : null;
  const executionStats = typedResponse?.meta;
  const hasError = !typedResponse?.success || !!error;
  const errorMessage = typedResponse?.error || error?.message;

  // دوال مساعدة للتحديث السريع
  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['complete-pos-data'] });
  };

  const refreshData = async () => {
    return await refetch();
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

export default useCompletePOSData; 