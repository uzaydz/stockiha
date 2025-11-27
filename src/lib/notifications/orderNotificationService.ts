/**
 * خدمة إشعارات الطلبات
 *
 * توفر:
 * - مراقبة الطلبات الجديدة
 * - تتبع تغييرات حالة الطلبات
 * - إشعارات فورية للطلبات
 * - العمل أوفلاين مع المزامنة
 */

import { sqliteAPI } from '@/lib/db/sqliteAPI';
import { supabase } from '@/lib/supabase';
import { offlineNotificationService, NotificationPriority, OfflineNotification } from './offlineNotificationService';
import { RealtimeChannel } from '@supabase/supabase-js';

// حالات الطلب
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

// واجهة الطلب المبسط
export interface OrderSummary {
  id: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  status: OrderStatus;
  total: number;
  items_count: number;
  created_at: string;
  updated_at: string;
}

// إعدادات إشعارات الطلبات
export interface OrderNotificationSettings {
  enabled: boolean;
  notifyNewOrders: boolean;
  notifyStatusChanges: boolean;
  notifyHighValueOrders: boolean;
  highValueThreshold: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  statusPriorities: Record<OrderStatus, NotificationPriority>;
}

const DEFAULT_ORDER_SETTINGS: OrderNotificationSettings = {
  enabled: true,
  notifyNewOrders: true,
  notifyStatusChanges: true,
  notifyHighValueOrders: true,
  highValueThreshold: 50000, // 50,000 دج
  soundEnabled: true,
  vibrationEnabled: true,
  statusPriorities: {
    pending: 'high',
    confirmed: 'medium',
    processing: 'low',
    ready: 'medium',
    shipped: 'low',
    delivered: 'low',
    cancelled: 'high',
    returned: 'high'
  }
};

// جدول تتبع آخر حالة للطلبات
const CREATE_ORDER_STATUS_TRACKING = `
  CREATE TABLE IF NOT EXISTS order_status_tracking (
    order_id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    last_status TEXT NOT NULL,
    last_notified_at TEXT,
    notification_count INTEGER DEFAULT 0
  )
`;

class OrderNotificationService {
  private static instance: OrderNotificationService;
  private settings: OrderNotificationSettings = DEFAULT_ORDER_SETTINGS;
  private realtimeChannel: RealtimeChannel | null = null;
  private pollingInterval: number | null = null;
  private lastCheckedAt: string | null = null;
  private listeners: Set<(notification: OfflineNotification) => void> = new Set();

  private constructor() {}

  static getInstance(): OrderNotificationService {
    if (!OrderNotificationService.instance) {
      OrderNotificationService.instance = new OrderNotificationService();
    }
    return OrderNotificationService.instance;
  }

  /**
   * تهيئة الخدمة
   */
  async initialize(organizationId: string): Promise<void> {
    try {
      // إنشاء جدول التتبع
      await sqliteAPI.execute(CREATE_ORDER_STATUS_TRACKING);

      // تحميل آخر وقت فحص
      this.loadLastCheckedTime(organizationId);

      // بدء الاستماع للتحديثات
      if (navigator.onLine) {
        this.setupRealtimeSubscription(organizationId);
      }

      // بدء الاستقصاء المحلي
      this.startLocalPolling(organizationId);

      // مراقبة حالة الشبكة
      this.setupNetworkListeners(organizationId);

      console.log('[OrderNotifications] Service initialized');
    } catch (error) {
      console.error('[OrderNotifications] Initialization error:', error);
    }
  }

