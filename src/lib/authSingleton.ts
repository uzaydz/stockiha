/**
 * 🎯 نظام Auth Singleton الشامل المحسن
 * يوحد جميع طلبات المصادقة ويمنع التكرار بشكل جذري
 * الهدف: تقليل استدعاءات auth/v1/user إلى 1-2 فقط
 */

import { supabase } from '@/lib/supabase';
import { isSupabaseReady } from '@/lib/supabase-unified';
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

interface AuthCache {
  data: AuthData;
  expiresAt: number;
  requestId: string;
}

class AuthSingleton {
  private static instance: AuthSingleton;
  private cache: AuthCache | null = null;
  private subscribers: AuthSubscriber[] = [];
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private authStateSubscription: any = null;
  private activeRequests = new Map<string, Promise<AuthData>>();
  
  // إحصائيات
  private totalRequests = 0;
  private cacheHits = 0;
  private networkRequests = 0;
  
  // إعدادات الأداء
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 دقائق
  private readonly MAX_CONCURRENT_REQUESTS = 1;
  private readonly REQUEST_TIMEOUT = 15000; // 15 ثانية

  private constructor() {
    console.log('🔐 AuthSingleton: تم إنشاء المثيل الوحيد');
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

    console.log('🚀 AuthSingleton: بدء التهيئة');
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      // محاولة استعادة من cache المحلي أولاً
      const cached = this.loadFromLocalStorage();
      if (cached && this.isCacheValid(cached)) {
        this.cache = cached;
        console.log('✅ AuthSingleton: تم استعادة البيانات من localStorage');
      }

      // انتظار النظام الموحد مع timeout
      await this.waitForSupabaseReady();
      
      // جلب session مرة واحدة فقط
      await this.fetchAuthData('initialize');
      
      // إعداد مستمع المصادقة
      this.setupAuthListener();
      
      this.isInitialized = true;
      console.log('✅ AuthSingleton: تمت التهيئة بنجاح');
      
      // إشعار المشتركين
      this.notifySubscribers();
      
    } catch (error) {
      console.error('❌ AuthSingleton: خطأ في التهيئة:', error);
      this.cache = {
        data: { session: null, user: null, timestamp: Date.now() },
        expiresAt: Date.now() + this.CACHE_TTL,
        requestId: 'error'
      };
      this.isInitialized = true;
      this.notifySubscribers();
    }
  }

  /**
   * انتظار جاهزية Supabase مع timeout
   */
  private async waitForSupabaseReady(): Promise<void> {
    const timeout = 3000; // 3 ثوان
    const startTime = Date.now();
    
    while (!isSupabaseReady() && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    if (!isSupabaseReady()) {
      console.warn('⚠️ AuthSingleton: timeout انتظار Supabase');
    }
  }

  /**
   * جلب بيانات المصادقة مع حماية من التكرار
   */
  private async fetchAuthData(requestId: string): Promise<AuthData> {
    // التحقق من وجود طلب مماثل
    if (this.activeRequests.has(requestId)) {
      console.log(`🔄 AuthSingleton: استخدام طلب موجود (${requestId})`);
      return this.activeRequests.get(requestId)!;
    }

    // التحقق من cache
    if (this.cache && this.isCacheValid(this.cache)) {
      this.cacheHits++;
      console.log(`💾 AuthSingleton: استخدام cache (${requestId})`);
      return this.cache.data;
    }

    // إنشاء طلب جديد
    const requestPromise = this.performAuthRequest(requestId);
    this.activeRequests.set(requestId, requestPromise);

    try {
      const result = await requestPromise;
      this.activeRequests.delete(requestId);
      return result;
    } catch (error) {
      this.activeRequests.delete(requestId);
      throw error;
    }
  }

  /**
   * تنفيذ طلب المصادقة الفعلي
   */
  private async performAuthRequest(requestId: string): Promise<AuthData> {
    this.totalRequests++;
    this.networkRequests++;
    
    console.log(`🌐 AuthSingleton: طلب شبكة جديد (${requestId})`);
    
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Auth request timeout')), this.REQUEST_TIMEOUT)
    );

    try {
      const { data: { session }, error } = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]);

      if (error) {
        throw error;
      }

      const authData: AuthData = {
        session,
        user: session?.user || null,
        timestamp: Date.now()
      };

      // حفظ في cache
      this.cache = {
        data: authData,
        expiresAt: Date.now() + this.CACHE_TTL,
        requestId
      };

      // حفظ في localStorage
      this.saveToLocalStorage(this.cache);

      console.log(`✅ AuthSingleton: نجح الطلب (${requestId})`);
      return authData;

    } catch (error) {
      console.error(`❌ AuthSingleton: فشل الطلب (${requestId}):`, error);
      
      // محاولة fallback سريع مع getSession مباشرة
      try {
        console.log('🔄 AuthSingleton: محاولة fallback سريع...');
        const { data: { session }, error: fallbackError } = await supabase.auth.getSession();
        
        if (!fallbackError && session) {
          const authData: AuthData = {
            session,
            user: session.user || null,
            timestamp: Date.now()
          };
          
          // حفظ في cache
          this.cache = {
            data: authData,
            expiresAt: Date.now() + this.CACHE_TTL,
            requestId: `${requestId}-fallback`
          };
          
          console.log('✅ AuthSingleton: نجح الـ fallback');
          return authData;
        }
      } catch (fallbackError) {
        console.warn('⚠️ AuthSingleton: فشل الـ fallback أيضاً');
      }
      
      // في حالة الخطأ، استخدم cache قديم إن وجد
      if (this.cache) {
        console.log('💾 AuthSingleton: استخدام cache قديم بسبب الخطأ');
        return this.cache.data;
      }

      // إرجاع بيانات فارغة
      return { session: null, user: null, timestamp: Date.now() };
    }
  }

  /**
   * التحقق من صحة cache
   */
  private isCacheValid(cache: AuthCache): boolean {
    return Date.now() < cache.expiresAt;
  }

  /**
   * حفظ في localStorage
   */
  private saveToLocalStorage(cache: AuthCache): void {
    try {
      localStorage.setItem('bazaar_auth_singleton_cache', JSON.stringify({
        data: cache.data,
        expiresAt: cache.expiresAt,
        requestId: cache.requestId
      }));
    } catch (error) {
      console.warn('⚠️ AuthSingleton: فشل حفظ localStorage:', error);
    }
  }

  /**
   * تحميل من localStorage
   */
  private loadFromLocalStorage(): AuthCache | null {
    try {
      const stored = localStorage.getItem('bazaar_auth_singleton_cache');
      if (stored) {
        const cache = JSON.parse(stored);
        return {
          data: cache.data,
          expiresAt: cache.expiresAt,
          requestId: cache.requestId
        };
      }
    } catch (error) {
      console.warn('⚠️ AuthSingleton: فشل تحميل localStorage:', error);
    }
    return null;
  }

  /**
   * إعداد مستمع واحد فقط لتغييرات المصادقة
   */
  private setupAuthListener(): void {
    if (this.authStateSubscription) {
      return;
    }

    console.log('👂 AuthSingleton: إعداد مستمع المصادقة');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`🔄 AuthSingleton: تغيير حالة المصادقة - ${event}`);
        
        const authData: AuthData = {
          session,
          user: session?.user || null,
          timestamp: Date.now()
        };

        // تحديث cache
        this.cache = {
          data: authData,
          expiresAt: Date.now() + this.CACHE_TTL,
          requestId: 'auth_change'
        };

        // حفظ في localStorage
        this.saveToLocalStorage(this.cache);
        
        // إشعار المشتركين
        this.notifySubscribers();
      }
    );

    this.authStateSubscription = subscription;
  }

  /**
   * الحصول على بيانات المصادقة (الوظيفة الرئيسية)
   */
  public async getAuth(): Promise<AuthData> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.fetchAuthData('getAuth');
  }

  /**
   * الحصول على المستخدم الحالي (بديل لـ supabase.auth.getUser)
   */
  public async getUser(): Promise<User | null> {
    const authData = await this.getAuth();
    return authData.user;
  }

  /**
   * الحصول على الجلسة الحالية (بديل لـ supabase.auth.getSession)
   */
  public async getSession(): Promise<Session | null> {
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
    
    // إرسال البيانات الحالية فوراً
    if (this.cache?.data) {
      try {
        callback(this.cache.data);
      } catch (error) {
        console.error('❌ AuthSingleton: خطأ في إشعار المشترك:', error);
      }
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
    if (!this.cache?.data) return;
    
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.callback(this.cache!.data);
      } catch (error) {
        console.error('❌ AuthSingleton: خطأ في إشعار مشترك:', error);
      }
    });
  }

  /**
   * مسح البيانات عند تسجيل الخروج
   */
  public clearAuth(): void {
    this.cache = {
      data: { session: null, user: null, timestamp: Date.now() },
      expiresAt: Date.now() + this.CACHE_TTL,
      requestId: 'logout'
    };
    
    // مسح localStorage
    try {
      localStorage.removeItem('bazaar_auth_singleton_cache');
    } catch (error) {
      console.warn('⚠️ AuthSingleton: فشل مسح localStorage:', error);
    }
    
    this.notifySubscribers();
  }

  /**
   * فرض تحديث البيانات (لحالات خاصة)
   */
  public async forceRefresh(): Promise<AuthData> {
    console.log('🔄 AuthSingleton: فرض تحديث البيانات');
    
    // مسح cache
    this.cache = null;
    
    // مسح الطلبات النشطة
    this.activeRequests.clear();
    
    return this.fetchAuthData('force_refresh');
  }

  /**
   * إحصائيات الأداء
   */
  public getStats(): { 
    totalRequests: number; 
    cacheHits: number; 
    networkRequests: number;
    cacheHitRatio: string;
    subscribers: number;
    isInitialized: boolean;
    cacheStatus: string;
  } {
    const cacheHitRatio = this.totalRequests > 0 
      ? ((this.cacheHits / this.totalRequests) * 100).toFixed(1) 
      : '0';
      
    const cacheStatus = this.cache 
      ? (this.isCacheValid(this.cache) ? 'صالح' : 'منتهي الصلاحية')
      : 'غير موجود';

    return {
      totalRequests: this.totalRequests,
      cacheHits: this.cacheHits,
      networkRequests: this.networkRequests,
      cacheHitRatio: `${cacheHitRatio}%`,
      subscribers: this.subscribers.length,
      isInitialized: this.isInitialized,
      cacheStatus
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
    this.activeRequests.clear();
    this.cache = null;
    
    console.log('🧹 AuthSingleton: تم تنظيف الموارد');
  }
}

