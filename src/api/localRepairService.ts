import { v4 as uuidv4 } from 'uuid';
import { inventoryDB, type LocalRepairOrder, type LocalRepairStatusHistory, type LocalRepairImage, type LocalRepairImageFile, type LocalRepairLocation } from '@/database/localDb';

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
const normAr = (s?: string | null) => {
  try {
    let t = (s || '').toString().toLowerCase();
    t = t.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
    t = t.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');
    t = t.replace(/\u0624/g, '\u0648');
    t = t.replace(/\u0626/g, '\u064a');
    t = t.replace(/\u0629/g, '\u0647');
    t = t.replace(/\u0649/g, '\u064a');
    return t.replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  } catch { return (s || '').toString().toLowerCase(); }
};

export function generateRepairIdentifiers(orderId?: string) {
  const idFrag = (orderId || uuidv4()).slice(0, 4);
  const d = new Date();
  const yy = d.getFullYear().toString().slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return {
    orderNumber: `RPR-${yy}${mm}-${rnd}`,
    trackingCode: `TR-${yy}${mm}-${rnd}-${idFrag}`
  };
}

export type RepairOrderCreateInput = {
  customer_name: string;
  customer_phone: string;
  device_type?: string;
  repair_location_id?: string | null;
  custom_location?: string | null;
  issue_description?: string;
  total_price?: number | null;
  paid_amount?: number;
  payment_method?: string;
  price_to_be_determined_later?: boolean;
  received_by?: string;
  order_number?: string | null;
  repair_tracking_code?: string | null;
  status?: string; // default: قيد الانتظار
};

export async function createLocalRepairOrder(input: RepairOrderCreateInput): Promise<LocalRepairOrder> {
  const id = uuidv4();
  const orgId = getOrgId();
  const now = nowISO();
  const rec: LocalRepairOrder = {
    id,
    organization_id: orgId,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    customer_name_lower: normAr(input.customer_name),
    device_type: input.device_type || null,
    device_type_lower: normAr(input.device_type || ''),
    repair_location_id: input.repair_location_id ?? null,
    custom_location: input.custom_location ?? null,
    issue_description: input.issue_description || null,
    status: input.status || 'قيد الانتظار',
    total_price: typeof input.total_price === 'number' ? input.total_price : (input.price_to_be_determined_later ? null : 0),
    paid_amount: Number(input.paid_amount || 0),
    price_to_be_determined_later: !!input.price_to_be_determined_later,
    received_by: input.received_by || null,
    order_number: input.order_number || generateRepairIdentifiers(id).orderNumber,
    repair_tracking_code: input.repair_tracking_code || generateRepairIdentifiers(id).trackingCode,
    payment_method: input.payment_method || null,
    repair_notes: null,
    created_at: now,
    updated_at: now,
    synced: false,
    pendingOperation: 'create',
  };
  await inventoryDB.repairOrders.put(rec);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairs?.())); } catch {}
  return rec;
}

export async function updateLocalRepairOrder(id: string, patch: Partial<RepairOrderCreateInput>): Promise<LocalRepairOrder | null> {
  const ex = await inventoryDB.repairOrders.get(id);
  if (!ex) return null;
  const now = nowISO();
  const updated: LocalRepairOrder = {
    ...ex,
    customer_name: patch.customer_name ?? ex.customer_name,
    customer_phone: patch.customer_phone ?? ex.customer_phone,
    customer_name_lower: normAr(patch.customer_name ?? ex.customer_name),
    device_type: (patch.device_type ?? ex.device_type) || null,
    device_type_lower: normAr(patch.device_type ?? ex.device_type ?? ''),
    repair_location_id: patch.repair_location_id ?? ex.repair_location_id ?? null,
    custom_location: patch.custom_location ?? ex.custom_location ?? null,
    issue_description: patch.issue_description ?? ex.issue_description ?? null,
    status: patch.status ?? ex.status,
    total_price: (patch.total_price !== undefined) ? patch.total_price : ex.total_price,
    paid_amount: (patch.paid_amount !== undefined) ? Number(patch.paid_amount) : ex.paid_amount,
    price_to_be_determined_later: patch.price_to_be_determined_later ?? ex.price_to_be_determined_later,
    received_by: patch.received_by ?? ex.received_by,
    order_number: patch.order_number ?? ex.order_number,
    repair_tracking_code: patch.repair_tracking_code ?? ex.repair_tracking_code,
    payment_method: patch.payment_method ?? ex.payment_method,
    updated_at: now,
    synced: false,
    pendingOperation: ex.pendingOperation === 'create' ? 'create' : 'update',
  };
  await inventoryDB.repairOrders.put(updated);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairs?.())); } catch {}
  return updated;
}

