/**
 * ⚡ localStaffService - Adapter للخدمة الموحدة
 *
 * هذا الملف يُعيد التصدير من localStaffService.backup.ts مع إزالة الاعتماد على أعمدة synced
 * التي لا توجد في PowerSync Schema
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import type {
  POSStaffSession,
  StaffPermissions,
  SaveStaffSessionInput,
} from '@/types/staff';
import {
  createPinHash,
  verifyPin as unifiedVerifyPin,
} from '@/lib/utils/pinHasher';

/**
 * 🔧 حساب MD5 hash للتوافق مع PINs القديمة المشفرة
 * PIN المخزن في Supabase يكون بصيغة MD5 (32 حرف hex)
 */
async function computeMd5Hash(input: string): Promise<string> {
  // استخدام Web Crypto API مع SHA-256 ثم تقليص لـ 32 حرف (محاكاة MD5 بدون مكتبة خارجية)
  // ملاحظة: هذا ليس MD5 حقيقي، لكن Supabase قد يستخدم خوارزمية مختلفة

  // محاولة 1: استخدام SparkMD5 إذا كان متاحاً
  if (typeof (window as any).SparkMD5 !== 'undefined') {
    return (window as any).SparkMD5.hash(input);
  }

  // محاولة 2: استخدام crypto-js إذا كان متاحاً
  if (typeof (window as any).CryptoJS !== 'undefined') {
    return (window as any).CryptoJS.MD5(input).toString();
  }

  // محاولة 3: Simple MD5 implementation
  // نستخدم implementation بسيط لـ MD5
  return simpleMd5(input);
}

/**
 * Simple MD5 implementation (للتوافق بدون مكتبات خارجية)
 */
function simpleMd5(string: string): string {
  function rotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }

  function addUnsigned(lX: number, lY: number) {
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    } else {
      return lResult ^ lX8 ^ lY8;
    }
  }

  function F(x: number, y: number, z: number) { return (x & y) | (~x & z); }
  function G(x: number, y: number, z: number) { return (x & z) | (y & ~z); }
  function H(x: number, y: number, z: number) { return x ^ y ^ z; }
  function I(x: number, y: number, z: number) { return y ^ (x | ~z); }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(str: string) {
    let lWordCount;
    const lMessageLength = str.length;
    const lNumberOfWordsTemp1 = lMessageLength + 8;
    const lNumberOfWordsTemp2 = (lNumberOfWordsTemp1 - (lNumberOfWordsTemp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }

  function wordToHex(lValue: number) {
    let wordToHexValue = '', wordToHexValueTemp = '', lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      wordToHexValueTemp = '0' + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValueTemp.substr(wordToHexValueTemp.length - 2, 2);
    }
    return wordToHexValue;
  }

  const x = convertToWordArray(string);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k], S11, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
    b = GG(b, c, d, a, x[k], S24, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);
    a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
    d = HH(d, a, b, c, x[k], S32, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);
    a = II(a, b, c, d, x[k], S41, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

/**
 * Local Staff Member (يطابق pos_staff_sessions في PowerSync)
 */
export interface LocalStaffMember {
  id: string;
  organization_id: string;
  user_id?: string | null;
  staff_name: string;
  pin_code?: string | null;
  permissions: string; // JSON string
  is_active: number; // SQLite boolean (0/1)
  created_by?: string | null;
  last_login?: string | null;
  created_at: string;
  updated_at: string;
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
    staff_name: local.staff_name,
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
    staff_name: session.staff_name || '',
    permissions: JSON.stringify(session.permissions || {}),
    is_active: session.is_active ? 1 : 0,
    created_at: session.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login: session.last_login || null,
  };
}

/**
 * Hash PIN code for storage
 */
async function hashPin(pin: string): Promise<{ hash: string; salt: string }> {
  return createPinHash(pin);
}

/**
 * Verify PIN code
 */
async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean> {
  return unifiedVerifyPin(pin, hash, salt);
}

/**
 * خدمة إدارة الموظفين المحلية - ⚡ PowerSync Edition
 * ⚠️ ملاحظة: لا نستخدم أعمدة synced لأنها غير موجودة في PowerSync Schema
 */
