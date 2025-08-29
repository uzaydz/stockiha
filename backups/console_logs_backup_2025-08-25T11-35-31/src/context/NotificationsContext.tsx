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
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

interface NotificationsContextType {
  notifications: NotificationItem[];
  newNotificationsCount: number;
  loading: boolean;
  error: any;
  toasts: ToastNotification[];
  stats: NotificationStats;
  settings: NotificationSettings;
  isRealtimeConnected: boolean;
  removeToast: (id: string) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  getNotificationIcon: (type: NotificationItem['type']) => string;
  refreshNotifications: () => void;
  loadNotifications: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteReadNotifications: () => Promise<void>;
  playTestSound: () => void;
  showNewOrder: (order: any) => void;
  showLowStock: (product: any) => void;
  showPaymentReceived: (payment: any) => void;
  showInfo: (message: string) => void;
  clearAllToasts: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const notificationsData = useRealTimeNotifications();

  return (
    <NotificationsContext.Provider value={notificationsData}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};
