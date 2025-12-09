/**
 * جسر التخزين المحلي للإشعارات
 * ==============================
 *
 * ⚡ v3.0 - تخزين محلي فقط (بدون مزامنة مع السيرفر)
 *
 * يوفر:
 * - تخزين الإشعارات في PowerSync (SQLite)
 * - استرجاع الإشعارات المخزنة
 * - تحديث حالة القراءة محلياً
 * - تنظيف الإشعارات القديمة
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import type { NotificationItem } from '@/hooks/useRealTimeNotifications';

class OfflineSyncBridge {
  private static instance: OfflineSyncBridge;
  private initialized = false;

  // ⚡ Debounce للحفظ
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingNotifications: NotificationItem[] = [];
  private lastSaveHash: string = '';
  private readonly SAVE_DEBOUNCE_MS = 2000;

  private constructor() {}

  static getInstance(): OfflineSyncBridge {
    if (!OfflineSyncBridge.instance) {
      OfflineSyncBridge.instance = new OfflineSyncBridge();
    }
    return OfflineSyncBridge.instance;
  }

  /**
   * تهيئة - PowerSync يدير الجداول
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.initialized = true;
      console.log('[OfflineSyncBridge] ⚡ Initialized (local-only mode)');
    } catch (error) {
      console.error('[OfflineSyncBridge] Init error:', error);
    }
  }

  /**
   * ⚡ حساب hash للإشعارات لتجنب الحفظ المتكرر
   */
  private computeNotificationsHash(notifications: NotificationItem[]): string {
    return notifications.map(n => `${n.id}:${n.is_read}`).sort().join(',');
  }

  /**
   * حفظ الإشعارات في SQLite (مع Debounce)
   */
  async saveNotifications(notifications: NotificationItem[]): Promise<void> {
    if (!notifications || notifications.length === 0) {
      return;
    }

    // تحقق من عدم تكرار نفس البيانات
    const currentHash = this.computeNotificationsHash(notifications);
    if (currentHash === this.lastSaveHash) {
      return;
    }

    // Debounce
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.pendingNotifications = notifications;

    this.saveDebounceTimer = setTimeout(() => {
      this._doSaveNotifications(this.pendingNotifications, currentHash);
    }, this.SAVE_DEBOUNCE_MS);
  }

  /**
   * ⚡ الحفظ الفعلي للإشعارات
   */
  private async _doSaveNotifications(notifications: NotificationItem[], hash: string): Promise<void> {
    if (!this.initialized) await this.initialize();

    if (!notifications || notifications.length === 0) {
      return;
    }

    try {
      const now = new Date().toISOString();
      const values = notifications.map(notif => [
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
        now
      ]);

      if (!powerSyncService.db) {
        console.warn('[OfflineSyncBridge] PowerSync DB not initialized');
        return;
      }

      await powerSyncService.transaction(async (tx) => {
        for (const value of values) {
          await tx.execute(
            `INSERT OR REPLACE INTO cached_notifications
             (id, organization_id, type, title, message, priority, is_read,
              entity_type, entity_id, metadata, created_at, updated_at, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            value
          );
        }
      });

      this.lastSaveHash = hash;
      console.log(`[OfflineSyncBridge] ✅ Saved ${notifications.length} notifications locally`);
    } catch (error) {
      console.error('[OfflineSyncBridge] Save error:', error);
    }
  }

  /**
   * جلب الإشعارات المخزنة
   */
  async getStoredNotifications(organizationId: string, limit = 50): Promise<NotificationItem[]> {
    if (!this.initialized) await this.initialize();

    try {
      const results = await powerSyncService.query<any>({
        sql: `SELECT * FROM cached_notifications
         WHERE organization_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        params: [organizationId, limit]
      });

      return (results || []).map(row => ({
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

    try {
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          'UPDATE cached_notifications SET is_read = 1 WHERE id = ?',
          [notificationId]
        );
      });
    } catch (error) {
      console.error('[OfflineSyncBridge] Mark read error:', error);
    }
  }

  /**
   * تعليم جميع الإشعارات كمقروءة
   */
  async markAllAsReadLocally(organizationId: string): Promise<void> {
    if (!this.initialized) await this.initialize();

    try {
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          'UPDATE cached_notifications SET is_read = 1 WHERE organization_id = ? AND is_read = 0',
          [organizationId]
        );
      });
    } catch (error) {
      console.error('[OfflineSyncBridge] Mark all read error:', error);
    }
  }

  /**
   * حذف إشعار محلياً
   */
  async deleteLocally(notificationId: string): Promise<void> {
    if (!this.initialized) await this.initialize();

    try {
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          'DELETE FROM cached_notifications WHERE id = ?',
          [notificationId]
        );
      });
    } catch (error) {
      console.error('[OfflineSyncBridge] Delete error:', error);
    }
  }

  /**
   * عدد الإشعارات غير المقروءة
   */
  async getUnreadCount(organizationId: string): Promise<number> {
    if (!this.initialized) await this.initialize();

    try {
      const result = await powerSyncService.queryOne<{ count: number }>({
        sql: `SELECT COUNT(*) as count FROM cached_notifications
         WHERE organization_id = ? AND is_read = 0`,
        params: [organizationId]
      });
      return result?.count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * تنظيف الإشعارات القديمة
   */
  async cleanup(daysToKeep = 30): Promise<void> {
    if (!this.initialized) await this.initialize();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          `DELETE FROM cached_notifications
           WHERE created_at < ? AND is_read = 1`,
          [cutoffDate.toISOString()]
        );
      });

      console.log('[OfflineSyncBridge] ✅ Cleaned up old notifications');
    } catch (error) {
      console.error('[OfflineSyncBridge] Cleanup error:', error);
    }
  }
}

// تصدير المثيل الوحيد
export const offlineSyncBridge = OfflineSyncBridge.getInstance();
