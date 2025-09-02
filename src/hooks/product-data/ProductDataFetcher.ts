/**
 * ProductDataFetcher - جلب بيانات المنتج
 * ملف منفصل لتحسين الأداء وسهولة الصيانة
 */

import type { 
  UnifiedProductPageData, 
  ProductFetchOptions,
  ProductApiResponse 
} from './ProductDataTypes';

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
  
      const { organizationId, dataScope = 'ultra' as const, forceRefresh = false } = options; // ✅ عدم إجبار تحديث البيانات للسماح باستخدام Cache
  
  if (process.env.NODE_ENV === 'development') {
  }

  try {
    // استخدام الـ API الموحد لجلب بيانات المنتج مع منع التكرار
    const { getProductCompleteDataOptimized } = await import('@/lib/api/deduplicatedApi');

    const productResponse = await getProductCompleteDataOptimized(productId, {
      organizationId,
      dataScope,
      forceRefresh // ✅ استخدام قيمة forceRefresh من المعاملات
    });

    if (!productResponse || productResponse.success === false) {
      throw new Error('فشل في جلب بيانات المنتج');
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
  
  const { product, stats } = response;
  
  // استخراج البيانات الأساسية
  const organization = product?.organization || null;
  const categories = product?.categories ? [product.categories] : [];
  
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
