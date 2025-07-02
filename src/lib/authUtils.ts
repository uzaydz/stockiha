/**
 * مساعدات المصادقة المحسنة - منع الاستدعاءات المتكررة
 */

import { supabase } from '@/lib/supabase';

// Cache للمستخدم الحالي مع انتهاء صلاحية
let currentUserCache: {
  user: any;
  timestamp: number;
  promise?: Promise<any>;
} | null = null;

const USER_CACHE_TTL = 30000; // 30 ثانية
const MAX_CONCURRENT_REQUESTS = 2;
let activeRequests = 0;

/**
 * جلب المستخدم الحالي مع cache ذكي
 */
export async function getCurrentUserOptimized(): Promise<{ user: any; error: any }> {
  const now = Date.now();
  
  // التحقق من cache أولاً
  if (currentUserCache && (now - currentUserCache.timestamp) < USER_CACHE_TTL) {
    return { user: currentUserCache.user, error: null };
  }
  
  // التحقق من وجود طلب جاري
  if (currentUserCache?.promise) {
    try {
      const result = await currentUserCache.promise;
      return result;
    } catch (error) {
      // في حالة فشل الطلب، محاولة جديدة
      currentUserCache = null;
    }
  }
  
  // منع الطلبات المتزامنة الزائدة
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    console.warn('🚦 [Auth] تجاهل طلب جلب المستخدم - عدد كبير من الطلبات النشطة');
    return { user: currentUserCache?.user || null, error: null };
  }
  
  // إنشاء طلب جديد
  activeRequests++;
  const userPromise = (async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // تحديث cache
      currentUserCache = {
        user,
        timestamp: now,
        promise: undefined
      };
      
      return { user, error };
    } catch (error) {
      console.error('❌ [Auth] خطأ في جلب المستخدم:', error);
      return { user: null, error };
    } finally {
      activeRequests--;
    }
  })();
  
  // حفظ Promise في cache
  if (currentUserCache) {
    currentUserCache.promise = userPromise;
  } else {
    currentUserCache = {
      user: null,
      timestamp: now,
      promise: userPromise
    };
  }
  
  return await userPromise;
}

/**
 * مسح cache المستخدم (يستخدم عند تسجيل الخروج أو تغيير المستخدم)
 */
export function clearUserCache(): void {
  currentUserCache = null;
  activeRequests = 0;
}

/**
 * جلب جلسة المستخدم مع تحسينات
 */
let sessionCache: {
  session: any;
  timestamp: number;
  promise?: Promise<any>;
} | null = null;

const SESSION_CACHE_TTL = 60000; // دقيقة واحدة

export async function getCurrentSessionOptimized(): Promise<{ session: any; error: any }> {
  const now = Date.now();
  
  // التحقق من cache أولاً
  if (sessionCache && (now - sessionCache.timestamp) < SESSION_CACHE_TTL) {
    return { session: sessionCache.session, error: null };
  }
  
  // التحقق من وجود طلب جاري
  if (sessionCache?.promise) {
    try {
      const result = await sessionCache.promise;
      return result;
    } catch (error) {
      sessionCache = null;
    }
  }
  
  // إنشاء طلب جديد
  const sessionPromise = (async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // تحديث cache
      sessionCache = {
        session,
        timestamp: now,
        promise: undefined
      };
      
      return { session, error };
    } catch (error) {
      console.error('❌ [Auth] خطأ في جلب الجلسة:', error);
      return { session: null, error };
    }
  })();
  
  // حفظ Promise في cache
  if (sessionCache) {
    sessionCache.promise = sessionPromise;
  } else {
    sessionCache = {
      session: null,
      timestamp: now,
      promise: sessionPromise
    };
  }
  
  return await sessionPromise;
}

/**
 * مسح cache الجلسة
 */
export function clearSessionCache(): void {
  sessionCache = null;
}

/**
 * تنظيف جميع caches المصادقة
 */
export function clearAllAuthCaches(): void {
  clearUserCache();
  clearSessionCache();
}

/**
 * إعداد مستمعات تغييرات المصادقة لتنظيف cache تلقائياً
 */
export function setupAuthCacheListeners(): void {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      clearAllAuthCaches();
    }
  });
} 