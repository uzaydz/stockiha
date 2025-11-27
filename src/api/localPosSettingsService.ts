/**
 * localPosSettingsService - خدمة إعدادات نقطة البيع المحلية
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 */

import type { LocalPOSSettings } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';

export const localPosSettingsService = {
  async save(settings: LocalPOSSettings): Promise<void> {
    if (!settings?.organization_id) return;
    // ⚡ استخدام Delta Sync
    await deltaWriteService.saveFromServer('pos_settings' as any, settings);
  },

  // اسم بديل للتوافق
  async saveSettings(settings: LocalPOSSettings): Promise<void> {
    return this.save(settings);
  },

  async get(organizationId: string): Promise<LocalPOSSettings | null> {
    if (!organizationId) return null;
    // ⚡ استخدام Delta Sync
    return deltaWriteService.get<LocalPOSSettings>('pos_settings' as any, organizationId);
  },

  async clear(organizationId: string): Promise<void> {
    if (!organizationId) return;
    // ⚡ استخدام Delta Sync
    await deltaWriteService.delete('pos_settings' as any, organizationId);
  },

  async markPending(organizationId: string, pending = true): Promise<void> {
    if (!organizationId) return;
    // ⚡ استخدام Delta Sync
    const current = await deltaWriteService.get<LocalPOSSettings>('pos_settings' as any, organizationId);
    if (current) {
      await deltaWriteService.update('pos_settings' as any, organizationId, { pending_sync: pending });
    }
  }
};
