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
    console.log('🛡️ AuthInterceptorV2: تم إنشاء المعترض');
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
      console.log('⚠️ AuthInterceptorV2: النظام مفعل بالفعل');
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
      console.log('🎯 AuthInterceptorV2: تم تفعيل الاعتراض الشامل بنجاح');
      
    } catch (error) {
      console.error('💥 AuthInterceptorV2: فشل في تفعيل الاعتراض:', error);
    }
  }

  /**
   * اعتراض getUser
   */
  private async interceptGetUser(): Promise<any> {
    this.stats.getUser++;
    this.stats.total++;
    
    console.log(`🚫 AuthInterceptorV2: تم اعتراض getUser رقم ${this.stats.getUser} - توجيه إلى AuthSingleton`);
    
    try {
      const user = await authSingleton.getUser();
      return {
        data: { user },
        error: null
      };
    } catch (error) {
      console.error('❌ AuthInterceptorV2: خطأ في getUser:', error);
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
    
    console.log(`🚫 AuthInterceptorV2: تم اعتراض getSession رقم ${this.stats.getSession} - توجيه إلى AuthSingleton`);
    
    try {
      const session = await authSingleton.getSession();
      return {
        data: { session },
        error: null
      };
    } catch (error) {
      console.error('❌ AuthInterceptorV2: خطأ في getSession:', error);
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
    
    console.log(`🚫 AuthInterceptorV2: تم اعتراض onAuthStateChange رقم ${this.stats.onAuthStateChange} - توجيه إلى AuthSingleton`);
    
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
        console.error('❌ AuthInterceptorV2: خطأ في callback:', error);
      }
    });

    // إرجاع كائن subscription متوافق
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            console.log(`🗑️ AuthInterceptorV2: إلغاء اشتراك ${subscriptionId}`);
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
      console.log('⚠️ AuthInterceptorV2: النظام غير مفعل');
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
      console.log('🔓 AuthInterceptorV2: تم إيقاف الاعتراض');
      
    } catch (error) {
      console.error('💥 AuthInterceptorV2: فشل في إيقاف الاعتراض:', error);
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
    console.log('🔄 AuthInterceptorV2: تم إعادة تعيين الإحصائيات');
  }

  /**
   * طباعة تقرير مفصل
   */
  public printReport(): void {
    console.log('📊 AuthInterceptorV2 - تقرير الأداء:');
    console.log(`   🚫 getUser: ${this.stats.getUser} طلب محظور`);
    console.log(`   🚫 getSession: ${this.stats.getSession} طلب محظور`);
    console.log(`   🚫 onAuthStateChange: ${this.stats.onAuthStateChange} مستمع محظور`);
    console.log(`   📈 إجمالي الطلبات المحظورة: ${this.stats.total}`);
    console.log(`   ⚡ حالة النظام: ${this.isEnabled ? 'مفعل' : 'معطل'}`);
    
    // إحصائيات AuthSingleton
    const singletonStats = authSingleton.getStats();
    console.log('📊 AuthSingleton - إحصائيات:');
    console.log(`   ✅ طلبات حقيقية: ${singletonStats.totalRequests}`);
    console.log(`   🚫 طلبات محظورة: ${singletonStats.blockedRequests}`);
    console.log(`   👥 مشتركين نشطين: ${singletonStats.subscribers}`);
    
    const efficiency = this.stats.total > 0 ? 
      ((this.stats.total / (this.stats.total + singletonStats.totalRequests)) * 100).toFixed(1) : 0;
    console.log(`   🎯 كفاءة النظام: ${efficiency}% من الطلبات تم منعها`);
  }
}

// تصدير المثيل الوحيد
export const authInterceptorV2 = AuthInterceptorV2.getInstance();

/**
 * تفعيل النظام الشامل
 */
export function enableAuthInterception(): void {
  console.log('🚀 بدء تفعيل نظام الاعتراض الشامل...');
  
  // تهيئة AuthSingleton أولاً
  authSingleton.initialize().then(() => {
    // تفعيل الاعتراض
    authInterceptorV2.enable();
    
    // طباعة تقرير أولي
    setTimeout(() => {
      authInterceptorV2.printReport();
    }, 2000);
    
    console.log('✅ تم تفعيل نظام الاعتراض الشامل بنجاح');
  }).catch(error => {
    console.error('💥 فشل في تفعيل نظام الاعتراض:', error);
  });
}

/**
 * إيقاف النظام
 */
export function disableAuthInterception(): void {
  authInterceptorV2.disable();
  console.log('🔓 تم إيقاف نظام الاعتراض');
}

/**
 * الحصول على تقرير الأداء
 */
export function getInterceptionReport(): void {
  authInterceptorV2.printReport();
}

export default authInterceptorV2; 