/**
 * staffCredentials - خدمة تخزين بيانات الموظفين Offline
 *
 * ⚡ تم التحديث لاستخدام PowerSync
 * ✅ يستخدم pinHasher.ts للخوارزمية الموحدة
 */

import type { LocalStaffPIN } from '@/database/localDb';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { 
  hashPin as unifiedHashPin, 
  generateSalt, 
  verifyPin as unifiedVerifyPin,
  toBase64,
  fromBase64 
} from '@/lib/utils/pinHasher';

/**
 * @deprecated استخدم unifiedHashPin من pinHasher.ts بدلاً من هذه الدالة
 * محتفظ بها للتوافق مع الكود القديم
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  return unifiedHashPin(pin, salt);
}

export async function saveStaffPinOffline(args: {
  staffId: string;
  organizationId: string;
  staffName: string;
  pin: string;
  permissions?: any;
  isActive?: boolean;
}): Promise<void> {
  console.log('%c[StaffAuth] 💾 ═══ حفظ PIN الموظف (saveStaffPinOffline) ═══', 'color: #4CAF50; font-weight: bold');
  console.log('[StaffAuth] 👤 الموظف:', args.staffName);
  console.log('[StaffAuth] 🆔 Staff ID:', args.staffId);
  console.log('[StaffAuth] 🏢 Organization:', args.organizationId);

  const salt = generateSalt(16);
  const pin_hash = await hashPin(args.pin, salt);
  const now = new Date().toISOString();

  // 🔧 FIX: استخدام id فريد للسجل وتخزين staffId في staff_id
  const recordId = `pin_${args.staffId}`;

  console.log('[StaffAuth] 🧂 Salt:', salt.slice(0, 15) + '... (طول: ' + salt.length + ')');
  console.log('[StaffAuth] 🔑 Hash:', pin_hash.slice(0, 20) + '... (طول: ' + pin_hash.length + ')');
  console.log('[StaffAuth] 🔐 crypto.subtle متاح:', Boolean(typeof crypto !== 'undefined' && crypto.subtle));
  console.log('[StaffAuth] 📝 Record ID:', recordId);

  // ⚡ استخدام PowerSync
  if (!powerSyncService.db) {
    console.error('[StaffAuth] ❌ PowerSync DB not initialized');
    throw new Error('PowerSync DB not initialized');
  }

  await powerSyncService.transaction(async (tx) => {
    // 🔧 FIX: استخدام INSERT OR REPLACE مع جميع الأعمدة الصحيحة
    // staff_pins schema: id, staff_id, organization_id, staff_name, pin_hash, salt, permissions, is_active, created_at, updated_at
    const permissionsJson = args.permissions ? JSON.stringify(args.permissions) : null;
    const isActive = args.isActive === undefined ? 1 : args.isActive ? 1 : 0;

    await tx.execute(
      `INSERT OR REPLACE INTO staff_pins
       (id, staff_id, organization_id, staff_name, pin_hash, salt, permissions, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?,
         COALESCE((SELECT created_at FROM staff_pins WHERE id = ?), ?),
         ?)`,
      [
        recordId,           // id
        args.staffId,       // staff_id
        args.organizationId,// organization_id
        args.staffName,     // staff_name
        pin_hash,           // pin_hash
        salt,               // salt
        permissionsJson,    // permissions
        isActive,           // is_active
        recordId,           // للـ SELECT
        now,                // created_at default
        now                 // updated_at
      ]
    );
  });

  console.log('%c[StaffAuth] ✅ تم حفظ PIN في staff_pins بنجاح!', 'color: #4CAF50; font-weight: bold');
}

export async function updateStaffPinOffline(args: {
  staffId: string;
  organizationId: string;
  newPin: string;
}): Promise<void> {
  console.log('%c[StaffAuth] 🔄 ═══ تحديث PIN الموظف ═══', 'color: #FF9800; font-weight: bold');
  console.log('[StaffAuth] 🆔 Staff ID:', args.staffId);
  console.log('[StaffAuth] 🏢 Organization:', args.organizationId);

  const salt = generateSalt(16);
  const pin_hash = await hashPin(args.newPin, salt);
  const now = new Date().toISOString();

  // 🔧 FIX: استخدام id ثابت للبحث
  const recordId = `pin_${args.staffId}`;

  // ⚡ جلب السجل الموجود (للحفاظ على البيانات)
  const existingRec = await powerSyncService.get<any>(
    'SELECT * FROM staff_pins WHERE id = ? OR staff_id = ?',
    [recordId, args.staffId]
  );

  console.log('[StaffAuth] 📋 السجل الموجود:', existingRec ? {
    staff_name: existingRec.staff_name,
    has_permissions: !!existingRec.permissions,
  } : '(غير موجود)');

  // ⚡ استخدام PowerSync
  if (!powerSyncService.db) {
    console.error('[StaffAuth] ❌ PowerSync DB not initialized');
    throw new Error('PowerSync DB not initialized');
  }

  await powerSyncService.transaction(async (tx) => {
    const permissionsJson = existingRec?.permissions
      ? (typeof existingRec.permissions === 'string' ? existingRec.permissions : JSON.stringify(existingRec.permissions))
      : null;
    const isActive = existingRec?.is_active === undefined || existingRec?.is_active === null
      ? 1
      : Number(existingRec.is_active);

    await tx.execute(
      `INSERT OR REPLACE INTO staff_pins
       (id, staff_id, organization_id, staff_name, pin_hash, salt, permissions, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?,
         COALESCE((SELECT created_at FROM staff_pins WHERE id = ?), ?),
         ?)`,
      [
        recordId,
        args.staffId,
        args.organizationId,
        existingRec?.staff_name || 'موظف',
        pin_hash,
        salt,
        permissionsJson,
        isActive,
        recordId,
        now,
        now
      ]
    );
  });

  console.log('%c[StaffAuth] ✅ تم تحديث PIN بنجاح!', 'color: #4CAF50; font-weight: bold');
}

export async function verifyStaffPinOffline(args: {
  organizationId: string;
  pin: string;
}): Promise<{ success: boolean; staff?: { id: string; staff_name: string; permissions?: any; organization_id: string } }>{
  try {
    console.log('%c[StaffAuth] 🔐 ═══ التحقق من PIN الموظف (verifyStaffPinOffline) ═══', 'color: #9C27B0; font-weight: bold');
    console.log('[StaffAuth] 🏢 Organization:', args.organizationId);
    console.log('[StaffAuth] 🔑 PIN length:', args.pin?.length || 0);

    // ⚡ استخدام PowerSync
    if (!powerSyncService.db) {
      console.warn('[StaffAuth] ⚠️ PowerSync DB not initialized');
      return { success: false };
    }

    // 🔧 FIX: البحث في staff_pins مع دعم is_active
    const matches = await powerSyncService.query<any>({
      sql: `SELECT * FROM staff_pins
       WHERE organization_id = ?
       AND (is_active = 1 OR is_active IS NULL)`,
      params: [args.organizationId]
    });

    console.log('[StaffAuth] 📊 عدد الموظفين المخزنين:', matches?.length || 0);

    if (!matches || matches.length === 0) {
      console.warn('[StaffAuth] ⚠️ لا توجد سجلات في staff_pins لهذه المؤسسة');
      return { success: false };
    }

    for (const rec of matches) {
      // تسجيل تشخيصي
      console.log('[StaffAuth] 🔍 فحص الموظف:', {
        staff_name: rec.staff_name,
        id: rec.id,
        staff_id: rec.staff_id,
        has_pin_hash: !!rec.pin_hash,
        has_salt: !!rec.salt,
      });

      if (!rec.pin_hash || !rec.salt) {
        console.warn('[StaffAuth] ⚠️ الموظف', rec.staff_name, 'ليس لديه pin_hash أو salt');
        continue;
      }

      // استخدام الدالة الموحدة للتحقق
      const isMatch = await unifiedVerifyPin(args.pin, rec.pin_hash, rec.salt);

      console.log('[StaffAuth] 🔐 نتيجة التحقق:', {
        staff_name: rec.staff_name,
        isMatch,
      });

      if (isMatch) {
        console.log('%c[StaffAuth] ✅ تم التحقق بنجاح!', 'color: #4CAF50; font-weight: bold');

        // Parse permissions if it's a JSON string
        let parsedPermissions = rec.permissions;
        if (typeof parsedPermissions === 'string') {
          try {
            parsedPermissions = JSON.parse(parsedPermissions);
          } catch (e) {
            console.warn('[StaffAuth] ⚠️ فشل تحليل permissions JSON:', e);
            parsedPermissions = {};
          }
        }

        // 🔧 FIX: استخدام staff_id أو id
        const staffId = rec.staff_id || rec.id?.replace('pin_', '') || rec.id;

        return {
          success: true,
          staff: {
            id: staffId,
            staff_name: rec.staff_name,
            permissions: parsedPermissions,
            organization_id: rec.organization_id
          }
        };
      }
    }

    console.warn('%c[StaffAuth] ❌ لم يتم العثور على PIN متطابق', 'color: #f44336; font-weight: bold');
    console.warn('[StaffAuth] 📋 عدد السجلات التي تم فحصها:', matches.length);
    return { success: false };
  } catch (err) {
    console.error('[StaffAuth] ❌ verifyStaffPinOffline error:', err);
    return { success: false };
  }
}

export async function updateStaffMetadataOffline(args: {
  staffId: string;
  organizationId: string;
  staffName?: string;
  permissions?: any;
  isActive?: boolean;
}): Promise<void> {
  const recordId = `pin_${args.staffId}`;

  // ⚡ استخدام PowerSync
  const rec = await powerSyncService.get<LocalStaffPIN>(
    'SELECT * FROM staff_pins WHERE (id = ? OR staff_id = ?) AND organization_id = ?',
    [recordId, args.staffId, args.organizationId]
  );

  if (!rec) return;

  const updatedRec = {
    ...rec,
    staff_name: args.staffName ?? rec.staff_name,
    permissions: args.permissions ?? rec.permissions,
    is_active: args.isActive === undefined ? (rec as any).is_active : args.isActive ? 1 : 0,
    updated_at: new Date().toISOString()
  };

  // ⚡ استخدام PowerSync
  if (!powerSyncService.db) {
    throw new Error('PowerSync DB not initialized');
  }
  await powerSyncService.transaction(async (tx) => {
    const keys = Object.keys(updatedRec).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => {
      const val = (updatedRec as any)[k];
      return typeof val === 'object' ? JSON.stringify(val) : val;
    });
    
    await tx.execute(
      `INSERT OR REPLACE INTO staff_pins (id, ${keys.join(', ')}, updated_at) VALUES (?, ${placeholders}, ?)`,
      [updatedRec.id, ...values, updatedRec.updated_at]
    );
  });
}
