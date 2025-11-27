/**
 * localRepairService - خدمة إصلاحات الأجهزة المحلية
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalRepairOrder, LocalRepairStatusHistory, LocalRepairImage, LocalRepairLocation } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';

// Re-export types
export type { LocalRepairOrder, LocalRepairStatusHistory, LocalRepairImage, LocalRepairLocation } from '@/database/localDb';

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
  status?: string;
};

/**
 * إنشاء طلب إصلاح جديد
 */
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
    notes: null,
    created_at: now,
    updated_at: now,
    synced: false,
    pendingOperation: 'create',
  };

  // ⚡ استخدام Delta Sync
  const result = await deltaWriteService.create('repair_orders', rec, orgId);
  if (!result.success) {
    throw new Error(`Failed to create repair order: ${result.error}`);
  }

  console.log(`[LocalRepair] ⚡ Created repair ${id} via Delta Sync`);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairs?.())); } catch {}
  return rec;
}

/**
 * تحديث طلب إصلاح
 */
export async function updateLocalRepairOrder(id: string, patch: Partial<RepairOrderCreateInput>): Promise<LocalRepairOrder | null> {
  const ex = await deltaWriteService.get<LocalRepairOrder>('repair_orders', id);
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

  await deltaWriteService.update('repair_orders', id, updated);
  console.log(`[LocalRepair] ⚡ Updated repair ${id} via Delta Sync`);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairs?.())); } catch {}
  return updated;
}

/**
 * قائمة طلبات الإصلاح
 */
export async function listLocalRepairOrders(organizationId?: string): Promise<LocalRepairOrder[]> {
  const orgId = organizationId || getOrgId();

  const all = await deltaWriteService.getAll<LocalRepairOrder>('repair_orders', orgId, {
    where: "(pending_operation IS NULL OR pending_operation != 'delete')",
    orderBy: 'created_at DESC'
  });

  return all;
}

/**
 * الحصول على طلب إصلاح بالمعرّف
 */
export async function getLocalRepairOrder(id: string): Promise<LocalRepairOrder | null> {
  return deltaWriteService.get<LocalRepairOrder>('repairs', id);
}

/**
 * الحصول على تفاصيل طلب الإصلاح مع الصور والتاريخ
 */
export async function getLocalRepairOrderDetailed(id: string): Promise<any | null> {
  const order = await deltaWriteService.get<LocalRepairOrder>('repairs', id);
  if (!order) return null;

  const orgId = order.organization_id;

  const [images, history, location] = await Promise.all([
    deltaWriteService.getAll<LocalRepairImage>('repair_images' as any, orgId, {
      where: 'repair_order_id = ?',
      params: [id]
    }),
    deltaWriteService.getAll<LocalRepairStatusHistory>('repair_status_history' as any, orgId, {
      where: 'repair_order_id = ?',
      params: [id]
    }),
    order.repair_location_id
      ? deltaWriteService.get<LocalRepairLocation>('repair_locations' as any, order.repair_location_id)
      : Promise.resolve(null)
  ]);

  const sortedHistory = [...history].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  return {
    ...order,
    images,
    history: sortedHistory,
    repair_location: location ? { id: location.id, name: location.name, description: location.description, address: location.address, phone: location.phone } : undefined,
  };
}

/**
 * إضافة صورة لطلب الإصلاح
 */
export async function addLocalRepairImage(args: {
  orderId: string;
  imageUrl: string;
  imageType?: 'before' | 'after' | 'during' | 'receipt';
  notes?: string;
}): Promise<LocalRepairImage> {
  const orgId = getOrgId();
  const now = nowISO();

  const rec: LocalRepairImage = {
    id: uuidv4(),
    repair_id: args.orderId,
    image_url: args.imageUrl,
    image_data: '', // Fallback
    image_type: args.imageType || 'before',
    file_size: 0,
    is_thumbnail: false,
    uploaded_to_server: false,
    notes: args.notes || null,
    created_at: now,
    synced: false,
    pendingOperation: 'create',
  };

  await deltaWriteService.create('repair_images' as any, rec, orgId);
  console.log(`[LocalRepair] ⚡ Added image for repair ${args.orderId}`);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairs?.())); } catch {}
  return rec;
}

