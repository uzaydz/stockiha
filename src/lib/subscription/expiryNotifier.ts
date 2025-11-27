/**
 * نظام إشعارات انتهاء الاشتراك
 *
 * يراقب حالة الاشتراك ويرسل إشعارات:
 * - قبل 30 يوم من انتهاء الاشتراك
 * - قبل 14 يوم
 * - قبل 7 أيام
 * - قبل 3 أيام
 * - قبل يوم واحد
 * - عند انتهاء الاشتراك
 */

import { subscriptionCache } from '@/lib/subscription-cache';
import type { SubscriptionCheckResult } from '@/types/subscription';

// واجهة الإشعار
export interface SubscriptionNotification {
  id: string;
  type: 'warning' | 'urgent' | 'expired' | 'info';
  title: string;
  message: string;
  daysLeft: number;
  organizationId: string;
  timestamp: Date;
  dismissed: boolean;
  action?: {
    label: string;
    href: string;
  };
}

// حدود الإشعارات
const NOTIFICATION_THRESHOLDS = [30, 14, 7, 3, 1, 0];

// مفتاح التخزين المحلي للإشعارات المرفوضة
const DISMISSED_KEY = 'subscription_notifications_dismissed';

class SubscriptionExpiryNotifier {
  private static instance: SubscriptionExpiryNotifier;
  private checkInterval: number | null = null;
  private listeners: Set<(notification: SubscriptionNotification) => void> = new Set();
  private lastNotifiedDays: Map<string, number> = new Map();
  private readonly CHECK_INTERVAL = 60 * 60 * 1000; // كل ساعة

  private constructor() {
    // تحميل الإشعارات المرفوضة من التخزين المحلي
    this.loadDismissedState();
  }

  static getInstance(): SubscriptionExpiryNotifier {
    if (!SubscriptionExpiryNotifier.instance) {
      SubscriptionExpiryNotifier.instance = new SubscriptionExpiryNotifier();
    }
    return SubscriptionExpiryNotifier.instance;
  }

  /**
   * بدء مراقبة الاشتراك
   */
  startMonitoring(organizationId: string): void {
    // إيقاف أي مراقبة سابقة
    this.stopMonitoring();

    // فحص فوري
    this.checkExpiry(organizationId);

    // فحص دوري
    this.checkInterval = window.setInterval(() => {
      this.checkExpiry(organizationId);
    }, this.CHECK_INTERVAL);

    console.log('[ExpiryNotifier] Started monitoring for', organizationId);
  }

