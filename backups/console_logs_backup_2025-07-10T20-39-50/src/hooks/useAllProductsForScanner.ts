import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';

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

interface AllProductsResponse {
  success: boolean;
  data?: ScannerProduct[];
  error?: string;
  error_code?: string;
  meta?: {
    total_count: number;
    execution_time_ms: number;
    organization_id: string;
  };
}

/**
 * Hook لجلب جميع المنتجات للسكانر العام
 * يجلب جميع المنتجات مرة واحدة ويخزنها في الذاكرة للبحث السريع
 */
export const useAllProductsForScanner = () => {
  const { currentOrganization } = useTenant();

  const {
    data: response,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['all-products-scanner', currentOrganization?.id],
    queryFn: async (): Promise<AllProductsResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('معرف المؤسسة مطلوب');
      }

      try {
        // استخدام دالة RPC محسنة لجلب جميع المنتجات
        const { data, error } = await supabase.rpc('get_complete_pos_data_optimized' as any, {
          p_organization_id: currentOrganization.id,
          p_products_page: 1,
          p_products_limit: 10000, // جلب عدد كبير لضمان الحصول على جميع المنتجات
          p_search: null,
          p_category_id: null
        });

        if (error) {
          throw new Error(`خطأ في جلب المنتجات: ${error.message}`);
        }

        if (!data) {
          throw new Error('لم يتم إرجاع أي بيانات');
        }

        const responseData = Array.isArray(data) ? data[0] : data;

        if (responseData?.success && responseData?.data?.products) {
          return {
            success: true,
            data: responseData.data.products,
            meta: {
              total_count: responseData.data.products.length,
              execution_time_ms: responseData.meta?.execution_time_ms || 0,
              organization_id: currentOrganization.id
            }
          };
        }

        throw new Error(responseData?.error || 'فشل في جلب المنتجات');

      } catch (error: any) {
        console.error('❌ [Scanner Products] Error:', error);
        throw error;
      }
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 دقائق - البيانات مستقرة نسبياً
    gcTime: 10 * 60 * 1000, // 10 دقائق في الذاكرة
    retry: 2,
    retryDelay: 1000
  });

  /**
   * البحث السريع في المنتجات المحملة بالباركود
   */
  const searchByBarcode = (barcode: string): ScannerProduct | null => {
    if (!response?.data || !barcode) return null;

    const cleanBarcode = barcode.trim();

    // البحث في المنتجات الرئيسية
    for (const product of response.data) {
      // البحث في الباركود الرئيسي
      if (product.barcode === cleanBarcode) {
        return product;
      }

      // البحث في المتغيرات (الألوان والمقاسات)
      if (product.has_variants && product.colors) {
        for (const color of product.colors) {
          // البحث في باركود اللون
          if (color.barcode === cleanBarcode) {
            return {
              ...product,
              id: color.id,
              name: `${product.name} - ${color.name}`,
              stock_quantity: color.quantity,
              actual_stock_quantity: color.quantity,
              colors: [color] // إرجاع اللون المحدد فقط
            };
          }

          // البحث في المقاسات
          if (color.has_sizes && color.sizes) {
            for (const size of color.sizes) {
              if (size.barcode === cleanBarcode) {
                return {
                  ...product,
                  id: size.id,
                  name: `${product.name} - ${color.name} - ${size.name}`,
                  stock_quantity: size.quantity,
                  actual_stock_quantity: size.quantity,
                  colors: [{
                    ...color,
                    sizes: [size] // إرجاع المقاس المحدد فقط
                  }]
                };
              }
            }
          }
        }
      }
    }

    return null;
  };

  /**
   * البحث بالـ SKU
   */
  const searchBySku = (sku: string): ScannerProduct | null => {
    if (!response?.data || !sku) return null;

    const cleanSku = sku.trim().toLowerCase();

    return response.data.find(product => 
      product.sku?.toLowerCase() === cleanSku
    ) || null;
  };

  /**
   * البحث بالاسم (جزئي)
   */
  const searchByName = (name: string): ScannerProduct[] => {
    if (!response?.data || !name) return [];

    const cleanName = name.trim().toLowerCase();

    return response.data.filter(product =>
      product.name.toLowerCase().includes(cleanName)
    );
  };

  /**
   * الحصول على إحصائيات المنتجات
   */
  const getStats = () => {
    if (!response?.data) {
      return {
        totalProducts: 0,
        productsWithBarcode: 0,
        productsWithVariants: 0,
        totalVariants: 0
      };
    }

    const totalProducts = response.data.length;
    const productsWithBarcode = response.data.filter(p => p.barcode).length;
    const productsWithVariants = response.data.filter(p => p.has_variants).length;
    
    const totalVariants = response.data.reduce((total, product) => {
      if (!product.has_variants || !product.colors) return total;
      
      return total + product.colors.reduce((colorTotal, color) => {
        if (color.has_sizes && color.sizes) {
          return colorTotal + color.sizes.length;
        }
        return colorTotal + 1;
      }, 0);
    }, 0);

    return {
      totalProducts,
      productsWithBarcode,
      productsWithVariants,
      totalVariants
    };
  };

  return {
    // البيانات
    products: response?.data || [],
    isLoading,
    error,
    
    // العمليات
    searchByBarcode,
    searchBySku,
    searchByName,
    refetch,
    
    // الإحصائيات
    stats: getStats(),
    
    // معلومات الحالة
    isReady: !isLoading && !error && !!response?.data,
    totalCount: response?.meta?.total_count || 0
  };
}; 