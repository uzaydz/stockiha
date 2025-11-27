/**
 * خدمة إشعارات العملاء والديون
 *
 * توفر:
 * - تذكيرات الديون المستحقة
 * - إشعارات الدفعات الجديدة
 * - تتبع العملاء غير النشطين
 * - إشعارات أعياد الميلاد والمناسبات
 */

import { sqliteAPI } from '@/lib/db/sqliteAPI';
import { offlineNotificationService, NotificationPriority, OfflineNotification } from './offlineNotificationService';

// واجهة العميل
export interface CustomerInfo {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  total_purchases: number;
  total_debt: number;
  last_purchase_date?: string;
  created_at: string;
}

// واجهة الدين
export interface DebtInfo {
  id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date?: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  notes?: string;
  created_at: string;
}

// إعدادات إشعارات العملاء
export interface CustomerNotificationSettings {
  enabled: boolean;
  debtReminders: {
    enabled: boolean;
    reminderDays: number[];
    overdueNotification: boolean;
  };
  inactiveCustomers: {
    enabled: boolean;
    inactiveDays: number;
    checkInterval: number;
  };
  newPayments: {
    enabled: boolean;
    notifyPartialPayments: boolean;
  };
  birthdayReminders: {
    enabled: boolean;
    daysBefore: number;
  };
  highValueCustomers: {
    enabled: boolean;
    threshold: number;
  };
}

const DEFAULT_CUSTOMER_SETTINGS: CustomerNotificationSettings = {
  enabled: true,
  debtReminders: {
    enabled: true,
    reminderDays: [7, 3, 1, 0, -7, -14, -30],
    overdueNotification: true
  },
  inactiveCustomers: {
    enabled: true,
    inactiveDays: 60,
    checkInterval: 24 * 60 * 60 * 1000 // يوميا
  },
  newPayments: {
    enabled: true,
    notifyPartialPayments: true
  },
  birthdayReminders: {
    enabled: true,
    daysBefore: 1
  },
  highValueCustomers: {
    enabled: true,
    threshold: 100000 // 100,000 دج
  }
};

// جداول التتبع
const CREATE_DEBT_REMINDER_TRACKING = `
  CREATE TABLE IF NOT EXISTS debt_reminder_tracking (
    debt_id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    last_reminder_days INTEGER,
    last_reminded_at TEXT,
    reminder_count INTEGER DEFAULT 0
  )
`;

const CREATE_INACTIVE_CUSTOMER_TRACKING = `
  CREATE TABLE IF NOT EXISTS inactive_customer_tracking (
    customer_id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    last_notified_at TEXT,
    notification_count INTEGER DEFAULT 0
  )
`;

class CustomerNotificationService {
  private static instance: CustomerNotificationService;
  private settings: CustomerNotificationSettings = DEFAULT_CUSTOMER_SETTINGS;
  private checkInterval: number | null = null;
  private listeners: Set<(notification: OfflineNotification) => void> = new Set();
  private initialized = false;

  private constructor() {}

  static getInstance(): CustomerNotificationService {
    if (!CustomerNotificationService.instance) {
      CustomerNotificationService.instance = new CustomerNotificationService();
    }
    return CustomerNotificationService.instance;
  }

  /**
   * تهيئة الخدمة
   */
  async initialize(organizationId: string): Promise<void> {
    if (this.initialized) return;

    try {
      // إنشاء الجداول
      await sqliteAPI.execute(CREATE_DEBT_REMINDER_TRACKING);
      await sqliteAPI.execute(CREATE_INACTIVE_CUSTOMER_TRACKING);

      // بدء المراقبة
      this.startMonitoring(organizationId);

      this.initialized = true;
      console.log('[CustomerNotifications] Service initialized');
    } catch (error) {
      console.error('[CustomerNotifications] Initialization error:', error);
    }
  }

  /**
   * بدء المراقبة
   */
  private startMonitoring(organizationId: string): void {
    // فحص فوري
    this.runAllChecks(organizationId);

    // فحص دوري كل ساعة
    this.checkInterval = window.setInterval(
      () => this.runAllChecks(organizationId),
      60 * 60 * 1000
    );
  }

  /**
   * تشغيل جميع الفحوصات
   */
  private async runAllChecks(organizationId: string): Promise<void> {
    if (this.settings.debtReminders.enabled) {
      await this.checkDebtReminders(organizationId);
    }
    if (this.settings.inactiveCustomers.enabled) {
      await this.checkInactiveCustomers(organizationId);
    }
    if (this.settings.birthdayReminders.enabled) {
      await this.checkBirthdays(organizationId);
    }
  }

