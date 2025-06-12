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
    console.log('🏗️ [SupabaseUnified] بدء إنشاء Supabase Client جديد');
    
    await this.cleanup();
    console.log('🧹 [SupabaseUnified] تم تنظيف Client السابق');

    console.log('⚙️ [SupabaseUnified] إنشاء Client بالإعدادات:', {
      url: supabaseUrl,
      storageKey: 'bazaar-supabase-auth-unified',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    });

    const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // استخدام مفتاح تخزين فريد
        storageKey: 'bazaar-supabase-auth-unified'
      },
      global: {
        headers: {
          'X-Client-Info': 'bazaar-unified-client',
          'Accept': 'application/json'
        }
      },
      // تحسين إعدادات realtime
      realtime: {
        params: {
          eventsPerSecond: 5
        }
      }
    });

    console.log('✅ [SupabaseUnified] تم إنشاء Client بنجاح');

    // إضافة معالج لأحداث المصادقة مع throttling
    let lastAuthEventTime = 0;
    const authEventThrottle = 1000; // ثانية واحدة

    client.auth.onAuthStateChange((event, session) => {
      const now = Date.now();
      console.log('🔄 [SupabaseUnified] حدث مصادقة:', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        timestamp: now,
        timeSinceLastEvent: now - lastAuthEventTime
      });
      
      if (now - lastAuthEventTime < authEventThrottle) {
        console.log('⏭️ [SupabaseUnified] تجاهل حدث متكرر (throttled)');
        return; // تجاهل الأحداث المتكررة
      }
      lastAuthEventTime = now;

      if (event === 'SIGNED_OUT') {
        console.log('🚪 [SupabaseUnified] معالجة تسجيل الخروج...');
        this.handleSignOut();
        console.log('✅ [SupabaseUnified] تم معالجة تسجيل الخروج');
      }
    });

    this.client = client;
    console.log('💾 [SupabaseUnified] تم حفظ Client reference');
    
    return client;
  }

  public async getClient(): Promise<SupabaseClient<Database>> {
    console.log('📞 [SupabaseUnified] طلب الحصول على Client:', {
      hasClient: !!this.client,
      isInitializing: this.isInitializing,
      hasInitPromise: !!this.initPromise
    });
    
    // إذا كان Client موجود، أعده
    if (this.client) {
      console.log('✅ [SupabaseUnified] إرجاع Client موجود');
      return this.client;
    }

    // إذا كان التهيئة قيد التقدم، انتظرها
    if (this.isInitializing && this.initPromise) {
      console.log('⏳ [SupabaseUnified] انتظار انتهاء التهيئة الجارية...');
      return this.initPromise;
    }

    // بدء التهيئة
    console.log('🚀 [SupabaseUnified] بدء تهيئة Client جديد...');
    this.isInitializing = true;
    this.initPromise = this.createSupabaseClient();

    try {
      const client = await this.initPromise;
      console.log('✅ [SupabaseUnified] تم الحصول على Client بنجاح');
      this.isInitializing = false;
      return client;
    } catch (error) {
      console.error('❌ [SupabaseUnified] فشل في الحصول على Client:', error);
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

  // إنشاء client مؤقت مع storage key مختلف لتجنب التضارب
  const tempClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false, // تعطيل auto refresh في المؤقت
      persistSession: false, // تعطيل session persistence في المؤقت
      detectSessionInUrl: false,
      flowType: 'pkce',
      storageKey: 'bazaar-supabase-auth-temp'
    },
    global: {
      headers: {
        'X-Client-Info': 'bazaar-temp-client',
        'Accept': 'application/json'
      }
    }
  });

  _loadedClient = tempClient;

  // تحميل النظام الموحد في الخلفية وتحديث المرجع
  getSupabaseClient().then(unifiedClient => {
    // تنظيف temp client
    if (_loadedClient === tempClient) {
      try {
        if (tempClient.auth.stopAutoRefresh) {
          tempClient.auth.stopAutoRefresh();
        }
        if (tempClient.removeAllChannels) {
          tempClient.removeAllChannels();
        }
      } catch (e) {
        // Silent cleanup
      }
    }
    _loadedClient = unifiedClient;
  }).catch(() => {
    // Silent fallback - keep temp client
  });

  return tempClient;
};

// تصدير client مباشر
export const supabase = loadClientSync();

// دوال مساعدة للتصدير
export const resetSupabaseClient = () => supabaseUnified.reset();
export const supabaseHealthCheck = () => supabaseUnified.healthCheck();

// تصدير نوع Database للاستخدام
export type { Database } from '@/types/database.types';

// Debug tools removed for production 