import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface CallCenterNotification {
  id: string;
  type: 'new_order' | 'urgent_order' | 'callback_reminder' | 'performance_alert' | 'system_message';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  actionRequired: boolean;
  actionUrl?: string;
  relatedOrderId?: string;
  createdAt: Date;
  expiresAt?: Date;
}

interface NotificationSettings {
  enableSound: boolean;
  enableDesktop: boolean;
  enableNewOrders: boolean;
  enableUrgentOrders: boolean;
  enableCallbacks: boolean;
  enablePerformanceAlerts: boolean;
  soundVolume: number;
}

interface UseCallCenterNotificationsReturn {
  // الإشعارات
  notifications: CallCenterNotification[];
  unreadCount: number;
  
  // الإعدادات
  settings: NotificationSettings;
  
  // حالات التحميل والأخطاء
  loading: boolean;
  error: string | null;
  
  // العمليات
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  clearAllNotifications: () => Promise<boolean>;
  
  // إدارة الإعدادات
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<boolean>;
  
  // إنشاء إشعارات جديدة
  createNotification: (notification: Omit<CallCenterNotification, 'id' | 'createdAt' | 'isRead'>) => Promise<boolean>;
  
  // تحديث البيانات
  refreshNotifications: () => Promise<void>;
}

export const useCallCenterNotifications = (agentId?: string): UseCallCenterNotificationsReturn => {
  const [notifications, setNotifications] = useState<CallCenterNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    enableSound: true,
    enableDesktop: true,
    enableNewOrders: true,
    enableUrgentOrders: true,
    enableCallbacks: true,
    enablePerformanceAlerts: true,
    soundVolume: 0.7
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // حساب عدد الإشعارات غير المقروءة
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // تشغيل صوت الإشعار
  const playNotificationSound = useCallback(() => {
    if (settings.enableSound && settings.soundVolume > 0) {
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = settings.soundVolume;
        audio.play().catch(console.error);
      } catch (err) {
        console.error('خطأ في تشغيل صوت الإشعار:', err);
      }
    }
  }, [settings.enableSound, settings.soundVolume]);

  // إظهار إشعار سطح المكتب
  const showDesktopNotification = useCallback((notification: CallCenterNotification) => {
    if (!settings.enableDesktop) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/call-center-icon.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent'
      });
    }
  }, [settings.enableDesktop]);

  // طلب إذن الإشعارات
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  // جلب الإشعارات
  const fetchNotifications = async () => {
    if (!agentId) return;

    try {
      setLoading(true);
      setError(null);

      // جلب الإشعارات من قاعدة البيانات (سيتم إنشاء الجدول لاحقاً)
      // في الوقت الحالي، سنستخدم بيانات وهمية
      const mockNotifications: CallCenterNotification[] = [
        {
          id: '1',
          type: 'new_order',
          title: 'طلب جديد مخصص لك',
          message: 'تم تخصيص طلب جديد برقم #12345 لك',
          priority: 'medium',
          isRead: false,
          actionRequired: true,
          actionUrl: '/call-center/orders/12345',
          relatedOrderId: '12345',
          createdAt: new Date(Date.now() - 5 * 60 * 1000) // منذ 5 دقائق
        },
        {
          id: '2',
          type: 'callback_reminder',
          title: 'تذكير: مكالمة مجدولة',
          message: 'لديك مكالمة مجدولة مع العميل أحمد محمد في الساعة 2:00 م',
          priority: 'high',
          isRead: false,
          actionRequired: true,
          actionUrl: '/call-center/orders/12346',
          relatedOrderId: '12346',
          createdAt: new Date(Date.now() - 15 * 60 * 1000) // منذ 15 دقيقة
        },
        {
          id: '3',
          type: 'performance_alert',
          title: 'تحديث الأداء',
          message: 'تهانينا! لقد حققت هدف اليوم بنسبة 120%',
          priority: 'low',
          isRead: true,
          actionRequired: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // منذ ساعتين
        }
      ];

      setNotifications(mockNotifications);

    } catch (err) {
      console.error('خطأ في جلب الإشعارات:', err);
      setError('فشل في جلب الإشعارات');
    } finally {
      setLoading(false);
    }
  };

  // جلب إعدادات الإشعارات
  const fetchSettings = async () => {
    if (!agentId) return;

    try {
      // جلب الإعدادات من localStorage أو قاعدة البيانات
      const savedSettings = localStorage.getItem(`notification-settings-${agentId}`);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      }
    } catch (err) {
      console.error('خطأ في جلب إعدادات الإشعارات:', err);
    }
  };

  // تحديث إعدادات الإشعارات
  const updateSettings = async (newSettings: Partial<NotificationSettings>): Promise<boolean> => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      // حفظ الإعدادات في localStorage
      if (agentId) {
        localStorage.setItem(`notification-settings-${agentId}`, JSON.stringify(updatedSettings));
      }

      return true;
    } catch (err) {
      console.error('خطأ في تحديث إعدادات الإشعارات:', err);
      setError('فشل في تحديث الإعدادات');
      return false;
    }
  };

  // تحديد إشعار كمقروء
  const markAsRead = async (notificationId: string): Promise<boolean> => {
    try {
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );

      // تحديث في قاعدة البيانات (سيتم تنفيذه لاحقاً)
      
      return true;
    } catch (err) {
      console.error('خطأ في تحديد الإشعار كمقروء:', err);
      setError('فشل في تحديث الإشعار');
      return false;
    }
  };

  // تحديد جميع الإشعارات كمقروءة
  const markAllAsRead = async (): Promise<boolean> => {
    try {
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );

      // تحديث في قاعدة البيانات (سيتم تنفيذه لاحقاً)
      
      return true;
    } catch (err) {
      console.error('خطأ في تحديد جميع الإشعارات كمقروءة:', err);
      setError('فشل في تحديث الإشعارات');
      return false;
    }
  };

  // حذف إشعار
  const deleteNotification = async (notificationId: string): Promise<boolean> => {
    try {
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );

      // حذف من قاعدة البيانات (سيتم تنفيذه لاحقاً)
      
      return true;
    } catch (err) {
      console.error('خطأ في حذف الإشعار:', err);
      setError('فشل في حذف الإشعار');
      return false;
    }
  };

  // مسح جميع الإشعارات
  const clearAllNotifications = async (): Promise<boolean> => {
    try {
      setNotifications([]);

      // مسح من قاعدة البيانات (سيتم تنفيذه لاحقاً)
      
      return true;
    } catch (err) {
      console.error('خطأ في مسح جميع الإشعارات:', err);
      setError('فشل في مسح الإشعارات');
      return false;
    }
  };

  // إنشاء إشعار جديد
  const createNotification = async (
    notification: Omit<CallCenterNotification, 'id' | 'createdAt' | 'isRead'>
  ): Promise<boolean> => {
    try {
      const newNotification: CallCenterNotification = {
        ...notification,
        id: Date.now().toString(),
        createdAt: new Date(),
        isRead: false
      };

      // التحقق من إعدادات الإشعارات
      const shouldShow = (
        (notification.type === 'new_order' && settings.enableNewOrders) ||
        (notification.type === 'urgent_order' && settings.enableUrgentOrders) ||
        (notification.type === 'callback_reminder' && settings.enableCallbacks) ||
        (notification.type === 'performance_alert' && settings.enablePerformanceAlerts) ||
        notification.type === 'system_message'
      );

      if (!shouldShow) return true;

      setNotifications(prev => [newNotification, ...prev]);

      // تشغيل الصوت وإظهار إشعار سطح المكتب
      playNotificationSound();
      showDesktopNotification(newNotification);

      // حفظ في قاعدة البيانات (سيتم تنفيذه لاحقاً)
      
      return true;
    } catch (err) {
      console.error('خطأ في إنشاء الإشعار:', err);
      setError('فشل في إنشاء الإشعار');
      return false;
    }
  };

  // تحديث البيانات
  const refreshNotifications = async (): Promise<void> => {
    await fetchNotifications();
  };

  // مراقبة الطلبيات الجديدة والتحديثات
  useEffect(() => {
    if (!agentId) return;

    // إعداد الاشتراك في التحديثات المباشرة
    const subscription = supabase
      .channel('call-center-notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'online_orders',
          filter: `assigned_agent_id=eq.${agentId}`
        }, 
        (payload) => {
          createNotification({
            type: 'new_order',
            title: 'طلب جديد مخصص لك',
            message: `تم تخصيص طلب جديد برقم #${payload.new.customer_order_number} لك`,
            priority: 'medium',
            actionRequired: true,
            actionUrl: `/call-center/orders/${payload.new.id}`,
            relatedOrderId: payload.new.id
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [agentId, createNotification]);

  // تحميل البيانات عند تغيير معرف الموظف
  useEffect(() => {
    if (agentId) {
      fetchNotifications();
      fetchSettings();
      requestNotificationPermission();
    } else {
      setNotifications([]);
      setLoading(false);
    }
  }, [agentId]);

  // تنظيف الإشعارات المنتهية الصلاحية
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setNotifications(prev => 
        prev.filter(notification => 
          !notification.expiresAt || notification.expiresAt > now
        )
      );
    }, 60000); // كل دقيقة

    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount,
    settings,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    updateSettings,
    createNotification,
    refreshNotifications
  };
}; 