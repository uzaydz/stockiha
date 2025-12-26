/**
 * خدمة الإشعارات المحلية (Local-Only)
 * =====================================
 *
 * ⚡ v5.0 - نظام إشعارات محلي بالكامل
 *
 * الميزات:
 * - تخزين الإشعارات في PowerSync (SQLite) محلياً فقط
 * - إنشاء إشعارات محلية للمخزون والديون
 * - بدون مزامنة مع السيرفر (إلا للطلبات الإلكترونية عبر Realtime)
 * - أداء عالي وسرعة فائقة
 *
 * الاستثناء الوحيد:
 * - إشعارات الطلبات الإلكترونية تأتي من Supabase Realtime
 *   ويتم تخزينها محلياً أيضاً
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 TYPES
// ═══════════════════════════════════════════════════════════════════════════

// أنواع الإشعارات
export type NotificationType =
  | 'new_order'           // طلب جديد (من السيرفر عبر Realtime)
  | 'low_stock'           // مخزون منخفض
  | 'out_of_stock'        // نفاد المخزون
  | 'stock_restored'      // استعادة المخزون
  | 'payment_received'    // دفعة مستلمة
  | 'debt_reminder'       // تذكير بدين
  | 'debt_overdue'        // دين متأخر
  | 'customer_inactive'   // عميل غير نشط
  | 'subscription_expiry' // انتهاء اشتراك
  | 'repair_status'       // حالة إصلاح
  | 'invoice_due'         // فاتورة مستحقة
  | 'return_request'      // طلب إرجاع
  | 'custom';             // مخصص

// أولوية الإشعار
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// حالة الإشعار
export type NotificationStatus = 'pending' | 'delivered' | 'read' | 'dismissed';

// مصدر الإشعار
export type NotificationSource = 'local' | 'server';

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
}

// إعدادات المخزون المنخفض
export interface LowStockSettings {
  enabled: boolean;
  threshold: number;
  criticalThreshold: number;
  checkInterval: number;
  notifyOnRestore: boolean;
}

// إعدادات تذكير الديون
export interface DebtReminderSettings {
  enabled: boolean;
  reminderDays: number[];
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

// ═══════════════════════════════════════════════════════════════════════════
// ⚙️ DEFAULT SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

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
    overdueCheckInterval: 24 * 60 * 60 * 1000 // يومياً
  },
  soundEnabled: true,
  desktopNotifications: true,
  maxStoredNotifications: 500,
  retentionDays: 30
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔔 NOTIFICATION SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

class OfflineNotificationService {
  private static instance: OfflineNotificationService;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private listeners: Set<(notification: OfflineNotification) => void> = new Set();
  private lowStockInterval: number | null = null;
  private debtReminderInterval: number | null = null;
  private currentOrganizationId: string | null = null;

  private constructor() {}

  static getInstance(): OfflineNotificationService {
    if (!OfflineNotificationService.instance) {
      OfflineNotificationService.instance = new OfflineNotificationService();
    }
    return OfflineNotificationService.instance;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚀 INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تهيئة الخدمة
   */
  async initialize(organizationId: string): Promise<void> {
    if (this.initialized && this.currentOrganizationId === organizationId) {
      return;
    }

    if (this.initPromise && this.currentOrganizationId === organizationId) {
      await this.initPromise;
      return;
    }

    // إذا كان هناك تهيئة سابقة لمؤسسة مختلفة، نظفها
    if (this.initialized && this.currentOrganizationId !== organizationId) {
      this.stop();
    }

    this.initPromise = (async () => {
      try {
        this.currentOrganizationId = organizationId;

        // تحميل الإعدادات
        await this.loadSettings(organizationId);

        // بدء المراقبة المحلية
        this.startLocalMonitoring(organizationId);

        this.initialized = true;
        console.log('[LocalNotifications] ✅ Service initialized (local-only mode)');
      } catch (error) {
        console.error('[LocalNotifications] ❌ Initialization error:', error);
      } finally {
        this.initPromise = null;
      }
    })();

    await this.initPromise;
  }

  /**
   * تحميل الإعدادات من PowerSync
   */
  private async loadSettings(organizationId: string): Promise<void> {
    try {
      const result = await powerSyncService.queryOne<{ settings: string }>({
        sql: 'SELECT settings FROM notification_settings WHERE organization_id = ?',
        params: [organizationId]
      });

      if (result) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(result.settings) };
      }
    } catch (error) {
      // استخدام الإعدادات الافتراضية في حالة الخطأ
      console.log('[LocalNotifications] Using default settings');
    }
  }

  /**
   * حفظ الإعدادات
   */
  async saveSettings(organizationId: string, settings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };

    try {
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          `INSERT OR REPLACE INTO notification_settings (organization_id, settings, updated_at)
           VALUES (?, ?, ?)`,
          [organizationId, JSON.stringify(this.settings), new Date().toISOString()]
        );
      });
    } catch (error) {
      console.error('[LocalNotifications] Error saving settings:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📝 NOTIFICATION CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * إنشاء إشعار جديد (محلي)
   */
  async createNotification(
    organizationId: string,
    notification: Omit<OfflineNotification, 'id' | 'organization_id' | 'created_at' | 'status'>
  ): Promise<OfflineNotification> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const fullNotification: OfflineNotification = {
      id,
      organization_id: organizationId,
      status: 'delivered',
      created_at: now,
      ...notification
    };

    // حفظ في PowerSync (محلي فقط)
    await this.saveNotification(fullNotification);

    // إشعار المستمعين
    this.notifyListeners(fullNotification);

    return fullNotification;
  }

  /**
   * حفظ إشعار في PowerSync
   */
  private async saveNotification(notification: OfflineNotification): Promise<void> {
    try {
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          `INSERT OR REPLACE INTO offline_notifications
           (id, organization_id, type, title, message, priority, status, source,
            is_read, data, action_url, action_label, created_at, read_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            notification.expires_at || null
          ]
        );
      });
    } catch (error) {
      console.error('[LocalNotifications] Error saving notification:', error);
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
      const results = await powerSyncService.query<any>({ sql: query, params });
      return results.map(this.mapNotificationFromDb);
    } catch (error) {
      console.error('[LocalNotifications] Error fetching notifications:', error);
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
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          'UPDATE offline_notifications SET is_read = 1, read_at = ?, status = ? WHERE id = ?',
          [now, 'read', notificationId]
        );
      });
    } catch (error) {
      console.error('[LocalNotifications] Error marking as read:', error);
    }
  }

  /**
   * تعليم جميع الإشعارات كمقروءة
   */
  async markAllAsRead(organizationId: string): Promise<void> {
    const now = new Date().toISOString();
    try {
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          'UPDATE offline_notifications SET is_read = 1, read_at = ?, status = ? WHERE organization_id = ? AND is_read = 0',
          [now, 'read', organizationId]
        );
      });
    } catch (error) {
      console.error('[LocalNotifications] Error marking all as read:', error);
    }
  }

  /**
   * حذف إشعار
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          'DELETE FROM offline_notifications WHERE id = ?',
          [notificationId]
        );
      });
    } catch (error) {
      console.error('[LocalNotifications] Error deleting notification:', error);
    }
  }

  /**
   * حذف جميع الإشعارات المقروءة
   */
  async deleteReadNotifications(organizationId: string): Promise<void> {
    try {
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          'DELETE FROM offline_notifications WHERE organization_id = ? AND is_read = 1',
          [organizationId]
        );
      });
    } catch (error) {
      console.error('[LocalNotifications] Error deleting read notifications:', error);
    }
  }

  /**
   * عدد الإشعارات غير المقروءة
   */
  async getUnreadCount(organizationId: string): Promise<number> {
    try {
      const result = await powerSyncService.queryOne<{ count: number }>({
        sql: 'SELECT COUNT(*) as count FROM offline_notifications WHERE organization_id = ? AND is_read = 0',
        params: [organizationId]
      });
      return result?.count || 0;
    } catch (error) {
      console.error('[LocalNotifications] Error getting unread count:', error);
      return 0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 👂 LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

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
        console.error('[LocalNotifications] Listener error:', error);
      }
    });

    // إرسال حدث عام
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('localNotification', {
        detail: notification
      }));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔍 LOCAL MONITORING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * بدء المراقبة المحلية
   */
  private startLocalMonitoring(organizationId: string): void {
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
   * ⚡ محسّن: يستخدم Batch Query بدلاً من N+1 queries
   */
  async checkLowStock(organizationId: string): Promise<void> {
    try {
      const products = await powerSyncService.query<{
        id: string;
        name: string;
        quantity: number;
        min_stock_level: number;
      }>({
        sql: `SELECT id, name, stock_quantity as quantity, min_stock_level
         FROM products
         WHERE organization_id = ? AND is_active = 1`,
        params: [organizationId]
      });

      // ⚡ تحسين: جلب جميع التتبعات دفعة واحدة (حل N+1 Query)
      const productIds = products.map(p => p.id);
      await this.preloadLowStockTracking(productIds);

      for (const product of products) {
        const threshold = product.min_stock_level || this.settings.lowStock.threshold;
        const criticalThreshold = this.settings.lowStock.criticalThreshold;

        // التحقق من آخر إشعار - الآن يستخدم الـ cache
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
      console.error('[LocalNotifications] Error checking low stock:', error);
    }
  }

  /**
   * جلب تتبع المخزون المنخفض - Batch Version
   * ⚡ تحسين: جلب جميع التتبعات دفعة واحدة بدلاً من N+1 queries
   */
  private async getLowStockTracking(productId: string): Promise<{ last_quantity: number } | null> {
    // استخدام الـ cache إذا كان متاحاً
    if (this.lowStockTrackingCache.has(productId)) {
      return this.lowStockTrackingCache.get(productId) || null;
    }

    try {
      const result = await powerSyncService.queryOne<{ last_quantity: number }>({
        sql: 'SELECT last_quantity FROM low_stock_tracking WHERE product_id = ?',
        params: [productId]
      });
      return result || null;
    } catch {
      return null;
    }
  }

  /**
   * ⚡ جلب جميع تتبعات المخزون دفعة واحدة (Batch)
   * هذا يحل مشكلة N+1 Query
   */
  private async preloadLowStockTracking(productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;

    try {
      // جلب جميع التتبعات دفعة واحدة
      const placeholders = productIds.map(() => '?').join(',');
      const trackings = await powerSyncService.query<{ product_id: string; last_quantity: number }>({
        sql: `SELECT product_id, last_quantity FROM low_stock_tracking WHERE product_id IN (${placeholders})`,
        params: productIds
      });

      // تخزين في الـ cache
      this.lowStockTrackingCache.clear();
      for (const tracking of trackings) {
        this.lowStockTrackingCache.set(tracking.product_id, { last_quantity: tracking.last_quantity });
      }

      // وضع null للمنتجات التي ليس لها تتبع
      for (const productId of productIds) {
        if (!this.lowStockTrackingCache.has(productId)) {
          this.lowStockTrackingCache.set(productId, null);
        }
      }
    } catch (error) {
      console.warn('[LocalNotifications] Error preloading low stock tracking:', error);
    }
  }

  // ⚡ Cache لتتبع المخزون - يُملأ مرة واحدة لكل دورة فحص
  private lowStockTrackingCache: Map<string, { last_quantity: number } | null> = new Map();

  /**
   * تحديث تتبع المخزون المنخفض
   */
  private async updateLowStockTracking(productId: string, organizationId: string, quantity: number): Promise<void> {
    try {
      // ⚡ جلب العدد الحالي قبل الـ transaction
      let newCount = 1;
      try {
        const current = await powerSyncService.queryOne<{ notification_count: number }>({
          sql: 'SELECT notification_count FROM low_stock_tracking WHERE product_id = ?',
          params: [productId]
        });
        if (current) {
          newCount = (current.notification_count || 0) + 1;
        }
      } catch {
        // إذا لم يوجد سجل، نبدأ من 1
      }

      const now = new Date().toISOString();
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          `INSERT OR REPLACE INTO low_stock_tracking
           (id, product_id, organization_id, last_notified_at, last_quantity, notification_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [productId, productId, organizationId, now, quantity, newCount, now, now]
        );
      });
    } catch (error) {
      console.error('[LocalNotifications] Error updating low stock tracking:', error);
    }
  }

  /**
   * فحص الديون المتأخرة
   * ⚡ v5.1: يستخدم جدول orders مباشرة بدلاً من customer_debts
   * الديون = طلبات فيها remaining_amount > 0
   */
  async checkOverdueDebts(organizationId: string): Promise<void> {
    try {
      // ⚡ جلب الديون من جدول orders مباشرة
      const debts = await powerSyncService.query<{
        id: string;
        customer_id: string;
        customer_name: string;
        amount: number;
        due_date: string;
      }>({
        sql: `SELECT
           o.id,
           o.customer_id,
           c.name as customer_name,
           COALESCE(o.remaining_amount, o.total) as amount,
           o.created_at as due_date
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         WHERE o.organization_id = ?
           AND COALESCE(o.remaining_amount, o.total) > 0
           AND o.status != 'cancelled'
           AND o.customer_id IS NOT NULL`,
        params: [organizationId]
      });

      const now = new Date();
      const reminderDays = this.settings.debtReminder.reminderDays;

      for (const debt of debts) {
        if (!debt.due_date) continue;

        const dueDate = new Date(debt.due_date);
        const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

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
      console.error('[LocalNotifications] Error checking overdue debts:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧹 CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تنظيف الإشعارات القديمة
   */
  async cleanupOldNotifications(organizationId: string): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.settings.retentionDays);

    try {
      await powerSyncService.transaction(async (tx) => {
        // حذف الإشعارات القديمة المقروءة
        await tx.execute(
          `DELETE FROM offline_notifications
           WHERE organization_id = ? AND created_at < ? AND is_read = 1`,
          [organizationId, cutoffDate.toISOString()]
        );
      });

      // التحقق من الحد الأقصى
      const count = await powerSyncService.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM offline_notifications WHERE organization_id = ?',
        [organizationId]
      );

      if (count?.count && count.count > this.settings.maxStoredNotifications) {
        await powerSyncService.transaction(async (tx) => {
          await tx.execute(
            `DELETE FROM offline_notifications
             WHERE id IN (
               SELECT id FROM offline_notifications
               WHERE organization_id = ?
               ORDER BY created_at ASC
               LIMIT ?
             )`,
            [organizationId, count.count - this.settings.maxStoredNotifications]
          );
        });
      }
    } catch (error) {
      console.error('[LocalNotifications] Error cleaning up:', error);
    }
  }

  /**
   * إيقاف الخدمة وتنظيف الموارد
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

    this.listeners.clear();
    this.initialized = false;
    this.currentOrganizationId = null;

    console.log('[LocalNotifications] ✅ Service stopped');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  get isInitialized(): boolean {
    return this.initialized;
  }

  get currentSettings(): NotificationSettings {
    return { ...this.settings };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📤 EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const offlineNotificationService = OfflineNotificationService.getInstance();
