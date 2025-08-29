/**
 * أدوات التخزين المحلي لـ Auth
 * منفصل ومحسن للأداء
 */

import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { 
  StoredAuthData, 
  StoredUserData, 
  UserProfile, 
  Organization,
  SessionCacheItem,
  UserCacheItem
} from '../types';
import { STORAGE_KEYS, AUTH_TIMEOUTS } from '../constants/authConstants';

/**
 * حفظ بيانات المصادقة مع تحسين الأداء
 */
export const saveAuthToStorage = (session: Session | null, user: SupabaseUser | null): void => {
  try {
    const authData: StoredAuthData = { session, user };
    
    // استخدام requestIdleCallback لتجنب حجب الواجهة
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        localStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(authData));
      });
    } else {
      // fallback للمتصفحات القديمة
      setTimeout(() => {
        localStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify(authData));
      }, 0);
    }
    
    if (process.env.NODE_ENV === 'development') {
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
  }
};

/**
 * تحميل بيانات المصادقة
 */
export const loadAuthFromStorage = (): StoredAuthData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed as StoredAuthData;
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
  }
  
  return { session: null, user: null };
};

/**
 * مسح بيانات المصادقة
 */
export const clearAuthStorage = (): void => {
  try {
    // مسح البيانات الأساسية
    localStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    
    // مسح بيانات الجلسة
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_CACHE);
    sessionStorage.removeItem(STORAGE_KEYS.LAST_LOGIN_REDIRECT);
    sessionStorage.removeItem(STORAGE_KEYS.LOGIN_REDIRECT_COUNT);
    
    if (process.env.NODE_ENV === 'development') {
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
  }
};

/**
 * حفظ بيانات المستخدم
 */
export const saveUserDataToStorage = (
  userProfile: UserProfile | null, 
  organization: Organization | null,
  organizationId?: string | null
): void => {
  try {
    if (userProfile) {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE_PREFIX.replace('_', ''), JSON.stringify(userProfile));
      
      // حفظ في cache مع timestamp
      const cacheKey = `${STORAGE_KEYS.USER_DATA_CACHE}${userProfile.id}`;
      const cacheData = {
        data: userProfile,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    }
    
    if (organization) {
      localStorage.setItem(STORAGE_KEYS.ORGANIZATION_PREFIX.replace('_', ''), JSON.stringify(organization));
      
      // حفظ في cache مع timestamp
      const orgCacheKey = `${STORAGE_KEYS.ORGANIZATION_CACHE}${organization.id}`;
      const orgCacheData = {
        data: organization,
        timestamp: Date.now()
      };
      localStorage.setItem(orgCacheKey, JSON.stringify(orgCacheData));
    }
    
    if (organizationId) {
      localStorage.setItem('bazaar_organization_id', organizationId);
    }
    
    if (process.env.NODE_ENV === 'development') {
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
  }
};

/**
 * تحميل بيانات المستخدم
 */
export const loadUserDataFromStorage = (): StoredUserData => {
  try {
    const userProfileStored = localStorage.getItem(STORAGE_KEYS.USER_PROFILE_PREFIX.replace('_', ''));
    const organizationStored = localStorage.getItem(STORAGE_KEYS.ORGANIZATION_PREFIX.replace('_', ''));
    
    const userProfile = userProfileStored ? JSON.parse(userProfileStored) : null;
    const organization = organizationStored ? JSON.parse(organizationStored) : null;
    
    return { userProfile, organization };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
    return { userProfile: null, organization: null };
  }
};

/**
 * حفظ cache الجلسة
 */
export const saveSessionCache = (user: SupabaseUser | null): void => {
  try {
    const cacheData: SessionCacheItem = {
      user,
      timestamp: Date.now()
    };
    sessionStorage.setItem(STORAGE_KEYS.SESSION_CACHE, JSON.stringify(cacheData));
  } catch (error) {
    // تجاهل أخطاء sessionStorage
  }
};

/**
 * تحميل cache الجلسة
 */
export const loadSessionCache = (): SupabaseUser | null => {
  try {
    const cached = sessionStorage.getItem(STORAGE_KEYS.SESSION_CACHE);
    if (cached) {
      const parsed: SessionCacheItem = JSON.parse(cached);
      const now = Date.now();
      
      if ((now - parsed.timestamp) < AUTH_TIMEOUTS.SESSION_CACHE_DURATION) {
        return parsed.user;
      }
    }
  } catch (error) {
    // تجاهل أخطاء sessionStorage
  }
  
  return null;
};

/**
 * حفظ cache المستخدم
 */
export const saveUserCache = (user: SupabaseUser | null): UserCacheItem => {
  const cacheData: UserCacheItem = {
    user,
    timestamp: Date.now()
  };
  
  // حفظ في sessionStorage أيضاً
  saveSessionCache(user);
  
  return cacheData;
};

/**
 * التحقق من صحة cache المستخدم
 */
export const isValidUserCache = (cache: UserCacheItem | null): boolean => {
  if (!cache) return false;
  
  const now = Date.now();
  return (now - cache.timestamp) < AUTH_TIMEOUTS.USER_CACHE_DURATION;
};

/**
 * التحقق من صحة البيانات المخزنة
 */
export const validateStoredData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  
  // التحقق من وجود الحقول الأساسية
  if (data.session && (!data.session.access_token || !data.session.user)) {
    return false;
  }
  
  if (data.user && !data.user.id) {
    return false;
  }
  
  return true;
};

/**
 * تنظيف cache منتهي الصلاحية
 */
export const cleanExpiredCache = (): void => {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    // فحص localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith(STORAGE_KEYS.USER_DATA_CACHE) ||
        key.startsWith(STORAGE_KEYS.ORGANIZATION_CACHE)
      )) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.timestamp && (now - parsed.timestamp) > AUTH_TIMEOUTS.PROFILE_CACHE_DURATION) {
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          // إذا كان هناك خطأ في parsing، احذف المفتاح
          keysToRemove.push(key);
        }
      }
    }
    
    // حذف المفاتيح منتهية الصلاحية
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (process.env.NODE_ENV === 'development' && keysToRemove.length > 0) {
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
  }
};

/**
 * الحصول على إحصائيات التخزين
 */
export const getStorageStats = () => {
  try {
    let authDataSize = 0;
    let userDataSize = 0;
    let cacheSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        const size = value.length;
        
        if (key.startsWith('bazaar_auth') || key.startsWith('auth_')) {
          authDataSize += size;
        } else if (key.startsWith('user_') || key.startsWith('current_user')) {
          userDataSize += size;
        } else if (key.includes('cache')) {
          cacheSize += size;
        }
      }
    }
    
    return {
      authDataSize,
      userDataSize,
      cacheSize,
      totalSize: authDataSize + userDataSize + cacheSize
    };
  } catch (error) {
    return {
      authDataSize: 0,
      userDataSize: 0,
      cacheSize: 0,
      totalSize: 0
    };
  }
};
