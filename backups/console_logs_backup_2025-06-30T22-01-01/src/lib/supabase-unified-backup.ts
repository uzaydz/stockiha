/**
 * ملف Supabase موحد - يحل مشكلة تعدد الـ instances
 * يضمن وجود client واحد فقط في كامل التطبيق
 * النسخة المبسطة والقياسية
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// متغيرات البيئة
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anonymous key are required.');
}

// إنشاء العميل الأساسي
const baseClient: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
      'X-Client-Info': 'bazaar-unified-client-simplified',
    }
  }
});

// دالة للحصول على معلومات المصدر
const getSourceInfo = () => {
  const error = new Error();
  const stack = error.stack?.split('\n') || [];

  // تصفية للعثور على المصدر الحقيقي
  const relevantStack = stack
    .filter(line => 
      (line.includes('.ts') || line.includes('.tsx') || line.includes('.js') || line.includes('.jsx')) &&
      !line.includes('supabase-unified') &&
      !line.includes('supabase-js') &&
      !line.includes('node_modules') &&
      !line.includes('chunk-') &&
      !line.includes('getSourceInfo') &&
      !line.includes('createTrackedClient') &&
      !line.includes('@supabase') &&
      !line.includes('queryBuilder.')
    );

  if (relevantStack.length > 0) {
    const callerLine = relevantStack[0];
    
    // تحسين regex patterns للتطابق مع تنسيقات مختلفة
    const patterns = [
      /\(([^)]+):(\d+):\d+\)/, // Pattern: (file:line:col)
      /at ([^:]+):(\d+):\d+/, // Pattern: at file:line:col
      /([^@]+)@([^:]+):(\d+):\d+/, // Pattern: function@file:line:col
      /\/([^/:]+):(\d+):\d+/, // Pattern: /file:line:col
      /([^\/\s]+\.(?:ts|tsx|js|jsx)):(\d+):\d+/, // Pattern: filename.ext:line:col
      /([^\/\s]+\.(?:ts|tsx|js|jsx))\?[^:]*:(\d+):\d+/ // Pattern: filename.ext?query:line:col
    ];
    
    for (const pattern of patterns) {
      const match = callerLine.match(pattern);
      if (match) {
        let fullPath = match[1];
        let lineNumber = parseInt(match[2]);
        
        // في حالة التطابق مع النمط الثالث
        if (match[3]) {
          fullPath = match[2];
          lineNumber = parseInt(match[3]);
        }
        
        // استخراج اسم الملف فقط وإزالة query parameters
        const fileName = fullPath.split('/').pop()?.split('?')[0] || fullPath;

        return {
          file: fileName,
          line: lineNumber,
          stack: relevantStack.slice(0, 5)
        };
      }
    }
  }

  return {
    file: 'unknown',
    line: 0,
    stack: relevantStack.slice(0, 5)
  };
};

// دالة لتسجيل الاستدعاءات
const logCall = (operation: string, method: string, startTime: number, success: boolean, table?: string, error?: string, query?: any, result?: any, sourceInfo?: { file: string; line: number; stack: string[] }) => {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    try {
      import('@/hooks/useSupabaseAnalytics').then(({ supabaseAnalytics }) => {
        const endTime = performance.now();
        
        // إنشاء كائن الاستدعاء مع معلومات المصدر
        const call: any = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          timestamp: startTime,
          operation,
          table,
          duration: endTime - startTime,
          success,
          error,
          sourceFile: sourceInfo?.file || 'unknown',
          sourceLine: sourceInfo?.line || 0,
          stackTrace: sourceInfo?.stack || [],
          method: method as any,
          query: query ? (JSON.stringify(query).length > 1000 ? '[Large Query]' : query) : undefined,
          response: result && success ? (JSON.stringify(result).length > 1000 ? '[Large Response]' : result) : undefined,
          dataSize: result && result.data ? JSON.stringify(result.data).length : undefined
        };
        
        // إضافة الاستدعاء مباشرة
        supabaseAnalytics.addCallDirect(call);
        
      }).catch(() => {
        // تجاهل أخطاء التحميل
      });
    } catch (e) {
      // تجاهل أخطاء التتبع
    }
  }
};

// إنشاء Wrapper للعميل مع التتبع
const createTrackedClient = (client: SupabaseClient<Database>): any => {
  const originalFrom = client.from.bind(client);
  const originalRpc = client.rpc.bind(client);

  return {
    // نسخ جميع خصائص العميل الأصلي
    ...client,
    
    // إضافة الخصائص المهمة بشكل صريح
    functions: client.functions,
    auth: client.auth,
    realtime: client.realtime,
    storage: client.storage,
    
    from: (table: any) => {
      const queryBuilder = originalFrom(table);
      const tableName = String(table);
      
      // إنشاء proxy للتعامل مع جميع methods بشكل ديناميكي
      return new Proxy(queryBuilder, {
        get(target, prop, receiver) {
          const originalMethod = Reflect.get(target, prop, receiver);
          
          // إذا كان method قابل للاستدعاء
          if (typeof originalMethod === 'function') {
            
            // Methods التي تحتاج تتبع خاص
            if (prop === 'select') {
              return function(...args: any[]) {
                const sourceInfo = getSourceInfo();
                const startTime = performance.now();
                const result = originalMethod.apply(this, args);
                
                // إذا كان النتيجة Promise، تتبعها
                if (result && typeof result.then === 'function') {
                  result.then(
                    (data: any) => {
                      logCall(`${tableName}.select`, 'select', startTime, true, tableName, undefined, args[0], data, sourceInfo);
                      return data;
                    },
                    (error: any) => {
                      // معالجة خاصة لأخطاء 406
                      if (error?.code === 'PGRST116' || error?.message?.includes('406') || error?.status === 406) {
                        console.log(`⚠️ خطأ 406 في جدول ${tableName} - تم تجاهله لتجنب التكرار`);
                        // إرجاع نتيجة فارغة بدلاً من throw
                        return { data: null, error: null };
                      }
                      
                      logCall(`${tableName}.select`, 'select', startTime, false, tableName, error?.message || String(error), args[0], undefined, sourceInfo);
                      throw error;
                    }
                  ).catch((error: any) => {
                    // معالجة إضافية للأخطاء
                    if (error?.code === 'PGRST116' || error?.message?.includes('406') || error?.status === 406) {
                      console.log(`⚠️ خطأ 406 في جدول ${tableName} - تم تجاهله في catch`);
                      return { data: null, error: null };
                    }
                    throw error;
                  });
                }
                
                return result;
              };
            }
            
            if (prop === 'insert') {
              return function(...args: any[]) {
                const sourceInfo = getSourceInfo();
                const startTime = performance.now();
                const result = originalMethod.apply(this, args);
                
                if (result && typeof result.then === 'function') {
                  result.then(
                    (data: any) => {
                      logCall(`${tableName}.insert`, 'insert', startTime, true, tableName, undefined, args[0], data, sourceInfo);
                      return data;
                    },
                    (error: any) => {
                      logCall(`${tableName}.insert`, 'insert', startTime, false, tableName, error?.message || String(error), args[0], undefined, sourceInfo);
                      throw error;
                    }
                  ).catch(() => {}); // تجاهل أخطاء التتبع
                }
                
                return result;
              };
            }
            
            if (prop === 'update') {
              return function(...args: any[]) {
                const sourceInfo = getSourceInfo();
                const startTime = performance.now();
                const result = originalMethod.apply(this, args);
                
                if (result && typeof result.then === 'function') {
                  result.then(
                    (data: any) => {
                      logCall(`${tableName}.update`, 'update', startTime, true, tableName, undefined, args[0], data, sourceInfo);
                      return data;
                    },
                    (error: any) => {
                      logCall(`${tableName}.update`, 'update', startTime, false, tableName, error?.message || String(error), args[0], undefined, sourceInfo);
                      throw error;
                    }
                  ).catch(() => {}); // تجاهل أخطاء التتبع
                }
                
                return result;
              };
            }
            
            if (prop === 'delete') {
              return function(...args: any[]) {
                const sourceInfo = getSourceInfo();
                const startTime = performance.now();
                const result = originalMethod.apply(this, args);
                
                if (result && typeof result.then === 'function') {
                  result.then(
                    (data: any) => {
                      logCall(`${tableName}.delete`, 'delete', startTime, true, tableName, undefined, args[0], data, sourceInfo);
                      return data;
                    },
                    (error: any) => {
                      logCall(`${tableName}.delete`, 'delete', startTime, false, tableName, error?.message || String(error), args[0], undefined, sourceInfo);
                      throw error;
                    }
                  ).catch(() => {}); // تجاهل أخطاء التتبع
                }
                
                return result;
              };
            }
            
            // باقي methods (eq, or, maybeSingle, single, etc) - تمرير مباشر بدون تتبع
            return function(...args: any[]) {
              const result = originalMethod.apply(this, args);
              
              // إذا كان النتيجة query builder آخر، لفه أيضاً
              if (result && typeof result === 'object' && result.constructor === target.constructor) {
                return new Proxy(result, this);
              }
              
              return result;
            };
          }
          
          // إذا لم يكن method، إرجاع القيمة كما هي
          return originalMethod;
        }
      });
    },
    
    rpc: (fn: any, args?: any) => {
      const sourceInfo = getSourceInfo();
      const startTime = performance.now();
      const result = originalRpc(fn, args);
      
      if (result && typeof result.then === 'function') {
        result.then(
          (data: any) => {
            logCall(`rpc.${String(fn)}`, 'rpc', startTime, true, undefined, undefined, args, data, sourceInfo);
            return data;
          },
          (error: any) => {
            logCall(`rpc.${String(fn)}`, 'rpc', startTime, false, undefined, error?.message || String(error), args, undefined, sourceInfo);
            throw error;
          }
        ).catch(() => {}); // تجاهل أخطاء التتبع
      }
      
      return result;
    }
  };
};

// تصدير العميل مع التتبع في بيئة التطوير
export const supabase = import.meta.env.DEV 
  ? createTrackedClient(baseClient)
  : baseClient;

/**
 * دالة للحصول على العميل. الاستيراد المباشر لـ `supabase` هو المفضل.
 */
export const getSupabaseClient = (): SupabaseClient<Database> => {
  return supabase;
};

/**
 * دالة بسيطة للتحقق من جاهزية العميل.
 */
export const isSupabaseReady = (): boolean => {
  return !!supabase;
};

/**
 * لم تعد هذه الدالة ضرورية مع العميل المبسط.
 */
export const cleanupSupabaseClients = (): void => {
};

// إعادة تصدير أنواع البيانات للتوافق
export type { Database } from '@/types/database.types';

// إضافة نظام التحليل للنافذة العامة في بيئة التطوير
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).getSupabaseAnalytics = () => {
    // إرجاع بيانات وهمية للاختبار
    return {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageResponseTime: 0,
      callsByTable: {},
      callsByFile: {},
      slowestCalls: [],
      errorCalls: []
    };
  };
  
  (window as any).clearSupabaseAnalytics = () => {
  };
}