  /**
   * فحص تذكيرات الديون
   */
  async checkDebtReminders(organizationId: string): Promise<void> {
    try {
      const debts = await sqliteAPI.query<any>(
        `SELECT d.*, c.name as customer_name, c.phone as customer_phone
         FROM customer_debts d
         LEFT JOIN customers c ON d.customer_id = c.id
         WHERE d.organization_id = ? AND d.status IN ('pending', 'partial')`,
        [organizationId]
      );

      const now = new Date();

      for (const debt of debts) {
        if (!debt.due_date) continue;

        const dueDate = new Date(debt.due_date);
        const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const remainingAmount = debt.amount - (debt.paid_amount || 0);

        // التحقق من آخر تذكير
        const tracking = await this.getDebtReminderTracking(debt.id);
        const lastReminderDays = tracking?.last_reminder_days;

        // البحث عن حد التذكير المناسب
        for (const days of this.settings.debtReminders.reminderDays) {
          if (daysUntilDue <= days && lastReminderDays !== days) {
            const isOverdue = daysUntilDue < 0;
            const priority: NotificationPriority = this.getDebtPriority(daysUntilDue, remainingAmount);

            let title: string;
            let message: string;

            if (isOverdue) {
              const overdueDays = Math.abs(daysUntilDue);
              title = `⚠️ دين متأخر - ${debt.customer_name}`;
              message = `دين متأخر منذ ${overdueDays} ${overdueDays === 1 ? 'يوم' : 'أيام'} بقيمة ${remainingAmount.toLocaleString()} دج`;
            } else if (daysUntilDue === 0) {
              title = `🔴 دين مستحق اليوم - ${debt.customer_name}`;
              message = `الدين مستحق اليوم بقيمة ${remainingAmount.toLocaleString()} دج`;
            } else {
              title = `📅 تذكير بدين - ${debt.customer_name}`;
              message = `متبقي ${daysUntilDue} ${daysUntilDue === 1 ? 'يوم' : 'أيام'} على استحقاق دين بقيمة ${remainingAmount.toLocaleString()} دج`;
            }

            const notification = await offlineNotificationService.createNotification(organizationId, {
              type: isOverdue ? 'debt_overdue' : 'debt_reminder',
              title,
              message,
              priority,
              source: 'local',
              is_read: false,
              data: {
                debt_id: debt.id,
                customer_id: debt.customer_id,
                customer_name: debt.customer_name,
                customer_phone: debt.customer_phone,
                total_amount: debt.amount,
                remaining_amount: remainingAmount,
                due_date: debt.due_date,
                days_until_due: daysUntilDue
              },
              action_url: `/dashboard/debts?customer=${debt.customer_id}`,
              action_label: isOverdue ? 'متابعة الدين' : 'عرض الدين'
            });

            // تحديث التتبع
            await this.updateDebtReminderTracking(debt.id, organizationId, days);
            this.notifyListeners(notification);
            break; // إرسال تذكير واحد فقط لكل دين
          }
        }
      }
    } catch (error) {
      console.error('[CustomerNotifications] Error checking debt reminders:', error);
    }
  }

  /**
   * حساب أولوية الدين
   */
  private getDebtPriority(daysUntilDue: number, amount: number): NotificationPriority {
    if (daysUntilDue < -30) return 'urgent';
    if (daysUntilDue < -7) return 'high';
    if (daysUntilDue <= 0) return 'high';
    if (daysUntilDue <= 3) return 'medium';
    if (amount > this.settings.highValueCustomers.threshold) return 'medium';
    return 'low';
  }

