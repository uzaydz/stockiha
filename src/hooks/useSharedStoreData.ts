import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase-client';
import { getOrganizationSettings } from '@/lib/api/settings';
import { useMemo, useCallback } from 'react';

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

// تقليل الـ logging المفرط
let logCounter = 0;
const MAX_LOGS_PER_SESSION = 5;

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
    if (logCounter < MAX_LOGS_PER_SESSION) {
    }
  });
};

// خيارات Hook البيانات المشتركة
interface UseSharedStoreDataOptions {
  includeCategories?: boolean;
  includeProducts?: boolean;
  includeFeaturedProducts?: boolean;
}

// Hook مشترك لجلب بيانات المتجر مرة واحدة مع تحسينات الأداء
export const useSharedStoreData = (options: UseSharedStoreDataOptions = {}) => {
  const {
    includeCategories = true,
    includeProducts = true,
    includeFeaturedProducts = true
  } = options;
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  const organizationId = currentOrganization?.id;

  // تتبع الأداء - بداية (مقيد)
  const startTime = performance.now();
  if (logCounter < MAX_LOGS_PER_SESSION) {
    logCounter++;
  }

  // تحسين: استخدام cache محلي أولاً
  const getCachedData = (key: string) => {
    const cached = globalStoreDataCache[key];
    const timestamp = globalCacheTimestamp[key];
    
    if (cached && timestamp && (Date.now() - timestamp) < CACHE_DURATION) {
      if (logCounter < MAX_LOGS_PER_SESSION) {
      }
      return cached;
    }
    return null;
  };

  const setCachedData = (key: string, data: any) => {
    globalStoreDataCache[key] = data;
    globalCacheTimestamp[key] = Date.now();
    if (logCounter < MAX_LOGS_PER_SESSION) {
    }
  };

  // جلب جميع البيانات معاً في استدعاء واحد محسن
  const {
    data: storeData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['shared-store-data', organizationId, includeCategories, includeProducts, includeFeaturedProducts],
    queryFn: async () => {
      if (!organizationId) {
        if (logCounter < MAX_LOGS_PER_SESSION) {
        }
        return null;
      }
      
      // تحقق من cache محلي أولاً
      const cacheKey = `store-data-${organizationId}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        if (logCounter < MAX_LOGS_PER_SESSION) {
        }
        return cachedData;
      }
      
      const fetchStartTime = performance.now();
      if (logCounter < MAX_LOGS_PER_SESSION) {
      }
      
      try {
        // استدعاء متوازي لجميع البيانات المطلوبة
        if (logCounter < MAX_LOGS_PER_SESSION) {
        }
        const parallelStart = performance.now();
        
        // جلب البيانات بناءً على الخيارات
        const orgSettings = await getOrganizationSettings(organizationId).catch(err => {
          if (logCounter < MAX_LOGS_PER_SESSION) {
          }
          return null;
        });

        // جلب المنتجات إذا كان مطلوباً
        const productsResponse = includeProducts 
          ? await supabase
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
              .limit(200)
          : { data: [], error: null };

        // جلب الفئات إذا كان مطلوباً
        const categoriesResponse = includeCategories
          ? await supabase
              .from('product_categories')
              .select('id, name, slug, image_url, is_active')
              .eq('organization_id', organizationId)
              .eq('is_active', true)
              .order('name', { ascending: true })
              .limit(100)
          : { data: [], error: null };

        const parallelEnd = performance.now();
        if (logCounter < MAX_LOGS_PER_SESSION) {
        }

        if (productsResponse.error) {
          if (logCounter < MAX_LOGS_PER_SESSION) {
          }
          throw productsResponse.error;
        }
        if (categoriesResponse.error) {
          if (logCounter < MAX_LOGS_PER_SESSION) {
          }
          throw categoriesResponse.error;
        }

        const products = productsResponse.data || [];
        const categories = categoriesResponse.data || [];
        const featuredProducts = includeFeaturedProducts && includeProducts 
          ? products.filter(product => product.is_featured)
          : [];

        if (logCounter < MAX_LOGS_PER_SESSION) {
        }

        // 🔍 تشخيص: عرض محتوى إعدادات المؤسسة الفعلي
        if (logCounter < MAX_LOGS_PER_SESSION && orgSettings) {
        } else if (logCounter < MAX_LOGS_PER_SESSION) {
        }

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
        if (logCounter < MAX_LOGS_PER_SESSION) {
        }

        // تحميل الصور مسبقاً في الخلفية
        setTimeout(() => {
          const preloadStart = performance.now();
          if (logCounter < MAX_LOGS_PER_SESSION) {
          }
          
          preloadImages(products, categories);
          
          const preloadEnd = performance.now();
          if (logCounter < MAX_LOGS_PER_SESSION) {
          }
        }, 100);

        return result;
      } catch (error) {
        const errorTime = performance.now();
        if (logCounter < MAX_LOGS_PER_SESSION) {
        }
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
  if (logCounter < MAX_LOGS_PER_SESSION) {
  }

  // دالة لتحديث البيانات
  const refreshData = useCallback(() => {
    if (logCounter < MAX_LOGS_PER_SESSION) {
    }
    const refreshStart = performance.now();
    
    if (organizationId) {
      const cacheKey = `store-data-${organizationId}`;
      delete globalStoreDataCache[cacheKey];
      delete globalCacheTimestamp[cacheKey];
      if (logCounter < MAX_LOGS_PER_SESSION) {
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['shared-store-data', organizationId] });
    
    const refreshEnd = performance.now();
    if (logCounter < MAX_LOGS_PER_SESSION) {
    }
  }, [organizationId, queryClient]);

  // إرجاع البيانات بشكل منظم (محسن مع memoization)
  return useMemo(() => ({
    organization: storeData?.organization || null,
    organizationSettings: storeData?.organizationSettings || null,
    products: storeData?.products || [],
    categories: storeData?.categories || [],
    featuredProducts: storeData?.featuredProducts || [],
    isLoading,
    error: error?.message || null,
    refreshData
  }), [storeData, isLoading, error, refreshData]);
};
