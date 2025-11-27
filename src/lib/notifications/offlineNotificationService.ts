/**
 * خدمة الإشعارات الموحدة للأوفلاين
 *
 * توفر:
 * - تخزين الإشعارات في SQLite للعمل أوفلاين
 * - مزامنة الإشعارات عند استعادة الاتصال
 * - إنشاء إشعارات محلية للمخزون والطلبات والعملاء
 * - قائمة انتظار للإشعارات غير المرسلة
 */

import { sqliteAPI } from '@/lib/db/sqliteAPI';
import { supabase } from '@/lib/supabase';

// أنواع الإشعارات
export type NotificationType =
  | 'new_order'           // طلب جديد
  | 'order_status_change' // تغيير حالة طلب
  | 'low_stock'           // مخزون منخفض
  | 'out_of_stock'        // نفاد المخزون
  | 'stock_restored'      // استعادة المخزون
  | 'payment_received'    // دفعة مستلمة
  | 'debt_reminder'       // تذكير بدين
  | 'debt_overdue'        // دين متأخر
  | 'customer_inactive'   // عميل غير نشط
  | 'subscription_expiry' // انتهاء اشتراك
  | 'sync_completed'      // اكتمال المزامنة
  | 'sync_failed'         // فشل المزامنة
  | 'repair_status'       // حالة إصلاح
  | 'invoice_due'         // فاتورة مستحقة
  | 'return_request'      // طلب إرجاع
  | 'price_change'        // تغيير سعر
  | 'custom';             // مخصص

// أولوية الإشعار
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// حالة الإشعار
export type NotificationStatus = 'pending' | 'delivered' | 'read' | 'dismissed';

// مصدر الإشعار
export type NotificationSource = 'local' | 'server' | 'system';

// واجهة الإشعار
export interface OfflineNotification {
  id: string;
  organization_id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  source: NotificationSource;
  is_read: boolean;
  data?: Record<string, any>;
  action_url?: string;
  action_label?: string;
  created_at: string;
  read_at?: string;
  expires_at?: string;
  sync_status: 'synced' | 'pending' | 'failed';
  retry_count: number;
}

// إعدادات المخزون المنخفض
export interface LowStockSettings {
  enabled: boolean;
  threshold: number;        // العتبة الافتراضية
  criticalThreshold: number; // عتبة النفاد الحرج
  checkInterval: number;    // فترة الفحص بالملي ثانية
  notifyOnRestore: boolean; // إشعار عند استعادة المخزون
}

// إعدادات تذكير الديون
export interface DebtReminderSettings {
  enabled: boolean;
  reminderDays: number[];   // أيام التذكير قبل الاستحقاق
  overdueCheckInterval: number;
}

// إعدادات الإشعارات
export interface NotificationSettings {
  lowStock: LowStockSettings;
  debtReminder: DebtReminderSettings;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  maxStoredNotifications: number;
  retentionDays: number;
}

// الإعدادات الافتراضية
const DEFAULT_SETTINGS: NotificationSettings = {
  lowStock: {
    enabled: true,
    threshold: 10,
    criticalThreshold: 3,
    checkInterval: 30 * 60 * 1000, // 30 دقيقة
    notifyOnRestore: true
  },
  debtReminder: {
    enabled: true,
    reminderDays: [7, 3, 1, 0],
    overdueCheckInterval: 24 * 60 * 60 * 1000 // يوميا
  },
  soundEnabled: true,
  desktopNotifications: true,
  maxStoredNotifications: 500,
  retentionDays: 30
};

// جدول SQLite للإشعارات
const CREATE_NOTIFICATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS offline_notifications (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    source TEXT DEFAULT 'local',
    is_read INTEGER DEFAULT 0,
    data TEXT,
    action_url TEXT,
    action_label TEXT,
    created_at TEXT NOT NULL,
    read_at TEXT,
    expires_at TEXT,
    sync_status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0
  )
`;

const CREATE_NOTIFICATIONS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_notifications_org_date
  ON offline_notifications(organization_id, created_at DESC)
`;