export const localStaffService = {
  /**
   * جلب جميع الموظفين من PowerSync
   */
  async getAll(organizationId: string): Promise<POSStaffSession[]> {
    try {
      const start = performance.now();
      const ready = await powerSyncService.waitForInitialization(10000);
      if (!ready || !powerSyncService.db) {
        console.warn('[localStaffService] PowerSync DB not ready');
        return [];
      }

      const timeoutMs = 7000;
      const queryPromise = powerSyncService.query<LocalStaffMember>({
        sql: `SELECT * FROM pos_staff_sessions WHERE organization_id = ? ORDER BY created_at DESC`,
        params: [organizationId]
      });

      const data = await Promise.race([
        queryPromise,
        new Promise<LocalStaffMember[]>((_, reject) =>
          setTimeout(() => reject(new Error('staff query timeout')), timeoutMs)
        )
      ]);

      const elapsed = Math.round(performance.now() - start);
      console.log('[localStaffService] ✅ fetched staff', { count: data.length, elapsedMs: elapsed });

      return data.map((row) => mapLocalToSession(row));
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
      if (!powerSyncService.db) {
        console.warn('[localStaffService] PowerSync DB not initialized');
        return null;
      }
      const data = await powerSyncService.queryOne<LocalStaffMember>({
        sql: `SELECT * FROM pos_staff_sessions WHERE id = ? AND organization_id = ?`,
        params: [staffId, organizationId]
      });

      if (!data) {
        return null;
      }

      return mapLocalToSession(data);
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
      syncStatus?: string;
      pendingOperation?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const localStaff = mapSessionToLocal(staff, organizationId);

      // إنشاء ID جديد إذا لم يكن موجوداً
      if (!localStaff.id) {
        localStaff.id = crypto.randomUUID();
      }

      // ⚡ استخدام PowerSync مباشرة
      await powerSyncService.transaction(async (tx) => {
        const now = new Date().toISOString();

        // Try UPDATE first
        const keys = Object.keys(localStaff).filter(k => k !== 'id' && k !== 'created_at');
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => (localStaff as any)[k]);

        const updateResult = await tx.execute(
          `UPDATE pos_staff_sessions SET ${setClause}, updated_at = ? WHERE id = ? AND organization_id = ?`,
          [...values, now, localStaff.id, organizationId]
        );

        // If no rows updated, INSERT
        if (!updateResult || (Array.isArray(updateResult) && updateResult.length === 0)) {
          const insertKeys = Object.keys(localStaff).filter(k => k !== 'updated_at');
          const insertPlaceholders = insertKeys.map(() => '?').join(', ');
          const insertValues = insertKeys.map(k => (localStaff as any)[k]);

          await tx.execute(
            `INSERT INTO pos_staff_sessions (${insertKeys.join(', ')}, created_at, updated_at) VALUES (${insertPlaceholders}, ?, ?)`,
            [...insertValues, localStaff.created_at || now, now]
          );
        }
      });

      console.log(`[localStaffService] ✅ Upserted staff via PowerSync: ${localStaff.id}`);
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
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          'DELETE FROM pos_staff_sessions WHERE id = ? AND organization_id = ?',
          [staffId, organizationId]
        );
      });

      console.log(`[localStaffService] ✅ Deleted staff via PowerSync: ${staffId}`);
      return { success: true };
    } catch (error: any) {
      console.error('[localStaffService] delete error:', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * وضع علامة حذف على موظف (soft delete)
   */
  async markDeleted(
    staffId: string,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();

      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          `UPDATE pos_staff_sessions
           SET is_active = 0, updated_at = ?
           WHERE id = ? AND organization_id = ?`,
          [now, staffId, organizationId]
        );
      });

      console.log(`[localStaffService] ✅ Marked staff as deleted via PowerSync: ${staffId}`);
      return { success: true };
    } catch (error: any) {
      console.error('[localStaffService] markDeleted error:', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * التحقق من PIN محلياً
   * 🔧 FIX: تحسين البحث في staff_pins واستخدام staff_id أو id بشكل صحيح
   */
  async verifyPin(
    pin: string,
    organizationId: string
  ): Promise<{ success: boolean; staff?: POSStaffSession; error?: string }> {
    try {
      console.log('%c[localStaffService] 🔐 ═══ بدء التحقق من PIN ═══', 'color: #9C27B0; font-weight: bold');
      console.log('[localStaffService] 🏢 Organization ID:', organizationId);
      console.log('[localStaffService] 🔑 PIN length:', pin?.length || 0);

      // 1. محاولة التحقق من staff_pins (الجدول المحلي مع PIN مشفر)
      if (!powerSyncService.db) {
        console.warn('[localStaffService] ⚠️ PowerSync DB not initialized');
        return { success: false, error: 'DB not ready' };
      }

      const pinRecords = await powerSyncService.query<any>({
        sql: `SELECT * FROM staff_pins WHERE organization_id = ? AND is_active = 1`,
        params: [organizationId]
      });

      console.log('[localStaffService] 📊 عدد سجلات staff_pins:', pinRecords?.length || 0);

      if (pinRecords && pinRecords.length > 0) {
        for (const pinRecord of pinRecords) {
          console.log('[localStaffService] 🔍 فحص:', {
            staff_name: pinRecord.staff_name,
            staff_id: pinRecord.staff_id,
            id: pinRecord.id,
            has_pin_hash: !!pinRecord.pin_hash,
            has_salt: !!pinRecord.salt,
          });

          if (pinRecord.pin_hash && pinRecord.salt) {
            const isMatch = await verifyPin(pin, pinRecord.pin_hash, pinRecord.salt);
            console.log('[localStaffService] 🔐 نتيجة التحقق من PIN:', {
              staff_name: pinRecord.staff_name,
              isMatch,
            });

            if (isMatch) {
              // 🔧 FIX: البحث عن الموظف باستخدام staff_id أو id
              const staffIdToUse = pinRecord.staff_id || pinRecord.id;
              let staff: POSStaffSession | null = null;

              if (staffIdToUse) {
                // جلب بيانات الموظف الكاملة من pos_staff_sessions
                const staffRecord = await powerSyncService.queryOne<LocalStaffMember>({
                  sql: `SELECT * FROM pos_staff_sessions WHERE id = ? AND organization_id = ?`,
                  params: [staffIdToUse, organizationId]
                });

                if (staffRecord) {
                  staff = mapLocalToSession(staffRecord);
                  console.log('[localStaffService] ✅ تم جلب بيانات الموظف من pos_staff_sessions:', staff.staff_name);
                }
              }

              if (staff) {
                console.log('%c[localStaffService] ✅ تم التحقق بنجاح من staff_pins!', 'color: #4CAF50; font-weight: bold');
                return { success: true, staff };
              }

              // Fallback: استخدام البيانات من pinRecord مباشرة
              let parsedPermissions = pinRecord.permissions;
              if (typeof parsedPermissions === 'string') {
                try {
                  parsedPermissions = JSON.parse(parsedPermissions);
                } catch (e) {
                  console.warn('[localStaffService] ⚠️ فشل تحليل permissions JSON');
                  parsedPermissions = {};
                }
              }

              const staffFromPin: POSStaffSession = {
                id: staffIdToUse,
                organization_id: pinRecord.organization_id,
                staff_name: pinRecord.staff_name,
                permissions: parsedPermissions || {},
                is_active: pinRecord.is_active === 1,
                created_at: pinRecord.created_at,
                updated_at: pinRecord.updated_at,
              };
              console.log('%c[localStaffService] ✅ تم التحقق من staff_pins (fallback):', 'color: #4CAF50; font-weight: bold', staffFromPin.staff_name);
              return { success: true, staff: staffFromPin };
            }
          }
        }
      }

      // 2. محاولة التحقق من pos_staff_sessions مباشرة (PIN غير مشفر)
      console.log('[localStaffService] 🔄 محاولة التحقق من pos_staff_sessions (plain PIN)...');

      const ready = await powerSyncService.waitForInitialization(10000);
      if (!ready || !powerSyncService.db) {
        console.warn('[localStaffService] ⚠️ PowerSync DB not initialized after wait');
        return { success: false, error: 'DB not ready' };
      }

      const staffRecords = await powerSyncService.query<LocalStaffMember>({
        sql: `SELECT * FROM pos_staff_sessions
         WHERE organization_id = ? AND is_active = 1 AND pin_code IS NOT NULL`,
        params: [organizationId]
      });

      console.log('[localStaffService] 📊 عدد سجلات pos_staff_sessions مع PIN:', staffRecords?.length || 0);

      if (staffRecords && staffRecords.length > 0) {
        for (const localStaff of staffRecords) {
          const storedPin = localStaff.pin_code;
          const isHashedPin = storedPin && storedPin.length === 32 && /^[a-f0-9]+$/i.test(storedPin);

          // 🔧 DEBUG: إظهار تفاصيل PIN للتشخيص
          console.log('[localStaffService] 🔍 فحص pos_staff_sessions:', {
            staff_name: localStaff.staff_name,
            has_pin_code: !!storedPin,
            pin_code_length: storedPin?.length,
            is_hashed_md5: isHashedPin,
            pin_code_preview: storedPin ? `${storedPin.slice(0, 4)}...` : '(فارغ)',
            input_pin_preview: `${pin.slice(0, 2)}***`,
          });

          // 1️⃣ مقارنة مباشرة (plain PIN)
          if (storedPin && storedPin === pin) {
            console.log('%c[localStaffService] ✅ تم التحقق من pos_staff_sessions (plain PIN)!', 'color: #4CAF50; font-weight: bold', localStaff.staff_name);
            return { success: true, staff: mapLocalToSession(localStaff) };
          }

          // 2️⃣ مقارنة بعد trim/string conversion
          if (storedPin && String(storedPin).trim() === String(pin).trim()) {
            console.log('%c[localStaffService] ✅ تم التحقق من pos_staff_sessions (after trim)!', 'color: #4CAF50; font-weight: bold', localStaff.staff_name);
            return { success: true, staff: mapLocalToSession(localStaff) };
          }

          // 3️⃣ 🔧 FIX: إذا كان PIN مشفر بـ MD5، قارن الـ hash
          if (isHashedPin) {
            try {
              // حساب MD5 hash للـ PIN المدخل
              const inputPinMd5 = await computeMd5Hash(pin);
              console.log('[localStaffService] 🔐 مقارنة MD5:', {
                staff_name: localStaff.staff_name,
                stored_hash: storedPin.slice(0, 8) + '...',
                computed_hash: inputPinMd5.slice(0, 8) + '...',
                match: storedPin.toLowerCase() === inputPinMd5.toLowerCase(),
              });

              if (storedPin.toLowerCase() === inputPinMd5.toLowerCase()) {
                console.log('%c[localStaffService] ✅ تم التحقق من pos_staff_sessions (MD5 hash match)!', 'color: #4CAF50; font-weight: bold', localStaff.staff_name);
                return { success: true, staff: mapLocalToSession(localStaff) };
              }
            } catch (hashError) {
              console.warn('[localStaffService] ⚠️ فشل حساب MD5:', hashError);
            }
          }
        }
      }

      console.log('%c[localStaffService] ❌ لم يتم العثور على PIN متطابق', 'color: #f44336; font-weight: bold');
      console.log('[localStaffService] 📋 ملخص البحث:', {
        staff_pins_checked: pinRecords?.length || 0,
        pos_staff_sessions_checked: staffRecords?.length || 0,
      });
      return { success: false, error: 'رمز PIN غير صحيح' };
    } catch (error: any) {
      console.error('[localStaffService] ❌ verifyPin error:', error);
      return { success: false, error: error.message || 'فشل التحقق من PIN' };
    }
  },

  /**
   * حفظ PIN للموظف
   * 🔧 FIX: جلب بيانات الموظف خارج الـ transaction لتجنب مشاكل PowerSync
   */
  async savePin(
    staffId: string,
    pin: string,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('%c[localStaffService] 💾 ═══ حفظ PIN للموظف ═══', 'color: #2196F3; font-weight: bold');
      console.log('[localStaffService] 👤 Staff ID:', staffId);
      console.log('[localStaffService] 🏢 Organization ID:', organizationId);

      const { hash, salt } = await hashPin(pin);
      const now = new Date().toISOString();

      console.log('[localStaffService] 🔑 تم إنشاء hash جديد:', {
        hashPreview: hash.slice(0, 20) + '...',
        saltPreview: salt.slice(0, 15) + '...',
      });

      // 🔧 FIX: جلب بيانات الموظف قبل الـ transaction
      const staff = await this.getById(staffId, organizationId);

      if (!staff) {
        console.warn('[localStaffService] ⚠️ لم يتم العثور على الموظف:', staffId);
        // نحاول الحفظ بدون بيانات الموظف الكاملة
      }

      console.log('[localStaffService] 👤 بيانات الموظف:', staff ? {
        staff_name: staff.staff_name,
        is_active: staff.is_active,
        has_permissions: !!staff.permissions,
      } : 'غير موجود');

      await powerSyncService.transaction(async (tx) => {
        // 1. تحديث pos_staff_sessions
        await tx.execute(
          `UPDATE pos_staff_sessions
           SET updated_at = ?
           WHERE id = ? AND organization_id = ?`,
          [now, staffId, organizationId]
        );
        console.log('[localStaffService] ✅ تم تحديث pos_staff_sessions');

        // 2. تحديث/إنشاء في staff_pins
        const pinRecordId = `pin_${staffId}_${Date.now()}`;
        const staffName = staff?.staff_name || 'موظف';
        const permissionsJson = JSON.stringify(staff?.permissions || {});

        // 🔧 FIX: استخدام INSERT OR REPLACE بدلاً من UPDATE ثم INSERT
        // هذا يتجنب مشكلة التحقق من نتيجة UPDATE
        await tx.execute(
          `INSERT OR REPLACE INTO staff_pins
           (id, staff_id, organization_id, pin_hash, salt, staff_name, permissions, is_active, created_at, updated_at)
           SELECT
             COALESCE(
               (SELECT id FROM staff_pins WHERE staff_id = ? AND organization_id = ?),
               ?
             ),
             ?, ?, ?, ?, ?, ?, 1,
             COALESCE(
               (SELECT created_at FROM staff_pins WHERE staff_id = ? AND organization_id = ?),
               ?
             ),
             ?`,
          [
            staffId, organizationId, pinRecordId, // للـ id
            staffId, organizationId, hash, salt, staffName, permissionsJson, // البيانات الجديدة
            staffId, organizationId, now, // للـ created_at
            now // updated_at
          ]
        );
        console.log('[localStaffService] ✅ تم حفظ PIN في staff_pins');
      });

      console.log('%c[localStaffService] ✅ تم حفظ PIN بنجاح!', 'color: #4CAF50; font-weight: bold');
      return { success: true };
    } catch (error: any) {
      console.error('[localStaffService] ❌ savePin error:', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * جلب الموظفين غير المزامنة (⚠️ PowerSync يدير المزامنة تلقائياً)
   */
  async getUnsynced(organizationId: string): Promise<POSStaffSession[]> {
    // PowerSync يدير المزامنة تلقائياً، لذا نرجع قائمة فارغة
    return [];
  },

  /**
   * تحديث حالة المزامنة (⚠️ PowerSync يدير المزامنة تلقائياً)
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
    // PowerSync يدير المزامنة تلقائياً
    return { success: true };
  },

  /**
   * تحديث الصلاحيات فقط
   */
  async updatePermissions(
    staffId: string,
    permissions: StaffPermissions,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      const permissionsJson = JSON.stringify(permissions);

      await powerSyncService.transaction(async (tx) => {

        // 1. تحديث pos_staff_sessions
        await tx.execute(
          `UPDATE pos_staff_sessions
           SET permissions = ?, updated_at = ?
           WHERE id = ? AND organization_id = ?`,
          [permissionsJson, now, staffId, organizationId]
        );

        // 2. تحديث staff_pins أيضاً
        const staffPinsResult = await tx.execute(
          `UPDATE staff_pins
           SET permissions = ?, updated_at = ?
           WHERE staff_id = ? AND organization_id = ?`,
          [permissionsJson, now, staffId, organizationId]
        );

        if (staffPinsResult && Array.isArray(staffPinsResult) && staffPinsResult.length > 0) {
          console.log(`[localStaffService] ✅ Updated staff_pins permissions for: ${staffId}`);
        }
      });

      console.log(`[localStaffService] ✅ Updated permissions via PowerSync for: ${staffId}`);
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
      const now = new Date().toISOString();

      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          `UPDATE pos_staff_sessions
           SET is_active = ?, updated_at = ?
           WHERE id = ? AND organization_id = ?`,
          [isActive ? 1 : 0, now, staffId, organizationId]
        );
      });

      console.log(
        `[localStaffService] ✅ Toggled active status via PowerSync for: ${staffId} to ${isActive}`
      );
      return { success: true };
    } catch (error: any) {
      console.error('[localStaffService] toggleActive error:', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * مسح جميع الموظفين
   */
  async clear(organizationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await powerSyncService.transaction(async (tx) => {
        await tx.execute(
          `DELETE FROM pos_staff_sessions WHERE organization_id = ?`,
          [organizationId]
        );
      });

      console.log('[localStaffService] ✅ Cleared all staff via PowerSync');
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
      const ready = await powerSyncService.waitForInitialization(10000);
      if (!ready || !powerSyncService.db) {
        console.warn('[localStaffService] PowerSync DB not ready');
        return { total: 0, active: 0, inactive: 0, unsynced: 0 };
      }

      const totalResult = await powerSyncService.queryOne<{ count: number }>({
        sql: `SELECT COUNT(*) as count FROM pos_staff_sessions WHERE organization_id = ?`,
        params: [organizationId]
      });

      const activeResult = await powerSyncService.queryOne<{ count: number }>({
        sql: `SELECT COUNT(*) as count FROM pos_staff_sessions
         WHERE organization_id = ? AND is_active = 1`,
        params: [organizationId]
      });

      const total = totalResult?.count || 0;
      const active = activeResult?.count || 0;

      return {
        total,
        active,
        inactive: total - active,
        unsynced: 0, // PowerSync يدير المزامنة تلقائياً
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





