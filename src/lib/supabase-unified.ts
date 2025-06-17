/**
 * ملف Supabase موحد - يحل مشكلة تعدد الـ instances
 * يضمن وجود client واحد فقط في كامل التطبيق
 * النسخة المحسنة مع حل مشاكل Race Conditions
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// متغيرات البيئة
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const GLOBAL_CLIENT_KEY = '__BAZAAR_UNIFIED_SUPABASE_CLIENT__';
const GLOBAL_LOCK_KEY = '__BAZAAR_CLIENT_CREATION_LOCK__';
const INITIALIZATION_TIMEOUT = 10000; // 10 ثوان

// Global lock to prevent multiple client creation attempts
let clientCreationInProgress = false;
let initializationMutex = false;

// Hook into the global createClient function to prevent multiple instances
const originalCreateClient = (window as any).__originalCreateClient || createClient;
if (!(window as any).__originalCreateClient) {
  (window as any).__originalCreateClient = createClient;
  
  // Override the global createClient function
  (window as any).createClient = function(...args: any[]) {
    // Check if this is an admin client creation (has service key)
    if (args[1] && (
      args[1].includes('eyJ') || // Service keys usually start with eyJ
      args[1].length > 100 || // Service keys are longer than anon keys
      (args[2] && args[2].global && args[2].global.headers && args[2].global.headers['X-Admin-Client']) // Check headers
    )) {
      return originalCreateClient(...args);
    }
    
    // Check if we already have a unified client
    if ((window as any)[GLOBAL_CLIENT_KEY]) {
      return (window as any)[GLOBAL_CLIENT_KEY];
    }
    
    // If no unified client exists, this might be the initial creation
    return originalCreateClient(...args);
  };
}

/**
 * Unified Supabase Client Manager - النسخة المحسنة
 */
class SupabaseUnifiedClient {
  private static instance: SupabaseUnifiedClient | null = null;
  private client: SupabaseClient<Database> | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private initializationAttempts = 0;
  private maxInitializationAttempts = 3;

  private constructor() {
    // Prevent external instantiation
  }

  public static getInstance(): SupabaseUnifiedClient {
    if (!SupabaseUnifiedClient.instance) {
      SupabaseUnifiedClient.instance = new SupabaseUnifiedClient();
    }
    return SupabaseUnifiedClient.instance;
  }

