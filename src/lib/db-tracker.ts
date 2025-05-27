import { supabase } from './supabase-client'; // افتراض أن عميل Supabase الأصلي هنا
import { FunctionInvokeOptions } from '@supabase/supabase-js';

// نوع لأسماء الدوال المتاحة في RPC
type AvailableRPCFunctions = Parameters<typeof supabase.rpc>[0];

interface RequestLogEntry {
  page: string;
  type: 'RPC' | 'FUNCTION' | 'QUERY' | 'MUTATION';
  target: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT' | string;
  duration?: number;
  error?: boolean;
  timestamp: number; // سيُستخدم داخليًا لحساب المدة
}

const requestLog: Array<Omit<RequestLogEntry, 'timestamp'>> = [];

// دالة مساعدة للحصول على المسار الحالي للصفحة (للمتصفح)
function getCurrentPage(): string {
  if (typeof window !== 'undefined') {
    return window.location.pathname;
  }
  return 'server'; // أو أي قيمة تشير إلى أن الطلب من الخادم إن أمكن
}

// دالة مساعدة للحصول على الوقت الحالي بدقة عالية
function getHighResTime(): number {
  if (typeof performance !== 'undefined') {
    return performance.now();
  }
  return Date.now();
}

// دالة لتسجيل بداية الطلب
function logRequestStart(
  type: RequestLogEntry['type'],
  target: string,
  method: RequestLogEntry['method']
): RequestLogEntry {
  const entry: RequestLogEntry = {
    page: getCurrentPage(),
    type,
    target,
    method,
    timestamp: getHighResTime(),
  };
  // console.log(`[DB_TRACKER] START: ${type} ${target} (${method}) on ${entry.page}`);
  return entry;
}

// دالة لتسجيل نهاية الطلب
function logRequestEnd(entry: RequestLogEntry, error?: any) {
  const duration = getHighResTime() - entry.timestamp;
  const { timestamp, ...loggableEntry } = entry; // إزالة timestamp قبل الحفظ
  const finalLog: Omit<RequestLogEntry, 'timestamp'> = {
    ...loggableEntry,
    duration: parseFloat(duration.toFixed(2)),
    error: !!error,
  };
  requestLog.push(finalLog);
  // console.log(`[DB_TRACKER] END: ${entry.type} ${entry.target} (${entry.method}) on ${entry.page} - ${finalLog.duration}ms ${finalLog.error ? 'ERROR' : 'SUCCESS'}`);
}

// دالة مغلِّفة لاستدعاء RPC
export async function trackedRpc(functionName: Parameters<typeof supabase.rpc>[0], params: any) {
  const entry = logRequestStart('RPC', functionName, functionName);
  try {
    const result = await supabase.rpc(functionName, params);
    logRequestEnd(entry, result.error);
    if (result.error) {
      throw result.error;
    }
    return result.data;
  } catch (error) {
    logRequestEnd(entry, error);
    throw error;
  }
}

// دالة مغلِّفة لاستدعاء Edge Function
export async function trackedFunctionInvoke<T = any>(
  functionName: string,
  options: Omit<FunctionInvokeOptions, 'method'> & { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT' }
): Promise<T> {
  const httpMethod = options?.method || (options?.body ? 'POST' : 'GET');
  const entry = logRequestStart('FUNCTION', functionName, httpMethod);
  try {
    const result = await supabase.functions.invoke<T>(functionName, options as FunctionInvokeOptions);
    logRequestEnd(entry, result.error);
    if (result.error) {
      throw result.error;
    }
    return result.data;
  } catch (error) {
    logRequestEnd(entry, error);
    throw error;
  }
}

// دالة مغلِّفة لاستعلامات SELECT
export function trackedSupabaseClient() {
  const originalFrom = supabase.from.bind(supabase);

  return {
    ...supabase, // نسخ باقي خصائص supabase
    from: (tableName: string) => {
      const table = originalFrom(tableName);
      const originalSelect = table.select.bind(table);
      const originalInsert = table.insert.bind(table);
      const originalUpdate = table.update.bind(table);
      const originalUpsert = table.upsert.bind(table);
      const originalDelete = table.delete.bind(table);

      table.select = (...args: any[]) => {
        const queryContext = args.length > 0 && typeof args[0] === 'string' ? args[0] : '*';
        const entry = logRequestStart('QUERY', `${tableName}.select(${queryContext})`, 'GET');
        return originalSelect(...args).then((result: any) => {
          logRequestEnd(entry, result.error);
          if (result.error) console.error(`[DB_TRACKER] SELECT Error on ${tableName}:`, result.error);
          return result;
        }).catch((error: any) => {
          logRequestEnd(entry, error);
          throw error;
        });
      };

      table.insert = (values: any, options?: any) => {
        const entry = logRequestStart('MUTATION', `${tableName}.insert`, 'POST');
        return originalInsert(values, options).then((result: any) => {
          logRequestEnd(entry, result.error);
          if (result.error) console.error(`[DB_TRACKER] INSERT Error on ${tableName}:`, result.error);
          return result;
        }).catch((error: any) => {
          logRequestEnd(entry, error);
          throw error;
        });
      };
      
      table.update = (values: any, options?: any) => {
        const entry = logRequestStart('MUTATION', `${tableName}.update`, 'PATCH');
        return originalUpdate(values, options).then((result: any) => {
          logRequestEnd(entry, result.error);
          if (result.error) console.error(`[DB_TRACKER] UPDATE Error on ${tableName}:`, result.error);
          return result;
        }).catch((error: any) => {
          logRequestEnd(entry, error);
          throw error;
        });
      };

      table.upsert = (values: any, options?: any) => {
        const entry = logRequestStart('MUTATION', `${tableName}.upsert`, 'POST'); // Often implemented as POST with specific header
        return originalUpsert(values, options).then((result: any) => {
          logRequestEnd(entry, result.error);
          if (result.error) console.error(`[DB_TRACKER] UPSERT Error on ${tableName}:`, result.error);
          return result;
        }).catch((error: any) => {
          logRequestEnd(entry, error);
          throw error;
        });
      };

      table.delete = (options?: any) => {
        const entry = logRequestStart('MUTATION', `${tableName}.delete`, 'DELETE');
        return originalDelete(options).then((result: any) => {
          logRequestEnd(entry, result.error);
          if (result.error) console.error(`[DB_TRACKER] DELETE Error on ${tableName}:`, result.error);
          return result;
        }).catch((error: any) => {
          logRequestEnd(entry, error);
          throw error;
        });
      };
      
      return table;
    }
  };
}

export const trackedSupabase = trackedSupabaseClient();

// دالة للحصول على السجل
export function getDbRequestLog() {
  return [...requestLog]; // إرجاع نسخة من السجل
}

export function clearDbRequestLog() {
  requestLog.length = 0;
}

// دالة لطباعة السجل في الكونسول
export function printDbRequestLog() {
  const log = getDbRequestLog();
  if (log.length > 0) {
    // استخدام console.table يتطلب أن تكون جميع الكائنات بنفس البنية، وهو ما نضمنه
  } else {
  }
}
