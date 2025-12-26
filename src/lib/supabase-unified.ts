/**
 * نظام Supabase موحد محسن - يحل مشكلة تعدد الـ instances نهائياً
 * يضمن وجود client واحد فقط في كامل التطبيق مع حماية متقدمة
 * النسخة النهائية والآمنة مع تحسينات الأداء
 */

import { createClient } from '@supabase/supabase-js';
import { sqliteAuthStorage } from '@/lib/auth/sqliteStorage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// ⚡ ConnectionState removed - using navigator.onLine and fetch error handling instead
let connectionStateRef: any = null;

// 🔍 تشخيص متقدم لمتغيرات البيئة مع حماية من undefined
const getEnvSafely = (): Record<string, any> => {
  try {
    return typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  } catch (error) {
    console.warn('⚠️ import.meta.env غير متاح، استخدام fallback values');
    return {};
  }
};

const env = getEnvSafely();

if (env?.DEV) {
}

// متغيرات البيئة مع فحص و fallback آمن محسن
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://wrnssatuvmumsczyldth.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY';

if (env?.DEV) {
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ خطأ في إعدادات Supabase:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl,
    env: env,
    envKeys: Object.keys(env)
  });
  throw new Error('Supabase URL and anonymous key are required.');
}

// ⚡️ تحسين الشبكة: إضافة preconnect/dns-prefetch ديناميكياً لنطاق Supabase
try {
  if (typeof document !== 'undefined' && typeof URL !== 'undefined' && supabaseUrl) {
    const origin = new URL(supabaseUrl).origin;
    const ensureLink = (rel: string) => {
      const exists = document.querySelector(`link[rel="${rel}"][href="${origin}"]`);
      if (!exists) {
        const link = document.createElement('link');
        link.rel = rel as any;
        link.href = origin;
        if (rel === 'preconnect') link.crossOrigin = '';
        document.head.appendChild(link);
      }
    };
    ensureLink('preconnect');
    ensureLink('dns-prefetch');
  }
} catch { }

// 🔒 نظام حماية مبسط ومنطقي
class SupabaseProtector {
  private static instance: SupabaseProtector | null = null;
  private static isInitializing = false;

  private constructor() { }

  static getInstance(): SupabaseProtector {
    if (!SupabaseProtector.instance) {
      if (!SupabaseProtector.isInitializing) {
        SupabaseProtector.isInitializing = true;
        try {
          SupabaseProtector.instance = new SupabaseProtector();
        } finally {
          SupabaseProtector.isInitializing = false;
        }
      }
      return SupabaseProtector.instance;
    }
    return SupabaseProtector.instance;
  }

  // 🔒 منع إنشاء عملاء متعددين
  preventMultipleInstances(): void {
    if (typeof window === 'undefined') return;

    // حماية على مستوى window
    const protectionKey = '__BAZAAR_SUPABASE_PROTECTION__';
    if ((window as any)[protectionKey]) {
      throw new Error('Supabase client already exists - multiple instances prevented');
    }

    // تعيين علامة الحماية
    Object.defineProperty(window, protectionKey, {
      value: true,
      writable: false,
      configurable: false
    });

    // حماية على مستوى GoTrueClient
    this.overrideGoTrueClientCreation();
  }

