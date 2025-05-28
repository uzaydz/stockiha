/**
 * معالج شامل لأخطاء HTTP 406 (Not Acceptable)
 * يقوم بإعتراض جميع طلبات fetch ومعالجة أخطاء 406 تلقائياً
 */

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

interface RequestStats {
  total: number;
  failed: number;
  retried: number;
  success: number;
}

// إحصائيات الطلبات
let requestStats: RequestStats = {
  total: 0,
  failed: 0,
  retried: 0,
  success: 0
};

// إعدادات إعادة المحاولة
const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 1.5
};

// قائمة الطلبات الفاشلة للمراجعة
const failedRequests: Array<{
  url: string;
  init?: RequestInit;
  timestamp: number;
  error: string;
}> = [];

/**
 * إنشاء رؤوس محسنة للطلبات
 */
function createOptimizedHeaders(originalHeaders?: HeadersInit): Headers {
  const headers = new Headers(originalHeaders);
  
  // رؤوس أساسية محسنة
  headers.set('Accept', 'application/json, application/vnd.pgrst.object+json, text/plain, */*');
  headers.set('Accept-Language', 'ar,en;q=0.9,*;q=0.8');
  headers.set('Accept-Encoding', 'gzip, deflate, br');
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  
  // رؤوس خاصة بـ Supabase
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  // إضافة رؤوس CORS
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Accept-Language, Accept-Encoding');
  
  return headers;
}

/**
 * إنشاء رؤوس مبسطة للمحاولة الثانية
 */
function createSimplifiedHeaders(originalHeaders?: HeadersInit): Headers {
  const headers = new Headers();
  
  // نسخ الرؤوس المهمة فقط
  if (originalHeaders) {
    const original = new Headers(originalHeaders);
    
    // رؤوس المصادقة
    if (original.has('Authorization')) {
      headers.set('Authorization', original.get('Authorization')!);
    }
    if (original.has('apikey')) {
      headers.set('apikey', original.get('apikey')!);
    }
  }
  
  // رؤوس أساسية مبسطة
  headers.set('Accept', '*/*');
  headers.set('Content-Type', 'application/json');
  
  return headers;
}

/**
 * إنشاء رؤوس الحد الأدنى للمحاولة الأخيرة
 */
function createMinimalHeaders(originalHeaders?: HeadersInit): Headers {
  const headers = new Headers();
  
  // نسخ رؤوس المصادقة فقط
  if (originalHeaders) {
    const original = new Headers(originalHeaders);
    
    if (original.has('Authorization')) {
      headers.set('Authorization', original.get('Authorization')!);
    }
    if (original.has('apikey')) {
      headers.set('apikey', original.get('apikey')!);
    }
  }
  
  return headers;
}

/**
 * تأخير لفترة محددة
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * إعادة المحاولة مع استراتيجية تدريجية
 */
async function retryWithStrategy(
  input: RequestInfo | URL,
  init?: RequestInit,
  config: RetryConfig = defaultRetryConfig
): Promise<Response> {
  const originalFetch = window.fetch;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      let headers: Headers;
      let retryInit: RequestInit = { ...init };
      
      // اختيار استراتيجية الرؤوس حسب المحاولة
      switch (attempt) {
        case 1:
          headers = createOptimizedHeaders(init?.headers);
          break;
        case 2:
          headers = createSimplifiedHeaders(init?.headers);
          break;
        default:
          headers = createMinimalHeaders(init?.headers);
          break;
      }
      
      retryInit.headers = headers;
      
      console.log(`🔄 محاولة ${attempt}/${config.maxRetries} للطلب:`, input);
      
      const response = await originalFetch(input, retryInit);
      
      if (response.status === 406) {
        throw new Error(`HTTP 406 في المحاولة ${attempt}`);
      }
      
      if (response.ok) {
        requestStats.retried++;
        requestStats.success++;
        console.log(`✅ نجح الطلب في المحاولة ${attempt}`);
        return response;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`❌ فشلت المحاولة ${attempt}:`, lastError.message);
      
      // تأخير قبل المحاولة التالية
      if (attempt < config.maxRetries) {
        const delayTime = config.retryDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        await delay(delayTime);
      }
    }
  }
  
  // إذا فشلت جميع المحاولات
  requestStats.failed++;
  
  // حفظ الطلب الفاشل للمراجعة
  failedRequests.push({
    url: input.toString(),
    init,
    timestamp: Date.now(),
    error: lastError?.message || 'خطأ غير معروف'
  });
  
  throw lastError || new Error('فشلت جميع محاولات إعادة الطلب');
}

