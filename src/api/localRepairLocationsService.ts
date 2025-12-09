/**
 * localRepairLocationsService - خدمة مواقع الإصلاح المحلية
 *
 * ⚡ Local-First مع PowerSync
 * - يعمل بدون إنترنت
 * - يستخدم PowerSync للمزامنة التلقائية
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalRepairLocation } from '@/database/localDb';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// Re-export type
export type { LocalRepairLocation } from '@/database/localDb';

const getOrgId = (): string => {
  try {
    return (
      localStorage.getItem('currentOrganizationId') ||
      localStorage.getItem('bazaar_organization_id') ||
      '11111111-1111-1111-1111-111111111111'
    );
  } catch {
    return '11111111-1111-1111-1111-111111111111';
  }
};

const nowISO = () => new Date().toISOString();

/**
 * جلب جميع مواقع الإصلاح
 */
export async function getAll(organizationId?: string): Promise<LocalRepairLocation[]> {
  try {
    const orgId = organizationId || getOrgId();
    if (!powerSyncService.db) {
      console.warn('[localRepairLocationsService] PowerSync DB not initialized');
      return [];
    }
    const locations = await powerSyncService.query<LocalRepairLocation>({
      sql: 'SELECT * FROM repair_locations WHERE organization_id = ?',
      params: [orgId]
    });

    // فلترة المواقع النشطة فقط
    return locations.filter((loc) => loc.is_active !== false);
  } catch (error) {
    console.error('[localRepairLocationsService] ❌ خطأ في getAll:', error);
    return [];
  }
}

/**
 * جلب موقع محدد
 */
export async function getById(id: string, organizationId?: string): Promise<LocalRepairLocation | null> {
  try {
    const orgId = organizationId || getOrgId();
    const location = await powerSyncService.get<LocalRepairLocation>(
      'SELECT * FROM repair_locations WHERE id = ? AND organization_id = ?',
      [id, orgId]
    );
    return location;
  } catch (error) {
    console.error('[localRepairLocationsService] ❌ خطأ في getById:', error);
    return null;
  }
}

/**
 * إنشاء موقع جديد
 */
