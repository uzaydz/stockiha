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

      try {
        const { data, error } = await supabase.rpc('get_complete_pos_data_optimized' as any, {
          p_organization_id: currentOrganization.id
        });

        if (error) {
          console.error('❌ [POS Data] RPC Error:', error);
          throw new Error(`خطأ في جلب بيانات POS: ${error.message}`);
        }

        // التحقق من صحة الاستجابة
        if (!data) {
          console.warn('⚠️ [POS Data] No data returned');
          throw new Error('لم يتم إرجاع أي بيانات من الخادم');
        }

        console.log('✅ [POS Data] Raw response:', data);

        // إذا كانت الاستجابة مصفوفة، خذ العنصر الأول
        const responseData = Array.isArray(data) ? data[0] : data;

        // التحقق من وجود خاصية success
        if (responseData && typeof responseData === 'object' && 'success' in responseData) {
          if (!responseData.success) {
            console.error('❌ [POS Data] Function returned unsuccessful:', responseData);
            throw new Error(responseData.error || 'فشل في جلب البيانات');
          }
          return responseData as CompletePOSResponse;
        }

        // إذا لم تكن هناك خاصية success، فافترض النجاح
        console.log('ℹ️ [POS Data] No success property, assuming success');
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
        console.error('❌ [POS Data] Query error:', error);
        throw error;
      }
    },
    enabled: !!currentOrganization?.id,
    staleTime: 2 * 60 * 1000, // تقليل إلى دقيقتين
    gcTime: 5 * 60 * 1000, // تقليل إلى 5 دقائق
    retry: 2, // تقليل المحاولات
    retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 5000), // تقليل التأخير
  });

  // استخراج البيانات من الاستجابة مع معالجة محسنة
  const typedResponse = response as CompletePOSResponse | undefined;
  const posData = typedResponse?.success && typedResponse.data ? typedResponse.data : null;
  const executionStats = typedResponse?.meta;
  
  // تحسين معالجة الأخطاء
  const hasError = !!error || (typedResponse && !typedResponse.success);
  const errorMessage = error?.message || typedResponse?.error || 'حدث خطأ غير معروف';
  
  // تسجيل حالة البيانات للتشخيص
  console.log('📊 [POS Data] Status:', {
    hasResponse: !!typedResponse,
    isSuccess: typedResponse?.success,
    hasData: !!posData,
    hasError,
    errorMessage: hasError ? errorMessage : 'لا توجد أخطاء'
  });



  // دوال مساعدة للتحديث السريع
  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['complete-pos-data'] });
  };

  const refreshData = async (): Promise<void> => {
    await refetch();
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

    // معلومات الأداء
    executionTime: executionStats?.execution_time_ms,
    dataTimestamp: executionStats?.data_timestamp ? new Date(executionStats.data_timestamp) : undefined,
  };
};

export default useCompletePOSData;
