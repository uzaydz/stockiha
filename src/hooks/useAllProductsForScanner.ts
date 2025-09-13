import { useMemo } from 'react';
import { useTenant } from '@/context/TenantContext';
import useUnifiedPOSData from '@/hooks/useUnifiedPOSData';

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

  // إعادة استخدام المصدر الموحد نفسه وبنفس مفاتيح الاستعلام لمنع التكرار
  // ملاحظة: نستخدم search='' وcategoryId='' لتطابق usePOSAdvancedState تماماً
  const {
    products: unifiedProducts,
    isLoading,
    error,
    refreshData: refetch
  } = useUnifiedPOSData({
    page: 1,
    limit: 10000,
    search: '',
    categoryId: '',
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  // استخراج مصفوفة المنتجات من الاستجابة الموحدة
  const productsArray: ScannerProduct[] = (unifiedProducts as unknown as ScannerProduct[]) || [];

  // فهرس سريع بالباركود -> المنتج/المتغير (O(1) بحث)
  const barcodeIndex = useMemo(() => {
    const map = new Map<string, ScannerProduct>();
    if (!productsArray || productsArray.length === 0) return map;

    for (const product of productsArray) {
      // المنتج الرئيسي
      if (product.barcode) map.set(product.barcode, product);

      // الألوان والمقاسات
      if (product.has_variants && product.colors) {
        for (const color of product.colors) {
          if (color.barcode) {
            map.set(color.barcode, {
              ...product,
              id: color.id,
              name: `${product.name} - ${color.name}`,
              stock_quantity: color.quantity,
              actual_stock_quantity: color.quantity,
              colors: [color]
            });
          }
          if (color.has_sizes && color.sizes) {
            for (const size of color.sizes) {
              if (size.barcode) {
                map.set(size.barcode, {
                  ...product,
                  id: size.id,
                  name: `${product.name} - ${color.name} - ${size.name}`,
                  stock_quantity: size.quantity,
                  actual_stock_quantity: size.quantity,
                  colors: [{ ...color, sizes: [size] }]
                });
              }
            }
          }
        }
      }
    }

    return map;
  }, [productsArray]);

  /**
   * البحث السريع في المنتجات المحملة بالباركود
   */
  const searchByBarcode = (barcode: string): ScannerProduct | null => {
    if (!barcode) return null;
    const clean = barcode.trim();
    return barcodeIndex.get(clean) || null;
  };

  /**
   * البحث بالـ SKU
   */
  const searchBySku = (sku: string): ScannerProduct | null => {
    if (!productsArray || productsArray.length === 0 || !sku) return null;

    const cleanSku = sku.trim().toLowerCase();

    return productsArray.find(product => 
      product.sku?.toLowerCase() === cleanSku
    ) || null;
  };

  /**
   * البحث بالاسم (جزئي)
   */
  const searchByName = (name: string): ScannerProduct[] => {
    if (!productsArray || productsArray.length === 0 || !name) return [];

    const cleanName = name.trim().toLowerCase();

    return productsArray.filter(product =>
      product.name.toLowerCase().includes(cleanName)
    );
  };

  /**
   * الحصول على إحصائيات المنتجات
   */
  const getStats = () => {
    if (!productsArray || productsArray.length === 0) {
      return {
        totalProducts: 0,
        productsWithBarcode: 0,
        productsWithVariants: 0,
        totalVariants: 0
      };
    }

    const totalProducts = productsArray.length;
    const productsWithBarcode = productsArray.filter(p => p.barcode).length;
    const productsWithVariants = productsArray.filter(p => p.has_variants).length;
    
    const totalVariants = productsArray.reduce((total, product) => {
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
    products: productsArray,
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
    isReady: !isLoading && !error && productsArray.length > 0,
    totalCount: productsArray.length
  };
};
