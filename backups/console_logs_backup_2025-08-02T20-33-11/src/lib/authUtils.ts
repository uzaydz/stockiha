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

const USER_CACHE_TTL = 5 * 60 * 1000; // 5 دقائق بدلاً من 30 ثانية
const MAX_CONCURRENT_REQUESTS = 1; // تقليل الطلبات المتزامنة
let activeRequests = 0;

// إضافة كاش في sessionStorage لمنع الاستدعاءات المتكررة عند تحديث الصفحة
const SESSION_CACHE_KEY = 'auth_user_cache';
const SESSION_CACHE_TTL = 10 * 60 * 1000; // 10 دقائق

/**
 * جلب المستخدم الحالي مع cache ذكي محسن
 */
export async function getCurrentUserOptimized(): Promise<{ user: any; error: any }> {
  const now = Date.now();
  
  // التحقق من sessionStorage أولاً (يبقى بعد تحديث الصفحة)
  const sessionCached = getFromSessionStorage();
  if (sessionCached && (now - sessionCached.timestamp) < SESSION_CACHE_TTL) {
    return { user: sessionCached.user, error: null };
  }
  
  // التحقق من cache الذاكرة
  if (currentUserCache && (now - currentUserCache.timestamp) < USER_CACHE_TTL) {
    // حفظ في sessionStorage أيضاً
    saveToSessionStorage(currentUserCache.user, now);
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
    return { user: currentUserCache?.user || null, error: null };
  }
  
  // إنشاء طلب جديد
  activeRequests++;
  const userPromise = (async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // حفظ في كاش الذاكرة
      currentUserCache = {
        user,
        timestamp: now,
        promise: undefined
      };
      
      // حفظ في sessionStorage
      saveToSessionStorage(user, now);
      
      return { user, error };
    } catch (error) {
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
 * الحصول من sessionStorage
 */
function getFromSessionStorage(): { user: any; timestamp: number } | null {
  try {
    const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.timestamp && parsed.user) {
        return parsed;
      }
    }
  } catch (error) {
    // تجاهل أخطاء sessionStorage
  }
  return null;
}

/**
 * حفظ في sessionStorage
 */
function saveToSessionStorage(user: any, timestamp: number): void {
  try {
    const cacheData = {
      user,
      timestamp
    };
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    // تجاهل أخطاء sessionStorage
  }
}

/**
 * مسح cache المستخدم (يستخدم عند تسجيل الخروج أو تغيير المستخدم)
 */
export function clearUserCache(): void {
  currentUserCache = null;
  activeRequests = 0;
  try {
    sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch (error) {
    // تجاهل أخطاء sessionStorage
  }
}

/**
 * الحصول على المستخدم مع cache محسن للجلسة الحالية
 */
export async function getCurrentUserWithSessionCache(): Promise<{ user: any; error: any }> {
  const now = Date.now();
  
  // التحقق من sessionStorage أولاً
  const sessionCached = getFromSessionStorage();
  if (sessionCached && (now - sessionCached.timestamp) < SESSION_CACHE_TTL) {
    return { user: sessionCached.user, error: null };
  }
  
  // التحقق من cache الذاكرة
  if (currentUserCache && (now - currentUserCache.timestamp) < USER_CACHE_TTL) {
    saveToSessionStorage(currentUserCache.user, now);
    return { user: currentUserCache.user, error: null };
  }
  
  // التحقق من وجود طلب جاري
  if (currentUserCache?.promise) {
    try {
      const result = await currentUserCache.promise;
      return result;
    } catch (error) {
      currentUserCache = null;
    }
  }
  
  // منع الطلبات المتزامنة الزائدة
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return { user: currentUserCache?.user || null, error: null };
  }
  
  // إنشاء طلب جديد
  activeRequests++;
  const userPromise = (async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // حفظ في كاش الذاكرة
      currentUserCache = {
        user,
        timestamp: now,
        promise: undefined
      };
      
      // حفظ في sessionStorage
      saveToSessionStorage(user, now);
      
      return { user, error };
    } catch (error) {
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
