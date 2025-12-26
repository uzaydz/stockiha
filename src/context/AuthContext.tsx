/**
 * AuthContext المحسن - مبسط ومقسم
 * يستخدم المكونات المنفصلة لتحسين الأداء بشكل كبير
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef
} from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

import { setCurrentOrganizationId } from '@/lib/requestInterceptor';

// استيراد الأنواع والمكونات المنفصلة
import type {
  AuthContextType,
  AuthState,
  UserProfile,
  Organization,
  AuthResult
} from './auth/types';

// استيراد الخدمات
import { authService } from './auth/services/authService';
import { sessionManager } from './auth/services/sessionManager';
import { userDataManager } from './auth/services/userDataManager';
import { subdomainService } from './auth/services/subdomainService';

// استيراد الـ Hooks
import { useAuthSession } from './auth/hooks/useAuthSession';
import { authSingleton } from '@/lib/authSingleton';
import { useUserProfile } from './auth/hooks/useUserProfile';
import { useUserOrganization } from './auth/hooks/useUserOrganization';

// استيراد المساعدات
import {
  loadAuthFromStorage,
  loadUserDataFromStorage,
  saveAuthToStorage,
  cleanExpiredCache
} from './auth/utils/authStorage';

// استيراد محرك المزامنة Delta-Based
// import { deltaSyncEngine } from '@/lib/sync/delta'; // Removed in favor of SyncManager
import { loadSecureSession, hasStoredSecureSession, saveSecureSession } from './auth/utils/secureSessionStorage';
import {
  compareAuthData,
  debounce
} from './auth/utils/authHelpers';
import { AUTH_TIMEOUTS } from './auth/constants/authConstants';
import { throttledLog } from '@/lib/utils/duplicateLogger';
import { sessionMonitor, getCurrentSession } from '@/lib/session-monitor';
import { trackPerformance } from '@/lib/performance';
import { dispatchAppEvent, addAppEventListener } from '@/lib/events/eventManager';

import { isAppOnline } from '@/utils/networkStatus';

// ⚡ Cache محسن للجلسة - مع تنظيف تلقائي لمنع تسرب الذاكرة
const sessionCache = new Map<string, { session: Session; timestamp: number }>();
const userCache = new Map<string, { user: SupabaseUser; timestamp: number }>();
const SESSION_CACHE_DURATION = 5 * 60 * 1000; // ⚡ 5 دقائق (كان 10)
const USER_CACHE_DURATION = 5 * 60 * 1000; // ⚡ 5 دقائق (كان 15)
const MAX_CACHE_ENTRIES = 3; // ⚡ حد أقصى للمدخلات

const isOfflineOnlySession = (session: Session | null): boolean => {
  if (!session) return false;
  const refreshToken = String((session as any).refresh_token || '');
  return (
    session.access_token === 'offline_token' ||
    refreshToken === 'offline_refresh_token' ||
    refreshToken.startsWith('offline-refresh-')
  );
};

// ⚡ دالة تنظيف الكاش لمنع تسرب الذاكرة
const pruneAuthCaches = () => {
  const now = Date.now();

  // تنظيف sessionCache
  for (const [key, value] of sessionCache.entries()) {
    if (now - value.timestamp > SESSION_CACHE_DURATION) {
      sessionCache.delete(key);
    }
  }
  if (sessionCache.size > MAX_CACHE_ENTRIES) {
    const oldest = [...sessionCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) sessionCache.delete(oldest[0]);
  }

  // تنظيف userCache
  for (const [key, value] of userCache.entries()) {
    if (now - value.timestamp > USER_CACHE_DURATION) {
      userCache.delete(key);
    }
  }
  if (userCache.size > MAX_CACHE_ENTRIES) {
    const oldest = [...userCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) userCache.delete(oldest[0]);
  }
};

// ⚡ v3.1: إدارة التنظيف الدوري المحسّنة مع منع Memory Leaks
let authCacheCleanupInterval: ReturnType<typeof setInterval> | null = null;
let authBeforeUnloadHandler: (() => void) | null = null;
let isAuthCleanupInitialized = false;

/**
 * بدء التنظيف الدوري للـ Auth Cache - محسّن لمنع Memory Leaks
 */
export function startAuthCacheCleanup(): void {
  if (typeof window === 'undefined') return;

  // منع التهيئة المتكررة
  if (isAuthCleanupInitialized) return;
  isAuthCleanupInitialized = true;

  // تأكد من عدم إنشاء interval مكرر
  if (!authCacheCleanupInterval) {
    // ⚡ زيادة الفترة من 2 دقيقة إلى 5 دقائق لتقليل الحمل
    authCacheCleanupInterval = setInterval(pruneAuthCaches, 5 * 60 * 1000);
  }

  // إضافة beforeunload handler مرة واحدة فقط
  if (!authBeforeUnloadHandler) {
    authBeforeUnloadHandler = () => {
      stopAuthCacheCleanup();
    };
    window.addEventListener('beforeunload', authBeforeUnloadHandler);
  }

  // ⚡ إضافة pagehide للتنظيف في Safari/iOS
  window.addEventListener('pagehide', () => {
    stopAuthCacheCleanup();
  });

  // ⚡ إضافة visibilitychange للتنظيف عند إخفاء الصفحة
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // تنظيف خفيف عند إخفاء الصفحة
      pruneAuthCaches();
    }
  });
}

/**
 * إيقاف التنظيف الدوري وإزالة الـ listeners
 */
export function stopAuthCacheCleanup(): void {
  if (authCacheCleanupInterval) {
    clearInterval(authCacheCleanupInterval);
    authCacheCleanupInterval = null;
  }

  if (authBeforeUnloadHandler && typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', authBeforeUnloadHandler);
    authBeforeUnloadHandler = null;
  }

  // ⚡ تنظيف الـ caches
  sessionCache.clear();
  userCache.clear();

  isAuthCleanupInitialized = false;
}

