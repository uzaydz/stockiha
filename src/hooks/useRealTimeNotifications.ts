/**
 * 🔔 نظام الإشعارات الموحد (Local-First)
 * =========================================
 *
 * ⚡ v5.0 - إشعارات محلية مع Realtime للطلبات الإلكترونية فقط
 *
 * الميزات:
 * - الإشعارات المحلية تُخزن في PowerSync فقط
 * - Supabase Realtime للاستماع للطلبات الإلكترونية الجديدة فقط
 * - يتم تخزين إشعارات الطلبات محلياً بعد استقبالها
 * - أداء عالي وتجربة offline ممتازة
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { playNotificationForType, enableNotificationSounds, setNotificationVolume, initializeNotificationSounds } from '@/lib/notification-sounds';
import { useToastNotifications } from '@/hooks/useToastNotifications';
import { isAppOnline, markNetworkOffline, markNetworkOnline } from '@/utils/networkStatus';
import { offlineSyncBridge } from '@/lib/notifications/offlineSyncBridge';
import { offlineNotificationService } from '@/lib/notifications/offlineNotificationService';
import { tauriNotificationService, initializeTauriNotifications } from '@/lib/notifications/tauriNotificationService';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface NotificationItem {
  id: string;
  organization_id: string;
  type: 'new_order' | 'low_stock' | 'out_of_stock' | 'stock_restored' | 'payment_received' | 'debt_reminder' | 'debt_overdue' | 'custom';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  urgent: number;
}

interface NotificationSettings {
  enabled: boolean;
  realtimeEnabled: boolean;
  soundEnabled: boolean;
  newOrderSound: boolean;
  lowStockSound: boolean;
  toastEnabled: boolean;
  soundVolume: number;
}

const notificationsLoadInFlight = new Map<string, Promise<void>>();
const notificationsLastLoadAt = new Map<string, number>();
const NOTIFICATIONS_DEDUPE_MS = 2000;

// ═══════════════════════════════════════════════════════════════════════════
// 🪝 HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useRealTimeNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const { currentOrganization } = useTenant();
  const supabase = getSupabaseClient();
  const subscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const soundsInitializedRef = useRef(false);
  const isSubscribingRef = useRef(false);

  // إعدادات الإشعارات
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    realtimeEnabled: true,
    soundEnabled: true,
    newOrderSound: true,
    lowStockSound: true,
    toastEnabled: true,
    soundVolume: 0.5
  });

  // دمج نظام Toast
  const {
    toasts,
    removeToast,
    clearAllToasts,
    showNewOrder,
    showLowStock,
    showPaymentReceived,
    showInfo,
    updateSoundSettings,
    playTestSound
  } = useToastNotifications({
    soundEnabled: settings.soundEnabled,
    position: 'bottom-right'
  });

  // تحديث إعدادات الصوت
  useEffect(() => {
    enableNotificationSounds(settings.soundEnabled);
    setNotificationVolume(settings.soundVolume);
    updateSoundSettings(settings.soundEnabled, settings.soundVolume);
  }, [settings.soundEnabled, settings.soundVolume, updateSoundSettings]);

  // تهيئة الأصوات وإشعارات Tauri
  useEffect(() => {
    if (soundsInitializedRef.current) return;

    const initializeSoundsAndTauri = async () => {
      if (soundsInitializedRef.current) return;
      soundsInitializedRef.current = true;

      if (settings.soundEnabled) {
        try {
          await initializeNotificationSounds();
        } catch (error) {
          // تجاهل أخطاء تهيئة الأصوات
        }
      }
      try {
        await initializeTauriNotifications();
      } catch (error) {
        // تجاهل إذا لم نكن في بيئة Tauri
      }
    };

    const controller = new AbortController();

    const handleUserInteraction = () => {
      if (controller.signal.aborted) return;
      initializeSoundsAndTauri();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      controller.abort();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // 📖 تحميل الإشعارات من المحلي فقط
  // ═══════════════════════════════════════════════════════════════════════════

  const loadNotifications = useCallback(async () => {
    if (!currentOrganization?.id || !settings.enabled) {
      return;
    }

    const orgId = currentOrganization.id;
    const lastLoad = notificationsLastLoadAt.get(orgId) || 0;
    if (Date.now() - lastLoad < NOTIFICATIONS_DEDUPE_MS) {
      return;
    }

    const existing = notificationsLoadInFlight.get(orgId);
    if (existing) {
      await existing;
      return;
    }

    setLoading(true);

    const run = (async () => {
      try {
        // تهيئة خدمة الإشعارات المحلية
        await offlineNotificationService.initialize(orgId);
        await offlineSyncBridge.initialize();

        // جلب الإشعارات من المحلي فقط
        const localNotifications = await offlineNotificationService.getNotifications(
          orgId,
          { limit: 100 }
        );

        // تحويل إلى NotificationItem
        const mappedNotifications: NotificationItem[] = localNotifications.map(n => ({
          id: n.id,
          organization_id: n.organization_id,
          type: n.type as NotificationItem['type'],
          title: n.title,
          message: n.message,
          priority: n.priority,
          is_read: n.is_read,
          entity_type: n.data?.entity_type,
          entity_id: n.data?.entity_id,
          metadata: n.data,
          created_at: n.created_at,
          updated_at: n.read_at
        }));

        setNotifications(mappedNotifications);

        console.log('[Notifications] ✅ تم تحميل الإشعارات محلياً:', mappedNotifications.length);
        notificationsLastLoadAt.set(orgId, Date.now());
      } catch (error) {
        console.error('[Notifications] ❌ خطأ في تحميل الإشعارات:', error);
      } finally {
        setLoading(false);
      }
    })();

    notificationsLoadInFlight.set(orgId, run);
    try {
      await run;
    } finally {
      notificationsLoadInFlight.delete(orgId);
    }
  }, [currentOrganization?.id, settings.enabled]);

  // تحميل الإشعارات عند التهيئة
  useEffect(() => {
    if (!currentOrganization?.id) return;
    loadNotifications();
  }, [currentOrganization?.id, loadNotifications]);

  // الاستماع للإشعارات المحلية الجديدة
  useEffect(() => {
    if (!currentOrganization?.id) return;

    const unsubscribe = offlineNotificationService.subscribe((notification) => {
      const newNotif: NotificationItem = {
        id: notification.id,
        organization_id: notification.organization_id,
        type: notification.type as NotificationItem['type'],
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        is_read: notification.is_read,
        metadata: notification.data,
        created_at: notification.created_at
      };

      setNotifications(prev => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);

      // تشغيل الصوت للإشعارات المحلية (مخزون، ديون، إلخ)
      if (settings.soundEnabled && settings.lowStockSound) {
        playNotificationForType(notification.type, notification.priority).catch(() => {});
      }
    });

    return () => unsubscribe();
  }, [currentOrganization?.id, settings.soundEnabled, settings.lowStockSound]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌐 Realtime للطلبات الإلكترونية الجديدة فقط
  // ═══════════════════════════════════════════════════════════════════════════

  const reconnect = useCallback(() => {
    if (!isAppOnline()) {
      markNetworkOffline({ force: true });
      setIsRealtimeConnected(false);
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setIsRealtimeConnected(false);
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    }, delay);
  }, []);

  // إعداد Realtime للطلبات الإلكترونية الجديدة فقط
  useEffect(() => {
    if (!currentOrganization?.id || !settings.realtimeEnabled || !supabase) {
      return;
    }

    if (!isAppOnline()) {
      markNetworkOffline({ force: true });
      setIsRealtimeConnected(false);
      return;
    }

    if (typeof supabase.channel !== 'function') {
      return;
    }

    if (isSubscribingRef.current) {
      return;
    }
    isSubscribingRef.current = true;

    // إلغاء الاشتراك السابق
    if (subscriptionRef.current) {
      try {
        subscriptionRef.current.unsubscribe();
      } catch (e) {
        // تجاهل
      }
      subscriptionRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      const channelName = `orders-${currentOrganization.id}-${Date.now()}`;

      // ⚡ الاستماع للطلبات الجديدة فقط (من جدول orders)
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `organization_id=eq.${currentOrganization.id}`
          },
          async (payload) => {
            if (payload.new && payload.new.organization_id === currentOrganization.id) {
              const order = payload.new as any;

              console.log('[Notifications] 🛒 طلب إلكتروني جديد:', order.order_number || order.id);

              // إنشاء إشعار محلي للطلب الجديد
              const notification = await offlineNotificationService.createNotification(
                currentOrganization.id,
                {
                  type: 'new_order',
                  title: '🛒 طلب إلكتروني جديد',
                  message: `طلب جديد #${order.order_number || order.id} بقيمة ${order.total || 0} دج`,
                  priority: (order.total >= 10000 ? 'urgent' : 'high') as any,
                  source: 'server',
                  is_read: false,
                  data: {
                    order_id: order.id,
                    order_number: order.order_number,
                    total: order.total,
                    customer_name: order.customer_name || 'عميل'
                  },
                  action_url: `/dashboard/orders/${order.id}`,
                  action_label: 'عرض الطلب'
                }
              );

              // إشعار Tauri/Browser
              if (settings.toastEnabled) {
                tauriNotificationService.sendNotification({
                  title: notification.title,
                  body: notification.message,
                }).catch(() => {});
              }

              // تشغيل الصوت
              if (settings.soundEnabled && settings.newOrderSound) {
                playNotificationForType('new_order', notification.priority).catch(() => {});
              }

              // Toast UI
              showNewOrder({
                orderNumber: order.order_number || order.id,
                customerName: order.customer_name || 'عميل',
                total: order.total || 0
              });
            }
          }
        );

      subscriptionRef.current = channel.subscribe((status) => {
        isSubscribingRef.current = false;

        if (status === 'SUBSCRIBED') {
          markNetworkOnline();
          setIsRealtimeConnected(true);
          reconnectAttemptsRef.current = 0;
          console.log('[Notifications] ✅ متصل بـ Realtime (طلبات إلكترونية فقط)');
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          markNetworkOffline({ force: true });
          setIsRealtimeConnected(false);
          if (isAppOnline()) {
            reconnect();
          }
        }
      });

    } catch (error) {
      isSubscribingRef.current = false;
      markNetworkOffline({ force: true });
      setIsRealtimeConnected(false);
      if (isAppOnline()) {
        reconnect();
      }
    }

    return () => {
      isSubscribingRef.current = false;
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.unsubscribe();
        } catch (e) {
          // تجاهل
        }
        subscriptionRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [currentOrganization?.id, settings.realtimeEnabled, settings.newOrderSound, settings.toastEnabled, settings.soundEnabled, reconnect, supabase, showNewOrder]);

  // مراقبة حالة الشبكة
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      markNetworkOnline();
      reconnectAttemptsRef.current = 0;
      loadNotifications();
    };

    const handleOffline = () => {
      markNetworkOffline({ force: true });
      setIsRealtimeConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadNotifications]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 الإحصائيات
  // ═══════════════════════════════════════════════════════════════════════════

  const stats = useMemo<NotificationStats>(() => ({
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    urgent: notifications.filter(n => n.priority === 'urgent').length
  }), [notifications]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 📝 العمليات (محلية فقط)
  // ═══════════════════════════════════════════════════════════════════════════

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    await offlineNotificationService.markAsRead(notificationId);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await offlineNotificationService.markAllAsRead(currentOrganization.id);
  }, [currentOrganization?.id]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    await offlineNotificationService.deleteNotification(notificationId);
  }, []);

  const deleteReadNotifications = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setNotifications(prev => prev.filter(n => !n.is_read));
    await offlineNotificationService.deleteReadNotifications(currentOrganization.id);
  }, [currentOrganization?.id]);

  const clearAllNotifications = useCallback(async () => {
    if (!currentOrganization?.id) return;
    // حذف الإشعارات المقروءة فقط لأمان
    setNotifications(prev => prev.filter(n => !n.is_read));
    await offlineNotificationService.deleteReadNotifications(currentOrganization.id);
  }, [currentOrganization?.id]);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const getNotificationIcon = useCallback((type: NotificationItem['type']) => {
    switch (type) {
      case 'new_order': return '🛒';
      case 'low_stock': return '📦';
      case 'out_of_stock': return '🚫';
      case 'stock_restored': return '✅';
      case 'payment_received': return '💰';
      case 'debt_reminder': return '⏰';
      case 'debt_overdue': return '⚠️';
      default: return '🔔';
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // 📤 RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // البيانات
    notifications,
    stats,
    settings,
    isRealtimeConnected,
    loading,

    // Toast notifications
    toasts,
    removeToast,
    clearAllToasts,

    // الوظائف
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    clearAllNotifications,
    updateSettings,
    getNotificationIcon,
    loadNotifications,

    // وظائف الصوت
    playTestSound,

    // وظائف Toast
    showNewOrder,
    showLowStock,
    showPaymentReceived,
    showInfo
  };
}