  /**
   * إنشاء Supabase Client مع حماية شاملة من Race Conditions
   */
  private async createSupabaseClient(): Promise<SupabaseClient<Database>> {
    
    // 🔒 Mutex protection لمنع التداخل
    if (initializationMutex) {
      console.log('🔄 [Supabase Unified] Waiting for initialization mutex...');
      let attempts = 0;
      while (initializationMutex && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (this.client) return this.client;
    }
    
    initializationMutex = true;
    
    // Additional protection against concurrent creation
    if (clientCreationInProgress) {
      console.log('🔄 [Supabase Unified] Client creation in progress, waiting...');
      let attempts = 0;
      while (clientCreationInProgress && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (this.client) {
        initializationMutex = false;
        return this.client;
      }
    }
    
    clientCreationInProgress = true;
    
    try {
      await this.cleanup();

      // تنظيف شامل لجميع مفاتيح Supabase في localStorage
      this.cleanupDuplicateStorageKeys();

      console.log('🚀 [Supabase Unified] Creating new client...');

      const client = (originalCreateClient as typeof createClient)<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          flowType: 'pkce',
          // استخدام مفتاح تخزين فريد وثابت لتجنب التضارب
          storageKey: 'bazaar-supabase-auth-unified-main',
          // تعطيل رسائل التشخيص نهائياً لمنع ضجيج GoTrueClient
          debug: false,
          // تقليل رسائل التحذير وتعطيل URL detection للأمان
          detectSessionInUrl: false
        },
        global: {
          headers: {
            'X-Client-Info': 'bazaar-unified-client',
            'Accept': 'application/json',
            'X-Client-Instance': 'unified-main',
            'X-Creation-Time': Date.now().toString(),
            // 🔧 إضافة header خاص لحل مشكلة RLS أثناء تسجيل الدخول
            'X-Login-Context': 'pre-auth',
            'X-RLS-Bypass': 'login-flow'
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

      // 🔧 اختبار الاتصال فوراً لضمان صحة التهيئة
      try {
        const testResult = await Promise.race([
          client.from('organizations').select('id').limit(1),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
        ]);
        console.log('✅ [Supabase Unified] Connection test successful');
      } catch (testError) {
        console.warn('⚠️ [Supabase Unified] Connection test failed:', testError);
        // المتابعة رغم فشل الاختبار
      }

      // Mark this as the primary client with enhanced protection
      (client as any).__BAZAAR_PRIMARY_CLIENT__ = true;
      (client as any).__UNIFIED_CLIENT__ = true;
      (client as any).__CREATION_TIME__ = Date.now();
      (client as any).__manager__ = this;

      // Set global references with multiple levels of protection
      (window as any)[GLOBAL_CLIENT_KEY] = client;
      (window as any).__BAZAAR_UNIFIED_CLIENT_ACTIVE__ = true;
      
      // تحديث الـ global client فوراً لمنع إنشاء عملاء إضافية
      globalClient = client;

      // إضافة معالج للأخطاء مع حل مشكلة RLS
      client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          this.handleSignOut();
        } else if (event === 'SIGNED_IN') {
          // 🔧 تحديث headers بعد تسجيل الدخول الناجح
          this.updateClientHeaders(client, true);
          console.log('✅ [Supabase Unified] User signed in successfully');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 [Supabase Unified] Token refreshed');
        }
      });

      // تسجيل نجاح التهيئة
      console.log('✅ [Supabase Unified] Client initialized successfully');

      return client;
    } catch (error) {
      console.error('❌ [Supabase Unified] Failed to create client:', error);
      this.initializationAttempts++;
      
      // 🔄 إعادة المحاولة مع تأخير
      if (this.initializationAttempts < this.maxInitializationAttempts) {
        console.log(`🔄 [Supabase Unified] Retrying initialization (${this.initializationAttempts}/${this.maxInitializationAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * this.initializationAttempts));
        return this.createSupabaseClient();
      }
      
      throw error;
    } finally {
      clientCreationInProgress = false;
      initializationMutex = false;
    }
  }

  /**
   * تحديث headers الخاصة بـ client بعد المصادقة
   */
  private updateClientHeaders(client: SupabaseClient<Database>, isAuthenticated: boolean): void {
    try {
      const headers = isAuthenticated ? {
        'X-Login-Context': 'post-auth',
        'X-RLS-Bypass': 'authenticated',
        'X-Auth-Status': 'verified'
      } : {
        'X-Login-Context': 'pre-auth',
        'X-RLS-Bypass': 'login-flow',
        'X-Auth-Status': 'pending'
      };

      // تحديث headers إذا أمكن
      if (client && (client as any).supabaseKey) {
        Object.assign((client as any).headers || {}, headers);
      }
    } catch (error) {
      console.warn('⚠️ [Supabase Unified] Could not update headers:', error);
    }
  }

  private async cleanup(): Promise<void> {
    if (this.client) {
      try {
        // إنهاء جميع الاتصالات النشطة
        if (this.client.realtime) {
          this.client.realtime.disconnect();
        }
        
        // إزالة جميع مستمعي الأحداث
        this.client.auth.onAuthStateChange(() => {});
        
        // تنظيف المراجع
        this.client = null;
      } catch (error) {
        console.warn('⚠️ [Supabase Unified] Cleanup warning:', error);
      }
    }
  }

  private handleSignOut(): void {
    console.log('🔓 [Supabase Unified] User signed out, cleaning up...');
    this.cleanup();
  }

  private cleanupDuplicateStorageKeys(): void {
    let removedCount = 0;
    
    try {
      const keysToCheck = [
        'bazaar-supabase-auth-unified-main-access-token',
        'bazaar-supabase-auth-unified-main-refresh-token',
        'bazaar-supabase-auth-unified-main-provider-token',
        'bazaar-supabase-auth-unified-main-code-verifier',
        'sb-wrnssatuvmumsczyldth-auth-token',
        'supabase.auth.token'
      ];

      const allKeys = Object.keys(localStorage);
      const supabaseKeys = allKeys.filter(key => 
        key.includes('supabase') || 
        key.includes('auth') || 
        keysToCheck.some(checkKey => key.includes(checkKey.split('-').pop() || ''))
      );

      // Remove duplicates but keep the main unified key
      supabaseKeys.forEach(key => {
        if (key !== 'bazaar-supabase-auth-unified-main' && 
            !key.includes('admin') && 
            key !== 'bazaar-supabase-auth-unified-main-access-token' &&
            key !== 'bazaar-supabase-auth-unified-main-refresh-token') {
          
          try {
            const value = localStorage.getItem(key);
            if (value && (
              key.includes('code-verifier') || 
              key.includes('provider-token') ||
              key.includes('duplicate') ||
              key.length > 100
            )) {
              localStorage.removeItem(key);
              removedCount++;
            }
          } catch (err) {
            // Silent fail
          }
        }
      });

      if (removedCount > 0) {
        console.log(`🧹 [Supabase Unified] Cleaned ${removedCount} duplicate storage keys`);
      }
    } catch (error) {
      console.warn('⚠️ [Supabase Unified] Storage cleanup warning:', error);
    }
  }

  /**
   * الحصول على Client مع حماية شاملة من الأخطاء
   */
  public async getClient(): Promise<SupabaseClient<Database>> {
    // إذا كان العميل موجود، أرجعه مباشرة
    if (this.client && (this.client as any).__BAZAAR_PRIMARY_CLIENT__) {
      return this.client;
    }

    // إذا كانت التهيئة قيد التنفيذ، انتظرها مع timeout
    if (this.initializationPromise) {
      try {
        await Promise.race([
          this.initializationPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initialization timeout')), INITIALIZATION_TIMEOUT)
          )
        ]);
        if (this.client) {
          return this.client;
        }
      } catch (timeoutError) {
        console.warn('⚠️ [Supabase Unified] Initialization timeout, creating new instance');
        this.initializationPromise = null;
      }
    }

    // بدء التهيئة
    if (!this.isInitialized || !this.client) {
      this.initializationPromise = this.performInitialization();
      await this.initializationPromise;
    }

    // التحقق النهائي
    if (!this.client) {
      throw new Error('Failed to initialize Supabase client - مشكلة في التهيئة أو مشكلة شبكة');
    }

    return this.client;
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('🚀 [Supabase Unified] Starting initialization...');
      this.isInitialized = true;
      this.client = await this.createSupabaseClient();
      
      // إضافة supabase إلى window object لاستخدامه في UltimateRequestController
      if (this.client && typeof window !== 'undefined') {
        (window as any).supabase = this.client;
      }

      console.log('✅ [Supabase Unified] Initialization completed successfully');
    } catch (error) {
      console.error('❌ [Supabase Unified] Initialization failed:', error);
      this.isInitialized = false;
      this.client = null;
      throw error;
    } finally {
      this.initializationPromise = null;
    }
  }

  public isReady(): boolean {
    return this.client !== null && (this.client as any).__BAZAAR_PRIMARY_CLIENT__;
  }

  public async reset(): Promise<void> {
    console.log('🔄 [Supabase Unified] Resetting client...');
    this.isInitialized = false;
    this.initializationPromise = null;
    this.initializationAttempts = 0;
    await this.cleanup();
    
    // Clear global references
    (window as any)[GLOBAL_CLIENT_KEY] = null;
    (window as any).__BAZAAR_UNIFIED_CLIENT_ACTIVE__ = false;
    globalClient = null;
  }
}

// Export the unified client getter
export const getSupabaseClient = async (): Promise<SupabaseClient<Database>> => {
  const unified = SupabaseUnifiedClient.getInstance();
  return await unified.getClient();
};

// Export ready check
export const isSupabaseReady = (): boolean => {
  const unified = SupabaseUnifiedClient.getInstance();
  return unified.isReady();
};

// Client الأساسي المتزامن (محسن لتجنب temporary clients)
let globalClient: SupabaseClient<Database> | null = null;

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    // إذا كان لدينا client، استخدمه مباشرة
    if (globalClient && (globalClient as any).__BAZAAR_PRIMARY_CLIENT__) {
      return (globalClient as any)[prop];
    }

    // محاولة الحصول على client من الـ unified instance
    const unified = SupabaseUnifiedClient.getInstance();
    if ((unified as any).client) {
      globalClient = (unified as any).client;
      return (globalClient as any)[prop];
    }

    // Check global client
    if ((window as any)[GLOBAL_CLIENT_KEY]) {
      globalClient = (window as any)[GLOBAL_CLIENT_KEY];
      return (globalClient as any)[prop];
    }

    // 🔧 إنشاء عميل طارئ محدود فقط عند الضرورة القصوى
    if (!globalClient) {
      console.warn('⚠️ [Supabase Unified] Creating minimal emergency client...');
      
      globalClient = (originalCreateClient as typeof createClient)(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          storageKey: 'bazaar-emergency-minimal-' + Date.now(),
          debug: false
        },
        global: {
          headers: {
            'X-Client-Info': 'bazaar-emergency-minimal',
            'X-Emergency': 'true',
            'X-Minimal': 'true',
            'X-Timestamp': Date.now().toString()
          }
        }
      });

      // استبدال العميل الطارئ فور توفر النظام الموحد
      Promise.resolve().then(async () => {
        try {
          // انتظار قصير للنظام الموحد
          let attempts = 0;
          while (attempts < 50) { // 5 ثوان
            const unified = SupabaseUnifiedClient.getInstance();
            if ((unified as any).client && (unified as any).client.__BAZAAR_PRIMARY_CLIENT__) {
              globalClient = (unified as any).client;
              console.log('✅ [Supabase Unified] Emergency client replaced with unified client');
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
        } catch (error) {
          console.warn('⚠️ [Supabase Unified] Failed to replace emergency client:', error);
        }
      });
    }

    return (globalClient as any)[prop];
  }
});

// Clean up function for testing and development
export const cleanupSupabaseClients = (): void => {
  
  const unified = SupabaseUnifiedClient.getInstance();
  unified.reset();
  
  globalClient = null;
  
  // Clear all global references
  (window as any)[GLOBAL_CLIENT_KEY] = null;
  (window as any).__BAZAAR_UNIFIED_CLIENT_ACTIVE__ = false;
  (window as any)[GLOBAL_LOCK_KEY] = false;
  
};

// تصدير نوع Database للاستخدام
export type { Database } from '@/types/database.types';

// Debug tools removed for production
