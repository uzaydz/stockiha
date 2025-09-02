/**
 * Hook للتحقق من حدود الطلبيات الإلكترونية
 * خاص بخطة التجار الإلكترونيين المبتدئين
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { localCache } from '@/lib/cacheManager';

interface OnlineOrdersLimit {
  canOrder: boolean;
  currentOrders: number;
  maxOrders: number | null;
  remainingOrders: number | null;
  isBlocked: boolean;
  message?: string;
}

interface OnlineOrdersLimitResponse {
  is_limit_exceeded: boolean;
  used_count: number;
  current_limit: number | null;
  remaining_count: number | null;
  message?: string;
}

interface OnlineOrdersLimitHook {
  limitInfo: OnlineOrdersLimit | null;
  loading: boolean;
  error: string | null;
  checkLimit: () => Promise<void>;
  refreshLimit: () => Promise<void>;
}

export const useOnlineOrdersLimit = (): OnlineOrdersLimitHook => {
  const { organization } = useAuth();
  const [limitInfo, setLimitInfo] = useState<OnlineOrdersLimit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkLimit = useCallback(async () => {
    if (!organization?.id) {
      setError('لا توجد مؤسسة محددة');
      return;
    }

    const cacheKey = `online_orders_limit_${organization.id}`;

    // التحقق من الكاش أولاً
    const cachedLimitInfo = localCache.get<OnlineOrdersLimit>(cacheKey);
    if (cachedLimitInfo) {
      setLimitInfo(cachedLimitInfo);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // استدعاء دالة قاعدة البيانات للتحقق من الحدود
      const { data, error: rpcError } = await (supabase as any).rpc('check_online_orders_limit', {
        p_organization_id: organization.id
      });

      if (rpcError) {
        throw rpcError;
      }

      if (data) {
        const typedData = data as OnlineOrdersLimitResponse;
        const limitData = {
          canOrder: !typedData.is_limit_exceeded,
          currentOrders: typedData.used_count || 0,
          maxOrders: typedData.current_limit,
          remainingOrders: typedData.remaining_count,
          isBlocked: typedData.is_limit_exceeded,
          message: typedData.message
        };

        setLimitInfo(limitData);
        // حفظ في الكاش لمدة 5 دقائق
        localCache.set(cacheKey, limitData, 5 * 60 * 1000);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const refreshLimit = useCallback(async () => {
    await checkLimit();
  }, [checkLimit]);

  // التحقق التلقائي عند تحميل المكون
  useEffect(() => {
    if (organization?.id) {
      checkLimit();
    }
  }, [organization?.id, checkLimit]);

  return {
    limitInfo,
    loading,
    error,
    checkLimit,
    refreshLimit
  };
};
