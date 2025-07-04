/**
 * ملف Supabase موحد - يحل مشكلة تعدد الـ instances
 * يضمن وجود client واحد فقط في كامل التطبيق
 * النسخة المبسطة والقياسية مع مراقبة محسنة
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// متغيرات البيئة
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anonymous key are required.');
}

// نظام مراقبة عملاء Supabase
class SupabaseClientMonitor {
  private static instances: Set<SupabaseClient> = new Set();
  private static warningShown = false;

  static registerClient(client: SupabaseClient, name: string) {
    this.instances.add(client);
    console.log(`📊 [SupabaseMonitor] تم تسجيل عميل: ${name}. العدد الإجمالي: ${this.instances.size}`);
    
    // تحذير عند وجود أكثر من عميل واحد
    if (this.instances.size > 1 && !this.warningShown) {
      console.warn('⚠️ [SupabaseMonitor] تم اكتشاف عدة عملاء Supabase! قد يؤدي هذا إلى مشكلة Multiple GoTrueClient instances');
      this.warningShown = true;
    }
  }

  static unregisterClient(client: SupabaseClient) {
    this.instances.delete(client);
    console.log(`📊 [SupabaseMonitor] تم إلغاء تسجيل عميل. العدد الإجمالي: ${this.instances.size}`);
  }

  static getInstanceCount(): number {
    return this.instances.size;
  }

  static getAllInstances(): SupabaseClient[] {
    return Array.from(this.instances);
  }

  static cleanup() {
    console.log('🧹 [SupabaseMonitor] تنظيف جميع العملاء المسجلين...');
    this.instances.clear();
    this.warningShown = false;
  }
}

// إضافة علامة عالمية لمنع إنشاء عملاء متعددين
declare global {
  interface Window {
    __BAZAAR_SUPABASE_CLIENTS_COUNT__: number;
    __BAZAAR_MAIN_SUPABASE_CLIENT__: SupabaseClient<Database> | null;
  }
}

// تهيئة متغيرات النافذة
if (typeof window !== 'undefined') {
  window.__BAZAAR_SUPABASE_CLIENTS_COUNT__ = window.__BAZAAR_SUPABASE_CLIENTS_COUNT__ || 0;
  window.__BAZAAR_MAIN_SUPABASE_CLIENT__ = window.__BAZAAR_MAIN_SUPABASE_CLIENT__ || null;
}

// إذا كان العميل الرئيسي موجود بالفعل، استخدمه
let mainClient: SupabaseClient<Database>;

if (typeof window !== 'undefined' && window.__BAZAAR_MAIN_SUPABASE_CLIENT__) {
  console.log('♻️ [SupabaseUnified] استخدام العميل الرئيسي الموجود');
  mainClient = window.__BAZAAR_MAIN_SUPABASE_CLIENT__;
} else {
  console.log('🚀 [SupabaseUnified] إنشاء العميل الرئيسي الجديد');
  
  // Create a single, exported Supabase client instance
  mainClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // A single, consistent storage key across the app
      storageKey: 'bazaar-supabase-auth-unified-main', 
    },
    realtime: {
      // إعدادات خاصة لحل مشكلة WebSocket في المتصفح
      transport: typeof window !== 'undefined' ? window.WebSocket : undefined,
      timeout: 20000,
      heartbeatIntervalMs: 30000,
      params: {
        eventsPerSecond: 10
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'bazaar-unified-client-main',
        'X-Instance-Type': 'primary',
        'X-Creation-Time': new Date().toISOString()
      }
    }
  });

  // تسجيل العميل في المراقب والنافذة
  SupabaseClientMonitor.registerClient(mainClient, 'MainClient');
  
  if (typeof window !== 'undefined') {
    window.__BAZAAR_MAIN_SUPABASE_CLIENT__ = mainClient;
    window.__BAZAAR_SUPABASE_CLIENTS_COUNT__ = (window.__BAZAAR_SUPABASE_CLIENTS_COUNT__ || 0) + 1;
    
    console.log(`📊 [SupabaseUnified] تم إنشاء العميل الرئيسي. العدد الإجمالي في النافذة: ${window.__BAZAAR_SUPABASE_CLIENTS_COUNT__}`);
  }
}

export const supabase: SupabaseClient<Database> = mainClient;

/**
 * دالة للحصول على العميل. الاستيراد المباشر لـ `supabase` هو المفضل.
 */
export const getSupabaseClient = (): SupabaseClient<Database> => {
  return supabase;
};

/**
 * فحص ما إذا كان Supabase جاهزاً
 */
export const isSupabaseReady = (): boolean => {
  return !!supabase && !!supabaseUrl && !!supabaseAnonKey;
};

/**
 * تنظيف جميع عملاء Supabase
 */
