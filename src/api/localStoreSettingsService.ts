/**
 * localStoreSettingsService - خدمة إعدادات المتجر المحلية
 *
 * ⚡ تدعم Electron و Tauri
 * ⚡ تعمل في الأوفلاين مع المزامنة التلقائية
 */

import type { LocalOrganizationSettings } from '@/database/localDb';

// التحقق من بيئة التشغيل
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).electronAPI?.sqlite;
};

const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return !!(w.__TAURI_IPC__ || w.__TAURI__);
};

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
      synced: settings.synced ?? false,
      pending_sync: settings.pending_sync ?? true
    };

    try {
      if (isElectron()) {
        const result = await (window as any).electronAPI.sqlite.upsert(
          'organization_settings',
          dataToSave
        );
        console.log('[localStoreSettings] ✅ تم الحفظ في SQLite (Electron)', { 
          success: result.success,
          orgId: settings.organization_id 
        });
      } else if (isTauri()) {
        const { tauriUpsert } = await import('@/lib/db/tauriSqlClient');
        const result = await tauriUpsert(settings.organization_id, 'organization_settings', dataToSave);
        console.log('[localStoreSettings] ✅ تم الحفظ في SQLite (Tauri)', { 
          success: result.success,
          orgId: settings.organization_id 
        });
      } else {
        // حفظ في localStorage كـ fallback
        localStorage.setItem(
          `store_settings_${settings.organization_id}`,
          JSON.stringify(dataToSave)
        );
        console.log('[localStoreSettings] ✅ تم الحفظ في localStorage');
      }
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
      if (isElectron()) {
        const result = await (window as any).electronAPI.sqlite.queryOne(
          'SELECT * FROM organization_settings WHERE organization_id = ? OR id = ?',
          [organizationId, organizationId]
        );
        if (result?.data) {
          console.log('[localStoreSettings] ✅ تم الجلب من SQLite (Electron)');
          return result.data;
        }
      } else if (isTauri()) {
        const { tauriQueryOne } = await import('@/lib/db/tauriSqlClient');
        const result = await tauriQueryOne(
          organizationId,
          'SELECT * FROM organization_settings WHERE organization_id = ? OR id = ?',
          [organizationId, organizationId]
        );
        if (result?.success && result?.data) {
          console.log('[localStoreSettings] ✅ تم الجلب من SQLite (Tauri)');
          return result.data;
        }
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
      if (isElectron()) {
        await (window as any).electronAPI.sqlite.execute(
          'DELETE FROM organization_settings WHERE organization_id = ? OR id = ?',
          [organizationId, organizationId]
        );
        console.log('[localStoreSettings] ✅ تم الحذف من SQLite (Electron)');
      } else if (isTauri()) {
        const { tauriExecute } = await import('@/lib/db/tauriSqlClient');
        await tauriExecute(
          organizationId,
          'DELETE FROM organization_settings WHERE organization_id = ? OR id = ?',
          [organizationId, organizationId]
        );
        console.log('[localStoreSettings] ✅ تم الحذف من SQLite (Tauri)');
      }
      
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
      if (isElectron()) {
        const result = await (window as any).electronAPI.sqlite.query(
          'SELECT * FROM organization_settings WHERE organization_id = ? AND (synced = 0 OR pending_sync = 1)',
          [organizationId]
        );
        return result?.data || [];
      } else if (isTauri()) {
        const { tauriQuery } = await import('@/lib/db/tauriSqlClient');
        const result = await tauriQuery(
          organizationId,
          'SELECT * FROM organization_settings WHERE organization_id = ? AND (synced = 0 OR pending_sync = 1)',
          [organizationId]
        );
        return result?.data || [];
      }

      // fallback to localStorage
      const stored = localStorage.getItem(`store_settings_${organizationId}`);
      if (stored) {
        const settings = JSON.parse(stored);
        if (settings.pending_sync || !settings.synced) {
          return [settings];
        }
      }

      return [];
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
      const current = await this.get(organizationId);
      if (current) {
        await this.save({
          ...current,
          synced: true,
          pending_sync: false,
          updated_at: new Date().toISOString()
        });
        console.log('[localStoreSettings] ✅ تم تعليم الإعدادات كمتزامنة');
      }
    } catch (error) {
      console.error('[localStoreSettings] ❌ فشل تعليم المزامنة:', error);
    }
  }
};

export default localStoreSettingsService;
