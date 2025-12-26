/**
 * ⚡ PowerSyncProvider - v3.0 (Best Practices 2025)
 * ============================================================
 *
 * 🚀 Provider محسّن يستخدم:
 *   - PowerSyncContext من @powersync/react
 *   - تكامل مع hooks الرسمية
 *   - دعم reactive queries
 *   - حماية singleton لمنع التهيئة المزدوجة
 *
 * المصادر:
 * - https://docs.powersync.com/client-sdk-references/javascript-web/javascript-spa-frameworks
 * - https://powersync-ja.github.io/powersync-js/react-sdk
 * ============================================================
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo, useRef } from 'react';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase } from '@powersync/web';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { needsPowerSync, isElectronEnvironment } from '@/lib/powersync/config';
import { Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';

// 🔒 Singleton protection - منع التهيئة المزدوجة على مستوى التطبيق
const INIT_STATE_KEY = '__POWERSYNC_PROVIDER_STATE__';

interface GlobalInitState {
  isInitializing: boolean;
  isInitialized: boolean;
  initPromise: Promise<void> | null;
  db: PowerSyncDatabase | null;
}

// الحصول على الحالة العالمية أو إنشاءها
function getGlobalInitState(): GlobalInitState {
  if (typeof window !== 'undefined') {
    if (!(window as any)[INIT_STATE_KEY]) {
      (window as any)[INIT_STATE_KEY] = {
        isInitializing: false,
        isInitialized: false,
        initPromise: null,
        db: null,
      };
    }
    return (window as any)[INIT_STATE_KEY];
  }
  return { isInitializing: false, isInitialized: false, initPromise: null, db: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚡ Helper: جلب organization_id من الـ cache المحلي (للدعم أوفلاين)
// ═══════════════════════════════════════════════════════════════════════════

function getOrganizationIdFromCache(): string | null {
  // تأكد من أننا في بيئة المتصفح
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // محاولة 1: من localStorage (مع try-catch لكل قراءة)
    let cached: string | null = null;
    try {
      cached = localStorage.getItem('currentOrganizationId')
        || localStorage.getItem('bazaar_organization_id')
        || localStorage.getItem('organizationId');
    } catch {
      // localStorage غير متاح (قد يكون في preload context)
    }

    if (cached && cached !== 'undefined' && cached !== 'null') {
      return cached;
    }

    // محاولة 2: من بيانات المستخدم المحفوظة
    let userDataStr: string | null = null;
    try {
      userDataStr = localStorage.getItem('bazaar_user_data')
        || localStorage.getItem('userData')
        || localStorage.getItem('auth_user');
    } catch {
      // تجاهل
    }

    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        if (userData?.organization_id) {
          return userData.organization_id;
        }
        if (userData?.user?.organization_id) {
          return userData.user.organization_id;
        }
      } catch {
        // تجاهل خطأ التحليل
      }
    }

    // محاولة 3: من بيانات المؤسسة المحفوظة
    let orgDataStr: string | null = null;
    try {
      orgDataStr = localStorage.getItem('bazaar_organization_data');
    } catch {
      // تجاهل
    }

    // محاولة sessionStorage فقط إذا فشل localStorage
    if (!orgDataStr) {
      try {
        orgDataStr = sessionStorage.getItem('bazaar_organization_data');
      } catch {
        // تجاهل
      }
    }

    if (orgDataStr) {
      try {
        const orgData = JSON.parse(orgDataStr);
        if (orgData?.id) {
          return orgData.id;
        }
      } catch {
        // تجاهل خطأ التحليل
      }
    }

    return null;
  } catch (error) {
    console.warn('[PowerSyncProvider] Error reading organization_id from cache:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 App-level Context (للحالة الإضافية)
// ═══════════════════════════════════════════════════════════════════════════

interface AppPowerSyncContextType {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  retryInitialization: () => void;
  /** هل نستخدم PowerSync (Electron) أم Supabase مباشرة (Web) */
  isOfflineCapable: boolean;
  /** هل نحن في بيئة Electron */
  isElectron: boolean;
}

const AppPowerSyncContext = createContext<AppPowerSyncContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 PowerSyncProvider Component
// ═══════════════════════════════════════════════════════════════════════════

