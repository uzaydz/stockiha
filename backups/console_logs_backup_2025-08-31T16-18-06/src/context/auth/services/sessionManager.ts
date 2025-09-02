/**
 * مدير الجلسات المحسن
 * يتولى جميع عمليات إدارة الجلسات والتحقق منها
 */

import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import type { UserCacheItem, AuthError } from '../types';
import { 
  saveSessionCache, 
  loadSessionCache, 
  saveUserCache, 
  isValidUserCache 
} from '../utils/authStorage';
import { 
  validateSession, 
  createAuthError, 
  handleAuthError, 
  trackPerformance,
  retryOperation 
} from '../utils/authHelpers';
import { AUTH_TIMEOUTS } from '../constants/authConstants';
import { sessionMonitor, getCurrentSession } from '@/lib/session-monitor';

/**
 * فئة إدارة الجلسات
 */
export class SessionManager {
  private userCache: UserCacheItem | null = null;
  private isProcessing = false;
  private retryCount = 0;
  private maxRetries = 3;

  /**
   * الحصول على المستخدم الحالي مع cache محسن
   */
  async getCurrentUser(): Promise<{ user: SupabaseUser | null; error: AuthError | null }> {
    const startTime = performance.now();
    
    try {
      // التحقق من sessionStorage أولاً (الأسرع)
      const sessionCached = loadSessionCache();
      if (sessionCached) {
        trackPerformance('getCurrentUser (session cache)', startTime);
        return { user: sessionCached, error: null };
      }
      
      // التحقق من cache الذاكرة
      if (this.userCache && isValidUserCache(this.userCache)) {
        // حفظ في sessionStorage للمرات القادمة
        saveSessionCache(this.userCache.user);
        trackPerformance('getCurrentUser (memory cache)', startTime);
        return { user: this.userCache.user, error: null };
      }
      
      // إذا كان هناك عملية جارية، انتظر النتيجة بدلاً من طلب جديد
      if (this.isProcessing) {
        let attempts = 0;
        const maxAttempts = 20; // 1 ثانية كحد أقصى
        
        return new Promise((resolve) => {
          const checkProcessing = () => {
            attempts++;
            if (!this.isProcessing) {
              // عاود المحاولة (ستكون من cache هذه المرة)
              this.getCurrentUser().then(resolve);
            } else if (attempts >= maxAttempts) {
              // انتهت المهلة، قم بطلب منفصل
              resolve({ user: null, error: createAuthError('انتهت مهلة انتظار الطلب', 'TIMEOUT') });
            } else {
              setTimeout(checkProcessing, 50);
            }
          };
          checkProcessing();
        });
      }
      
      this.isProcessing = true;
      
      try {
        // ⚡ طلب مباشر بدون retry لتحسين السرعة
        const client = await getSupabaseClient();
        const { data: { user }, error } = await client.auth.getUser();
        
        if (error) {
          throw error;
        }
        
        const result = user;
        
        // تحديث جميع أنواع cache
        this.userCache = saveUserCache(result);
        
        trackPerformance('getCurrentUser (API)', startTime);
        return { user: result, error: null };
        
      } catch (error) {
        const authError = handleAuthError(error);
        return { user: null, error: authError };
      }
      
    } catch (error) {
      const authError = handleAuthError(error);
      return { user: null, error: authError };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * الحصول على الجلسة الحالية
   */
  async getCurrentSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    const startTime = performance.now();
    
    try {
      const client = await getSupabaseClient();
      const { data: { session }, error } = await client.auth.getSession();
      
      if (error) {
        const authError = handleAuthError(error);
        return { session, error: authError };
      }
      
      trackPerformance('getCurrentSession', startTime);
      return { session, error: null };
      
    } catch (error) {
      const authError = handleAuthError(error);
      return { session: null, error: authError };
    }
  }

  /**
   * تجديد الجلسة - يستخدم المراقب الموحد
   */
  async refreshSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    const startTime = performance.now();
    
    try {
      // ✅ استخدام المراقب الموحد بدلاً من العميل المباشر
      const success = await sessionMonitor.manualRefresh();
      
      if (!success) {
        const authError: AuthError = {
          message: 'فشل في تجديد الجلسة',
          name: 'RefreshError',
          type: 'AUTH',
          code: 'REFRESH_FAILED'
        };
        return { session: null, error: authError };
      }
      
      // الحصول على الجلسة المحدثة
      const { session: newSession } = getCurrentSession();
      
      // تحديث cache المستخدم إذا تغير
      if (newSession?.user) {
        this.userCache = saveUserCache(newSession.user);
      }
      
      trackPerformance('refreshSession', startTime);
      return { session: newSession, error: null };
      
    } catch (error) {
      const authError = handleAuthError(error);
      return { session: null, error: authError };
    }
  }

  /**
   * التحقق من صحة الجلسة مع تجديد تلقائي - محسن
   */
  async validateSessionWithRefresh(session: Session | null): Promise<boolean> {
    if (!session) return false;
    
    try {
      // ✅ استخدام المراقب الموحد للتحقق
      const { isValid } = getCurrentSession();
      
      if (isValid) {
        return true;
      }
      
      // إذا كانت الجلسة غير صالحة، حاول تجديدها
      const success = await sessionMonitor.manualRefresh();
      return success;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * مسح cache الجلسة
   */
  clearSessionCache(): void {
    this.userCache = null;
    
    try {
      sessionStorage.removeItem('auth_session_cache');
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }
    
    if (process.env.NODE_ENV === 'development') {
    }
  }

  /**
   * إحصائيات cache
   */
  getCacheStats() {
    return {
      hasUserCache: !!this.userCache,
      userCacheAge: this.userCache ? Date.now() - this.userCache.timestamp : 0,
      isUserCacheValid: this.userCache ? isValidUserCache(this.userCache) : false,
      isProcessing: this.isProcessing,
      retryCount: this.retryCount
    };
  }

  /**
   * تعيين مستخدم في cache (للاستخدام الداخلي)
   */
  setCachedUser(user: SupabaseUser | null): void {
    this.userCache = saveUserCache(user);
  }

  /**
   * تنظيف الموارد
   */
  cleanup(): void {
    this.clearSessionCache();
    this.isProcessing = false;
    this.retryCount = 0;
  }
}

// إنشاء instance مشترك
export const sessionManager = new SessionManager();
