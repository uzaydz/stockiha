import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastNotificationData } from '@/components/ui/toast-notification';
import { playNotificationForType, notificationSoundManager, initializeNotificationSounds } from '@/lib/notification-sounds';

interface UseToastNotificationsOptions {
  maxToasts?: number;
  defaultDuration?: number;
  soundEnabled?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export function useToastNotifications(options: UseToastNotificationsOptions = {}) {
  // حماية من استخدام useNavigate خارج Router
  let navigate;
  try {
    navigate = useNavigate();
  } catch (error) {
    // إذا لم يكن Router جاهزاً، استخدم navigate افتراضي
    navigate = () => {};
  }
  const {
    maxToasts = 5,
    defaultDuration = 5000,
    soundEnabled = true,
    position = 'bottom-right'
  } = options;

  const [toasts, setToasts] = useState<ToastNotificationData[]>([]);

  // إضافة toast جديد
  const addToast = useCallback((toast: Omit<ToastNotificationData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastNotificationData = {
      ...toast,
      id,
      duration: toast.duration || defaultDuration
    };

    setToasts(prevToasts => {
      const updatedToasts = [newToast, ...prevToasts];
      // إبقاء العدد المحدود من Toast
      return updatedToasts.slice(0, maxToasts);
    });

    // تشغيل الصوت إذا كان مفعلاً
    if (soundEnabled) {
      playNotificationForType(toast.type, toast.priority).catch(error => {
      });
    }

    return id;
  }, [defaultDuration, maxToasts, soundEnabled]);

  // إزالة toast
  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  // إزالة جميع Toast
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // تهيئة الأصوات عند تفاعل المستخدم
  useEffect(() => {
    const initializeSounds = async () => {
      if (soundEnabled) {
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
  }, [soundEnabled]);

  // وظائف مساعدة لأنواع مختلفة من الإشعارات
  const showSuccess = useCallback((title: string, message: string, options?: Partial<ToastNotificationData>) => {
    return addToast({
      type: 'payment_received',
      title,
      message,
      priority: 'medium',
      ...options
    });
  }, [addToast]);

  const showError = useCallback((title: string, message: string, options?: Partial<ToastNotificationData>) => {
    return addToast({
      type: 'low_stock',
      title,
      message,
      priority: 'urgent',
      duration: 7000, // أطول للأخطاء
      ...options
    });
  }, [addToast]);

  const showWarning = useCallback((title: string, message: string, options?: Partial<ToastNotificationData>) => {
    return addToast({
      type: 'low_stock',
      title,
      message,
      priority: 'high',
      duration: 6000,
      ...options
    });
  }, [addToast]);

  const showInfo = useCallback((title: string, message: string, options?: Partial<ToastNotificationData>) => {
    return addToast({
      type: 'order_status_change',
      title,
      message,
      priority: 'low',
      ...options
    });
  }, [addToast]);

  // وظائف مخصصة للأنواع المختلفة
  const showNewOrder = useCallback((order: any) => {
    return addToast({
      type: 'new_order',
      title: '🛒 طلبية جديدة',
      message: `طلبية جديدة بقيمة ${order.total || 0} دج`,
      priority: 'high',
      duration: 8000
    });
  }, [addToast]);

  const showLowStock = useCallback((product: any) => {
    return addToast({
      type: 'low_stock',
      title: '⚠️ مخزون منخفض',
      message: `المخزون منخفض للمنتج: ${product.name}`,
      priority: 'urgent',
      duration: 10000
    });
  }, [addToast]);

  const showPaymentReceived = useCallback((payment: any) => {
    return addToast({
      type: 'payment_received',
      title: '💰 تم استلام الدفع',
      message: `تم استلام دفع بقيمة ${payment.amount || 0} دج`,
      priority: 'medium',
      duration: 6000
    });
  }, [addToast]);

  // تحديث إعدادات الصوت
  const updateSoundSettings = useCallback((enabled: boolean, volume: number) => {
    // يمكن إضافة منطق تحديث الصوت هنا
  }, []);

  // تشغيل صوت اختبار
  const playTestSound = useCallback(async () => {
    try {
      await notificationSoundManager.playTestSound();
    } catch (error) {
    }
  }, []);

  return {
    // الحالة
    toasts,
    position,
    
    // الوظائف الأساسية
    addToast,
    removeToast,
    clearAllToasts,
    
    // وظائف مخصصة للأنواع المختلفة
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNewOrder,
    showPaymentReceived,
    showLowStock,
    
    // إعدادات الصوت
    updateSoundSettings,
    playTestSound,
    
    // معلومات مفيدة
    count: toasts.length,
    isEmpty: toasts.length === 0,
    isFull: toasts.length >= maxToasts
  };
}
