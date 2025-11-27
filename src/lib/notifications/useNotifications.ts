/**
 * React Hook موحد للإشعارات
 *
 * يوفر:
 * - إدارة مركزية لجميع الإشعارات
 * - تهيئة تلقائية للخدمات
 * - حالة محدثة
 * - وظائف مساعدة
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  offlineNotificationService,
  OfflineNotification,
  NotificationType,
  NotificationPriority,
  NotificationSettings
} from './offlineNotificationService';
import { orderNotificationService, OrderNotificationSettings } from './orderNotificationService';
import { customerNotificationService, CustomerNotificationSettings } from './customerNotificationService';

// حالة الإشعارات
export interface NotificationsState {
  notifications: OfflineNotification[];
  unreadCount: number;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

// خيارات الفلترة
export interface NotificationFilterOptions {
  types?: NotificationType[];
  priority?: NotificationPriority;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

// إعدادات الإشعارات الموحدة
export interface UnifiedNotificationSettings {
  general: NotificationSettings;
  orders: OrderNotificationSettings;
  customers: CustomerNotificationSettings;
}

// إحصائيات الإشعارات
export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

/**
 * Hook الإشعارات الرئيسي
 */
export function useNotifications(organizationId: string | undefined) {
  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    unreadCount: 0,
    isLoading: true,
    isInitialized: false,
    error: null
  });

  const initializingRef = useRef(false);

  // تهيئة الخدمات
  useEffect(() => {
    if (!organizationId || initializingRef.current || state.isInitialized) return;

    initializingRef.current = true;

    const initialize = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // تهيئة جميع الخدمات بالتوازي
        await Promise.all([
          offlineNotificationService.initialize(organizationId),
          orderNotificationService.initialize(organizationId),
          customerNotificationService.initialize(organizationId)
        ]);

        // جلب الإشعارات الأولية
        const notifications = await offlineNotificationService.getNotifications(organizationId, {
          limit: 50
        });
        const unreadCount = await offlineNotificationService.getUnreadCount(organizationId);

        setState({
          notifications,
          unreadCount,
          isLoading: false,
          isInitialized: true,
          error: null
        });

        console.log('[useNotifications] Initialized successfully');
      } catch (error: any) {
        console.error('[useNotifications] Initialization error:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'فشل في تهيئة الإشعارات'
        }));
      } finally {
        initializingRef.current = false;
      }
    };

    initialize();
  }, [organizationId]);

  // الاستماع للإشعارات الجديدة
  useEffect(() => {
    if (!organizationId) return;

    const unsubscribe = offlineNotificationService.subscribe((notification) => {
      if (notification.organization_id === organizationId) {
        setState(prev => ({
          ...prev,
          notifications: [notification, ...prev.notifications.slice(0, 49)],
          unreadCount: prev.unreadCount + 1
        }));
      }
    });

    return unsubscribe;
  }, [organizationId]);

  // جلب الإشعارات
  const fetchNotifications = useCallback(async (options: NotificationFilterOptions = {}) => {
    if (!organizationId) return [];

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const notifications = await offlineNotificationService.getNotifications(organizationId, options);
      const unreadCount = await offlineNotificationService.getUnreadCount(organizationId);

      setState(prev => ({
        ...prev,
        notifications,
        unreadCount,
        isLoading: false
      }));

      return notifications;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      return [];
    }
  }, [organizationId]);

  // تعليم كمقروء
  const markAsRead = useCallback(async (notificationId: string) => {
    await offlineNotificationService.markAsRead(notificationId);
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1)
    }));
  }, []);

  // تعليم الكل كمقروء
  const markAllAsRead = useCallback(async () => {
    if (!organizationId) return;

    await offlineNotificationService.markAllAsRead(organizationId);
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0
    }));
  }, [organizationId]);

  // حذف إشعار
  const deleteNotification = useCallback(async (notificationId: string) => {
    const notification = state.notifications.find(n => n.id === notificationId);
    await offlineNotificationService.deleteNotification(notificationId);
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== notificationId),
      unreadCount: notification && !notification.is_read
        ? Math.max(0, prev.unreadCount - 1)
        : prev.unreadCount
    }));
  }, [state.notifications]);

  // إنشاء إشعار مخصص
  const createNotification = useCallback(async (
    notification: Omit<OfflineNotification, 'id' | 'organization_id' | 'created_at' | 'sync_status' | 'retry_count' | 'status'>
  ) => {
    if (!organizationId) return null;

    return offlineNotificationService.createNotification(organizationId, notification);
  }, [organizationId]);

  // جلب الإحصائيات
  const getStats = useCallback(async (): Promise<NotificationStats> => {
    const byType: Record<NotificationType, number> = {} as any;
    const byPriority: Record<NotificationPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    };

    state.notifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
      byPriority[n.priority]++;
    });

    return {
      total: state.notifications.length,
      unread: state.unreadCount,
      byType,
      byPriority
    };
  }, [state.notifications, state.unreadCount]);

  // تحديث الإعدادات
  const updateSettings = useCallback(async (settings: Partial<NotificationSettings>) => {
    if (!organizationId) return;
    await offlineNotificationService.saveSettings(organizationId, settings);
  }, [organizationId]);

  // فحص المخزون المنخفض يدوياً
  const checkLowStock = useCallback(async () => {
    if (!organizationId) return;
    await offlineNotificationService.checkLowStock(organizationId);
  }, [organizationId]);

  // فحص الديون يدوياً
  const checkDebts = useCallback(async () => {
    if (!organizationId) return;
    await customerNotificationService.checkDebtReminders(organizationId);
  }, [organizationId]);

  // تنظيف
  useEffect(() => {
    return () => {
      // لا نوقف الخدمات عند إلغاء تحميل المكون
      // لأنها singleton ويجب أن تستمر في العمل
    };
  }, []);

  return {
    // الحالة
    ...state,

    // الوظائف
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    getStats,
    updateSettings,
    checkLowStock,
    checkDebts,

    // المرجع للخدمات المباشرة
    services: {
      offline: offlineNotificationService,
      orders: orderNotificationService,
      customers: customerNotificationService
    }
  };
}

