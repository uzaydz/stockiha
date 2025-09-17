/**
 * ProductDataFetcher - جلب بيانات المنتج
 * ملف منفصل لتحسين الأداء وسهولة الصيانة
 */

import type { 
  UnifiedProductPageData, 
  ProductFetchOptions,
  ProductApiResponse 
} from './ProductDataTypes';
import { getProductCompleteDataOptimized } from '@/lib/api/deduplicatedApi';

/**
 * ثوابت جلب البيانات
 */
const FETCH_CONSTANTS = {
  TIMEOUT: 10000, // 10 ثوان
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

/**
 * دالة جلب البيانات الموحدة باستخدام الـ APIs الموجودة
 */
export async function fetchUnifiedProductData(
  productId: string, 
  options: ProductFetchOptions = {}
): Promise<UnifiedProductPageData> {
  
      const { organizationId, dataScope = 'full' as const, forceRefresh = false } = options; // تقليل الحمولة الافتراضية؛ اجلب ultra عند الحاجة فقط
  
  

  try {
    // استخدام الـ API الموحد لجلب بيانات المنتج مع منع التكرار
    
    const productResponse = await getProductCompleteDataOptimized(productId, {
      organizationId,
      dataScope,
      forceRefresh // ✅ استخدام قيمة forceRefresh من المعاملات
    });
    
    // 🔍 Debug: تشخيص استجابة API - مفصل أكثر في الإنتاج
    if (process.env.NODE_ENV === 'development' || true) { // تمكين في الإنتاج مؤقتاً للتشخيص
      console.log('🔍 [fetchUnifiedProductData] استجابة API الخام:', {
        hasResponse: !!productResponse,
        responseKeys: productResponse ? Object.keys(productResponse) : [],
        success: productResponse?.success,
        dataType: (productResponse as any)?.data_type,
        hasData: !!(productResponse as any)?.data,
        hasProduct: !!(productResponse as any)?.product,
        hasBasic: !!(productResponse as any)?.basic,
        hasExtended: !!(productResponse as any)?.extended || !!(productResponse as any)?.product_extended,
        combined: !!(productResponse as any)?.combined,
        dataKeys: (productResponse as any)?.data ? Object.keys((productResponse as any).data) : 'no data',
        productId: (productResponse as any)?.product?.id || (productResponse as any)?.data?.product?.id || (productResponse as any)?.basic?.product?.id || 'no product id'
      });
    }
    


    // 🔥 إصلاح: معالجة أفضل للأخطاء
    if (!productResponse) {
      throw new Error('لم يتم استلام استجابة من الخادم');
    }
    
    if (productResponse.success === false) {
      throw new Error(productResponse.error || 'فشل في جلب بيانات المنتج');
    }
    
    if (!productResponse.data && !productResponse.product) {
      throw new Error('المنتج غير موجود أو غير متاح');
    }

    // معالجة البيانات المستلمة
    const processedData = processProductResponse(productResponse, organizationId);

    // 🚀 تسجيل معلومات صور الألوان للتشخيص
    if (process.env.NODE_ENV === 'development') {
      if (productResponse.product?.variants?.colors) {
      }
    }

    return processedData;

  } catch (error) {
    console.error('❌ [fetchUnifiedProductData] خطأ في جلب البيانات:', {
      error: error instanceof Error ? error.message : error,
      productId,
      options,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * معالجة استجابة API المنتج
 */
function processProductResponse(
  response: ProductApiResponse, 
  organizationId?: string
): UnifiedProductPageData {
  
  // 🔥 إصلاح: معالجة متقدمة لاستخراج البيانات من مختلف الهياكل
  let responseData = (response as any).data || response;

  // 🔥 إصلاح: معالجة البيانات المغلفة في API الجديد
  if (responseData && typeof responseData === 'object') {
    console.log('🔍 [processProductResponse] فحص بنية البيانات:', {
      hasProduct: !!responseData.product,
      hasBasic: !!responseData.basic,
      hasExtended: responseData.extended !== undefined,
      hasCombined: !!responseData.combined,
      dataType: responseData.data_type,
      hasProductExtended: !!responseData.product_extended
    });
    
    // ✅ تحديث: التحقق من البيانات الجديدة المدمجة مع المنتج المدمج
    if (responseData.product && responseData.basic && responseData.extended !== undefined) {
      console.log('🚀 [processProductResponse] استخدام البيانات المدمجة');
      // البيانات من API الجديد المدمج - استخدم المنتج المدمج مباشرة
      responseData = {
        product: responseData.product, // المنتج المدمج الذي تم إنشاؤه في productUltraFastApi.ts
        stats: responseData.stats || responseData.basic.stats,
        // الاحتفاظ بالبيانات المتقدمة المنفصلة للتوافق
        ...(responseData.extended?.product_extended && {
          extended: responseData.extended.product_extended
        })
      };
    }
    // 🚀 إصلاح جديد: التعامل مع البيانات المتقدمة فقط (data_type: "extended")
    else if (responseData.data_type === 'extended' && responseData.product_extended) {
      console.log('🚀 [processProductResponse] استخدام البيانات المتقدمة فقط (extended)');
      // إنشاء منتج وهمي بناءً على البيانات المتقدمة
      const extendedProduct = responseData.product_extended;
      const pseudoProduct = {
        id: extendedProduct.product_id,
        organization_id: extendedProduct.organization_id,
        // استخراج البيانات الأساسية من البيانات المتقدمة
        variants: {
          has_variants: extendedProduct.variants_extended?.has_variants || false,
          use_sizes: extendedProduct.variants_extended?.use_sizes || false,
          use_variant_prices: false,
          // استخدام colors_with_details كألوان أساسية
          colors: extendedProduct.variants_extended?.colors_with_details || []
        },
        // 🚀 إصلاح: تحويل forms_extended إلى form_data
        form_data: (() => {
          const formsExtended = extendedProduct.forms_extended;
          if (!formsExtended) return null;
          
          // إعطاء الأولوية للنموذج المخصص، وإلا استخدم الافتراضي
          if (formsExtended.custom_form) {
            return {
              ...formsExtended.custom_form,
              type: 'custom'
            };
          } else if (formsExtended.default_form) {
            return {
              ...formsExtended.default_form,
              type: 'default'
            };
          }
          return null;
        })(),
        // إضافة الحقول الضرورية الأخرى
        ...extendedProduct,
        // دمج البيانات المتقدمة
        features_and_specs: extendedProduct.features_and_specs,
        advanced_pricing: extendedProduct.advanced_pricing,
        shipping_extended: extendedProduct.shipping_extended,
        variants_extended: extendedProduct.variants_extended,
        images_extended: extendedProduct.images_extended,
        forms_extended: extendedProduct.forms_extended
      };
      
      responseData = {
        product: pseudoProduct,
        stats: responseData.extended_stats || {},
        extended: extendedProduct
      };
    }
    // التحقق من البيانات الجديدة بدون دمج (للتوافق مع الإصدارات القديمة)
    else if (responseData.basic && responseData.extended !== undefined) {
      console.log('🔍 [processProductResponse] استخدام البيانات الجديدة بدون دمج');
      // البيانات من API الجديد بدون دمج - استخدم البيانات الأساسية
      responseData = {
        product: responseData.basic.product,
        stats: responseData.basic.stats,
        // دمج البيانات المتقدمة إذا كانت متوفرة
        ...(responseData.extended?.product_extended && {
          extended: responseData.extended.product_extended
        })
      };
    }
    // التحقق من البنية المباشرة لـ RPC القديم (للتوافق)
    else if (responseData.get_product_complete_data_ultra_optimized) {
      console.log('🔍 [processProductResponse] استخدام البيانات القديمة المباشرة');
      responseData = responseData.get_product_complete_data_ultra_optimized;
    }
    // التحقق من البيانات المغلفة في RPC داخل data
    else if (responseData.data && typeof responseData.data === 'object' && responseData.data.get_product_complete_data_ultra_optimized) {
      console.log('🔍 [processProductResponse] استخدام البيانات القديمة في data');
      responseData = responseData.data.get_product_complete_data_ultra_optimized;
    }
    // 🚀 Fallback: إذا لم تطابق أي حالة
    else {
      console.log('🔄 [processProductResponse] لم تطابق أي حالة معروفة، استخدام البيانات كما هي');
    }
  }

  const { product, stats } = responseData;
  
  // 🔍 Debug: تشخيص بنية البيانات الواردة
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [processProductResponse] بنية البيانات الواردة:', {
      hasResponse: !!response,
      hasResponseData: !!responseData,
      hasProduct: !!product,
      productId: product?.id,
      responseKeys: response ? Object.keys(response) : [],
      responseDataKeys: responseData ? Object.keys(responseData) : [],
      productKeys: product ? Object.keys(product) : []
    });
  }
  
  
  // استخراج البيانات الأساسية
  const organization = product?.organization || null;
  const categories = product?.categories ? [product.categories] : [];
  
  // 🔥 إصلاح: التأكد من وجود المنتج قبل إنشاء البيانات الموحدة
  if (!product) {
    console.error('❌ [processProductResponse] المنتج غير موجود:', {
      responseKeys: responseData ? Object.keys(responseData) : [],
      hasResponseData: !!responseData,
      responseDataType: typeof responseData
    });
    throw new Error('المنتج غير موجود في البيانات المستلمة');
  }
  
  // إنشاء البيانات الموحدة
  const unifiedData: UnifiedProductPageData = {
    product,
    organization,
    organizationSettings: extractOrganizationSettings(organization),
    visitorAnalytics: extractVisitorAnalytics(stats),
    categories,
    provinces: extractProvinces(product),
    trackingData: stats || {}
  };

  // 🔍 Debug: تأكيد إنشاء البيانات الموحدة
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ [processProductResponse] البيانات الموحدة تم إنشاؤها:', {
      hasProduct: !!unifiedData.product,
      productId: unifiedData.product?.id,
      hasOrganization: !!unifiedData.organization,
      organizationId: unifiedData.organization?.id
    });
  }

  return unifiedData;
}

