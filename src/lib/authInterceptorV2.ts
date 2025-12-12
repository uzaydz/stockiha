/**
 * 🛡️ نظام الاعتراض الشامل للمصادقة V2
 * يحل محل جميع استدعاءات Supabase auth ويوجهها إلى AuthSingleton
 */

import { supabase } from '@/lib/supabase';
import { authSingleton } from './authSingleton';

interface InterceptionStats {
  getUser: number;
  getSession: number;
  onAuthStateChange: number;
  total: number;
}

class AuthInterceptorV2 {
  private static instance: AuthInterceptorV2;
  private isEnabled = false;
  private isInInterception = false;
  private stats: InterceptionStats = {
    getUser: 0,
    getSession: 0,
    onAuthStateChange: 0,
    total: 0
  };
  
  // حفظ الدوال الأصلية
  private originalGetUser: any;
  private originalGetSession: any;
  private originalOnAuthStateChange: any;

  private constructor() {
  }

  public static getInstance(): AuthInterceptorV2 {
    if (!AuthInterceptorV2.instance) {
      AuthInterceptorV2.instance = new AuthInterceptorV2();
    }
    return AuthInterceptorV2.instance;
  }

  /**
   * تفعيل نظام الاعتراض الشامل
   */
  public enable(): void {
    if (this.isEnabled) {
      return;
    }

    try {
      // حفظ الدوال الأصلية
      this.originalGetUser = supabase.auth.getUser.bind(supabase.auth);
      this.originalGetSession = supabase.auth.getSession.bind(supabase.auth);
      this.originalOnAuthStateChange = supabase.auth.onAuthStateChange.bind(supabase.auth);

      // استبدال getUser
      supabase.auth.getUser = this.interceptGetUser.bind(this);
      
      // استبدال getSession
      supabase.auth.getSession = this.interceptGetSession.bind(this);
      
      // استبدال onAuthStateChange
      supabase.auth.onAuthStateChange = this.interceptOnAuthStateChange.bind(this);

      this.isEnabled = true;
      
    } catch (error) {
    }
  }

  /**
   * اعتراض getUser
   */
  private async interceptGetUser(): Promise<any> {
    this.stats.getUser++;
    this.stats.total++;

    try {
      const user = await authSingleton.getUser();
      return {
        data: { user },
        error: null
      };
    } catch (error) {
      return {
        data: { user: null },
        error
      };
    }
  }

  /**
   * اعتراض getSession
   */
  private async interceptGetSession(): Promise<any> {
    this.stats.getSession++;
    this.stats.total++;

    try {
      // إضافة حماية من الحلقة اللانهائية
      if (this.isInInterception) {
        // ⚡ بدلاً من إرجاع خطأ، نستخدم الدالة الأصلية مباشرة
        console.warn('[AuthInterceptorV2] ⚠️ Interception loop detected, using original getSession');
        if (this.originalGetSession) {
          return await this.originalGetSession();
        }
        return {
          data: { session: null },
          error: null
        };
      }

      this.isInInterception = true;
      const session = await authSingleton.getSession();
      this.isInInterception = false;
      return {
        data: { session },
        error: null
      };
    } catch (error) {
      this.isInInterception = false;
      return {
        data: { session: null },
        error
      };
    }
  }

  /**
   * اعتراض onAuthStateChange
   */
  private interceptOnAuthStateChange(callback: (event: string, session: any) => void): any {
    this.stats.onAuthStateChange++;
    this.stats.total++;

    // اشتراك في AuthSingleton بدلاً من Supabase مباشرة
    const subscriptionId = authSingleton.subscribe((authData) => {
      // تحديد نوع الحدث بناءً على التغيير
      let event = 'SIGNED_IN';
      if (!authData.session && !authData.user) {
        event = 'SIGNED_OUT';
      } else if (authData.session && authData.user) {
        event = 'SIGNED_IN';
      }
      
      try {
        callback(event, authData.session);
      } catch (error) {
      }
    });

    // إرجاع كائن subscription متوافق
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authSingleton.unsubscribe(subscriptionId);
          }
        }
      }
    };
  }

  /**
   * إيقاف نظام الاعتراض
   */
  public disable(): void {
    if (!this.isEnabled) {
      return;
    }

    try {
      // استعادة الدوال الأصلية
      if (this.originalGetUser) {
        supabase.auth.getUser = this.originalGetUser;
      }
      if (this.originalGetSession) {
        supabase.auth.getSession = this.originalGetSession;
      }
      if (this.originalOnAuthStateChange) {
        supabase.auth.onAuthStateChange = this.originalOnAuthStateChange;
      }

      this.isEnabled = false;
      
    } catch (error) {
    }
  }

  /**
   * الحصول على إحصائيات الاعتراض
   */
  public getStats(): InterceptionStats & { enabled: boolean } {
    return {
      ...this.stats,
      enabled: this.isEnabled
    };
  }

  /**
   * إعادة تعيين الإحصائيات
   */
  public resetStats(): void {
    this.stats = {
      getUser: 0,
      getSession: 0,
      onAuthStateChange: 0,
      total: 0
    };
  }

  /**
   * طباعة تقرير مفصل
   */
  public printReport(): void {
    
    // إحصائيات AuthSingleton
    const singletonStats = authSingleton.getStats();
    
    const efficiency = this.stats.total > 0 ? 
      ((this.stats.total / (this.stats.total + singletonStats.totalRequests)) * 100).toFixed(1) : 0;
  }
}

// تصدير المثيل الوحيد
export const authInterceptorV2 = AuthInterceptorV2.getInstance();

/**
 * تفعيل النظام الشامل
 */
export function enableAuthInterception(): void {
  
  // تهيئة AuthSingleton أولاً
  authSingleton.initialize().then(() => {
    // تفعيل الاعتراض
    authInterceptorV2.enable();
    
    // طباعة تقرير أولي
    setTimeout(() => {
      authInterceptorV2.printReport();
    }, 2000);
    
  }).catch(error => {
  });
}

/**
 * إيقاف النظام
 */
export function disableAuthInterception(): void {
  authInterceptorV2.disable();
}

/**
 * الحصول على تقرير الأداء
 */
export function getInterceptionReport(): void {
  authInterceptorV2.printReport();
}

export default authInterceptorV2;
