/**
 * خدمة المصادقة الأساسية
 * تتولى عمليات تسجيل الدخول والخروج والتسجيل
 */

import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, getSupabaseClient } from '@/lib/supabase';
import { ensureUserOrganizationLink } from '@/lib/api/auth-helpers';
import { authSingleton } from '@/lib/authSingleton';
import type { AuthResult, AuthError } from '../types';
import {
  saveAuthToStorage,
  clearAuthStorage,
  clearAuthStorageKeepOfflineCredentials,
  saveSessionCache
} from '../utils/authStorage';
import {
  createAuthError,
  handleAuthError,
  sanitizeUserData,
  trackPerformance
} from '../utils/authHelpers';
import { sessionManager } from './sessionManager';

/**
 * فئة خدمة المصادقة
 */
export class AuthService {
  private isSigningIn = false;
  private isSigningOut = false;

  /**
   * تسجيل الدخول
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    if (this.isSigningIn) {
      return {
        success: false,
        error: createAuthError('عملية تسجيل دخول جارية بالفعل', 'VALIDATION')
      };
    }

    const startTime = performance.now();
    this.isSigningIn = true;

    try {
      // التحقق من صحة البيانات
      if (!email || !password) {
        return {
          success: false,
          error: createAuthError('البريد الإلكتروني وكلمة المرور مطلوبان', 'VALIDATION')
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const authError = handleAuthError(error);
        return { success: false, error: authError };
      }

      if (!data.session || !data.user) {
        return {
          success: false,
          error: createAuthError('فشل في إنشاء الجلسة', 'AUTH')
        };
      }

      // التحقق من ربط المستخدم بالمؤسسة
      const linkResult = await ensureUserOrganizationLink(data.user.id);

      if (!linkResult.success) {
        return {
          success: false,
          error: createAuthError(
            linkResult.error || 'فشل في ربط المستخدم بالمؤسسة',
            'PERMISSION'
          ),
          needsOrganizationSetup: linkResult.error?.includes('غير مرتبط بأي مؤسسة')
        };
      }

      // تطهير أي بيانات مخزنة مؤقتاً قبل تحديث الحالة
      try {
        sessionStorage.removeItem('lastLoginRedirect');
        sessionStorage.removeItem('loginRedirectCount');
        // 🔒 مسح علامة explicit logout عند تسجيل الدخول الناجح
        localStorage.removeItem('bazaar_explicit_logout');
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthService] ✅ تم مسح علامة explicit logout');
        }
      } catch (error) {
        // تجاهل أخطاء sessionStorage
      }

      // حفظ بيانات المصادقة
      saveAuthToStorage(data.session, data.user);

      // تحديث cache المستخدم
      sessionManager.setCachedUser(data.user);
      saveSessionCache(data.user);

      trackPerformance('signIn', startTime);

      if (process.env.NODE_ENV === 'development') {
      }

      return { success: true, error: null };

    } catch (error) {
      const authError = handleAuthError(error);
      return { success: false, error: authError };
    } finally {
      this.isSigningIn = false;
    }
  }

  /**
   * تسجيل الدخول في وضع عدم الاتصال
   */
  async signInOffline(email: string): Promise<AuthResult> {
    if (this.isSigningIn) {
      return {
        success: false,
        error: createAuthError('عملية تسجيل دخول جارية بالفعل', 'VALIDATION')
      };
    }

    this.isSigningIn = true;

    try {
      // 1. التحقق من أننا فعلاً في وضع عدم الاتصال (أو السماح بذلك قسراً)
      if (navigator.onLine) {
        // يمكننا السماح بذلك كخيار احتياطي حتى لو كنا متصلين
        console.warn('[AuthService] Attempting offline login while online');
      }

      // 2. التحقق من البريد الإلكتروني المخزن
      const storedEmail = localStorage.getItem('bazaar_offline_login_email');

      if (!storedEmail || storedEmail.toLowerCase() !== email.toLowerCase()) {
        return {
          success: false,
          error: createAuthError('بيانات الدخول غير محفوظة لهذا المستخدم. يرجى الدخول بإنترنت أولاً.', 'AUTH')
        };
      }

      // 3. تحميل لقطة البيانات المخزنة
      const { loadOfflineAuthSnapshot } = await import('../utils/authStorage');
      const snapshot = loadOfflineAuthSnapshot();

      if (!snapshot || !snapshot.user) {
        return {
          success: false,
          error: createAuthError('لا توجد بيانات محفوظة. يرجى الدخول بإنترنت أولاً.', 'AUTH')
        };
      }

      // 🔒 مسح علامة explicit logout عند تسجيل الدخول الأوفلاين الناجح
      try {
        localStorage.removeItem('bazaar_explicit_logout');
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthService] ✅ تم مسح علامة explicit logout (offline login)');
        }
      } catch (error) {
        // تجاهل الأخطاء
      }