// بدء التنظيف تلقائياً مع تأخير بسيط لتجنب التضارب
if (typeof window !== 'undefined') {
  // ⚡ تأخير البدء لتجنب التضارب مع تهيئة التطبيق
  setTimeout(startAuthCacheCleanup, 1000);
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  // الحالة الأساسية
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingToken, setIsProcessingToken] = useState(false);
  const [isExplicitSignOut, setIsExplicitSignOut] = useState(false);
  const [hasInitialSessionCheck, setHasInitialSessionCheck] = useState(false);
  const [authReady, setAuthReady] = useState(false); // حالة للتأكد من اكتمال فحص المصادقة

  // متغيرات مراقبة تحميل البيانات
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [organizationLoaded, setOrganizationLoaded] = useState(false);
  const [dataLoadingComplete, setDataLoadingComplete] = useState(false);

  // تهيئة الخدمات
  const currentSubdomain = useMemo(() => subdomainService.initialize(), []);
  useEffect(() => {
    // تقليل logs في development mode
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      try { console.log('🔐 [Auth] provider mount start', { subdomain: currentSubdomain }); } catch { }
    }
  }, [currentSubdomain]);

  // استخدام الـ Hooks المحسنة
  const { session: hookSession, isValidSession, refreshSession, validateSession } = useAuthSession();
  const { userProfile, isLoading: profileLoading, refetch: refetchProfile } = useUserProfile({
    user,
    enabled: !!user && hasInitialSessionCheck
  });
  const { organization, isLoading: orgLoading, refetch: refetchOrganization } = useUserOrganization({
    userProfile,
    enabled: !!userProfile
  });

  // استخدام useMemo لـ organization object لتجنب re-creation
  const memoizedOrganization = useMemo(() => organization, [organization?.id]);

  // استخدام useRef لتتبع ما إذا تم إرسال الحدث
  const hasDispatchedEventRef = useRef(false);
  const lastOrgIdRef = useRef<string | null>(null);

  // مراقبة تغيير المؤسسة وتحديث authReady - محسن لإرسال الحدث مرة واحدة فقط
  useEffect(() => {
    // إعادة تعيين عند تغيير المؤسسة
    if (memoizedOrganization?.id !== lastOrgIdRef.current) {
      hasDispatchedEventRef.current = false;
      lastOrgIdRef.current = memoizedOrganization?.id || null;
    }

    // شروط أكثر صرامة وأقل عدداً
    const isDataReady = userProfile && memoizedOrganization && !profileLoading && !isLoadingProfile;
    const needsUpdate = !dataLoadingComplete && !authReady;

    if (isDataReady && needsUpdate) {
      try { console.log('✅ [Auth] data ready', { userId: user?.id, orgId: memoizedOrganization?.id }); } catch { }
      setDataLoadingComplete(true);
      setAuthReady(true);

      // إرسال حدث مرة واحدة فقط
      if (!hasDispatchedEventRef.current && memoizedOrganization) {
        hasDispatchedEventRef.current = true;
        setTimeout(() => {
          dispatchAppEvent('authOrganizationReady', { organization: memoizedOrganization }, {
            dedupeKey: `authOrganizationReady:${memoizedOrganization.id}`
          });
        }, 50);
      }
    }
  }, [memoizedOrganization, userProfile, profileLoading, isLoadingProfile, dataLoadingComplete, authReady, user?.id]);

  // مراقبة حالة تحميل البيانات وتحديث المتغيرات المناسبة
  useEffect(() => {
    if (user && hasInitialSessionCheck) {
      // بدء تحميل الملف الشخصي
      if (!profileLoaded && !isLoadingProfile && !profileLoading) {
        try { console.log('👤 [Auth] start loading profile'); } catch { }
        setIsLoadingProfile(true);
      }
    }
  }, [user, hasInitialSessionCheck, profileLoaded, isLoadingProfile, profileLoading]);

  // تحديث profileLoaded عندما ينتهي تحميل الملف الشخصي
  useEffect(() => {
    if (userProfile && !profileLoading && isLoadingProfile) {
      if (process.env.NODE_ENV === 'development') {
      }
      try { console.log('👤 [Auth] profile loaded'); } catch { }
      setProfileLoaded(true);
      setIsLoadingProfile(false);

      // لا نحتاج لإرسال حدث هنا - سيتم إرساله من useEffect الرئيسي
    }
  }, [userProfile, profileLoading, isLoadingProfile]);

  useEffect(() => {
    if (userProfile) {
      // بدء تحميل المؤسسة
      if (!organizationLoaded && !isLoadingOrganization && !orgLoading) {
        try { console.log('🏢 [Auth] start loading organization'); } catch { }
        setIsLoadingOrganization(true);
      }
    }
  }, [userProfile, organizationLoaded, isLoadingOrganization, orgLoading]);

  // تحديث حالة البيانات المكتملة
  useEffect(() => {
    if (profileLoaded && organizationLoaded && !isLoadingProfile && !isLoadingOrganization) {
      try { console.log('🟢 [Auth] dataLoadingComplete true'); } catch { }
      setDataLoadingComplete(true);
    }
  }, [profileLoaded, organizationLoaded, isLoadingProfile, isLoadingOrganization]);

  // ✅ فالباك ذكي: إذا تأخر تحميل الملف الشخصي/المؤسسة بعد تسجيل الدخول، فعّل authReady بعد مهلة قصيرة
  const authReadyFallbackRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (user && !authReady) {
      if (authReadyFallbackRef.current) {
        clearTimeout(authReadyFallbackRef.current);
      }
      authReadyFallbackRef.current = setTimeout(() => {
        try { console.warn('⏳ [Auth] enabling authReady fallback (profile/org slow)'); } catch { }
        setAuthReady(true);
      }, 7000);
      return () => {
        if (authReadyFallbackRef.current) {
          clearTimeout(authReadyFallbackRef.current);
          authReadyFallbackRef.current = null;
        }
      };
    }
    return () => {
      if (authReadyFallbackRef.current) {
        clearTimeout(authReadyFallbackRef.current);
        authReadyFallbackRef.current = null;
      }
    };
  }, [user?.id, authReady]);

  // ⚡ v3.2: Offline Mode Fallback - تفعيل authReady سريعاً عند عدم وجود اتصال
  // هذا يسمح للتطبيق بالعمل في الوضع أوفلاين باستخدام البيانات المخزنة محلياً
  const offlineFallbackRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // إذا كان authReady مُفعّل بالفعل، لا حاجة للفالباك
    if (authReady) {
      if (offlineFallbackRef.current) {
        clearTimeout(offlineFallbackRef.current);
        offlineFallbackRef.current = null;
      }
      return;
    }

    // فحص حالة الاتصال
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    // فحص وجود بيانات مخزنة محلياً
    const hasLocalData = (() => {
      try {
        const orgId = localStorage.getItem('currentOrganizationId')
          || localStorage.getItem('bazaar_organization_id')
          || localStorage.getItem('organizationId');
        return !!orgId && orgId !== 'undefined' && orgId !== 'null';
      } catch {
        return false;
      }
    })();

    // في الوضع أوفلاين مع وجود بيانات محلية، فعّل authReady بسرعة
    if (isOffline && hasLocalData) {
      console.log('📴 [Auth] Offline mode detected with local data - enabling fast authReady');
      offlineFallbackRef.current = setTimeout(() => {
        if (!authReady) {
          console.log('📴 [Auth] Enabling authReady for offline mode');
          setAuthReady(true);
          setHasInitialSessionCheck(true);
          setIsLoading(false);
        }
      }, 500); // انتظار قصير جداً في الوضع أوفلاين
    } else if (!isOffline) {
      // في الوضع أونلاين، استخدم فالباك أطول كشبكة أمان
      offlineFallbackRef.current = setTimeout(() => {
        if (!authReady) {
          console.warn('⏳ [Auth] Online fallback timeout - enabling authReady');
          setAuthReady(true);
          setHasInitialSessionCheck(true);
          setIsLoading(false);
        }
      }, 10000); // 10 ثواني في الوضع أونلاين
    }

    // الاستماع لتغييرات حالة الاتصال
    const handleOffline = () => {
      if (!authReady && hasLocalData) {
        console.log('📴 [Auth] Went offline - enabling fast authReady');
        setTimeout(() => {
          if (!authReady) {
            setAuthReady(true);
            setHasInitialSessionCheck(true);
            setIsLoading(false);
          }
        }, 500);
      }
    };

    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      if (offlineFallbackRef.current) {
        clearTimeout(offlineFallbackRef.current);
        offlineFallbackRef.current = null;
      }
    };
  }, [authReady]);

  // الاستماع للأحداث من useUserOrganization - محسن لعدم إرسال حدث متكرر
  useEffect(() => {
    const unsubscribe = addAppEventListener<{ organization: Organization }>(
      'organizationLoaded',
      (detail) => {
        const loadedOrg = detail?.organization;
        if (process.env.NODE_ENV === 'development') {
        }
        setOrganizationLoaded(true);
        setIsLoadingOrganization(false);

        // لا نحتاج لإرسال حدث هنا - سيتم إرساله من useEffect الرئيسي
      }
    );

    return () => {
      unsubscribe();
    };
  }, []); // إزالة التبعيات لتجنب إعادة إنشاء المستمع

  // مراجع للتحكم في دورة الحياة ومنع التكرار
  const initializedRef = useRef(false);
  const lastUpdateRef = useRef<number>(0);
  const initializationInProgressRef = useRef(false);
  const sessionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // معرف لنسخ التحقق المؤجلة لإلغاء المجدول القديم عند تبدل الجلسة
  const validationRunIdRef = useRef(0);
  const lastSessionWarnRef = useRef<number>(0);
  // مرجع لتتبع تهيئة Delta Sync Engine
  const deltaSyncInitializedRef = useRef(false);

  // دالة مساعدة للحصول على الجلسة من cache
  const getCachedSession = useCallback((userId: string): Session | null => {
    const cached = sessionCache.get(userId);
    if (cached && Date.now() - cached.timestamp < SESSION_CACHE_DURATION) {
      return cached.session;
    }
    return null;
  }, []);

  // دالة مساعدة للحصول على المستخدم من cache
  const getCachedUser = useCallback((userId: string): SupabaseUser | null => {
    const cached = userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < USER_CACHE_DURATION) {
      return cached.user;
    }
    return null;
  }, []);

  // دالة مساعدة لحفظ الجلسة في cache
  const cacheSession = useCallback((userId: string, session: Session) => {
    sessionCache.set(userId, { session, timestamp: Date.now() });
  }, []);

  // دالة مساعدة لحفظ المستخدم في cache
  const cacheUser = useCallback((userId: string, user: SupabaseUser) => {
    userCache.set(userId, { user, timestamp: Date.now() });
  }, []);

  /**
   * تحديث حالة المصادقة مع تحسينات
   */
  const updateAuthState = useCallback((
    newSession: Session | null,
    newUser: SupabaseUser | null,
    clearAll: boolean = false
  ) => {
    const startTime = performance.now();

    // منع معالجة متزامنة
    if (isProcessingToken) {
      if (process.env.NODE_ENV === 'development') {
      }
      return;
    }

    // تحقق من التكرار - مع استثناء للحالات المهمة
    if (!clearAll && !compareAuthData(session, newSession, user, newUser)) {
      trackPerformance('updateAuthState (no change)', startTime);
      return;
    }

    // debouncing ذكي - تجاهل فقط إذا كانت البيانات مختلفة بشكل طفيف
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    // إذا كان التحديث مهم (مثل تغيير المستخدم أو الجلسة)، لا نطبق debouncing
    const isImportantUpdate = clearAll ||
      (newUser && user && newUser.id !== user.id) ||
      (newSession && session && newSession.access_token !== session.access_token) ||
      (!newUser && user) || (!newSession && session);

    if (!isImportantUpdate && timeSinceLastUpdate < 500) {
      if (process.env.NODE_ENV === 'development') {
      }
      return;
    }

    // إلغاء أي عمليات تحقق مؤجلة عند تبدل الجلسة
    validationRunIdRef.current++;
    if (sessionCheckTimeoutRef.current) {
      clearTimeout(sessionCheckTimeoutRef.current);
      sessionCheckTimeoutRef.current = null;
    }
    setIsProcessingToken(true);

    try {
      if (clearAll) {
        setSession(null);
        setUser(null);
        setIsExplicitSignOut(true);

        // تنظيف الخدمات
        sessionManager.clearSessionCache();
        userDataManager.clearUserCache();

        // مسح cache
        sessionCache.clear();
        userCache.clear();

        saveAuthToStorage(null, null);
      } else {
        setSession(newSession);
        setUser(newUser);
        setIsExplicitSignOut(false);

        if (newSession && newUser) {
          saveAuthToStorage(newSession, newUser);
          sessionManager.setCachedUser(newUser);

          // حفظ في cache
          cacheSession(newUser.id, newSession);
          cacheUser(newUser.id, newUser);
        }
      }

      lastUpdateRef.current = now;
      trackPerformance('updateAuthState', startTime);

    } finally {
      setTimeout(() => setIsProcessingToken(false), 100);
    }
  }, [session, user, isProcessingToken, cacheSession, cacheUser]);

  /**
   * تحديث إجباري لحالة المصادقة (تجاوز debouncing)
   */
  const forceUpdateAuthState = useCallback((
    newSession: Session | null,
    newUser: SupabaseUser | null,
    clearAll: boolean = false
  ) => {
    const startTime = performance.now();

    if (process.env.NODE_ENV === 'development') {
    }

    // إلغاء أي عمليات تحقق مؤجلة عند تبدل الجلسة
    validationRunIdRef.current++;
    if (sessionCheckTimeoutRef.current) {
      clearTimeout(sessionCheckTimeoutRef.current);
      sessionCheckTimeoutRef.current = null;
    }
    setIsProcessingToken(true);

    try {
      if (clearAll) {
        setSession(null);
        setUser(null);
        setIsExplicitSignOut(true);
        // لا نضع authReady هنا - يتم تحديده في مكان آخر

        // تنظيف الخدمات
        sessionManager.clearSessionCache();
        userDataManager.clearUserCache();

        // مسح cache
        sessionCache.clear();
        userCache.clear();

        saveAuthToStorage(null, null);

        // إعادة تعيين متغيرات مراقبة البيانات
        setIsLoadingProfile(false);
        setIsLoadingOrganization(false);
        setProfileLoaded(false);
        setOrganizationLoaded(false);
        setDataLoadingComplete(false);
      } else {
        setSession(newSession);
        setUser(newUser);
        setIsExplicitSignOut(false);
        // لا نضع authReady هنا - يتم تحديده لاحقاً بعد تحميل البيانات
        // ✅ مهم: اعتبر فحص الجلسة الأولي مكتملاً لضمان تفعيل useUserProfile/useUserOrganization
        setHasInitialSessionCheck(true);

        if (newSession && newUser) {
          saveAuthToStorage(newSession, newUser);
          sessionManager.setCachedUser(newUser);

          // حفظ في cache
          cacheSession(newUser.id, newSession);
          cacheUser(newUser.id, newUser);

          // ✅ بدء جلب الملف الشخصي فوراً لتجنب الانتظار الطويل في الواجهة
          try {
            setTimeout(() => { void refetchProfile(); }, 0);
          } catch { }
        }
      }

      lastUpdateRef.current = Date.now();
      trackPerformance('forceUpdateAuthState', startTime);

    } finally {
      setTimeout(() => setIsProcessingToken(false), 100);
    }
  }, [cacheSession, cacheUser]);

  /**
   * تهيئة البيانات المحفوظة - محسنة ضد التكرار
   */
  const initializeFromStorage = useCallback(async () => {
    // منع التهيئة المتكررة بشكل أكثر صرامة
    if (initializedRef.current || hasInitialSessionCheck || initializationInProgressRef.current) return;

    const startTime = performance.now();
    try {
      initializedRef.current = true; // تعيين مبكر لمنع التكرار
      initializationInProgressRef.current = true;

      // 🔒 التحقق من علامة explicit logout
      const hasExplicitLogout = localStorage.getItem('bazaar_explicit_logout') === 'true';
      if (hasExplicitLogout) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthContext] 🚫 تم اكتشاف explicit logout - تخطي استعادة الجلسة');
        }
        setUser(null);
        setSession(null);
        setIsLoading(false);
        setHasInitialSessionCheck(true);
        setAuthReady(true);
        initializationInProgressRef.current = false;
        return;
      }

      // تحميل البيانات المحفوظة أولاً (سريع)
      const savedAuth = loadAuthFromStorage();

      // ✅ 1) حاول أولاً استعادة الجلسة من Supabase storage مباشرة (الأكثر موثوقية)
      // السبب: refresh_token يمكن أن يتم تدويره (rotation)؛ والـ SecureSession قد تكون قديمة إن لم تُحدّث.
      try {
        const directSession = await authSingleton.getRawSessionFromSupabaseStorage();
        if (directSession?.user) {
          const directUser = directSession.user as SupabaseUser;

          if (process.env.NODE_ENV === 'development') {
            throttledLog('✅ [AuthContext] Restored session from Supabase storage (preferred)', directUser.email);
          }

          // احفظ SecureSession لتكون جاهزة للأوفلاين مع آخر refresh_token
          try { await saveSecureSession(directSession); } catch { }

          setUser(directUser);
          setSession(directSession);

          cacheSession(directUser.id, directSession);
          cacheUser(directUser.id, directUser);
          sessionManager.setCachedUser(directUser);

          setIsLoading(false);
          setHasInitialSessionCheck(true);
          setAuthReady(true);

          if (sessionCheckTimeoutRef.current) {
            clearTimeout(sessionCheckTimeoutRef.current);
          }

          initializationInProgressRef.current = false;
          return;
        }
      } catch {
        // ignore: fallback to secure session/local-first
      }

      let restoredSession: Session | null = null;
      let restoredUser: SupabaseUser | null = savedAuth.user;

      const shouldAttemptSecure = savedAuth.hasSecureSession || hasStoredSecureSession();

      if (shouldAttemptSecure) {
        try {
          restoredSession = await loadSecureSession();
          if (restoredSession && !restoredUser && restoredSession.user) {
            restoredUser = restoredSession.user as SupabaseUser;
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[Auth] فشل تحميل الجلسة المشفرة:', error);
          }
        }
      }

      if (restoredSession && restoredUser) {
        if (process.env.NODE_ENV === 'development') {
          throttledLog('✅ [AuthContext] استعادة جلسة آمنة للأوفلاين:', restoredUser.email);
        }

        // ✅ Hydrate Supabase auth store من الجلسة المسترجعة (إن كانت جلسة حقيقية)
        // هذا يمنع حالة "AuthContext لديه session لكن supabase.auth.getSession() يرجع null"
        try {
          await sessionMonitor.hydrateFromExternalSession(restoredSession);
        } catch {
          // ignore - سنستمر في وضع local-first
        }

        setUser(restoredUser);
        setSession(restoredSession);

        cacheSession(restoredUser.id, restoredSession);
        cacheUser(restoredUser.id, restoredUser);
        sessionManager.setCachedUser(restoredUser);

        setIsLoading(false);
        setHasInitialSessionCheck(true);
        setAuthReady(true);

        if (sessionCheckTimeoutRef.current) {
          clearTimeout(sessionCheckTimeoutRef.current);
        }

        const runId = ++validationRunIdRef.current;
        sessionCheckTimeoutRef.current = setTimeout(async () => {
          if (runId !== validationRunIdRef.current) return; // تم تبديل الجلسة لاحقاً
          try {
            const cachedSession = getCachedSession(restoredUser.id);
            if (cachedSession) {
              const isValid = await validateSession();
              if (!isValid) {
                const refreshed = await refreshSession();
                if (!refreshed) {
                  // ✅ لا نحذف الجلسة فوراً - نعطي المستخدم فرصة للعمل أوفلاين
                  const nowWarn = Date.now();
                  // زيادة الفترة إلى 5 دقائق لتقليل التحذيرات المتكررة
                  if (nowWarn - (lastSessionWarnRef.current || 0) > 5 * 60_000) {
                    if (isAppOnline()) {
                      if (isOfflineOnlySession(restoredSession)) {
                        console.log('ℹ️ [Auth] Offline-only session cannot be refreshed. Cloud sync disabled until online login.');
                      } else {
                        console.warn('⚠️ [Auth] Session expired on server and refresh failed. Keeping local session for offline access.', {
                          cachedExpiresAt: cachedSession.expires_at,
                          cachedAccessTail: `***${cachedSession.access_token.slice(-6)}`,
                          cachedRefreshTail: `***${(cachedSession as any).refresh_token?.slice?.(-6)}`,
                          online: isAppOnline(),
                        });
                      }
                    } else {
                      console.log('ℹ️ [Auth] Offline mode: Session validation skipped, keeping local session.');
                    }
                    lastSessionWarnRef.current = nowWarn;
                  }
                  // لا نمسح الجلسة هنا - سنتركها للمستخدم للعمل أوفلاين
                }
              }
            }
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error('[Auth] error validating secure session:', error);
            }
          }
        }, 2000);

      } else if (savedAuth.session && savedAuth.user) {
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          try { console.log('💾 [Auth] loaded legacy session from storage'); } catch { }
        }

        // ✅ Hydrate Supabase auth store من الجلسة القديمة (إن كانت جلسة حقيقية)
        try {
          await sessionMonitor.hydrateFromExternalSession(savedAuth.session);
        } catch {
          // ignore
        }

        setUser(savedAuth.user);
        setSession(savedAuth.session);

        cacheSession(savedAuth.user.id, savedAuth.session);
        cacheUser(savedAuth.user.id, savedAuth.user);
        sessionManager.setCachedUser(savedAuth.user);

        setIsLoading(false);
        setHasInitialSessionCheck(true);
        setAuthReady(true);

        if (process.env.NODE_ENV === 'development') {
          throttledLog('✅ [AuthContext] تحميل سريع من البيانات القديمة:', savedAuth.user.email);
        }

        if (!shouldAttemptSecure) {
          void saveSecureSession(savedAuth.session).catch(() => undefined);
        }

        if (sessionCheckTimeoutRef.current) {
          clearTimeout(sessionCheckTimeoutRef.current);
        }

        const runId2 = ++validationRunIdRef.current;
        sessionCheckTimeoutRef.current = setTimeout(async () => {
          if (runId2 !== validationRunIdRef.current) return; // تم تبديل الجلسة لاحقاً
          try {
            const cachedSession = getCachedSession(savedAuth.user.id);
            if (cachedSession) {
              const isValid = await validateSession();
              if (!isValid) {
                const refreshed = await refreshSession();
                if (!refreshed) {
                  // ✅ استخدام نفس آلية throttling لتقليل التحذيرات
                  const nowWarn = Date.now();
                  if (nowWarn - (lastSessionWarnRef.current || 0) > 5 * 60_000) {
                    if (isAppOnline()) {
                      if (isOfflineOnlySession(savedAuth.session)) {
                        console.log('ℹ️ [Auth] Offline-only session cannot be refreshed. Cloud sync disabled until online login.');
                      } else {
                        console.warn('⚠️ [Auth] Legacy session expired and refresh failed. Keeping local session for offline access.');
                      }
                    } else {
                      console.log('ℹ️ [Auth] Offline mode: Legacy session validation skipped, keeping local session.');
                    }
                    lastSessionWarnRef.current = nowWarn;
                  }
                  // لا نمسح الجلسة - نتركها للعمل أوفلاين
                  // فقط نسجل أن التحقق فشل لكن المستخدم يمكنه الاستمرار
                }
              }
            }
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
            }
          }
        }, 2000);

      } else {

        // إذا كانت صفحة منتج عامة، نتجاوز أي انتظار طويل ونعلن عدم وجود مستخدم بسرعة
        if ((window as any).__PUBLIC_PRODUCT_PAGE__) {
          if (process.env.NODE_ENV === 'development') {
          }
          try { console.log('🌐 [Auth] public product fast-path'); } catch { }
          setUser(null);
          setSession(null);
          setIsLoading(false);
          setHasInitialSessionCheck(true);
          setAuthReady(true); // جاهز للصفحات العامة
          trackPerformance('initializeFromStorage (public-product fast)', startTime);
          return;
        }

        // ⚡ لا توجد بيانات محفوظة - فحص سريع من sessionManager
        // نتحقق من المستخدم أولاً قبل الإعلان عن عدم وجود مستخدم
        if (process.env.NODE_ENV === 'development') {
        }

        // فحص سريع (بدون انتظار طويل)
        if (sessionCheckTimeoutRef.current) {
          clearTimeout(sessionCheckTimeoutRef.current);
        }

        sessionCheckTimeoutRef.current = setTimeout(async () => {
          try {
            const { user: currentUser, error } = await sessionManager.getCurrentUser();

            if (!error && currentUser) {
              // تم العثور على مستخدم
              try { console.log('👤 [Auth] user found via sessionManager'); } catch { }
              setUser(currentUser);
              setIsLoading(false);
              setHasInitialSessionCheck(true);
              setAuthReady(true); // الآن جاهز مع المستخدم

              // حفظ في cache
              cacheUser(currentUser.id, currentUser);

              if (process.env.NODE_ENV === 'development') {
              }

              // جلب الجلسة أيضاً - مع cache
              setTimeout(async () => {
                try {
                  const { session } = await sessionManager.getCurrentSession();
                  if (session) {
                    try { console.log('🔑 [Auth] session fetched after user'); } catch { }
                    setSession(session);
                    cacheSession(currentUser.id, session);
                  }
                } catch (sessionError) {
                  // تجاهل أخطاء الجلسة
                }
              }, 0); // ✅ إزالة التأخير لحل مشكلة عرض المتجر
            } else {
              // لا يوجد مستخدم - الآن يمكن الإعلان عن ذلك بأمان
              try { console.log('🚫 [Auth] no user found'); } catch { }
              setUser(null);
              setSession(null);
              setIsLoading(false);
              setHasInitialSessionCheck(true);
              setAuthReady(true);

              trackPerformance('initializeFromStorage (no user)', startTime);
            }
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
            }

            setUser(null);
            setSession(null);
            setIsLoading(false);
            setHasInitialSessionCheck(true);
            setAuthReady(true);
          } finally {
            initializationInProgressRef.current = false;
          }
        }, 0); // ✅ إزالة التأخير لحل مشكلة عرض المتجر

      }

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }

      setUser(null);
      setSession(null);
      setIsLoading(false);
      setHasInitialSessionCheck(true);
      setAuthReady(true);
      initializationInProgressRef.current = false;

      trackPerformance('initializeFromStorage (error)', startTime);
    } finally {
    }
  }, [cacheSession, cacheUser, getCachedSession, validateSession, refreshSession]);

  /**
   * دوال المصادقة المحسنة
   */
  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {

    try {
      localStorage.removeItem('bazaar_explicit_logout');
      if (process.env.NODE_ENV === 'development') {
        console.log('[AuthContext] ✅ تم مسح علامة explicit logout');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AuthContext] فشل في مسح علامة explicit logout:', error);
      }
    }

    const result = await authService.signIn(email, password);

    if (result.success) {
      if (process.env.NODE_ENV === 'development') {
      }

      try {
        // الحصول على المستخدم والجلسة معاً
        const [userResult, sessionResult] = await Promise.all([
          sessionManager.getCurrentUser(),
          sessionManager.getCurrentSession()
        ]);

        if (userResult.user && !userResult.error) {
          // تحديث الحالة الأساسية أولاً
          setUser(userResult.user);
          setSession(sessionResult.session || null);
          setHasInitialSessionCheck(true);

          if (process.env.NODE_ENV === 'development') {
          }

          // انتظار تحميل جميع البيانات قبل إرجاع النتيجة
          try {
            // إعادة تعيين حالة تحميل البيانات
            setIsLoadingProfile(true);
            setIsLoadingOrganization(true);
            setProfileLoaded(false);
            setOrganizationLoaded(false);
            setDataLoadingComplete(false);

            if (process.env.NODE_ENV === 'development') {
            }

            // تحميل البيانات بالتوازي لتوفير الوقت
            const [profileResult, orgResult] = await Promise.all([
              (async () => {
                const result = await refetchProfile();
                setProfileLoaded(true);
                setIsLoadingProfile(false);
                return result;
              })(),
              (async () => {
                const result = await refetchOrganization();
                setOrganizationLoaded(true);
                setIsLoadingOrganization(false);
                return result;
              })()
            ]);

            if (process.env.NODE_ENV === 'development') {
            }

          } catch (dataError) {
            if (process.env.NODE_ENV === 'development') {
            }
            // حتى لو فشل تحميل البيانات الإضافية، نقوم بتنظيف حالة التحميل
            setIsLoadingProfile(false);
            setIsLoadingOrganization(false);
            // لا نضع authReady هنا - سيتم التعامل معه في useEffect
          }

        } else {
          if (process.env.NODE_ENV === 'development') {
          }
          // في حالة فشل الحصول على المستخدم، لا نضع authReady
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
        }
        // في حالة الخطأ، لا نضع authReady
      }
    }

    return result;
  }, [refetchProfile, refetchOrganization]);

  const signUp = useCallback(async (email: string, password: string, name: string): Promise<AuthResult> => {
    const result = await authService.signUp(email, password, name, currentSubdomain);
    return result;
  }, [currentSubdomain]);

  const signOut = useCallback(async (): Promise<void> => {
    // إيقاف محرك المزامنة قبل تسجيل الخروج
    // Handled by SyncManager now
    /*
    if (deltaSyncInitializedRef.current) {
      try {
        console.log('🛑 [DeltaSync] إيقاف محرك المزامنة قبل تسجيل الخروج');
        await deltaSyncEngine.stop();
        deltaSyncInitializedRef.current = false;
      } catch (error) {
        console.error('[DeltaSync] خطأ في إيقاف المحرك:', error);
      }
    }
    */

    await authService.signOut();

    // تنظيف الحالة فوراً
    setUser(null);
    setSession(null);
    setIsLoading(false);
    setHasInitialSessionCheck(true);
    setIsExplicitSignOut(true);
    setAuthReady(true); // جاهز بعد تسجيل الخروج

    // إعادة تعيين متغيرات مراقبة البيانات
    setIsLoadingProfile(false);
    setIsLoadingOrganization(false);
    setProfileLoaded(false);
    setOrganizationLoaded(false);
    setDataLoadingComplete(false);

    // 🔒 وضع علامة explicit logout لمنع إعادة تسجيل الدخول التلقائي
    try {
      localStorage.setItem('bazaar_explicit_logout', 'true');
      if (process.env.NODE_ENV === 'development') {
        console.log('[AuthContext] ✅ تم وضع علامة explicit logout');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AuthContext] فشل في وضع علامة explicit logout:', error);
      }
    }

    // تنظيف البيانات مع الاحتفاظ ببيانات تسجيل الدخول الأوفلاين
    try {
      const { clearAuthStorageKeepOfflineCredentials } = await import('./auth/utils/authStorage');
      clearAuthStorageKeepOfflineCredentials();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AuthContext] فشل في تنظيف البيانات مع الاحتفاظ ببيانات الأوفلاين:', error);
      }
    }

    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('[AuthContext] تم تسجيل الخروج مع الاحتفاظ ببيانات تسجيل الدخول الأوفلاين');
      } catch { }
    }
  }, []);

  /**
   * تحديث البيانات
   */
  const refreshData = useCallback(async (): Promise<void> => {
    if (isLoading || isProcessingToken) return;

    const startTime = performance.now();

    try {
      await Promise.all([
        refetchProfile(),
        refetchOrganization()
      ]);

      trackPerformance('refreshData', startTime);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
    }
  }, [isLoading, isProcessingToken, refetchProfile, refetchOrganization]);

  /**
   * تهيئة عند بدء التشغيل - محسن ومحمي ضد التكرار
   */
  useEffect(() => {
    let mounted = true;
    let initPromise: Promise<void> | null = null;

    const initialize = async () => {
      // منع التهيئة المتعددة
      if (!mounted || hasInitialSessionCheck || initializedRef.current || initPromise) {
        return;
      }

      initPromise = initializeFromStorage();
      try {
        await initPromise;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
        }
      } finally {
        initPromise = null;
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (initPromise) {
        initPromise = null;
      }
    };
  }, []); // dependency array فارغ - تتم التهيئة مرة واحدة فقط

  /**
   * مزامنة الجلسة مع المراقب الموحد - محسن لمنع الحلقات اللانهائية
   */
  useEffect(() => {
    // ✅ استخدام المراقب الموحد بدلاً من hook منفصل
    const { session: currentSession, isValid } = getCurrentSession();

    // فقط إذا كانت الجلسة مختلفة حقاً وليست null
    if (currentSession && currentSession !== session &&
      currentSession.access_token !== session?.access_token) {
      setSession(currentSession);

      if (process.env.NODE_ENV === 'development') {
      }
    }
  }, [session?.access_token]); // ✅ تقليل التبعيات

  useEffect(() => {
    if (hookSession && hookSession.access_token !== session?.access_token) {
      setSession(hookSession);
      if (hookSession && user) {
        saveAuthToStorage(hookSession, user);
      }
      void saveSecureSession(hookSession).catch(() => undefined);
    }
  }, [hookSession?.access_token, user?.id]);

  /**
   * تحديث معرف المؤسسة في المعترض - مع debouncing محسن
   */
  useEffect(() => {
    const currentOrgId = (window as any).__CURRENT_ORG_ID__;
    if (organization?.id && organization.id !== currentOrgId) {
      // debounce محسّن للتحديثات - تقليل إلى 300ms لتحسين الاستجابة
      const timeoutId = setTimeout(() => {
        setCurrentOrganizationId(organization.id);
        (window as any).__CURRENT_ORG_ID__ = organization.id;
        // تخزين كامل بيانات المؤسسة للاستخدام من قبل دوال أخرى
        (window as any).__AUTH_CONTEXT_ORG__ = organization;
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthContext] تم تحديث معرف المؤسسة:', organization.id);
        }
      }, 300); // تقليل التأخير لتحسين الاستجابة

      return () => clearTimeout(timeoutId);
    }
  }, [organization?.id]);

  /**
   * ⚡ بدء خدمة المزامنة الخلفية فقط (التهيئة تتم في PowerSyncProvider)
   * تم إزالة التهيئة المتكررة لـ PowerSync - الآن يعتمد على PowerSyncProvider
   */
  useEffect(() => {
    const startBackgroundSync = async () => {
      // التحقق من أن المؤسسة جاهزة ولم يتم البدء مسبقاً
      const shouldRun = !!organization?.id && authReady && !!session && !!user && !isExplicitSignOut;

      // إذا لم نكن في حالة مصادقة صالحة، تأكد من إيقاف المزامنة الخلفية
      if (!shouldRun) {
        if (deltaSyncInitializedRef.current) {
          try {
            const { powerSyncBackgroundService } = await import('@/services/PowerSyncBackgroundService');
            powerSyncBackgroundService.stop();
          } catch {
            // ignore
          } finally {
            deltaSyncInitializedRef.current = false;
          }
        }
        return;
      }

      if (!deltaSyncInitializedRef.current) {
        try {
          // ⚡ بدء خدمة المزامنة الخلفية فقط (PowerSync مُهيأ من PowerSyncProvider)
          const { powerSyncBackgroundService } = await import('@/services/PowerSyncBackgroundService');
          await powerSyncBackgroundService.start(organization.id);
          deltaSyncInitializedRef.current = true;
          console.log('✅ [AuthContext] تم بدء خدمة المزامنة الخلفية');
        } catch (bgSyncError) {
          console.warn('⚠️ [AuthContext] فشل بدء المزامنة الخلفية:', bgSyncError);
        }
      }
    };

    startBackgroundSync();

    // تنظيف عند إلغاء mount أو تغيير المؤسسة
    return () => {
      if (deltaSyncInitializedRef.current) {
        import('@/services/PowerSyncBackgroundService').then(({ powerSyncBackgroundService }) => {
          powerSyncBackgroundService.stop();
        }).catch(() => {});
        deltaSyncInitializedRef.current = false;
      }
    };
  }, [organization?.id, authReady, session?.access_token, user?.id, isExplicitSignOut]);

  /**
   * تنظيف cache منتهي الصلاحية دورياً - محسن مع cleanup
   */
  useEffect(() => {
    let cleanupInterval: NodeJS.Timeout | null = null;

    // تأخير بسيط لتجنب التداخل مع التهيئة
    const startCleanup = setTimeout(() => {
      cleanupInterval = setInterval(() => {
        try {
          cleanExpiredCache();
          userDataManager.cleanExpiredCache();
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
          }
        }
      }, 15 * 60 * 1000); // ✅ زيادة من 10 دقائق إلى 15 دقيقة
    }, 60000); // ✅ زيادة من 30 ثانية إلى دقيقة واحدة

    return () => {
      clearTimeout(startCleanup);
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
      }
    };
  }, []);

  /**
   * تحديد حالة التحميل الذكية - محسنة لتقليل re-renders
   */
  const computedIsLoading = useMemo(() => {
    if (!hasInitialSessionCheck) return true;
    if (isProcessingToken) return true;

    // إذا كان هناك مستخدم ولكن لا يوجد userProfile، انتظر قليلاً قبل إظهار التحميل
    if (user && !userProfile && profileLoading) {
      // إذا مر أكثر من ثانيتين على تسجيل الدخول، أظهر التحميل
      const timeSinceAuth = Date.now() - lastUpdateRef.current;
      return timeSinceAuth > 2000;
    }

    return false;
  }, [hasInitialSessionCheck, isProcessingToken, user?.id, userProfile?.id, profileLoading]);

  /**
   * قيمة السياق المحسنة - dependencies محسنة لمنع re-renders
   */
  const value = useMemo((): AuthContextType => ({
    // الحالة
    session,
    user,
    userProfile,
    organization,
    currentSubdomain,
    isLoading: computedIsLoading,
    isProcessingToken,
    isExplicitSignOut,
    hasInitialSessionCheck,
    authReady, // حالة للتأكد من جاهزية المصادقة

    // متغيرات مراقبة البيانات الجديدة
    isLoadingProfile,
    isLoadingOrganization,
    profileLoaded,
    organizationLoaded,
    dataLoadingComplete,

    // الأفعال (معظمها مع useCallback ثابت)
    signIn,
    signUp,
    signOut,
    refreshData,
    updateAuthState,
    forceUpdateAuthState, // دالة للتحديث الإجباري
    initialize: initializeFromStorage
  }), [
    // فقط المعرفات والحالات المهمة - محسن لتقليل re-renders
    session?.access_token,
    user?.id,
    userProfile?.id,
    organization?.id,
    currentSubdomain,
    computedIsLoading,
    isProcessingToken,
    isExplicitSignOut,
    hasInitialSessionCheck,
    authReady,
    isLoadingProfile,
    isLoadingOrganization,
    profileLoaded,
    organizationLoaded,
    dataLoadingComplete,
    // الدوال ثابتة مع useCallback
    signIn,
    signUp,
    signOut,
    refreshData,
    updateAuthState,
    forceUpdateAuthState,
    initializeFromStorage
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
});

AuthProvider.displayName = 'AuthProvider';

/**
 * Hook محسن لاستخدام السياق
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// تصدير للتوافق مع الإصدار السابق
export type { UserProfile, Organization } from './auth/types';
export { authService, sessionManager, userDataManager, subdomainService } from './auth/services';
export * from './auth/hooks';
