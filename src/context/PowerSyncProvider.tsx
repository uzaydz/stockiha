/**
 * ⚡ PowerSyncProvider - v2.0 (Best Practices 2025)
 * ============================================================
 *
 * 🚀 Provider محسّن يستخدم:
 *   - PowerSyncContext من @powersync/react
 *   - تكامل مع hooks الرسمية
 *   - دعم reactive queries
 *
 * المصادر:
 * - https://docs.powersync.com/client-sdk-references/javascript-web/javascript-spa-frameworks
 * - https://powersync-ja.github.io/powersync-js/react-sdk
 * ============================================================
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase } from '@powersync/web';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';

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
}

const AppPowerSyncContext = createContext<AppPowerSyncContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 PowerSyncProvider Component
// ═══════════════════════════════════════════════════════════════════════════

export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [db, setDb] = useState<PowerSyncDatabase | null>(null);
  const initAttempted = React.useRef(false);
  const lastOrgIdRef = React.useRef<string | null>(null);

  // 🧭 الاعتماد على حالة المصادقة والمؤسسة
  const { user, authReady } = useAuth();
  const { currentOrganization } = useTenant();

  // ⚡ v3.1: دعم الوضع أوفلاين - استخدام الـ cache المحلي
  const organizationId = currentOrganization?.id || getOrganizationIdFromCache();

  // ⚡ Initialize PowerSync
  const initializePowerSync = async () => {
    try {
      console.log('[PowerSyncProvider] 🚀 Starting PowerSync v2.0 initialization...');
      setIsInitializing(true);
      setError(null);

      await powerSyncService.initialize();

      if (!powerSyncService.db) {
        throw new Error('Database not available after initialization');
      }
      setDb(powerSyncService.db);
      setIsInitialized(true);
      console.log('[PowerSyncProvider] ✅ PowerSync v2.0 ready');
    } catch (err) {
      console.error('[PowerSyncProvider] ❌ Initialization failed:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsInitializing(false);
    }
  };

  // ⚡ Retry function
  const retryInitialization = () => {
    initAttempted.current = false;
    initializePowerSync();
  };

  // ⚡ Initialize on mount
  useEffect(() => {
    // ⚡ v3.1: دعم الوضع أوفلاين - نحتاج فقط authReady و organizationId
    // user قد يكون null في الوضع أوفلاين لكن organizationId متاح من الـ cache
    if (!authReady) {
      return;
    }

    // ⚡ تحقق من وجود organizationId (من الـ context أو الـ cache)
    if (!organizationId) {
      console.warn('[PowerSyncProvider] ⚠️ No organization_id available - cannot initialize');
      return;
    }

    // ⚡ v3.2: إذا كان مُهيأ بالفعل ولم تتغير المؤسسة، لا نعيد التهيئة
    if (isInitialized && lastOrgIdRef.current === organizationId) {
      return;
    }

    // ⚡ v3.1: السماح بالتهيئة حتى لو كان user null (للوضع أوفلاين)
    // نعتمد على الجلسة المحفوظة في Supabase أو PowerSync

    // إعادة التهيئة إذا تغيرت المؤسسة
    if (lastOrgIdRef.current && lastOrgIdRef.current !== organizationId) {
      initAttempted.current = false;
      // مسح البيانات القديمة ثم إعادة التهيئة
      powerSyncService.clearAllData().catch((err) => {
        console.error('[PowerSyncProvider] Failed to clear data on org change:', err);
      });
    }

    if (!initAttempted.current) {
      initAttempted.current = true;
      lastOrgIdRef.current = organizationId;
      console.log(`[PowerSyncProvider] 🚀 Initializing with org: ${organizationId}, user: ${user?.id || 'offline-mode'}`);
      initializePowerSync();
    }
  }, [authReady, user?.id, organizationId, isInitialized]);

  // ⚡ إعادة محاولة تلقائية إذا فشل الاتصال المؤقت
  useEffect(() => {
    if (error) {
      const retryTimer = setTimeout(() => {
        // ⚡ v3.1: دعم الوضع أوفلاين - نحتاج فقط authReady و organizationId
        if (authReady && organizationId) {
          console.log('[PowerSyncProvider] 🔄 Retrying initialization...');
          initializePowerSync();
        }
      }, 3000);
      return () => clearTimeout(retryTimer);
    }
  }, [error, authReady, organizationId]);

  // ⚡ App context value
  const appContextValue = useMemo(() => ({
    isInitialized,
    isInitializing,
    error,
    retryInitialization,
  }), [isInitialized, isInitializing, error]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎨 Loading State
  // ═══════════════════════════════════════════════════════════════════════════
  // ⚡ v3.1: دعم الوضع أوفلاين - نحتاج فقط authReady و organizationId
  // user قد يكون null في الوضع أوفلاين
  const awaitingPrerequisites = !authReady || !organizationId;

  if (isInitializing || awaitingPrerequisites) {
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
  // إذا لم نحصل على قاعدة بيانات بعد، نعرض شاشة انتظار بدلاً من السماح بغياب PowerSyncContext
  if (!db) {
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

  return (
    <AppPowerSyncContext.Provider value={appContextValue}>
      <PowerSyncContext.Provider value={db}>
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

