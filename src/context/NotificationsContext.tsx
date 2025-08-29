import React, { createContext, useContext, ReactNode } from 'react';
import { useRealTimeNotifications, type NotificationItem } from '@/hooks/useRealTimeNotifications';

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

interface ToastNotification {
  id: string;
  type: 'new_order' | 'low_stock' | 'payment_received' | 'order_status_change' | 'info';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationsContextType {
  notifications: NotificationItem[];
  loading: boolean;
  error: any;
  toasts: ToastNotification[];
  stats: NotificationStats;
  settings: NotificationSettings;
  isRealtimeConnected: boolean;
  removeToast: (id: string) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  getNotificationIcon: (type: NotificationItem['type']) => string;
  loadNotifications: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteReadNotifications: () => Promise<void>;
  playTestSound: () => void;
  showNewOrder: (order: any) => void;
  showLowStock: (product: any) => void;
  showPaymentReceived: (payment: any) => void;
  showInfo: (title: string, message: string, options?: Partial<ToastNotification>) => string;
  clearAllToasts: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

// 🔧 إصلاح Fast Refresh: استخدام const بدلاً من export const
// هذا يسمح لـ Vite بإعادة تعريف المكون بشكل صحيح
const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const notificationsData = useRealTimeNotifications();

  return (
    <NotificationsContext.Provider value={notificationsData}>
      {children}
    </NotificationsContext.Provider>
  );
};

// 🏷️ إضافة displayName لتحسين Fast Refresh
NotificationsProvider.displayName = 'NotificationsProvider';

// 🔧 إصلاح Fast Refresh: استخدام const بدلاً من export const
// هذا يسمح لـ Vite بإعادة تعريف الـ hook بشكل صحيح
const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};

// 🏷️ إضافة displayName للـ hook لتحسين Fast Refresh
(useNotifications as any).displayName = 'useNotifications';

// 📤 تصدير مزدوج لحل مشكلة Fast Refresh
// 1. named exports للاستيراد العادي
export { NotificationsProvider };
export { useNotifications };

// 2. default export للـ hook (مطلوب لـ Fast Refresh)
// هذا يسمح لـ Vite بتحديد التغييرات في الـ hook بشكل صحيح
export default useNotifications;
