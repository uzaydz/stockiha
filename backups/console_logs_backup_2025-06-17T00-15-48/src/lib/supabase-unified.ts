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
  throw new Error('Missing Supabase environment variables');
}

const GLOBAL_CLIENT_KEY = '__BAZAAR_UNIFIED_SUPABASE_CLIENT__';
const GLOBAL_LOCK_KEY = '__BAZAAR_CLIENT_CREATION_LOCK__';

// Global lock to prevent multiple client creation attempts
let clientCreationInProgress = false;

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
      console.log('🔧 Allowing admin client creation with service key');
      return originalCreateClient(...args);
    }
    
    // Check if we already have a unified client
    if ((window as any)[GLOBAL_CLIENT_KEY]) {
      console.warn('⚠️ Preventing duplicate client creation - using unified client');
      return (window as any)[GLOBAL_CLIENT_KEY];
    }
    
    // If no unified client exists, this might be the initial creation
    console.log('🆕 Creating new client (possibly unified)');
    return originalCreateClient(...args);
  };
}

/**
 * Unified Supabase Client Manager
 */
class SupabaseUnifiedClient {
  private static instance: SupabaseUnifiedClient | null = null;
  private client: SupabaseClient<Database> | null = null;
  private isInitialized = false;

  private constructor() {
    // Prevent external instantiation
  }

  public static getInstance(): SupabaseUnifiedClient {
    // Check for existing global instance first with stronger protection
    if ((window as any)[GLOBAL_CLIENT_KEY] && (window as any)[GLOBAL_CLIENT_KEY].__BAZAAR_PRIMARY_CLIENT__) {
      return (window as any)[GLOBAL_CLIENT_KEY].__manager__;
    }
    
    if (!SupabaseUnifiedClient.instance) {
      // إشارة بداية التهيئة
      (window as any).__BAZAAR_UNIFIED_CLIENT_INITIALIZATION_STARTED__ = true;
      SupabaseUnifiedClient.instance = new SupabaseUnifiedClient();
    }
    return SupabaseUnifiedClient.instance;
  }

