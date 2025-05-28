import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { initSupabaseForElectron, isElectron } from './supabase-electron';
import localforage from 'localforage';
import { recordSupabaseQuery, updateSupabaseQuery } from '@/components/debug/queryRecorder';

// These values should be stored in environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
}

// تهيئة مخزن محلي لبيانات المصادقة
const authStore = localforage.createInstance({
  name: 'bazaar-auth',
  storeName: 'session'
});

// نعديل خيارات Supabase للسماح بالوصول للزوار
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'bazaar-auth-storage',
    // تخزين بيانات المصادقة محلياً
    storage: {
      getItem: async (key) => {
        try {
          const data = await authStore.getItem(key);
          return JSON.stringify(data);
        } catch (error) {
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          const data = JSON.parse(value);
          await authStore.setItem(key, data);
        } catch (error) {
        }
      },
      removeItem: async (key) => {
        try {
          await authStore.removeItem(key);
        } catch (error) {
        }
      }
    },
    flowType: 'pkce' as const,
    // تجاوز الطلبات عند عدم الاتصال
    fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
      const maxRetries = 3;
      let attempt = 0;
      
      while (attempt < maxRetries) {
        try {
          let headers: HeadersInit;
          
          // استراتيجية الرؤوس حسب المحاولة
          switch (attempt) {
            case 0:
              // المحاولة الأولى: رؤوس كاملة محسنة
              headers = {
                'Accept': 'application/json, application/vnd.pgrst.object+json, text/plain, */*',
                'Accept-Language': 'ar,en;q=0.9,*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Prefer': 'return=representation',
                ...(options?.headers as Record<string, string> || {}),
              };
              break;
              
            case 1:
              // المحاولة الثانية: رؤوس مبسطة
              const baseHeaders = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...(options?.headers as Record<string, string> || {}),
              };
              // إزالة رؤوس قد تسبب مشاكل
              delete baseHeaders['Prefer'];
              delete baseHeaders['Accept-Language'];
              delete baseHeaders['Accept-Encoding'];
              headers = baseHeaders;
              break;
              
            default:
              // المحاولة الأخيرة: الحد الأدنى من الرؤوس
              const originalHeaders = options?.headers as Record<string, string> || {};
              const minimalHeaders: Record<string, string> = {
                'Accept': '*/*',
              };
              
              // الاحتفاظ برؤوس المصادقة فقط
              const authHeaders = ['Authorization', 'apikey', 'X-Client-Info'];
              authHeaders.forEach(key => {
                if (originalHeaders[key]) {
                  minimalHeaders[key] = originalHeaders[key];
                }
              });
              
              headers = minimalHeaders;
              break;
          }

          const response = await fetch(url, {
            ...options,
            headers,
          });

          // إذا نجح الطلب، أرجع الاستجابة
          if (response.ok) {
            if (attempt > 0) {
              console.log(`✅ نجح طلب Supabase في المحاولة ${attempt + 1}`);
            }
            return response;
          }

          // معالجة خطأ 406 Not Acceptable
          if (response.status === 406) {
            console.warn(`🚨 خطأ 406 في المحاولة ${attempt + 1}/${maxRetries} - ${url}`);
            
            // إذا لم تكن هذه المحاولة الأخيرة، جرب مرة أخرى
            if (attempt < maxRetries - 1) {
              attempt++;
              // تأخير تدريجي
              await new Promise(resolve => setTimeout(resolve, 500 * attempt));
              continue;
            }
          }

          // إذا لم يكن خطأ 406 أو كانت المحاولة الأخيرة، أرجع الاستجابة
          return response;

        } catch (error) {
          console.error(`❌ خطأ في طلب Supabase (المحاولة ${attempt + 1}):`, error);
          
          // إذا كان خطأ شبكة وليست المحاولة الأخيرة، جرب مرة أخرى
          if (attempt < maxRetries - 1 && error instanceof TypeError) {
            attempt++;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          
          throw error;
        }
      }
      
      // هذا لن يحدث أبداً، لكن TypeScript يحتاجه
      throw new Error('فشلت جميع محاولات الطلب');
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'bazaar-console-connect',
      'Accept': 'application/json, application/vnd.pgrst.object+json',
      'Prefer': 'return=representation'
    }
  },
  // تعطيل تسجيل الخروج عند انتهاء صلاحية الجلسة
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
};

