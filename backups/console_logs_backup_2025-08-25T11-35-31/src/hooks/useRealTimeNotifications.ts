/**
 * 🔔 نظام الإشعارات الفوري المتقدم
 * يراقب الطلبات الجديدة والمخزون المنخفض بشكل فوري وذكي
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { playNotificationForType, enableNotificationSounds, setNotificationVolume, initializeNotificationSounds } from '@/lib/notification-sounds';
import { useToastNotifications } from '@/hooks/useToastNotifications';

// Define the notification interface based on the migration schema
export interface NotificationItem {
  id: string;
  organization_id: string;
  type: 'new_order' | 'low_stock' | 'payment_received' | 'order_status_change';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
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

export function useRealTimeNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const { currentOrganization } = useTenant();
  const supabase = getSupabaseClient();
  const subscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // إعدادات الإشعارات مع القيم الافتراضية
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
    addToast,
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

  // تحديث إعدادات الصوت عند تغيير الإعدادات
  useEffect(() => {
    enableNotificationSounds(settings.soundEnabled);
    setNotificationVolume(settings.soundVolume);
    updateSoundSettings(settings.soundEnabled, settings.soundVolume);
  }, [settings.soundEnabled, settings.soundVolume, updateSoundSettings]);

  // تهيئة الأصوات عند تفاعل المستخدم
  useEffect(() => {
    const initializeSounds = async () => {
      if (settings.soundEnabled) {
        try {
          await initializeNotificationSounds();
        } catch (error) {
          console.warn('Failed to initialize notification sounds:', error);
        }
      }
    };

    // تهيئة الأصوات عند أول تفاعل مع المستخدم
    const handleUserInteraction = () => {
      initializeSounds();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [settings.soundEnabled]);

  // تحميل الإشعارات
  const loadNotifications = useCallback(async () => {
    if (!currentOrganization?.id || !settings.enabled) return;

    try {
      // Use raw SQL to bypass strict typing
      const { data, error } = await supabase
        .from('notifications' as any)
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      if (data) {
        setNotifications(data as unknown as NotificationItem[]);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [currentOrganization?.id, settings.enabled, supabase]);

  // دالة إعادة الاتصال المحسنة
  const reconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('❌ [Realtime] Max reconnection attempts reached');
      setIsRealtimeConnected(false);
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    console.log(`🔄 [Realtime] Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      // إعادة إنشاء الاشتراك
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    }, delay);
  }, []);

  // إعداد الاشتراك في الوقت الفعلي مع آلية إعادة المحاولة المحسنة
  useEffect(() => {
    if (!currentOrganization?.id || !settings.realtimeEnabled || !supabase) {
      return;
    }

    if (typeof supabase.channel !== 'function') {
      console.error('⛔️ [Realtime] supabase.channel is not a function');
      return;
    }

    // إلغاء الاشتراك السابق
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // إلغاء timeout إعادة الاتصال السابق
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      // استخدام طريقة أبسط للاشتراك بدون presence أو broadcast
      const channelName = `notifications-${currentOrganization.id}-${Date.now()}`;
      
      const channel = supabase
        .channel(channelName, {
          config: {
            presence: {
              key: currentOrganization.id,
            },
          },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `organization_id=eq.${currentOrganization.id}`
          },
          (payload) => {
            if (payload.new && payload.new.organization_id === currentOrganization.id) {
              const newNotification = payload.new as NotificationItem;
              
              // إضافة الإشعار الجديد إلى البداية
              setNotifications(prev => {
                const filtered = prev.filter(n => n.id !== newNotification.id);
                return [newNotification, ...filtered];
              });
              
              // تشغيل الصوت إذا كان مفعل
              if (settings.newOrderSound) {
                playNotificationForType(newNotification.type, newNotification.priority).catch(error => {
                  console.warn('Failed to play notification sound:', error);
                });
              }
              
              // إظهار إشعار المتصفح إذا كان مفعل
              if (settings.toastEnabled && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                  new Notification(newNotification.title, {
                    body: newNotification.message,
                    icon: '/favicon.ico'
                  });
                }
              }
            }
          }
        );

      // الاشتراك مع معالجة الأخطاء المحسنة
      subscriptionRef.current = channel.subscribe((status) => {
        console.log(`🔔 [Realtime] Channel status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Realtime] Successfully connected');
          setIsRealtimeConnected(true);
          reconnectAttemptsRef.current = 0; // إعادة تعيين عداد المحاولات
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Realtime] Channel error - trying to reconnect...');
          setIsRealtimeConnected(false);
          reconnect();
        } else if (status === 'CLOSED') {
          console.warn('⚠️ [Realtime] Channel closed - trying to reconnect...');
          setIsRealtimeConnected(false);
          reconnect();
        } else if (status === 'TIMED_OUT') {
          console.warn('⏰ [Realtime] Channel timed out - trying to reconnect...');
          setIsRealtimeConnected(false);
          reconnect();
        }
      });

    } catch (error) {
      console.error('❌ [Realtime] Error creating subscription:', error);
      setIsRealtimeConnected(false);
      reconnect();
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [currentOrganization?.id, settings.realtimeEnabled, settings.newOrderSound, settings.toastEnabled, reconnect]);

  // تحميل الإشعارات عند التهيئة
  useEffect(() => {
    if (!currentOrganization?.id) return;

    const loadNotifications = async () => {
      try {
        // Use raw SQL to bypass strict typing
        const { data, error } = await supabase
          .from('notifications' as any)
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error loading notifications:', error);
          return;
        }

        setNotifications((data || []) as unknown as NotificationItem[]);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();
  }, [currentOrganization?.id]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.is_read).length;
    const urgent = notifications.filter(n => n.priority === 'urgent').length;
    
    return { total, unread, urgent };
  }, [notifications]);

  // تحديث حالة القراءة
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [supabase]);

  // تحديث حالة القراءة للجميع
  const markAllAsRead = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ is_read: true })
        .eq('organization_id', currentOrganization?.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [currentOrganization?.id, supabase]);

  // حذف الإشعار
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications' as any)
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return;
      }

      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [supabase]);

  // حذف جميع الإشعارات المقروءة
  const deleteReadNotifications = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('notifications' as any)
        .delete()
        .eq('organization_id', currentOrganization?.id)
        .eq('is_read', true);

      if (error) {
        console.error('Error deleting read notifications:', error);
        return;
      }

      setNotifications(prev => 
        prev.filter(n => !n.is_read)
      );
    } catch (error) {
      console.error('Error deleting read notifications:', error);
    }
  }, [currentOrganization?.id, supabase]);

  // مسح جميع الإشعارات
  const clearAllNotifications = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('notifications' as any)
        .delete()
        .eq('organization_id', currentOrganization?.id);

      if (error) {
        console.error('Error clearing all notifications:', error);
        return;
      }

      setNotifications([]);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  }, [currentOrganization?.id, supabase]);

  // تحديث الإعدادات
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // الحصول على أيقونة الإشعار
  const getNotificationIcon = useCallback((type: NotificationItem['type']) => {
    switch (type) {
      case 'new_order': return '🛒';
      case 'low_stock': return '📦';
      case 'payment_received': return '💰';
      case 'order_status_change': return '📋';
      default: return '🔔';
    }
  }, []);

  return {
    // البيانات
    notifications,
    stats,
    settings,
    isRealtimeConnected,
    
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
