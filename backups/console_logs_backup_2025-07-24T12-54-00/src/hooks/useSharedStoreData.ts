import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase-client';
import { getOrganizationSettings } from '@/lib/api/settings';
import { useRef, useEffect } from 'react';

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

// Singleton instance tracker
let activeInstances = new Set<string>();
let primaryInstance: string | null = null;

// تعرض global cache للـ window للوصول من data-refresh-helpers
if (typeof window !== 'undefined') {
  (window as any).globalStoreDataCache = globalStoreDataCache;
  (window as any).globalCacheTimestamp = globalCacheTimestamp;
}

// دالة آمنة لاستخدام useTenant مع معالجة الأخطاء
function useTenantSafe() {
  try {
    return useTenant();
  } catch (error) {
    // إذا لم يكن TenantProvider متاحاً، أرجع قيم افتراضية
    if (error instanceof Error && error.message.includes('useTenant must be used within a TenantProvider')) {
      return {
        currentOrganization: null,
        isLoading: false,
        error: null
      };
    }
    // إعادة رمي الأخطاء الأخرى
    throw error;
  }
}

// دالة لجلب بيانات المؤسسة
async function fetchOrganizationData(organizationId: string) {
  const startTime = performance.now();

  try {
    // جلب البيانات بشكل متوازي
    const [organizationResult, settingsResult, productsResult, categoriesResult] = await Promise.allSettled([
      // جلب بيانات المؤسسة
      supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single(),
      
      // جلب إعدادات المؤسسة
      getOrganizationSettings(organizationId),
      
      // جلب المنتجات
      supabase
        .from('products')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true),
      
      // جلب الفئات
      supabase
        .from('product_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
    ]);

    const endTime = performance.now();

    // معالجة النتائج
    const organization = organizationResult.status === 'fulfilled' ? organizationResult.value.data : null;
    const organizationSettings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
    const products = productsResult.status === 'fulfilled' ? (productsResult.value.data || []) : [];
    const categories = categoriesResult.status === 'fulfilled' ? (categoriesResult.value.data || []) : [];

    // طباعة تفاصيل النتائج للتشخيص

    // فحص مفصل للفئات
    if (categoriesResult.status === 'fulfilled') {
    } else {
    }

    // إعداد المنتجات المميزة
    const featuredProducts = products.filter((product: any) => product.is_featured).slice(0, 8);

    const result = {
      organization,
      organizationSettings,
      products,
      categories,
      featuredProducts,
      isLoading: false,
      error: null
    };

    // حفظ في الـ cache العام
    globalStoreDataCache[organizationId] = result;
    globalCacheTimestamp[organizationId] = Date.now();

    // Preload images
    const imagePreloadStart = performance.now();
    const imagesToPreload = products.slice(0, 6).map((product: any) => product.image_url).filter(Boolean);
    if (imagesToPreload.length > 0) {
      await Promise.allSettled(
        imagesToPreload.map((url: string) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
          });
        })
      );
    }
    const imagePreloadEnd = performance.now();

    const totalTime = performance.now() - startTime;

    return result;
  } catch (error) {
    const errorResult = {
      organization: null,
      organizationSettings: null,
      products: [],
      categories: [],
      featuredProducts: [],
      isLoading: false,
      error: error instanceof Error ? error.message : 'حدث خطأ في جلب البيانات'
    };

    // حفظ الخطأ في الـ cache أيضاً لتجنب إعادة المحاولة المستمرة
    globalStoreDataCache[organizationId] = errorResult;
    globalCacheTimestamp[organizationId] = Date.now();

    return errorResult;
  }
}

