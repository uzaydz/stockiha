/**
 * إعدادات التوقيتات والتكوينات المتعلقة بـ API
 */

export const API_TIMEOUTS = {
  // timeout لتحميل بيانات المؤسسة - تقليل إلى 8 ثوان
  ORGANIZATION_LOAD: 8000, // 8 ثوان
  
  // timeout لاستعلامات قاعدة البيانات العادية - تقليل إلى 6 ثوان
  DATABASE_QUERY: 6000, // 6 ثوان
  
  // timeout لإعادة المحاولة - تقليل إلى 2 ثانية
  RETRY_DELAY: 2000, // 2 ثانية
  
  // timeout للتحديث - تقليل إلى 10 ثوان
  REFRESH_TIMEOUT: 10000, // 10 ثوان
} as const;

export const RETRY_CONFIG = {
  // الحد الأقصى لعدد المحاولات - مخفض إلى محاولتين
  MAX_RETRIES: 2,
  
  // مضاعف زمن الانتظار (exponential backoff)
  BACKOFF_MULTIPLIER: 1.5,
} as const;

export const CACHE_CONFIG = {
  // مدة الكاش للبيانات الهامة
  ORGANIZATION_TTL: 300000, // 5 دقائق
  
  // مدة الكاش للبيانات العادية
  DEFAULT_TTL: 60000, // دقيقة واحدة
} as const;

/**
 * دالة لإنشاء timeout مع Promise.race
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
};

/**
 * دالة لإعادة المحاولة مع exponential backoff
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = RETRY_CONFIG.MAX_RETRIES,
  baseDelay = API_TIMEOUTS.RETRY_DELAY
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // exponential backoff
      const delay = baseDelay * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};
