/**
 * Hook لجلب حالة الاشتراك الحالي مع معلومات الطلبات
 * يجمع البيانات من عدة مصادر لعرضها في شريط العنوان
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getSecureNow, getLocalSubscription, toSubscriptionDataFromLocal, saveLocalSubscription } from '@/lib/license/licenseService';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

interface SubscriptionStatus {
  // معلومات الاشتراك
  hasActiveSubscription: boolean;
  planName: string | null;
  planCode: string | null;
  daysRemaining: number;
  subscriptionStatus: 'active' | 'trial' | 'expired' | null;

  // معلومات الطلبات (للباقات التي تقدم طلبات)
  hasOrdersLimit: boolean;
  currentOrders: number;
  maxOrders: number | null;
  remainingOrders: number | null;

  // حالة التحميل
  isLoading: boolean;
  error: string | null;
}

export const useSubscriptionStatus = () => {
  const { organization } = useAuth();
  const { isOffline } = useOfflineStatus();
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastFetchAtRef = useRef(0);
  const isMountedRef = useRef(true);
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    planName: null,
    planCode: null,
    daysRemaining: 0,
    subscriptionStatus: null,
    hasOrdersLimit: false,
    currentOrders: 0,
    maxOrders: null,
    remainingOrders: null,
    isLoading: true,
    error: null,
  });

  const fetchSubscriptionStatus = useCallback(async (force: boolean = false) => {
    if (!organization?.id) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    if (!force) {
      const now = Date.now();
      if (inFlightRef.current && now - lastFetchAtRef.current < 2000) {
        return;
      }
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      lastFetchAtRef.current = now;
    }

    const run = (async () => {
      try {
        setStatus(prev => ({ ...prev, isLoading: true, error: null }));
        try { console.log('[TitlebarSubscription] fetch start', { orgId: organization.id }); } catch { }

        let subscriptionInfo = {
          hasActiveSubscription: false,
          planName: null as string | null,
          planCode: null as string | null,
          daysRemaining: 0,
          subscriptionStatus: null as 'active' | 'trial' | 'expired' | null,
        };

        try {
          const secure = await getSecureNow(organization.id);
          const localRow = await getLocalSubscription(organization.id);
          if (localRow) {
            const localData = toSubscriptionDataFromLocal(localRow, secure.secureNowMs) as any;
            try {
              console.log('[TitlebarSubscription] local', {
                orgId: organization.id,
                secureNowMs: secure.secureNowMs,
                localRow: {
                  end_date: localRow.end_date,
                  trial_end_date: (localRow as any).trial_end_date,
                  grace_end_date: (localRow as any).grace_end_date,
                  status: localRow.status,
                  plan_id: localRow.plan_id
                },
                computed: {
                  status: localData.status,
                  plan: localData.plan_name,
                  days_left: localData.days_left,
                  end_iso: localData.end_date
                }
              });
            } catch { }
            subscriptionInfo = {
              hasActiveSubscription: localData.status === 'active' || localData.status === 'trial',
              planName: localData.plan_name || 'غير محدد',
              planCode: localData.plan_code || null,
              daysRemaining: Number(localData.days_left || 0),
              subscriptionStatus: (localData.status === 'trial' ? 'trial' : (localData.status === 'active' ? 'active' : 'expired')) as 'active' | 'trial' | 'expired',
            };
          } else if (!isOffline) {
            const { data: subData, error: subError } = await (supabase.rpc as any)('get_organization_subscription_details', {
              org_id: organization.id
            });
            if (!subError && subData && subData.subscription_id) {
              const endDate = new Date(subData.end_date);
              const now = new Date();
              const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
              try {
                console.log('[TitlebarSubscription] rpc', {
                  orgId: organization.id,
                  plan: subData.plan_name,
                  status: subData.status,
                  end_date: subData.end_date,
                  daysLeft
                });
              } catch { }
              subscriptionInfo = {
                hasActiveSubscription: true,
                planName: subData.plan_name || 'غير محدد',
                planCode: subData.plan_code || null,
                daysRemaining: daysLeft,
                subscriptionStatus: subData.status as 'active' | 'trial' | 'expired',
              };

              // ✅ Save to SQLite for offline use
              await saveLocalSubscription(organization.id, {
                ...subData,
                days_left: daysLeft
              });
            }
          }
        } catch (err) {
          console.error('Error building subscription from local/RPC:', err);
        }

        // 2. جلب معلومات حد الطلبات باستخدام RPC
        let ordersInfo = {
          hasOrdersLimit: false,
          currentOrders: 0,
          maxOrders: null as number | null,
          remainingOrders: null as number | null,
        };

        if (!isOffline) {
          try {
            const { data: limitData, error: limitError } = await (supabase.rpc as any)('check_online_orders_limit', {
              p_organization_id: organization.id
            });
            if (!limitError && limitData && limitData.current_limit !== null) {
              ordersInfo = {
                hasOrdersLimit: true,
                currentOrders: limitData.used_count || 0,
                maxOrders: limitData.current_limit,
                remainingOrders: limitData.remaining_count || 0,
              };
            }
          } catch (err) {
            console.error('Error fetching orders limit:', err);
          }
        }

        // دمج المعلومات
        const nextStatus = {
          ...subscriptionInfo,
          ...ordersInfo,
          isLoading: false,
          error: null,
        };
        try { console.log('[TitlebarSubscription] final', nextStatus); } catch { }

        // Cache successful status
        if (nextStatus.hasActiveSubscription) {
          try {
            localStorage.setItem('cached_subscription_status', JSON.stringify({
              ...nextStatus,
              timestamp: Date.now()
            }));
          } catch { }
        }

        if (isMountedRef.current) {
          setStatus(nextStatus);
        }

      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('Error fetching subscription status:', err);

        // Fallback to cache if offline and error occurred
        if (isOffline) {
          try {
            const cached = localStorage.getItem('cached_subscription_status');
            if (cached) {
              const parsed = JSON.parse(cached);
              // Use cache if less than 7 days old
              if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
                setStatus({
                  ...parsed,
                  isLoading: false,
                  error: null
                });
                return;
              }
            }
          } catch { }
        }

        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'حدث خطأ في جلب معلومات الاشتراك',
        }));
      }
    })();

    inFlightRef.current = run;
    await run;
    inFlightRef.current = null;
  }, [organization?.id, isOffline]);

  // تحديث البيانات عند تغيير المؤسسة
  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  useEffect(() => {
    const handler = () => fetchSubscriptionStatus();
    try {
      window.addEventListener('subscriptionActivated', handler as EventListener);
    } catch { }
    return () => {
      try { window.removeEventListener('subscriptionActivated', handler as EventListener); } catch { }
    };
  }, [fetchSubscriptionStatus]);

  // تحديث دوري كل 5 دقائق
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSubscriptionStatus();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSubscriptionStatus]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    ...status,
    refresh: fetchSubscriptionStatus,
  };
};
