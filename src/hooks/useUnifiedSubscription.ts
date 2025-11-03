/**
 * Hook موحد لإدارة الإشتراكات
 * يستبدل: useSubscriptionMonitor + useSubscriptionStatus + useOnlineOrdersLimit
 *
 * المزايا:
 * - استدعاء API واحد بدلاً من 3
 * - polling واحد بدلاً من 3
 * - cache موحد
 * - أداء أفضل
 */

import { useState, useEffect, useCallback, useRef } from 'use';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { clearPermissionsCache } from '@/lib/PermissionsCache';

// ====================
// Types
// ====================

interface SubscriptionData {
  // معلومات الإشتراك
  hasActiveSubscription: boolean;
  planName: string | null;
  planCode: string | null;
  daysRemaining: number;
  subscriptionStatus: 'active' | 'trial' | 'expired' | null;
  subscriptionId: string | null;

  // معلومات الطلبات
  hasOrdersLimit: boolean;
  currentOrders: number;
  maxOrders: number | null;
  remainingOrders: number | null;

  // حالة التحميل
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UnifiedSubscriptionOptions {
  /** فترة التحديث بالميلي ثانية (افتراضياً: 5 دقائق) */
  pollingInterval?: number;

  /** تفعيل التحديث التلقائي */
  enablePolling?: boolean;

  /** تفعيل التحديث عند رجوع المستخدم للصفحة */
  refreshOnFocus?: boolean;

  /** callback عند اكتشاف تغيير في الإشتراك */
  onSubscriptionChange?: (data: SubscriptionData) => void;
}

// ====================
// Cache Layer
// ====================

interface CacheEntry {
  data: SubscriptionData;
  timestamp: number;
}

const CACHE_DURATION = 2 * 60 * 1000; // دقيقتان
const subscriptionCache = new Map<string, CacheEntry>();

function getCachedData(organizationId: string): SubscriptionData | null {
  const cached = subscriptionCache.get(organizationId);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_DURATION) {
    subscriptionCache.delete(organizationId);
    return null;
  }

  return cached.data;
}

function setCachedData(organizationId: string, data: SubscriptionData): void {
  subscriptionCache.set(organizationId, {
    data,
    timestamp: Date.now()
  });
}

// ====================
// Hook Implementation
// ====================

