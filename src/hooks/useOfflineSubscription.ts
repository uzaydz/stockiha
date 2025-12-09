/**
 * Hook موحد للاشتراكات - Offline-First
 * يدعم الخطط الجديدة (v2)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { offlineSubscriptionService } from '@/api/offlineSubscriptionService';
import { subscriptionCache, SubscriptionData } from '@/lib/subscription-cache';
import { syncManager, useSyncState } from '@/lib/subscription/syncManager';
import { DEFAULT_PLAN_LIMITS } from '@/lib/subscription-service';
import type { SubscriptionPlanLimits, PlanCode, LimitCheckResult } from '@/types/subscription';

// حالة الاشتراك الموحدة
export interface UnifiedSubscriptionState {
  isLoading: boolean;
  isInitialized: boolean;
  isValid: boolean;
  status: 'active' | 'trial' | 'expired' | 'error' | 'not_found';
  planCode: PlanCode;
  planName: string;
  daysLeft: number;
  endDate: string | null;
  limits: SubscriptionPlanLimits;
  isOnline: boolean;
  lastSync: string | null;
  syncStatus: 'success' | 'failed' | 'pending' | 'offline';
  tamperDetected: boolean;
  isLocked: boolean;
  error: string | null;
}

// خيارات الـ Hook
export interface UseOfflineSubscriptionOptions {
  organizationId: string;
  autoSync?: boolean;
  syncInterval?: number;
  onExpired?: () => void;
  onTamperDetected?: () => void;
  onLimitReached?: (limitType: string) => void;
}

const initialState: UnifiedSubscriptionState = {
  isLoading: true,
  isInitialized: false,
  isValid: false,
  status: 'not_found',
  planCode: 'trial',
  planName: 'فترة تجريبية',
  daysLeft: 0,
  endDate: null,
  limits: DEFAULT_PLAN_LIMITS.trial,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastSync: null,
  syncStatus: 'pending',
  tamperDetected: false,
  isLocked: false,
  error: null
};

export function useOfflineSubscription(options: UseOfflineSubscriptionOptions) {
  const {
    organizationId,
    autoSync = true,
    syncInterval = 5 * 60 * 1000,
    onExpired,
    onTamperDetected,
    onLimitReached
  } = options;

  const [state, setState] = useState<UnifiedSubscriptionState>(initialState);

  // استخدام refs للـ callbacks لتجنب re-renders
  const onExpiredRef = useRef(onExpired);
  const onTamperDetectedRef = useRef(onTamperDetected);
  const onLimitReachedRef = useRef(onLimitReached);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  // تحديث الـ refs عند تغيير الـ callbacks
  useEffect(() => {
    onExpiredRef.current = onExpired;
    onTamperDetectedRef.current = onTamperDetected;
    onLimitReachedRef.current = onLimitReached;
  }, [onExpired, onTamperDetected, onLimitReached]);

  // حالة المزامنة
  const syncState = useSyncState(organizationId);

  // تحميل بيانات الاشتراك
  const loadSubscription = useCallback(async (forceRefresh = false) => {
    if (!organizationId || loadingRef.current) return;

    loadingRef.current = true;

    if (mountedRef.current) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      let data: SubscriptionData | null = null;

      if (forceRefresh || (typeof navigator !== 'undefined' && navigator.onLine)) {
        try {
          data = await subscriptionCache.getSubscriptionStatus(organizationId);
        } catch (e) {
          console.warn('[useOfflineSubscription] Cache fetch failed:', e);
        }
      }

      if (!data?.success) {
        // استخدام البيانات المحلية
        try {
          const localSummary = await offlineSubscriptionService.getLocalSubscriptionSummary(organizationId);

          if (mountedRef.current) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              isInitialized: true,
              isValid: localSummary.isValid,
              status: localSummary.status as UnifiedSubscriptionState['status'],
              planCode: localSummary.planCode,
              planName: localSummary.planName,
              daysLeft: localSummary.daysLeft,
              endDate: localSummary.endDate,
              limits: localSummary.limits,
              lastSync: localSummary.lastSync,
              syncStatus: (typeof navigator !== 'undefined' && navigator.onLine) ? 'failed' : 'offline'
            }));

            if (!localSummary.isValid && onExpiredRef.current) {
              onExpiredRef.current();
            }
          }
        } catch (localError) {
          if (mountedRef.current) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              isInitialized: true,
              syncStatus: 'failed'
            }));
          }
        }

        loadingRef.current = false;
        return;
      }

      // تحديث الحالة من البيانات المجلوبة
      const planCode = (data.plan_code || 'trial') as PlanCode;
      const limits = data.limits || DEFAULT_PLAN_LIMITS[planCode] || DEFAULT_PLAN_LIMITS.trial;

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isInitialized: true,
          isValid: data!.success && ['active', 'trial'].includes(data!.status) && data!.days_left > 0,
          status: data!.status as UnifiedSubscriptionState['status'],
          planCode: planCode,
          planName: data!.plan_name,
          daysLeft: data!.days_left,
          endDate: data!.end_date,
          limits: limits,
          lastSync: new Date().toISOString(),
          syncStatus: 'success',
          error: null
        }));

        if (data.status === 'expired' && onExpiredRef.current) {
          onExpiredRef.current();
        }
      }

    } catch (error) {
      console.error('[useOfflineSubscription] Error loading subscription:', error);

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isInitialized: true,
          syncStatus: 'failed',
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        }));
      }
    } finally {
      loadingRef.current = false;
    }
  }, [organizationId]);

  // التحقق من حالة الاشتراك
  const checkStatus = useCallback(async () => {
    if (!organizationId) return null;

    try {
      const result = await offlineSubscriptionService.checkSubscriptionStatus(organizationId);

      if (result.tamperDetected && mountedRef.current) {
        setState(prev => ({ ...prev, tamperDetected: true }));
        if (onTamperDetectedRef.current) {
          onTamperDetectedRef.current();
        }
      }

      return result;
    } catch (error) {
      console.error('[useOfflineSubscription] Check status error:', error);
      return null;
    }
  }, [organizationId]);

  // فرض المزامنة
  const forceSync = useCallback(async () => {
    if (!organizationId) {
      return { success: false, message: 'لا يوجد معرف مؤسسة' };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, message: 'لا يوجد اتصال بالإنترنت' };
    }

    if (mountedRef.current) {
      setState(prev => ({ ...prev, syncStatus: 'pending' }));
    }

    try {
      const result = await syncManager.forceSync(organizationId);

      if (result.success) {
        await loadSubscription(true);
      } else if (mountedRef.current) {
        setState(prev => ({ ...prev, syncStatus: 'failed', error: result.message }));
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'خطأ في المزامنة';
      if (mountedRef.current) {
        setState(prev => ({ ...prev, syncStatus: 'failed', error: message }));
      }
      return { success: false, message };
    }
  }, [organizationId, loadSubscription]);

  // دوال التحقق من الحدود
  const canAddProduct = useCallback(async (currentCount: number): Promise<LimitCheckResult> => {
    if (!organizationId) {
      return { allowed: false, current: currentCount, limit: 0, unlimited: false };
    }

    const result = await offlineSubscriptionService.checkProductLimitOffline(organizationId, currentCount);
    if (!result.allowed && onLimitReachedRef.current) {
      onLimitReachedRef.current('max_products');
    }
    return result;
  }, [organizationId]);

  const canAddUser = useCallback(async (currentCount: number): Promise<LimitCheckResult> => {
    if (!organizationId) {
      return { allowed: false, current: currentCount, limit: 0, unlimited: false };
    }

    const result = await offlineSubscriptionService.checkUserLimitOffline(organizationId, currentCount);
    if (!result.allowed && onLimitReachedRef.current) {
      onLimitReachedRef.current('max_users');
    }
    return result;
  }, [organizationId]);

  const canAddPOS = useCallback(async (currentCount: number): Promise<LimitCheckResult> => {
    if (!organizationId) {
      return { allowed: false, current: currentCount, limit: 0, unlimited: false };
    }

    const result = await offlineSubscriptionService.checkPOSLimitOffline(organizationId, currentCount);
    if (!result.allowed && onLimitReachedRef.current) {
      onLimitReachedRef.current('max_pos');
    }
    return result;
  }, [organizationId]);

  const checkLimit = useCallback(async (
    limitType: keyof SubscriptionPlanLimits,
    currentCount: number
  ): Promise<LimitCheckResult> => {
    if (!organizationId) {
      return { allowed: false, current: currentCount, limit: 0, unlimited: false };
    }

    const result = await offlineSubscriptionService.checkLimitOffline(organizationId, limitType, currentCount);
    if (!result.allowed && onLimitReachedRef.current) {
      onLimitReachedRef.current(limitType);
    }
    return result;
  }, [organizationId]);

  const getLimitMessage = useCallback((
    limitType: keyof SubscriptionPlanLimits,
    result: LimitCheckResult
  ): string => {
    return offlineSubscriptionService.getLimitMessageAr(limitType, result);
  }, []);

  const getLimits = useCallback(async (): Promise<SubscriptionPlanLimits> => {
    if (!organizationId) return DEFAULT_PLAN_LIMITS.trial;
    return await offlineSubscriptionService.getLocalLimits(organizationId);
  }, [organizationId]);

  // تحميل البيانات عند التهيئة
  useEffect(() => {
    mountedRef.current = true;

    if (organizationId) {
      loadSubscription();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // مزامنة تلقائية دورية
  useEffect(() => {
    if (!autoSync || !organizationId) return;

    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine && syncManager.needsSync()) {
        loadSubscription(true);
      }
    }, syncInterval);

    return () => clearInterval(interval);
  }, [autoSync, organizationId, syncInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  // تحديث حالة الاتصال
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, isOnline: true }));
        if (autoSync && organizationId) {
          loadSubscription(true);
        }
      }
    };

    const handleOffline = () => {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, isOnline: false, syncStatus: 'offline' }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSync, organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // حساب نسب الاستخدام
  const usagePercentages = useMemo(() => {
    const limits = state.limits;
    return {
      products: limits.max_products === null ? 0 : 0,
      users: limits.max_users === null ? 0 : 0,
      pos: limits.max_pos === null ? 0 : 0,
      branches: limits.max_branches === null ? 0 : 0
    };
  }, [state.limits]);

  return {
    ...state,
    usagePercentages,
    refresh: loadSubscription,
    forceSync,
    checkStatus,
    canAddProduct,
    canAddUser,
    canAddPOS,
    checkLimit,
    getLimitMessage,
    getLimits,
    syncState
  };
}

export default useOfflineSubscription;
