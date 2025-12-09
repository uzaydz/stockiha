/**
 * 🔒 Hook للتحقق من حدود الاشتراك
 * يوفر وظائف سهلة للتحقق من الحدود قبل إضافة عناصر جديدة
 */

import { useState, useEffect, useCallback } from 'react';
import { SubscriptionService, DEFAULT_PLAN_LIMITS, PLAN_CODES } from '@/lib/subscription-service';
import type { SubscriptionPlanLimits, PlanCode, LimitCheckResult, SubscriptionSummary } from '@/types/subscription';

interface UseSubscriptionLimitsOptions {
  organizationId: string;
  planCode?: PlanCode;
  // بيانات الاستخدام الحالي (اختياري - سيتم جلبها من الخادم إذا لم تُوفر)
  currentUsage?: {
    products?: number;
    users?: number;
    pos?: number;
    branches?: number;
    staff?: number;
    customers?: number;
    suppliers?: number;
  };
}

interface UseSubscriptionLimitsReturn {
  // الحدود
  limits: SubscriptionPlanLimits | null;
  // ملخص الاشتراك
  summary: SubscriptionSummary | null;
  // حالة التحميل
  loading: boolean;
  // خطأ إن وجد
  error: string | null;
  // دوال التحقق
  canAddProduct: () => LimitCheckResult;
  canAddUser: () => LimitCheckResult;
  canAddPOS: () => LimitCheckResult;
  canAddBranch: () => LimitCheckResult;
  canAddStaff: () => LimitCheckResult;
  canAddCustomer: () => LimitCheckResult;
  canAddSupplier: () => LimitCheckResult;
  // دالة عامة للتحقق
  checkLimit: (limitType: keyof SubscriptionPlanLimits, currentCount: number) => LimitCheckResult;
  // رسالة الحد
  getLimitMessage: (limitType: keyof SubscriptionPlanLimits, result: LimitCheckResult) => string;
  // إعادة التحميل
  refresh: () => Promise<void>;
}

export const useSubscriptionLimits = ({
  organizationId,
  planCode = 'trial',
  currentUsage = {}
}: UseSubscriptionLimitsOptions): UseSubscriptionLimitsReturn => {
  const [limits, setLimits] = useState<SubscriptionPlanLimits | null>(null);
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // جلب الحدود من الخادم
      const [serverLimits, serverSummary] = await Promise.all([
        SubscriptionService.getOrganizationLimits(organizationId),
        SubscriptionService.getSubscriptionSummary(organizationId)
      ]);

      if (serverLimits) {
        setLimits(serverLimits);
      } else {
        // استخدام الحدود المحلية
        setLimits(DEFAULT_PLAN_LIMITS[planCode] || DEFAULT_PLAN_LIMITS.trial);
      }

      if (serverSummary) {
        setSummary(serverSummary);
      }
    } catch (err) {
      console.error('Error fetching subscription limits:', err);
      setError('فشل في جلب حدود الاشتراك');
      // استخدام الحدود المحلية كـ fallback
      setLimits(DEFAULT_PLAN_LIMITS[planCode] || DEFAULT_PLAN_LIMITS.trial);
    } finally {
      setLoading(false);
    }
  }, [organizationId, planCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // دالة عامة للتحقق من الحد
  const checkLimit = useCallback((
    limitType: keyof SubscriptionPlanLimits,
    currentCount: number
  ): LimitCheckResult => {
    if (!limits) {
      return {
        allowed: false,
        current: currentCount,
        limit: 0,
        unlimited: false
      };
    }

    const maxLimit = limits[limitType];
    const unlimited = maxLimit === null;
    const allowed = unlimited || currentCount < (maxLimit || 0);
    const remaining = unlimited ? undefined : Math.max(0, (maxLimit || 0) - currentCount);

    return {
      allowed,
      current: currentCount,
      limit: maxLimit,
      remaining,
      unlimited
    };
  }, [limits]);

  // دوال التحقق المحددة
  const canAddProduct = useCallback((): LimitCheckResult => {
    const current = summary?.usage?.products ?? currentUsage.products ?? 0;
    return checkLimit('max_products', current);
  }, [checkLimit, summary, currentUsage.products]);

  const canAddUser = useCallback((): LimitCheckResult => {
    const current = summary?.usage?.users ?? currentUsage.users ?? 0;
    return checkLimit('max_users', current);
  }, [checkLimit, summary, currentUsage.users]);

  const canAddPOS = useCallback((): LimitCheckResult => {
    const current = currentUsage.pos ?? 0;
    return checkLimit('max_pos', current);
  }, [checkLimit, currentUsage.pos]);

  const canAddBranch = useCallback((): LimitCheckResult => {
    const current = currentUsage.branches ?? 0;
    return checkLimit('max_branches', current);
  }, [checkLimit, currentUsage.branches]);

  const canAddStaff = useCallback((): LimitCheckResult => {
    const current = currentUsage.staff ?? 0;
    return checkLimit('max_staff', current);
  }, [checkLimit, currentUsage.staff]);

  const canAddCustomer = useCallback((): LimitCheckResult => {
    const current = currentUsage.customers ?? 0;
    return checkLimit('max_customers', current);
  }, [checkLimit, currentUsage.customers]);

  const canAddSupplier = useCallback((): LimitCheckResult => {
    const current = currentUsage.suppliers ?? 0;
    return checkLimit('max_suppliers', current);
  }, [checkLimit, currentUsage.suppliers]);

  // رسالة الحد بالعربية
  const getLimitMessage = useCallback((
    limitType: keyof SubscriptionPlanLimits,
    result: LimitCheckResult
  ): string => {
    return SubscriptionService.getLimitMessage(limitType, result);
  }, []);

  return {
    limits,
    summary,
    loading,
    error,
    canAddProduct,
    canAddUser,
    canAddPOS,
    canAddBranch,
    canAddStaff,
    canAddCustomer,
    canAddSupplier,
    checkLimit,
    getLimitMessage,
    refresh: fetchData
  };
};

export default useSubscriptionLimits;
