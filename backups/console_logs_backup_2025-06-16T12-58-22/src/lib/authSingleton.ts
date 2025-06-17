/**
 * 🎯 نظام Auth Singleton الشامل
 * يوحد جميع طلبات المصادقة ويمنع التكرار بشكل جذري
 */

import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthData {
  session: Session | null;
  user: User | null;
  timestamp: number;
}

interface AuthSubscriber {
  id: string;
  callback: (authData: AuthData) => void;
}

class AuthSingleton {
  private static instance: AuthSingleton;
  private authData: AuthData | null = null;
  private subscribers: AuthSubscriber[] = [];
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private authStateSubscription: any = null;
  private requestCounter = 0;
  private blockedRequests = 0;

  private constructor() {
    // AuthSingleton instance created
  }

  public static getInstance(): AuthSingleton {
    if (!AuthSingleton.instance) {
      AuthSingleton.instance = new AuthSingleton();
    }
    return AuthSingleton.instance;
  }

  /**
   * تهيئة النظام مرة واحدة فقط
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      // Get session once
      const { data: { session }, error } = await supabase.auth.getSession();
      this.requestCounter++;
      
      if (error) {
        this.authData = { session: null, user: null, timestamp: Date.now() };
      } else {
        this.authData = {
          session,
          user: session?.user || null,
          timestamp: Date.now()
        };
      }

      // Setup auth listener
      this.setupAuthListener();
      
      this.isInitialized = true;
      
      // Notify subscribers
      this.notifySubscribers();
      
    } catch (error) {
      this.authData = { session: null, user: null, timestamp: Date.now() };
      this.isInitialized = true;
      this.notifySubscribers();
    }
  }

  /**
   * إعداد مستمع واحد فقط لتغييرات المصادقة
   */
  private setupAuthListener(): void {
    if (this.authStateSubscription) {
      return; // مستمع موجود بالفعل
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        this.authData = {
          session,
          user: session?.user || null,
          timestamp: Date.now()
        };
        
        this.notifySubscribers();
      }
    );

    this.authStateSubscription = subscription;
  }

  /**
   * الحصول على بيانات المصادقة (مع منع الطلبات المكررة)
   */
  public async getAuth(): Promise<AuthData> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.authData) {
      // في حالة نادرة، إنشاء بيانات فارغة
      this.authData = { session: null, user: null, timestamp: Date.now() };
    }

    return this.authData;
  }

  /**
   * الحصول على المستخدم الحالي (بديل لـ supabase.auth.getUser)
   */
  public async getUser(): Promise<User | null> {
    this.blockedRequests++;
    
    const authData = await this.getAuth();
    return authData.user;
  }

  /**
   * الحصول على الجلسة الحالية (بديل لـ supabase.auth.getSession)
   */
  public async getSession(): Promise<Session | null> {
    this.blockedRequests++;
    
    const authData = await this.getAuth();
    return authData.session;
  }

  /**
   * التحقق من حالة المصادقة
   */
  public async isAuthenticated(): Promise<boolean> {
    const authData = await this.getAuth();
    return !!authData.session && !!authData.user;
  }

  /**
   * الحصول على معرف المستخدم
   */
  public async getUserId(): Promise<string | null> {
    const user = await this.getUser();
    return user?.id || null;
  }

  /**
   * الحصول على بريد المستخدم
   */
  public async getUserEmail(): Promise<string | null> {
    const user = await this.getUser();
    return user?.email || null;
  }

  /**
   * اشتراك في تحديثات المصادقة
   */
  public subscribe(callback: (authData: AuthData) => void): string {
    const id = `subscriber_${Date.now()}_${Math.random()}`;
    this.subscribers.push({ id, callback });
    
    // Send current data immediately if available
    if (this.authData) {
      callback(this.authData);
    }
    
    return id;
  }

  /**
   * إلغاء الاشتراك
   */
  public unsubscribe(id: string): void {
    const index = this.subscribers.findIndex(sub => sub.id === id);
    if (index > -1) {
      this.subscribers.splice(index, 1);
    }
  }

  /**
   * إشعار جميع المشتركين
   */
  private notifySubscribers(): void {
    if (!this.authData) return;
    
    console.log(`📢 AuthSingleton: إشعار ${this.subscribers.length} مشترك`);
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.callback(this.authData!);
      } catch (error) {
        console.error(`❌ AuthSingleton: خطأ في إشعار المشترك ${subscriber.id}:`, error);
      }
    });
  }

  /**
   * مسح البيانات عند تسجيل الخروج
   */
  public clearAuth(): void {
    console.log('🧹 AuthSingleton: مسح بيانات المصادقة');
    this.authData = { session: null, user: null, timestamp: Date.now() };
    this.notifySubscribers();
  }

  /**
   * إحصائيات الأداء
   */
  public getStats(): { totalRequests: number; blockedRequests: number; subscribers: number } {
    return {
      totalRequests: this.requestCounter,
      blockedRequests: this.blockedRequests,
      subscribers: this.subscribers.length
    };
  }

  /**
   * تنظيف الموارد
   */
  public cleanup(): void {
    if (this.authStateSubscription) {
      this.authStateSubscription.unsubscribe();
      this.authStateSubscription = null;
    }
    this.subscribers = [];
    console.log('🧹 AuthSingleton: تم تنظيف جميع الموارد');
  }
}

// تصدير المثيل الوحيد
export const authSingleton = AuthSingleton.getInstance();

// دوال مساعدة للاستخدام السهل
export const getCurrentUser = () => authSingleton.getUser();
export const getCurrentSession = () => authSingleton.getSession();
export const isUserAuthenticated = () => authSingleton.isAuthenticated();
export const getCurrentUserId = () => authSingleton.getUserId();
export const getCurrentUserEmail = () => authSingleton.getUserEmail();

// تهيئة تلقائية
authSingleton.initialize().catch(error => {
  console.error('💥 AuthSingleton: فشل في التهيئة التلقائية:', error);
});

export default authSingleton; 