export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const globalState = getGlobalInitState();

  // ⚡ v4.0: كشف بيئة التشغيل مبكراً
  const isElectron = isElectronEnvironment();
  const shouldUsePowerSync = needsPowerSync();

  const [isInitialized, setIsInitialized] = useState(
    shouldUsePowerSync ? globalState.isInitialized : true // الويب جاهز فوراً
  );
  const [isInitializing, setIsInitializing] = useState(
    shouldUsePowerSync ? globalState.isInitializing : false
  );
  const [error, setError] = useState<Error | null>(null);
  const [db, setDb] = useState<PowerSyncDatabase | null>(globalState.db);
  const lastOrgIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const lastReconnectAttemptRef = useRef(0);
  const lastReconnectedSessionTokenRef = useRef<string | null>(null);

  // 🧭 الاعتماد على حالة المصادقة والمؤسسة
  const { user, session, authReady, userProfile } = useAuth();
  const { currentOrganization } = useTenant();

  // ⚡ v3.1: دعم الوضع أوفلاين - استخدام الـ cache المحلي
  const organizationId = currentOrganization?.id || getOrganizationIdFromCache();

  // ⚡ v4.1: سجّل بيئة التشغيل مرة واحدة
  useEffect(() => {
    const dbType = isElectron ? 'better-sqlite3' : 'wa-sqlite WASM';
    console.log(`[PowerSyncProvider] 🌍 Environment: ${isElectron ? 'Electron' : 'Web Browser'}`);
    console.log(`[PowerSyncProvider] 💾 Database: ${dbType}`);
    console.log('[PowerSyncProvider] ⚡ PowerSync enabled for offline-first sync');
  }, []);

  // ⚡ Initialize PowerSync (مع حماية singleton)
  const initializePowerSync = async () => {
    // 🔒 تحقق من الحالة العالمية أولاً
    if (globalState.isInitialized && globalState.db) {
      // استخدام الـ db الموجود
      if (isMountedRef.current) {
        setDb(globalState.db);
        setIsInitialized(true);
        setIsInitializing(false);
      }
      return;
    }

    // 🔒 إذا كانت التهيئة جارية، انتظرها
    if (globalState.isInitializing && globalState.initPromise) {
      try {
        await globalState.initPromise;
        if (isMountedRef.current && globalState.db) {
          setDb(globalState.db);
          setIsInitialized(true);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMountedRef.current) {
          setIsInitializing(false);
        }
      }
      return;
    }

    // 🔒 بدء تهيئة جديدة
    globalState.isInitializing = true;
    setIsInitializing(true);
    setError(null);

    const initPromise = (async () => {
      try {
        console.log('[PowerSyncProvider] 🚀 Starting PowerSync v3.0 initialization...');

        await powerSyncService.initialize();

        // ⚡ FIX: Handle race condition where clearAllData might be called during initialization
        // Wait a bit and check again if db is still null
        if (!powerSyncService.db) {
          console.warn('[PowerSyncProvider] ⚠️ Database null after init - waiting for potential reinitialization...');
          await new Promise(resolve => setTimeout(resolve, 500));

          if (!powerSyncService.db) {
            throw new Error('Database not available after initialization');
          }
          console.log('[PowerSyncProvider] ✅ Database available after retry');
        }

        globalState.db = powerSyncService.db;
        globalState.isInitialized = true;

        if (isMountedRef.current) {
          setDb(powerSyncService.db);
          setIsInitialized(true);
          // ⚡ FIX: Reset retry count on success
          setRetryCount(0);
        }

        console.log('[PowerSyncProvider] ✅ PowerSync v3.0 ready');
      } catch (err) {
        console.error('[PowerSyncProvider] ❌ Initialization failed:', err);

        // ⚡ FIX: If database exists but connection failed, treat as offline mode
        const errorMsg = (err instanceof Error ? err.message : String(err)).toLowerCase();
        const isConnectionError = errorMsg.includes('connection') ||
          errorMsg.includes('websocket') ||
          errorMsg.includes('network') ||
          errorMsg.includes('timeout');

        if (isConnectionError && powerSyncService.db) {
          console.warn('[PowerSyncProvider] ⚠️ Connection failed but database available - continuing in offline mode');
          globalState.db = powerSyncService.db;
          globalState.isInitialized = true;
          if (isMountedRef.current) {
            setDb(powerSyncService.db);
            setIsInitialized(true);
            setError(null);
          }
        } else {
          globalState.isInitialized = false;
          if (isMountedRef.current) {
            setError(err instanceof Error ? err : new Error(String(err)));
          }
          throw err;
        }
      } finally {
        globalState.isInitializing = false;
        globalState.initPromise = null;
        if (isMountedRef.current) {
          setIsInitializing(false);
        }
      }
    })();

    globalState.initPromise = initPromise;

    try {
      await initPromise;
    } catch {
      // Error already handled above
    }
  };

  // ⚡ Retry function
  const retryInitialization = () => {
    globalState.isInitialized = false;
    globalState.isInitializing = false;
    globalState.initPromise = null;
    initializePowerSync();
  };

  // ⚡ Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ⚡ Initialize on mount
  useEffect(() => {
    // ⚡ v4.0: في الويب، لا نحتاج PowerSync - نتخطى التهيئة
    if (!shouldUsePowerSync) {
      return;
    }

    // ⚡ v3.1: دعم الوضع أوفلاين - نحتاج فقط authReady و organizationId
    if (!authReady) {
      return;
    }

    // ✅ تخطي PowerSync للسوبر أدمين - ليس لديهم organization
    const isSuperAdmin = userProfile?.is_super_admin || false;
    if (isSuperAdmin) {
      console.log('[PowerSyncProvider] 👑 تخطي PowerSync للسوبر أدمين');
      setIsInitialized(true);
      setIsInitializing(false);
      return;
    }

    // ⚡ تحقق من وجود organizationId
    if (!organizationId) {
      return;
    }

    // 🔒 v3.0: إذا كان مُهيأ عالمياً، استخدم الـ db الموجود
    if (globalState.isInitialized && globalState.db && lastOrgIdRef.current === organizationId) {
      if (!db) {
        setDb(globalState.db);
        setIsInitialized(true);
      }
      return;
    }

    // إعادة التهيئة إذا تغيرت المؤسسة
    if (lastOrgIdRef.current && lastOrgIdRef.current !== organizationId) {
      console.warn('[PowerSyncProvider] 🔄 Organization ID changed:', {
        from: lastOrgIdRef.current,
        to: organizationId
      });

      // ⚡ FIX: Prevent rapid org changes - debounce to avoid repeated clears
      const orgChangeKey = `${lastOrgIdRef.current}->${organizationId}`;
      const lastOrgChange = (window as any).__lastOrgChange || '';
      const lastOrgChangeTime = (window as any).__lastOrgChangeTime || 0;

      // Only clear if this is a genuinely new org change (not a rapid flip-flop)
      if (orgChangeKey !== lastOrgChange || (Date.now() - lastOrgChangeTime) > 5000) {
        (window as any).__lastOrgChange = orgChangeKey;
        (window as any).__lastOrgChangeTime = Date.now();

        globalState.isInitialized = false;
        globalState.db = null;
        powerSyncService.clearAllData().catch((err) => {
          console.error('[PowerSyncProvider] Failed to clear data on org change:', err);
        });
      } else {
        console.log('[PowerSyncProvider] ⚠️ Ignoring rapid org change - keeping current database');
      }
    }

    // 🔒 منع التهيئة المزدوجة
    if (!globalState.isInitialized && !globalState.isInitializing) {
      lastOrgIdRef.current = organizationId;
      console.log(`[PowerSyncProvider] 🚀 Initializing with org: ${organizationId}, user: ${user?.id || 'offline-mode'}`);
      initializePowerSync();
    } else if (globalState.isInitializing) {
      // انتظار التهيئة الجارية
      lastOrgIdRef.current = organizationId;
      initializePowerSync();
    }
  }, [authReady, user?.id, organizationId, shouldUsePowerSync]);

  // 🔁 عندما تصبح جلسة Supabase متاحة (أو تتغير) ونحن Online: أعد ربط PowerSync تلقائياً
  useEffect(() => {
    if (!shouldUsePowerSync) return;
    if (!authReady) return;
    if (!db) return;
    if (!session) return;

    // لا تحاول الربط في وضع session أوفلاين الوهمية
    const refreshToken = String((session as any).refresh_token || '');
    const isOfflineOnly =
      session.access_token === 'offline_token' ||
      refreshToken === 'offline_refresh_token' ||
      refreshToken.startsWith('offline-refresh-') ||
      !refreshToken;

    if (isOfflineOnly) return;

    // لا نعيد الاتصال إذا كنا Offline
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    // debounce: لا تعيد المحاولة بسرعة
    const now = Date.now();
    if (now - lastReconnectAttemptRef.current < 15_000) return;
    lastReconnectAttemptRef.current = now;

    // لا تكرر reconnect لنفس الـ token
    if (lastReconnectedSessionTokenRef.current === session.access_token) return;
    lastReconnectedSessionTokenRef.current = session.access_token;

    void powerSyncService.reconnect();
  }, [authReady, db, session?.access_token, shouldUsePowerSync]);

  // ⚡ v4.1: Track retry count to prevent infinite retries
  const [retryCount, setRetryCount] = React.useState(0);
  const MAX_RETRIES = 3;

  // ⚡ إعادة محاولة تلقائية إذا فشل الاتصال المؤقت
  useEffect(() => {
    // ⚡ v4.0: لا إعادة محاولة في الويب (لا يوجد PowerSync)
    if (!shouldUsePowerSync) {
      return;
    }

    if (error && retryCount < MAX_RETRIES) {
      const retryTimer = setTimeout(() => {
        // ⚡ v3.1: دعم الوضع أوفلاين - نحتاج فقط authReady و organizationId
        if (authReady && organizationId) {
          console.log(`[PowerSyncProvider] 🔄 Retrying initialization... (${retryCount + 1}/${MAX_RETRIES})`);
          setRetryCount(prev => prev + 1);
          initializePowerSync();
        }
      }, 3000);
      return () => clearTimeout(retryTimer);
    } else if (error && retryCount >= MAX_RETRIES) {
      // ⚡ FIX: After max retries, continue in offline mode if db is available
      console.warn('[PowerSyncProvider] ⚠️ Max retries reached - checking if offline mode is possible');
      if (powerSyncService.db) {
        console.log('[PowerSyncProvider] ✅ Database available - continuing in offline mode');
        setError(null);
        setIsInitialized(true);
        setDb(powerSyncService.db);
      }
    }
  }, [error, authReady, organizationId, shouldUsePowerSync, retryCount]);

  // ⚡ App context value
  const appContextValue = useMemo(() => ({
    isInitialized,
    isInitializing,
    error,
    retryInitialization,
    isOfflineCapable: shouldUsePowerSync,
    isElectron,
  }), [isInitialized, isInitializing, error, shouldUsePowerSync, isElectron]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎨 Loading State
  // ═══════════════════════════════════════════════════════════════════════════
  // ⚡ v3.2: السماح بعرض صفحة تسجيل الدخول عندما لا يوجد مستخدم
  // إذا كان authReady ولا يوجد user ولا organizationId = نعرض صفحة تسجيل الدخول
  const isUnauthenticated = authReady && !user && !organizationId;

  // ✅ السماح للسوبر أدمين بتخطي متطلبات organizationId
  const isSuperAdmin = userProfile?.is_super_admin || false;
  const awaitingPrerequisites = !authReady || (!organizationId && !isUnauthenticated && !isSuperAdmin);

  // ⚡ v4.0: في الويب، لا ننتظر PowerSync
  const shouldShowLoader = shouldUsePowerSync && (isInitializing || (awaitingPrerequisites && !isUnauthenticated));

  if (shouldShowLoader) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">سطوكيها</h3>
            <p className="text-sm text-muted-foreground">جاري تهيئة النظام...</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚫 Error State
  // ═══════════════════════════════════════════════════════════════════════════
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md p-6 bg-destructive/10 border border-destructive rounded-lg">
          <h3 className="text-lg font-semibold text-destructive mb-2">خطأ في تهيئة النظام</h3>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <div className="flex gap-2">
            <button
              onClick={retryInitialization}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              إعادة المحاولة
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ✅ Ready State - Wrap with both contexts
  // ═══════════════════════════════════════════════════════════════════════════

  // ⚡ v4.0: في الويب، لا نحتاج PowerSyncContext - نعرض المحتوى مباشرة
  if (!shouldUsePowerSync) {
    return (
      <AppPowerSyncContext.Provider value={appContextValue}>
        {children}
      </AppPowerSyncContext.Provider>
    );
  }

  // ⚡ v3.2: السماح بعرض صفحة تسجيل الدخول حتى بدون db
  // إذا كان المستخدم غير مسجل، نسمح بعرض المحتوى (صفحة تسجيل الدخول)
  // ✅ السماح للسوبر أدمين بالمرور بدون db
  if (!db && !isUnauthenticated && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">سطوكيها</h3>
            <p className="text-sm text-muted-foreground">جاري تهيئة PowerSync...</p>
          </div>
        </div>
      </div>
    );
  }

  // ⚡ v3.2: إذا كان المستخدم غير مسجل، نعرض المحتوى بدون PowerSyncContext
  if (isUnauthenticated) {
    return (
      <AppPowerSyncContext.Provider value={appContextValue}>
        {children}
      </AppPowerSyncContext.Provider>
    );
  }

  return (
    <AppPowerSyncContext.Provider value={appContextValue}>
      <PowerSyncContext.Provider value={db!}>
        {children}
      </PowerSyncContext.Provider>
    </AppPowerSyncContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🪝 Hooks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🎣 useAppPowerSync - للوصول لحالة التطبيق
 */
export function useAppPowerSync() {
  const context = useContext(AppPowerSyncContext);
  if (!context) {
    throw new Error('useAppPowerSync must be used within PowerSyncProvider');
  }
  return context;
}

/**
 * 🎣 usePowerSyncContext - للتوافق مع الكود القديم
 * @deprecated Use useAppPowerSync() instead
 */
export function usePowerSyncContext() {
  return useAppPowerSync();
}

export default PowerSyncProvider;
