// =====================================================
// Hook إشعارات الإحالة
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReferralService } from '@/lib/referral';
import type { ReferralNotification } from '@/types/referral';
import { useTenant } from '@/context/tenant';

const QUERY_KEY = 'referral-notifications';

export function useReferralNotifications(limit: number = 20) {
  const { organization } = useTenant();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  // جلب الإشعارات
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<{ notifications: ReferralNotification[]; unread_count: number }>({
    queryKey: [QUERY_KEY, orgId, limit],
    queryFn: async () => {
      if (!orgId) return { notifications: [], unread_count: 0 };
      return ReferralService.getNotifications(orgId, limit, false);
    },
    enabled: !!orgId,
    staleTime: 1000 * 60, // دقيقة
    refetchInterval: 1000 * 60 * 5, // كل 5 دقائق
  });

  // تحديث حالة القراءة
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!orgId) throw new Error('No organization ID');
      return ReferralService.markNotificationRead(notificationId, orgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, orgId] });
    },
  });

  // تحديث حالة قراءة جميع الإشعارات
  const markAllAsRead = async () => {
    const unreadNotifications = (data?.notifications || []).filter((n) => !n.is_read);
    await Promise.all(
      unreadNotifications.map((n) => markAsReadMutation.mutateAsync(n.id))
    );
  };

  // تنسيق أيقونة نوع الإشعار
  const getNotificationIcon = (type: string): string => {
    const icons: Record<string, string> = {
      referral_signup: '👤',
      referral_subscription: '🎉',
      points_earned: '⭐',
      tier_upgrade: '🏆',
      tier_change: '📊',
      redemption_created: '🎁',
      redemption_approved: '✅',
      redemption_rejected: '❌',
      redemption_completed: '🎊',
      code_activated: '✅',
      code_deactivated: '⚠️',
    };
    return icons[type] || '🔔';
  };

  // تنسيق الوقت النسبي
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString('ar-DZ');
  };

  return {
    // البيانات
    notifications: data?.notifications || [],
    unreadCount: data?.unread_count || 0,

    // الحالة
    isLoading,
    error,

    // الإجراءات
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead,

    // دوال مساعدة
    getNotificationIcon,
    formatRelativeTime,

    // معلومات مشتقة
    hasUnread: (data?.unread_count || 0) > 0,
    isMarkingRead: markAsReadMutation.isPending,
  };
}

export default useReferralNotifications;