// Create a single supabase client instance for interacting with the database
// Use a singleton pattern to ensure we only create one instance
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
let instanceInitialized = false;

// إنشاء عميل Supabase واحد للاستخدام في جميع أنحاء التطبيق
export const getSupabaseClient = () => {
  // تجنب تهيئة عميل Supabase أكثر من مرة
  if (!supabaseInstance && !instanceInitialized) {
    instanceInitialized = true; // وضع علامة على أن التهيئة قيد التنفيذ
    
    // تهيئة إعدادات Electron لـ Supabase إذا لزم الأمر
    if (isElectron()) {
      initSupabaseForElectron();
    }
    
    if (!supabaseUrl || !supabaseAnonKey) {
      instanceInitialized = false; // إعادة تعيين العلامة في حالة الفشل
      return null;
    }
    
    try {
      // إنشاء عميل Supabase
      supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, options);

      // إضافة مستمع لأحداث المصادقة لرصد المشاكل
      supabaseInstance.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          
        } else if (event === 'SIGNED_IN') {
          
        } else if (event === 'TOKEN_REFRESHED') {
          
        } else if (event === 'USER_UPDATED') {
          
        }
      });
    } catch (error) {
      supabaseInstance = null;
      instanceInitialized = false; // إعادة تعيين العلامة في حالة الفشل
    }
  }
  
  return supabaseInstance;
};

// تهيئة عميل Supabase فورًا (مع التأخير إذا كان في بيئة المتصفح)
let initPromise: Promise<void> | null = null;

const initSupabaseClient = () => {
  if (!initPromise) {
    initPromise = new Promise<void>((resolve) => {
      // تأخير التهيئة قليلاً في بيئة المتصفح لتجنب تضارب التهيئة
      if (typeof window !== 'undefined') {
        // تأخير بسيط لتجنب التهيئة المتزامنة
        setTimeout(() => {
          supabase; // تشغيل التهيئة الكسولة
          resolve();
        }, 10);
      } else {
        // تهيئة فورية في بيئة الخادم
        supabase;
        resolve();
      }
    });
  }
  return initPromise;
};

// تتبع الاستعلامات
let trackingEnabled = true;