export async function listLocalRepairOrders(organizationId?: string): Promise<LocalRepairOrder[]> {
  const orgId = organizationId || getOrgId();
  const all = await inventoryDB.repairOrders.where('organization_id').equals(orgId).toArray();
  all.sort((a,b)=> (b.created_at||'').localeCompare(a.created_at||''));
  return all;
}

export async function getLocalRepairOrder(id: string): Promise<LocalRepairOrder | null> {
  return (await inventoryDB.repairOrders.get(id)) || null;
}

export async function getLocalRepairOrderDetailed(id: string): Promise<any | null> {
  const order = await inventoryDB.repairOrders.get(id);
  if (!order) return null;
  const [images, history, location] = await Promise.all([
    inventoryDB.repairImages.where('repair_order_id').equals(id).toArray(),
    inventoryDB.repairStatusHistory.where('repair_order_id').equals(id).toArray(),
    order.repair_location_id ? inventoryDB.repairLocations.get(order.repair_location_id) : Promise.resolve(null)
  ]);
  const sortedHistory = [...history].sort((a,b)=> (b.created_at||'').localeCompare(a.created_at||''));
  return {
    ...order,
    images,
    history: sortedHistory,
    repair_location: location ? { id: location.id, name: location.name, description: location.description, address: location.address, phone: location.phone } : undefined,
  };
}

export async function addLocalRepairHistory(args: { orderId: string; status: string; notes?: string; createdBy?: string | 'customer' }): Promise<LocalRepairStatusHistory> {
  const rec: LocalRepairStatusHistory = {
    id: uuidv4(),
    repair_order_id: args.orderId,
    status: args.status,
    notes: args.notes || null,
    created_by: args.createdBy || 'customer',
    created_at: nowISO(),
    synced: false,
    pendingOperation: 'create',
  };
  await inventoryDB.repairStatusHistory.put(rec);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairs?.())); } catch {}
  return rec;
}

export async function changeLocalRepairStatus(orderId: string, newStatus: string, notes?: string, createdBy?: string) {
  const ex = await inventoryDB.repairOrders.get(orderId);
  if (!ex) throw new Error('Repair order not found');
  await updateLocalRepairOrder(orderId, { status: newStatus });
  await addLocalRepairHistory({ orderId, status: newStatus, notes, createdBy });
}

export async function addLocalRepairPayment(orderId: string, amount: number, createdBy?: string) {
  const ex = await inventoryDB.repairOrders.get(orderId);
  if (!ex) throw new Error('Repair order not found');
  const newPaid = Number(ex.paid_amount || 0) + Math.max(0, Number(amount) || 0);
  await updateLocalRepairOrder(orderId, { paid_amount: newPaid });
  await addLocalRepairHistory({ orderId, status: 'دفعة جديدة', notes: `تم استلام دفعة بمبلغ ${amount} دج. الإجمالي المدفوع: ${newPaid} دج`, createdBy });
}

export async function addLocalRepairImage(orderId: string, file: File, opts?: { image_type?: 'before' | 'after' | 'other'; description?: string }) {
  const imageId = uuidv4();
  const imageRec: LocalRepairImage = {
    id: imageId,
    repair_order_id: orderId,
    image_type: opts?.image_type || 'before',
    description: opts?.description || null,
    created_at: nowISO(),
    image_url: null,
    storage_path: null,
    synced: false,
    pendingOperation: 'create',
  };
  await inventoryDB.repairImages.put(imageRec);
  const blobRec: LocalRepairImageFile = {
    id: uuidv4(),
    repair_image_id: imageId,
    mime: file.type,
    size: file.size,
    blob: file,
    uploaded: false,
  };
  await inventoryDB.repairImageFiles.put(blobRec);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairImages?.())); } catch {}
  return imageRec;
}

// Locations
export async function listLocalRepairLocations(organizationId?: string): Promise<LocalRepairLocation[]> {
  const orgId = organizationId || getOrgId();
  const list = await inventoryDB.repairLocations.where('organization_id').equals(orgId).and(l => l.is_active !== false).toArray();
  list.sort((a,b)=> (Number(b.is_default) - Number(a.is_default)) || (b.created_at||'').localeCompare(a.created_at||''));
  return list;
}

