import { inventoryDB, type LocalPOSSettings } from '@/database/localDb';

export const localPosSettingsService = {
  async save(settings: LocalPOSSettings): Promise<void> {
    if (!settings?.organization_id) return;
    await inventoryDB.posSettings.put({ ...settings });
  },

  async get(organizationId: string): Promise<LocalPOSSettings | null> {
    if (!organizationId) return null;
    return inventoryDB.posSettings.get(organizationId) || null;
  },

  async clear(organizationId: string): Promise<void> {
    if (!organizationId) return;
    await inventoryDB.posSettings.delete(organizationId);
  },

  async markPending(organizationId: string, pending = true): Promise<void> {
    if (!organizationId) return;
    const current = await inventoryDB.posSettings.get(organizationId);
    if (current) {
      await inventoryDB.posSettings.put({ ...current, pending_sync: pending });
    }
  }
};
