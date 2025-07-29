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

// حفظ مرجع للدالة الأصلية قبل تعديلها بواسطة authInterceptor
const originalGetSession = supabase.auth.getSession.bind(supabase.auth);

/**
 * تنظيف الـ cache
 */
export const clearAuthCache = (): void => {
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
  }
  
  return isValid;
};

/**
 * الحصول على بيانات المصادقة مع cache ذكي
 */
export const getCachedAuth = async (): Promise<{ user: User | null; session: Session | null }> => {
  
  // التحقق من صلاحية الـ cache أولاً
  if (isCacheValid(authCache)) {
    return {
      user: authCache!.user,
      session: authCache!.session
    };
  }

  // التحقق من وجود طلب جاري
  if (pendingAuthRequest) {
    const result = await pendingAuthRequest;
    return {
      user: result.user,
      session: result.session
    };
  }

  // إنشاء طلب جديد مع deduplication
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
    const { data: { session }, error } = await originalGetSession();
    
    if (error) {
      throw error;
    }

    const authData: AuthCacheData = {
      user: session?.user || null,
      session: session || null,
      timestamp: Date.now()
    };

    // حفظ في الـ cache
    authCache = authData;

    return authData;
  } catch (error) {
    
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
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      
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
