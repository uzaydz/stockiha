import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';

/**
 * Hook محسن لجلب بيانات صفحة شراء المنتج
 * يقلل من عدد الاستدعاءات عبر تجميع البيانات في استدعاءات أقل
 */
export const useOptimizedProductPurchase = (productSlug?: string) => {
  const { currentOrganization, isLoading: isOrganizationLoading } = useTenant();
  const supabase = getSupabaseClient();

  // استدعاء موحد للبيانات الأساسية
  const {
    data: combinedData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['optimized-product-purchase', productSlug, currentOrganization?.id],
    queryFn: async () => {
      if (!productSlug || !currentOrganization?.id) {
        throw new Error('Product slug and Organization ID are required');
      }

      // تشغيل الاستدعاءات الأساسية بالتوازي
      const [
        productResult,
        provincesResult,
        categoriesResult,
        servicesResult,
        organizationSettingsResult
      ] = await Promise.all([
        // 1. بيانات المنتج مع الألوان والأحجام والفئة
        supabase
          .from('products')
          .select(`
            *,
            product_colors(*, product_sizes(*)),
            category:product_categories(id, name, slug)
          `)
          .eq('slug', productSlug)
          .eq('organization_id', currentOrganization.id)
          .eq('is_active', true)
          .single(),
          
        // 2. الولايات المتاحة للتوصيل
        supabase
          .from('yalidine_provinces_global')
          .select('id, name, is_deliverable')
          .eq('is_deliverable', true)
          .order('name'),
          
        // 3. فئات المنتجات
        supabase
          .from('product_categories')
          .select('id, name, slug')
          .order('name'),
          
        // 4. الخدمات المتاحة
        supabase
          .from('services')
          .select('id, name, price, is_available')
          .eq('organization_id', currentOrganization.id)
          .eq('is_available', true),
          
        // 5. إعدادات المؤسسة
        supabase.rpc('get_organization_settings_direct', {
          org_id: currentOrganization.id
        })
      ]);

      // فحص الأخطاء
      if (productResult.error) {
        throw new Error(`خطأ في جلب المنتج: ${productResult.error.message}`);
      }
      if (!productResult.data) {
        throw new Error('المنتج غير موجود');
      }
      if (provincesResult.error) console.warn('Provinces fetch error:', provincesResult.error);
      if (categoriesResult.error) console.warn('Categories fetch error:', categoriesResult.error);
      if (servicesResult.error) console.warn('Services fetch error:', servicesResult.error);

      return {
        success: true,
        product: productResult.data,
        provinces: provincesResult.data || [],
        categories: categoriesResult.data || [],
        services: servicesResult.data || [],
        organizationSettings: organizationSettingsResult.data || {},
        organization: currentOrganization,
        metadata: {
          fetched_at: new Date().toISOString(),
          cache_duration: 300,
          version: '1.0'
        }
      };
    },
    enabled: !!productSlug && !!currentOrganization?.id && !isOrganizationLoading,
    staleTime: 2 * 60 * 1000, // دقيقتان
    cacheTime: 10 * 60 * 1000, // 10 دقائق
    retry: (failureCount, error) => {
      // إعادة المحاولة فقط للأخطاء الشبكية، وليس لعدم وجود المنتج
      if (error?.message?.includes('غير موجود')) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  // دوال مساعدة للوصول للبيانات
  const getProduct = () => combinedData?.product;
  const getProvinces = () => combinedData?.provinces || [];
  const getCategories = () => combinedData?.categories || [];
  const getServices = () => combinedData?.services || [];
  const getOrganization = () => combinedData?.organization;
  const getOrganizationSettings = () => combinedData?.organizationSettings;

  return {
    // البيانات الأساسية
    data: combinedData,
    isLoading,
    error,
    refetch,

    // دوال الوصول للبيانات
    product: getProduct(),
    provinces: getProvinces(),
    categories: getCategories(),
    services: getServices(),
    organization: getOrganization(),
    organizationSettings: getOrganizationSettings(),

    // معلومات إضافية
    isReady: !isLoading && !error && !!combinedData?.product,
    lastFetched: combinedData?.metadata?.fetched_at,
    cacheVersion: combinedData?.metadata?.version
  };
};

export default useOptimizedProductPurchase;
