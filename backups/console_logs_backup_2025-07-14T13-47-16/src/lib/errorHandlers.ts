/**
 * معالجات الأخطاء الموحدة للتطبيق
 */

export interface ErrorResponse {
  status: number;
  message: string;
  code?: string;
  details?: any;
}

/**
 * معالج خطأ 406 (Not Acceptable)
 */
export const handle406Error = async (
  originalRequest: () => Promise<Response>,
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  
  try {
    // المحاولة الأولى: تبسيط رؤوس Accept
    const retryHeaders = new Headers(options.headers);
    retryHeaders.set('Accept', '*/*');
    retryHeaders.delete('Accept-Encoding');
    retryHeaders.delete('Accept-Language');
    
    const firstRetry = await fetch(url, {
      ...options,
      headers: retryHeaders
    });
    
    if (firstRetry.ok) {
      return firstRetry;
    }
    
    // المحاولة الثانية: رؤوس أساسية فقط
    const basicHeaders = new Headers();
    basicHeaders.set('Accept', 'application/json');
    basicHeaders.set('Content-Type', 'application/json');
    
    // نسخ الرؤوس المهمة
    const importantHeaders = ['Authorization', 'ApiKey', 'X-Client-Info'];
    importantHeaders.forEach(header => {
      const value = new Headers(options.headers).get(header);
      if (value) {
        basicHeaders.set(header, value);
      }
    });
    
    const secondRetry = await fetch(url, {
      method: options.method || 'GET',
      headers: basicHeaders,
      body: options.body,
      credentials: 'include',
      mode: 'cors'
    });
    
    if (secondRetry.ok) {
      return secondRetry;
    }
    
    // المحاولة الثالثة: بدون رؤوس إضافية
    const minimalRetry = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (minimalRetry.ok) {
      return minimalRetry;
    }
    
    throw new Error('فشلت جميع محاولات إصلاح خطأ 406');
    
  } catch (error) {
    throw error;
  }
};

/**
 * معالج عام للأخطاء HTTP
 */
export const handleHttpError = (response: Response): ErrorResponse => {
  const errorResponse: ErrorResponse = {
    status: response.status,
    message: getErrorMessage(response.status),
  };
  
  switch (response.status) {
    case 400:
      errorResponse.message = 'طلب غير صحيح - تحقق من البيانات المرسلة';
      break;
    case 401:
      errorResponse.message = 'غير مصرح - يرجى تسجيل الدخول مرة أخرى';
      break;
    case 403:
      errorResponse.message = 'ممنوع - ليس لديك صلاحية للوصول لهذا المورد';
      break;
    case 404:
      errorResponse.message = 'غير موجود - المورد المطلوب غير متاح';
      break;
    case 406:
      errorResponse.message = 'غير مقبول - تنسيق الطلب غير مدعوم';
      break;
    case 408:
      errorResponse.message = 'انتهت مهلة الطلب - يرجى المحاولة مرة أخرى';
      break;
    case 429:
      errorResponse.message = 'تم تجاوز الحد المسموح - يرجى الانتظار قبل المحاولة مرة أخرى';
      break;
    case 500:
      errorResponse.message = 'خطأ في الخادم - يرجى المحاولة لاحقاً';
      break;
    case 502:
      errorResponse.message = 'خطأ في البوابة - مشكلة في الاتصال بالخادم';
      break;
    case 503:
      errorResponse.message = 'الخدمة غير متاحة - يرجى المحاولة لاحقاً';
      break;
    default:
      errorResponse.message = `خطأ غير متوقع (${response.status})`;
  }
  
  return errorResponse;
};

/**
 * الحصول على رسالة خطأ بناءً على رمز الحالة
 */
const getErrorMessage = (status: number): string => {
  const messages: Record<number, string> = {
    400: 'طلب غير صحيح',
    401: 'غير مصرح',
    403: 'ممنوع',
    404: 'غير موجود',
    406: 'غير مقبول',
    408: 'انتهت المهلة',
    429: 'تجاوز الحد المسموح',
    500: 'خطأ في الخادم',
    502: 'خطأ في البوابة',
    503: 'الخدمة غير متاحة'
  };
  
  return messages[status] || 'خطأ غير معروف';
};

/**
 * معالج خاص لأخطاء Supabase
 */
export const handleSupabaseError = (error: any): ErrorResponse => {
  if (error?.code === 'PGRST116') {
    return {
      status: 406,
      message: 'تنسيق الاستعلام غير مدعوم',
      code: error.code
    };
  }
  
  if (error?.status) {
    return handleHttpError({ status: error.status } as Response);
  }
  
  return {
    status: 500,
    message: error?.message || 'خطأ غير معروف في قاعدة البيانات',
    details: error
  };
};

/**
 * دالة مساعدة لإعادة المحاولة مع تأخير
 */
export const retryWithDelay = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // زيادة التأخير مع كل محاولة
      }
    }
  }
  
  throw lastError!;
};

/**
 * معالج لأخطاء الشبكة
 */
export const handleNetworkError = (error: Error): ErrorResponse => {
  if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
    return {
      status: 0,
      message: 'خطأ في الشبكة - تحقق من اتصالك بالإنترنت'
    };
  }
  
  if (error.message.includes('timeout')) {
    return {
      status: 408,
      message: 'انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى'
    };
  }
  
  return {
    status: 500,
    message: error.message || 'خطأ غير معروف'
  };
};
