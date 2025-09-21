import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getProductCompleteData,
  CompleteProduct, 
  DataScope,
  clearProductCache
} from '@/lib/api/productComplete';
// استخدم النسخة الموحّدة المانعة للتكرار لتجنّب الازدواجية بين المكونات
import { getProductCompleteDataOptimized as getProductCompleteDataOptimizedDedup } from '@/lib/api/deduplicatedApi';
import { useProductCache } from './useProductCache';

interface UseProductDataProps {
  productId?: string;
  organizationId?: string;
  dataScope?: DataScope;
  enabled?: boolean;
  preloadedProduct?: CompleteProduct;
  skipInitialFetch?: boolean;
}

interface ProductDataState {
  product: CompleteProduct | null;
  loading: boolean;
  error: string | null;
}

interface ProductDataActions {
  fetchProduct: () => Promise<void>;
  refreshProduct: () => Promise<void>;
  clearError: () => void;
}

// Cache عالمي لمنع الطلبات المكررة
const globalProductCache = new Map<string, {
  data: CompleteProduct;
  timestamp: number;
  ttl: number;
}>();

const PRODUCT_CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

/**
 * Hook لجلب بيانات المنتج - محسن للأداء
 * - يستخدم cache محسن
 * - يمنع الطلبات المكررة
 * - يدعم البيانات المحملة مسبقاً
 * - جلب واحد للبيانات بالنطاق المطلوب
 */
