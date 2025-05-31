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

// حفظ fetch الأصلي
let originalFetch: typeof fetch;

// متغير للتحكم في تفعيل/تعطيل المعالج
let isHandlerDisabled = false;

// علم لمنع التكرار اللانهائي
let isProcessingFetch = false;

// علم لمتابعة ما إذا كان المعالج مهيأ
let isHandlerInitialized = false;

// قائمة بأنماط URLs التي يجب تجاهلها دائماً (بما في ذلك طلبات التخزين)
const ALWAYS_IGNORED_URL_PATTERNS = [
  '/storage/v1/object',
  'supabase.co/storage',
  '/storage/v1/upload',
  'organization-assets',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
  '/storage/v1/', // أي طلب متعلق بالتخزين
  'upload',
  'download',
  'image',
  'file',
  'assets',
  'public'
];

/**
 * فحص ما إذا كان عنوان URL يجب تجاهله
 */
function shouldIgnoreUrl(url: string): boolean {
  return ALWAYS_IGNORED_URL_PATTERNS.some(pattern => url.includes(pattern));
}

/**
 * إنشاء نسخة مبسطة من الرؤوس للمحاولة التالية
 */
function createSimplifiedHeaders(originalHeaders?: HeadersInit): Headers {
  const headers = new Headers();
  
  // نسخ الرؤوس المهمة فقط
  if (originalHeaders) {
    const original = new Headers(originalHeaders);
    
    // رؤوس المصادقة
    const importantHeaders = ['Authorization', 'apikey', 'X-Client-Info', 'Content-Type'];
    importantHeaders.forEach(header => {
      if (original.has(header)) {
        headers.set(header, original.get(header)!);
      }
    });
  }
  
  // إضافة رؤوس أساسية
  if (!headers.has('Accept')) {
    headers.set('Accept', '*/*');
  }
  
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
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
async function retryWithBackoff(
  input: RequestInfo | URL,
  init?: RequestInit,
  config: RetryConfig = defaultRetryConfig
): Promise<Response> {
  let lastError: Error | null = null;
  
  // نسخة من الـ init لا تؤثر على الأصلي
  const safeInit = init ? { ...init } : {};
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      // استخدام رؤوس مبسطة
      const headers = createSimplifiedHeaders(safeInit.headers);
      safeInit.headers = headers;
      
      console.log(`🔄 محاولة ${attempt}/${config.maxRetries} للطلب:`, input.toString().substring(0, 100));
      
      // استخدام fetch الأصلي مباشرة
      const response = await originalFetch(input, safeInit);
      
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
    url: typeof input === 'string' ? input : input.toString(),
    init: safeInit,
    timestamp: Date.now(),
    error: lastError?.message || 'خطأ غير معروف'
  });
  
  throw lastError || new Error('فشلت جميع محاولات إعادة الطلب');
}

/**
 * معالج الطلبات المحسن - النسخة الآمنة
 */
async function enhancedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // إذا كان المعالج معطل، استخدم fetch الأصلي
  if (isHandlerDisabled || !originalFetch) {
    return window.fetch(input, init);
  }
  
  // تحويل المدخلات إلى نص لفحصها
  const url = typeof input === 'string' ? input : input.toString();
  
  // تجاهل URLs المحددة دائماً (مثل طلبات التخزين والصور)
  if (shouldIgnoreUrl(url)) {
    return originalFetch(input, init);
  }
  
  // منع التكرار اللانهائي - إذا كنا بالفعل في عملية معالجة طلب
  if (isProcessingFetch) {
    return originalFetch(input, init);
  }
  
  // تحديث الإحصائيات
  requestStats.total++;
  
  try {
    // وضع علامة أننا في عملية معالجة طلب
    isProcessingFetch = true;
    
    // نسخة من الـ init لتجنب التعديل على الكائن الأصلي
    const safeInit = init ? { ...init } : {};
    
    // استخدام الـ fetch الأصلي دائماً في المحاولة الأولى
    const response = await originalFetch(input, safeInit);
    
    // إعادة تعيين العلم
    isProcessingFetch = false;
    
    // معالجة خطأ 406 إذا حدث
    if (response.status === 406) {
      console.warn('🚨 تم اكتشاف خطأ 406، بدء إعادة المحاولة...');
      return await retryWithBackoff(input, safeInit);
    }
    
    // تحديث الإحصائيات في حالة النجاح
    if (response.ok) {
      requestStats.success++;
    }
    
    return response;
    
  } catch (error) {
    // إعادة تعيين العلم في حالة الخطأ
    isProcessingFetch = false;
    
    console.error('❌ خطأ في الطلب:', error);
    
    // إذا كان خطأ شبكة، جرب إعادة المحاولة
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('🔄 خطأ شبكة، محاولة إعادة الطلب...');
      return await retryWithBackoff(input, init);
    }
    
    throw error;
  }
}

