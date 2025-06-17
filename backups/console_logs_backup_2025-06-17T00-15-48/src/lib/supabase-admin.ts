import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

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
 */
export const getSupabaseAdmin = () => {
  // فحص إضافي للتأكد من عدم وجود عميل مسؤول عالمي
  if ((window as any).__BAZAAR_ADMIN_CLIENT_CREATED__) {
    console.warn('⚠️ Admin client already exists globally');
    return (window as any).__BAZAAR_ADMIN_CLIENT__;
  }

  if (!supabaseAdminInstance && !adminInstanceInitialized) {
    adminInstanceInitialized = true; // وضع علامة على أن التهيئة قيد التنفيذ
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables for admin client');
      adminInstanceInitialized = false; // إعادة تعيين العلامة في حالة الفشل
      return null;
    }
    
    try {
      console.log('🔧 Creating Supabase Admin client with enhanced isolation...');
      
      // إنشاء اتصال Supabase باستخدام مفتاح الخدمة لتجاوز سياسات RLS
      // استخدام إعدادات خاصة لتجنب التعارض مع عميل المستخدم العادي
      supabaseAdminInstance = createClient<Database>(
        supabaseUrl, 
        supabaseServiceKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            // إعدادات محددة لتجنب تعارضات المصادقة
            detectSessionInUrl: false,
            // استخدام مفتاح تخزين مختلف تمامًا مع عشوائية إضافية
            storageKey: `bazaar-admin-isolated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            // عدم استخدام التخزين المستمر للجلسة نهائياً - storage خالي تماماً
            storage: {
              getItem: () => Promise.resolve(null),
              setItem: () => Promise.resolve(),
              removeItem: () => Promise.resolve()
            },
            // تعطيل كامل لـ GoTrueClient functionality
            flowType: undefined as any,
            debug: false
          },
          global: {
            headers: {
              'X-Client-Info': 'bazaar-admin-client-isolated',
              'X-Admin-Client': 'true',
              'X-Instance-Id': Date.now().toString(),
              'X-No-Auth': 'true' // إشارة لعدم استخدام المصادقة
            }
          },
          // إعدادات إضافية لمنع التداخل
          realtime: {
            params: {
              eventsPerSecond: 0 // تعطيل realtime تماماً للعميل المسؤول
            }
          }
        }
      );

      // وضع علامة عالمية لمنع إنشاء عملاء إضافيين
      (window as any).__BAZAAR_ADMIN_CLIENT_CREATED__ = true;
      (window as any).__BAZAAR_ADMIN_CLIENT__ = supabaseAdminInstance;
      (supabaseAdminInstance as any).__BAZAAR_ADMIN_CLIENT__ = true;
      
      console.log('✅ Supabase Admin client created successfully with isolation');
    } catch (error) {
      console.error('❌ Failed to create Supabase Admin client:', error);
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
  console.log('🧹 Cleaning up Supabase Admin client...');
  supabaseAdminInstance = null;
  adminInstanceInitialized = false;
  (window as any).__BAZAAR_ADMIN_CLIENT_CREATED__ = false;
  (window as any).__BAZAAR_ADMIN_CLIENT__ = null;
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
