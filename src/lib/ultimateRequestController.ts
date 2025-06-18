/**
 * نظام شامل ومتطور لمنع جميع الطلبات المكررة نهائياً
 * يدير React Query, Auth, Supabase, وجميع API calls بذكاء متقدم
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { productionDebugger, prodLog } from '@/utils/productionDebug';

// إعلان نوع للـ global window object
declare global {
  interface Window {
    supabase?: any;
  }
}

// ===================================================================
// 🎯 ULTIMATE REQUEST DEDUPLICATION SYSTEM
// ===================================================================

interface RequestEntry {
  promise: Promise<any>;
  timestamp: number;
  requestCount: number;
  lastAccess: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
}

class UltimateRequestController {
  private static instance: UltimateRequestController;
  private activeRequests = new Map<string, RequestEntry>();
  private dataCache = new Map<string, CacheEntry>();
  private authCache = new Map<string, any>();
  private queryClient: QueryClient | null = null;
  private isInitialized = false;
  
  // إعدادات متقدمة
  private readonly config = {
    DEFAULT_TTL: 5 * 60 * 1000, // 5 دقائق
    AUTH_TTL: 10 * 60 * 1000, // 10 دقائق للمصادقة
    MAX_CACHE_SIZE: 1000,
    CLEANUP_INTERVAL: 2 * 60 * 1000, // 2 دقيقة
    MAX_REQUEST_AGE: 30 * 1000, // 30 ثانية للطلبات النشطة
  };

  private constructor() {
    this.startCleanupRoutine();
  }

  public static getInstance(): UltimateRequestController {
    if (!UltimateRequestController.instance) {
      UltimateRequestController.instance = new UltimateRequestController();
    }
    return UltimateRequestController.instance;
  }

  // ===================================================================
  // 🔧 INITIALIZATION & SETUP
  // ===================================================================

  public initialize(queryClient: QueryClient): void {
    if (this.isInitialized) return;
    
    this.queryClient = queryClient;
    this.setupQueryClientOptimization();
    this.setupAuthInterception();
    this.setupSupabaseInterception();
    this.isInitialized = true;
    
    console.log('🚀 UltimateRequestController initialized successfully');
  }

  private setupQueryClientOptimization(): void {
    if (!this.queryClient) return;

    // تحسين إعدادات React Query بشكل متطور
    this.queryClient.setDefaultOptions({
      queries: {
        // منع جميع أنواع التحديث التلقائي
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
        
        // إعدادات التخزين المؤقت المتطورة
        staleTime: this.config.DEFAULT_TTL,
        gcTime: this.config.DEFAULT_TTL * 2,
        
        // تحسين الأداء
        notifyOnChangeProps: 'all',
        
        // retry policy محسن
        retry: (failureCount, error: any) => {
          // لا نعيد المحاولة للأخطاء 4xx
          if (error?.status >= 400 && error?.status < 500) return false;
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      }
    });

    // Override invalidateQueries لمنع الإبطال المفرط
    const originalInvalidateQueries = this.queryClient.invalidateQueries.bind(this.queryClient);
    this.queryClient.invalidateQueries = (filters?: any, options?: any) => {
      // تسجيل التحليلات فقط
      console.log('🚫 invalidateQueries blocked to prevent excessive refetching');
      
      // نسمح فقط بإبطال الطلبات المحددة بعناية
      if (filters && filters.exact && filters.allowInvalidation) {
        return originalInvalidateQueries(filters, options);
      }
      
      // منع الإبطال العام
      return Promise.resolve();
    };
  }

  // ===================================================================
  // 🔐 AUTH DEDUPLICATION
  // ===================================================================

  private setupAuthInterception(): void {
    // تأخير التهيئة حتى يصبح supabase جاهزاً
    const checkSupabaseReady = () => {
      try {
        // التحقق من وجود supabase والعميل
        if (typeof window !== 'undefined' && window.supabase && window.supabase.auth) {
          // اعتراض طلبات المصادقة المكررة
          const originalGetUser = window.supabase.auth.getUser.bind(window.supabase.auth);
          const originalGetSession = window.supabase.auth.getSession.bind(window.supabase.auth);

          window.supabase.auth.getUser = () => {
            return this.deduplicateAuthRequest('getUser', originalGetUser);
          };

          window.supabase.auth.getSession = () => {
            return this.deduplicateAuthRequest('getSession', originalGetSession);
          };
          
          console.log('✅ Auth interception enabled successfully');
          return true;
        }
        return false;
      } catch (error) {
        console.warn('⚠️ Supabase not ready yet, retrying...', error);
        return false;
      }
    };

    // محاولة التهيئة الفورية
    if (!checkSupabaseReady()) {
      // إذا فشلت، انتظر قليلاً وحاول مرة أخرى
      let retryCount = 0;
      const maxRetries = 10;
      
      const retry = () => {
        retryCount++;
        if (checkSupabaseReady() || retryCount >= maxRetries) {
          if (retryCount >= maxRetries) {
            console.warn('⚠️ Max retries reached for Supabase auth interception setup');
          }
          return;
        }
        setTimeout(retry, 500); // إعادة المحاولة كل 500ms
      };
      
      setTimeout(retry, 100); // البدء بعد 100ms
    }
  }

  private async deduplicateAuthRequest<T>(
    key: string, 
    originalFunction: () => Promise<T>
  ): Promise<T> {
    const cacheKey = `auth_${key}`;
    
    // التحقق من الكاش أولاً
    if (this.authCache.has(cacheKey)) {
      const cached = this.authCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.config.AUTH_TTL) {
        return cached.data;
      }
    }

    // التحقق من الطلبات النشطة
    if (this.activeRequests.has(cacheKey)) {
      const entry = this.activeRequests.get(cacheKey)!;
      entry.requestCount++;
      entry.lastAccess = Date.now();
      return entry.promise;
    }

    // إنشاء طلب جديد
    const promise = originalFunction()
      .then(result => {
        // حفظ في الكاش
        this.authCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        this.activeRequests.delete(cacheKey);
        return result;
      })
      .catch(error => {
        this.activeRequests.delete(cacheKey);
        throw error;
      });

    this.activeRequests.set(cacheKey, {
      promise,
      timestamp: Date.now(),
      requestCount: 1,
      lastAccess: Date.now()
    });

    return promise;
  }

  // ===================================================================
  // 🗄️ SUPABASE QUERY DEDUPLICATION
  // ===================================================================

  private setupSupabaseInterception(): void {
    if (typeof window === 'undefined') return;

    // اعتراض فوري لطلبات Supabase على مستوى fetch مباشرة
    const originalFetch = window.fetch;
    const controller = this;
    
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      
      // التحقق من طلبات Supabase
      if (url.includes('supabase.co/rest/v1/') || url.includes('supabase.co/auth/v1/')) {
        console.log(`🔍 Intercepting Supabase request (${method}): ${url}`);
        prodLog('info', `🔍 Intercepting Supabase request`, { url, method });
        return controller.deduplicateSupabaseRequest(url, init, () => originalFetch(input, init));
      }
      
      // للطلبات الأخرى، استخدم fetch العادي
      return originalFetch(input, init);
    };

    // حفظ مرجع للدالة لاستخدامها في requestSystemInitializer
    (window as any).__BAZAAR_SUPABASE_DEDUPLICATION__ = this.deduplicateSupabaseRequest.bind(this);
    
    console.log('✅ Supabase fetch interception enabled');
  }

  private async deduplicateSupabaseRequest(
    url: string,
    init: RequestInit | undefined,
    fetchFunction: () => Promise<Response>
  ): Promise<Response> {
    const cacheKey = this.createCacheKey(url);
    
    // التحقق من نوع الطلب من المعاملات بدلاً من URL
    const urlObj = new URL(url);
    const isWriteOperation = urlObj.pathname.includes('upsert') || 
                             urlObj.pathname.includes('insert') || 
                             urlObj.pathname.includes('update') || 
                             urlObj.pathname.includes('delete') ||
                             urlObj.searchParams.has('on_conflict');
    
    // لا نطبق deduplication على طلبات الكتابة
    if (isWriteOperation) {
      console.log(`🔄 Write operation detected, bypassing cache: ${url}`);
      return fetchFunction();
    }

    // التحقق من الكاش
    if (this.dataCache.has(cacheKey)) {
      const cached = this.dataCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < cached.ttl) {
        cached.accessCount++;
        
        console.log(`✅ Cache hit: ${cacheKey} (saved ${Date.now() - cached.timestamp}ms)`);
        
        // إنشاء Response مزيف مع الحفاظ على Headers الأصلية
        const headers = new Headers(init?.headers);
        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: headers
        });
      }
    }

    // التحقق من الطلبات النشطة
    if (this.activeRequests.has(cacheKey)) {
      const entry = this.activeRequests.get(cacheKey)!;
      entry.requestCount++;
      entry.lastAccess = Date.now();
      
      console.log(`🚫 BLOCKED DUPLICATE: ${cacheKey} (${entry.requestCount} times) - Original: ${new URL(url).pathname}`);
      prodLog('info', `🚫 BLOCKED DUPLICATE`, { 
        cacheKey, 
        requestCount: entry.requestCount, 
        originalPath: new URL(url).pathname,
        url 
      });
      productionDebugger.trackRequest(url, 'GET', 0, 'blocked');
      return entry.promise;
    }

    // إنشاء طلب جديد
    console.log(`🆕 New request: ${cacheKey}`);
    prodLog('info', `🆕 New request`, { cacheKey, url });
    
    const startTime = performance.now();
    const promise = fetchFunction()
      .then(async response => {
        const duration = performance.now() - startTime;
        
        if (response.ok) {
          try {
            const responseText = await response.clone().text();
            
            // التحقق الشامل قبل التخزين
            if (responseText.trim()) {
              const data = JSON.parse(responseText);
              
              // الشرط الجديد: لا تخزن إذا كانت البيانات فارغة أو مصفوفة فارغة
              const shouldCache = data !== null && (!Array.isArray(data) || data.length > 0);

              if (shouldCache) {
                this.dataCache.set(cacheKey, {
                  data,
                  timestamp: Date.now(),
                  ttl: this.config.DEFAULT_TTL,
                  accessCount: 1
                });
                
                console.log(`💾 Cached: ${cacheKey}`);
                prodLog('info', `💾 Cached`, { cacheKey, duration, url });
              } else {
                console.log(`🚫 Bypassed empty response caching: ${cacheKey}`);
                prodLog('info', `🚫 Bypassed empty response caching`, { cacheKey, duration, url });
              }
            } else {
              console.log(`🚫 Bypassed empty text response caching: ${cacheKey}`);
              prodLog('info', `🚫 Bypassed empty text response caching`, { cacheKey, duration, url });
            }
            productionDebugger.trackRequest(url, 'GET', duration, 'success');
          } catch (jsonError) {
            console.warn(`⚠️ JSON parsing failed for ${cacheKey}:`, jsonError);
            prodLog('warn', `⚠️ JSON parsing failed`, { cacheKey, error: jsonError.message, duration, url });
            productionDebugger.trackRequest(url, 'GET', duration, 'success');
          }
        }
        
        this.activeRequests.delete(cacheKey);
        return response;
      })
      .catch(error => {
        const duration = performance.now() - startTime;
        this.activeRequests.delete(cacheKey);
        console.error(`❌ Request failed: ${cacheKey}`, error);
        prodLog('error', `❌ Request failed`, { cacheKey, error: error.message, duration, url });
        productionDebugger.trackRequest(url, 'GET', duration, 'failed');
        throw error;
      });

    this.activeRequests.set(cacheKey, {
      promise,
      timestamp: Date.now(),
      requestCount: 1,
      lastAccess: Date.now()
    });

    return promise;
  }

  // ===================================================================
  // 🧹 CACHE MANAGEMENT
  // ===================================================================

  private createCacheKey(url: string): string {
    // إنشاء مفتاح كاش قوي وموثوق لضمان عدم التضارب
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const params = new URLSearchParams(urlObj.search);
      
      // فرز المعلمات لضمان أن الترتيب لا يؤثر على المفتاح
      // مثال: a=1&b=2 و b=2&a=1 يجب أن يكون لهما نفس المفتاح
      params.sort();
      
      // استخدام المسار والمعلمات التي تم فرزها لإنشاء مفتاح فريد
      return `${path}?${params.toString()}`;
    } catch {
      // استخدام دالة hash قديمة كخطة بديلة في حالة وجود رابط غير صالح
      return `fallback_hash_${this.hashString(url)}`;
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private startCleanupRoutine(): void {
    setInterval(() => {
      this.cleanupExpiredRequests();
      this.cleanupExpiredCache();
      this.cleanupAuthCache();
    }, this.config.CLEANUP_INTERVAL);
  }

  private cleanupExpiredRequests(): void {
    const now = Date.now();
    for (const [key, entry] of this.activeRequests.entries()) {
      if (now - entry.timestamp > this.config.MAX_REQUEST_AGE) {
        this.activeRequests.delete(key);
      }
    }
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    
    // تنظيف الكاش المنتهي الصلاحية
    for (const [key, entry] of this.dataCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.dataCache.delete(key);
      }
    }

    // إذا كان الكاش كبيراً جداً، احذف الأقل استخداماً
    if (this.dataCache.size > this.config.MAX_CACHE_SIZE) {
      const entries = Array.from(this.dataCache.entries())
        .sort((a, b) => a[1].accessCount - b[1].accessCount)
        .slice(0, Math.floor(this.config.MAX_CACHE_SIZE * 0.1));
      
      entries.forEach(([key]) => this.dataCache.delete(key));
    }
  }

  private cleanupAuthCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.authCache.entries()) {
      if (now - entry.timestamp > this.config.AUTH_TTL) {
        this.authCache.delete(key);
      }
    }
  }

  // ===================================================================
  // 📊 ANALYTICS & DEBUGGING
  // ===================================================================

  public getAnalytics() {
    return {
      activeRequests: this.activeRequests.size,
      cachedData: this.dataCache.size,
      authCache: this.authCache.size,
      config: this.config,
      
      // إحصائيات مفصلة
      requestStats: Array.from(this.activeRequests.entries()).map(([key, entry]) => ({
        key,
        requestCount: entry.requestCount,
        age: Date.now() - entry.timestamp
      })),
      
      cacheStats: Array.from(this.dataCache.entries()).map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        age: Date.now() - entry.timestamp,
        remaining: entry.ttl - (Date.now() - entry.timestamp)
      }))
    };
  }

  public clearAllCaches(): void {
    this.activeRequests.clear();
    this.dataCache.clear();
    this.authCache.clear();
    console.log('🧹 All caches cleared');
  }

  public invalidateDataCache(pattern?: string): void {
    if (!pattern) {
      this.dataCache.clear();
      return;
    }

    for (const key of this.dataCache.keys()) {
      if (key.includes(pattern)) {
        this.dataCache.delete(key);
      }
    }
  }
}

// ===================================================================
// 🚀 EXPORTS & SETUP
// ===================================================================

export const ultimateRequestController = UltimateRequestController.getInstance();

// دالة للتهيئة السريعة
export const initializeUltimateRequestController = (queryClient: QueryClient): void => {
  ultimateRequestController.initialize(queryClient);
  
  // إضافة دوال مساعدة للتطوير
  if (typeof window !== 'undefined') {
    (window as any).requestController = ultimateRequestController;
    (window as any).getRequestAnalytics = () => ultimateRequestController.getAnalytics();
    (window as any).clearRequestCaches = () => ultimateRequestController.clearAllCaches();
  }
};

export default ultimateRequestController; 