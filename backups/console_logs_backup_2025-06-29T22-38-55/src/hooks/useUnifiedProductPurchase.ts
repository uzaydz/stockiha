import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';

export interface UnifiedProductPurchaseData {
  success: boolean;
  organization: {
    id: string;
    name: string;
    logo_url?: string;
    description?: string;
    domain?: string;
    subdomain?: string;
    settings: any;
    default_language: string;
    active_subscription?: any;
  };
  product: {
    id: string;
    name: string;
    price: number;
    discount_price?: number;
    description?: string;
    thumbnail_image?: string;
    additional_images?: string[];
    stock_quantity: number;
    colors: any[];
    category: { id: string; name: string; slug: string };
    marketing_settings?: any;
    purchase_page_config?: any;
    shipping_clone_id?: number;
    shipping_provider_id?: number;
    shipping_method_type?: string;
  };
  shipping: {
    provinces: Array<{
      id: number;
      name: string;
      is_deliverable: boolean;
    }>;
    shipping_providers: any[];
    default_provider?: any;
  };
  additional: {
    services: any[];
    product_categories: any[];
    store_settings: any;
    customers_count: number;
  };
  metadata: {
    fetched_at: string;
    cache_duration: number;
    version: string;
  };
}

export interface ShippingCalculationData {
  success: boolean;
  delivery_fee: number;
  base_fee: number;
  quantity_adjustment: number;
  is_free_shipping: boolean;
  delivery_type: string;
  provider_id: number;
  wilaya: {
    id: number;
    name: string;
    is_deliverable: boolean;
  };
  municipality?: any;
  calculation_details: any;
}

export interface MunicipalitiesData {
  success: boolean;
  wilaya_id: number;
  municipalities: Array<{
    id: number;
    name: string;
    delivery_fee_adjustment: number;
    is_available: boolean;
    estimated_delivery_days: number;
  }>;
  wilaya_info: {
    id: number;
    name: string;
    is_deliverable: boolean;
    home_delivery_fee: number;
    desk_delivery_fee: number;
  };
}

/**
 * Hook موحد لجلب جميع بيانات صفحة شراء المنتج بأقل عدد من الاستدعاءات
 */
export const useUnifiedProductPurchase = (productId?: string) => {
  const { currentOrganization } = useTenant();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  // 1. جلب البيانات الأساسية الموحدة
  const {
    data: productData,
    isLoading: isLoadingProduct,
    error: productError,
    refetch: refetchProduct
  } = useQuery({
    queryKey: ['unified-product-purchase', productId, currentOrganization?.id],
    queryFn: async (): Promise<UnifiedProductPurchaseData> => {
      if (!productId || !currentOrganization?.id) {
        throw new Error('Product ID and Organization ID are required');
      }

      const { data, error } = await supabase.rpc('get_product_purchase_data_unified', {
        p_product_id: productId,
        p_organization_id: currentOrganization.id
      });

      if (error) {
        console.error('خطأ في جلب بيانات المنتج الموحدة:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'فشل في جلب بيانات المنتج');
      }

      return data;
    },
    enabled: !!productId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    cacheTime: 15 * 60 * 1000, // 15 دقيقة
    retry: 2,
    refetchOnWindowFocus: false
  });

  // 2. جلب البلديات حسب الولاية المختارة
  const getMunicipalities = useMutation({
    mutationFn: async (wilayaId: number): Promise<MunicipalitiesData> => {
      const { data, error } = await supabase.rpc('get_municipalities_with_shipping', {
        p_wilaya_id: wilayaId,
        p_organization_id: currentOrganization?.id
      });

      if (error) {
        console.error('خطأ في جلب البلديات:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, wilayaId) => {
      // حفظ البيانات في الـ cache للاستخدام المستقبلي
      queryClient.setQueryData(['municipalities', wilayaId], data);
    }
  });

  // 3. حساب أسعار الشحن الموحد
  const calculateShipping = useMutation({
    mutationFn: async (params: {
      wilayaId: number;
      municipalityId?: number;
      deliveryType?: 'home' | 'desk';
      quantity?: number;
      shippingProviderId?: number;
    }): Promise<ShippingCalculationData> => {
      if (!productId || !currentOrganization?.id) {
        throw new Error('Product ID and Organization ID are required');
      }

      const { data, error } = await supabase.rpc('calculate_shipping_unified', {
        p_organization_id: currentOrganization.id,
        p_product_id: productId,
        p_wilaya_id: params.wilayaId,
        p_municipality_id: params.municipalityId || null,
        p_delivery_type: params.deliveryType || 'home',
        p_quantity: params.quantity || 1,
        p_shipping_provider_id: params.shippingProviderId || null
      });

      if (error) {
        console.error('خطأ في حساب أسعار الشحن:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'فشل في حساب أسعار الشحن');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // حفظ نتيجة الحساب في الـ cache
      const cacheKey = [
        'shipping-calculation', 
        productId, 
        variables.wilayaId, 
        variables.municipalityId, 
        variables.deliveryType,
        variables.quantity
      ];
      queryClient.setQueryData(cacheKey, data);
    }
  });

  // 4. دوال مساعدة للوصول للبيانات
  const getShippingProviders = () => {
    return productData?.shipping?.shipping_providers || [];
  };

  const getProvinces = () => {
    return productData?.shipping?.provinces || [];
  };

  const getProductCategories = () => {
    return productData?.additional?.product_categories || [];
  };

  const getServices = () => {
    return productData?.additional?.services || [];
  };

  const getDefaultShippingProvider = () => {
    return productData?.shipping?.default_provider;
  };

  // 5. دوال للتنظيف والتحديث
  const invalidateProductData = () => {
    queryClient.invalidateQueries({
      queryKey: ['unified-product-purchase', productId]
    });
  };

  const clearShippingCache = () => {
    queryClient.removeQueries({
      queryKey: ['municipalities']
    });
    queryClient.removeQueries({
      queryKey: ['shipping-calculation']
    });
  };

  return {
    // البيانات الأساسية
    productData,
    isLoadingProduct,
    productError,
    refetchProduct,

    // العمليات التفاعلية
    getMunicipalities,
    calculateShipping,

    // دوال الوصول للبيانات
    getShippingProviders,
    getProvinces,
    getProductCategories,
    getServices,
    getDefaultShippingProvider,

    // إدارة الـ Cache
    invalidateProductData,
    clearShippingCache,

    // حالات التحميل
    isLoadingMunicipalities: getMunicipalities.isPending,
    isCalculatingShipping: calculateShipping.isPending,

    // الأخطاء
    municipalitiesError: getMunicipalities.error,
    shippingCalculationError: calculateShipping.error,

    // البيانات الحديثة
    municipalitiesData: getMunicipalities.data,
    shippingCalculationData: calculateShipping.data,

    // معلومات إضافية
    lastFetched: productData?.metadata?.fetched_at,
    cacheVersion: productData?.metadata?.version
  };
};

/**
 * Hook مبسط للحصول على البيانات الأساسية فقط (بدون عمليات تفاعلية)
 */
export const useProductPurchaseData = (productId?: string) => {
  const { 
    productData, 
    isLoadingProduct, 
    productError,
    getProvinces,
    getProductCategories,
    getShippingProviders
  } = useUnifiedProductPurchase(productId);

  return {
    data: productData,
    isLoading: isLoadingProduct,
    error: productError,
    provinces: getProvinces(),
    categories: getProductCategories(),
    shippingProviders: getShippingProviders()
  };
};

export default useUnifiedProductPurchase;