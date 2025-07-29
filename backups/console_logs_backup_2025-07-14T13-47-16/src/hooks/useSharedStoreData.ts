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

// دالة لجلب بيانات المؤسسة
async function fetchOrganizationData(organizationId: string) {
  console.log(`🔄 [useSharedStoreData] Fetching data for organization: ${organizationId}`);
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
    console.log(`⚡ [useSharedStoreData] Parallel fetch completed in ${endTime - startTime}ms`);

    // معالجة النتائج
    const organization = organizationResult.status === 'fulfilled' ? organizationResult.value.data : null;
    const organizationSettings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
    const products = productsResult.status === 'fulfilled' ? (productsResult.value.data || []) : [];
    const categories = categoriesResult.status === 'fulfilled' ? (categoriesResult.value.data || []) : [];

    // طباعة تفاصيل النتائج للتشخيص
    console.log(`🔍 [useSharedStoreData] Results details:`, {
      organizationResult: organizationResult.status,
      settingsResult: settingsResult.status,
      productsResult: productsResult.status,
      categoriesResult: categoriesResult.status,
      organization: organization,
      products: products?.length || 0,
      categories: categories?.length || 0,
      categoriesData: categories
    });

    // فحص مفصل للفئات
    if (categoriesResult.status === 'fulfilled') {
      console.log('🗂️ [useSharedStoreData] Categories detailed analysis:', {
        rawResult: categoriesResult.value,
        dataLength: categoriesResult.value?.data?.length || 0,
        data: categoriesResult.value?.data,
        error: categoriesResult.value?.error,
        errorDetails: categoriesResult.value?.error ? {
          message: categoriesResult.value.error.message,
          code: categoriesResult.value.error.code,
          details: categoriesResult.value.error.details,
          hint: categoriesResult.value.error.hint
        } : null
      });
    } else {
      console.log('❌ [useSharedStoreData] Categories result rejected:', {
        reason: categoriesResult.reason,
        error: categoriesResult.reason?.message
      });
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
    console.log(`🖼️ [useSharedStoreData] Images preloaded in ${imagePreloadEnd - imagePreloadStart}ms`);

    const totalTime = performance.now() - startTime;
    console.log(`✅ [useSharedStoreData] Data fetched successfully in ${totalTime}ms`);

    return result;
  } catch (error) {
    console.error('❌ [useSharedStoreData] Error fetching data:', error);
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
      console.log(`👑 [useSharedStoreData] Primary instance set: ${id}`);
    }
    
    console.log(`📊 [useSharedStoreData] Active instances: ${activeInstances.size}`);
    
    return () => {
      activeInstances.delete(id);
      if (primaryInstance === id) {
        primaryInstance = activeInstances.size > 0 ? Array.from(activeInstances)[0] : null;
        if (primaryInstance) {
          console.log(`👑 [useSharedStoreData] Primary instance transferred: ${primaryInstance}`);
        }
      }
      console.log(`📊 [useSharedStoreData] Instance removed: ${id}, remaining: ${activeInstances.size}`);
    };
  }, []);

  // تتبع التغييرات في البيانات
  const previousData = useRef<any>({});

  const { currentOrganization } = useTenant();
  const centralOrgId = currentOrganization?.id;
  const queryClient = useQueryClient();

  console.log('🔍 [useSharedStoreData] Debug tenant data:', {
    centralOrgId,
    currentOrganization: currentOrganization
  });

  useEffect(() => {
    // console.log(`🔄 [useSharedStoreData] Render #${renderCount.current} (${instanceId.current})`);
    
    // تحذير من التحديثات المتكررة - فقط للمثيل الأساسي
    if (primaryInstance === instanceId.current && renderCount.current > 5) {
      console.warn(`⚠️ [useSharedStoreData] تحديث متكرر (#${renderCount.current})`);
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
        console.log(`${logMessage} [useSharedStoreData] ${key} changed: ${previous} → ${current}`);
      }
    });

    previousData.current = currentData;
  });

  // استخدام React Query مع تحسينات
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['shared-store-data', centralOrgId],
    queryFn: () => {
      if (!centralOrgId) {
        throw new Error('Organization ID is required');
      }

      // فقط المثيل الأساسي يجلب البيانات
      if (primaryInstance !== instanceId.current) {
        console.log(`🔄 [useSharedStoreData] Non-primary instance using cache: ${instanceId.current}`);
        
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
        console.log(`💾 [useSharedStoreData] Using cached data for ${centralOrgId}`);
        return Promise.resolve(cachedData);
      }

      return fetchOrganizationData(centralOrgId);
    },
    enabled: !!centralOrgId,
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

    console.log(`📋 [useSharedStoreData] Current state:`, currentState);
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
