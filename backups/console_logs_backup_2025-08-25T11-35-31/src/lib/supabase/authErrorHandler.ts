/**
 * معالج أخطاء Supabase Auth المتقدم
 */
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface AuthErrorInfo {
  type: 'network' | 'session' | 'token' | 'user' | 'timeout' | 'unknown';
  message: string;
  shouldRetry: boolean;
  retryAfter?: number;
  critical: boolean;
}

/**
 * تحليل أخطاء Supabase Auth
 */
export function analyzeAuthError(error: any): AuthErrorInfo {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorName = error?.name?.toLowerCase() || '';
  const errorCode = error?.code || error?.status;

  // أخطاء الشبكة
  if (
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('network error') ||
    errorMessage.includes('fetch error') ||
    errorName === 'networkerror' ||
    errorCode === 'ERR_NETWORK'
  ) {
    return {
      type: 'network',
      message: 'مشكلة في الاتصال بالخادم',
      shouldRetry: true,
      retryAfter: 3000,
      critical: false
    };
  }

  // أخطاء انتهاء المهلة
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('aborterror') ||
    errorMessage.includes('request timeout')
  ) {
    return {
      type: 'timeout',
      message: 'انتهت مهلة الطلب',
      shouldRetry: true,
      retryAfter: 5000,
      critical: false
    };
  }

  // أخطاء الجلسة
  if (
    errorMessage.includes('session') ||
    errorMessage.includes('invalid_token') ||
    errorMessage.includes('expired') ||
    errorCode === 401
  ) {
    return {
      type: 'session',
      message: 'انتهت صلاحية الجلسة',
      shouldRetry: false,
      critical: true
    };
  }

  // أخطاء المستخدم
  if (
    errorMessage.includes('user') ||
    errorMessage.includes('profile') ||
    errorCode === 404
  ) {
    return {
      type: 'user',
      message: 'بيانات المستخدم غير متوفرة',
      shouldRetry: true,
      retryAfter: 2000,
      critical: false
    };
  }

  // أخطاء الرمز المميز
  if (
    errorMessage.includes('token') ||
    errorMessage.includes('jwt') ||
    errorMessage.includes('authorization')
  ) {
    return {
      type: 'token',
      message: 'مشكلة في الرمز المميز',
      shouldRetry: true,
      retryAfter: 1000,
      critical: false
    };
  }

  // أخطاء غير معروفة
  return {
    type: 'unknown',
    message: errorMessage || 'خطأ غير معروف',
    shouldRetry: false,
    critical: false
  };
}

/**
 * معالج الأخطاء مع إعادة المحاولة
 */
export class SupabaseAuthErrorHandler {
  private retryCount = new Map<string, number>();
  private lastError = new Map<string, number>();
  private maxRetries = 3;
  private retryDelay = 1000;

  /**
   * معالجة خطأ المصادقة مع إعادة المحاولة التلقائية
   */
  async handleAuthError<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    const currentRetries = this.retryCount.get(operationName) || 0;
    
    try {
      const result = await operation();
      // نجحت العملية، إعادة تعيين العداد
      this.retryCount.delete(operationName);
      this.lastError.delete(operationName);
      return result;
    } catch (error) {
      const errorInfo = analyzeAuthError(error);
      const now = Date.now();
      const lastErrorTime = this.lastError.get(operationName) || 0;

      // تجاهل الأخطاء المتكررة خلال فترة قصيرة
      if (now - lastErrorTime < 1000) {
        throw error;
      }

      this.lastError.set(operationName, now);

      // إذا كان الخطأ غير قابل للإعادة أو وصلنا للحد الأقصى
      if (!errorInfo.shouldRetry || currentRetries >= maxRetries) {
        this.retryCount.delete(operationName);
        
        // في حالة أخطاء الجلسة الحرجة، قم بتنظيف الحالة
        if (errorInfo.critical && errorInfo.type === 'session') {
          await this.handleSessionExpiry();
        }
        
        throw error;
      }

      // زيادة عداد المحاولات
      this.retryCount.set(operationName, currentRetries + 1);

      // انتظار قبل إعادة المحاولة
      const delay = errorInfo.retryAfter || this.retryDelay * Math.pow(2, currentRetries);
      await new Promise(resolve => setTimeout(resolve, delay));

      // إعادة المحاولة
      return this.handleAuthError(operation, operationName, maxRetries);
    }
  }

  /**
   * معالجة انتهاء صلاحية الجلسة
   */
  private async handleSessionExpiry(): Promise<void> {
    try {
      // محاولة تحديث الجلسة
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        // فشل التحديث، قم بتسجيل الخروج
        await supabase.auth.signOut();
      }
    } catch (refreshError) {
      // فشل التحديث، قم بتسجيل الخروج
      await supabase.auth.signOut();
    }
  }

  /**
   * معالجة آمنة للحصول على الجلسة الحالية
   */
  async getSession(): Promise<Session | null> {
    return this.handleAuthError(
      async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
      },
      'getSession'
    );
  }

  /**
   * معالجة آمنة للحصول على المستخدم الحالي
   */
  async getUser() {
    return this.handleAuthError(
      async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        return data.user;
      },
      'getUser'
    );
  }

  /**
   * تنظيف العدادات
   */
  clearRetryCounters(): void {
    this.retryCount.clear();
    this.lastError.clear();
  }

  /**
   * فحص ما إذا كان الخطأ يجب تجاهله في وحدة التحكم
   */
  shouldIgnoreError(error: any): boolean {
    const errorInfo = analyzeAuthError(error);
    
    // تجاهل أخطاء الشبكة البسيطة وأخطاء المهلة المؤقتة
    return (
      errorInfo.type === 'network' ||
      errorInfo.type === 'timeout'
    ) && !errorInfo.critical;
  }
}

// إنشاء instance مُشتركة
export const authErrorHandler = new SupabaseAuthErrorHandler();

/**
 * تحسين console.error لتصفية أخطاء Supabase Auth
 */
export function setupAuthErrorFiltering(): void {
  const originalError = console.error;
  
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    // فحص ما إذا كان الخطأ متعلق بـ Supabase Auth
    if (message.includes('supabase') || message.includes('_getUser') || message.includes('_useSession')) {
      try {
        // محاولة تحليل الخطأ
        const errorObj = args.find(arg => arg instanceof Error || (arg && arg.message));
        if (errorObj && authErrorHandler.shouldIgnoreError(errorObj)) {
          // تجاهل الخطأ إذا كان غير حرج
          return;
        }
      } catch {
        // في حالة فشل التحليل، اعرض الخطأ
      }
    }
    
    // عرض الخطأ إذا لم يكن مُصفى
    originalError.apply(console, args);
  };
}
