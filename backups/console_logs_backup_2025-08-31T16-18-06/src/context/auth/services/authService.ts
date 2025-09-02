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
      } catch (error) {
        // تجاهل أخطاء sessionStorage
      }

      // حفظ بيانات المصادقة
      saveAuthToStorage(data.session, data.user);
      
      // تحديث cache المستخدم
      sessionManager.setCachedUser(data.user);
      saveSessionCache(data.user);

      // تنظيف cache المصادقة القديمة
      authSingleton.setAuth(data.session, data.user);

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

        // تحديث AuthSingleton
        authSingleton.setAuth(data.session, data.user);
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
    
    // تنظيف جميع البيانات المحلية
    clearAuthStorage();
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
