import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// نوع البيانات المخزنة في الـ cache
interface AuthCacheData {
  user: User | null;
  session: Session | null;
  timestamp: number;
  promise?: Promise<any>;
}

// مدة صلاحية الـ cache (5 دقائق)
const CACHE_DURATION = 5 * 60 * 1000;

// الـ cache العام للمصادقة
let authCache: AuthCacheData | null = null;

// Promise deduplication للطلبات المتزامنة
let pendingAuthRequest: Promise<AuthCacheData> | null = null;

/**
 * تنظيف الـ cache
 */
export const clearAuthCache = (): void => {
  console.log('🧹 تنظيف cache المصادقة');
  authCache = null;
  pendingAuthRequest = null;
};

/**
 * التحقق من صلاحية الـ cache
 */
const isCacheValid = (cache: AuthCacheData | null): boolean => {
  if (!cache) return false;
  const now = Date.now();
  const isValid = (now - cache.timestamp) < CACHE_DURATION;
  
  if (!isValid) {
    console.log('⏰ انتهت صلاحية cache المصادقة');
  }
  
  return isValid;
};

/**
 * الحصول على بيانات المصادقة مع cache ذكي
 */
export const getCachedAuth = async (): Promise<{ user: User | null; session: Session | null }> => {
  // التحقق من الـ cache أولاً
  if (isCacheValid(authCache)) {
    console.log('⚡ استخدام cache المصادقة');
    return {
      user: authCache!.user,
      session: authCache!.session
    };
  }

  // إذا كان هناك طلب جاري، انتظره
  if (pendingAuthRequest) {
    console.log('⏳ انتظار طلب المصادقة الجاري...');
    const result = await pendingAuthRequest;
    return {
      user: result.user,
      session: result.session
    };
  }

  // إنشاء طلب جديد
  console.log('🚀 طلب مصادقة جديد');
  pendingAuthRequest = fetchAuthData();

  try {
    const result = await pendingAuthRequest;
    return {
      user: result.user,
      session: result.session
    };
  } finally {
    pendingAuthRequest = null;
  }
};

/**
 * جلب بيانات المصادقة من Supabase
 */
const fetchAuthData = async (): Promise<AuthCacheData> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ خطأ في جلب الجلسة:', error);
      throw error;
    }

    const authData: AuthCacheData = {
      user: session?.user || null,
      session: session || null,
      timestamp: Date.now()
    };

    // حفظ في الـ cache
    authCache = authData;
    
    console.log('✅ تم تحديث cache المصادقة:', {
      hasUser: !!authData.user,
      hasSession: !!authData.session,
      userId: authData.user?.id
    });

    return authData;
  } catch (error) {
    console.error('❌ فشل في جلب بيانات المصادقة:', error);
    
    // في حالة الخطأ، إرجاع بيانات فارغة
    const emptyAuthData: AuthCacheData = {
      user: null,
      session: null,
      timestamp: Date.now()
    };
    
    authCache = emptyAuthData;
    return emptyAuthData;
  }
};

/**
 * الحصول على المستخدم الحالي مع cache
 */
export const getCachedUser = async (): Promise<User | null> => {
  const { user } = await getCachedAuth();
  return user;
};

/**
 * الحصول على الجلسة الحالية مع cache
 */
export const getCachedSession = async (): Promise<Session | null> => {
  const { session } = await getCachedAuth();
  return session;
};

/**
 * تحديث الـ cache عند تغيير حالة المصادقة
 */
export const updateAuthCache = (user: User | null, session: Session | null): void => {
  console.log('🔄 تحديث cache المصادقة:', {
    hasUser: !!user,
    hasSession: !!session,
    userId: user?.id
  });
  
  authCache = {
    user,
    session,
    timestamp: Date.now()
  };
};

/**
 * إعداد مراقب تغييرات المصادقة
 */
export const setupAuthCacheListener = (): (() => void) => {
  console.log('🎧 إعداد مراقب cache المصادقة');
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log('🔔 تغيير حالة المصادقة:', event);
      
      // تحديث الـ cache عند تغيير الحالة
      updateAuthCache(session?.user || null, session || null);
      
      // تنظيف الطلبات المعلقة
      if (event === 'SIGNED_OUT') {
        clearAuthCache();
      }
    }
  );

  // إرجاع دالة التنظيف
  return () => {
    console.log('🧹 إلغاء مراقب cache المصادقة');
    subscription.unsubscribe();
  };
};

/**
 * إحصائيات الـ cache
 */
export const getAuthCacheStats = () => {
  return {
    hasCache: !!authCache,
    isValid: isCacheValid(authCache),
    age: authCache ? Date.now() - authCache.timestamp : 0,
    hasPendingRequest: !!pendingAuthRequest
  };
}; 