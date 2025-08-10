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
  // إضافة متغير لمنع الاتصال المكرر
  const isConnectingRef = useRef(false);
  
  // إضافة مراجع جديدة لمنع التكرار
  const hasLoadedRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastOrganizationIdRef = useRef<string | null>(null);

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

  // تحميل الإشعارات - نسخة محسنة
  const loadNotifications = useCallback(async () => {
    if (!currentOrganization?.id || !settings.enabled) return;

    // منع التحميل المتكرر
    const now = Date.now();
    if (hasLoadedRef.current && (now - lastLoadTimeRef.current) < 5000) {
      return;
    }

    // منع التحميل إذا لم تتغير المنظمة
    if (lastOrganizationIdRef.current === currentOrganization.id && hasLoadedRef.current) {
      return;
    }

    try {
      hasLoadedRef.current = true;
      lastLoadTimeRef.current = now;
      lastOrganizationIdRef.current = currentOrganization.id;

      // Use raw SQL to bypass strict typing
      const { data, error } = await supabase
        .from('notifications' as any)
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return;
      }

      if (data) {
        setNotifications(data as unknown as NotificationItem[]);
      }
    } catch (error) {
    }
  }, [currentOrganization?.id, settings.enabled, supabase]);

  // دالة إعادة الاتصال المحسنة
  const reconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setIsRealtimeConnected(false);
      isConnectingRef.current = false;
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      isConnectingRef.current = false;
      // إعادة إنشاء الاشتراك
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    }, delay);
  }, [maxReconnectAttempts]);

  // إعداد الاشتراك في الوقت الفعلي مع آلية إعادة المحاولة المحسنة
  useEffect(() => {
    if (!currentOrganization?.id || !settings.realtimeEnabled || !supabase) {
      return;
    }

    // منع الاتصال المكرر
    if (isConnectingRef.current || subscriptionRef.current) {
      return;
    }

    if (typeof supabase.channel !== 'function') {
      return;
    }

    // تعطيل Realtime مؤقتاً إذا كان هناك مشاكل متكررة
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setIsRealtimeConnected(false);
      return;
    }

    try {
      isConnectingRef.current = true;
      
      const channel = supabase
        .channel(`notifications_${currentOrganization.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${currentOrganization.id}`
        }, (payload) => {
          // معالجة الإشعارات الجديدة
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as NotificationItem;
            setNotifications(prev => [newNotification, ...prev]);
            
            // إظهار toast حسب نوع الإشعار
            if (settings.toastEnabled) {
              switch (newNotification.type) {
                case 'new_order':
                  if (settings.newOrderSound) {
                    showNewOrder(newNotification.title, newNotification.message);
                  }
                  break;
                case 'low_stock':
                  if (settings.lowStockSound) {
                    showLowStock(newNotification.title, newNotification.message);
                  }
                  break;
                case 'payment_received':
                  showPaymentReceived(newNotification.title, newNotification.message);
                  break;
                default:
                  showInfo(newNotification.title, newNotification.message);
                  break;
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setNotifications(prev => prev.filter(n => n.id !== deletedId));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as NotificationItem;
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
          }
        });

      // الاشتراك مع معالجة الأخطاء المحسنة
      subscriptionRef.current = channel.subscribe((status) => {
        
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
          isConnectingRef.current = false;
          reconnectAttemptsRef.current = 0; // إعادة تعيين عداد المحاولات
        } else if (status === 'CHANNEL_ERROR') {
          setIsRealtimeConnected(false);
          isConnectingRef.current = false;
          reconnect();
        } else if (status === 'CLOSED') {
          setIsRealtimeConnected(false);
          isConnectingRef.current = false;
          reconnect();
        } else if (status === 'TIMED_OUT') {
          setIsRealtimeConnected(false);
          isConnectingRef.current = false;
          reconnect();
        }
      });

    } catch (error) {
      setIsRealtimeConnected(false);
      isConnectingRef.current = false;
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
      isConnectingRef.current = false;
    };
  }, [currentOrganization?.id, settings.realtimeEnabled, settings.newOrderSound, settings.toastEnabled, reconnect]);

  // تحميل الإشعارات عند التهيئة - تحسين إضافي لمنع التكرار
  useEffect(() => {
    if (!currentOrganization?.id) return;

    // منع الاستدعاءات المكررة
    let isMounted = true;
    const LOAD_DEBOUNCE_TIME = 5000; // 5 ثواني
    const SESSION_CACHE_KEY = 'notifications_cache';
    const CACHE_DURATION = 2 * 60 * 1000; // دقيقتان

    // دالة للحصول من sessionStorage
    const getFromSessionStorage = () => {
      try {
        const cached = sessionStorage.getItem(`${SESSION_CACHE_KEY}_${currentOrganization.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.timestamp && parsed.data) {
            const now = Date.now();
            if ((now - parsed.timestamp) < CACHE_DURATION) {
              return parsed.data;
            }
          }
        }
      } catch (error) {
        // تجاهل أخطاء sessionStorage
      }
      return null;
    };

    // دالة للحفظ في sessionStorage
    const saveToSessionStorage = (data: any) => {
      try {
        const cacheData = {
          data,
          timestamp: Date.now()
        };
        sessionStorage.setItem(`${SESSION_CACHE_KEY}_${currentOrganization.id}`, JSON.stringify(cacheData));
      } catch (error) {
        // تجاهل أخطاء sessionStorage
      }
    };

    const loadNotificationsWithCache = async () => {
      const now = Date.now();
      
      // منع التحميل المتكرر في وقت قصير
      if (hasLoadedRef.current && (now - lastLoadTimeRef.current) < LOAD_DEBOUNCE_TIME) {
        return;
      }
      
      // التحقق من sessionStorage أولاً
      const sessionCached = getFromSessionStorage();
      if (sessionCached && isMounted) {
        setNotifications(sessionCached);
        hasLoadedRef.current = true;
        lastLoadTimeRef.current = now;
        return;
      }
      
      try {
        hasLoadedRef.current = true;
        lastLoadTimeRef.current = now;
        
        // Use raw SQL to bypass strict typing
        const { data, error } = await supabase
          .from('notifications' as any)
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          return;
        }

        if (isMounted) {
          const notificationsData = (data || []) as unknown as NotificationItem[];
          setNotifications(notificationsData);
          
          // حفظ في sessionStorage
          saveToSessionStorage(notificationsData);
        }
      } catch (error) {
      }
    };

    // إضافة تأخير قصير لتجنب الاستدعاءات المتكررة
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    loadTimeoutRef.current = setTimeout(() => {
      loadNotificationsWithCache();
    }, 100);

    return () => {
      isMounted = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [currentOrganization?.id, supabase]);

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

  // تحديث حالة القراءة للجميع
  const markAllAsRead = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ is_read: true })
        .eq('organization_id', currentOrganization?.id)
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

  // حذف الإشعار
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications' as any)
        .delete()
        .eq('id', notificationId);

      if (error) {
        return;
      }

      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
    } catch (error) {
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
        return;
      }

      setNotifications(prev => 
        prev.filter(n => !n.is_read)
      );
    } catch (error) {
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
        return;
      }

      setNotifications([]);
    } catch (error) {
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