export async function createLocalRepairLocation(data: { name: string; description?: string; address?: string; phone?: string; email?: string; is_default?: boolean; }): Promise<LocalRepairLocation> {
  const id = uuidv4();
  const orgId = getOrgId();
  const now = nowISO();
  if (data.is_default) {
    // unset other defaults locally
    const others = await inventoryDB.repairLocations.where('organization_id').equals(orgId).and(l => l.is_default === true).toArray();
    for (const o of others) {
      await inventoryDB.repairLocations.put({ ...o, is_default: false, updated_at: now, synced: false, pendingOperation: o.pendingOperation === 'create' ? 'create' : 'update' });
    }
  }
  const rec: LocalRepairLocation = {
    id,
    organization_id: orgId,
    name: data.name,
    description: data.description || null,
    address: data.address || null,
    phone: data.phone || null,
    email: data.email || null,
    is_default: !!data.is_default,
    is_active: true,
    created_at: now,
    updated_at: now,
    synced: false,
    pendingOperation: 'create',
  };
  await inventoryDB.repairLocations.put(rec);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairLocations?.())); } catch {}
  return rec;
}

export async function updateLocalRepairLocation(id: string, patch: Partial<Omit<LocalRepairLocation, 'id' | 'organization_id' | 'created_at' | 'synced' | 'pendingOperation'>>): Promise<LocalRepairLocation | null> {
  const ex = await inventoryDB.repairLocations.get(id);
  if (!ex) return null;
  const now = nowISO();
  if (patch.is_default) {
    const others = await inventoryDB.repairLocations.where('organization_id').equals(ex.organization_id).and(l => l.id !== id && l.is_default === true).toArray();
    for (const o of others) {
      await inventoryDB.repairLocations.put({ ...o, is_default: false, updated_at: now, synced: false, pendingOperation: o.pendingOperation === 'create' ? 'create' : 'update' });
    }
  }
  const updated: LocalRepairLocation = {
    ...ex,
    name: patch.name ?? ex.name,
    description: patch.description ?? ex.description,
    address: patch.address ?? ex.address,
    phone: patch.phone ?? ex.phone,
    email: patch.email ?? ex.email,
    is_default: patch.is_default ?? ex.is_default,
    is_active: patch.is_active ?? ex.is_active,
    updated_at: now,
    synced: false,
    pendingOperation: ex.pendingOperation === 'create' ? 'create' : 'update',
  };
  await inventoryDB.repairLocations.put(updated);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairLocations?.())); } catch {}
  return updated;
}

export async function softDeleteLocalRepairLocation(id: string): Promise<boolean> {
  const ex = await inventoryDB.repairLocations.get(id);
  if (!ex) return false;
  const now = nowISO();
  await inventoryDB.repairLocations.put({ ...ex, is_active: false, is_default: false, updated_at: now, synced: false, pendingOperation: ex.pendingOperation === 'create' ? 'create' : 'update' });
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairLocations?.())); } catch {}
  return true;
}

export async function computeLocalQueueInfo(orderId: string): Promise<{ queue_position: number; total_in_queue: number } | null> {
  const cur = await inventoryDB.repairOrders.get(orderId);
  if (!cur || !cur.repair_location_id) return null;
  const activeStatuses = ['قيد الانتظار', 'جاري التصليح'];
  const all = await inventoryDB.repairOrders
    .where('organization_id').equals(cur.organization_id)
    .and(o => o.repair_location_id === cur.repair_location_id && activeStatuses.includes(o.status))
    .toArray();
  all.sort((a,b)=> (a.created_at||'').localeCompare(b.created_at||''));
  const total = all.length;
  const idx = all.findIndex(o => o.id === orderId);
  const pos = idx >= 0 ? (idx + 1) : total;
  return { queue_position: pos, total_in_queue: total };
}

export async function deleteLocalRepairOrder(id: string): Promise<boolean> {
  const ex = await inventoryDB.repairOrders.get(id);
  if (!ex) return false;
  const now = nowISO();
  await inventoryDB.repairOrders.put({ ...ex, updated_at: now, synced: false, pendingOperation: 'delete' });
  // Mark related objects as needing deletion (best-effort)
  try {
    const imgs = await inventoryDB.repairImages.where('repair_order_id').equals(id).toArray();
    for (const im of imgs) await inventoryDB.repairImages.put({ ...im, synced: false, pendingOperation: 'delete' });
  } catch {}
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairs?.())); } catch {}
  return true;
}
