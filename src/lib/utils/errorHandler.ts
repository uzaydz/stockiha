/**
 * معالج أخطاء محسن للنظام
 * يتعامل مع أخطاء الشبكة والاتصال مع retry mechanisms
 */

export interface ErrorRetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

/**
 * دالة retry محسنة مع exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: ErrorRetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    retryCondition = (error) => {
      // إعادة المحاولة على أخطاء الشبكة والاتصال
      return (
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('Network Error') ||
        error?.message?.includes('timeout') ||
        error?.code === 'NETWORK_ERROR' ||
        error?.status === 0 ||
        error?.status >= 500
      );
    }
  } = options;

  let lastError: any;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return {
        success: true,
        data: result,
        attempts: attempt + 1,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      lastError = error;
      
      // إذا كانت هذه آخر محاولة أو لا يجب إعادة المحاولة
      if (attempt === maxRetries || !retryCondition(error)) {
        break;
      }

      // حساب التأخير مع exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );

      // انتظار قبل إعادة المحاولة
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxRetries + 1,
    totalTime: Date.now() - startTime
  };
}

/**
 * معالج أخطاء محسن لـ Supabase
 */
export class SupabaseErrorHandler {
  private static instance: SupabaseErrorHandler;
  private errorCounts: Map<string, number> = new Map();
  private lastErrorTime: Map<string, number> = new Map();

  static getInstance(): SupabaseErrorHandler {
    if (!SupabaseErrorHandler.instance) {
      SupabaseErrorHandler.instance = new SupabaseErrorHandler();
    }
    return SupabaseErrorHandler.instance;
  }

  /**
   * معالجة خطأ Supabase مع retry
   */
  async handleSupabaseError<T>(
    operation: () => Promise<T>,
    context: string = 'unknown',
    options: ErrorRetryOptions = {}
  ): Promise<T | null> {
    const errorKey = `${context}_${Date.now()}`;
    
    try {
      const result = await retryWithBackoff(operation, {
        maxRetries: 2,
        baseDelay: 500,
        ...options
      });

      if (result.success) {
        // إعادة تعيين عداد الأخطاء عند النجاح
        this.errorCounts.delete(context);
        return result.data;
      } else {
        // تسجيل الخطأ
        this.recordError(context, result.error);
        throw result.error;
      }
    } catch (error) {
      this.recordError(context, error);
      throw error;
    }
  }

  /**
   * تسجيل خطأ
   */
  private recordError(context: string, error: any): void {
    const count = (this.errorCounts.get(context) || 0) + 1;
    this.errorCounts.set(context, count);
    this.lastErrorTime.set(context, Date.now());

  }

  /**
   * فحص ما إذا كان يجب تجاهل الخطأ
   */
  shouldIgnoreError(error: any, context: string): boolean {
    const errorCount = this.errorCounts.get(context) || 0;
    const lastError = this.lastErrorTime.get(context) || 0;
    const now = Date.now();

    // تجاهل الأخطاء المتكررة في وقت قصير
    if (errorCount > 5 && (now - lastError) < 60000) {
      return true;
    }

    // تجاهل أخطاء الشبكة البسيطة
    if (error?.message?.includes('Failed to fetch') && errorCount > 3) {
      return true;
    }

    return false;
  }

  /**
   * تنظيف العدادات
   */
  clearErrorCounts(): void {
    this.errorCounts.clear();
    this.lastErrorTime.clear();
  }
}

/**
 * معالج أخطاء عام للنظام
 */
export class GeneralErrorHandler {
  private static instance: GeneralErrorHandler;
  private errorLog: Array<{ timestamp: number; context: string; error: any }> = [];

  static getInstance(): GeneralErrorHandler {
    if (!GeneralErrorHandler.instance) {
      GeneralErrorHandler.instance = new GeneralErrorHandler();
    }
    return GeneralErrorHandler.instance;
  }

  /**
   * معالجة خطأ عام
   */
  handleError(error: any, context: string = 'unknown'): void {
    const errorInfo = {
      timestamp: Date.now(),
      context,
      error: this.sanitizeError(error)
    };

    this.errorLog.push(errorInfo);

    // الاحتفاظ بآخر 100 خطأ فقط
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    // تسجيل الخطأ

    // إرسال الخطأ إلى خدمة المراقبة إذا كانت متوفرة
    this.reportToMonitoring(errorInfo);
  }

  /**
   * تنظيف معلومات الخطأ
   */
  private sanitizeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      };
    }

    if (typeof error === 'object' && error !== null) {
      const { message, details, hint, code, ...rest } = error;
      return {
        message: message || 'خطأ غير معروف',
        details: details || null,
        hint: hint || null,
        code: code || null,
        ...rest
      };
    }

    return error;
  }

  /**
   * إرسال الخطأ إلى خدمة المراقبة
   */
  private reportToMonitoring(errorInfo: any): void {
    // يمكن إضافة إرسال الأخطاء إلى خدمة مراقبة خارجية هنا
    if (process.env.NODE_ENV === 'development') {
    }
  }

  /**
   * الحصول على سجل الأخطاء
   */
  getErrorLog(): Array<{ timestamp: number; context: string; error: any }> {
    return [...this.errorLog];
  }

  /**
   * تنظيف سجل الأخطاء
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }
}

// إنشاء instances مشتركة
export const supabaseErrorHandler = SupabaseErrorHandler.getInstance();
export const generalErrorHandler = GeneralErrorHandler.getInstance();

/**
 * دالة مساعدة لمعالجة الأخطاء
 */
export function handleError(error: any, context: string = 'unknown'): void {
  generalErrorHandler.handleError(error, context);
}

/**
 * دالة مساعدة لـ retry مع Supabase
 */
export async function retrySupabaseOperation<T>(
  operation: () => Promise<T>,
  context: string = 'unknown',
  options: ErrorRetryOptions = {}
): Promise<T | null> {
  return supabaseErrorHandler.handleSupabaseError(operation, context, options);
}
