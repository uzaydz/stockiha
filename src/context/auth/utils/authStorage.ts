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
import {
  saveSecureSession,
  clearSecureSession,
  clearSecureSessionKeepOffline,
  hasStoredSecureSession,
  getSecureSessionMeta
} from './secureSessionStorage';

import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// ⚡ استيراد دوال المزامنة لـ PowerSync
const syncAuthToPowerSync = async (
  organizationId: string,
  authUserId: string,
  userData: { email?: string; name?: string; role?: string; user_metadata?: any; app_metadata?: any }
) => {
  try {
    // ⚡ استخدام PowerSync mutate API
    // ملاحظة: جدول employees غير موجود في PowerSync Schema
    // البيانات تُزامن تلقائياً عبر pos_staff_sessions

    if (!powerSyncService.db) {
      console.warn('[authStorage] PowerSync DB not initialized');
      return;
    }

    // ⚡ PowerSync يدير المزامنة تلقائياً عبر Sync Rules
    // لا حاجة لمزامنة يدوية - البيانات تُحفظ في pos_staff_sessions عبر PowerSync
    console.log('[authStorage] ℹ️ Auth data synced automatically via PowerSync');

  } catch (error: any) {
    // تجاهل الأخطاء - المزامنة اختيارية
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AuthStorage] PowerSync sync skipped:', error);
    }
  }
};

const OFFLINE_SNAPSHOT_KEY = 'bazaar_offline_auth_snapshot_v1';

export interface OfflineAuthSnapshot {
  user: Partial<SupabaseUser> | null;
  sessionMeta: {
    expiresAt: number | null;
    storedAt: number;
  } | null;
  organizationId?: string | null;
  lastUpdatedAt: number;
}

export const saveOfflineAuthSnapshot = (session: Session | null, user: SupabaseUser | null): void => {
  if (typeof window === 'undefined' || !user) return;

  try {
    const snapshot: OfflineAuthSnapshot = {
      user: user
        ? {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
          role: user.role,
          aud: user.aud,
          phone: (user as any).phone ?? null,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
        : null,
      sessionMeta: session
        ? {
          expiresAt: session.expires_at ?? null,
          storedAt: Date.now()
        }
        : null,
      organizationId: localStorage.getItem('bazaar_organization_id'),
      lastUpdatedAt: Date.now()
    };

    localStorage.setItem(OFFLINE_SNAPSHOT_KEY, JSON.stringify(snapshot));

    // Also save a secure marker for offline login validation
    if (user.email) {
      localStorage.setItem('bazaar_offline_login_email', user.email);
    }

    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('[AuthStorage] saved offline snapshot', {
          hasUser: Boolean(snapshot.user),
          organizationId: snapshot.organizationId
        });
      } catch { }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AuthStorage] saveOfflineAuthSnapshot error', error);
    }
  }
};

export const loadOfflineAuthSnapshot = (): OfflineAuthSnapshot | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(OFFLINE_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineAuthSnapshot;

    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('[AuthStorage] loaded offline snapshot', {
          hasUser: Boolean(parsed?.user),
          hasSessionMeta: Boolean(parsed?.sessionMeta),
          organizationId: parsed?.organizationId
        });
      } catch { }
    }

    return parsed;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AuthStorage] loadOfflineAuthSnapshot error', error);
    }
    return null;
  }
};

export const clearOfflineAuthSnapshot = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(OFFLINE_SNAPSHOT_KEY);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AuthStorage] clearOfflineAuthSnapshot error', error);
    }
  }
};

/**
 * حفظ بيانات المصادقة مع تحسين الأداء
 */
