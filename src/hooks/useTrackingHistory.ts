/**
 * ============================================
 * useTrackingHistory Hook
 * ============================================
 * Hook مخصص لإدارة تتبع شحنات ياليدين مع:
 * - Smart Caching
 * - Auto Refresh
 * - Optimistic Updates
 * - Error Handling
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/components/ui/use-toast';
import {
  getStoredTrackingHistory,
  refreshTrackingHistory,
  getLatestTrackingStatus,
} from '@/api/yalidine/trackingService';
import type { YalidineDeliveryHistory } from '@/types/yalidineTracking';
import { isFinalStatus } from '@/types/yalidineTracking';

// ============================================
// Query Keys
// ============================================

export const trackingQueryKeys = {
  all: ['tracking'] as const,
  history: (orderId: string) => ['tracking', 'history', orderId] as const,
  latest: (orderId: string) => ['tracking', 'latest', orderId] as const,
};

// ============================================
// Hook Options
// ============================================

interface UseTrackingHistoryOptions {
  orderId: string;
  trackingNumber: string | null;
  /** تمكين التحديث التلقائي */
  enableAutoRefresh?: boolean;
  /** فترة التحديث التلقائي (milliseconds) */
  refetchInterval?: number | false;
  /** تحميل البيانات فقط عند الطلب (lazy loading) */
  lazy?: boolean;
}

// ============================================
// Main Hook
// ============================================