export const cleanupSupabaseClients = () => {
  console.log('🧹 [SupabaseUnified] بدء تنظيف عملاء Supabase...');
  
  SupabaseClientMonitor.cleanup();
  
  if (typeof window !== 'undefined') {
    window.__BAZAAR_MAIN_SUPABASE_CLIENT__ = null;
    window.__BAZAAR_SUPABASE_CLIENTS_COUNT__ = 0;
  }
  
  console.log('✅ [SupabaseUnified] تم تنظيف جميع العملاء');
};

/**
 * معلومات التشخيص للعملاء
 */
export const getSupabaseDiagnostics = () => {
  return {
    mainClientExists: !!supabase,
    totalClientsInMonitor: SupabaseClientMonitor.getInstanceCount(),
    totalClientsInWindow: typeof window !== 'undefined' ? window.__BAZAAR_SUPABASE_CLIENTS_COUNT__ || 0 : 0,
    isReady: isSupabaseReady(),
    url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'not set',
    hasAnonKey: !!supabaseAnonKey
  };
};

// تصدير المراقب للاستخدام في أماكن أخرى
export { SupabaseClientMonitor };

/**
 * مراقب متقدم لـ GoTrueClient instances
 */
export const detectMultipleGoTrueClients = () => {
  const result = {
    count: 0,
    warning: false,
    instances: [] as any[],
    storageKeys: [] as string[]
  };

  try {
    // البحث في window object عن GoTrueClient instances
    const checkObject = (obj: any, path = 'window') => {
      if (!obj || typeof obj !== 'object') return;
      
      for (const key in obj) {
        try {
          const value = obj[key];
          
          // فحص إذا كان GoTrueClient
          if (value && value.constructor && value.constructor.name === 'GoTrueClient') {
            result.count++;
            result.instances.push({
              path: `${path}.${key}`,
              storageKey: value.storageKey || 'unknown',
              instance: value
            });
            
            if (value.storageKey) {
              result.storageKeys.push(value.storageKey);
            }
          }
          
          // فحص إذا كان SupabaseClient وله auth.client
          if (value && value.auth && value.auth.storageKey) {
            result.storageKeys.push(value.auth.storageKey);
          }
        } catch (e) {
          // تجاهل الأخطاء في الفحص
        }
      }
    };

    if (typeof window !== 'undefined') {
      checkObject(window);
      
      // فحص خاص لـ Supabase clients المحتملة
      if ((window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__) {
        const client = (window as any).__BAZAAR_MAIN_SUPABASE_CLIENT__;
        if (client.auth && client.auth.storageKey) {
          result.storageKeys.push(client.auth.storageKey);
        }
      }
      
      if ((window as any).__BAZAAR_ADMIN_CLIENT__) {
        const client = (window as any).__BAZAAR_ADMIN_CLIENT__;
        if (client.auth && client.auth.storageKey) {
          result.storageKeys.push(client.auth.storageKey);
        }
      }
    }

    result.warning = result.count > 1 || result.storageKeys.length > 2;
    
    if (result.warning) {
      console.warn('⚠️ [GoTrueDetector] تم اكتشاف عدة GoTrueClient instances:', {
        count: result.count,
        storageKeys: result.storageKeys,
        uniqueStorageKeys: [...new Set(result.storageKeys)]
      });
    }

  } catch (error) {
    console.error('❌ [GoTrueDetector] خطأ في فحص GoTrueClient instances:', error);
  }

  return result;
};

/**
 * دالة مساعدة لتشخيص مشاكل Supabase
 */
export const diagnoseSupabaseIssues = () => {
  console.log('🔍 [SupabaseDiagnostics] بدء تشخيص شامل...');
  
  const diagnostics = getSupabaseDiagnostics();
  const goTrueInfo = detectMultipleGoTrueClients();
  
  const report = {
    ...diagnostics,
    goTrueClients: goTrueInfo,
    timestamp: new Date().toISOString(),
    recommendations: [] as string[]
  };

  // توليد التوصيات
  if (goTrueInfo.warning) {
    report.recommendations.push('تم اكتشاف عدة GoTrueClient instances - يُنصح بإعادة تشغيل التطبيق');
  }
  
  if (diagnostics.totalClientsInMonitor > 1) {
    report.recommendations.push('يوجد أكثر من عميل Supabase - تحقق من الاستيرادات المتكررة');
  }
  
  if (!diagnostics.isReady) {
    report.recommendations.push('Supabase غير جاهز - تحقق من متغيرات البيئة');
  }

  console.log('📋 [SupabaseDiagnostics] تقرير التشخيص:', report);
  
  return report;
};

// إضافة معالج تنظيف عند إغلاق النافذة
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupSupabaseClients();
  });
}

// إعادة تصدير أنواع البيانات للتوافق
export type { Database } from '@/types/database.types';
