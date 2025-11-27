/**
 * Local Staff Service - إدارة الموظفين محلياً في SQLite
 * يعمل في وضع Offline ويدعم المزامنة مع السيرفر
 */

import {
  tauriQuery,
  tauriQueryOne,
  tauriExecute,
  tauriUpsert,
  tauriDelete,
} from '@/lib/db/tauriSqlClient';
import type {
  POSStaffSession,
  StaffPermissions,
  SaveStaffSessionInput,
} from '@/types/staff';
import { 
  createPinHash, 
  verifyPin as unifiedVerifyPin,
  generateSalt 
} from '@/lib/utils/pinHasher';

/**
 * Local Staff Member (يطابق schema في SQLite)
 */
export interface LocalStaffMember {
  id: string;
  organization_id: string;
  user_id?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  permissions: string; // JSON string
  pin_hash?: string | null;
  salt?: string | null;
  is_active: number; // SQLite boolean (0/1)
  last_login?: string | null;
  created_at: string;
  updated_at: string;
  synced: number; // 0 = not synced, 1 = synced
  sync_status?: string | null; // pending_sync, syncing, synced, failed
  pending_operation?: string | null; // create, update, delete
}

/**
 * تحويل LocalStaffMember إلى POSStaffSession
 */
function mapLocalToSession(local: LocalStaffMember): POSStaffSession {
  let permissions: StaffPermissions = {};
  try {
    permissions = local.permissions ? JSON.parse(local.permissions) : {};
  } catch (error) {
    console.error('[localStaffService] Error parsing permissions JSON:', error);
    permissions = {};
  }

  return {
    id: local.id,
    organization_id: local.organization_id,
    user_id: local.user_id || undefined,
    staff_name: local.name,
    email: local.email || undefined,
    permissions,
    is_active: local.is_active === 1,
    created_at: local.created_at,
    updated_at: local.updated_at,
    last_login: local.last_login || undefined,
  };
}

/**
 * تحويل POSStaffSession إلى LocalStaffMember
 */
function mapSessionToLocal(
  session: Partial<POSStaffSession>,
  organizationId: string
): Partial<LocalStaffMember> {
  return {
    id: session.id,
    organization_id: organizationId,
    user_id: session.user_id || null,
    name: session.staff_name || '',
    email: session.email || null,
    role: 'staff',
    permissions: JSON.stringify(session.permissions || {}),
    is_active: session.is_active ? 1 : 0,
    created_at: session.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login: session.last_login || null,
    synced: 0, // افتراضياً غير مزامن
  };
}

/**
 * Hash PIN code for storage - استخدام الخوارزمية الموحدة
 */
async function hashPin(pin: string): Promise<{ hash: string; salt: string }> {
  return createPinHash(pin);
}

/**
 * Verify PIN code - استخدام الخوارزمية الموحدة
 */
async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean> {
  return unifiedVerifyPin(pin, hash, salt);
}

/**
 * خدمة إدارة الموظفين المحلية
 */
