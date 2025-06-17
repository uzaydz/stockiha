/**
 * ملف Supabase موحد - يحل مشكلة تعدد الـ instances
 * يضمن وجود client واحد فقط في كامل التطبيق
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// متغيرات البيئة
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
}

// نمط Singleton لضمان client واحد فقط
class SupabaseUnifiedClient {
  private static instance: SupabaseUnifiedClient | null = null;
  private client: SupabaseClient | null = null;
  private isInitializing = false;
  private initPromise: Promise<SupabaseClient> | null = null;

  private constructor() {
    // منع إنشاء instances متعددة
  }

  public static getInstance(): SupabaseUnifiedClient {
    if (!SupabaseUnifiedClient.instance) {
      SupabaseUnifiedClient.instance = new SupabaseUnifiedClient();
    }
    return SupabaseUnifiedClient.instance;
  }

  private async createSupabaseClient(): Promise<SupabaseClient<Database>> {
    
    await this.cleanup();

    // تنظيف شامل لجميع مفاتيح Supabase في localStorage
    this.cleanupDuplicateStorageKeys();

    const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // استخدام مفتاح تخزين فريد وثابت لتجنب التضارب
        storageKey: 'bazaar-supabase-auth-unified-main',
        // تقليل معدل التحديث التلقائي لمنع الأحداث المتكررة
        debug: false
      },
      global: {
        headers: {
          'X-Client-Info': 'bazaar-unified-client',
          'Accept': 'application/json'
        }
      },
      // تحسين إعدادات realtime مع تقليل الضغط
      realtime: {
        params: {
          eventsPerSecond: 1 // تقليل معدل الأحداث أكثر
        }
      },
      // إضافة timeout للطلبات
      db: {
        schema: 'public'
      }
    });

    // إضافة معالج للأخطاء
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        this.handleSignOut();
      }
    });

    return client;
  }

  public async getClient(): Promise<SupabaseClient<Database>> {
    
    // إذا كان Client موجود، أعده
    if (this.client) {
      return this.client;
    }

    // إذا كان التهيئة قيد التقدم، انتظرها
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    // بدء التهيئة
    this.isInitializing = true;
    this.initPromise = this.createSupabaseClient();

    try {
      const client = await this.initPromise;
      this.client = client; // حفظ الـ client
      this.isInitializing = false;
      return client;
    } catch (error) {
      this.isInitializing = false;
      this.initPromise = null;
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    try {
      // تنظيف client السابق إذا كان موجوداً
      if (this.client) {
        // إيقاف auto refresh
        if (this.client.auth.stopAutoRefresh) {
          this.client.auth.stopAutoRefresh();
        }

        // إزالة جميع subscriptions
        if (this.client.removeAllChannels) {
          this.client.removeAllChannels();
        }

        this.client = null;
      }
    } catch (error) {
      // Silent cleanup
    }
  }

  private handleSignOut(): void {
    try {
      const userRelatedKeys = [
        'bazaar_organization_id',
        'bazaar_user_profile',
        'organization_auth_context:default'
      ];

      userRelatedKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      // Silent cleanup
    }
  }

  private cleanupDuplicateStorageKeys(): void {
    try {
      // البحث عن مفاتيح Supabase المكررة وحذفها
      const keysToClean: string[] = [];
      const mainStorageKey = 'bazaar-supabase-auth-unified-main';
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('sb-') || 
          key.startsWith('supabase') ||
          (key.includes('bazaar-supabase-auth') && key !== mainStorageKey)
        )) {
          keysToClean.push(key);
        }
      }
      
      // حذف المفاتيح المكررة
      keysToClean.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          // Silent cleanup
        }
      });
      
      // تنظيف sessionStorage أيضاً
      const sessionKeysToClean: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
          key.startsWith('sb-') || 
          key.startsWith('supabase')
        )) {
          sessionKeysToClean.push(key);
        }
      }
      
      sessionKeysToClean.forEach(key => {
        try {
          sessionStorage.removeItem(key);
        } catch (error) {
          // Silent cleanup
        }
      });
      
    } catch (error) {
      // Silent cleanup
    }
  }

  // إعادة تهيئة Client (مفيدة في حالة حدوث مشاكل)
  public async reset(): Promise<SupabaseClient<Database>> {
    await this.cleanup();
    this.isInitializing = false;
    this.initPromise = null;
    
    return this.getClient();
  }

  // فحص حالة الاتصال
  public async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getClient();
      
      // محاولة استعلام بسيط
      const { error } = await client
        .from('shipping_providers')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      return false;
    }
  }
}

// إنشاء instance وحيد
const supabaseUnified = SupabaseUnifiedClient.getInstance();

// تصدير client كـ Promise-based function
export const getSupabaseClient = (): Promise<SupabaseClient<Database>> => {
  return supabaseUnified.getClient();
};

// متغير لحفظ client reference
let _loadedClient: SupabaseClient<Database> | null = null;

// دالة لتحميل client بشكل متزامن (للاستخدام الفوري)
const loadClientSync = (): SupabaseClient<Database> => {
  if (_loadedClient) {
    return _loadedClient;
  }

  // محاولة الحصول على client من الـ unified manager
  const unifiedInstance = SupabaseUnifiedClient.getInstance();
  
  // إذا كان client موجود، استخدمه
  if (unifiedInstance['client']) {
    _loadedClient = unifiedInstance['client'];
    return _loadedClient;
  }

  // إنشاء client واحد فقط مع نفس الإعدادات
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      // استخدام نفس مفتاح التخزين
      storageKey: 'bazaar-supabase-auth-unified-main'
    },
    global: {
      headers: {
        'X-Client-Info': 'bazaar-unified-client',
        'Accept': 'application/json'
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    },
    db: {
      schema: 'public'
    }
  });

  _loadedClient = client;

  // تحديث unified instance أيضاً
  unifiedInstance['client'] = client;

  return client;
};

// تصدير client مباشر
export const supabase = loadClientSync();

// دوال مساعدة للتصدير
export const resetSupabaseClient = () => supabaseUnified.reset();
export const supabaseHealthCheck = () => supabaseUnified.healthCheck();

// تصدير نوع Database للاستخدام
export type { Database } from '@/types/database.types';

// Debug tools removed for production
