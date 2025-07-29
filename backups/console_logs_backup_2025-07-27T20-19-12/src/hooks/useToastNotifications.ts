import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastNotificationData } from '@/components/ui/toast-notification';
import { playNotificationForType, notificationSoundManager } from '@/lib/notification-sounds';

interface UseToastNotificationsOptions {
  maxToasts?: number;
  defaultDuration?: number;
  soundEnabled?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export function useToastNotifications(options: UseToastNotificationsOptions = {}) {
  const navigate = useNavigate();
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
      playNotificationForType(toast.type, toast.priority);
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

  const showNewOrder = useCallback((title: string, message: string, options?: Partial<ToastNotificationData>) => {
    return addToast({
      type: 'new_order',
      title,
      message,
      priority: 'medium',
      action: {
        label: 'عرض الطلب',
        onClick: () => {
          console.log('🛒 التنقل إلى صفحة الطلبات من Toast');
          navigate('/dashboard/orders');
        }
      },
      ...options
    });
  }, [addToast, navigate]);

  const showPaymentReceived = useCallback((title: string, message: string, options?: Partial<ToastNotificationData>) => {
    return addToast({
      type: 'payment_received',
      title,
      message,
      priority: 'medium',
      action: {
        label: 'عرض الطلب',
        onClick: () => {
          console.log('💰 التنقل إلى صفحة الطلبات من Toast');
          navigate('/dashboard/orders');
        }
      },
      ...options
    });
  }, [addToast, navigate]);

  const showLowStock = useCallback((title: string, message: string, options?: Partial<ToastNotificationData>) => {
    return addToast({
      type: 'low_stock',
      title,
      message,
      priority: 'high',
      action: {
        label: 'إدارة المخزون',
        onClick: () => {
          console.log('📦 التنقل إلى صفحة المخزون من Toast');
          navigate('/dashboard/inventory');
        }
      },
      ...options
    });
  }, [addToast, navigate]);

  // تحديث إعدادات الصوت
  const updateSoundSettings = useCallback((enabled: boolean, volume?: number) => {
    notificationSoundManager.setEnabled(enabled);
    if (volume !== undefined) {
      notificationSoundManager.setMasterVolume(volume);
    }
  }, []);

  // تشغيل صوت اختبار
  const playTestSound = useCallback(() => {
    notificationSoundManager.playTestSound();
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