export const localStaffService = {
  /**
   * جلب جميع الموظفين من SQLite
   */
  async getAll(organizationId: string): Promise<POSStaffSession[]> {
    try {
      const result = await tauriQuery(
        organizationId,
        `SELECT * FROM staff_members WHERE organization_id = ? ORDER BY created_at DESC`,
        [organizationId]
      );

      if (!result.success || !result.data) {
        console.warn('[localStaffService] getAll failed:', result.error);
        return [];
      }

      return result.data.map((row: any) => mapLocalToSession(row as LocalStaffMember));
    } catch (error) {
      console.error('[localStaffService] getAll error:', error);
      return [];
    }
  },

  /**
   * جلب موظف واحد بالـ ID
   */
  async getById(
    staffId: string,
    organizationId: string
  ): Promise<POSStaffSession | null> {
    try {
      const result = await tauriQueryOne(
        organizationId,
        `SELECT * FROM staff_members WHERE id = ? AND organization_id = ?`,
        [staffId, organizationId]
      );

      if (!result.success || !result.data) {
        return null;
      }

      return mapLocalToSession(result.data as LocalStaffMember);
    } catch (error) {
      console.error('[localStaffService] getById error:', error);
      return null;
    }
  },

  /**
   * حفظ/تحديث موظف محلياً
   */
  async upsert(
    staff: Partial<POSStaffSession> & { id?: string; staff_name: string },
    organizationId: string,
    options?: {
      synced?: boolean;
      syncStatus?: string;
      pendingOperation?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const localStaff = mapSessionToLocal(staff, organizationId);

      // تطبيق الخيارات
      if (options) {
        if (options.synced !== undefined) {
          localStaff.synced = options.synced ? 1 : 0;
        }
        if (options.syncStatus) {
          localStaff.sync_status = options.syncStatus;
        }
        if (options.pendingOperation) {
          localStaff.pending_operation = options.pendingOperation;
        }
      }

      // إنشاء ID جديد إذا لم يكن موجوداً
      if (!localStaff.id) {
        localStaff.id = crypto.randomUUID();
      }

      const result = await tauriUpsert(organizationId, 'staff_members', localStaff);

      if (!result.success) {
        console.error('[localStaffService] upsert failed:', result.error);
        return { success: false, error: result.error };
      }

      console.log(`[localStaffService] ✅ Upserted staff: ${localStaff.id}`);
      return { success: true };
    } catch (error: any) {
      console.error('[localStaffService] upsert error:', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * حذف موظف محلياً
   */
  async delete(
    staffId: string,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await tauriDelete(organizationId, 'staff_members', staffId);

      if (!result.success) {
        console.error('[localStaffService] delete failed:', result.error);
        return { success: false, error: result.error };
      }

      console.log(`[localStaffService] ✅ Deleted staff: ${staffId}`);
      return { success: true };
    } catch (error: any) {
      console.error('[localStaffService] delete error:', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * وضع علامة حذف على موظف (soft delete) للمزامنة لاحقاً
   */
  async markDeleted(
    staffId: string,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await tauriExecute(
        organizationId,
        `UPDATE staff_members
         SET is_active = 0,
             synced = 0,
             sync_status = 'pending_sync',
             pending_operation = 'delete',
             updated_at = ?
         WHERE id = ? AND organization_id = ?`,
        [new Date().toISOString(), staffId, organizationId]
      );

      if (!result.success) {
        console.error('[localStaffService] markDeleted failed:', result.error);
        return { success: false, error: result.error };
      }

      console.log(`[localStaffService] ✅ Marked staff as deleted: ${staffId}`);
      return { success: true };
    } catch (error: any) {
      console.error('[localStaffService] markDeleted error:', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * التحقق من PIN محلياً
   * ✅ تم إصلاحه لاستخدام tauriQuery بدلاً من tauriQueryOne
   */
  async verifyPin(
    pin: string,
    organizationId: string
  ): Promise<{ success: boolean; staff?: POSStaffSession; error?: string }> {
    try {
      console.log('[localStaffService] 🔐 بدء التحقق من PIN للمؤسسة:', organizationId);

      // 1. محاولة التحقق من staff_pins (للأوفلاين) - جلب جميع السجلات
      const pinResult = await tauriQuery(
        organizationId,
        `SELECT * FROM staff_pins WHERE organization_id = ? AND is_active = 1`,
        [organizationId]
      );

      console.log('[localStaffService] 📊 عدد سجلات staff_pins:', pinResult.data?.length || 0);

      if (pinResult.success && pinResult.data && pinResult.data.length > 0) {
        // فحص كل السجلات
        for (const pinRecord of pinResult.data) {
          if (pinRecord.pin_hash && pinRecord.salt) {
            // ✅ استخدام الدالة الموحدة (async)
            const isMatch = await verifyPin(pin, pinRecord.pin_hash, pinRecord.salt);
            console.log('[localStaffService] فحص الموظف:', pinRecord.staff_name, '- متطابق:', isMatch);

            if (isMatch) {
              // جلب بيانات الموظف الكاملة من staff_members
              const staff = pinRecord.staff_id 
                ? await this.getById(pinRecord.staff_id, organizationId)
                : null;

              if (staff) {
                console.log('[localStaffService] ✅ تم التحقق من staff_pins:', staff.staff_name);
                return { success: true, staff };
              }

              // إذا لم يكن هناك staff_id، نُرجع البيانات من staff_pins مباشرة
              let parsedPermissions = pinRecord.permissions;
              if (typeof parsedPermissions === 'string') {
                try {
                  parsedPermissions = JSON.parse(parsedPermissions);
                } catch (e) {
                  parsedPermissions = {};
                }
              }

              const staffFromPin: POSStaffSession = {
                id: pinRecord.staff_id || pinRecord.id,
                organization_id: pinRecord.organization_id,
                staff_name: pinRecord.staff_name,
                permissions: parsedPermissions || {},
                is_active: pinRecord.is_active === 1,
                created_at: pinRecord.created_at,
                updated_at: pinRecord.updated_at,
              };
              console.log('[localStaffService] ✅ تم التحقق من staff_pins (بدون staff_id):', staffFromPin.staff_name);
              return { success: true, staff: staffFromPin };
            }
          }
        }
      }

      // 2. محاولة التحقق من staff_members مباشرة (إذا كان هناك pin_hash)
      const staffResult = await tauriQuery(
        organizationId,
        `SELECT * FROM staff_members
         WHERE organization_id = ? AND is_active = 1 AND pin_hash IS NOT NULL`,
        [organizationId]
      );

      console.log('[localStaffService] 📊 عدد سجلات staff_members:', staffResult.data?.length || 0);

      if (staffResult.success && staffResult.data && staffResult.data.length > 0) {
        for (const row of staffResult.data) {
          const localStaff = row as LocalStaffMember;

          if (localStaff.pin_hash && localStaff.salt) {
            // ✅ استخدام الدالة الموحدة (async)
            const isMatch = await verifyPin(pin, localStaff.pin_hash, localStaff.salt);
            console.log('[localStaffService] فحص staff_members:', localStaff.name, '- متطابق:', isMatch);

            if (isMatch) {
              console.log('[localStaffService] ✅ تم التحقق من staff_members:', localStaff.name);
              return { success: true, staff: mapLocalToSession(localStaff) };
            }
          }
        }
      }

      console.log('[localStaffService] ❌ لم يتم العثور على PIN متطابق');
      return { success: false, error: 'رمز PIN غير صحيح' };
    } catch (error: any) {
      console.error('[localStaffService] verifyPin error:', error);
      return { success: false, error: error.message || 'فشل التحقق من PIN' };
    }
  },

  /**
   * حفظ PIN للموظف
   */
  async savePin(
    staffId: string,
    pin: string,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // ✅ استخدام الخوارزمية الموحدة (async)
      const { hash, salt } = await hashPin(pin);

      // 1. تحديث staff_members
      const staffUpdate = await tauriExecute(
        organizationId,
        `UPDATE staff_members
         SET pin_hash = ?, salt = ?, updated_at = ?, synced = 0
         WHERE id = ? AND organization_id = ?`,
        [hash, salt, new Date().toISOString(), staffId, organizationId]
      );

      if (!staffUpdate.success) {
        return { success: false, error: staffUpdate.error };
      }

      // 2. تحديث/إنشاء في staff_pins
      const staff = await this.getById(staffId, organizationId);
      if (staff) {
        const pinRecordId = `pin_${staffId}_${Date.now()}`;
        await tauriUpsert(organizationId, 'staff_pins', {
          id: pinRecordId,
          staff_id: staffId,
          organization_id: organizationId,
          pin_hash: hash,
          salt: salt,
          staff_name: staff.staff_name,
          permissions: JSON.stringify(staff.permissions || {}),
          is_active: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        console.log(`[localStaffService] ✅ Saved PIN in staff_pins: ${pinRecordId}`);
      }

      console.log(`[localStaffService] ✅ Saved PIN for staff: ${staffId}`);
      return { success: true };
    } catch (error: any) {
      console.error('[localStaffService] savePin error:', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * جلب الموظفين غير المزامنة
   */
  async getUnsynced(organizationId: string): Promise<POSStaffSession[]> {
    try {
      const result = await tauriQuery(
        organizationId,
        `SELECT * FROM staff_members
         WHERE organization_id = ? AND synced = 0
         ORDER BY created_at ASC`,
        [organizationId]
      );

      if (!result.success || !result.data) {
        return [];
      }

      return result.data.map((row: any) => mapLocalToSession(row as LocalStaffMember));
    } catch (error) {
      console.error('[localStaffService] getUnsynced error:', error);
      return [];
    }
  },

  /**
   * تحديث حالة المزامنة
   */
  async updateSyncStatus(
    staffId: string,
    synced: boolean,
    organizationId: string,
    options?: {
      syncStatus?: string;
      pendingOperation?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updates: string[] = ['synced = ?', 'updated_at = ?'];
      const params: any[] = [synced ? 1 : 0, new Date().toISOString()];

      if (options?.syncStatus !== undefined) {
        updates.push('sync_status = ?');
        params.push(options.syncStatus);
      }

      if (options?.pendingOperation !== undefined) {
        updates.push('pending_operation = ?');
        params.push(options.pendingOperation);
      }

      params.push(staffId);
      params.push(organizationId);

      const result = await tauriExecute(
        organizationId,
        `UPDATE staff_members
         SET ${updates.join(', ')}
         WHERE id = ? AND organization_id = ?`,
        params
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      console.log(`[localStaffService] ✅ Updated sync status for: ${staffId}`);
      return { success: true };
    } catch (error: any) {
      console.error('[localStaffService] updateSyncStatus error:', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * تحديث الصلاحيات فقط
   * ✅ يحدث staff_members و staff_pins معاً
   */
  async updatePermissions(
    staffId: string,
    permissions: StaffPermissions,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      const permissionsJson = JSON.stringify(permissions);

      // 1. تحديث staff_members
      const result = await tauriExecute(
        organizationId,
        `UPDATE staff_members
         SET permissions = ?,
             updated_at = ?,
             synced = 0,
             sync_status = 'pending_sync',
             pending_operation = 'update'
         WHERE id = ? AND organization_id = ?`,
        [permissionsJson, now, staffId, organizationId]
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // 2. ✅ تحديث staff_pins أيضاً (للحفاظ على تزامن الصلاحيات)
      const staffPinsUpdate = await tauriExecute(
        organizationId,
        `UPDATE staff_pins
         SET permissions = ?,
             updated_at = ?
         WHERE staff_id = ? AND organization_id = ?`,
        [permissionsJson, now, staffId, organizationId]
      );

      if (staffPinsUpdate.success && staffPinsUpdate.changes && staffPinsUpdate.changes > 0) {
        console.log(`[localStaffService] ✅ Updated staff_pins permissions for: ${staffId}`);
      }

      console.log(`[localStaffService] ✅ Updated permissions for: ${staffId}`);
      return { success: true };
    } catch (error: any) {
      console.error('[localStaffService] updatePermissions error:', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * تحديث حالة التفعيل
   */
  async toggleActive(
    staffId: string,
    isActive: boolean,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await tauriExecute(
        organizationId,
        `UPDATE staff_members
         SET is_active = ?,
             updated_at = ?,
             synced = 0,
             sync_status = 'pending_sync',
             pending_operation = 'update'
         WHERE id = ? AND organization_id = ?`,
        [isActive ? 1 : 0, new Date().toISOString(), staffId, organizationId]
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      console.log(
        `[localStaffService] ✅ Toggled active status for: ${staffId} to ${isActive}`
      );
      return { success: true };
    } catch (error: any) {
      console.error('[localStaffService] toggleActive error:', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * مسح جميع الموظفين (للتنظيف أو إعادة التهيئة)
   */
  async clear(organizationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await tauriExecute(
        organizationId,
        `DELETE FROM staff_members WHERE organization_id = ?`,
        [organizationId]
      );

      console.log('[localStaffService] ✅ Cleared all staff');
      return { success: true };
    } catch (error: any) {
      console.error('[localStaffService] clear error:', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * إحصائيات الموظفين
   */
  async getStats(organizationId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    unsynced: number;
  }> {
    try {
      const totalResult = await tauriQueryOne(
        organizationId,
        `SELECT COUNT(*) as count FROM staff_members WHERE organization_id = ?`,
        [organizationId]
      );

      const activeResult = await tauriQueryOne(
        organizationId,
        `SELECT COUNT(*) as count FROM staff_members
         WHERE organization_id = ? AND is_active = 1`,
        [organizationId]
      );

      const unsyncedResult = await tauriQueryOne(
        organizationId,
        `SELECT COUNT(*) as count FROM staff_members
         WHERE organization_id = ? AND synced = 0`,
        [organizationId]
      );

      const total = totalResult.data?.count || 0;
      const active = activeResult.data?.count || 0;
      const unsynced = unsyncedResult.data?.count || 0;

      return {
        total,
        active,
        inactive: total - active,
        unsynced,
      };
    } catch (error) {
      console.error('[localStaffService] getStats error:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        unsynced: 0,
      };
    }
  },
};