// إنشاء المثيل الوحيد
export const authSingleton = AuthSingleton.getInstance();

// دوال مساعدة سريعة
export const getCurrentUser = () => authSingleton.getUser();
export const getCurrentSession = () => authSingleton.getSession();
export const isUserAuthenticated = () => authSingleton.isAuthenticated();
export const getCurrentUserId = () => authSingleton.getUserId();
export const getCurrentUserEmail = () => authSingleton.getUserEmail();
export const getAuthStats = () => authSingleton.getStats();

// تهيئة تلقائية عند التحميل
authSingleton.initialize().catch(error => {
  console.error('❌ AuthSingleton: فشل التهيئة التلقائية:', error);
});

// طباعة إحصائيات الأداء كل 30 ثانية في بيئة التطوير
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = authSingleton.getStats();
    if (stats.totalRequests > 0) {
      console.log('📊 Auth Performance Summary:', {
        '🎯 Total Requests': stats.totalRequests,
        '💾 Cache Hits': stats.cacheHits,
        '🌐 Network Requests': stats.networkRequests,
        '📈 Hit Ratio': stats.cacheHitRatio,
        '🎮 Status': stats.isInitialized ? 'Ready' : 'Initializing',
        '💾 Cache': stats.cacheStatus
      });
    }
  }, 30000); // كل 30 ثانية
}