/**
 * Hook مختصر لعدد غير المقروء
 */
export function useUnreadCount(organizationId: string | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!organizationId) return;

    // جلب العدد الأولي
    offlineNotificationService.getUnreadCount(organizationId).then(setCount);

    // الاستماع للتحديثات
    const unsubscribe = offlineNotificationService.subscribe((notification) => {
      if (notification.organization_id === organizationId && !notification.is_read) {
        setCount(prev => prev + 1);
      }
    });

    return unsubscribe;
  }, [organizationId]);

  return count;
}

/**
 * Hook للإشعارات حسب النوع
 */
export function useNotificationsByType(
  organizationId: string | undefined,
  types: NotificationType[]
) {
  const [notifications, setNotifications] = useState<OfflineNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;

    setIsLoading(true);
    offlineNotificationService.getNotifications(organizationId, { types })
      .then(setNotifications)
      .finally(() => setIsLoading(false));

    const unsubscribe = offlineNotificationService.subscribe((notification) => {
      if (
        notification.organization_id === organizationId &&
        types.includes(notification.type)
      ) {
        setNotifications(prev => [notification, ...prev]);
      }
    });

    return unsubscribe;
  }, [organizationId, types.join(',')]);

  return { notifications, isLoading };
}

/**
 * Hook لإحصائيات الديون
 */
export function useDebtStats(organizationId: string | undefined) {
  const [stats, setStats] = useState<{
    total: number;
    overdue: number;
    dueThisWeek: number;
    dueThisMonth: number;
    totalAmount: number;
    overdueAmount: number;
  } | null>(null);

  useEffect(() => {
    if (!organizationId) return;

    customerNotificationService.getDebtStats(organizationId).then(setStats);

    // تحديث كل 5 دقائق
    const interval = setInterval(() => {
      customerNotificationService.getDebtStats(organizationId).then(setStats);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [organizationId]);

  return stats;
}

/**
 * Hook للإشعارات العاجلة فقط
 */
export function useUrgentNotifications(organizationId: string | undefined) {
  return useNotificationsByType(organizationId, [
    'out_of_stock',
    'debt_overdue',
    'subscription_expiry'
  ]);
}
