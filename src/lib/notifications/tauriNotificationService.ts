/**
 * Desktop Notification Service
 *
 * ⚡ MIGRATED: From Tauri to Electron
 *
 * This service provides native desktop notifications using Electron or browser fallback.
 */

import { playNotificationForType } from '../notification-sounds';
import { isElectron, notification } from '@/lib/desktop';

// Check if running in desktop app (Electron)
const isDesktop = (): boolean => {
  return isElectron();
};

// Notification interface
export interface TauriNotification {
  title: string;
  body: string;
  icon?: string;
  sound?: string;
}

class DesktopNotificationService {
  private permissionGranted: boolean = false;
  private isInitialized: boolean = false;

  // Initialize service and check permissions
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return this.permissionGranted;
    }

    // In Electron, notifications are always permitted
    if (isDesktop()) {
      this.permissionGranted = true;
      this.isInitialized = true;
      return true;
    }

    // For web, check browser notification permission
    if ('Notification' in window) {
      this.permissionGranted = Notification.permission === 'granted';
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        this.permissionGranted = permission === 'granted';
      }
    }

    this.isInitialized = true;
    return this.permissionGranted;
  }

  // Send native notification
  async sendNotification(notif: TauriNotification): Promise<boolean> {
    // Play sound first
    await playNotificationForType('info', 'medium');

    // Try desktop notification first
    if (isDesktop()) {
      try {
        return await notification.show({
          title: notif.title,
          body: notif.body,
          icon: notif.icon,
        });
      } catch (error) {
        console.warn('[DesktopNotification] Electron notification failed, falling back to browser');
        return this.sendBrowserNotification(notif);
      }
    }

    // Browser fallback
    return this.sendBrowserNotification(notif);
  }

  // Send notification via Browser API as fallback
  private async sendBrowserNotification(notif: TauriNotification): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('[DesktopNotification] Browser notifications not supported');
      return false;
    }

    try {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      if (Notification.permission === 'granted') {
        new Notification(notif.title, {
          body: notif.body,
          icon: notif.icon || '/favicon.ico',
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('[DesktopNotification] Browser notification failed:', error);
      return false;
    }
  }

  // Send new order notification
  async sendNewOrderNotification(orderId: string, customerName: string, total: number): Promise<boolean> {
    await playNotificationForType('new_order', 'medium');

    return this.sendNotification({
      title: 'طلب جديد! 🛒',
      body: `طلب من ${customerName} بقيمة ${total.toFixed(2)} د.ج`,
    });
  }

  // Send payment received notification
  async sendPaymentReceivedNotification(amount: number, method: string): Promise<boolean> {
    await playNotificationForType('payment_received', 'medium');

    return this.sendNotification({
      title: 'تم استلام الدفع! 💰',
      body: `تم استلام ${amount.toFixed(2)} د.ج عبر ${method}`,
    });
  }

  // Send low stock notification
  async sendLowStockNotification(productName: string, currentStock: number): Promise<boolean> {
    await playNotificationForType('low_stock', 'urgent');

    return this.sendNotification({
      title: 'تحذير: مخزون منخفض! ⚠️',
      body: `${productName} - المتبقي: ${currentStock} وحدة فقط`,
    });
  }

  // Send order status notification
  async sendOrderStatusNotification(orderId: string, newStatus: string): Promise<boolean> {
    await playNotificationForType('order_status_change', 'medium');

    const statusMap: Record<string, string> = {
      pending: 'في الانتظار',
      processing: 'قيد المعالجة',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      delivered: 'تم التسليم',
    };

    return this.sendNotification({
      title: 'تحديث حالة الطلب 📦',
      body: `الطلب #${orderId} - الحالة: ${statusMap[newStatus] || newStatus}`,
    });
  }

  // Send general notification
  async sendGeneralNotification(
    title: string,
    body: string,
    priority: 'low' | 'medium' | 'urgent' = 'medium'
  ): Promise<boolean> {
    await playNotificationForType('info', priority);

    return this.sendNotification({ title, body });
  }

  // Check permission status
  isPermissionGrantedSync(): boolean {
    return this.permissionGranted;
  }

  // Check if in desktop environment
  isDesktopEnvironment(): boolean {
    return isDesktop();
  }

  /**
   * @deprecated Use isDesktopEnvironment() instead
   */
  isTauriEnvironment(): boolean {
    return false;
  }
}

// Singleton instance
export const tauriNotificationService = new DesktopNotificationService();

// Alias for backward compatibility
export const desktopNotificationService = tauriNotificationService;

// Helper functions for direct use
export const initializeTauriNotifications = async (): Promise<boolean> => {
  return tauriNotificationService.initialize();
};

export const sendTauriNotification = async (notification: TauriNotification): Promise<boolean> => {
  return tauriNotificationService.sendNotification(notification);
};

export const sendNewOrderNotification = async (
  orderId: string,
  customerName: string,
  total: number
): Promise<boolean> => {
  return tauriNotificationService.sendNewOrderNotification(orderId, customerName, total);
};

export const sendPaymentReceivedNotification = async (amount: number, method: string): Promise<boolean> => {
  return tauriNotificationService.sendPaymentReceivedNotification(amount, method);
};

export const sendLowStockNotification = async (productName: string, currentStock: number): Promise<boolean> => {
  return tauriNotificationService.sendLowStockNotification(productName, currentStock);
};

export const sendOrderStatusNotification = async (orderId: string, newStatus: string): Promise<boolean> => {
  return tauriNotificationService.sendOrderStatusNotification(orderId, newStatus);
};

export const sendGeneralNotification = async (
  title: string,
  body: string,
  priority?: 'low' | 'medium' | 'urgent'
): Promise<boolean> => {
  return tauriNotificationService.sendGeneralNotification(title, body, priority);
};
