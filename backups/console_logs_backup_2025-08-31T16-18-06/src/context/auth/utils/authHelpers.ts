/**
 * أدوات مساعدة لـ Auth
 * دوال مساعدة ومنطق مشترك
 */

import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { UserProfile, Organization, AuthError } from '../types';
import { MAIN_DOMAINS, DEV_DOMAINS, DEFAULT_ORGANIZATION_ID } from '../constants/authConstants';

/**
 * التحقق من النطاق الرئيسي
 */
export const isMainDomain = (hostname: string): boolean => {
  return MAIN_DOMAINS.includes(hostname as any);
};

/**
 * التحقق من النطاق التطويري
 */
export const isDevelopmentDomain = (hostname: string): boolean => {
  return DEV_DOMAINS.some(domain => hostname.includes(domain));
};

/**
 * استخراج النطاق الفرعي
 */
export const extractSubdomain = (hostname: string): string | null => {
  // استخدام قيمة مخزنة محليًا لمنع الاستدعاءات المتكررة
  try {
    const cachedSubdomain = sessionStorage.getItem('bazaar_current_subdomain');
    if (cachedSubdomain) {
      return cachedSubdomain === 'null' ? null : cachedSubdomain;
    }
  } catch (error) {
    // تجاهل أخطاء sessionStorage
  }

  let subdomain = null;
  
  // خاص بـ localhost: التعامل مع النطاقات الفرعية في بيئة التطوير
  if (isDevelopmentDomain(hostname)) {
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== 'www') {
      subdomain = parts[0];
    }
  } 
  // التعامل مع عناوين IP المحلية
  else if (hostname.match(/^127\.\d+\.\d+\.\d+$/) || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    // عنوان IP محلي - لا يوجد نطاق فرعي
    subdomain = null;
  } 
  // اختبار ما إذا كان النطاق الرئيسي
  else if (isMainDomain(hostname)) {
    subdomain = null;
  } 
  // تقسيم اسم المضيف إلى أجزاء
  else {
    const hostParts = hostname.split('.');
    
    if (hostParts.length > 2) {
      const potentialSubdomain = hostParts[0];
      
      // لا نعتبر 'www' كنطاق فرعي حقيقي
      if (potentialSubdomain !== 'www') {
        subdomain = potentialSubdomain;
      }
    }
  }
  
  // حفظ النتيجة في التخزين لتجنب إعادة الحساب
  try {
    sessionStorage.setItem('bazaar_current_subdomain', subdomain === null ? 'null' : subdomain);
  } catch (error) {
    // تجاهل أخطاء sessionStorage
  }
  
  return subdomain;
};

/**
 * الحصول على معرف المؤسسة الافتراضية
 */
export const getDefaultOrganizationId = (): string | null => {
  try {
    // محاولة استخدام معرف المؤسسة من التخزين المحلي
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      return storedOrgId;
    }
    
    // إرجاع المعرف الافتراضي
    return DEFAULT_ORGANIZATION_ID;
  } catch (error) {
    return DEFAULT_ORGANIZATION_ID;
  }
};

/**
 * التحقق من صحة الجلسة
 */
export const validateSession = async (session: Session | null): Promise<boolean> => {
  if (!session) return false;
  
  try {
    // فحص انتهاء صلاحية التوكن
    const now = Date.now();
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    
    // إذا انتهت الصلاحية فعلياً
    if (expiresAt && now >= expiresAt) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * إنشاء خطأ Auth مخصص
 */
export const createAuthError = (
  message: string,
  type: AuthError['type'] = 'AUTH',
  code?: string,
  context?: Record<string, any>
): AuthError => {
  const error = new Error(message) as AuthError;
  error.type = type;
  error.code = code;
  error.context = context;
  
  return error;
};

/**
 * معالجة أخطاء Auth
 */
export const handleAuthError = (error: any): AuthError => {
  if (error && typeof error === 'object' && 'type' in error) {
    return error as AuthError;
  }
  
  // تحويل أخطاء Supabase العادية
  if (error?.message) {
    let type: AuthError['type'] = 'AUTH';
    let code = error.code || 'UNKNOWN';
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      type = 'NETWORK';
    } else if (error.message.includes('timeout')) {
      type = 'TIMEOUT';
    } else if (error.message.includes('permission') || error.message.includes('access')) {
      type = 'PERMISSION';
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      type = 'VALIDATION';
    }
    
    return createAuthError(error.message, type, code, { originalError: error });
  }
  
  return createAuthError('خطأ غير معروف', 'AUTH', 'UNKNOWN', { originalError: error });
};

/**
 * مقارنة بيانات المصادقة
 */
export const compareAuthData = (
  oldSession: Session | null,
  newSession: Session | null,
  oldUser: SupabaseUser | null,
  newUser: SupabaseUser | null
): boolean => {
  // مقارنة الجلسات
  if (oldSession && newSession) {
    const isSameSession = (
      oldSession.access_token === newSession.access_token &&
      oldSession.refresh_token === newSession.refresh_token &&
      oldSession.expires_at === newSession.expires_at
    );
    
    if (!isSameSession) return false;
  } else if (oldSession !== newSession) {
    return false;
  }
  
  // مقارنة المستخدمين
  if (oldUser && newUser) {
    const isSameUser = (
      oldUser.id === newUser.id &&
      oldUser.email === newUser.email &&
      oldUser.updated_at === newUser.updated_at
    );
    
    if (!isSameUser) return false;
  } else if (oldUser !== newUser) {
    return false;
  }
  
  return true;
};

/**
 * تنظيف بيانات المستخدم للعرض
 */
export const sanitizeUserData = (user: SupabaseUser): any => {
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || user.email || '',
    role: user.user_metadata?.role || 'user',
    organization_id: user.user_metadata?.organization_id || null,
    auth_user_id: user.id,
    is_active: user.user_metadata?.is_active !== false,
    permissions: user.user_metadata?.permissions || {},
    created_at: user.created_at || new Date().toISOString(),
    updated_at: user.updated_at || new Date().toISOString()
  };
};

/**
 * دمج بيانات مركز الاتصال
 */
export const mergeCallCenterData = async (userProfile: UserProfile): Promise<UserProfile> => {
  // مؤقتاً تعطيل استعلام call_center_agents لحل مشاكل التحديث
  return userProfile;
  
  // TODO: إضافة منطق مركز الاتصال عند الحاجة
};

/**
 * تتبع الأداء
 */
export const trackPerformance = (operation: string, startTime: number): void => {
  if (process.env.NODE_ENV === 'development') {
    const duration = performance.now() - startTime;
    
    if (duration > 1000) {
    }
  }
};

/**
 * debounce function محسنة
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * throttle function محسنة
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * تأخير Promise
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * محاولة مع إعادة التجربة
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries) {
        await delay(retryDelay * Math.pow(2, i)); // exponential backoff
      }
    }
  }
  
  throw lastError;
};
