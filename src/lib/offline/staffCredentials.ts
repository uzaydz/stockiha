/**
 * staffCredentials - خدمة تخزين بيانات الموظفين Offline
 *
 * ⚡ تم التحديث لاستخدام Tauri SQL مباشرة + Delta Sync كـ fallback
 * ✅ يستخدم pinHasher.ts للخوارزمية الموحدة
 */

import type { LocalStaffPIN } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { tauriQuery, tauriUpsert } from '@/lib/db/tauriSqlClient';
import { 
  hashPin as unifiedHashPin, 
  generateSalt, 
  verifyPin as unifiedVerifyPin,
  toBase64,
  fromBase64 
} from '@/lib/utils/pinHasher';

// فحص بيئة Tauri
const isTauriEnv = (): boolean => {
  try {
    // @ts-ignore
    if ((import.meta as any).env?.TAURI) return true;
  } catch {}
  if (typeof window === 'undefined') return false;
  const w: any = window as any;
  if (typeof w.__TAURI_IPC__ === 'function') return true;
  if (!!w.__TAURI__) return true;
  if (typeof w.isTauri === 'boolean' && w.isTauri) return true;
  return false;
};

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
}): Promise<void> {
  const salt = generateSalt(16);
  const pin_hash = await hashPin(args.pin, salt);
  const now = new Date().toISOString();
  const rec: LocalStaffPIN = {
    id: args.staffId,
    organization_id: args.organizationId,
    staff_name: args.staffName,
    pin_hash,
    salt,
    permissions: args.permissions || null,
    is_active: true,
    created_at: now,
    updated_at: now
  };

  // 🔍 تسجيل تشخيصي للحفظ
  console.log('%c[StaffAuth] 💾 ═══ حفظ PIN الموظف ═══', 'color: #4CAF50; font-weight: bold');
  console.log('[StaffAuth] 👤 الموظف:', args.staffName);
  console.log('[StaffAuth] 🆔 Staff ID:', args.staffId);
  console.log('[StaffAuth] 🏢 Organization:', args.organizationId);
  console.log('[StaffAuth] 🧂 Salt:', salt.slice(0, 15) + '... (طول: ' + salt.length + ')');
  console.log('[StaffAuth] 🔑 Hash:', pin_hash.slice(0, 20) + '... (طول: ' + pin_hash.length + ')');
  console.log('[StaffAuth] 🔐 crypto.subtle متاح:', Boolean(typeof crypto !== 'undefined' && crypto.subtle));

  // استخدام SQLite في Electron أو Tauri أو Delta Sync كـ fallback
  if (window.electronAPI?.db) {
    const result = await window.electronAPI.db.upsert('staff_pins', rec);
    console.log('[StaffAuth] ✅ تم الحفظ في SQLite (Electron):', {
      success: result.success,
      changes: result.changes
    });
  } else if (isTauriEnv()) {
    // ⚡ استخدام Tauri SQL مباشرة
    console.log('[StaffAuth] 🔄 جاري الحفظ في Tauri SQLite...');
    const result = await tauriUpsert(args.organizationId, 'staff_pins', rec);
    console.log('[StaffAuth] ✅ تم الحفظ في SQLite (Tauri):', {
      success: result.success,
      changes: result.changes,
      error: result.error
    });
  } else {
    // ⚡ استخدام Delta Sync كـ fallback
    await deltaWriteService.saveFromServer('staff_pins' as any, rec);
    console.log('[StaffAuth] ✅ تم الحفظ عبر Delta Sync');
  }
}

export async function updateStaffPinOffline(args: {
  staffId: string;
  organizationId: string;
  newPin: string;
}): Promise<void> {
  const salt = generateSalt(16);
  const pin_hash = await hashPin(args.newPin, salt);

  let existingRec: any = null;
  if (window.electronAPI?.db) {
    const result = await window.electronAPI.db.queryOne('SELECT * FROM staff_pins WHERE id = ?', [args.staffId]);
    existingRec = result.data;
  } else if (isTauriEnv()) {
    // ⚡ استخدام Tauri SQL مباشرة
    const result = await tauriQuery(args.organizationId, 'SELECT * FROM staff_pins WHERE id = ?', [args.staffId]);
    existingRec = result.data?.[0] || null;
  } else {
    // ⚡ استخدام Delta Sync كـ fallback
    existingRec = await deltaWriteService.get<LocalStaffPIN>('staff_pins' as any, args.staffId);
  }

  const rec = {
    id: args.staffId,
    organization_id: args.organizationId,
    staff_name: existingRec?.staff_name || '',
    pin_hash,
    salt,
    permissions: existingRec?.permissions || null,
    updated_at: new Date().toISOString()
  };

  if (window.electronAPI?.db) {
    await window.electronAPI.db.upsert('staff_pins', rec);
  } else if (isTauriEnv()) {
    // ⚡ استخدام Tauri SQL مباشرة
    await tauriUpsert(args.organizationId, 'staff_pins', rec);
  } else {
    // ⚡ استخدام Delta Sync كـ fallback
    await deltaWriteService.saveFromServer('staff_pins' as any, rec);
  }
}

