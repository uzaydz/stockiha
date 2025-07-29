/**
 * أدوات معالجة الأخطاء المتقدمة
 */

export interface ErrorInfo {
  type: 'network' | 'auth' | 'validation' | 'supabase' | 'query' | 'unknown';
  message: string;
  originalError: any;
  shouldRetry: boolean;
  retryDelay?: number;
}

/**
 * تحليل نوع الخطأ وتحديد كيفية التعامل معه
 */
export function analyzeError(error: any): ErrorInfo {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  
  // أخطاء الشبكة
  if (
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('Network Error') ||
    errorMessage.includes('ERR_NETWORK') ||
    error?.name === 'NetworkError'
  ) {
    return {
      type: 'network',
      message: 'مشكلة في الاتصال بالإنترنت',
      originalError: error,
      shouldRetry: true,
      retryDelay: 5000
    };
  }
  
  // أخطاء المصادقة
  if (
    errorMessage.includes('auth') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('token') ||
    error?.status === 401
  ) {
    return {
      type: 'auth',
      message: 'خطأ في المصادقة',
      originalError: error,
      shouldRetry: false
    };
  }
  
  // أخطاء React Query المتعلقة بإلغاء الاستعلامات
  if (
    errorMessage.includes('CancelledError') ||
    errorMessage.includes('AbortError') ||
    errorMessage.includes('dehydrated as pending')
  ) {
    return {
      type: 'query',
      message: 'تم إلغاء الاستعلام',
      originalError: error,
      shouldRetry: false
    };
  }
  
  // أخطاء Supabase
  if (
    errorMessage.includes('supabase') ||
    errorMessage.includes('postgrest') ||
    error?.code?.startsWith('PGRST')
  ) {
    return {
      type: 'supabase',
      message: 'خطأ في قاعدة البيانات',
      originalError: error,
      shouldRetry: true,
      retryDelay: 3000
    };
  }
  
  // أخطاء التحقق من الصحة
  if (
    errorMessage.includes('validation') ||
    errorMessage.includes('invalid') ||
    error?.status >= 400 && error?.status < 500
  ) {
    return {
      type: 'validation',
      message: 'خطأ في البيانات المدخلة',
      originalError: error,
      shouldRetry: false
    };
  }
  
  // أخطاء غير معروفة
  return {
    type: 'unknown',
    message: errorMessage,
    originalError: error,
    shouldRetry: false
  };
}

/**
 * تحديد ما إذا كان يجب إظهار الخطأ للمستخدم
 */
export function shouldShowError(errorInfo: ErrorInfo): boolean {
  // لا تظهر أخطاء إلغاء الاستعلامات للمستخدم
  if (errorInfo.type === 'query') {
    return false;
  }
  
  // لا تظهر أخطاء الشبكة البسيطة إذا كانت مؤقتة
  if (errorInfo.type === 'network' && errorInfo.shouldRetry) {
    return false;
  }
  
  return true;
}

/**
 * تصفية الأخطاء في وحدة التحكم
 */
export function shouldLogError(errorMessage: string): boolean {
  const ignoredPatterns = [
    'CancelledError',
    'dehydrated as pending',
    'AbortError',
    'The operation was aborted',
    'storage/v1/object', // أخطاء تحميل الملفات من Supabase Storage
    'organization-assets',
    '406', // أخطاء جلسة Supabase المؤقتة
  ];
  
  return !ignoredPatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * تنسيق رسالة الخطأ للعرض
 */
export function formatErrorMessage(errorInfo: ErrorInfo): string {
  switch (errorInfo.type) {
    case 'network':
      return 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى';
    case 'auth':
      return 'يرجى تسجيل الدخول مرة أخرى';
    case 'validation':
      return 'تحقق من البيانات المدخلة';
    case 'supabase':
      return 'خطأ في الخادم، يرجى المحاولة لاحقاً';
    case 'query':
      return ''; // لا نظهر هذا النوع من الأخطاء
    default:
      return errorInfo.message;
  }
}

/**
 * معالج مركزي للأخطاء
 */
export function handleError(error: any, context?: string): ErrorInfo {
  const errorInfo = analyzeError(error);
  
  // تسجيل الخطأ في وحدة التحكم إذا كان مناسباً
  if (shouldLogError(errorInfo.message)) {
  }
  
  return errorInfo;
}