// كائن وسيط يعمل على تهيئة العميل بشكل كسول وتسجيل الاستعلامات
// هذا يضمن أنه يتم إنشاء عميل واحد فقط عند استخدامه أول مرة
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop, receiver) {
    // تهيئة العميل عند الحاجة
    if (!initPromise) {
      initPromise = initSupabaseClient();
    }
    
    const supabaseClient = getSupabaseClient();
    const value = Reflect.get(supabaseClient, prop, receiver);

    // تتبع استعلامات from, rpc, functions
    if (trackingEnabled && typeof value === 'function' && (prop === 'from' || prop === 'rpc')) {
      // إنشاء نسخة من الدالة مع تتبع
      return function(...args: any[]) {
        // سجل بداية الاستعلام
        const startTime = performance.now();
        let method = 'unknown';
        let url = '';
        let table = prop === 'from' ? args[0] : `rpc:${args[0]}`;
        let queryParams = prop === 'from' ? null : args[1];

        // تسجيل بداية الاستعلام
        const queryId = recordSupabaseQuery({
          method: prop === 'rpc' ? 'POST' : 'GET',
          url: prop === 'from' ? `/rest/v1/${table}` : `/rest/v1/rpc/${args[0]}`,
          table,
          body: queryParams,
          duration: 0
        });

        // استدعاء الدالة الأصلية
        const result = value.apply(supabaseClient, args);

        // إذا كانت النتيجة كائن وله طرق مثل .select, .update, إلخ
        if (result && typeof result === 'object') {
          // قائمة الطرق التي نريد اعتراضها
          const methodsToIntercept = [
            'select', 'insert', 'update', 'delete', 
            'eq', 'neq', 'gt', 'lt', 'gte', 'lte',
            'like', 'ilike', 'in', 'or', 'and',
            'is', 'not'
          ];

          // اعتراض طرق الكائن الناتج
          methodsToIntercept.forEach(methodName => {
            if (typeof result[methodName] === 'function') {
              const originalMethod = result[methodName];
              result[methodName] = function(...methodArgs: any[]) {
                // تحديث طريقة الاستعلام استناداً إلى اسم الطريقة
                if (methodName === 'select') method = 'GET';
                else if (methodName === 'insert') method = 'POST';
                else if (methodName === 'update') method = 'PATCH';
                else if (methodName === 'delete') method = 'DELETE';

                // استدعاء الطريقة الأصلية
                const methodResult = originalMethod.apply(this, methodArgs);

                // اعتراض الـ then لتسجيل النتيجة والتوقيت
                if (methodResult && typeof methodResult.then === 'function') {
                  const originalThen = methodResult.then;
                  methodResult.then = function(onFulfilled: any, onRejected: any) {
                    return originalThen.call(this,
                      (response: any) => {
                        // تحديث الاستعلام مع النتيجة والمدة
                        updateSupabaseQuery(queryId, {
                          method,
                          response,
                          duration: Math.round(performance.now() - startTime)
                        });
                        return onFulfilled ? onFulfilled(response) : response;
                      },
                      (error: any) => {
                        // تحديث الاستعلام مع الخطأ والمدة
                        updateSupabaseQuery(queryId, {
                          method,
                          error,
                          duration: Math.round(performance.now() - startTime)
                        });
                        return onRejected ? onRejected(error) : Promise.reject(error);
                      }
                    );
                  };
                }

                return methodResult;
              };
            }
          });
        }

        return result;
      };
    } else if (trackingEnabled && prop === 'functions') {
      // اعتراض طلبات الدوال
      const functionsObj = value;
      return new Proxy(functionsObj, {
        get(target, funcProp, receiver) {
          const funcValue = Reflect.get(target, funcProp, receiver);
          
          if (funcProp === 'invoke' && typeof funcValue === 'function') {
            return function(fnName: string, options?: any) {
              // تسجيل بداية الاستعلام
              const startTime = performance.now();
              const queryId = recordSupabaseQuery({
                method: 'POST',
                url: `/functions/v1/${fnName}`,
                table: `function:${fnName}`,
                body: options?.body,
                duration: 0
              });
              
              // استدعاء الدالة الأصلية
              const result = funcValue.apply(this, arguments);
              
              // تسجيل النتيجة
              if (result && typeof result.then === 'function') {
                const originalThen = result.then;
                result.then = function(onFulfilled: any, onRejected: any) {
                  return originalThen.call(this,
                    (response: any) => {
                      updateSupabaseQuery(queryId, {
                        response,
                        duration: Math.round(performance.now() - startTime)
                      });
                      return onFulfilled ? onFulfilled(response) : response;
                    },
                    (error: any) => {
                      updateSupabaseQuery(queryId, {
                        error,
                        duration: Math.round(performance.now() - startTime)
                      });
                      return onRejected ? onRejected(error) : Promise.reject(error);
                    }
                  );
                };
              }
              
              return result;
            };
          }
          
          return funcValue;
        }
      });
    }

    return value;
  }
});

// وظيفة للتبديل بين تفعيل وتعطيل تتبع الاستعلامات
export const toggleQueryTracking = (enabled: boolean) => {
  trackingEnabled = enabled;
};

// إضافة مستمع لحالة الاتصال بالإنترنت
if (typeof window !== 'undefined') {
  // عند استعادة الاتصال
  window.addEventListener('online', () => {
    // يمكن هنا استدعاء وظائف المزامنة للبيانات المحلية مع السيرفر
  });
  
  // عند فقدان الاتصال
  window.addEventListener('offline', () => {
    
  });
}

/**
 * التحقق من حالة مصادقة المستخدم، مع دعم وضع عدم الاتصال
 */
export const getAuthStatus = async () => {
  try {
    // إذا كان المستخدم غير متصل، استخدم البيانات المحلية
    if (!navigator.onLine) {
      const session = await authStore.getItem('supabase.auth.token');
      return {
        isAuthenticated: !!session,
        isOffline: true,
        session
      };
    }
    
    // التأكد من تهيئة العميل قبل استدعاء getSession
    await initSupabaseClient();
    
    // إذا كان المستخدم متصلاً، استخدم الطريقة المعتادة
    const client = getSupabaseClient();
    if (!client) {
      return { isAuthenticated: false, isOffline: true, session: null };
    }
    
    const { data, error } = await client.auth.getSession();
    
    if (error) {
      return { isAuthenticated: false, isOffline: false, session: null };
    }
    
    return {
      isAuthenticated: !!data.session,
      isOffline: false,
      session: data.session
    };
  } catch (error) {
    return { isAuthenticated: false, isOffline: true, session: null };
  }
};