  /**
   * إعداد الاشتراك في الوقت الفعلي
   */
  private setupRealtimeSubscription(organizationId: string): void {
    // إلغاء أي اشتراك سابق
    this.cleanupRealtimeSubscription();

    this.realtimeChannel = supabase
      .channel(`orders_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => this.handleNewOrder(organizationId, payload.new as any)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => this.handleOrderUpdate(organizationId, payload.new as any, payload.old as any)
      )
      .subscribe((status) => {
        console.log('[OrderNotifications] Realtime status:', status);
      });
  }

  /**
   * تنظيف اشتراك الوقت الفعلي
   */
  private cleanupRealtimeSubscription(): void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  /**
   * معالجة طلب جديد
   */
  private async handleNewOrder(organizationId: string, order: any): Promise<void> {
    if (!this.settings.notifyNewOrders) return;

    const priority: NotificationPriority =
      order.total >= this.settings.highValueThreshold ? 'urgent' : 'high';

    const notification = await offlineNotificationService.createNotification(organizationId, {
      type: 'new_order',
      title: '🛒 طلب جديد',
      message: `طلب جديد #${order.order_number || order.id.slice(-6)} من ${order.customer_name || 'عميل'} بقيمة ${order.total} دج`,
      priority,
      source: 'server',
      is_read: false,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        total: order.total,
        status: order.status
      },
      action_url: `/dashboard/orders/${order.id}`,
      action_label: 'عرض الطلب'
    });

    // تشغيل الصوت
    if (this.settings.soundEnabled) {
      this.playNotificationSound('new_order');
    }

    // الاهتزاز
    if (this.settings.vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // تتبع الحالة
    await this.updateOrderTracking(order.id, organizationId, order.status);

    // إشعار المستمعين
    this.notifyListeners(notification);
  }

  /**
   * معالجة تحديث طلب
   */
  private async handleOrderUpdate(organizationId: string, newOrder: any, oldOrder: any): Promise<void> {
    if (!this.settings.notifyStatusChanges) return;

    // التحقق من تغيير الحالة
    if (newOrder.status === oldOrder?.status) return;

    const priority = this.settings.statusPriorities[newOrder.status as OrderStatus] || 'medium';

    const statusMessages: Record<OrderStatus, string> = {
      pending: 'في الانتظار',
      confirmed: 'تم التأكيد',
      processing: 'قيد المعالجة',
      ready: 'جاهز للتسليم',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
      returned: 'مرتجع'
    };

    const notification = await offlineNotificationService.createNotification(organizationId, {
      type: 'order_status_change',
      title: `📦 تحديث طلب #${newOrder.order_number || newOrder.id.slice(-6)}`,
      message: `تم تغيير حالة الطلب إلى: ${statusMessages[newOrder.status as OrderStatus] || newOrder.status}`,
      priority,
      source: 'server',
      is_read: false,
      data: {
        order_id: newOrder.id,
        order_number: newOrder.order_number,
        old_status: oldOrder?.status,
        new_status: newOrder.status,
        customer_name: newOrder.customer_name
      },
      action_url: `/dashboard/orders/${newOrder.id}`,
      action_label: 'عرض الطلب'
    });

    // تشغيل الصوت للحالات المهمة
    if (this.settings.soundEnabled && ['cancelled', 'returned'].includes(newOrder.status)) {
      this.playNotificationSound('warning');
    }

    await this.updateOrderTracking(newOrder.id, organizationId, newOrder.status);
    this.notifyListeners(notification);
  }

  /**
   * تتبع حالة الطلب
   */
  private async updateOrderTracking(orderId: string, organizationId: string, status: string): Promise<void> {
    try {
      await sqliteAPI.execute(
        `INSERT OR REPLACE INTO order_status_tracking
         (order_id, organization_id, last_status, last_notified_at, notification_count)
         VALUES (?, ?, ?, ?, COALESCE((SELECT notification_count + 1 FROM order_status_tracking WHERE order_id = ?), 1))`,
        [orderId, organizationId, status, new Date().toISOString(), orderId]
      );
    } catch (error) {
      console.error('[OrderNotifications] Error updating tracking:', error);
    }
  }

  /**
   * بدء الاستقصاء المحلي
   */
  private startLocalPolling(organizationId: string): void {
    // فحص كل 30 ثانية
    this.pollingInterval = window.setInterval(
      () => this.checkLocalOrders(organizationId),
      30 * 1000
    );
  }

  /**
   * فحص الطلبات المحلية
   */
  async checkLocalOrders(organizationId: string): Promise<void> {
    try {
      const lastCheck = this.lastCheckedAt || new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // جلب الطلبات الجديدة من SQLite
      const newOrders = await sqliteAPI.query<any>(
        `SELECT o.*, c.name as customer_name
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         WHERE o.organization_id = ? AND o.created_at > ?
         ORDER BY o.created_at DESC`,
        [organizationId, lastCheck]
      );

      for (const order of newOrders) {
        // التحقق من عدم وجود إشعار سابق
        const tracking = await this.getOrderTracking(order.id);
        if (!tracking) {
          await this.handleNewOrder(organizationId, order);
        }
      }

      // فحص تغييرات الحالة
      const trackedOrders = await sqliteAPI.query<any>(
        `SELECT t.order_id, t.last_status, o.status as current_status
         FROM order_status_tracking t
         JOIN orders o ON t.order_id = o.id
         WHERE t.organization_id = ? AND t.last_status != o.status`,
        [organizationId]
      );

      for (const order of trackedOrders) {
        const fullOrder = await sqliteAPI.query<any>(
          'SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = ?',
          [order.order_id]
        );
        if (fullOrder[0]) {
          await this.handleOrderUpdate(
            organizationId,
            fullOrder[0],
            { status: order.last_status }
          );
        }
      }

      // تحديث وقت آخر فحص
      this.lastCheckedAt = new Date().toISOString();
      this.saveLastCheckedTime(organizationId);
    } catch (error) {
      console.error('[OrderNotifications] Error checking local orders:', error);
    }
  }

  /**
   * جلب تتبع الطلب
   */
  private async getOrderTracking(orderId: string): Promise<any | null> {
    try {
      const result = await sqliteAPI.query<any>(
        'SELECT * FROM order_status_tracking WHERE order_id = ?',
        [orderId]
      );
      return result[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * حفظ وقت آخر فحص
   */
  private saveLastCheckedTime(organizationId: string): void {
    try {
      localStorage.setItem(
        `order_notifications_last_check_${organizationId}`,
        this.lastCheckedAt || ''
      );
    } catch {}
  }

  /**
   * تحميل وقت آخر فحص
   */
  private loadLastCheckedTime(organizationId: string): void {
    try {
      this.lastCheckedAt = localStorage.getItem(
        `order_notifications_last_check_${organizationId}`
      );
    } catch {}
  }

  /**
   * إعداد مستمعي الشبكة
   */
  private setupNetworkListeners(organizationId: string): void {
    window.addEventListener('online', () => {
      console.log('[OrderNotifications] Network restored, resuming realtime');
      this.setupRealtimeSubscription(organizationId);
    });

    window.addEventListener('offline', () => {
      console.log('[OrderNotifications] Network lost, falling back to polling');
      this.cleanupRealtimeSubscription();
    });
  }

  /**
   * تشغيل صوت الإشعار
   */
  private playNotificationSound(type: 'new_order' | 'warning' | 'success'): void {
    try {
      const sounds: Record<string, number[]> = {
        new_order: [523.25, 659.25, 783.99], // C, E, G
        warning: [392, 349.23, 311.13],       // G, F, D#
        success: [523.25, 783.99]              // C, G
      };

      const frequencies = sounds[type] || sounds.new_order;
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime + index * 0.15);
        oscillator.stop(audioContext.currentTime + index * 0.15 + 0.3);
      });
    } catch (error) {
      console.error('[OrderNotifications] Error playing sound:', error);
    }
  }

  /**
   * الاشتراك في الإشعارات
   */
  subscribe(callback: (notification: OfflineNotification) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * إشعار المستمعين
   */
  private notifyListeners(notification: OfflineNotification): void {
    this.listeners.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('[OrderNotifications] Listener error:', error);
      }
    });
  }

  /**
   * تحديث الإعدادات
   */
  updateSettings(settings: Partial<OrderNotificationSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * جلب الإعدادات
   */
  getSettings(): OrderNotificationSettings {
    return { ...this.settings };
  }

  /**
   * إيقاف الخدمة
   */
  stop(): void {
    this.cleanupRealtimeSubscription();
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.listeners.clear();
  }
}

// تصدير المثيل الوحيد
export const orderNotificationService = OrderNotificationService.getInstance();