/**
 * استخراج إعدادات المؤسسة
 */
function extractOrganizationSettings(organization: any): any {
  if (!organization) return null;

  return {
    theme: organization.theme || 'default',
    language: organization.language || 'ar',
    currency: organization.currency || 'SAR',
    timezone: organization.timezone || 'Asia/Riyadh',
    features: organization.features || {}
  };
}

/**
 * استخراج تحليلات الزوار
 */
function extractVisitorAnalytics(stats: any): any {
  if (!stats) return null;

  return {
    totalVisitors: stats.total_visitors || 0,
    uniqueVisitors: stats.unique_visitors || 0,
    pageViews: stats.page_views || 0,
    averageTimeOnPage: stats.avg_time_on_page || 0,
    bounceRate: stats.bounce_rate || 0
  };
}

/**
 * استخراج المحافظات
 */
function extractProvinces(product: any): any[] {
  if (!product || !product.location) return [];

  const provinces = [];
  
  if (product.location.province) {
    provinces.push(product.location.province);
  }
  
  if (product.location.city) {
    provinces.push(product.location.city);
  }

  return provinces;
}

/**
 * دالة جلب البيانات مع retry
 */
export async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  retryAttempts: number = FETCH_CONSTANTS.RETRY_ATTEMPTS
): Promise<T> {
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === retryAttempts) {
        break;
      }
      
      // انتظار قبل المحاولة التالية
      await new Promise(resolve => setTimeout(resolve, FETCH_CONSTANTS.RETRY_DELAY * attempt));
      
      if (process.env.NODE_ENV === 'development') {
      }
    }
  }
  
  throw lastError!;
}

/**
 * دالة جلب البيانات مع timeout
 */
export async function fetchWithTimeout<T>(
  fetcher: Promise<T>,
  timeoutMs: number = FETCH_CONSTANTS.TIMEOUT
): Promise<T> {
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`انتهت مهلة الطلب (${timeoutMs}ms)`));
    }, timeoutMs);
  });

  return Promise.race([fetcher, timeoutPromise]);
}

/**
 * دالة جلب البيانات المحسنة
 */
export async function fetchEnhancedProductData(
  productId: string,
  options: ProductFetchOptions = {}
): Promise<UnifiedProductPageData> {
  
  const enhancedFetcher = () => fetchUnifiedProductData(productId, options);
  
  try {
    // استخدام retry و timeout
    return await fetchWithTimeout(
      fetchWithRetry(enhancedFetcher),
      FETCH_CONSTANTS.TIMEOUT
    );
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
    throw error;
  }
}