/**
 * تهيئة معالج أخطاء 406
 */
export function initializeHttp406Handler(): void {
  // تجنب التهيئة المزدوجة
  if (isHandlerInitialized) {
    console.warn('تم تهيئة معالج HTTP 406 بالفعل');
    return;
  }
  
  try {
    console.log('🚀 بدء تهيئة معالج أخطاء HTTP 406');
    
    // حفظ fetch الأصلي
    originalFetch = window.fetch.bind(window);
    
    // استبدال fetch بالمعالج المحسن
    window.fetch = enhancedFetch;
    
    isHandlerInitialized = true;
    isHandlerDisabled = false;
    
    console.log('✅ تم تهيئة معالج أخطاء HTTP 406 بنجاح');
    
    // إضافة دوال مساعدة للنافذة العامة للتطوير
    (window as any).get406Stats = () => {
      console.table(requestStats);
      return requestStats;
    };
    
    (window as any).getFailedRequests = () => {
      console.table(failedRequests);
      return failedRequests;
    };
    
    // دالة لتعطيل المعالج مؤقتًا
    (window as any).disable406Handler = () => {
      isHandlerDisabled = true;
      console.log('🛑 تم تعطيل معالج أخطاء HTTP 406 مؤقتًا');
      return true;
    };
    
    // دالة لإعادة تفعيل المعالج
    (window as any).enable406Handler = () => {
      isHandlerDisabled = false;
      console.log('✅ تم إعادة تفعيل معالج أخطاء HTTP 406');
      return true;
    };
    
    // دالة لإعادة محاولة الطلبات الفاشلة
    (window as any).retryFailed406Requests = async () => {
      console.log('🔄 إعادة محاولة الطلبات الفاشلة...');
      
      const failedCopy = [...failedRequests];
      failedRequests.length = 0; // مسح القائمة
      
      const results = [];
      
      for (const request of failedCopy) {
        try {
          await retryWithBackoff(request.url, request.init);
          console.log(`✅ نجحت إعادة محاولة: ${request.url}`);
          results.push({ url: request.url, success: true });
        } catch (error) {
          console.error(`❌ فشلت إعادة محاولة: ${request.url}`, error);
          results.push({ url: request.url, success: false, error: String(error) });
        }
      }
      
      return results;
    };
    
    // دالة لإعادة تعيين الإحصائيات
    (window as any).reset406Stats = () => {
      requestStats = { total: 0, failed: 0, retried: 0, success: 0 };
      failedRequests.length = 0;
      console.log('🔄 تم إعادة تعيين إحصائيات 406');
      return true;
    };
    
  } catch (error) {
    console.error('❌ فشل في تهيئة معالج أخطاء HTTP 406:', error);
  }
}

/**
 * إزالة معالج أخطاء 406
 */
export function removeHttp406Handler(): void {
  // استعادة fetch الأصلي
  if (isHandlerInitialized && originalFetch) {
    window.fetch = originalFetch;
    originalFetch = undefined as any;
    isHandlerInitialized = false;
    isHandlerDisabled = false;
    console.log('🗑️ تم إزالة معالج أخطاء HTTP 406');
  }
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
 * تفعيل أو تعطيل المعالج مؤقتاً
 */
export function toggleHandler(enable: boolean): boolean {
  isHandlerDisabled = !enable;
  console.log(`${enable ? '✅ تم تفعيل' : '🛑 تم تعطيل'} معالج أخطاء HTTP 406`);
  return true;
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