  private async createSupabaseClient(): Promise<SupabaseClient<Database>> {
    console.log('🔄 Creating unified Supabase client...');
    
    // Additional protection against concurrent creation
    if (clientCreationInProgress) {
      console.log('⏳ Client creation already in progress, waiting...');
      let attempts = 0;
      while (clientCreationInProgress && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (this.client) return this.client;
    }
    
    clientCreationInProgress = true;
    
    try {
    await this.cleanup();

    // تنظيف شامل لجميع مفاتيح Supabase في localStorage
    this.cleanupDuplicateStorageKeys();

      const client = (originalCreateClient as typeof createClient)<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // استخدام مفتاح تخزين فريد وثابت لتجنب التضارب
        storageKey: 'bazaar-supabase-auth-unified-main',
          // Enhanced debugging for development
          debug: import.meta.env.DEV
      },
      global: {
        headers: {
          'X-Client-Info': 'bazaar-unified-client',
            'Accept': 'application/json',
            'X-Client-Instance': 'unified-main',
            'X-Creation-Time': Date.now().toString()
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

    // إضافة معالج للأخطاء
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        this.handleSignOut();
        } else if (event === 'SIGNED_IN') {
          console.log('✅ User signed in via unified client');
        }
      });

      console.log('✅ Unified Supabase client created successfully');
      return client;
    } finally {
      clientCreationInProgress = false;
    }
  }

  private async cleanup(): Promise<void> {
    if (this.client) {
      console.log('🧹 Cleaning up previous Supabase client...');
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
        console.warn('⚠️ Error during cleanup:', error);
      }
    }
  }

  private handleSignOut(): void {
    console.log('🚪 User signed out - cleaning up client');
    this.cleanup();
  }

  private cleanupDuplicateStorageKeys(): void {
    console.log('🧹 Cleaning up duplicate storage keys...');
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
              console.log(`🗑️ Removed duplicate key: ${key}`);
              removedCount++;
            }
          } catch (err) {
            console.warn(`⚠️ Could not remove key ${key}:`, err);
          }
        }
      });

      if (removedCount > 0) {
        console.log(`✅ Cleaned up ${removedCount} duplicate storage keys`);
      }
    } catch (error) {
      console.warn('⚠️ Error during storage cleanup:', error);
    }
  }

  public async getClient(): Promise<SupabaseClient<Database>> {
    if (this.client) {
      return this.client;
    }

    if (!this.isInitialized) {
      this.isInitialized = true;
      this.client = await this.createSupabaseClient();
    }

    if (!this.client) {
      throw new Error('Failed to initialize Supabase client');
    }

    return this.client;
  }

  public isReady(): boolean {
    return this.client !== null;
  }

  public async reset(): Promise<void> {
    console.log('🔄 Resetting unified Supabase client...');
    this.isInitialized = false;
    await this.cleanup();
    
    // Clear global references
    (window as any)[GLOBAL_CLIENT_KEY] = null;
    (window as any).__BAZAAR_UNIFIED_CLIENT_ACTIVE__ = false;
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

    // تأخير أكثر قبل إنشاء العميل الطارئ - محاولة انتظار النظام الموحد
    if (!globalClient) {
      // فحص ما إذا كان التهيئة الموحدة قد بدأت بالفعل
      if ((window as any).__BAZAAR_UNIFIED_CLIENT_INITIALIZATION_STARTED__) {
        console.log('⏳ Unified client initialization in progress, deferring emergency client...');
        
        // تأخير قصير وإعادة محاولة قبل إنشاء العميل الطارئ
        const maxWaitTime = 2000; // انتظار حتى 2 ثانية
        const startTime = Date.now();
        
        let attempts = 0;
        const checkUnified = () => {
          attempts++;
          
          // إعادة فحص النظام الموحد
          const unified = SupabaseUnifiedClient.getInstance();
          if ((unified as any).client) {
            globalClient = (unified as any).client;
            console.log('✅ Found unified client after waiting');
            return (globalClient as any)[prop];
          }
          
          // إعادة فحص الـ global client
          if ((window as any)[GLOBAL_CLIENT_KEY]) {
            globalClient = (window as any)[GLOBAL_CLIENT_KEY];
            return (globalClient as any)[prop];
          }
          
          // إذا لم نجد شيء وانتهت المدة المسموحة، أنشئ العميل الطارئ
          if (Date.now() - startTime > maxWaitTime || attempts > 20) {
            console.warn('⚠️ Timeout waiting for unified client, creating emergency client');
            globalClient = (originalCreateClient as typeof createClient)(supabaseUrl, supabaseAnonKey, {
    auth: {
                autoRefreshToken: false,
                persistSession: false,
                storageKey: 'bazaar-emergency-client-' + Date.now(),
                debug: false
    },
    global: {
      headers: {
                  'X-Client-Info': 'bazaar-emergency-client',
                  'X-Emergency': 'true',
                  'X-Timeout': 'true',
                  'X-Timestamp': Date.now().toString()
                }
              }
            });

            // Replace emergency client with unified client once available
            getSupabaseClient().then((unifiedClient) => {
              console.log('✅ Replaced emergency client with unified client');
              globalClient = unifiedClient;
            }).catch(console.error);
            
            return (globalClient as any)[prop];
          }
          
          // إعادة المحاولة بعد تأخير قصير
          setTimeout(checkUnified, 100);
          return undefined; // سيؤدي لخطأ مؤقت لكن سيجبر إعادة المحاولة
        };
        
        return checkUnified();
      }

      // إذا لم تبدأ التهيئة الموحدة بعد، أنشئ العميل الطارئ فوراً
      console.warn('⚠️ Creating emergency Supabase client - unified initialization not started');
      
      globalClient = (originalCreateClient as typeof createClient)(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          storageKey: 'bazaar-emergency-client-' + Date.now(),
          debug: false
        },
        global: {
          headers: {
            'X-Client-Info': 'bazaar-emergency-client',
            'X-Emergency': 'true',
            'X-No-Init': 'true',
            'X-Timestamp': Date.now().toString()
          }
        }
      });

      // Replace emergency client with unified client once available
      getSupabaseClient().then((unifiedClient) => {
        console.log('✅ Replaced emergency client with unified client');
        globalClient = unifiedClient;
      }).catch(console.error);
    }

    return (globalClient as any)[prop];
  }
});

// Clean up function for testing and development
export const cleanupSupabaseClients = (): void => {
  console.log('🧹 Cleaning up all Supabase clients...');
  
  const unified = SupabaseUnifiedClient.getInstance();
  unified.reset();
  
  globalClient = null;
  
  // Clear all global references
  (window as any)[GLOBAL_CLIENT_KEY] = null;
  (window as any).__BAZAAR_UNIFIED_CLIENT_ACTIVE__ = false;
  (window as any)[GLOBAL_LOCK_KEY] = false;
  
  console.log('✅ All Supabase clients cleaned up');
};

// تصدير نوع Database للاستخدام
export type { Database } from '@/types/database.types';

// Debug tools removed for production