  // 🔒 تجاوز إنشاء GoTrueClient لمنع التكرار
  private overrideGoTrueClientCreation(): void {
    if (typeof window === 'undefined') return;

    // حفظ الدالة الأصلية
    const originalCreateClient = (window as any).__ORIGINAL_SUPABASE_CREATE_CLIENT__ || createClient;
    if (!(window as any).__ORIGINAL_SUPABASE_CREATE_CLIENT__) {
      (window as any).__ORIGINAL_SUPABASE_CREATE_CLIENT__ = originalCreateClient;
    }

    // تجاوز createClient لمنع التكرار
    (window as any).createClient = function (...args: any[]) {
      // السماح فقط للعميل الرئيسي
      if ((window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__) {
        return (window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__;
      }

      // السماح للعميل الأول فقط
      return originalCreateClient(...args);
    };
  }

  // 🔒 تنظيف شامل
  cleanup(): void {
    if (typeof window === 'undefined') return;

    try {
      // إزالة علامات الحماية - استخدام try-catch لتجنب أخطاء الحذف
      if ((window as any).__BAZAAR_SUPABASE_PROTECTION__ !== undefined) {
        try {
          // محاولة إزالة بأمان
          Object.defineProperty(window, '__BAZAAR_SUPABASE_PROTECTION__', {
            value: undefined,
            writable: true,
            configurable: true
          });
          delete (window as any).__BAZAAR_SUPABASE_PROTECTION__;
        } catch (e) {
          // تجاهل الأخطاء - هذه علامة حماية فقط
        }
      }

      if ((window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__ !== undefined) {
        try {
          delete (window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__;
        } catch (e) {
          // تجاهل الأخطاء
        }
      }

      if ((window as any).__BAZAAR_SUPABASE_CLIENTS_COUNT__ !== undefined) {
        try {
          delete (window as any).__BAZAAR_SUPABASE_CLIENTS_COUNT__;
        } catch (e) {
          // تجاهل الأخطاء
        }
      }

      // إعادة الدالة الأصلية
      if ((window as any).__ORIGINAL_SUPABASE_CREATE_CLIENT__) {
        try {
          (window as any).createClient = (window as any).__ORIGINAL_SUPABASE_CREATE_CLIENT__;
          delete (window as any).__ORIGINAL_SUPABASE_CREATE_CLIENT__;
        } catch (e) {
          // تجاهل الأخطاء
        }
      }
    } catch (error) {
      // تجاهل جميع الأخطاء في التنظيف
    }
  }
}

// 🔒 نظام مراقبة متقدم
class AdvancedSupabaseMonitor {
  private static instances: Set<any> = new Set();
  private static creationTimes: Map<any, number> = new Map();
  private static storageKeys: Set<string> = new Set();
  private static warningShown = false;

  static registerClient(client: any, name: string): void {
    this.instances.add(client);
    this.creationTimes.set(client, Date.now());

    // فحص storage keys
    if (client.auth && (client.auth as any).storageKey) {
      this.storageKeys.add((client.auth as any).storageKey);
    }

    // تحذير عند وجود أكثر من عميل واحد
    if (this.instances.size > 1 && !this.warningShown) {
      this.warningShown = true;
    }

    // فحص GoTrueClient instances
    this.detectGoTrueClients();
  }

  static unregisterClient(client: any): void {
    this.instances.delete(client);
    this.creationTimes.delete(client);
  }

  static getInstanceCount(): number {
    return this.instances.size;
  }

  static getAllInstances(): any[] {
    return Array.from(this.instances);
  }

  static getStorageKeys(): string[] {
    return Array.from(this.storageKeys);
  }

  // 🔍 كشف GoTrueClient instances
  private static detectGoTrueClients(): void {
    if (typeof window === 'undefined') return;

    let goTrueCount = 0;
    const checkObject = (obj: any, path = 'window') => {
      if (!obj || typeof obj !== 'object') return;

      for (const key in obj) {
        try {
          const value = obj[key];
          if (value && value.constructor && value.constructor.name === 'GoTrueClient') {
            goTrueCount++;
          }
        } catch (e) {
          // تجاهل الأخطاء
        }
      }
    };

    checkObject(window);

    if (goTrueCount > 1) {
    }
  }

  static cleanup(): void {
    this.instances.clear();
    this.creationTimes.clear();
    this.storageKeys.clear();
    this.warningShown = false;
  }

  static getDiagnostics() {
    return {
      instanceCount: this.getInstanceCount(),
      storageKeys: this.getStorageKeys(),
      instances: this.getAllInstances().map(client => ({
        creationTime: this.creationTimes.get(client),
        hasAuth: !!client.auth,
        storageKey: (client.auth as any)?.storageKey || 'none'
      }))
    };
  }
}

// 🔒 إعدادات Supabase محسنة
const createOptimizedSupabaseClient = (): SupabaseClient<Database> => {
  const protector = SupabaseProtector.getInstance();
  protector.preventMultipleInstances();

  const isBrowser = typeof window !== 'undefined';
  const initialOnline = isBrowser ? navigator.onLine !== false : true;

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // ✅ تفعيل التحديث التلقائي للتوكن دائماً - حتى في حالة offline
      // سيحاول Supabase تجديد التوكن تلقائياً قبل انتهائه
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // تعطيل لمنع مشاكل URL
      flowType: 'pkce',
      storageKey: 'bazaar-supabase-auth-unified-v3', // تحديث المفتاح
      storage: sqliteAuthStorage as any,
      debug: false, // تعطيل debug في production
    },
    realtime: {
      // ✅ تحسين إعدادات WebSocket للشبكات البطيئة
      transport: typeof window !== 'undefined' ? window.WebSocket : undefined,
      timeout: 300000, // زيادة إلى 5 دقائق للشبكات البطيئة
      heartbeatIntervalMs: 120000, // زيادة إلى 2 دقيقة للشبكات البطيئة
      params: {
        eventsPerSecond: 1,
        maxRetries: 1,
        retryDelay: 8000,
        backoffMultiplier: 1.5,
        maxBackoffDelay: 45000
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'bazaar-unified-client-v3',
        'X-Instance-Type': 'primary',
        'X-Creation-Time': new Date().toISOString(),
        'x-application-name': 'bazaar-console',
        'X-Client-Version': '3.0.0'
      },
      // 🚀 تحسين timeout للشبكات البطيئة + 401 Error Interceptor
      fetch: async (url: RequestInfo | URL, options: RequestInit = {}) => {
        // فحص navigator.onLine كبديل
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          console.log('%c[Supabase] 📴 Request blocked - offline mode', 'color: #f44336');
          return Promise.reject(new TypeError('network disconnected'));
        }

        // زيادة timeout بشكل كبير للشبكات البطيئة
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 240000); // 4 دقائق

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });

          // ⚡ فحص 401 Unauthorized ومحاولة تجديد التوكن
          if (response.status === 401) {
            console.warn('[Supabase] 🔑 401 Unauthorized - attempting token refresh...');

            try {
              // محاولة تجديد التوكن
              const { data, error: refreshError } = await client.auth.refreshSession();

              if (!refreshError && data.session) {
                console.log('[Supabase] ✅ Token refreshed - retrying request');

                // إعادة المحاولة بـ token جديد
                const newOptions = {
                  ...options,
                  headers: {
                    ...(options.headers || {}),
                    'Authorization': `Bearer ${data.session.access_token}`
                  }
                };

                // إعادة الطلب مع التوكن الجديد
                const retryResponse = await fetch(url, newOptions);
                return retryResponse;
              } else {
                // فشل التجديد - تسجيل خروج
                console.error('[Supabase] ❌ Token refresh failed - session invalid');

                // لا نقوم بتسجيل الخروج تلقائياً - نترك هذا للمكونات
                // await client.auth.signOut();
              }
            } catch (refreshError) {
              console.error('[Supabase] ❌ Error during token refresh:', refreshError);
            }
          }

          return response;
        } catch (error) {
          throw error;
        } finally {
          clearTimeout(timeoutId);
        }
      }
    }
  });

  // 🛡️ Throttle getSession لمنع الاستدعاءات المتعددة والتجديد المبكر
  try {
    const originalGetSession = client.auth.getSession.bind(client.auth);
    let lastGetSessionPromise: Promise<any> | null = null;
    let lastGetSessionTs = 0;
    (client.auth as any).getSession = async () => {
      const now = Date.now();
      if (lastGetSessionPromise && (now - lastGetSessionTs) < 1500) {
        return lastGetSessionPromise;
      }
      lastGetSessionTs = now;
      lastGetSessionPromise = originalGetSession();
      try { return await lastGetSessionPromise; } finally { /* keep promise cached briefly */ }
    };
  } catch { /* لا شيء */ }

  // تسجيل العميل في المراقب
  AdvancedSupabaseMonitor.registerClient(client, 'MainClient');

  // إضافة علامات تعريفية
  (client as any).__BAZAAR_PRIMARY_CLIENT__ = true;
  (client as any).__UNIFIED_CLIENT__ = true;
  (client as any).__CREATION_TIME__ = Date.now();
  (client as any).__VERSION__ = '3.0.0';

  return client;
};

