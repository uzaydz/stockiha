import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase-client';
import { getOrganizationSettings } from '@/lib/api/settings';

// نوع البيانات المشتركة للمتجر
interface SharedStoreData {
  organization: any | null;
  organizationSettings: any | null;
  products: any[];
  categories: any[];
  featuredProducts: any[];
  isLoading: boolean;
  error: string | null;
}

// Cache عام لمنع الاستدعاءات المكررة
let globalStoreDataCache: { [key: string]: any } = {};
let globalCacheTimestamp: { [key: string]: number } = {};
const CACHE_DURATION = 2 * 60 * 1000; // دقيقتان

// تعرض global cache للـ window للوصول من data-refresh-helpers
if (typeof window !== 'undefined') {
  (window as any).globalStoreDataCache = globalStoreDataCache;
  (window as any).globalCacheTimestamp = globalCacheTimestamp;
}

// Preloader للصور
const preloadImages = (products: any[], categories: any[]) => {
  const imageUrls = new Set<string>();
  
  // جمع URLs الصور
  products.forEach(product => {
    if (product.thumbnail_image) imageUrls.add(product.thumbnail_image);
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img: string) => {
        if (img) imageUrls.add(img);
      });
    }
  });
  
  categories.forEach(category => {
    if (category.image_url) imageUrls.add(category.image_url);
  });
  
  // تحميل الصور في الخلفية
  const preloadPromises = Array.from(imageUrls).slice(0, 10).map(url => { // تحديد العدد لتجنب الحمل الزائد
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => resolve(url); // حتى لو فشلت، نكمل
      img.src = url;
    });
  });
  
  Promise.all(preloadPromises).then(() => {
  });
};

// Hook مشترك لجلب بيانات المتجر مرة واحدة مع تحسينات الأداء
export const useSharedStoreData = () => {
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  const organizationId = currentOrganization?.id;

  // تتبع الأداء - بداية
  const startTime = performance.now();

  // تحسين: استخدام cache محلي أولاً
  const getCachedData = (key: string) => {
    const cached = globalStoreDataCache[key];
    const timestamp = globalCacheTimestamp[key];
    
    if (cached && timestamp && (Date.now() - timestamp) < CACHE_DURATION) {
      return cached;
    }
    return null;
  };

  const setCachedData = (key: string, data: any) => {
    globalStoreDataCache[key] = data;
    globalCacheTimestamp[key] = Date.now();
  };

  // جلب جميع البيانات معاً في استدعاء واحد محسن
  const {
    data: storeData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['shared-store-data', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return null;
      }
      
      // تحقق من cache محلي أولاً
      const cacheKey = `store-data-${organizationId}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const fetchStartTime = performance.now();
      
      try {
        // استدعاء متوازي لجميع البيانات المطلوبة
        const parallelStart = performance.now();
        
        const [orgSettings, productsResponse, categoriesResponse] = await Promise.all([
          getOrganizationSettings(organizationId).catch(err => {
            return null;
          }),
          supabase
            .from('products')
            .select(`
              id, name, description, price, compare_at_price, 
              thumbnail_image, images, stock_quantity, 
              is_featured, is_new, category_id, slug,
              category:category_id(id, name, slug),
              subcategory:subcategory_id(id, name, slug)
            `)
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(200),
          supabase
            .from('product_categories')
            .select('id, name, slug, image_url, is_active, updated_at')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('name', { ascending: true })
            .limit(100)
        ]);

        const parallelEnd = performance.now();

        if (productsResponse.error) {
          throw productsResponse.error;
        }
        if (categoriesResponse.error) {
          throw categoriesResponse.error;
        }

        const products = productsResponse.data || [];
        let categories = categoriesResponse.data || [];
        
        categories.forEach((cat, index) => {
        });
        
        // إضافة cache busting للصور
        categories = categories.map(category => ({
          ...category,
          image_url: category.image_url ? 
            (category.image_url.includes('?') ? 
              `${category.image_url.split('?')[0]}?v=${new Date(category.updated_at || Date.now()).getTime()}` : 
              `${category.image_url}?v=${new Date(category.updated_at || Date.now()).getTime()}`
            ) : category.image_url
        }));
        
        categories.forEach((cat, index) => {
        });
        
        const featuredProducts = products.filter(product => product.is_featured);

        const result = {
          organization: currentOrganization,
          organizationSettings: orgSettings,
          products,
          categories,
          featuredProducts
        };

        // حفظ في cache محلي
        setCachedData(cacheKey, result);
        
        const fetchEndTime = performance.now();

        // تحميل الصور مسبقاً في الخلفية
        setTimeout(() => {
          const preloadStart = performance.now();
          
          preloadImages(products, categories);
          
          const preloadEnd = performance.now();
        }, 100);

        return result;
      } catch (error) {
        const errorTime = performance.now();
        throw error;
      }
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 10 * 60 * 1000, // 10 دقائق
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // تحسين الأداء بإعطاء أولوية عالية
    networkMode: 'online',
    retry: 1, // تقليل المحاولات
    retryDelay: 500, // تقليل التأخير
  });

  // تتبع حالة التحميل
  const endTime = performance.now();

  // دالة لتحديث البيانات
  const refreshData = () => {
    const refreshStart = performance.now();
    
    if (organizationId) {
      const cacheKey = `store-data-${organizationId}`;
      delete globalStoreDataCache[cacheKey];
      delete globalCacheTimestamp[cacheKey];
    }
    
    queryClient.invalidateQueries({ queryKey: ['shared-store-data', organizationId] });
    
    const refreshEnd = performance.now();
  };

  // إرجاع البيانات بشكل منظم
  return {
    organization: storeData?.organization || null,
    organizationSettings: storeData?.organizationSettings || null,
    products: storeData?.products || [],
    categories: storeData?.categories || [],
    featuredProducts: storeData?.featuredProducts || [],
    isLoading,
    error: error?.message || null,
    refreshData
  };
};