export const saveAuthToStorage = (session: Session | null, user: SupabaseUser | null): void => {
  try {
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('[AuthStorage] saving auth to storage', {
          hasSession: Boolean(session),
          hasUser: Boolean(user),
          userId: user?.id,
          sessionExpiresAt: session?.expires_at
        });
      } catch {
        // ignore logging errors
      }
    }

    const isOfflineOnlyToken = Boolean(
      session &&
      (session.access_token === 'offline_token' ||
        session.refresh_token === 'offline_refresh_token' ||
        String(session.refresh_token || '').startsWith('offline-refresh-'))
    );

    if (session && user) {
      // 🔒 مسح علامة explicit logout عند حفظ session ناجح
      try {
        localStorage.removeItem('bazaar_explicit_logout');
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthStorage] ✅ تم مسح علامة explicit logout');
        }
      } catch (error) {
        // تجاهل الأخطاء
      }

      // ✅ لا تكتب فوق جلسة Supabase الحقيقية بـ "جلسة أوفلاين" وهمية
      // هذا يمنع فقدان refresh_token الحقيقي وبالتالي يمنع الحاجة لتسجيل الدخول كل مرة.
      if (!isOfflineOnlyToken) {
        void saveSecureSession(session).catch((error) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('[AuthStorage] فشل حفظ جلسة الأوفلاين الآمنة:', error);
          }
        });
      }
      saveOfflineAuthSnapshot(session, user);

      // 🔄 مزامنة بيانات المصادقة إلى SQLite في Tauri
      const orgId = localStorage.getItem('bazaar_organization_id') || localStorage.getItem('currentOrganizationId') || '';
      if (orgId && user.id) {
        // حفظ user_id لاستخدامه لاحقاً في المزامنة
        localStorage.setItem('auth_user_id', user.id);

        void syncAuthToPowerSync(orgId, user.id, {
          email: user.email,
          name: (user.user_metadata as any)?.name || user.email,
          role: (user.user_metadata as any)?.role || 'authenticated',
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata
        }).catch(() => undefined);
      }
    } else {
      void clearSecureSession().catch(() => undefined);
    }

    const authData: StoredAuthData = {
      session: null,
      user,
      hasSecureSession: Boolean(session && user),
      sessionMeta: session && user
        ? {
          userId: session.user?.id ?? user.id ?? null,
          expiresAt: session.expires_at ?? null,
          storedAt: Date.now()
        }
        : null
    };

    const serialized = JSON.stringify(authData);

    // حفظ متزامن لضمان توفر البيانات حتى مع إعادة التحميل الفوري
    localStorage.setItem(STORAGE_KEYS.AUTH_STATE, serialized);

    // إعادة الكتابة لاحقاً كنسخة احتياطية (للتوافق مع السلوك السابق)
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        localStorage.setItem(STORAGE_KEYS.AUTH_STATE, serialized);
      });
    } else {
      setTimeout(() => {
        localStorage.setItem(STORAGE_KEYS.AUTH_STATE, serialized);
      }, 0);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AuthStorage] saveAuthToStorage error', error);
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
      const parsed = JSON.parse(stored) as StoredAuthData;
      if (process.env.NODE_ENV === 'development') {
        try {
          console.log('[AuthStorage] loaded auth state', {
            hasStoredUser: Boolean(parsed?.user),
            hasStoredSession: Boolean(parsed?.session),
            hasSecureFlag: parsed?.hasSecureSession,
            sessionMeta: parsed?.sessionMeta
          });
        } catch { }
      }

      if (parsed?.session && !hasStoredSecureSession()) {
        void saveSecureSession(parsed.session).catch(() => undefined);
      }

      return {
        session: null,
        user: parsed?.user ?? null,
        hasSecureSession: parsed?.hasSecureSession ?? hasStoredSecureSession(),
        sessionMeta: parsed?.sessionMeta ?? getSecureSessionMeta()
      };
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AuthStorage] loadAuthFromStorage error', error);
    }
  }

  return {
    session: null,
    user: null,
    hasSecureSession: hasStoredSecureSession(),
    sessionMeta: getSecureSessionMeta()
  };
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

    // مسح بيانات الأوفلاين السابقة
    localStorage.removeItem(OFFLINE_SNAPSHOT_KEY);

    // ⚡ مسح بيانات POS عند تسجيل الخروج
    clearPOSLocalStorage();

    if (process.env.NODE_ENV === 'development') {
      console.log('[AuthStorage] تم مسح جميع البيانات بما في ذلك بيانات POS');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AuthStorage] خطأ في مسح البيانات:', error);
    }
  }

  void clearSecureSession().catch(() => undefined);
};

/**
 * ⚡ مسح بيانات نقطة البيع من localStorage
 * يُستدعى عند تسجيل الخروج لتنظيف السلة والبيانات المؤقتة
 */
export const clearPOSLocalStorage = (): void => {
  try {
    // مسح بيانات السلة والتبويبات
    localStorage.removeItem('pos_cart_tabs');
    localStorage.removeItem('pos_active_tab_id');
    localStorage.removeItem('pos_return_items');

    // مسح cache المنتجات
    localStorage.removeItem('pos_products_cache');
    localStorage.removeItem('pos_categories_cache');

    // مسح بيانات الباركود
    localStorage.removeItem('last_scanned_barcode');

    // مسح إحصائيات المزامنة
    localStorage.removeItem('discarded_operations');
    localStorage.removeItem('skipped_gaps');

    // مسح أي بيانات POS أخرى
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('pos_') ||
        key.startsWith('cart_') ||
        key.startsWith('bazaar_pos_')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (process.env.NODE_ENV === 'development') {
      console.log('[AuthStorage] ✅ تم مسح بيانات POS:', keysToRemove.length, 'مفاتيح');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AuthStorage] خطأ في مسح بيانات POS:', error);
    }
  }
};

/**
 * مسح بيانات المصادقة مع الاحتفاظ ببيانات تسجيل الدخول الأوفلاين
 */
export const clearAuthStorageKeepOfflineCredentials = (): void => {
  try {
    // مسح البيانات الأساسية
    localStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);

    // مسح بيانات الجلسة
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_CACHE);
    sessionStorage.removeItem(STORAGE_KEYS.LAST_LOGIN_REDIRECT);
    sessionStorage.removeItem(STORAGE_KEYS.LOGIN_REDIRECT_COUNT);

    // الاحتفاظ ببيانات الأوفلاين السابقة - لا نمسحها!
    // localStorage.removeItem(OFFLINE_SNAPSHOT_KEY); // تعليق هذا السطر
    // تأكد من عدم مسح بيانات الأوفلاين السابقة

    // الاحتفاظ ببيانات تسجيل الدخول الأوفلاين (OFFLINE_CREDENTIALS_KEY)
    // هذه البيانات تُحفظ في LoginForm.tsx ولا نمسحها هنا

    // 🚨 إصلاح مهم: الاحتفاظ بجميع بيانات الأوفلاين
    // لا نمسح أي من البيانات التالية:
    // - OFFLINE_SNAPSHOT_KEY (بيانات المستخدم المحفوظة للأوفلاين)
    // - OFFLINE_CREDENTIALS_KEY (بيانات تسجيل الدخول المحفوظة)
    // - secure_offline_session_v1 (الجلسة الآمنة للأوفلاين)
    // - secure_offline_session_meta_v1 (معلومات الجلسة الآمنة)

    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('[AuthStorage] cleared auth data but kept offline credentials and snapshot');
      } catch { }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AuthStorage] clearAuthStorageKeepOfflineCredentials error', error);
    }
  }

  // مسح الجلسة الآمنة مع الاحتفاظ ببيانات الأوفلاين
  void clearSecureSessionKeepOffline().catch(() => undefined);
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
