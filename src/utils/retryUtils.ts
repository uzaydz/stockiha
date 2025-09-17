import type { RetryConfig } from '@/components/store/product-purchase/types/ProductDataLoader.types';

/**
 * إعدادات إعادة المحاولة الافتراضية
 */
export const RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 ثانية
  maxDelay: 5000,  // 5 ثواني
  backoffMultiplier: 2
};

/**
 * دالة مساعدة للانتظار
 * @param ms - الوقت بالميلي ثانية
 */
export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * دالة مساعدة لحساب تأخير إعادة المحاولة
 * @param attempt - رقم المحاولة الحالية
 * @param config - إعدادات إعادة المحاولة
 * @returns التأخير المحسوب
 */
export const calculateRetryDelay = (
  attempt: number,
  config: RetryConfig = RETRY_CONFIG
): number => {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );
  // إضافة عشوائية بسيطة لتجنب thundering herd
  return delay + Math.random() * 1000;
};

/**
 * تنفيذ دالة مع إعادة المحاولة
 * @param fn - الدالة المراد تنفيذها
 * @param config - إعدادات إعادة المحاولة
 * @param shouldRetry - دالة للتحقق من إمكانية إعادة المحاولة
 * @returns نتيجة الدالة
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = RETRY_CONFIG,
  shouldRetry?: (error: any) => boolean
): Promise<T> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // إذا كانت هذه المحاولة الأخيرة أو لا يجب إعادة المحاولة
      if (attempt === config.maxRetries || (shouldRetry && !shouldRetry(error))) {
        throw error;
      }

      // انتظار قبل إعادة المحاولة
      const retryDelay = calculateRetryDelay(attempt, config);
      await delay(retryDelay);
    }
  }

  throw lastError;
}

/**
 * التحقق من إمكانية إعادة المحاولة لأخطاء محددة
 * @param error - الخطأ المراد التحقق منه
 * @returns true إذا كان يجب إعادة المحاولة
 */
export const shouldRetryError = (error: any): boolean => {
  const errorMessage = error?.message || '';

  // لا نعيد المحاولة لأخطاء 404 أو منتج غير موجود
  return !(
    errorMessage.includes('404') ||
    errorMessage.includes('Product not found') ||
    errorMessage.includes('المنتج غير موجود') ||
    errorMessage.includes('PRODUCT_NOT_FOUND')
  );
};
