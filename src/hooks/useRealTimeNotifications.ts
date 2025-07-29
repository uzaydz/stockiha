/**
 * 🔔 نظام الإشعارات الفوري المتقدم
 * يراقب الطلبات الجديدة والمخزون المنخفض بشكل فوري وذكي
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { playNotificationForType, enableNotificationSounds, setNotificationVolume } from '@/lib/notification-sounds';
import { useToastNotifications } from '@/hooks/useToastNotifications';

export interface NotificationItem {
  id: string;
  type: 'new_order' | 'low_stock' | 'payment_received' | 'order_status_change';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
  organization_id: string;
  action?: {
    link?: string;
    label?: string;
  };
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

  // تحميل الإشعارات
  const loadNotifications = useCallback(async () => {
    if (!currentOrganization?.id || !settings.enabled) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return;
      }

      if (data) {
        setNotifications(data);
      }
    } catch (error) {
    }
  }, [currentOrganization?.id, settings.enabled, supabase]);

  // إعداد الاشتراك في الوقت الفعلي مع آلية إعادة المحاولة
  useEffect(() => {
    if (!currentOrganization?.id || !settings.realtimeEnabled || !supabase) {
      return;
    }

    if (typeof supabase.channel !== 'function') {
      return;
    }

    let retryTimeoutId: NodeJS.Timeout;

    // إلغاء الاشتراك السابق
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    try {
      const channel = supabase.channel(`notifications-${currentOrganization.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `organization_id=eq.${currentOrganization.id}`
          },
          (payload) => {
            
            const newNotification = payload.new as NotificationItem;
            
            // إضافة الإشعار للقائمة
            setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
            
            // تشغيل الصوت حسب النوع والإعدادات
            if (settings.soundEnabled) {
              const shouldPlaySound = 
                (newNotification.type === 'new_order' && settings.newOrderSound) ||
                (newNotification.type === 'low_stock' && settings.lowStockSound) ||
                newNotification.type === 'payment_received' ||
                newNotification.type === 'order_status_change';
              
              if (shouldPlaySound) {
                playNotificationForType(newNotification.type, newNotification.priority);
              }
            }
            
            // عرض Toast إذا كان مفعلاً
            if (settings.toastEnabled) {
              switch (newNotification.type) {
                case 'new_order':
                  showNewOrder(newNotification.title, newNotification.message, {
                    priority: newNotification.priority,
                    action: newNotification.action ? {
                      label: newNotification.action.label || 'عرض',
                      onClick: () => {
                        if (newNotification.action?.link) {
                          window.location.href = newNotification.action.link;
                        }
                      }
                    } : undefined
                  });
                  break;
                  
                case 'low_stock':
                  showLowStock(newNotification.title, newNotification.message, {
                    priority: newNotification.priority
                  });
                  break;
                  
                case 'payment_received':
                  showPaymentReceived(newNotification.title, newNotification.message, {
                    priority: newNotification.priority
                  });
                  break;
                  
                default:
                  showInfo(newNotification.title, newNotification.message, {
                    priority: newNotification.priority
                  });
              }
            }
          }
        )
        .subscribe((status) => {
          // تقليل رسائل التشخيص لتجنب الإزعاج
          if (status === 'SUBSCRIBED') {
            setIsRealtimeConnected(true);
          } else if (status === 'CHANNEL_ERROR') {
            // تجنب تكرار رسائل الخطأ
            if (isRealtimeConnected) {
            }
            setIsRealtimeConnected(false);
          } else if (status === 'CLOSED') {
            setIsRealtimeConnected(false);
          }
        });

      subscriptionRef.current = channel;

    } catch (error) {
      setIsRealtimeConnected(false);
    }

    // تنظيف عند الإلغاء
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [currentOrganization?.id, settings.realtimeEnabled, settings.soundEnabled, settings.newOrderSound, settings.lowStockSound, settings.toastEnabled, supabase, showNewOrder, showLowStock, showPaymentReceived, showInfo]);

  // تحميل الإشعارات عند التهيئة
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // حساب الإحصائيات
  const stats: NotificationStats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    urgent: notifications.filter(n => n.priority === 'urgent').length
  };

  // وضع علامة مقروءة
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        return;
      }

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
    }
  }, [supabase]);

  // وضع علامة مقروءة للكل
  const markAllAsRead = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('organization_id', currentOrganization.id)
        .eq('is_read', false);

      if (error) {
        return;
      }

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
    }
  }, [currentOrganization?.id, supabase]);

  // حذف إشعار
  const removeNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        return;
      }

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
    }
  }, [supabase]);

  // مسح جميع الإشعارات
  const clearAllNotifications = useCallback(async () => {
    if (!currentOrganization?.id) {
      return;
    }

    try {
      // أولاً، جلب الإشعارات المراد حذفها للتأكد
      const { data: notificationsToDelete, error: fetchError } = await supabase
        .from('notifications')
        .select('id, title, type')
        .eq('organization_id', currentOrganization.id);

      if (fetchError) {
        return;
      }

      // الآن حذف الإشعارات
      const { data: deleteResult, error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('organization_id', currentOrganization.id)
        .select(); // إضافة select() لرؤية ما تم حذفه

      if (deleteError) {
        return;
      }

      // تحديث الواجهة الأمامية
      setNotifications([]);

      // إعادة تحميل الإشعارات للتأكد
      setTimeout(() => {
        loadNotifications();
      }, 1000);

    } catch (error) {
    }
  }, [currentOrganization?.id, supabase, notifications.length, loadNotifications]);

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
    removeNotification,
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
