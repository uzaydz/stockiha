/**
 * 🔄 Auth Proxy - مجموعة دوال لاستبدال جميع استدعاءات المصادقة
 * 
 * الهدف: توجيه جميع طلبات المصادقة عبر AuthSingleton
 * لتقليل استدعاءات auth/v1/user إلى الحد الأدنى
 */

import { authSingleton } from './authSingleton';
import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

/**
 * بديل محسن لـ supabase.auth.getUser()
 * يستخدم AuthSingleton مع fallback للطريقة الأصلية
 */
export async function getUser(): Promise<{ data: { user: User | null }; error: null }> {
  try {
    const user = await authSingleton.getUser();
    return {
      data: { user },
      error: null
    };
  } catch (error) {
    return await supabase.auth.getUser();
  }
}

/**
 * بديل محسن لـ supabase.auth.getSession()
 * يستخدم AuthSingleton مع fallback للطريقة الأصلية
 */
export async function getSession(): Promise<{ data: { session: Session | null }; error: null }> {
  try {
    const session = await authSingleton.getSession();
    return {
      data: { session },
      error: null
    };
  } catch (error) {
    return await supabase.auth.getSession();
  }
}

/**
 * الحصول على معرف المستخدم مباشرة
 */
export async function getUserId(): Promise<string | null> {
  return await authSingleton.getUserId();
}

/**
 * الحصول على بريد المستخدم مباشرة
 */
export async function getUserEmail(): Promise<string | null> {
  return await authSingleton.getUserEmail();
}

/**
 * التحقق من حالة المصادقة
 */
export async function isAuthenticated(): Promise<boolean> {
  return await authSingleton.isAuthenticated();
}

/**
 * دالة مساعدة للحصول على المستخدم مع معالجة الأخطاء
 */
export async function getCurrentUserSafe(): Promise<User | null> {
  try {
    return await authSingleton.getUser();
  } catch (error) {
    return null;
  }
}

/**
 * دالة محسنة للحصول على معرف المستخدم مع cache
 */
export async function getCurrentUserIdOptimized(): Promise<string | null> {
  try {
    const userId = await authSingleton.getUserId();
    if (!userId) {
    }
    return userId;
  } catch (error) {
    return null;
  }
}

/**
 * دالة خاصة للحصول على بيانات المستخدم للواجهة
 * مع معالجة حالات الخطأ والتحميل
 */
export async function getUserForUI(): Promise<{
  user: User | null;
  isLoading: boolean;
  error: string | null;
}> {
  try {
    const user = await authSingleton.getUser();
    return {
      user,
      isLoading: false,
      error: null
    };
  } catch (error) {
    return {
      user: null,
      isLoading: false,
      error: error instanceof Error ? error.message : 'خطأ في المصادقة'
    };
  }
}

/**
 * دالة محسنة للحصول على بيانات المصادقة الكاملة
 */
export async function getAuthData(): Promise<{
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
}> {
  try {
    const authData = await authSingleton.getAuth();
    return {
      user: authData.user,
      session: authData.session,
      isAuthenticated: !!(authData.user && authData.session)
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      isAuthenticated: false
    };
  }
}

/**
 * دالة خاصة للتحقق من صحة المصادقة مع validation إضافي
 */
export async function validateAuthentication(): Promise<{
  isValid: boolean;
  user: User | null;
  reason?: string;
}> {
  try {
    const authData = await authSingleton.getAuth();
    
    if (!authData.user || !authData.session) {
      return {
        isValid: false,
        user: null,
        reason: 'لا توجد جلسة مصادقة صالحة'
      };
    }

    // فحص انتهاء الصلاحية
    const now = Math.floor(Date.now() / 1000);
    if (authData.session.expires_at && now >= authData.session.expires_at) {
      return {
        isValid: false,
        user: authData.user,
        reason: 'انتهت صلاحية الجلسة'
      };
    }

    return {
      isValid: true,
      user: authData.user
    };

  } catch (error) {
    return {
      isValid: false,
      user: null,
      reason: 'خطأ في التحقق من المصادقة'
    };
  }
}

/**
 * مسح بيانات المصادقة عند تسجيل الخروج
 */
export function clearAuthData(): void {
  authSingleton.clearAuth();
}

/**
 * فرض تحديث بيانات المصادقة
 */
export async function refreshAuthData(): Promise<void> {
  try {
    await authSingleton.forceRefresh();
  } catch (error) {
  }
}

/**
 * الحصول على إحصائيات الأداء
 */
export function getAuthPerformanceStats() {
  return authSingleton.getStats();
}

/**
 * دالة مساعدة لطباعة إحصائيات الأداء في console
 */
export function logAuthStats(): void {
  const stats = authSingleton.getStats();
}

// تصدير كوب إضافي لسهولة الاستخدام
export const authProxy = {
  getUser,
  getSession,
  getUserId,
  getUserEmail,
  isAuthenticated,
  getCurrentUserSafe,
  getCurrentUserIdOptimized,
  getUserForUI,
  getAuthData,
  validateAuthentication,
  clearAuthData,
  refreshAuthData,
  getAuthPerformanceStats,
  logAuthStats
};
