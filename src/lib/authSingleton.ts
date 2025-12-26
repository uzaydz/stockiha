/**
 * 🎯 نظام Auth Singleton الشامل المحسن
 * يوحد جميع طلبات المصادقة ويمنع التكرار بشكل جذري
 * الهدف: تقليل استدعاءات auth/v1/user إلى 1-2 فقط
 */

// ⚡ v3.0: Module-level deduplication
let _authLoopWarningLogged = false;

import { supabase } from '@/lib/supabase';
import { isSupabaseReady } from '@/lib/supabase-unified';
import { Session, User } from '@supabase/supabase-js';
import { saveSecureSession } from '@/context/auth/utils/secureSessionStorage';

// ⚡ تخزين الدوال الأصلية قبل أي اعتراض لتجنب الحلقة اللانهائية
const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
const originalOnAuthStateChange = supabase.auth.onAuthStateChange.bind(supabase.auth);

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
  private isInAuthLoop = false;
  
  // إحصائيات
  private totalRequests = 0;
  private cacheHits = 0;
  private networkRequests = 0;
  
  // إعدادات الأداء
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 دقائق
  private readonly MAX_CONCURRENT_REQUESTS = 1;
  private readonly REQUEST_TIMEOUT = 15000; // 15 ثانية

  // إخفاء التوكنات عند تسجيلها لتجنب تسريب كامل القيمة
  private maskToken(token?: string | null): string {
    if (!token) return 'null';
    const tail = token.slice(-6);
    return `***${tail}`;
  }

  /**
   * ✅ قراءة الجلسة "الحقيقية" مباشرة من Supabase storage (بدون اعتراض AuthInterceptorV2)
   * مفيد عند بدء التشغيل لتجنب الاعتماد على SecureSession قديمة.
   */
  public async getRawSessionFromSupabaseStorage(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await originalGetSession();
      if (error) return null;
      return session ?? null;
    } catch {
      return null;
    }
  }

  private constructor() {
  }

  public static getInstance(): AuthSingleton {
    if (!AuthSingleton.instance) {
      AuthSingleton.instance = new AuthSingleton();
    }
    return AuthSingleton.instance;
  }

  /**
   * ⚡ فحص انتهاء صلاحية JWT Token
   * يتحقق من expires_at مع buffer 60 ثانية
   */
  private isTokenExpired(session: Session | null): boolean {
    if (!session?.expires_at) return true;

    // فحص مع buffer 60 ثانية قبل الانتهاء الفعلي
    const expiresAt = session.expires_at * 1000; // تحويل إلى milliseconds
    const now = Date.now();
    const buffer = 60 * 1000; // 1 دقيقة buffer

    const isExpired = now >= (expiresAt - buffer);

    if (isExpired) {
      console.log('[AuthSingleton] ⚠️ JWT Token expired or expiring soon');
    }

    return isExpired;
  }

  /**
   * ⚡ تجديد JWT Token إذا كان منتهياً أو قريباً من الانتهاء
   */
  private async refreshTokenIfNeeded(session: Session | null): Promise<Session | null> {
    if (!session || !this.isTokenExpired(session)) {
      return session; // لا حاجة للتجديد
    }

    console.log('[AuthSingleton] 🔄 Attempting to refresh expired token...');
    console.log('[AuthSingleton] 🔎 Refresh context:', {
      expiresAt: session?.expires_at,
      expiredAtMs: session?.expires_at ? session.expires_at * 1000 : null,
      nowMs: Date.now(),
      refreshTokenTail: this.maskToken(session?.refresh_token),
    });

    try {
      // ✅ لا نعتمد على refresh_token من cache (قد يكون stale بعد rotation)
      // Supabase SDK يستخدم refresh_token المخزّن داخلياً (storageKey) إن كان متاحاً
      const { data, error } = await supabase.auth.refreshSession();

      if (error) throw error;

      console.log('[AuthSingleton] ✅ refreshSession returned', {
        hasSession: Boolean(data.session),
        newAccessTokenTail: this.maskToken(data.session?.access_token),
        newRefreshTokenTail: this.maskToken(data.session?.refresh_token),
        expiresAt: data.session?.expires_at,
      });

      // تحديث الـ cache بالـ session الجديدة
      if (data.session) {
        console.log('[AuthSingleton] ✅ Token refreshed successfully');

        this.cache = {
          data: {
            session: data.session,
            user: data.session.user || null,
            timestamp: Date.now()
          },
          expiresAt: Date.now() + this.CACHE_TTL,
          requestId: 'token_refresh'
        };

        // ✅ تحديث SecureSession للأوفلاين حتى لا يبقى refresh_token قديم
        try {
          await saveSecureSession(data.session);
        } catch { }

        this.saveToLocalStorage(this.cache);
        this.notifySubscribers();
      }

      return data.session;
    } catch (error) {
      console.error('[AuthSingleton] ❌ Token refresh failed:', {
        message: (error as any)?.message,
        status: (error as any)?.status,
        name: (error as any)?.name,
      });

      // في حالة فشل التجديد، نمسح الـ cache
      this.clearAuth();

      return null;
    }
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
      // محاولة استعادة من cache المحلي أولاً
      const cached = this.loadFromLocalStorage();
      if (cached && this.isCacheValid(cached)) {
        this.cache = cached;
      }

      // انتظار النظام الموحد مع timeout
      await this.waitForSupabaseReady();
      
      // جلب session مرة واحدة فقط
      await this.fetchAuthData('initialize');
      
      // إعداد مستمع المصادقة
      this.setupAuthListener();
      
      this.isInitialized = true;
      
      // إشعار المشتركين
      this.notifySubscribers();
      
    } catch (error) {
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
    }
  }

  /**
   * جلب بيانات المصادقة مع حماية من التكرار
   * ⚡ محسّن: يتحقق من صلاحية JWT ويجدده إذا لزم الأمر
   */
  private async fetchAuthData(requestId: string): Promise<AuthData> {
    // التحقق من وجود طلب مماثل
    if (this.activeRequests.has(requestId)) {
      return this.activeRequests.get(requestId)!;
    }

    // التحقق من cache
    if (this.cache && this.isCacheValid(this.cache)) {
      this.cacheHits++;

      // ⚡ حتى لو كان الـ cache صالحاً، تحقق من JWT وجدده إذا لزم الأمر
      const refreshedSession = await this.refreshTokenIfNeeded(this.cache.data.session);
      if (refreshedSession && refreshedSession !== this.cache.data.session) {
        // تم التجديد - استخدم البيانات الجديدة
        return this.cache.data;
      }

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
   * الحصول على الجلسة مباشرة دون اعتراض
   * ⚡ يستخدم الدالة الأصلية المخزنة قبل تفعيل الاعتراض
   */
  private async getSessionDirect(): Promise<{ data: { session: any }, error: any }> {
    try {
      // إضافة حماية من الحلقة اللانهائية
      if (this.isInAuthLoop) {
        // ⚡ v3.0: سجل التحذير مرة واحدة فقط
        if (!_authLoopWarningLogged && process.env.NODE_ENV === 'development') {
          _authLoopWarningLogged = true;
          console.log('[AuthSingleton] ℹ️ Auth loop detected - using cached session (this is normal)');
        }
        // ⚡ بدلاً من إرجاع خطأ، نعيد البيانات المخزنة مؤقتاً
        if (this.cache?.data?.session) {
          return { data: { session: this.cache.data.session }, error: null };
        }
        return { data: { session: null }, error: null };
      }

      this.isInAuthLoop = true;
      // ⚡ استخدام الدالة الأصلية بدلاً من supabase.auth.getSession المعترضة
      const session = await originalGetSession();
      this.isInAuthLoop = false;
      return session;
    } catch (error) {
      this.isInAuthLoop = false;
      return { data: { session: null }, error };
    }
  }

  /**
   * تنفيذ طلب المصادقة الفعلي
   */
  private async performAuthRequest(requestId: string): Promise<AuthData> {
    this.totalRequests++;
    this.networkRequests++;

    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Auth request timeout')), this.REQUEST_TIMEOUT)
    );

    try {
      // استخدام الطريقة المباشرة لتجنب الحلقة اللانهائية
      const { data: { session }, error } = await Promise.race([
        this.getSessionDirect(),
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

      return authData;

    } catch (error) {
      
      // محاولة fallback سريع مع getSession مباشرة
      // ⚡ استخدام الدالة الأصلية لتجنب الحلقة اللانهائية
      try {
        const { data: { session }, error: fallbackError } = await originalGetSession();

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

          return authData;
        }
      } catch (fallbackError) {
      }
      
      // في حالة الخطأ، استخدم cache قديم إن وجد
      if (this.cache) {
        return this.cache.data;
      }

      // إرجاع بيانات فارغة
      return { session: null, user: null, timestamp: Date.now() };
    }
  }

  /**
   * التحقق من صحة cache
   * ⚡ محسّن: يفحص كل من cache TTL وصلاحية JWT Token
   */
  private isCacheValid(cache: AuthCache): boolean {
    const timeValid = Date.now() < cache.expiresAt;
    const tokenValid = !this.isTokenExpired(cache.data.session);

    let shouldLog = false;
    try {
      shouldLog = (import.meta as any).env?.DEV || localStorage.getItem('debug_auth_singleton') === '1';
    } catch {
      shouldLog = (import.meta as any).env?.DEV;
    }

    if (shouldLog) {
      if (!timeValid) {
        console.log('[AuthSingleton] ⏰ Cache expired (TTL)');
      }
      if (!tokenValid) {
        console.log('[AuthSingleton] 🔑 JWT Token expired in cache');
      }
    }

    return timeValid && tokenValid;
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
    }
    return null;
  }

  /**
   * إعداد مستمع واحد فقط لتغييرات المصادقة
   * ⚡ يستخدم الدالة الأصلية لتجنب الاعتراض
   */
  private setupAuthListener(): void {
    if (this.authStateSubscription) {
      return;
    }

    let lastEvent = '';
    let lastEventTime = 0;

    // ⚡ استخدام الدالة الأصلية بدلاً من المعترضة
    const { data: { subscription } } = originalOnAuthStateChange(
      (event, session) => {
        const now = Date.now();
        
        // تجنب طباعة نفس الحدث إذا تكرر خلال ثانيتين
        if (event !== lastEvent || (now - lastEventTime) > 2000) {
          lastEvent = event;
          lastEventTime = now;
        }
        
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

        // ✅ الأهم: عند TOKEN_REFRESHED أو أي تحديث Session، خزّن SecureSession
        // هذا يمنع الرجوع إلى refresh_token قديم بعد إعادة تشغيل التطبيق
        if (session) {
          try {
            void saveSecureSession(session);
          } catch { }
        }

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
    }
    
    this.notifySubscribers();
  }

  /**
   * فرض تحديث البيانات (لحالات خاصة)
   */
  public async forceRefresh(): Promise<AuthData> {
    
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
});

// طباعة إحصائيات الأداء بشكل ذكي في بيئة التطوير
if (process.env.NODE_ENV === 'development') {
  let lastLogTime = 0;
  let lastTotalRequests = 0;
  
  setInterval(() => {
    const stats = authSingleton.getStats();
    const now = Date.now();
    
    // اطبع الإحصائيات فقط إذا:
    // 1. كان هناك طلبات جديدة منذ آخر مرة
    // 2. أو مر أكثر من 5 دقائق منذ آخر طباعة
    // 3. أو كان هناك مشاكل في الأداء (نسبة cache منخفضة)
    const hasNewRequests = stats.totalRequests > lastTotalRequests;
    const timeSinceLastLog = now - lastLogTime;
    const poorPerformance = stats.totalRequests > 10 && parseFloat(stats.cacheHitRatio) < 70;
    
    if (hasNewRequests || timeSinceLastLog > 300000 || poorPerformance) {
      if (stats.totalRequests > 0) {
        
        lastLogTime = now;
        lastTotalRequests = stats.totalRequests;
      }
    }
  }, 60000); // كل دقيقة بدلاً من 30 ثانية
}