      // 4. استعادة الجلسة (محاكاة)
      const user = snapshot.user as SupabaseUser;
      const fakeSession: Session = {
        access_token: 'offline_token',
        refresh_token: 'offline_refresh_token',
        expires_in: 3600 * 24 * 30, // شهر
        expires_at: Math.floor(Date.now() / 1000) + (3600 * 24 * 30),
        token_type: 'bearer',
        user: user
      };

      // 5. تحديث الحالة في التطبيق
      saveAuthToStorage(fakeSession, user);
      sessionManager.setCachedUser(user);
      saveSessionCache(user);

      // 6. استعادة معرف المؤسسة إذا وجد
      if (snapshot.organizationId) {
        localStorage.setItem('bazaar_organization_id', snapshot.organizationId);
      }

      return { success: true, error: null };

    } catch (error) {
      console.error('[AuthService] Offline login failed', error);
      return {
        success: false,
        error: createAuthError('فشل تسجيل الدخول في وضع عدم الاتصال', 'AUTH')
      };
    } finally {
      this.isSigningIn = false;
    }
  }

  /**
   * تسجيل جديد
   */
  async signUp(email: string, password: string, name: string, currentSubdomain?: string | null): Promise<AuthResult> {
    const startTime = performance.now();

    try {
      // التحقق من صحة البيانات
      if (!email || !password || !name) {
        return {
          success: false,
          error: createAuthError('جميع الحقول مطلوبة', 'VALIDATION')
        };
      }

      const client = await getSupabaseClient();
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            role: currentSubdomain ? 'customer' : 'user' // تحديد الدور بناءً على النطاق الفرعي
          }
        }
      });

      if (error) {
        const authError = handleAuthError(error);
        return { success: false, error: authError };
      }

      if (data.session && data.user) {
        // حفظ بيانات المصادقة
        saveAuthToStorage(data.session, data.user);

        // تحديث cache المستخدم
        sessionManager.setCachedUser(data.user);
        saveSessionCache(data.user);
      }

      trackPerformance('signUp', startTime);

      if (process.env.NODE_ENV === 'development') {
      }

      return { success: true, error: null };

    } catch (error) {
      const authError = handleAuthError(error);
      return { success: false, error: authError };
    }
  }

  /**
   * تسجيل الخروج
   */
  async signOut(): Promise<void> {
    if (this.isSigningOut) {
      return;
    }

    const startTime = performance.now();
    this.isSigningOut = true;

    try {
      const client = await getSupabaseClient();
      const { error } = await client.auth.signOut();

      if (error) {
        if (process.env.NODE_ENV === 'development') {
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
    }

    // تنظيف البيانات المحلية مع الاحتفاظ ببيانات الأوفلاين
    clearAuthStorageKeepOfflineCredentials();
    sessionManager.clearSessionCache();
    authSingleton.clearAuth();

    trackPerformance('signOut', startTime);

    if (process.env.NODE_ENV === 'development') {
    }

    this.isSigningOut = false;
  }

  /**
   * إعادة تعيين كلمة المرور
   */
  async resetPassword(email: string): Promise<AuthResult> {
    try {
      if (!email) {
        return {
          success: false,
          error: createAuthError('البريد الإلكتروني مطلوب', 'VALIDATION')
        };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        const authError = handleAuthError(error);
        return { success: false, error: authError };
      }

      return { success: true, error: null };

    } catch (error) {
      const authError = handleAuthError(error);
      return { success: false, error: authError };
    }
  }

  /**
   * تحديث كلمة المرور
   */
  async updatePassword(newPassword: string): Promise<AuthResult> {
    try {
      if (!newPassword || newPassword.length < 6) {
        return {
          success: false,
          error: createAuthError('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'VALIDATION')
        };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        const authError = handleAuthError(error);
        return { success: false, error: authError };
      }

      return { success: true, error: null };

    } catch (error) {
      const authError = handleAuthError(error);
      return { success: false, error: authError };
    }
  }

  /**
   * التحقق من حالة المصادقة
   */
  getAuthStatus() {
    return {
      isSigningIn: this.isSigningIn,
      isSigningOut: this.isSigningOut
    };
  }

  /**
   * تنظيف الموارد
   */
  cleanup(): void {
    this.isSigningIn = false;
    this.isSigningOut = false;
  }
}

// إنشاء instance مشترك
export const authService = new AuthService();