export async function create(
  input: Omit<LocalRepairLocation, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'synced' | 'pendingOperation'>,
  organizationId?: string
): Promise<LocalRepairLocation> {
  const id = uuidv4();
  const orgId = organizationId || getOrgId();
  const now = nowISO();

  const location: LocalRepairLocation = {
    id,
    organization_id: orgId,
    name: input.name,
    description: input.description || null,
    address: input.address || null,
    phone: input.phone || null,
    email: input.email || null,
    is_default: input.is_default ?? false,
    is_active: input.is_active ?? true,
    created_at: now,
    updated_at: now
    // ⚠️ PowerSync يدير المزامنة تلقائياً - لا حاجة لحقول synced
  } as any;

  try {
    console.log('[localRepairLocationsService] 💾 إنشاء موقع جديد:', id);
    if (!powerSyncService.db) {
      throw new Error('PowerSync DB not initialized');
    }
    await powerSyncService.transaction(async (tx) => {
      const keys = Object.keys(location).filter(k => k !== 'id');
      const values = keys.map(k => (location as any)[k]);
      const placeholders = keys.map(() => '?').join(', ');
      
      await tx.execute(
        `INSERT INTO repair_locations (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
        [location.id, ...values, now, now]
      );
    });

    console.log('[localRepairLocationsService] ✅ تم إنشاء الموقع بنجاح');
    return location;
  } catch (error) {
    console.error('[localRepairLocationsService] ❌ خطأ في create:', error);
    throw error;
  }
}

/**
 * تحديث موقع
 */
export async function update(
  id: string,
  updates: Partial<LocalRepairLocation>,
  organizationId?: string
): Promise<LocalRepairLocation | null> {
  try {
    const orgId = organizationId || getOrgId();

    console.log('[localRepairLocationsService] 🔄 تحديث موقع:', id);

    // جلب الموقع الحالي
    const existing = await getById(id, orgId);
    if (!existing) {
      console.error('[localRepairLocationsService] ❌ الموقع غير موجود:', id);
      return null;
    }

    // تطبيق التحديثات
    const updated: LocalRepairLocation = {
      ...existing,
      ...updates,
      updated_at: nowISO()
      // ⚠️ PowerSync يدير المزامنة تلقائياً - لا حاجة لحقول synced
    } as any;

    if (!powerSyncService.db) {
      throw new Error('PowerSync DB not initialized');
    }
    await powerSyncService.transaction(async (tx) => {
      const keys = Object.keys(updated).filter(k => k !== 'id' && k !== 'created_at');
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => (updated as any)[k]);
      
      await tx.execute(
        `UPDATE repair_locations SET ${setClause}, updated_at = ? WHERE id = ?`,
        [...values, nowISO(), id]
      );
    });

    if (result) {
      console.log('[localRepairLocationsService] ✅ تم تحديث الموقع بنجاح');
      return result as LocalRepairLocation;
    }

    return null;
  } catch (error) {
    console.error('[localRepairLocationsService] ❌ خطأ في update:', error);
    return null;
  }
}

/**
 * حذف موقع (soft delete)
 */
export async function deleteLocation(id: string, organizationId?: string): Promise<void> {
  try {
    const orgId = organizationId || getOrgId();

    console.log('[localRepairLocationsService] 🗑️ حذف موقع:', id);

    // Soft delete: تعطيل الموقع بدلاً من حذفه
    await update(
      id,
      {
        is_active: false,
        updated_at: nowISO(),
      },
      orgId
    );

    console.log('[localRepairLocationsService] ✅ تم تعطيل الموقع');
  } catch (error) {
    console.error('[localRepairLocationsService] ❌ خطأ في delete:', error);
    throw error;
  }
}

/**
 * حفظ موقع من السيرفر (بدون إضافة للـ outbox)
 * يُستخدم عند المزامنة من السيرفر
 */
export async function saveRemoteLocation(location: LocalRepairLocation, organizationId?: string): Promise<void> {
  try {
    const orgId = organizationId || getOrgId();

    console.log('[localRepairLocationsService] 📥 حفظ موقع من السيرفر:', location.id);

    const rec: LocalRepairLocation = {
      ...location
      // ⚠️ PowerSync يدير المزامنة تلقائياً - لا حاجة لحقول synced
    } as any;

    // ⚡ استخدام PowerSync مباشرة للحفظ من Supabase
    if (!powerSyncService.db) {
      throw new Error('PowerSync DB not initialized');
    }
    await powerSyncService.transaction(async (tx) => {
      const keys = Object.keys(rec).filter(k => k !== 'id');
      const values = keys.map(k => (rec as any)[k]);
      const placeholders = keys.map(() => '?').join(', ');
      const now = new Date().toISOString();
      
      await tx.execute(
        `INSERT INTO repair_locations (id, ${keys.join(', ')}, created_at, updated_at) 
         VALUES (?, ${placeholders}, ?, ?)
         ON CONFLICT(id) DO UPDATE SET ${keys.map(k => `${k} = excluded.${k}`).join(', ')}, updated_at = ?`,
        [rec.id, ...values, rec.created_at || now, rec.updated_at || now, now]
      );
    });

    console.log('[localRepairLocationsService] ✅ تم حفظ الموقع من السيرفر');
  } catch (error) {
    console.error('[localRepairLocationsService] ❌ خطأ في saveRemoteLocation:', error);
    throw error;
  }
}

/**
 * جلب المواقع غير المتزامنة
 */
export async function getUnsynced(organizationId?: string): Promise<LocalRepairLocation[]> {
  try {
    const orgId = organizationId || getOrgId();
    if (!powerSyncService.db) {
      console.warn('[localRepairLocationsService] PowerSync DB not initialized');
      return [];
    }
    const allLocations = await powerSyncService.query<LocalRepairLocation>({
      sql: 'SELECT * FROM repair_locations WHERE organization_id = ?',
      params: [orgId]
    });

    // ⚠️ PowerSync يدير المزامنة تلقائياً - نرجع قائمة فارغة
    return [];
  } catch (error) {
    console.error('[localRepairLocationsService] ❌ خطأ في getUnsynced:', error);
    return [];
  }
}

/**
 * تحديث حالة المزامنة
 */
export async function updateSyncStatus(id: string, synced: boolean, organizationId?: string): Promise<void> {
  try {
    const orgId = organizationId || getOrgId();

    // ⚠️ PowerSync يدير المزامنة تلقائياً - لا حاجة لتحديث يدوي
    console.log(`[localRepairLocationsService] ⚠️ PowerSync manages sync automatically for location ${id}`);

    console.log(`[localRepairLocationsService] ✅ تم تحديث حالة المزامنة: ${id} -> ${synced}`);
  } catch (error) {
    console.error('[localRepairLocationsService] ❌ خطأ في updateSyncStatus:', error);
    throw error;
  }
}

/**
 * جلب الموقع الافتراضي
 */
export async function getDefaultLocation(organizationId?: string): Promise<LocalRepairLocation | null> {
  try {
    const orgId = organizationId || getOrgId();
    const locations = await getAll(orgId);

    return locations.find((loc) => loc.is_default === true) || null;
  } catch (error) {
    console.error('[localRepairLocationsService] ❌ خطأ في getDefaultLocation:', error);
    return null;
  }
}

/**
 * تعيين موقع كافتراضي
 */
export async function setDefault(id: string, organizationId?: string): Promise<void> {
  try {
    const orgId = organizationId || getOrgId();
    const locations = await getAll(orgId);

    console.log('[localRepairLocationsService] 🔄 تعيين موقع افتراضي:', id);

    // إزالة الافتراضي من جميع المواقع
    for (const loc of locations) {
      if (loc.is_default) {
        await update(loc.id, { is_default: false }, orgId);
      }
    }

    // تعيين الموقع الجديد كافتراضي
    await update(id, { is_default: true }, orgId);

    console.log('[localRepairLocationsService] ✅ تم تعيين الموقع الافتراضي');
  } catch (error) {
    console.error('[localRepairLocationsService] ❌ خطأ في setDefault:', error);
    throw error;
  }
}

/**
 * إحصائيات المواقع
 */
export async function getStats(organizationId?: string): Promise<{
  total: number;
  active: number;
  inactive: number;
  unsynced: number;
}> {
  try {
    const orgId = organizationId || getOrgId();
    if (!powerSyncService.db) {
      console.warn('[localRepairLocationsService] PowerSync DB not initialized');
      return [];
    }
    const allLocations = await powerSyncService.query<LocalRepairLocation>({
      sql: 'SELECT * FROM repair_locations WHERE organization_id = ?',
      params: [orgId]
    });

    return {
      total: allLocations.length,
      active: allLocations.filter((loc) => loc.is_active !== false).length,
      inactive: allLocations.filter((loc) => loc.is_active === false).length,
      unsynced: 0, // ⚠️ PowerSync يدير المزامنة تلقائياً
    };
  } catch (error) {
    console.error('[localRepairLocationsService] ❌ خطأ في getStats:', error);
    return {
      total: 0,
      active: 0,
      inactive: 0,
      unsynced: 0,
    };
  }
}

/**
 * خدمة مواقع الإصلاح المحلية - الواجهة الرئيسية
 */
export const localRepairLocationsService = {
  getAll,
  getById,
  create,
  update,
  delete: deleteLocation,
  saveRemoteLocation,
  getUnsynced,
  updateSyncStatus,
  getDefaultLocation,
  setDefault,
  getStats,
};
