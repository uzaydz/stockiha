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
    
    // 🔍 Debug: تشخيص استجابة API
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [fetchUnifiedProductData] استجابة API الخام:', {
        hasResponse: !!productResponse,
        responseKeys: productResponse ? Object.keys(productResponse) : [],
        success: productResponse?.success,
        hasData: !!(productResponse as any)?.data,
        hasProduct: !!(productResponse as any)?.product,
        dataKeys: (productResponse as any)?.data ? Object.keys((productResponse as any).data) : 'no data',
        productId: (productResponse as any)?.product?.id || (productResponse as any)?.data?.product?.id || 'no product id'
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
    if (process.env.NODE_ENV === 'development') {
    }
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
  
  // 🔥 إصلاح: معالجة البيانات المغلفة في RPC function
  if (responseData && typeof responseData === 'object' && responseData.get_product_complete_data_ultra_optimized) {
    responseData = responseData.get_product_complete_data_ultra_optimized;
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