export const useProductData = ({
  productId,
  organizationId,
  dataScope = 'full', // تقليل الحمولة الافتراضية؛ اجلب ultra عند الحاجة فقط
  enabled = true,
  preloadedProduct,
  skipInitialFetch = false
}: UseProductDataProps): [ProductDataState, ProductDataActions] => {
  const cache = useProductCache();
  
  // الحالة الأساسية
  const [product, setProduct] = useState<CompleteProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // refs لتجنب الاستدعاءات المتعددة
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastParamsRef = useRef<string>('');
  const initializedRef = useRef(false);

  // إنشاء مفتاح cache
  const createCacheKey = useCallback((productId: string, organizationId?: string) => {
    return `${productId}-${organizationId || 'public'}`;
  }, []);

  // إنشاء مفتاح فريد للطلب
  const createRequestKey = useCallback((productId: string, organizationId: string | undefined, scope: DataScope, enabled: boolean) => {
    return `${productId}-${organizationId || 'public'}-${scope}-${enabled}`;
  }, []);

  // فحص تطابق البيانات المحملة مسبقاً
  const checkPreloadedData = useCallback((pid: string): boolean => {
    return preloadedProduct && (
      preloadedProduct.id === pid || 
      preloadedProduct.slug === pid
    );
  }, [preloadedProduct]);

  // حفظ في global cache
  const saveToGlobalCache = useCallback((cacheKey: string, data: CompleteProduct) => {
    globalProductCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: PRODUCT_CACHE_TTL
    });
  }, []);

  // مزامنة البيانات المحملة مسبقاً مع الحالة المحلية حتى عند تخطي الجلب الأولي
  useEffect(() => {
    if (!preloadedProduct) return;
    setProduct(prev => (prev?.id === preloadedProduct.id ? prev : preloadedProduct));
    setLoading(false);
    setError(null);
  }, [preloadedProduct?.id]);

  // استخدام البيانات المحملة مسبقاً
  const usePreloadedData = useCallback((pid: string) => {
    if (!preloadedProduct) return false;

    const matches = checkPreloadedData(pid);
    if (matches) {
      

      setProduct(preloadedProduct);
      setLoading(false);
      setError(null);

      // حفظ في cache
      const cacheKey = createCacheKey(pid, organizationId);
      cache.set(cacheKey, preloadedProduct, organizationId);

      // حفظ في global cache أيضاً
      saveToGlobalCache(cacheKey, preloadedProduct);

      return true;
    }

    
    return false;
  }, [preloadedProduct, checkPreloadedData, createCacheKey, organizationId, cache, saveToGlobalCache]);

  // فحص global cache
  const checkGlobalCache = useCallback((cacheKey: string): CompleteProduct | null => {
    const cached = globalProductCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return cached.data;
    }
    return null;
  }, []);

  // جلب بيانات المنتج
  const fetchProduct = useCallback(async () => {
    

    if (!productId || !enabled) {
      
      setError('معرف المنتج غير صحيح أو الجلب معطل');
      setLoading(false);
      return;
    }

    const cacheKey = createCacheKey(productId, organizationId);
    const requestKey = createRequestKey(productId, organizationId, dataScope, enabled);

    // تجنب الطلبات المكررة
    if (fetchingRef.current && lastParamsRef.current === requestKey) {
      return;
    }

    // فحص global cache أولاً
    const globalCached = checkGlobalCache(cacheKey);
    if (globalCached) {
      setProduct(globalCached);
      setLoading(false);
      setError(null);
      return;
    }

    // فحص cache المحلي
    const cached = cache.get(cacheKey);
    if (cached) {
      setProduct(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    // فحص الطلبات النشطة
    if (cache.hasActiveRequest(cacheKey)) {
      const activeRequest = cache.getActiveRequest(cacheKey);
      if (activeRequest) {
        try {
          const result = await activeRequest;
          setProduct(result);
          setLoading(false);
          setError(null);
          return;
        } catch (err) {
          // استمر في الطلب الجديد
        }
      }
    }

    try {
      fetchingRef.current = true;
      lastParamsRef.current = requestKey;
      setLoading(true);
      setError(null); // إعادة تعيين الخطأ

      // جلب البيانات بالنطاق المطلوب مباشرة (بدون ترقية تدريجية)
      const requestPromise = (async () => {
        try {

          // جلب البيانات مع إعادة المحاولة للمشاكل المتقطعة
          let response;
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount <= maxRetries) {
            try {
              // إضافة تأخير قصير إذا لم تكن المؤسسة جاهزة
              if (!organizationId && retryCount > 0) {
                await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
              }

              // محاولة جلب البيانات مع fallback strategies
              try {
                // المحاولة الأولى: الدالة المحسنة عبر API الموحّد مع منع التكرار
                response = await (getProductCompleteDataOptimizedDedup as any)(productId, {
                  organizationId,
                  dataScope: dataScope,
                  forceRefresh: false // ✅ عدم إجبار تحديث البيانات للسماح باستخدام Cache
                });
              } catch (optimizedError) {
                
                // المحاولة الثانية: الدالة العادية
                try {
                  const { getProductCompleteData } = await import('@/lib/api/productComplete');
                  response = await getProductCompleteData(productId, {
                    organizationId,
                    dataScope: dataScope
                  });
                } catch (fallbackError) {
                  
                  // المحاولة الثالثة: استعلام مباشر بسيط
                  if (retryCount === maxRetries - 1) {
                    try {
                      const { supabase } = await import('@/lib/supabase');
                      const { data: simpleData, error: simpleError } = await supabase
                        .from('products')
                        .select('id, name, description, slug, is_active')
                        .or(`id.eq.${productId},slug.eq.${productId}`)
                        .eq('is_active', true)
                        .maybeSingle();
                      
                      if (simpleError || !simpleData) {
                        throw new Error('فشل في جلب بيانات المنتج من جميع المصادر');
                      }
                      
                      // إنشاء استجابة بسيطة
                      response = {
                        success: true,
                        data_scope: 'basic' as any,
                        product: {
                          id: simpleData.id,
                          name: simpleData.name,
                          description: simpleData.description,
                          slug: simpleData.slug,
                          // إضافة بيانات افتراضية
                          pricing: { price: 0 },
                          inventory: { stock_quantity: 0 },
                          images: { thumbnail_image: '' },
                          variants: { has_variants: false, colors: [] },
                          status: { is_active: simpleData.is_active }
                        } as any,
                        stats: {},
                        meta: {}
                      };
                    } catch (simpleError) {
                      throw simpleError;
                    }
                  }
                }
              }

              // إذا نجح الطلب، اخرج من الحلقة
              if (response) {
                break;
              }

              retryCount++;
              if (retryCount <= maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              }

            } catch (retryError) {
              retryCount++;
              if (retryCount > maxRetries) {
                throw retryError;
              }
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }

          // التحقق من صحة الاستجابة
          if (!response) {
            throw new Error('لم يتم إرجاع أي بيانات من الخادم');
          }

          // إذا كانت الاستجابة مصفوفة، خذ العنصر الأول
          const responseData = Array.isArray(response) ? response[0] : response;

          // التحقق من وجود خاصية success
          if (responseData && typeof responseData === 'object' && 'success' in responseData) {
            if (!responseData.success) {
              throw new Error(responseData.error || 'فشل في جلب بيانات المنتج');
            }
          }

          // التحقق من وجود المنتج
          if (!responseData?.product) {
            throw new Error('لم يتم العثور على بيانات المنتج في الاستجابة');
          }

          const productData = responseData.product;

          // حفظ في global cache
          saveToGlobalCache(cacheKey, productData);
          
          // حفظ في cache المحلي
          cache.set(cacheKey, productData, organizationId);
          
          if (mountedRef.current) {
            setProduct(productData);
            setLoading(false);
            setError(null); // تأكد من إزالة أي خطأ سابق
          }

          return productData;
        } catch (err) {
          throw err;
        }
      })();

      // إضافة الطلب إلى الطلبات النشطة
      cache.addActiveRequest(cacheKey, requestPromise);

      await requestPromise;

    } catch (err) {
      if (mountedRef.current) {
        // تأكد من أن المكون لا يزال mounted قبل تعيين الخطأ
        setError('فشل في تحميل بيانات المنتج');
        setLoading(false);
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [productId, organizationId, dataScope, enabled, cache, createCacheKey, createRequestKey, checkGlobalCache, saveToGlobalCache]);

  // تحديث المنتج (بدون cache)
  const refreshProduct = useCallback(async () => {
    if (!productId) return;
    
    // مسح cache
    const cacheKey = createCacheKey(productId, organizationId);
    globalProductCache.delete(cacheKey);
    cache.clear(cacheKey);
    
    await fetchProduct();
  }, [productId, organizationId, cache, createCacheKey, fetchProduct]);

  // مسح الخطأ
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // جلب المنتج عند تغيير المعاملات - مرة واحدة فقط
  useEffect(() => {
    if (initializedRef.current) return;
    
    if (!enabled) {
      setLoading(false);
      initializedRef.current = true;
      return;
    }

    if (!productId) {
      setError('معرف المنتج غير صحيح');
      setLoading(false);
      initializedRef.current = true;
      return;
    }

    // استخدام البيانات المحملة مسبقاً إذا كانت متوفرة
    if (usePreloadedData(productId)) {
      initializedRef.current = true;
      return;
    }

    // فحص global cache
    const cacheKey = createCacheKey(productId, organizationId);
    const globalCached = checkGlobalCache(cacheKey);
    if (globalCached) {
      setProduct(globalCached);
      setLoading(false);
      setError(null);
      initializedRef.current = true;
      return;
    }

    // فحص cache المحلي
    const cached = cache.get(cacheKey);
    if (cached) {
      setProduct(cached.data);
      setLoading(false);
      setError(null);
      initializedRef.current = true;
      return;
    }

    if (skipInitialFetch) {
      setLoading(false);
      initializedRef.current = true;
      return;
    }

    // جلب البيانات مع معالجة أفضل للأخطاء
    const loadProduct = async () => {
      try {
        // تأكد من أن المكون لا يزال mounted
        if (!mountedRef.current) return;
        
        // إعادة تعيين الحالة
        setError(null);
        setLoading(true);
        
        await fetchProduct();
        
        // تأكد من أن المكون لا يزال mounted
        if (!mountedRef.current) return;
        
        // إذا وصلنا هنا، تم جلب البيانات بنجاح
        setError(null);
        
      } catch (err) {
        
        // تأكد من أن المكون لا يزال mounted
        if (!mountedRef.current) return;
        
        // محاولة fallback نهائية
        try {
          const { supabase } = await import('@/lib/supabase');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('products')
            .select('id, name, description, slug, is_active, organization_id')
            .or(`id.eq.${productId},slug.eq.${productId}`)
            .eq('is_active', true)
            .maybeSingle();
          
          if (fallbackError || !fallbackData) {
            throw new Error('فشل في جلب بيانات المنتج من جميع المصادر');
          }
          
          // إنشاء منتج بسيط من البيانات المتوفرة
          const simpleProduct = {
            id: fallbackData.id,
            name: fallbackData.name,
            description: fallbackData.description,
            slug: fallbackData.slug,
            pricing: { price: 0 },
            inventory: { stock_quantity: 0 },
            images: { thumbnail_image: '' },
            variants: { has_variants: false, colors: [] },
            status: { is_active: fallbackData.is_active },
            organization: { id: fallbackData.organization_id }
          } as any;
          
          if (mountedRef.current) {
            setProduct(simpleProduct);
            setLoading(false);
            setError(null);
            initializedRef.current = true;
          }
        } catch (fallbackErr) {
          if (mountedRef.current) {
            setError('فشل في جلب بيانات المنتج من جميع المصادر');
            setLoading(false);
            initializedRef.current = true;
          }
        }
      }
    };

    loadProduct();
  }, [productId, organizationId, dataScope, enabled, skipInitialFetch]);

  // مراقبة تغيير enabled
  useEffect(() => {
    if (!enabled && initializedRef.current) {
      // إذا تم تعطيل useProductData، إيقاف العمل
      setLoading(false);
      setError(null);
      // لا نعيد تعيين initializedRef.current لأننا نريد منع إعادة التهيئة
    }
  }, [enabled]);

  // تنظيف عند unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const state: ProductDataState = {
    product,
    loading,
    error
  };

  const actions: ProductDataActions = {
    fetchProduct,
    refreshProduct,
    clearError
  };

  return [state, actions];
};
