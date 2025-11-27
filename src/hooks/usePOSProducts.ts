import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { ensureArray } from '@/context/POSDataContext';

// =====================================================
// 🚀 Hook مخصص لمنتجات POS فقط - يمنع التكرار
// =====================================================

interface POSProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost_price?: number;
  barcode?: string;
  sku?: string;
  brand?: string;
  keywords?: string;
  category_id?: string;
  stock_quantity: number;
  actual_stock_quantity: number;
  min_stock_level?: number;
  max_stock_level?: number;
  is_active: boolean;
  image_url?: string;
  colors?: any[];
  created_at: string;
  updated_at: string;
}

interface POSProductsResponse {
  success: boolean;
  data?: {
    products: POSProduct[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

interface POSProductsOptions {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export const usePOSProducts = (options: POSProductsOptions = {}) => {
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();

  const {
    page = 1,
    limit = 50,
    search,
    categoryId,
    enabled = true,
    staleTime = 10 * 60 * 1000, // 10 دقائق
    gcTime = 20 * 60 * 1000 // 20 دقيقة
  } = options;

  const {
    data: response,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['pos-products', currentOrganization?.id, page, limit, search, categoryId],
    queryFn: async (): Promise<POSProductsResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('معرف المؤسسة مطلوب');
      }

      const { data, error } = await supabase.rpc('get_pos_products_optimized' as any, {
        p_organization_id: currentOrganization.id,
        p_page: page,
        p_limit: limit,
        p_search: search || null,
        p_category_id: categoryId || null
      });

      if (error) {
        throw new Error(`خطأ في جلب منتجات POS: ${error.message}`);
      }

      if (!data) {
        throw new Error('لم يتم إرجاع أي منتجات من الخادم');
      }

      const responseData = Array.isArray(data) ? data[0] : data;

      if (responseData && typeof responseData === 'object' && 'success' in responseData) {
        if (!responseData.success) {
          throw new Error(responseData.error || 'فشل في جلب المنتجات');
        }
        return responseData as POSProductsResponse;
      }

      return {
        success: true,
        data: {
          products: responseData as POSProduct[],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
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

  const typedResponse = response as POSProductsResponse | undefined;
  const products = typedResponse?.success ? typedResponse.data?.products || [] : [];
  const pagination = typedResponse?.success ? typedResponse.data?.pagination : null;
  const hasError = !typedResponse?.success || !!error;
  const errorMessage = typedResponse?.error || error?.message;

  // دوال مساعدة للتحديث السريع
  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['pos-products'] });
  };

  const refreshData = async (): Promise<void> => {
    await refetch();
  };

  // تحديث مخزون المنتج في الـ cache
  const updateProductStockInCache = (
    productId: string, 
    colorId: string | null, 
    sizeId: string | null, 
    quantityChange: number
  ) => {
    queryClient.setQueryData(
      ['pos-products', currentOrganization?.id],
      (oldData: POSProductsResponse | undefined) => {
        if (!oldData?.success || !oldData.data) return oldData;

        const updatedProducts = oldData.data.products.map(product => {
          if (product.id !== productId) return product;

          // تحديث المخزون حسب نوع المتغير
          if (colorId && sizeId) {
            // ✅ استخدام ensureArray للتعامل مع JSON strings من SQLite
            const productColors = ensureArray(product.colors) as any[];
            // تحديث مقاس معين في لون معين
            const updatedColors = productColors.map((color: any) => {
              if (color.id !== colorId) return color;

              const colorSizes = ensureArray(color.sizes) as any[];
              const updatedSizes = colorSizes.map((size: any) => {
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
            // ✅ استخدام ensureArray للتعامل مع JSON strings من SQLite
            const productColors = ensureArray(product.colors) as any[];
            // تحديث لون معين
            const updatedColors = productColors.map((color: any) => {
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
    const product = products.find(p => p.id === productId);
    if (!product) return 0;

    // ✅ استخدام ensureArray للتعامل مع JSON strings من SQLite
    const productColors = ensureArray(product.colors) as any[];

    if (colorId && sizeId) {
      const color = productColors.find((c: any) => c.id === colorId);
      const colorSizes = ensureArray(color?.sizes) as any[];
      const size = colorSizes.find((s: any) => s.id === sizeId);
      return size?.quantity || 0;
    } else if (colorId) {
      const color = productColors.find((c: any) => c.id === colorId);
      return color?.quantity || 0;
    } else {
      return product.actual_stock_quantity || product.stock_quantity || 0;
    }
  };

  return {
    // البيانات الأساسية
    products,
    pagination,
    isLoading,
    isRefetching,
    error: hasError,
    errorMessage,

    // دوال التحديث
    invalidateCache,
    refreshData,
    updateProductStockInCache,
    getProductStock,
  };
};

export default usePOSProducts;