export function useUnifiedSubscription(options: UnifiedSubscriptionOptions = {}) {
  const {
    pollingInterval = 5 * 60 * 1000, // 5 دقائق افتراضياً
    enablePolling = true,
    refreshOnFocus = true,
    onSubscriptionChange
  } = options;

  const { organization } = useAuth();
  const { refreshOrganizationData } = useTenant();

  const [data, setData] = useState<SubscriptionData>({
    hasActiveSubscription: false,
    planName: null,
    planCode: null,
    daysRemaining: 0,
    subscriptionStatus: null,
    subscriptionId: null,
    hasOrdersLimit: false,
    currentOrders: 0,
    maxOrders: null,
    remainingOrders: null,
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isF fetchingRef = useRef(false);
  const previousDataRef = useRef<SubscriptionData | null>(null);

  /**
   * دالة موحدة لجلب جميع بيانات الإشتراك
   */
  const fetchSubscriptionData = useCallback(async (force: boolean = false): Promise<void> => {
    if (!organization?.id) {
      setData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // منع الاستدعاءات المتزامنة
    if (isFetchingRef.current && !force) {
      return;
    }

    // فحص الـ cache أولاً
    if (!force) {
      const cached = getCachedData(organization.id);
      if (cached) {
        setData(cached);
        return;
      }
    }

    try {
      isFetchingRef.current = true;
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // استدعاء دالة RPC موحدة تجلب كل البيانات مرة واحدة
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_unified_subscription_data',
        { p_organization_id: organization.id }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const newData: SubscriptionData = {
        // معلومات الإشتراك
        hasActiveSubscription: rpcData?.has_active_subscription || false,
        planName: rpcData?.plan_name || null,
        planCode: rpcData?.plan_code || null,
        daysRemaining: rpcData?.days_remaining || 0,
        subscriptionStatus: rpcData?.subscription_status || null,
        subscriptionId: rpcData?.subscription_id || null,

        // معلومات الطلبات
        hasOrdersLimit: rpcData?.has_orders_limit || false,
        currentOrders: rpcData?.current_orders || 0,
        maxOrders: rpcData?.max_orders || null,
        remainingOrders: rpcData?.remaining_orders || null,

        // حالة التحميل
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      };

      // حفظ في الـ cache
      setCachedData(organization.id, newData);

      // تحديث الـ state
      setData(newData);

      // استدعاء callback إذا تغيرت البيانات
      if (onSubscriptionChange && JSON.stringify(previousDataRef.current) !== JSON.stringify(newData)) {
        onSubscriptionChange(newData);
      }

      previousDataRef.current = newData;

    } catch (error) {
      console.error('[useUnifiedSubscription] Error fetching data:', error);

      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'حدث خطأ في جلب بيانات الإشتراك'
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [organization?.id, onSubscriptionChange]);

  /**
   * دالة مراقبة التغييرات وإصلاح الإشتراكات المنتهية
   */
  const monitorAndFix = useCallback(async (): Promise<void> => {
    if (!organization?.id) return;

    try {
      // استخدام دالة المراقبة والإصلاح
      const { data: monitorResult, error: monitorError } = await supabase.rpc(
        'monitor_and_fix_subscriptions'
      );

      if (monitorError) {
        console.error('[useUnifiedSubscription] Monitor error:', monitorError);
        return;
      }

      // إذا تم إصلاح إشتراكات
      if (monitorResult && monitorResult[0]?.total_fixed > 0) {
        // حذف الـ cache
        clearPermissionsCache();
        subscriptionCache.delete(organization.id);

        // تحديث البيانات
        await refreshOrganizationData();
        await fetchSubscriptionData(true);
      }

    } catch (error) {
      console.error('[useUnifiedSubscription] Monitor failed:', error);
    }
  }, [organization?.id, refreshOrganizationData, fetchSubscriptionData]);

  /**
   * تحديث فوري (يتجاوز الـ cache)
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (organization?.id) {
      subscriptionCache.delete(organization.id);
    }
    await fetchSubscriptionData(true);
    await monitorAndFix();
  }, [organization?.id, fetchSubscriptionData, monitorAndFix]);

  // ====================
  // Effects
  // ====================

  // التحميل الأولي
  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // Polling (إذا م��عّل)
  useEffect(() => {
    if (!enablePolling || !organization?.id) return;

    // مسح أي polling سابق
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // إنشاء polling جديد
    pollingIntervalRef.current = setInterval(() => {
      fetchSubscriptionData();
      monitorAndFix();
    }, pollingInterval);

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [enablePolling, organization?.id, pollingInterval, fetchSubscriptionData, monitorAndFix]);

  // التحديث عند رجوع المستخدم للصفحة
  useEffect(() => {
    if (!refreshOnFocus || !organization?.id) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchSubscriptionData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshOnFocus, organization?.id, fetchSubscriptionData]);

  // الاستماع لأحداث تفعيل الإشتراك
  useEffect(() => {
    const handleSubscriptionActivated = (event: Event) => {
      const customEvent = event as CustomEvent<{ organizationId?: string }>;
      if (customEvent.detail?.organizationId === organization?.id) {
        refresh();
      }
    };

    window.addEventListener('subscriptionActivated', handleSubscriptionActivated);
    return () => window.removeEventListener('subscriptionActivated', handleSubscriptionActivated);
  }, [organization?.id, refresh]);

  // ====================
  // Return
  // ====================

  return {
    // البيانات
    ...data,

    // الدوال
    refresh,

    // معلومات إضافية
    isExpiringSoon: data.daysRemaining > 0 && data.daysRemaining <= 7,
    isOrdersLimitNearMax: data.hasOrdersLimit &&
                         data.maxOrders !== null &&
                         data.remainingOrders !== null &&
                         (data.remainingOrders / data.maxOrders) <= 0.2, // أقل من 20%
  };
}

// ====================
// Helper Hooks
// ====================

/**
 * Hook مخفف لمراقبة الإشتراك فقط (بدون طلبات)
 */
export function useSubscriptionOnly(options: Omit<UnifiedSubscriptionOptions, 'onSubscriptionChange'> = {}) {
  const result = useUnifiedSubscription(options);

  return {
    hasActiveSubscription: result.hasActiveSubscription,
    planName: result.planName,
    planCode: result.planCode,
    daysRemaining: result.daysRemaining,
    subscriptionStatus: result.subscriptionStatus,
    subscriptionId: result.subscriptionId,
    isLoading: result.isLoading,
    error: result.error,
    isExpiringSoon: result.isExpiringSoon,
    refresh: result.refresh
  };
}

/**
 * Hook مخفف لحد الطلبات فقط
 */
export function useOrdersLimitOnly(options: Omit<UnifiedSubscriptionOptions, 'onSubscriptionChange'> = {}) {
  const result = useUnifiedSubscription(options);

  return {
    hasOrdersLimit: result.hasOrdersLimit,
    currentOrders: result.currentOrders,
    maxOrders: result.maxOrders,
    remainingOrders: result.remainingOrders,
    isOrdersLimitNearMax: result.isOrdersLimitNearMax,
    isLoading: result.isLoading,
    error: result.error,
    refresh: result.refresh
  };
}
