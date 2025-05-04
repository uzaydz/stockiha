import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { initSupabaseForElectron, isElectron } from './supabase-electron';
import localforage from 'localforage';

// These values should be stored in environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('إنشاء عميل Supabase...');
console.log('URL: ' + supabaseUrl);
console.log('ANON_KEY length: ' + supabaseAnonKey.length + ' characters');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('عدم وجود متغيرات البيئة المطلوبة لـ Supabase!');
}

// Create a single supabase client instance for interacting with the database
// Use a singleton pattern to ensure we only create one instance
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

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
          console.error('خطأ في استرجاع بيانات المصادقة:', error);
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          const data = JSON.parse(value);
          await authStore.setItem(key, data);
        } catch (error) {
          console.error('خطأ في تخزين بيانات المصادقة:', error);
        }
      },
      removeItem: async (key) => {
        try {
          await authStore.removeItem(key);
        } catch (error) {
          console.error('خطأ في حذف بيانات المصادقة:', error);
        }
      }
    },
    flowType: 'pkce' as const,
    // تجاوز الطلبات عند عدم الاتصال
    fetch: (url: RequestInfo | URL, options?: RequestInit) => {
      // تحقق من حالة الاتصال قبل إجراء الطلب
      if (!navigator.onLine) {
        // عند محاولة تحديث رمز الوصول في وضع عدم الاتصال
        if (url.toString().includes('token?grant_type=refresh_token')) {
          console.warn('تجاوز تحديث رمز الوصول في وضع عدم الاتصال');
          // إعادة استجابة وهمية بدلاً من الفشل
          return Promise.resolve(new Response(
            JSON.stringify({ error: 'offline_mode', message: 'Application is offline' }), 
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          ));
        }
        
        // التحقق من نوع الطلب الآخر
        console.warn('محاولة وصول إلى الخادم في وضع عدم الاتصال:', url);
        return Promise.reject(new Error('ERR_INTERNET_DISCONNECTED'));
      }
      
      // إذا كان المستخدم متصلاً بالإنترنت، قم بإجراء الطلب العادي
      // إضافة رؤوس إضافية للتأكد من قبول الطلب
      const headers = options?.headers || {};
      const newHeaders = new Headers(headers);
      
      // تعيين رؤوس مخصصة لتجنب أخطاء 406
      if (!newHeaders.has('Accept')) {
        newHeaders.set('Accept', 'application/json, text/plain, */*');
      }
      
      if (!newHeaders.has('Content-Type') && !url.toString().includes('storage')) {
        newHeaders.set('Content-Type', 'application/json');
      }
      
      // إضافة رأس Prefer للتحكم في إرجاع البيانات من Postgrest
      if (url.toString().includes('/rest/v1/') && !newHeaders.has('Prefer')) {
        newHeaders.set('Prefer', 'return=representation');
      }
      
      const newOptions = {
        ...options,
        headers: newHeaders
      };
      
      return fetch(url, newOptions);
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'bazaar-console-connect',
      'Accept': 'application/json, text/plain, */*',
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

// إنشاء عميل Supabase واحد للاستخدام في جميع أنحاء التطبيق
export const getSupabaseClient = () => {
  console.log('جلب عميل Supabase...');
  
  // تهيئة إعدادات Electron لـ Supabase إذا لزم الأمر
  if (isElectron()) {
    initSupabaseForElectron();
  }
  
  if (!supabaseInstance) {
    console.log('Creando nueva instancia de Supabase client');
    
    try {
      // إنشاء عميل Supabase
      supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, options);
      
      // إضافة مستمع لأحداث المصادقة لرصد المشاكل
      supabaseInstance.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          console.log('Usuario desconectado de Supabase');
        } else if (event === 'SIGNED_IN') {
          console.log('Usuario conectado a Supabase');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token de Supabase actualizado');
        } else if (event === 'USER_UPDATED') {
          console.log('Datos de usuario actualizados en Supabase');
        }
      });
    } catch (error) {
      console.error('Error al crear el cliente Supabase:', error);
      throw error;
    }
  }
  
  return supabaseInstance;
};

// للتوافق مع الكود السابق
export const supabase = getSupabaseClient();
console.log('تم إنشاء عميل Supabase بنجاح');

// إضافة مستمع لحالة الاتصال بالإنترنت
if (typeof window !== 'undefined') {
  // عند استعادة الاتصال
  window.addEventListener('online', () => {
    console.log('تم استعادة الاتصال بالإنترنت، جاري مزامنة البيانات...');
    // يمكن هنا استدعاء وظائف المزامنة للبيانات المحلية مع السيرفر
  });
  
  // عند فقدان الاتصال
  window.addEventListener('offline', () => {
    console.log('تم فقدان الاتصال بالإنترنت، تحويل إلى وضع العمل المحلي...');
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
    
    // إذا كان المستخدم متصلاً، استخدم الطريقة المعتادة
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('خطأ في التحقق من حالة المصادقة:', error);
      return { isAuthenticated: false, isOffline: false, session: null };
    }
    
    return {
      isAuthenticated: !!data.session,
      isOffline: false,
      session: data.session
    };
  } catch (error) {
    console.error('خطأ غير متوقع في التحقق من حالة المصادقة:', error);
    return { isAuthenticated: false, isOffline: true, session: null };
  }
}; 