const CREATE_NOTIFICATION_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS notification_settings (
    organization_id TEXT PRIMARY KEY,
    settings TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

// جدول تتبع المخزون المنخفض (لتجنب الإشعارات المتكررة)
const CREATE_LOW_STOCK_TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS low_stock_tracking (
    product_id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    last_notified_at TEXT,
    last_quantity INTEGER,
    notification_count INTEGER DEFAULT 0
  )
`;

class OfflineNotificationService {
  private static instance: OfflineNotificationService;
  private initialized = false;
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private listeners: Set<(notification: OfflineNotification) => void> = new Set();
  private lowStockInterval: number | null = null;
  private debtReminderInterval: number | null = null;
  private syncInterval: number | null = null;

  private constructor() {}

  static getInstance(): OfflineNotificationService {
    if (!OfflineNotificationService.instance) {
      OfflineNotificationService.instance = new OfflineNotificationService();
    }
    return OfflineNotificationService.instance;
  }

  /**
   * تهيئة الخدمة
   */
  async initialize(organizationId: string): Promise<void> {
    if (this.initialized) return;

    try {
      // إنشاء الجداول
      await this.createTables();

      // تحميل الإعدادات
      await this.loadSettings(organizationId);

      // بدء المراقبة
      this.startMonitoring(organizationId);

      // بدء المزامنة الدورية
      this.startSyncInterval(organizationId);

      this.initialized = true;
      console.log('[OfflineNotifications] Service initialized');
    } catch (error) {
      console.error('[OfflineNotifications] Initialization error:', error);
    }
  }

  /**
   * إنشاء جداول SQLite
   */
  private async createTables(): Promise<void> {
    try {
      await sqliteAPI.execute(CREATE_NOTIFICATIONS_TABLE);
      await sqliteAPI.execute(CREATE_NOTIFICATIONS_INDEX);
      await sqliteAPI.execute(CREATE_NOTIFICATION_SETTINGS_TABLE);
      await sqliteAPI.execute(CREATE_LOW_STOCK_TRACKING_TABLE);
    } catch (error) {
      console.error('[OfflineNotifications] Error creating tables:', error);
    }
  }

  /**
   * تحميل الإعدادات
   */
  private async loadSettings(organizationId: string): Promise<void> {
    try {
      const result = await sqliteAPI.query<{ settings: string }>(
        'SELECT settings FROM notification_settings WHERE organization_id = ?',
        [organizationId]
      );

      if (result.length > 0) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(result[0].settings) };
      }
    } catch (error) {
      console.error('[OfflineNotifications] Error loading settings:', error);
    }
  }

  /**
   * حفظ الإعدادات
   */
  async saveSettings(organizationId: string, settings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };

    try {
      await sqliteAPI.execute(
        `INSERT OR REPLACE INTO notification_settings (organization_id, settings, updated_at)
         VALUES (?, ?, ?)`,
        [organizationId, JSON.stringify(this.settings), new Date().toISOString()]
      );
    } catch (error) {
      console.error('[OfflineNotifications] Error saving settings:', error);
    }
  }

  /**
   * إنشاء إشعار جديد
   */
  async createNotification(
    organizationId: string,
    notification: Omit<OfflineNotification, 'id' | 'organization_id' | 'created_at' | 'sync_status' | 'retry_count' | 'status'>
  ): Promise<OfflineNotification> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const fullNotification: OfflineNotification = {
      id,
      organization_id: organizationId,
      status: 'pending',
      sync_status: 'pending',
      retry_count: 0,
      created_at: now,
      ...notification
    };

    // حفظ في SQLite
    await this.saveNotification(fullNotification);

    // إشعار المستمعين
    this.notifyListeners(fullNotification);

    // محاولة المزامنة مع الخادم
    if (navigator.onLine) {
      this.syncNotificationToServer(fullNotification);
    }

    return fullNotification;
  }

  /**
   * حفظ إشعار في SQLite
   */
  private async saveNotification(notification: OfflineNotification): Promise<void> {
    try {
      await sqliteAPI.execute(
        `INSERT OR REPLACE INTO offline_notifications
         (id, organization_id, type, title, message, priority, status, source,
          is_read, data, action_url, action_label, created_at, read_at,
          expires_at, sync_status, retry_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notification.id,
          notification.organization_id,
          notification.type,
          notification.title,
          notification.message,
          notification.priority,
          notification.status,
          notification.source,
          notification.is_read ? 1 : 0,
          notification.data ? JSON.stringify(notification.data) : null,
          notification.action_url || null,
          notification.action_label || null,
          notification.created_at,
          notification.read_at || null,
          notification.expires_at || null,
          notification.sync_status,
          notification.retry_count
        ]
      );
    } catch (error) {
      console.error('[OfflineNotifications] Error saving notification:', error);
    }
  }

  /**
   * جلب الإشعارات
   */
  async getNotifications(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      types?: NotificationType[];
      priority?: NotificationPriority;
    } = {}
  ): Promise<OfflineNotification[]> {
    const { limit = 50, offset = 0, unreadOnly = false, types, priority } = options;

    let query = 'SELECT * FROM offline_notifications WHERE organization_id = ?';
    const params: any[] = [organizationId];

    if (unreadOnly) {
      query += ' AND is_read = 0';
    }

    if (types && types.length > 0) {
      query += ` AND type IN (${types.map(() => '?').join(',')})`;
      params.push(...types);
    }

    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    try {
      const results = await sqliteAPI.query<any>(query, params);
      return results.map(this.mapNotificationFromDb);
    } catch (error) {
      console.error('[OfflineNotifications] Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * تحويل من قاعدة البيانات
   */
  private mapNotificationFromDb(row: any): OfflineNotification {
    return {
      ...row,
      is_read: Boolean(row.is_read),
      data: row.data ? JSON.parse(row.data) : undefined
    };
  }

  /**
   * تعليم إشعار كمقروء
   */
  async markAsRead(notificationId: string): Promise<void> {
    const now = new Date().toISOString();
    try {
      await sqliteAPI.execute(
        'UPDATE offline_notifications SET is_read = 1, read_at = ?, status = ? WHERE id = ?',
        [now, 'read', notificationId]
      );
    } catch (error) {
      console.error('[OfflineNotifications] Error marking as read:', error);
    }
  }

  /**
   * تعليم جميع الإشعارات كمقروءة
   */
  async markAllAsRead(organizationId: string): Promise<void> {
    const now = new Date().toISOString();
    try {
      await sqliteAPI.execute(
        'UPDATE offline_notifications SET is_read = 1, read_at = ?, status = ? WHERE organization_id = ? AND is_read = 0',
        [now, 'read', organizationId]
      );
    } catch (error) {
      console.error('[OfflineNotifications] Error marking all as read:', error);
    }
  }

  /**
   * حذف إشعار
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await sqliteAPI.execute(
        'DELETE FROM offline_notifications WHERE id = ?',
        [notificationId]
      );
    } catch (error) {
      console.error('[OfflineNotifications] Error deleting notification:', error);
    }
  }

  /**
   * عدد الإشعارات غير المقروءة
   */
  async getUnreadCount(organizationId: string): Promise<number> {
    try {
      const result = await sqliteAPI.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM offline_notifications WHERE organization_id = ? AND is_read = 0',
        [organizationId]
      );
      return result[0]?.count || 0;
    } catch (error) {
      console.error('[OfflineNotifications] Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * الاشتراك في الإشعارات الجديدة
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
        console.error('[OfflineNotifications] Listener error:', error);
      }
    });

    // إرسال حدث عام
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offlineNotification', {
        detail: notification
      }));
    }
  }

  /**
   * بدء مراقبة المخزون والديون
   */
  private startMonitoring(organizationId: string): void {
    // مراقبة المخزون المنخفض
    if (this.settings.lowStock.enabled) {
      this.checkLowStock(organizationId);
      this.lowStockInterval = window.setInterval(
        () => this.checkLowStock(organizationId),
        this.settings.lowStock.checkInterval
      );
    }

    // مراقبة الديون المتأخرة
    if (this.settings.debtReminder.enabled) {
      this.checkOverdueDebts(organizationId);
      this.debtReminderInterval = window.setInterval(
        () => this.checkOverdueDebts(organizationId),
        this.settings.debtReminder.overdueCheckInterval
      );
    }
  }

  /**
   * فحص المخزون المنخفض
   */
  async checkLowStock(organizationId: string): Promise<void> {
    try {
      // جلب المنتجات من SQLite
      const products = await sqliteAPI.query<{
        id: string;
        name: string;
        quantity: number;
        min_stock_level: number;
        image_url?: string;
      }>(
        `SELECT id, name, quantity, min_stock_level, image_url
         FROM products
         WHERE organization_id = ? AND track_stock = 1`,
        [organizationId]
      );

      for (const product of products) {
        const threshold = product.min_stock_level || this.settings.lowStock.threshold;
        const criticalThreshold = this.settings.lowStock.criticalThreshold;

        // التحقق من آخر إشعار لهذا المنتج
        const tracking = await this.getLowStockTracking(product.id);

        if (product.quantity <= 0) {
          // نفاد المخزون
          if (!tracking || tracking.last_quantity > 0) {
            await this.createNotification(organizationId, {
              type: 'out_of_stock',
              title: 'نفاد المخزون',
              message: `المنتج "${product.name}" نفد من المخزون`,
              priority: 'urgent',
              source: 'local',
              is_read: false,
              data: { product_id: product.id, product_name: product.name, quantity: 0 },
              action_url: `/dashboard/inventory?product=${product.id}`,
              action_label: 'إدارة المخزون'
            });
            await this.updateLowStockTracking(product.id, organizationId, product.quantity);
          }
        } else if (product.quantity <= criticalThreshold) {
          // مخزون حرج
          if (!tracking || tracking.last_quantity > criticalThreshold) {
            await this.createNotification(organizationId, {
              type: 'low_stock',
              title: 'مخزون حرج',
              message: `المنتج "${product.name}" وصل لمستوى حرج (${product.quantity} وحدة)`,
              priority: 'high',
              source: 'local',
              is_read: false,
              data: { product_id: product.id, product_name: product.name, quantity: product.quantity },
              action_url: `/dashboard/inventory?product=${product.id}`,
              action_label: 'إعادة التخزين'
            });
            await this.updateLowStockTracking(product.id, organizationId, product.quantity);
          }
        } else if (product.quantity <= threshold) {
          // مخزون منخفض
          if (!tracking || tracking.last_quantity > threshold) {
            await this.createNotification(organizationId, {
              type: 'low_stock',
              title: 'مخزون منخفض',
              message: `المنتج "${product.name}" أقل من الحد الأدنى (${product.quantity}/${threshold})`,
              priority: 'medium',
              source: 'local',
              is_read: false,
              data: { product_id: product.id, product_name: product.name, quantity: product.quantity, threshold },
              action_url: `/dashboard/inventory?product=${product.id}`,
              action_label: 'عرض المنتج'
            });
            await this.updateLowStockTracking(product.id, organizationId, product.quantity);
          }
        } else if (this.settings.lowStock.notifyOnRestore && tracking && tracking.last_quantity <= threshold) {
          // استعادة المخزون
          await this.createNotification(organizationId, {
            type: 'stock_restored',
            title: 'تم استعادة المخزون',
            message: `المنتج "${product.name}" أصبح متوفراً (${product.quantity} وحدة)`,
            priority: 'low',
            source: 'local',
            is_read: false,
            data: { product_id: product.id, product_name: product.name, quantity: product.quantity }
          });
          await this.updateLowStockTracking(product.id, organizationId, product.quantity);
        }
      }
    } catch (error) {
      console.error('[OfflineNotifications] Error checking low stock:', error);
    }
  }

  /**
   * جلب تتبع المخزون المنخفض
   */
  private async getLowStockTracking(productId: string): Promise<{ last_quantity: number } | null> {
    try {
      const result = await sqliteAPI.query<{ last_quantity: number }>(
        'SELECT last_quantity FROM low_stock_tracking WHERE product_id = ?',
        [productId]
      );
      return result[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * تحديث تتبع المخزون المنخفض
   */
  private async updateLowStockTracking(productId: string, organizationId: string, quantity: number): Promise<void> {
    try {
      await sqliteAPI.execute(
        `INSERT OR REPLACE INTO low_stock_tracking
         (product_id, organization_id, last_notified_at, last_quantity, notification_count)
         VALUES (?, ?, ?, ?, COALESCE((SELECT notification_count + 1 FROM low_stock_tracking WHERE product_id = ?), 1))`,
        [productId, organizationId, new Date().toISOString(), quantity, productId]
      );
    } catch (error) {
      console.error('[OfflineNotifications] Error updating low stock tracking:', error);
    }
  }

  /**
   * فحص الديون المتأخرة
   */
  async checkOverdueDebts(organizationId: string): Promise<void> {
    try {
      const debts = await sqliteAPI.query<{
        id: string;
        customer_id: string;
        customer_name: string;
        amount: number;
        due_date: string;
        status: string;
      }>(
        `SELECT d.id, d.customer_id, c.name as customer_name, d.amount, d.due_date, d.status
         FROM customer_debts d
         LEFT JOIN customers c ON d.customer_id = c.id
         WHERE d.organization_id = ? AND d.status = 'pending'`,
        [organizationId]
      );

      const now = new Date();
      const reminderDays = this.settings.debtReminder.reminderDays;

      for (const debt of debts) {
        if (!debt.due_date) continue;

        const dueDate = new Date(debt.due_date);
        const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // التحقق من التذكيرات
        for (const days of reminderDays) {
          if (daysUntilDue === days) {
            const priority: NotificationPriority =
              daysUntilDue <= 0 ? 'urgent' :
              daysUntilDue <= 1 ? 'high' :
              daysUntilDue <= 3 ? 'medium' : 'low';

            await this.createNotification(organizationId, {
              type: daysUntilDue <= 0 ? 'debt_overdue' : 'debt_reminder',
              title: daysUntilDue <= 0 ? 'دين متأخر' : 'تذكير بدين',
              message: daysUntilDue <= 0
                ? `الدين على "${debt.customer_name}" متأخر بقيمة ${debt.amount} دج`
                : `متبقي ${daysUntilDue} ${daysUntilDue === 1 ? 'يوم' : 'أيام'} على استحقاق دين "${debt.customer_name}" (${debt.amount} دج)`,
              priority,
              source: 'local',
              is_read: false,
              data: {
                debt_id: debt.id,
                customer_id: debt.customer_id,
                customer_name: debt.customer_name,
                amount: debt.amount,
                due_date: debt.due_date
              },
              action_url: `/dashboard/debts?customer=${debt.customer_id}`,
              action_label: 'عرض الديون'
            });
            break;
          }
        }
      }
    } catch (error) {
      console.error('[OfflineNotifications] Error checking overdue debts:', error);
    }
  }

  /**
   * مزامنة الإشعارات مع الخادم
   */
  private async syncNotificationToServer(notification: OfflineNotification): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .upsert({
          id: notification.id,
          organization_id: notification.organization_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          is_read: notification.is_read,
          data: notification.data,
          created_at: notification.created_at
        });

      if (error) throw error;

      // تحديث حالة المزامنة
      await sqliteAPI.execute(
        'UPDATE offline_notifications SET sync_status = ? WHERE id = ?',
        ['synced', notification.id]
      );
    } catch (error) {
      console.error('[OfflineNotifications] Sync error:', error);

      // تحديث عداد المحاولات
      await sqliteAPI.execute(
        'UPDATE offline_notifications SET sync_status = ?, retry_count = retry_count + 1 WHERE id = ?',
        ['failed', notification.id]
      );
    }
  }

  /**
   * بدء المزامنة الدورية
   */
  private startSyncInterval(organizationId: string): void {
    // مزامنة كل 5 دقائق
    this.syncInterval = window.setInterval(
      () => this.syncPendingNotifications(organizationId),
      5 * 60 * 1000
    );

    // مزامنة عند استعادة الاتصال
    window.addEventListener('online', () => {
      this.syncPendingNotifications(organizationId);
    });
  }

  /**
   * مزامنة الإشعارات المعلقة
   */
  async syncPendingNotifications(organizationId: string): Promise<void> {
    if (!navigator.onLine) return;

    try {
      const pending = await sqliteAPI.query<any>(
        `SELECT * FROM offline_notifications
         WHERE organization_id = ? AND sync_status IN ('pending', 'failed') AND retry_count < 5
         ORDER BY created_at ASC LIMIT 50`,
        [organizationId]
      );

      for (const row of pending) {
        await this.syncNotificationToServer(this.mapNotificationFromDb(row));
      }
    } catch (error) {
      console.error('[OfflineNotifications] Error syncing pending:', error);
    }
  }

  /**
   * تنظيف الإشعارات القديمة
   */
  async cleanupOldNotifications(organizationId: string): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.settings.retentionDays);

    try {
      await sqliteAPI.execute(
        `DELETE FROM offline_notifications
         WHERE organization_id = ? AND created_at < ? AND is_read = 1`,
        [organizationId, cutoffDate.toISOString()]
      );

      // التحقق من الحد الأقصى
      const count = await sqliteAPI.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM offline_notifications WHERE organization_id = ?',
        [organizationId]
      );

      if (count[0]?.count > this.settings.maxStoredNotifications) {
        await sqliteAPI.execute(
          `DELETE FROM offline_notifications
           WHERE id IN (
             SELECT id FROM offline_notifications
             WHERE organization_id = ?
             ORDER BY created_at ASC
             LIMIT ?
           )`,
          [organizationId, count[0].count - this.settings.maxStoredNotifications]
        );
      }
    } catch (error) {
      console.error('[OfflineNotifications] Error cleaning up:', error);
    }
  }

  /**
   * إيقاف الخدمة
   */
  stop(): void {
    if (this.lowStockInterval) {
      clearInterval(this.lowStockInterval);
      this.lowStockInterval = null;
    }
    if (this.debtReminderInterval) {
      clearInterval(this.debtReminderInterval);
      this.debtReminderInterval = null;
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.listeners.clear();
    this.initialized = false;
  }
}

// تصدير المثيل الوحيد
export const offlineNotificationService = OfflineNotificationService.getInstance();
