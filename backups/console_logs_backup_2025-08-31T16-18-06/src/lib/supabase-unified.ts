/**
 * نظام Supabase موحد محسن - يحل مشكلة تعدد الـ instances نهائياً
 * يضمن وجود client واحد فقط في كامل التطبيق مع حماية متقدمة
 * النسخة النهائية والآمنة مع تحسينات الأداء
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// متغيرات البيئة مع فحص صارم
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anonymous key are required.');
}

// 🔒 نظام حماية مبسط ومنطقي
class SupabaseProtector {
  private static instance: SupabaseProtector | null = null;
  private static isInitializing = false;

  private constructor() {}

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
    (window as any).createClient = function(...args: any[]) {
      // السماح فقط للعميل الرئيسي
      if ((window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__) {
        console.warn('⚠️ [SupabaseProtector] محاولة إنشاء عميل إضافي - إرجاع العميل الرئيسي');
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
  private static instances: Set<SupabaseClient> = new Set();
  private static creationTimes: Map<SupabaseClient, number> = new Map();
  private static storageKeys: Set<string> = new Set();
  private static warningShown = false;

  static registerClient(client: SupabaseClient, name: string): void {
    this.instances.add(client);
    this.creationTimes.set(client, Date.now());

    // فحص storage keys
    if (client.auth && (client.auth as any).storageKey) {
      this.storageKeys.add((client.auth as any).storageKey);
    }

    // تحذير عند وجود أكثر من عميل واحد
    if (this.instances.size > 1 && !this.warningShown) {
      console.warn('⚠️ [SupabaseMonitor] تم اكتشاف عدة عملاء Supabase - هذا قد يسبب مشاكل');
      this.warningShown = true;
    }

    // فحص GoTrueClient instances
    this.detectGoTrueClients();
  }

  static unregisterClient(client: SupabaseClient): void {
    this.instances.delete(client);
    this.creationTimes.delete(client);
  }

  static getInstanceCount(): number {
    return this.instances.size;
  }

  static getAllInstances(): SupabaseClient[] {
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
            console.warn(`⚠️ [SupabaseMonitor] GoTrueClient detected at ${path}.${key}`);
          }
        } catch (e) {
          // تجاهل الأخطاء
        }
      }
    };

    checkObject(window);
    
    if (goTrueCount > 1) {
      console.error('❌ [SupabaseMonitor] تم اكتشاف عدة GoTrueClient instances - هذا خطير!');
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

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false, // ✅ تعطيل التحديث التلقائي لمنع التكرار
      persistSession: true,
      detectSessionInUrl: false, // تعطيل لمنع مشاكل URL
      flowType: 'pkce',
      storageKey: 'bazaar-supabase-auth-unified-v3', // تحديث المفتاح
      debug: false, // تعطيل debug في production
    },
    realtime: {
      // ✅ تحسين إعدادات WebSocket لتقليل الاستهلاك
      transport: typeof window !== 'undefined' ? window.WebSocket : undefined,
      timeout: 60000, // زيادة إلى دقيقة واحدة
      heartbeatIntervalMs: 60000, // ✅ زيادة إلى دقيقة واحدة
      params: {
        eventsPerSecond: 1, // ✅ تقليل إلى حدث واحد/ثانية
        maxRetries: 1, // ✅ تقليل المحاولات
        retryDelay: 5000, // ✅ زيادة التأخير
        backoffMultiplier: 1.2, // ✅ تقليل المضاعف
        maxBackoffDelay: 30000 // ✅ تقليل التأخير الأقصى
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'bazaar-unified-client-v3',
        'X-Instance-Type': 'primary',
        'X-Creation-Time': new Date().toISOString(),
        'x-application-name': 'bazaar-console',
        'X-Client-Version': '3.0.0'
      }
    }
  });

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
let mainClient: SupabaseClient<Database>;

try {
  // فحص العميل الموجود
  if (typeof window !== 'undefined' && (window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__) {
    mainClient = (window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__;
    console.log('✅ [Supabase] استخدام العميل الموجود');
  } else {
    // إنشاء عميل جديد
    mainClient = createOptimizedSupabaseClient();
    
    if (typeof window !== 'undefined') {
      (window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__ = mainClient;
      (window as any).__BAZAAR_SUPABASE_CLIENTS_COUNT__ = 1;
    }
    
    console.log('✅ [Supabase] تم إنشاء العميل الرئيسي بنجاح');
  }
} catch (error) {
  console.error('❌ [Supabase] فشل في إنشاء العميل:', error);
  
  // إنشاء عميل fallback آمن
  mainClient = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: new Error('Supabase غير متاح') }),
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase غير متاح') }),
      update: () => Promise.resolve({ data: null, error: new Error('Supabase غير متاح') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Supabase غير متاح') }),
    }),
    rpc: () => Promise.resolve({ data: null, error: new Error('Supabase غير متاح') }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    }
  } as any;
}

// 🔒 تصدير العميل الرئيسي
export const supabase: SupabaseClient<Database> = mainClient;

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
          console.warn('⚠️ [Supabase] خطأ في إغلاق WebSocket:', error);
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
          console.warn('⚠️ [Supabase] خطأ في حذف المراجع العالمية:', error);
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [Supabase] تم تنظيف جميع العملاء بنجاح');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [Supabase] خطأ في التنظيف:', error);
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

// 🔒 إعادة تصدير أنواع البيانات
export type { Database } from '@/types/database.types';

// 🔒 تصدير معلومات النسخة
export const SUPABASE_CLIENT_VERSION = '2.0.0';
export const SUPABASE_CLIENT_BUILD_TIME = new Date().toISOString();