  /**
   * جلب تتبع تذكير الدين
   */
  private async getDebtReminderTracking(debtId: string): Promise<any | null> {
    try {
      const result = await sqliteAPI.query<any>(
        'SELECT * FROM debt_reminder_tracking WHERE debt_id = ?',
        [debtId]
      );
      return result[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * تحديث تتبع تذكير الدين
   */
  private async updateDebtReminderTracking(
    debtId: string,
    organizationId: string,
    days: number
  ): Promise<void> {
    try {
      await sqliteAPI.execute(
        `INSERT OR REPLACE INTO debt_reminder_tracking
         (debt_id, organization_id, last_reminder_days, last_reminded_at, reminder_count)
         VALUES (?, ?, ?, ?, COALESCE((SELECT reminder_count + 1 FROM debt_reminder_tracking WHERE debt_id = ?), 1))`,
        [debtId, organizationId, days, new Date().toISOString(), debtId]
      );
    } catch (error) {
      console.error('[CustomerNotifications] Error updating debt tracking:', error);
    }
  }

  /**
   * فحص العملاء غير النشطين
   */
  async checkInactiveCustomers(organizationId: string): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.settings.inactiveCustomers.inactiveDays);

      const inactiveCustomers = await sqliteAPI.query<any>(
        `SELECT c.*,
                (SELECT SUM(total) FROM orders WHERE customer_id = c.id) as total_purchases,
                (SELECT MAX(created_at) FROM orders WHERE customer_id = c.id) as last_purchase_date
         FROM customers c
         WHERE c.organization_id = ?
           AND c.id NOT IN (
             SELECT DISTINCT customer_id FROM orders
             WHERE organization_id = ? AND created_at > ?
           )
           AND (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) > 0`,
        [organizationId, organizationId, cutoffDate.toISOString()]
      );

      for (const customer of inactiveCustomers) {
        // التحقق من آخر إشعار
        const tracking = await this.getInactiveCustomerTracking(customer.id);

        // إرسال إشعار مرة واحدة في الأسبوع كحد أقصى
        if (tracking) {
          const lastNotified = new Date(tracking.last_notified_at);
          const daysSinceNotification = Math.floor((Date.now() - lastNotified.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceNotification < 7) continue;
        }

        const daysSinceLastPurchase = customer.last_purchase_date
          ? Math.floor((Date.now() - new Date(customer.last_purchase_date).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const notification = await offlineNotificationService.createNotification(organizationId, {
          type: 'customer_inactive',
          title: `👤 عميل غير نشط`,
          message: `العميل "${customer.name}" لم يشترِ منذ ${daysSinceLastPurchase} يوماً (إجمالي مشترياته: ${(customer.total_purchases || 0).toLocaleString()} دج)`,
          priority: customer.total_purchases > this.settings.highValueCustomers.threshold ? 'medium' : 'low',
          source: 'local',
          is_read: false,
          data: {
            customer_id: customer.id,
            customer_name: customer.name,
            customer_phone: customer.phone,
            total_purchases: customer.total_purchases,
            days_inactive: daysSinceLastPurchase,
            last_purchase_date: customer.last_purchase_date
          },
          action_url: `/dashboard/customers/${customer.id}`,
          action_label: 'عرض العميل'
        });

        await this.updateInactiveCustomerTracking(customer.id, organizationId);
        this.notifyListeners(notification);
      }
    } catch (error) {
      console.error('[CustomerNotifications] Error checking inactive customers:', error);
    }
  }

  /**
   * جلب تتبع العميل غير النشط
   */
  private async getInactiveCustomerTracking(customerId: string): Promise<any | null> {
    try {
      const result = await sqliteAPI.query<any>(
        'SELECT * FROM inactive_customer_tracking WHERE customer_id = ?',
        [customerId]
      );
      return result[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * تحديث تتبع العميل غير النشط
   */
  private async updateInactiveCustomerTracking(
    customerId: string,
    organizationId: string
  ): Promise<void> {
    try {
      await sqliteAPI.execute(
        `INSERT OR REPLACE INTO inactive_customer_tracking
         (customer_id, organization_id, last_notified_at, notification_count)
         VALUES (?, ?, ?, COALESCE((SELECT notification_count + 1 FROM inactive_customer_tracking WHERE customer_id = ?), 1))`,
        [customerId, organizationId, new Date().toISOString(), customerId]
      );
    } catch (error) {
      console.error('[CustomerNotifications] Error updating inactive tracking:', error);
    }
  }

  /**
   * فحص أعياد الميلاد
   */
  async checkBirthdays(organizationId: string): Promise<void> {
    try {
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + this.settings.birthdayReminders.daysBefore);

      const month = targetDate.getMonth() + 1;
      const day = targetDate.getDate();

      // البحث عن العملاء الذين لديهم أعياد ميلاد
      const customers = await sqliteAPI.query<any>(
        `SELECT * FROM customers
         WHERE organization_id = ?
           AND birthday IS NOT NULL
           AND strftime('%m', birthday) = ?
           AND strftime('%d', birthday) = ?`,
        [organizationId, String(month).padStart(2, '0'), String(day).padStart(2, '0')]
      );

      for (const customer of customers) {
        const notification = await offlineNotificationService.createNotification(organizationId, {
          type: 'custom',
          title: `🎂 عيد ميلاد عميل`,
          message: this.settings.birthdayReminders.daysBefore === 0
            ? `اليوم عيد ميلاد "${customer.name}" - أرسل له تهنئة!`
            : `غداً عيد ميلاد "${customer.name}" - جهز رسالة تهنئة!`,
          priority: 'low',
          source: 'local',
          is_read: false,
          data: {
            customer_id: customer.id,
            customer_name: customer.name,
            customer_phone: customer.phone,
            birthday: customer.birthday
          },
          action_url: `/dashboard/customers/${customer.id}`,
          action_label: 'عرض العميل'
        });

        this.notifyListeners(notification);
      }
    } catch (error) {
      console.error('[CustomerNotifications] Error checking birthdays:', error);
    }
  }

  /**
   * إشعار بدفعة جديدة
   */
  async notifyPaymentReceived(
    organizationId: string,
    payment: {
      customer_id: string;
      customer_name: string;
      amount: number;
      debt_id?: string;
      is_partial: boolean;
      remaining?: number;
    }
  ): Promise<void> {
    if (!this.settings.newPayments.enabled) return;
    if (payment.is_partial && !this.settings.newPayments.notifyPartialPayments) return;

    const notification = await offlineNotificationService.createNotification(organizationId, {
      type: 'payment_received',
      title: payment.is_partial ? '💵 دفعة جزئية' : '✅ دفعة كاملة',
      message: payment.is_partial
        ? `استلمت ${payment.amount.toLocaleString()} دج من "${payment.customer_name}" (متبقي: ${(payment.remaining || 0).toLocaleString()} دج)`
        : `استلمت ${payment.amount.toLocaleString()} دج من "${payment.customer_name}"`,
      priority: payment.amount > this.settings.highValueCustomers.threshold ? 'medium' : 'low',
      source: 'local',
      is_read: false,
      data: {
        customer_id: payment.customer_id,
        customer_name: payment.customer_name,
        amount: payment.amount,
        debt_id: payment.debt_id,
        is_partial: payment.is_partial,
        remaining: payment.remaining
      },
      action_url: `/dashboard/debts?customer=${payment.customer_id}`,
      action_label: 'عرض الديون'
    });

    this.notifyListeners(notification);
  }

  /**
   * إحصائيات الديون
   */
  async getDebtStats(organizationId: string): Promise<{
    total: number;
    overdue: number;
    dueThisWeek: number;
    dueThisMonth: number;
    totalAmount: number;
    overdueAmount: number;
  }> {
    try {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const debts = await sqliteAPI.query<any>(
        `SELECT amount, paid_amount, due_date FROM customer_debts
         WHERE organization_id = ? AND status IN ('pending', 'partial')`,
        [organizationId]
      );

      const stats = {
        total: debts.length,
        overdue: 0,
        dueThisWeek: 0,
        dueThisMonth: 0,
        totalAmount: 0,
        overdueAmount: 0
      };

      for (const debt of debts) {
        const remaining = debt.amount - (debt.paid_amount || 0);
        stats.totalAmount += remaining;

        if (debt.due_date) {
          const dueDate = new Date(debt.due_date);
          if (dueDate < now) {
            stats.overdue++;
            stats.overdueAmount += remaining;
          } else if (dueDate <= weekFromNow) {
            stats.dueThisWeek++;
          } else if (dueDate <= monthFromNow) {
            stats.dueThisMonth++;
          }
        }
      }

      return stats;
    } catch (error) {
      console.error('[CustomerNotifications] Error getting debt stats:', error);
      return {
        total: 0,
        overdue: 0,
        dueThisWeek: 0,
        dueThisMonth: 0,
        totalAmount: 0,
        overdueAmount: 0
      };
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
        console.error('[CustomerNotifications] Listener error:', error);
      }
    });
  }

  /**
   * تحديث الإعدادات
   */
  updateSettings(settings: Partial<CustomerNotificationSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * جلب الإعدادات
   */
  getSettings(): CustomerNotificationSettings {
    return { ...this.settings };
  }

  /**
   * إيقاف الخدمة
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.listeners.clear();
    this.initialized = false;
  }
}

// تصدير المثيل الوحيد
export const customerNotificationService = CustomerNotificationService.getInstance();
