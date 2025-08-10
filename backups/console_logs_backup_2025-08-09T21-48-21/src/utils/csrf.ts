/**
 * نظام حماية CSRF (Cross-Site Request Forgery)
 */

// مفتاح التخزين للـ CSRF token
const CSRF_TOKEN_KEY = 'bazaar_csrf_token';
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 ساعة

/**
 * إنشاء CSRF token جديد
 */
export const generateCSRFToken = (): string => {
  const token = crypto.getRandomValues(new Uint8Array(32))
    .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '');
  
  const tokenData = {
    token,
    timestamp: Date.now(),
    expiry: Date.now() + CSRF_TOKEN_EXPIRY
  };
  
  // حفظ في localStorage
  localStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(tokenData));
  
  return token;
};

/**
 * الحصول على CSRF token الحالي أو إنشاء واحد جديد
 */
export const getCSRFToken = (): string => {
  try {
    const stored = localStorage.getItem(CSRF_TOKEN_KEY);
    if (!stored) {
      return generateCSRFToken();
    }
    
    const tokenData = JSON.parse(stored);
    const now = Date.now();
    
    // التحقق من انتهاء الصلاحية
    if (now > tokenData.expiry) {
      return generateCSRFToken();
    }
    
    return tokenData.token;
  } catch (error) {
    // في حالة حدوث خطأ، إنشاء token جديد
    return generateCSRFToken();
  }
};

/**
 * التحقق من صحة CSRF token
 */
export const validateCSRFToken = (token: string): boolean => {
  try {
    const stored = localStorage.getItem(CSRF_TOKEN_KEY);
    if (!stored) {
      return false;
    }
    
    const tokenData = JSON.parse(stored);
    const now = Date.now();
    
    // التحقق من انتهاء الصلاحية
    if (now > tokenData.expiry) {
      localStorage.removeItem(CSRF_TOKEN_KEY);
      return false;
    }
    
    return tokenData.token === token;
  } catch (error) {
    return false;
  }
};

/**
 * إضافة CSRF token إلى headers الطلب
 */
export const addCSRFTokenToHeaders = (headers: Headers): void => {
  const csrfToken = getCSRFToken();
  headers.set('X-CSRF-Token', csrfToken);
};

/**
 * إضافة CSRF token إلى بيانات النموذج
 */
export const addCSRFTokenToFormData = (formData: any): any => {
  const csrfToken = getCSRFToken();
  return {
    ...formData,
    _csrf: csrfToken
  };
};

/**
 * التحقق من CSRF token في الاستجابة
 */
export const validateCSRFResponse = (response: Response): boolean => {
  const csrfToken = response.headers.get('X-CSRF-Token');
  if (csrfToken) {
    return validateCSRFToken(csrfToken);
  }
  return true; // إذا لم يكن هناك CSRF token في الاستجابة، نعتبره صحيحاً
};

/**
 * تنظيف CSRF token عند تسجيل الخروج
 */
export const clearCSRFToken = (): void => {
  localStorage.removeItem(CSRF_TOKEN_KEY);
}; 