// 🔒 إنشاء العميل الرئيسي مع حماية متقدمة
let mainClient: any;

try {
  // فحص العميل الموجود
  if (typeof window !== 'undefined' && (window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__) {
    mainClient = (window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__;
  } else {
    // إنشاء عميل جديد
    mainClient = createOptimizedSupabaseClient();

    if (typeof window !== 'undefined') {
      (window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__ = mainClient;
      (window as any).__BAZAAR_SUPABASE_CLIENTS_COUNT__ = 1;
    }

  }
} catch (error) {

  // إنشاء عميل fallback آمن مع جميع الطرق المطلوبة
  mainClient = {
    from: (table: string) => ({
      select: (columns?: string) => {
        const queryBuilder = {
          eq: (column: string, value: any) => {
            const nestedBuilder = {
              eq: (column2: string, value2: any) => ({
                order: (column: string, options?: any) => ({
                  order: (column2: string, options2?: any) => Promise.resolve({ data: [], error: new Error('Supabase غير متاح') })
                })
              }),
              order: (column: string, options?: any) => Promise.resolve({ data: [], error: new Error('Supabase غير متاح') }),
              then: (resolve: any) => resolve({ data: [], error: new Error('Supabase غير متاح') })
            };
            return nestedBuilder;
          },
          order: (column: string, options?: any) => Promise.resolve({ data: [], error: new Error('Supabase غير متاح') }),
          then: (resolve: any) => resolve({ data: [], error: new Error('Supabase غير متاح') })
        };
        return queryBuilder;
      },
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase غير متاح') }),
      update: () => Promise.resolve({ data: null, error: new Error('Supabase غير متاح') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Supabase غير متاح') }),
    }),
    rpc: () => Promise.resolve({ data: null, error: new Error('Supabase غير متاح') }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } })
    }
  } as any;
}

// 🔒 تصدير العميل الرئيسي
export const supabase: SupabaseClient<Database> = mainClient as SupabaseClient<Database>;

// 🔒 دوال مساعدة محسنة
export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (!mainClient) {
    throw new Error('Supabase client غير متاح');
  }
  return mainClient;
};

// 🔒 دالة للتحقق من جاهزية Supabase
export const isSupabaseReady = (): boolean => {
  return !!mainClient && !!(mainClient as any).__BAZAAR_PRIMARY_CLIENT__;
};

// 🔒 دالة تنظيف العملاء
export const cleanupSupabaseClients = (): void => {
  try {
    // تنظيف المراقب المتقدم
    AdvancedSupabaseMonitor.cleanup();

    // تنظيف الحماية
    const protector = SupabaseProtector.getInstance();
    protector.cleanup();

    // تنظيف العميل الرئيسي
    if (mainClient && (mainClient as any).__BAZAAR_PRIMARY_CLIENT__) {
      try {
        // إغلاق اتصالات WebSocket
        if (mainClient.realtime) {
          mainClient.realtime.disconnect();
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
        }
      }
    }

    // إزالة المراجع العالمية
    if (typeof window !== 'undefined') {
      try {
        delete (window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__;
        delete (window as any).__BAZAAR_SUPABASE_CLIENTS_COUNT__;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
        }
      }
    }

    if (process.env.NODE_ENV === 'development') {
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
  }
};

// 🔒 دالة للحصول على إحصائيات التشخيص
export const getSupabaseDiagnostics = () => {
  return {
    isReady: isSupabaseReady(),
    clientInfo: mainClient ? {
      version: (mainClient as any).__VERSION__,
      creationTime: (mainClient as any).__CREATION_TIME__,
      isPrimary: !!(mainClient as any).__BAZAAR_PRIMARY_CLIENT__,
      isUnified: !!(mainClient as any).__UNIFIED_CLIENT__
    } : null,
    monitorStats: AdvancedSupabaseMonitor.getDiagnostics(),
    globalReferences: typeof window !== 'undefined' ? {
      hasMainClient: !!(window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__,
      clientsCount: (window as any).__BAZAAR_SUPABASE_CLIENTS_COUNT__ || 0
    } : null
  };
};

// 🔒 تصدير المراقب والواقي
export { AdvancedSupabaseMonitor, SupabaseProtector };

// 🔒 دالة تشخيص متقدمة
export const diagnoseSupabaseIssues = () => {
  const diagnostics = getSupabaseDiagnostics();
  const monitor = AdvancedSupabaseMonitor.getDiagnostics();

  const report = {
    ...diagnostics,
    timestamp: new Date().toISOString(),
    recommendations: [] as string[],
    issues: [] as string[]
  };

  // فحص المشاكل
  if (monitor.instanceCount > 1) {
    report.issues.push('يوجد أكثر من عميل Supabase');
    report.recommendations.push('إعادة تشغيل التطبيق لحل مشكلة تعدد العملاء');
  }

  if (monitor.storageKeys.length > 2) {
    report.issues.push('يوجد عدة storage keys - قد يسبب تضارب في المصادقة');
    report.recommendations.push('مسح localStorage وإعادة تسجيل الدخول');
  }

  if (!diagnostics.isReady) {
    report.issues.push('Supabase غير جاهز');
    report.recommendations.push('التحقق من متغيرات البيئة');
  }

  return report;
};

// 🔒 تنظيف تلقائي عند إغلاق النافذة
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupSupabaseClients();
  });
}

// 🔌 التحكم في حالتي الاتصال وعدم الاتصال
if (typeof window !== 'undefined') {
  const handleOffline = () => {
    try {
      mainClient?.auth?.stopAutoRefresh?.();
    } catch { }
    try {
      if (typeof (mainClient as any)?.removeAllChannels === 'function') {
        (mainClient as any).removeAllChannels();
      }
    } catch { }
    try {
      mainClient?.realtime?.disconnect?.();
    } catch { }
  };

  const handleOnline = () => {
    try {
      mainClient?.auth?.startAutoRefresh?.();
    } catch { }
  };

  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    handleOffline();
  }
}

// 🔒 إعادة تصدير أنواع البيانات
export type { Database } from '@/types/database.types';

// 🔒 تصدير معلومات النسخة
export const SUPABASE_CLIENT_VERSION = '2.0.0';
export const SUPABASE_CLIENT_BUILD_TIME = new Date().toISOString();
