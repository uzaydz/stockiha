/**
 * Hook لجلب حالة الاشتراك الحالي مع معلومات الطلبات
 * يجمع البيانات من عدة مصادر لعرضها في شريط العنوان
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { SubscriptionService } from '@/lib/subscription-service';

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

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!organization?.id) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      let subscriptionInfo = {
        hasActiveSubscription: false,
        planName: null as string | null,
        planCode: null as string | null,
        daysRemaining: 0,
        subscriptionStatus: null as 'active' | 'trial' | 'expired' | null,
      };

      // 1. جلب معلومات الاشتراك باستخدام RPC
      try {
        const { data: subData, error: subError } = await (supabase.rpc as any)('get_organization_subscription_details', {
          org_id: organization.id
        });

        if (!subError && subData && subData.subscription_id) {
          const endDate = new Date(subData.end_date);
          const now = new Date();
          const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

          subscriptionInfo = {
            hasActiveSubscription: true,
            planName: subData.plan_name || 'غير محدد',
            planCode: subData.plan_code || null,
            daysRemaining: daysLeft,
            subscriptionStatus: subData.status as 'active' | 'trial' | 'expired',
          };
        } else {
          // التحقق من الفترة التجريبية
          const daysLeftInfo = await SubscriptionService.calculateTotalDaysLeft(organization);
          if (daysLeftInfo.status === 'trial' && daysLeftInfo.trialDaysLeft > 0) {
            subscriptionInfo = {
              hasActiveSubscription: false,
              planName: 'فترة تجريبية',
              planCode: 'trial',
              daysRemaining: daysLeftInfo.trialDaysLeft,
              subscriptionStatus: 'trial',
            };
          }
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
      }

      // 2. جلب معلومات حد الطلبات باستخدام RPC
      let ordersInfo = {
        hasOrdersLimit: false,
        currentOrders: 0,
        maxOrders: null as number | null,
        remainingOrders: null as number | null,
      };

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

      // دمج المعلومات
      setStatus({
        ...subscriptionInfo,
        ...ordersInfo,
        isLoading: false,
        error: null,
      });

    } catch (err) {
      console.error('Error fetching subscription status:', err);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'حدث خطأ في جلب معلومات الاشتراك',
      }));
    }
  }, [organization?.id]);

  // تحديث البيانات عند تغيير المؤسسة
  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  // تحديث دوري كل 5 دقائق
  useEffect(() => {
    const interval = setInterval(fetchSubscriptionStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSubscriptionStatus]);

  return {
    ...status,
    refresh: fetchSubscriptionStatus,
  };
};