/**
 * إضافة سجل تاريخ حالة
 */
export async function addLocalRepairHistory(args: { orderId: string; status: string; notes?: string; createdBy?: string | 'customer' }): Promise<LocalRepairStatusHistory> {
  const orgId = getOrgId();

  const rec: LocalRepairStatusHistory = {
    id: uuidv4(),
    repair_order_id: args.orderId,
    status: args.status,
    notes: args.notes || null,
    created_by: args.createdBy || 'customer',
    created_at: nowISO(),
    synced: false,
    pendingOperation: 'create',
  } as any;

  await deltaWriteService.create('repair_status_history' as any, rec, orgId);
  console.log(`[LocalRepair] ⚡ Added history for repair ${args.orderId}`);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairs?.())); } catch {}
  return rec;
}

/**
 * تغيير حالة طلب الإصلاح
 */
export async function changeLocalRepairStatus(orderId: string, newStatus: string, notes?: string, createdBy?: string) {
  const ex = await deltaWriteService.get<LocalRepairOrder>('repair_orders', orderId);
  if (!ex) throw new Error('Repair order not found');
  await updateLocalRepairOrder(orderId, { status: newStatus });
  await addLocalRepairHistory({ orderId, status: newStatus, notes, createdBy });
}

/**
 * إضافة دفعة لطلب الإصلاح
 */
export async function addLocalRepairPayment(orderId: string, amount: number, createdBy?: string) {
  const ex = await deltaWriteService.get<LocalRepairOrder>('repairs', orderId);
  if (!ex) throw new Error('Repair order not found');

  const newPaid = Number(ex.paid_amount || 0) + Math.max(0, Number(amount) || 0);
  await updateLocalRepairOrder(orderId, { paid_amount: newPaid });
  await addLocalRepairHistory({ orderId, status: 'دفعة جديدة', notes: `تم استلام دفعة بمبلغ ${amount} دج. الإجمالي المدفوع: ${newPaid} دج`, createdBy });
}

/**
 * قائمة مواقع الإصلاح
 */
export async function listLocalRepairLocations(organizationId?: string): Promise<LocalRepairLocation[]> {
  const orgId = organizationId || getOrgId();

  return deltaWriteService.getAll<LocalRepairLocation>('repair_locations' as any, orgId, {
    where: 'is_active != 0',
    orderBy: 'is_default DESC, created_at DESC'
  });
}

/**
 * إنشاء موقع إصلاح جديد
 */
export async function createLocalRepairLocation(data: { name: string; description?: string; address?: string; phone?: string; email?: string; is_default?: boolean; }): Promise<LocalRepairLocation> {
  const id = uuidv4();
  const orgId = getOrgId();
  const now = nowISO();

  if (data.is_default) {
    // إلغاء الموقع الافتراضي للمواقع الأخرى
    const others = await deltaWriteService.getAll<LocalRepairLocation>('repair_locations' as any, orgId, {
      where: 'is_default = 1'
    });
    for (const o of others) {
      await deltaWriteService.update('repair_locations' as any, o.id, {
        is_default: false,
        updated_at: now,
        synced: false,
        pendingOperation: o.pendingOperation === 'create' ? 'create' : 'update'
      });
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

  await deltaWriteService.create('repair_locations' as any, rec, orgId);
  console.log(`[LocalRepair] ⚡ Created location ${id} via Delta Sync`);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairLocations?.())); } catch {}
  return rec;
}

/**
 * تحديث موقع إصلاح
 */
