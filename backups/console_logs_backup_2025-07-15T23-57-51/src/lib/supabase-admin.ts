import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { supabase } from './supabase-unified';

// هذه القيم يجب أن تكون مخزنة في متغيرات البيئة
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

// علامة عالمية لمنع إنشاء عدة عملاء مسؤولين
let globalAdminFlag = false;

// الاحتفاظ بمثيل واحد فقط من Supabase Admin
let supabaseAdminInstance: ReturnType<typeof createClient<Database>> | null = null;
let adminInstanceInitialized = false;

/**
 * دالة للحصول على عميل Supabase بصلاحيات المسؤول
 * تستخدم نمط Singleton لضمان وجود نسخة واحدة فقط
 * محسنة لتجنب مشكلة Multiple GoTrueClient instances
 */
export const getSupabaseAdmin = () => {
  // فحص إضافي للتأكد من عدم وجود عميل مسؤول عالمي
  if ((window as any).__BAZAAR_ADMIN_CLIENT_CREATED__) {
    return (window as any).__BAZAAR_ADMIN_CLIENT__;
  }

  if (!supabaseAdminInstance && !adminInstanceInitialized) {
    adminInstanceInitialized = true; // وضع علامة على أن التهيئة قيد التنفيذ
    
    if (!supabaseUrl || !supabaseServiceKey) {
      adminInstanceInitialized = false; // إعادة تعيين العلامة في حالة الفشل
      return null;
    }
    
    try {
      
      // إنشاء اتصال Supabase باستخدام مفتاح الخدمة لتجاوز سياسات RLS
      // تم تحسينه لتجنب تعارضات GoTrueClient
      supabaseAdminInstance = createClient<Database>(
        supabaseUrl, 
        supabaseServiceKey,
        {
          auth: {
            // تعطيل كامل لـ Auth client لتجنب تعدد GoTrueClient instances
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
            // استخدام مفتاح تخزين فريد مع تأكيد العزل
            storageKey: `bazaar-admin-noauth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            // تعطيل التخزين تماماً لتجنب التعارضات
            storage: {
              getItem: () => Promise.resolve(null),
              setItem: () => Promise.resolve(),
              removeItem: () => Promise.resolve()
            },
            // تعطيل كامل لـ GoTrueClient
            debug: false
          },
          global: {
            headers: {
              'X-Client-Info': 'bazaar-admin-client-v2',
              'X-Admin-Client': 'true',
              'X-Instance-Id': Date.now().toString(),
              'X-Service-Role': 'true',
              'Authorization': `Bearer ${supabaseServiceKey}` // إضافة التوثيق المباشر
            }
          },
          // تعطيل realtime تماماً للعميل المسؤول
          realtime: {
            params: {
              eventsPerSecond: 0
            }
          },
          // إعدادات إضافية لتحسين الأداء
          db: {
            schema: 'public'
          }
        }
      );

      // وضع علامة عالمية لمنع إنشاء عملاء إضافيين
      (window as any).__BAZAAR_ADMIN_CLIENT_CREATED__ = true;
      (window as any).__BAZAAR_ADMIN_CLIENT__ = supabaseAdminInstance;
      (supabaseAdminInstance as any).__BAZAAR_ADMIN_CLIENT__ = true;

    } catch (error) {
      supabaseAdminInstance = null;
      adminInstanceInitialized = false; // إعادة تعيين العلامة في حالة الفشل
      (window as any).__BAZAAR_ADMIN_CLIENT_CREATED__ = false;
    }
  }
  return supabaseAdminInstance;
};

// كائن وسيط للتهيئة الكسولة لعميل المسؤول
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop, receiver) {
    // تهيئة العميل عند أي محاولة للوصول
    const client = getSupabaseAdmin();
    if (!client) {
      throw new Error('فشل في تهيئة عميل Supabase Admin - تحقق من متغيرات البيئة');
    }
    return Reflect.get(client, prop, receiver);
  }
});

// دالة لتنظيف عميل المسؤول عند الحاجة
export const cleanupAdminClient = () => {
  supabaseAdminInstance = null;
  adminInstanceInitialized = false;
  (window as any).__BAZAAR_ADMIN_CLIENT_CREATED__ = false;
  (window as any).__BAZAAR_ADMIN_CLIENT__ = null;
};

/**
 * دالة بديلة محسنة للعمليات التي تتطلب صلاحيات المسؤول
 * تستخدم REST API مباشرة بدلاً من إنشاء عميل جديد
 */
export const executeAdminOperation = async (operation: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: any;
  headers?: Record<string, string>;
}) => {
  try {
    const { method, endpoint, data, headers = {} } = operation;
    
    // استخدام fetch مباشرة لتجنب إنشاء عميل جديد
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'X-Admin-Direct': 'true',
        'X-No-GoTrue': 'true',
        ...headers
      },
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    // التحقق من وجود محتوى للاستجابة قبل تحليل JSON
    const responseText = await response.text();
    let result = null;
    
    if (responseText && responseText.trim() !== '') {
      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        result = responseText; // إرجاع النص الخام إذا فشل تحليل JSON
      }
    }
    
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * دالة مباشرة لتنفيذ RPC باستخدام Service Role
 */
export const executeAdminRPC = async (functionName: string, params: any = {}) => {
  return executeAdminOperation({
    method: 'POST',
    endpoint: `rpc/${functionName}`,
    data: params
  });
};

/**
 * دالة محسنة لإنشاء/تحديث البيانات مع Service Role
 */
export const executeAdminQuery = async (table: string, operation: {
  action: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  data?: any;
  filters?: Record<string, any>;
  columns?: string;
}) => {
  const { action, data, filters, columns = '*' } = operation;
  
  let endpoint = table;
  let method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET';
  let queryParams = '';
  let body = undefined;

  switch (action) {
    case 'select':
      method = 'GET';
      queryParams = `?select=${columns}`;
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          queryParams += `&${key}=eq.${value}`;
        }
      }
      break;
    
    case 'insert':
      method = 'POST';
      body = data;
      queryParams = `?select=${columns}`;
      break;
    
    case 'upsert':
      method = 'POST';
      body = data;
      queryParams = `?select=${columns}`;
      break;
    
    case 'update':
      method = 'PATCH';
      body = data;
      queryParams = `?select=${columns}`;
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          queryParams += `&${key}=eq.${value}`;
        }
      }
      break;
    
    case 'delete':
      method = 'DELETE';
      if (filters) {
        queryParams = '?';
        for (const [key, value] of Object.entries(filters)) {
          queryParams += `${key}=eq.${value}&`;
        }
        queryParams = queryParams.slice(0, -1);
      }
      break;
  }

  return executeAdminOperation({
    method,
    endpoint: `${endpoint}${queryParams}`,
    data: body,
    headers: action === 'upsert' ? { 'Prefer': 'resolution=merge-duplicates' } : {}
  });
};

/**
 * دالة بديلة للعمليات التي تتطلب صلاحيات المسؤول
 * تستخدم العميل العادي مع Service Role Key في Headers - محسنة
 */
export const createAdminRequest = async (operation: (client: any) => Promise<any>) => {
  try {
    
    // محاولة استخدام العميل الرئيسي أولاً مع تعديل Headers
    const { supabase } = await import('./supabase-unified');
    
    // إنشاء نسخة مؤقتة من العميل العادي مع headers المسؤول
    const tempAdminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        storageKey: `temp-admin-${Date.now()}`,
        storage: {
          getItem: () => Promise.resolve(null),
          setItem: () => Promise.resolve(),
          removeItem: () => Promise.resolve()
        }
      },
      global: {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'X-Admin-Request': 'true',
          'apikey': supabaseServiceKey
        }
      }
    });

    const result = await operation(tempAdminClient);
    
    // تنظيف فوري (محاولة)
    try {
      (tempAdminClient as any)._realtime?.disconnect?.();
    } catch (e) {
      // تجاهل أخطاء التنظيف
    }
    
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * دالة لتجاوز خطأ الوصول المباشر إلى information_schema
 * استخدام SQL مباشر للحصول على قائمة الجداول العامة
 */
export const getTables = async (): Promise<string[]> => {
  try {
    // استخدام RPC get_available_tables بدون أي باراميتر
    try {
      const { data, error } = await supabaseAdmin.rpc('get_available_tables');
      if (!error && Array.isArray(data)) {
        // استخراج أسماء الجداول فقط من النتائج مع fallback
        const tableNames = data.map(item => item.table_name || item.tablename).filter(Boolean);
        if (tableNames.length === 0) {
        }
        return tableNames;
      }
    } catch (error1) {
    }
    
    // الخيار 2: محاولة استخدام get_public_tables
    try {
      const { data, error } = await supabaseAdmin.rpc('get_public_tables');
      
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (error2) {
    }

    // الخيار 3: محاولة استخدام query_tables
    try {
      const data = await executeRawQuery(`
        SELECT tablename as table_name
        FROM pg_catalog.pg_tables 
        WHERE schemaname='public'
        ORDER BY tablename
      `);
      
      if (Array.isArray(data) && data.length > 0) {
        const tableNames = data.map(item => item.table_name || item.tablename);
        return tableNames;
      }
    } catch (error3) {
    }
    
    // الخيار 4: محاولة استخدام الوصول المباشر إلى جدول معلومات النظام
    try {
      const { data, error } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');
      
      if (!error && Array.isArray(data) && data.length > 0) {
        const tableNames = data.map(item => item.table_name);
        return tableNames;
      }
    } catch (error4) {
    }
    
    // إذا وصلنا إلى هنا، فكل المحاولات قد فشلت، استخدم القائمة الافتراضية
    return [
      'users',
      'products',
      'categories',
      'orders',
      'order_items',
      'inventory',
      'customers',
      'suppliers',
      'transactions',
      'settings',
      'logs',
      'sync_queue'
    ];
  } catch (error) {
    return [
      'users',
      'products',
      'categories',
      'orders',
      'order_items',
      'inventory',
      'customers',
      'suppliers',
      'transactions',
      'settings',
      'logs',
      'sync_queue'
    ]; // قائمة افتراضية
  }
}; 

// الدالة المساعدة لتنفيذ استعلام SQL مباشر
export const executeRawQuery = async (queryText: string): Promise<any[]> => {
  // محاولة استخدام query_tables RPC أولاً
  try {
    const { data, error } = await supabaseAdmin.rpc('query_tables', { query_text: queryText });
    
    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (rpcError) {
  }
  
  // محاولة بديلة باستخدام REST API
  try {
    // استخدام إجراء مُخصص لتنفيذ استعلام SQL مباشر
    // ملاحظة: هذا يتطلب إنشاء وظيفة SQL خاصة في Supabase
    // ويعتمد على تكوين الإذن المناسب
    
    // في حالة عدم وجود إمكانية للاستعلام المباشر، نرجع مصفوفة فارغة
    return [];
  } catch (error) {
    return [];
  }
};

/**
 * دالة مساعدة للحصول على فهارس جدول
 */
export const getTableIndexes = async (tableName: string): Promise<any[]> => {
  // محاولة استخدام get_table_indexes RPC أولاً
  try {
    const { data, error } = await supabaseAdmin.rpc('get_table_indexes', { table_name: tableName });
    
    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (rpcError) {
  }
  
  // محاولة استخدام query_tables كبديل
  try {
    return await executeRawQuery(`
      SELECT 
        c2.relname as index_name,
        pg_get_indexdef(i.indexrelid) as index_def,
        i.indisunique as is_unique
      FROM 
        pg_index i
      JOIN 
        pg_class c ON i.indrelid = c.oid
      JOIN 
        pg_class c2 ON i.indexrelid = c2.oid
      JOIN 
        pg_namespace n ON c.relnamespace = n.oid
      WHERE 
        n.nspname = 'public' AND
        c.relname = '${tableName}' AND
        c2.relname NOT LIKE '%_pkey'
    `);
  } catch (error) {
    return [];
  }
};

/**
 * دالة مساعدة للحصول على أعمدة جدول
 */
export const getTableColumns = async (tableName: string): Promise<any[]> => {
  // محاولة استخدام get_table_columns RPC أولاً
  try {
    const { data, error } = await supabaseAdmin.rpc('get_table_columns', { p_table_name: tableName });
    
    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (rpcError) {
  }
  
  // محاولة استخدام المخطط المعلوماتي كبديل
  try {
    const { data, error } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, character_maximum_length, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position', { ascending: true });
    
    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (directError) {
  }
  
  // محاولة استخدام query_tables كبديل أخير
  try {
    return await executeRawQuery(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM 
        information_schema.columns
      WHERE 
        table_schema = 'public' AND
        table_name = '${tableName}'
      ORDER BY 
        ordinal_position
    `);
  } catch (error) {
    return [];
  }
};
