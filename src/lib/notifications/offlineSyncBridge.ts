/**
 * جسر المزامنة بين نظام الإشعارات الحالي و SQLite
 *
 * يوفر:
 * - تخزين دائم في SQLite للعمل أوفلاين
 * - مزامنة مع النظام الحالي
 * - استرجاع الإشعارات عند العودة للاتصال
 *
 * ⚡ ملاحظة: الجداول تُنشأ في tauriSchema.ts (v29)
 */

import { sqliteAPI, isSQLiteAvailable } from '@/lib/db/sqliteAPI';
import type { NotificationItem } from '@/hooks/useRealTimeNotifications';

class OfflineSyncBridge {
  private static instance: OfflineSyncBridge;
  private initialized = false;
  private syncInProgress = false;

  private constructor() {}

  static getInstance(): OfflineSyncBridge {
    if (!OfflineSyncBridge.instance) {
      OfflineSyncBridge.instance = new OfflineSyncBridge();
    }
    return OfflineSyncBridge.instance;
  }

  /**
   * تهيئة - الجداول تُنشأ في tauriSchema.ts
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // ⚡ التحقق من توفر SQLite
    if (!isSQLiteAvailable()) {
      console.log('[OfflineSyncBridge] SQLite not available, skipping initialization');
      return;
    }

    try {
      // الجداول تُنشأ تلقائياً في tauriSchema.ts عند تهيئة قاعدة البيانات
      this.initialized = true;
      console.log('[OfflineSyncBridge] ✅ Initialized (tables created by tauriSchema)');
    } catch (error) {
      console.error('[OfflineSyncBridge] Init error:', error);
    }
  }

  /**
   * حفظ الإشعارات في SQLite
   */
  async saveNotifications(notifications: NotificationItem[]): Promise<void> {
    if (!this.initialized) await this.initialize();

    // ⚡ تخطي إذا لم يكن SQLite متاحاً
    if (!isSQLiteAvailable() || !this.initialized) {
      console.log('[OfflineSyncBridge] SQLite not available, skipping save');
      return;
    }

    try {
      for (const notif of notifications) {
        await sqliteAPI.execute(
          `INSERT OR REPLACE INTO cached_notifications
           (id, organization_id, type, title, message, priority, is_read,
            entity_type, entity_id, metadata, created_at, updated_at, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            notif.id,
            notif.organization_id,
            notif.type,
            notif.title,
            notif.message,
            notif.priority,
            notif.is_read ? 1 : 0,
            notif.entity_type || null,
            notif.entity_id || null,
            notif.metadata ? JSON.stringify(notif.metadata) : null,
            notif.created_at,
            notif.updated_at || null,
            new Date().toISOString()
          ]
        );
      }
    } catch (error) {
      console.error('[OfflineSyncBridge] Save error:', error);
    }
  }

  /**
   * جلب الإشعارات المخزنة
   */
  async getStoredNotifications(organizationId: string, limit = 50): Promise<NotificationItem[]> {
    if (!this.initialized) await this.initialize();

    // ⚡ تخطي إذا لم يكن SQLite متاحاً
    if (!isSQLiteAvailable() || !this.initialized) {
      console.log('[OfflineSyncBridge] SQLite not available, returning empty');
      return [];
    }

    try {
      const result = await sqliteAPI.query(
        `SELECT * FROM cached_notifications
         WHERE organization_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [organizationId, limit]
      );

      // ✅ إصلاح: استخدام result.data بدلاً من result مباشرة
      const results = result.success && Array.isArray(result.data) ? result.data : [];
      return results.map(row => ({
        id: row.id,
        organization_id: row.organization_id,
        type: row.type,
        title: row.title,
        message: row.message,
        priority: row.priority,
        is_read: Boolean(row.is_read),
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (error) {
      console.error('[OfflineSyncBridge] Get error:', error);
      return [];
    }
  }

  /**
   * تحديث حالة القراءة محلياً
   */
  async markAsReadLocally(notificationId: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    if (!isSQLiteAvailable() || !this.initialized) return;

    try {
      await sqliteAPI.execute(
        'UPDATE cached_notifications SET is_read = 1 WHERE id = ?',
        [notificationId]
      );

      // إضافة للقائمة إذا كنا أوفلاين
      if (!navigator.onLine) {
        await this.addToSyncQueue(notificationId, 'mark_read');
      }
    } catch (error) {
      console.error('[OfflineSyncBridge] Mark read error:', error);
    }
  }

  /**
   * حذف إشعار محلياً
   */
  async deleteLocally(notificationId: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    if (!isSQLiteAvailable() || !this.initialized) return;

    try {
      await sqliteAPI.execute(
        'DELETE FROM cached_notifications WHERE id = ?',
        [notificationId]
      );

      // إضافة للقائمة إذا كنا أوفلاين
      if (!navigator.onLine) {
        await this.addToSyncQueue(notificationId, 'delete');
      }
    } catch (error) {
      console.error('[OfflineSyncBridge] Delete error:', error);
    }
  }

  /**
   * إضافة عملية لقائمة المزامنة
   */
  private async addToSyncQueue(notificationId: string, action: string, data?: any): Promise<void> {
    if (!isSQLiteAvailable() || !this.initialized) return;

    try {
      const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await sqliteAPI.execute(
        `INSERT INTO notification_sync_queue
         (id, notification_id, action, data, created_at, attempts)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [id, notificationId, action, data ? JSON.stringify(data) : null, new Date().toISOString()]
      );
    } catch (error) {
      console.error('[OfflineSyncBridge] Queue error:', error);
    }
  }

  /**
   * مزامنة قائمة الانتظار مع الخادم
   */
  async syncPendingActions(supabase: any): Promise<void> {
    if (!this.initialized || this.syncInProgress || !navigator.onLine) return;
    if (!isSQLiteAvailable()) return;

    this.syncInProgress = true;

    try {
      const result = await sqliteAPI.query(
        `SELECT * FROM notification_sync_queue
         WHERE attempts < 5
         ORDER BY created_at ASC
         LIMIT 20`
      );

      // ✅ إصلاح: استخدام result.data بدلاً من result مباشرة
      const pendingActions = result.success && Array.isArray(result.data) ? result.data : [];

      for (const action of pendingActions) {
        try {
          if (action.action === 'mark_read') {
            await supabase
              .from('notifications')
              .update({ is_read: true })
              .eq('id', action.notification_id);
          } else if (action.action === 'delete') {
            await supabase
              .from('notifications')
              .delete()
              .eq('id', action.notification_id);
          }

          // حذف من القائمة بعد النجاح
          await sqliteAPI.execute(
            'DELETE FROM notification_sync_queue WHERE id = ?',
            [action.id]
          );
        } catch (error) {
          // تحديث عدد المحاولات
          await sqliteAPI.execute(
            `UPDATE notification_sync_queue
             SET attempts = attempts + 1, last_attempt = ?
             WHERE id = ?`,
            [new Date().toISOString(), action.id]
          );
        }
      }
    } catch (error) {
      console.error('[OfflineSyncBridge] Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * عدد الإشعارات غير المقروءة المخزنة
   */
  async getUnreadCount(organizationId: string): Promise<number> {
    if (!this.initialized) await this.initialize();
    if (!isSQLiteAvailable() || !this.initialized) return 0;

    try {
      const result = await sqliteAPI.query(
        `SELECT COUNT(*) as count FROM cached_notifications
         WHERE organization_id = ? AND is_read = 0`,
        [organizationId]
      );
      // ✅ إصلاح: استخدام result.data بدلاً من result مباشرة
      return result.success && result.data?.[0]?.count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * تنظيف الإشعارات القديمة
   */
  async cleanup(daysToKeep = 30): Promise<void> {
    if (!this.initialized) await this.initialize();
    if (!isSQLiteAvailable() || !this.initialized) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      await sqliteAPI.execute(
        `DELETE FROM cached_notifications
         WHERE created_at < ? AND is_read = 1`,
        [cutoffDate.toISOString()]
      );
    } catch (error) {
      console.error('[OfflineSyncBridge] Cleanup error:', error);
    }
  }
}

// تصدير المثيل الوحيد
export const offlineSyncBridge = OfflineSyncBridge.getInstance();
