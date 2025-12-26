/**
 * localStoreSettingsService - خدمة إعدادات المتجر المحلية
 *
 * ⚡ تم التحديث لاستخدام PowerSync
 * ⚡ تعمل في الأوفلاين مع المزامنة التلقائية
 */

import type { LocalOrganizationSettings } from '@/database/localDb';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

export const localStoreSettingsService = {
  /**
   * حفظ إعدادات المتجر محلياً
   */
  async save(settings: LocalOrganizationSettings): Promise<void> {
    if (!settings?.organization_id) {
      console.warn('[localStoreSettings] لا يمكن الحفظ بدون organization_id');
      return;
    }

    const dataToSave = {
      ...settings,
      id: settings.id || settings.organization_id,
      updated_at: new Date().toISOString(),
    };

    try {
      // ⚡ استخدام PowerSync
      await powerSyncService.transaction(async (tx) => {
const keys = Object.keys(dataToSave).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => (dataToSave as any)[k]);
        
        await tx.execute(
          `INSERT OR REPLACE INTO organization_settings (id, ${keys.join(', ')}, updated_at) VALUES (?, ${placeholders}, ?)`,
          [dataToSave.id, ...values, dataToSave.updated_at]
        );
      });
      
      console.log('[localStoreSettings] ✅ تم الحفظ في PowerSync', { 
        orgId: settings.organization_id 
      });
    } catch (error) {
      console.error('[localStoreSettings] ❌ فشل الحفظ:', error);
      // fallback to localStorage
      localStorage.setItem(
        `store_settings_${settings.organization_id}`,
        JSON.stringify(dataToSave)
      );
    }
  },

  /**
   * جلب إعدادات المتجر المحلية
   */
  async get(organizationId: string): Promise<LocalOrganizationSettings | null> {
    if (!organizationId) return null;

    try {
      // ⚡ استخدام PowerSync - queryOne بدلاً من get (المنتهية)
      const result = await powerSyncService.queryOne<LocalOrganizationSettings>({
        sql: 'SELECT * FROM organization_settings WHERE organization_id = ? OR id = ?',
        params: [organizationId, organizationId]
      });
      
      if (result) {
        console.log('[localStoreSettings] ✅ تم الجلب من PowerSync');
        return result;
      }

      // fallback to localStorage
      const stored = localStorage.getItem(`store_settings_${organizationId}`);
      if (stored) {
        console.log('[localStoreSettings] ✅ تم الجلب من localStorage');
        return JSON.parse(stored);
      }

      return null;
    } catch (error) {
      console.error('[localStoreSettings] ❌ فشل الجلب:', error);
      
      // fallback to localStorage
      const stored = localStorage.getItem(`store_settings_${organizationId}`);
      if (stored) {
        return JSON.parse(stored);
      }
      
      return null;
    }
  },

  /**
   * حذف إعدادات المتجر المحلية
   */
  async clear(organizationId: string): Promise<void> {
    if (!organizationId) return;

    try {
      // ⚡ استخدام PowerSync
      await powerSyncService.transaction(async (tx) => {
await tx.execute(
          'DELETE FROM organization_settings WHERE organization_id = ? OR id = ?',
          [organizationId, organizationId]
        );
      });
      
      console.log('[localStoreSettings] ✅ تم الحذف من PowerSync');
      localStorage.removeItem(`store_settings_${organizationId}`);
    } catch (error) {
      console.error('[localStoreSettings] ❌ فشل الحذف:', error);
    }
  },

  /**
   * تعليم الإعدادات للمزامنة
   */
  async markPending(organizationId: string, pending = true): Promise<void> {
    if (!organizationId) return;

    try {
      const current = await this.get(organizationId);
      if (current) {
        await this.save({
          ...current,
          pending_sync: pending,
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('[localStoreSettings] ❌ فشل تعليم المزامنة:', error);
    }
  },

  /**
   * جلب الإعدادات غير المتزامنة
   */
  async getUnsyncedSettings(organizationId: string): Promise<LocalOrganizationSettings[]> {
    if (!organizationId) return [];

    try {
      // ⚡ PowerSync يتعامل مع المزامنة تلقائياً
      if (!powerSyncService.db) {
        console.warn('[localStoreSettingsService] PowerSync DB not initialized');
        return [];
      }
      const settings = await powerSyncService.query<LocalOrganizationSettings>({
        sql: 'SELECT * FROM organization_settings WHERE organization_id = ?',
        params: [organizationId]
      });
      return settings || [];
    } catch (error) {
      console.error('[localStoreSettings] ❌ فشل جلب غير المتزامنة:', error);
      return [];
    }
  },

  /**
   * تعليم الإعدادات كمتزامنة
   */
  async markSynced(organizationId: string): Promise<void> {
    if (!organizationId) return;

    try {
      // ⚡ PowerSync يتعامل مع المزامنة تلقائياً
      console.log('[localStoreSettings] ✅ PowerSync handles sync automatically');
    } catch (error) {
      console.error('[localStoreSettings] ❌ فشل تعليم المزامنة:', error);
    }
  }
};

export default localStoreSettingsService;