export function useTrackingHistory({
  orderId,
  trackingNumber,
  enableAutoRefresh = false,
  refetchInterval = false,
  lazy = true,
}: UseTrackingHistoryOptions) {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ============================================
  // Query: جلب سجل التتبع
  // ============================================

  const {
    data: history,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: trackingQueryKeys.history(orderId),
    queryFn: () => getStoredTrackingHistory(orderId),

    // تمكين الاستعلام فقط إذا:
    // 1. يوجد tracking number
    // 2. lazy = false أو تم طلب البيانات صراحةً
    enabled: !!trackingNumber && !lazy,

    // Caching & Refetching
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 30 * 60 * 1000, // 30 دقيقة (cacheTime سابقاً)

    // Auto refetch للطلبات النشطة
    refetchInterval: enableAutoRefresh
      ? refetchInterval || getRefetchInterval(history)
      : false,

    // إعادة الجلب عند العودة للنافذة (للطلبات النشطة فقط)
    refetchOnWindowFocus: (query) => {
      const data = query.state.data as YalidineDeliveryHistory[] | undefined;
      return data && data.length > 0 ? !isFinalStatus(data[0].status_normalized || '') : false;
    },

    // معالجة الأخطاء
    retry: (failureCount, error: any) => {
      // لا نعيد المحاولة في حالة 404 أو 401
      if (error?.response?.status === 404 || error?.response?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },

    onError: (error: any) => {
      console.error('[useTrackingHistory] خطأ في جلب السجل:', error);
    },
  });

  // ============================================
  // Query: جلب آخر حالة فقط (أخف)
  // ============================================

  const { data: latestStatus } = useQuery({
    queryKey: trackingQueryKeys.latest(orderId),
    queryFn: () => getLatestTrackingStatus(orderId),
    enabled: !!trackingNumber && lazy, // فقط في وضع lazy
    staleTime: 5 * 60 * 1000,
  });

  // ============================================
  // Mutation: تحديث سجل التتبع
  // ============================================

  const refreshMutation = useMutation({
    mutationFn: async (forceRefresh: boolean = false) => {
      if (!trackingNumber || !currentOrganization?.id) {
        throw new Error('معلومات غير كاملة للتحديث');
      }

      return refreshTrackingHistory(
        currentOrganization.id,
        orderId,
        trackingNumber,
        forceRefresh
      );
    },

    onMutate: async () => {
      // إلغاء أي استعلامات قيد التنفيذ
      await queryClient.cancelQueries({
        queryKey: trackingQueryKeys.history(orderId),
      });
    },

    onSuccess: (data) => {
      // تحديث الكاش
      queryClient.setQueryData(trackingQueryKeys.history(orderId), data);
      queryClient.setQueryData(trackingQueryKeys.latest(orderId), data[0] || null);

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث معلومات التتبع بنجاح',
        duration: 3000,
      });
    },

    onError: (error: any) => {
      console.error('[useTrackingHistory] خطأ في التحديث:', error);

      toast({
        title: 'خطأ في التحديث',
        description: error.message || 'فشل تحديث معلومات التتبع. يرجى المحاولة لاحقاً',
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  // ============================================
  // Helper Functions
  // ============================================

  /**
   * تحميل البيانات (في وضع lazy)
   */
  const loadHistory = useCallback(() => {
    if (!trackingNumber) return;

    // إذا كانت البيانات موجودة في الكاش، لا نحتاج إعادة الجلب
    const cachedData = queryClient.getQueryData(trackingQueryKeys.history(orderId));
    if (cachedData) {
      return;
    }

    // جلب البيانات
    refetch();
  }, [orderId, trackingNumber, queryClient, refetch]);

  /**
   * تحديث مع تفعيل force
   */
  const forceRefresh = useCallback(() => {
    refreshMutation.mutate(true);
  }, [refreshMutation]);

  /**
   * تحديث عادي (يتحقق من الكاش أولاً)
   */
  const refresh = useCallback(() => {
    refreshMutation.mutate(false);
  }, [refreshMutation]);

  /**
   * إبطال الكاش وإعادة الجلب
   */
  const invalidateAndRefetch = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: trackingQueryKeys.history(orderId),
    });
    refetch();
  }, [orderId, queryClient, refetch]);

  // ============================================
  // Computed Values
  // ============================================

  const latestEvent = history?.[0] || latestStatus || null;
  const hasHistory = !!(history && history.length > 0);
  const isRefreshing = refreshMutation.isPending;
  const canRefresh = !!trackingNumber && !isRefreshing;

  // التحقق من كون الحالة نهائية
  const isFinal = latestEvent
    ? isFinalStatus(latestEvent.status_normalized || '')
    : false;

  return {
    // البيانات
    history: history || [],
    latestEvent,
    hasHistory,

    // حالات التحميل
    isLoading,
    isFetching,
    isRefreshing,
    error,

    // الحالة
    isFinal,
    canRefresh,

    // الإجراءات
    loadHistory,      // تحميل البيانات (lazy)
    refresh,          // تحديث عادي
    forceRefresh,     // تحديث إجباري
    invalidateAndRefetch, // إبطال وإعادة الجلب
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * حساب فترة التحديث التلقائي المناسبة حسب الحالة
 */
function getRefetchInterval(
  history: YalidineDeliveryHistory[] | undefined
): number | false {
  if (!history || history.length === 0) return false;

  const latestStatus = history[0].status_normalized;

  // لا نحدث الحالات النهائية
  if (isFinalStatus(latestStatus || '')) {
    return false;
  }

  // حالات نشطة جداً (في طريق التوصيل)
  if (latestStatus === 'out_for_delivery') {
    return 2 * 60 * 1000; // كل دقيقتين
  }

  // حالات نشطة (في المركز، قيد النقل)
  if (['in_transit', 'transferred', 'picked_up'].includes(latestStatus || '')) {
    return 10 * 60 * 1000; // كل 10 دقائق
  }

  // حالات أخرى
  return 30 * 60 * 1000; // كل 30 دقيقة
}

// ============================================
// Batch Hook (للطلبات المتعددة)
// ============================================

/**
 * Hook لتحديث مجموعة من الطلبات
 */
export function useBatchTrackingRefresh() {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orders: Array<{ id: string; trackingNumber: string }>) => {
      if (!currentOrganization?.id) {
        throw new Error('لم يتم تحديد المؤسسة');
      }

      const { refreshMultipleTrackings } = await import('@/api/yalidine/trackingService');

      return refreshMultipleTrackings(currentOrganization.id, orders);
    },

    onSuccess: (results) => {
      // إبطال جميع استعلامات التتبع
      queryClient.invalidateQueries({
        queryKey: trackingQueryKeys.all,
      });

      toast({
        title: 'تم التحديث الجماعي',
        description: `نجح: ${results.success} | فشل: ${results.failed}`,
      });
    },

    onError: (error: any) => {
      toast({
        title: 'خطأ في التحديث الجماعي',
        description: error.message || 'فشل التحديث',
        variant: 'destructive',
      });
    },
  });
}