/**
 * معالج الطلبات المحسن
 */
async function enhancedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  requestStats.total++;
  
  try {
    // المحاولة الأولى مع الرؤوس الأصلية
    const response = await window.fetch(input, init);
    
    if (response.status === 406) {
      console.warn('🚨 تم اكتشاف خطأ 406، بدء إعادة المحاولة...');
      return await retryWithStrategy(input, init);
    }
    
    if (response.ok) {
      requestStats.success++;
    }
    
    return response;
    
  } catch (error) {
    console.error('❌ خطأ في الطلب:', error);
    
    // إذا كان خطأ شبكة، جرب إعادة المحاولة
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('🔄 خطأ شبكة، محاولة إعادة الطلب...');
      return await retryWithStrategy(input, init);
    }
    
    throw error;
  }
}

/**
 * تهيئة معالج أخطاء 406
 */
export function initializeHttp406Handler(): void {
  // حفظ fetch الأصلي
  const originalFetch = window.fetch;
  
  // استبدال fetch بالمعالج المحسن
  window.fetch = enhancedFetch;
  
  console.log('✅ تم تهيئة معالج أخطاء HTTP 406');
  
  // إضافة دوال مساعدة للنافذة العامة للتطوير
  (window as any).get406Stats = () => {
    console.table(requestStats);
    return requestStats;
  };
  
  (window as any).getFailedRequests = () => {
    console.table(failedRequests);
    return failedRequests;
  };
  
  (window as any).retryFailed406Requests = async () => {
    console.log('🔄 إعادة محاولة الطلبات الفاشلة...');
    
    const failedCopy = [...failedRequests];
    failedRequests.length = 0; // مسح القائمة
    
    for (const request of failedCopy) {
      try {
        await retryWithStrategy(request.url, request.init);
        console.log(`✅ نجحت إعادة محاولة: ${request.url}`);
      } catch (error) {
        console.error(`❌ فشلت إعادة محاولة: ${request.url}`, error);
      }
    }
  };
  
  (window as any).reset406Stats = () => {
    requestStats = { total: 0, failed: 0, retried: 0, success: 0 };
    failedRequests.length = 0;
    console.log('🔄 تم إعادة تعيين إحصائيات 406');
  };
}

/**
 * إزالة معالج أخطاء 406
 */
export function removeHttp406Handler(): void {
  // استعادة fetch الأصلي
  delete (window as any).fetch;
  console.log('🗑️ تم إزالة معالج أخطاء HTTP 406');
}

/**
 * الحصول على إحصائيات الطلبات
 */
export function getRequestStats(): RequestStats {
  return { ...requestStats };
}

/**
 * الحصول على الطلبات الفاشلة
 */
export function getFailedRequests() {
  return [...failedRequests];
}

/**
 * مسح إحصائيات الطلبات
 */
export function clearStats(): void {
  requestStats = { total: 0, failed: 0, retried: 0, success: 0 };
  failedRequests.length = 0;
}

/**
 * تحديث إعدادات إعادة المحاولة
 */
export function updateRetryConfig(config: Partial<RetryConfig>): void {
  Object.assign(defaultRetryConfig, config);
  console.log('⚙️ تم تحديث إعدادات إعادة المحاولة:', defaultRetryConfig);
} 