export async function updateLocalRepairLocation(id: string, patch: Partial<Omit<LocalRepairLocation, 'id' | 'organization_id' | 'created_at' | 'synced' | 'pendingOperation'>>): Promise<LocalRepairLocation | null> {
  const ex = await deltaWriteService.get<LocalRepairLocation>('repair_locations' as any, id);
  if (!ex) return null;

  const now = nowISO();
  const orgId = ex.organization_id;

  if (patch.is_default) {
    const others = await deltaWriteService.getAll<LocalRepairLocation>('repair_locations' as any, orgId, {
      where: 'id != ? AND is_default = 1',
      params: [id]
    });
    for (const o of others) {
      await deltaWriteService.update('repair_locations' as any, o.id, {
        is_default: false,
        updated_at: now,
        synced: false,
        pendingOperation: o.pendingOperation === 'create' ? 'create' : 'update'
      });
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

  await deltaWriteService.update('repair_locations' as any, id, updated);
  console.log(`[LocalRepair] ⚡ Updated location ${id} via Delta Sync`);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairLocations?.())); } catch {}
  return updated;
}

/**
 * حذف موقع إصلاح (soft delete)
 */
export async function softDeleteLocalRepairLocation(id: string): Promise<boolean> {
  const ex = await deltaWriteService.get<LocalRepairLocation>('repair_locations' as any, id);
  if (!ex) return false;

  const now = nowISO();
  await deltaWriteService.update('repair_locations' as any, id, {
    is_active: false,
    is_default: false,
    updated_at: now,
    synced: false,
    pendingOperation: ex.pendingOperation === 'create' ? 'create' : 'update'
  });

  console.log(`[LocalRepair] ⚡ Soft deleted location ${id} via Delta Sync`);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairLocations?.())); } catch {}
  return true;
}

/**
 * حساب ترتيب الطابور
 */
export async function computeLocalQueueInfo(orderId: string): Promise<{ queue_position: number; total_in_queue: number } | null> {
  const cur = await deltaWriteService.get<LocalRepairOrder>('repairs', orderId);
  if (!cur || !cur.repair_location_id) return null;

  const activeStatuses = ['قيد الانتظار', 'جاري التصليح'];

  const all = await deltaWriteService.getAll<LocalRepairOrder>('repair_orders', cur.organization_id, {
    where: `repair_location_id = ? AND status IN ('${activeStatuses.join("','")}')`,
    params: [cur.repair_location_id]
  });

  all.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
  const total = all.length;
  const idx = all.findIndex(o => o.id === orderId);
  const pos = idx >= 0 ? (idx + 1) : total;
  return { queue_position: pos, total_in_queue: total };
}

/**
 * حذف طلب إصلاح
 */
export async function deleteLocalRepairOrder(id: string): Promise<boolean> {
  const ex = await deltaWriteService.get<LocalRepairOrder>('repair_orders', id);
  if (!ex) return false;

  const now = nowISO();
  await deltaWriteService.update('repair_orders', id, {
    updated_at: now,
    synced: false,
    pendingOperation: 'delete'
  });

  console.log(`[LocalRepair] ⚡ Marked repair ${id} for deletion via Delta Sync`);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairs?.())); } catch {}
  return true;
}

// =====================
// حفظ البيانات من السيرفر
// =====================

export const saveRemoteRepairOrders = async (orders: any[]): Promise<void> => {
  if (!orders || orders.length === 0) return;

  const now = nowISO();

  for (const order of orders) {
    const mappedOrder: LocalRepairOrder = {
      id: order.id,
      organization_id: order.organization_id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_name_lower: normAr(order.customer_name),
      device_type: order.device_type,
      device_type_lower: normAr(order.device_type),
      repair_location_id: order.repair_location_id,
      custom_location: order.custom_location,
      issue_description: order.issue_description,
      status: order.status || 'قيد الانتظار',
      total_price: order.total_price,
      paid_amount: order.paid_amount || 0,
      price_to_be_determined_later: order.price_to_be_determined_later || false,
      received_by: order.received_by,
      repair_tracking_code: order.repair_tracking_code,
      payment_method: order.payment_method,
      notes: order.notes,
      created_at: order.created_at || now,
      updated_at: order.updated_at || now,
      synced: true,
      pendingOperation: undefined,
    };

    await deltaWriteService.saveFromServer('repair_orders', mappedOrder);
  }

  console.log(`[LocalRepair] ⚡ Saved ${orders.length} remote repair orders`);
};