export async function verifyStaffPinOffline(args: {
  organizationId: string;
  pin: string;
}): Promise<{ success: boolean; staff?: { id: string; staff_name: string; permissions?: any; organization_id: string } }>{
  try {
    console.log('%c[StaffAuth] 🔐 ═══ التحقق من PIN الموظف ═══', 'color: #9C27B0; font-weight: bold');
    console.log('[StaffAuth] 🏢 Organization:', args.organizationId);
    console.log('[StaffAuth] 🔍 البيئة: Electron=', Boolean(window.electronAPI?.db), ', Tauri=', isTauriEnv());

    let matches: any[] = [];
    if (window.electronAPI?.db) {
      const result = await window.electronAPI.db.query('SELECT * FROM staff_pins WHERE organization_id = ?', [args.organizationId]);
      matches = result.data || [];
      console.log('[StaffAuth] 📊 القراءة من Electron SQLite');
    } else if (isTauriEnv()) {
      // ⚡ استخدام Tauri SQL مباشرة
      console.log('[StaffAuth] 🔄 جاري القراءة من Tauri SQLite...');
      const result = await tauriQuery(args.organizationId, 'SELECT * FROM staff_pins WHERE organization_id = ?', [args.organizationId]);
      console.log('[StaffAuth] 📊 نتيجة الاستعلام من Tauri:', { success: result.success, count: result.data?.length, error: result.error });
      matches = result.data || [];
    } else {
      // ⚡ استخدام Delta Sync كـ fallback
      console.log('[StaffAuth] 📊 القراءة من Delta Sync');
      matches = await deltaWriteService.getAll<LocalStaffPIN>('staff_pins' as any, args.organizationId);
    }

    console.log('[StaffAuth] 👥 عدد الموظفين المخزنين:', matches.length);

    for (const rec of matches) {
      // استخدام الدالة الموحدة للتحقق
      const isMatch = await unifiedVerifyPin(args.pin, rec.pin_hash, rec.salt);

      // 🔍 تشخيص مفصل
      console.log('[StaffAuth] 🔍 فحص الموظف:', rec.staff_name);
      console.log('[StaffAuth]   - Salt:', rec.salt?.slice(0, 15) + '...');
      console.log('[StaffAuth]   - Hash المخزن:', rec.pin_hash?.slice(0, 20) + '...');
      console.log('[StaffAuth]   - متطابق:', isMatch);

      if (isMatch) {
        console.log('%c[StaffAuth] ✅ تم التحقق بنجاح للموظف:', 'color: #4CAF50; font-weight: bold', rec.staff_name);
        // Parse permissions if it's a JSON string
        let parsedPermissions = rec.permissions;
        if (typeof parsedPermissions === 'string') {
          try {
            parsedPermissions = JSON.parse(parsedPermissions);
          } catch (e) {
            console.warn('[staffCredentials] Failed to parse permissions JSON:', e);
            parsedPermissions = {};
          }
        }

        return {
          success: true,
          staff: {
            id: rec.id,
            staff_name: rec.staff_name,
            permissions: parsedPermissions,
            organization_id: rec.organization_id
          }
        };
      }
    }
    console.warn('%c[StaffAuth] ❌ لم يتم العثور على PIN متطابق', 'color: #f44336; font-weight: bold');
    console.warn('[StaffAuth] عدد السجلات التي تم فحصها:', matches.length);
    return { success: false };
  } catch (err) {
    console.error('[staffCredentials] verifyStaffPinOffline error:', err);
    return { success: false };
  }
}

export async function updateStaffMetadataOffline(args: {
  staffId: string;
  organizationId: string;
  staffName?: string;
  permissions?: any;
}): Promise<void> {
  let rec: any = null;
  if (window.electronAPI?.db) {
    const result = await window.electronAPI.db.queryOne('SELECT * FROM staff_pins WHERE id = ?', [args.staffId]);
    rec = result.data;
  } else if (isTauriEnv()) {
    // ⚡ استخدام Tauri SQL مباشرة
    const result = await tauriQuery(args.organizationId, 'SELECT * FROM staff_pins WHERE id = ?', [args.staffId]);
    rec = result.data?.[0] || null;
  } else {
    // ⚡ استخدام Delta Sync كـ fallback
    rec = await deltaWriteService.get<LocalStaffPIN>('staff_pins' as any, args.staffId);
  }

  if (!rec || rec.organization_id !== args.organizationId) return;

  const updatedRec = {
    ...rec,
    staff_name: args.staffName ?? rec.staff_name,
    permissions: args.permissions ?? rec.permissions,
    updated_at: new Date().toISOString()
  };

  if (window.electronAPI?.db) {
    await window.electronAPI.db.upsert('staff_pins', updatedRec);
  } else if (isTauriEnv()) {
    // ⚡ استخدام Tauri SQL مباشرة
    await tauriUpsert(args.organizationId, 'staff_pins', updatedRec);
  } else {
    // ⚡ استخدام Delta Sync كـ fallback
    await deltaWriteService.saveFromServer('staff_pins' as any, updatedRec);
  }
}
