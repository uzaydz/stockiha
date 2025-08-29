/**
 * Hook للتحقق من حدود الطلبيات الإلكترونية
 * خاص بخطة التجار الإلكترونيين المبتدئين
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface OnlineOrdersLimit {
  canOrder: boolean;
  currentOrders: number;
  maxOrders: number | null;
  remainingOrders: number | null;
  isBlocked: boolean;
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

    try {
      setLoading(true);
      setError(null);

      // استدعاء دالة قاعدة البيانات للتحقق من الحدود
      const { data, error: rpcError } = await supabase.rpc('check_online_orders_limit', {
        p_organization_id: organization.id
      });

      if (rpcError) {
        throw rpcError;
      }

      if (data) {
        setLimitInfo({
          canOrder: !data.is_limit_exceeded,
          currentOrders: data.used_count || 0,
          maxOrders: data.current_limit,
          remainingOrders: data.remaining_count,
          isBlocked: data.is_limit_exceeded,
          message: data.message
        });
      }

    } catch (err) {
      console.error('خطأ في التحقق من حدود الطلبيات:', err);
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