  /**
   * إيقاف المراقبة
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * الاشتراك في الإشعارات
   */
  subscribe(callback: (notification: SubscriptionNotification) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * فحص انتهاء الاشتراك
   */
  async checkExpiry(organizationId: string): Promise<SubscriptionNotification | null> {
    try {
      const subscription = await subscriptionCache.getSubscriptionStatus(organizationId);

      if (!subscription || !subscription.success) {
        return null;
      }

      const daysLeft = subscription.days_left;
      const notification = this.createNotification(organizationId, daysLeft, subscription);

      if (notification && !this.isNotificationDismissed(notification.id)) {
        // التحقق من عدم إرسال نفس الإشعار مرتين
        const lastNotified = this.lastNotifiedDays.get(organizationId);
        const threshold = this.getNotificationThreshold(daysLeft);

        if (lastNotified !== threshold) {
          this.lastNotifiedDays.set(organizationId, threshold);
          this.notifyListeners(notification);
          return notification;
        }
      }

      return null;
    } catch (error) {
      console.error('[ExpiryNotifier] Error checking expiry:', error);
      return null;
    }
  }

  /**
   * إنشاء إشعار بناءً على الأيام المتبقية
   */
  private createNotification(
    organizationId: string,
    daysLeft: number,
    subscription: SubscriptionCheckResult
  ): SubscriptionNotification | null {
    const threshold = this.getNotificationThreshold(daysLeft);

    if (threshold === null) {
      return null;
    }

    const id = `${organizationId}_${threshold}_${new Date().toDateString()}`;
    const planName = subscription.plan_name || 'الاشتراك';

    let type: SubscriptionNotification['type'];
    let title: string;
    let message: string;

    if (daysLeft <= 0) {
      type = 'expired';
      title = '⚠️ انتهى اشتراكك';
      message = `انتهت صلاحية ${planName}. يرجى تجديد الاشتراك للاستمرار في استخدام الخدمة.`;
    } else if (daysLeft <= 3) {
      type = 'urgent';
      title = '🔴 اشتراكك ينتهي قريباً جداً';
      message = `متبقي ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'} فقط على انتهاء ${planName}. جدد الآن لتجنب انقطاع الخدمة.`;
    } else if (daysLeft <= 7) {
      type = 'warning';
      title = '🟠 تذكير: اشتراكك ينتهي قريباً';
      message = `متبقي ${daysLeft} أيام على انتهاء ${planName}. ننصح بالتجديد قبل انتهاء الصلاحية.`;
    } else {
      type = 'info';
      title = '📅 تذكير بموعد التجديد';
      message = `متبقي ${daysLeft} يوماً على انتهاء ${planName}. يمكنك التجديد في أي وقت.`;
    }

    return {
      id,
      type,
      title,
      message,
      daysLeft,
      organizationId,
      timestamp: new Date(),
      dismissed: false,
      action: {
        label: daysLeft <= 0 ? 'تجديد الآن' : 'إدارة الاشتراك',
        href: '/dashboard/subscription'
      }
    };
  }

  /**
   * الحصول على حد الإشعار المناسب
   */
  private getNotificationThreshold(daysLeft: number): number | null {
    for (const threshold of NOTIFICATION_THRESHOLDS) {
      if (daysLeft <= threshold) {
        return threshold;
      }
    }
    return null;
  }

  /**
   * إرسال الإشعار للمستمعين
   */
  private notifyListeners(notification: SubscriptionNotification): void {
    this.listeners.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('[ExpiryNotifier] Listener error:', error);
      }
    });

    // إرسال حدث عام أيضاً
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('subscriptionExpiryNotification', {
        detail: notification
      }));
    }
  }

  /**
   * رفض إشعار
   */
  dismissNotification(notificationId: string): void {
    const dismissed = this.getDismissedNotifications();
    dismissed.add(notificationId);
    this.saveDismissedState(dismissed);
  }

  /**
   * التحقق من رفض الإشعار
   */
  private isNotificationDismissed(notificationId: string): boolean {
    return this.getDismissedNotifications().has(notificationId);
  }

  /**
   * جلب الإشعارات المرفوضة
   */
  private getDismissedNotifications(): Set<string> {
    try {
      const stored = localStorage.getItem(DISMISSED_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // تنظيف الإشعارات القديمة (أكثر من 30 يوم)
        const now = Date.now();
        const filtered = Object.entries(parsed)
          .filter(([_, timestamp]) => now - (timestamp as number) < 30 * 24 * 60 * 60 * 1000)
          .map(([id]) => id);
        return new Set(filtered);
      }
    } catch { }
    return new Set();
  }

  /**
   * حفظ حالة الرفض
   */
  private saveDismissedState(dismissed: Set<string>): void {
    try {
      const data: Record<string, number> = {};
      dismissed.forEach(id => {
        data[id] = Date.now();
      });
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(data));
    } catch { }
  }

  /**
   * تحميل حالة الرفض
   */
  private loadDismissedState(): void {
    // يتم التحميل عند الطلب في getDismissedNotifications
  }

  /**
   * مسح جميع الإشعارات المرفوضة
   */
  clearDismissed(): void {
    try {
      localStorage.removeItem(DISMISSED_KEY);
    } catch { }
    this.lastNotifiedDays.clear();
  }

  /**
   * الحصول على إشعار حالي إن وجد
   */
  async getCurrentNotification(organizationId: string): Promise<SubscriptionNotification | null> {
    try {
      const subscription = await subscriptionCache.getSubscriptionStatus(organizationId);

      if (!subscription || !subscription.success) {
        return null;
      }

      const notification = this.createNotification(organizationId, subscription.days_left, subscription);

      if (notification && !this.isNotificationDismissed(notification.id)) {
        return notification;
      }

      return null;
    } catch {
      return null;
    }
  }
}

// تصدير المثيل الوحيد
export const expiryNotifier = SubscriptionExpiryNotifier.getInstance();

// ====== React Hook ======

import { useEffect, useState, useCallback } from 'react';

export function useSubscriptionExpiry(organizationId: string | undefined) {
  const [notification, setNotification] = useState<SubscriptionNotification | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    // بدء المراقبة
    expiryNotifier.startMonitoring(organizationId);

    // الاشتراك في الإشعارات
    const unsubscribe = expiryNotifier.subscribe((notif) => {
      if (notif.organizationId === organizationId) {
        setNotification(notif);
      }
    });

    // جلب الإشعار الحالي
    expiryNotifier.getCurrentNotification(organizationId).then((notif) => {
      setNotification(notif);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      expiryNotifier.stopMonitoring();
    };
  }, [organizationId]);

  const dismiss = useCallback(() => {
    if (notification) {
      expiryNotifier.dismissNotification(notification.id);
      setNotification(null);
    }
  }, [notification]);

  return {
    notification,
    isLoading,
    dismiss
  };
}