// Hook لاستخدام البيانات المشتركة للمتجر
export function useSharedStoreData(): SharedStoreData & { refreshData: () => void } {
  // تتبع عدد التحديثات
  const renderCount = useRef(0);
  renderCount.current += 1;

  // إنشاء معرف فريد لهذا المثيل
  const instanceId = useRef(`instance-${Math.random().toString(36).substr(2, 9)}`);
  
  // تسجيل هذا المثيل
  useEffect(() => {
    const id = instanceId.current;
    activeInstances.add(id);
    
    // إذا كان هذا أول مثيل، اجعله المثيل الأساسي
    if (!primaryInstance) {
      primaryInstance = id;
    }

    return () => {
      activeInstances.delete(id);
      if (primaryInstance === id) {
        primaryInstance = activeInstances.size > 0 ? Array.from(activeInstances)[0] : null;
        if (primaryInstance) {
        }
      }
    };
  }, []);

  // تتبع التغييرات في البيانات
  const previousData = useRef<any>({});

  const { currentOrganization } = useTenantSafe();
  const centralOrgId = currentOrganization?.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    // console.log(`🔄 [useSharedStoreData] Render #${renderCount.current} (${instanceId.current})`);
    
    // تحذير من التحديثات المتكررة - فقط للمثيل الأساسي
    if (primaryInstance === instanceId.current && renderCount.current > 5) {
      // console.trace();
    }

    // تتبع التغييرات في البيانات
    const currentData = {
      productsCount: data?.products?.length || 0,
      categoriesCount: data?.categories?.length || 0,
      isLoading: data?.isLoading || false,
      hasError: !!data?.error,
      organizationId: centralOrgId
    };

    Object.keys(currentData).forEach(key => {
      const current = (currentData as any)[key];
      const previous = previousData.current[key];
      if (current !== previous) {
        const logMessage = {
          productsCount: '📦',
          categoriesCount: '📊', 
          isLoading: '⏳',
          hasError: '❌',
          organizationId: '🏢'
        }[key] || '📋';
      }
    });

    previousData.current = currentData;
  });

  // استخدام React Query مع تحسينات
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['shared-store-data', centralOrgId],
    queryFn: () => {
      if (!centralOrgId) {
        // إرجاع بيانات افتراضية بدلاً من خطأ
        return Promise.resolve({
          organization: null,
          organizationSettings: null,
          products: [],
          categories: [],
          featuredProducts: [],
          isLoading: false,
          error: null
        });
      }

      // فقط المثيل الأساسي يجلب البيانات
      if (primaryInstance !== instanceId.current) {
        
        // استخدام البيانات من الـ cache
        const cachedData = globalStoreDataCache[centralOrgId];
        if (cachedData) {
          return Promise.resolve(cachedData);
        }
      }

      // التحقق من الـ cache العام أولاً
      const cachedData = globalStoreDataCache[centralOrgId];
      const cacheTime = globalCacheTimestamp[centralOrgId];
      
      if (cachedData && cacheTime && (Date.now() - cacheTime) < CACHE_DURATION) {
        return Promise.resolve(cachedData);
      }

      return fetchOrganizationData(centralOrgId);
    },
    enabled: true, // تم تمكينه دائماً لأننا نتعامل مع الحالة داخل queryFn
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 10 * 60 * 1000, // 10 دقائق
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // تسجيل الحالة الحالية
  useEffect(() => {
    const currentState = {
      productsCount: data?.products?.length || 0,
      categoriesCount: data?.categories?.length || 0,
      isLoading: isLoading,
      hasError: !!error,
      organizationId: centralOrgId,
      instanceId: instanceId.current,
      isPrimary: primaryInstance === instanceId.current
    };

  }, [data, isLoading, error, centralOrgId]);

  // دالة لتحديث البيانات
  const refreshData = () => {
    if (centralOrgId) {
      // مسح الـ cache
      delete globalStoreDataCache[centralOrgId];
      delete globalCacheTimestamp[centralOrgId];
      
      // إعادة جلب البيانات
      refetch();
    }
  };

  // إرجاع البيانات مع قيم افتراضية
  return {
    organization: data?.organization || null,
    organizationSettings: data?.organizationSettings || null,
    products: data?.products || [],
    categories: data?.categories || [],
    featuredProducts: data?.featuredProducts || [],
    isLoading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'حدث خطأ في جلب البيانات') : null,
    refreshData
  };
}
