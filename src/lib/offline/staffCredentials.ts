import { inventoryDB, type LocalStaffPIN } from '@/database/localDb';

const te = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

const toBase64 = (bytes: Uint8Array): string => {
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
};

const fromBase64 = (b64: string): Uint8Array => {
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const randomSalt = (len = 16): string => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return toBase64(arr);
  }
  // fallback
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 256);
  return toBase64(arr);
};

export async function hashPin(pin: string, salt: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && te) {
      const data = te.encode(`${salt}:${pin}`);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return toBase64(new Uint8Array(digest));
    }
  } catch {}
  // weak fallback
  let h = 0;
  const str = `${salt}:${pin}`;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return String(h >>> 0);
}

export async function saveStaffPinOffline(args: {
  staffId: string;
  organizationId: string;
  staffName: string;
  pin: string;
  permissions?: any;
}): Promise<void> {
  const salt = randomSalt(16);
  const pin_hash = await hashPin(args.pin, salt);
  const rec: LocalStaffPIN = {
    id: args.staffId,
    organization_id: args.organizationId,
    staff_name: args.staffName,
    pin_hash,
    salt,
    permissions: args.permissions || null,
    updated_at: new Date().toISOString()
  };
  // upsert
  await inventoryDB.staffPins.put(rec);
}

export async function updateStaffPinOffline(args: {
  staffId: string;
  organizationId: string;
  newPin: string;
}): Promise<void> {
  const salt = randomSalt(16);
  const pin_hash = await hashPin(args.newPin, salt);
  await inventoryDB.staffPins.put({
    id: args.staffId,
    organization_id: args.organizationId,
    staff_name: (await inventoryDB.staffPins.get(args.staffId))?.staff_name || '',
    pin_hash,
    salt,
    permissions: (await inventoryDB.staffPins.get(args.staffId))?.permissions || null,
    updated_at: new Date().toISOString()
  });
}

export async function verifyStaffPinOffline(args: {
  organizationId: string;
  pin: string;
}): Promise<{ success: boolean; staff?: { id: string; staff_name: string; permissions?: any; organization_id: string } }>{
  try {
    const matches = await inventoryDB.staffPins.where('organization_id').equals(args.organizationId).toArray();
    for (const rec of matches) {
      const computed = await hashPin(args.pin, rec.salt);
      if (computed === rec.pin_hash) {
        return { success: true, staff: { id: rec.id, staff_name: rec.staff_name, permissions: rec.permissions, organization_id: rec.organization_id } };
      }
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

export async function updateStaffMetadataOffline(args: {
  staffId: string;
  organizationId: string;
  staffName?: string;
  permissions?: any;
}): Promise<void> {
  const rec = await inventoryDB.staffPins.get(args.staffId);
  if (!rec || rec.organization_id !== args.organizationId) return;
  await inventoryDB.staffPins.put({
    ...rec,
    staff_name: args.staffName ?? rec.staff_name,
    permissions: args.permissions ?? rec.permissions,
    updated_at: new Date().toISOString()
  });
}
