/**
 * localRepairService - خدمة إصلاحات الأجهزة المحلية
 *
 * ⚡ تم التحديث لاستخدام PowerSync بالكامل
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - PowerSync: المزامنة التلقائية مع Supabase
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalRepairOrder, LocalRepairStatusHistory, LocalRepairImage, LocalRepairLocation } from '@/database/localDb';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

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
    // ⚡ v3.0: تم إزالة customer_name_lower - غير موجود في PowerSync schema
    device_type: input.device_type || null,
    // ⚡ v3.0: تم إزالة device_type_lower - غير موجود في PowerSync schema
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
    updated_at: now
    // ⚠️ PowerSync يدير المزامنة تلقائياً - لا حاجة لحقول synced
  } as any;

  // ⚡ استخدام PowerSync مباشرة
await powerSyncService.transaction(async (tx) => {
    const keys = Object.keys(rec).filter(k => k !== 'id');
    const values = keys.map(k => (rec as any)[k]);
    const placeholders = keys.map(() => '?').join(', ');
    
    await tx.execute(
      `INSERT INTO repair_orders (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
      [id, ...values, now, now]
    );
  });

  console.log(`[LocalRepair] ⚡ Created repair ${id} via PowerSync`);
  return rec;
}

/**
 * تحديث طلب إصلاح
 */
export async function updateLocalRepairOrder(id: string, patch: Partial<RepairOrderCreateInput>): Promise<LocalRepairOrder | null> {
  const ex = await powerSyncService.get<LocalRepairOrder>(
    'SELECT * FROM repair_orders WHERE id = ?',
    [id]
  );
  if (!ex) return null;

  const now = nowISO();
  const updated: LocalRepairOrder = {
    ...ex,
    customer_name: patch.customer_name ?? ex.customer_name,
    customer_phone: patch.customer_phone ?? ex.customer_phone,
    // ⚡ v3.0: تم إزالة customer_name_lower - غير موجود في PowerSync schema
    device_type: (patch.device_type ?? ex.device_type) || null,
    // ⚡ v3.0: تم إزالة device_type_lower - غير موجود في PowerSync schema
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
    updated_at: now
    // ⚠️ PowerSync يدير المزامنة تلقائياً - لا حاجة لحقول synced
  } as any;

  // ⚡ استخدام PowerSync مباشرة
await powerSyncService.transaction(async (tx) => {
    const keys = Object.keys(updated).filter(k => k !== 'id' && k !== 'created_at');
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (updated as any)[k]);
    
    await tx.execute(
      `UPDATE repair_orders SET ${setClause}, updated_at = ? WHERE id = ?`,
      [...values, now, id]
    );
  });

  console.log(`[LocalRepair] ⚡ Updated repair ${id} via PowerSync`);
  return updated;
}

/**
 * قائمة طلبات الإصلاح
 */
export async function listLocalRepairOrders(organizationId?: string): Promise<LocalRepairOrder[]> {
  const orgId = organizationId || getOrgId();

  const all = await powerSyncService.query<LocalRepairOrder>({
    sql: `SELECT * FROM repair_orders
     WHERE organization_id = ?
     ORDER BY created_at DESC`,
    params: [orgId]
  });

  return all;
}

/**
 * الحصول على طلب إصلاح بالمعرّف
 */
export async function getLocalRepairOrder(id: string): Promise<LocalRepairOrder | null> {
  return await powerSyncService.get<LocalRepairOrder>(
    'SELECT * FROM repair_orders WHERE id = ?',
    [id]
  );
}

/**
 * الحصول على تفاصيل طلب الإصلاح مع الصور والتاريخ
 */
export async function getLocalRepairOrderDetailed(id: string): Promise<any | null> {
  const order = await powerSyncService.get<LocalRepairOrder>(
    'SELECT * FROM repair_orders WHERE id = ?',
    [id]
  );
  if (!order) return null;

  const orgId = order.organization_id;

  const [images, history, location] = await Promise.all([
    powerSyncService.query<LocalRepairImage>({
      sql: 'SELECT * FROM repair_images WHERE repair_order_id = ?',
      params: [id]
    }),
    powerSyncService.db!.getAll<LocalRepairStatusHistory>(
      'SELECT * FROM repair_status_history WHERE repair_order_id = ? ORDER BY created_at DESC',
      [id]
    ),
    order.repair_location_id
      ? powerSyncService.get<LocalRepairLocation>(
          'SELECT * FROM repair_locations WHERE id = ?',
          [order.repair_location_id]
        )
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
 * يدعم كلاً من: URL مباشر أو File object
 */
export async function addLocalRepairImage(
  orderId: string,
  imageOrUrl: string | File,
  options?: { image_type?: 'before' | 'after' | 'during' | 'receipt'; description?: string }
): Promise<LocalRepairImage> {
  const now = nowISO();

  // تحويل File إلى data URL إذا لزم الأمر
  let imageUrl: string;
  if (typeof imageOrUrl === 'string') {
    imageUrl = imageOrUrl;
  } else {
    // تحويل File إلى base64 data URL
    imageUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageOrUrl);
    });
  }

  const rec: LocalRepairImage = {
    id: uuidv4(),
    repair_order_id: orderId,
    image_url: imageUrl,
    image_type: options?.image_type || 'before',
    description: options?.description || null,
    created_at: now,
    updated_at: now
  } as any;
await powerSyncService.transaction(async (tx) => {
    const keys = Object.keys(rec).filter(k => k !== 'id');
    const values = keys.map(k => (rec as any)[k]);
    const placeholders = keys.map(() => '?').join(', ');

    await tx.execute(
      `INSERT INTO repair_images (id, ${keys.join(', ')}) VALUES (?, ${placeholders})`,
      [rec.id, ...values]
    );
  });

  console.log(`[LocalRepair] ⚡ Added image for repair ${orderId}`);
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
    created_at: nowISO()
    // ⚠️ PowerSync يدير المزامنة تلقائياً - لا حاجة لحقول synced
  } as any;
await powerSyncService.transaction(async (tx) => {
    const keys = Object.keys(rec).filter(k => k !== 'id');
    const values = keys.map(k => (rec as any)[k]);
    const placeholders = keys.map(() => '?').join(', ');

    await tx.execute(
      `INSERT INTO repair_status_history (id, ${keys.join(', ')}) VALUES (?, ${placeholders})`,
      [rec.id, ...values]
    );
  });
  console.log(`[LocalRepair] ⚡ Added history for repair ${args.orderId}`);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairs?.())); } catch {}
  return rec;
}

/**
 * تغيير حالة طلب الإصلاح
 */
export async function changeLocalRepairStatus(orderId: string, newStatus: string, notes?: string, createdBy?: string) {
  const ex = await powerSyncService.get<LocalRepairOrder>(
    'SELECT * FROM repair_orders WHERE id = ?',
    [orderId]
  );
  if (!ex) throw new Error('Repair order not found');
  await updateLocalRepairOrder(orderId, { status: newStatus });
  await addLocalRepairHistory({ orderId, status: newStatus, notes, createdBy });
}

/**
 * إضافة دفعة لطلب الإصلاح
 */
export async function addLocalRepairPayment(orderId: string, amount: number, createdBy?: string) {
  const ex = await powerSyncService.get<LocalRepairOrder>(
    'SELECT * FROM repair_orders WHERE id = ?',
    [orderId]
  );
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

  if (!powerSyncService.db) {
    console.warn('[localRepairService] PowerSync DB not initialized');
    return [];
  }
  return await powerSyncService.query<LocalRepairLocation>({
    sql: `SELECT * FROM repair_locations 
     WHERE organization_id = ? AND is_active != 0
     ORDER BY is_default DESC, created_at DESC`,
    params: [orgId]
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
    const others = await powerSyncService.query<LocalRepairLocation>({
      sql: 'SELECT * FROM repair_locations WHERE organization_id = ? AND is_default = 1',
      params: [orgId]
    });
    for (const o of others) {
      await powerSyncService.transaction(async (tx) => {
await tx.execute(
          'UPDATE repair_locations SET is_default = 0, updated_at = ? WHERE id = ?',
          [now, o.id]
        );
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
    // ⚡ حقول المزامنة الموحدة
    synced: 0,  // 0 = not synced, 1 = synced
    sync_status: 'pending',
    pending_operation: 'INSERT',
    local_updated_at: now,
  };
await powerSyncService.transaction(async (tx) => {
    const keys = Object.keys(rec).filter(k => k !== 'id');
    const values = keys.map(k => (rec as any)[k]);
    const placeholders = keys.map(() => '?').join(', ');
    
    await tx.execute(
      `INSERT INTO repair_locations (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
      [id, ...values, now, now]
    );
  });
  
  console.log(`[LocalRepair] ⚡ Created location ${id} via PowerSync`);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairLocations?.())); } catch {}
  return rec;
}

/**
 * تحديث موقع إصلاح
 */
export async function updateLocalRepairLocation(id: string, patch: Partial<Omit<LocalRepairLocation, 'id' | 'organization_id' | 'created_at' | 'synced' | 'pendingOperation'>>): Promise<LocalRepairLocation | null> {
  const ex = await powerSyncService.get<LocalRepairLocation>(
    'SELECT * FROM repair_locations WHERE id = ?',
    [id]
  );
  if (!ex) return null;

  const now = nowISO();
  const orgId = ex.organization_id;

  if (patch.is_default) {
    const others = await powerSyncService.query<LocalRepairLocation>({
      sql: 'SELECT * FROM repair_locations WHERE organization_id = ? AND id != ? AND is_default = 1',
      params: [orgId, id]
    });
    for (const o of others) {
      await powerSyncService.transaction(async (tx) => {
await tx.execute(
          'UPDATE repair_locations SET is_default = 0, updated_at = ? WHERE id = ?',
          [now, o.id]
        );
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
  } as any;
await powerSyncService.transaction(async (tx) => {
    const keys = Object.keys(updated).filter(k => k !== 'id' && k !== 'created_at');
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (updated as any)[k]);
    
    await tx.execute(
      `UPDATE repair_locations SET ${setClause}, updated_at = ? WHERE id = ?`,
      [...values, now, id]
    );
  });
  
  console.log(`[LocalRepair] ⚡ Updated location ${id} via PowerSync`);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairLocations?.())); } catch {}
  return updated;
}

/**
 * حذف موقع إصلاح (soft delete)
 */
export async function softDeleteLocalRepairLocation(id: string): Promise<boolean> {
  const ex = await powerSyncService.get<LocalRepairLocation>(
    'SELECT * FROM repair_locations WHERE id = ?',
    [id]
  );
  if (!ex) return false;

  const now = nowISO();
await powerSyncService.transaction(async (tx) => {
    await tx.execute(
      'UPDATE repair_locations SET is_active = 0, is_default = 0, updated_at = ? WHERE id = ?',
      [now, id]
    );
  });

  console.log(`[LocalRepair] ⚡ Soft deleted location ${id} via Delta Sync`);
  try { void import('@/api/syncRepairs').then(m => (m.syncPendingRepairLocations?.())); } catch {}
  return true;
}

/**
 * حساب ترتيب الطابور
 */
export async function computeLocalQueueInfo(orderId: string): Promise<{ queue_position: number; total_in_queue: number } | null> {
  const cur = await powerSyncService.get<LocalRepairOrder>(
    'SELECT * FROM repair_orders WHERE id = ?',
    [orderId]
  );
  if (!cur || !cur.repair_location_id) return null;

  const activeStatuses = ['قيد الانتظار', 'جاري التصليح'];

  const all = await powerSyncService.query<LocalRepairOrder>({
    sql: `SELECT * FROM repair_orders
     WHERE organization_id = ?
     AND repair_location_id = ?
     AND status IN ('${activeStatuses.join("','")}')`,
    params: [cur.organization_id, cur.repair_location_id]
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
  const ex = await powerSyncService.get<LocalRepairOrder>(
    'SELECT * FROM repair_orders WHERE id = ?',
    [id]
  );
  if (!ex) return false;

  const now = nowISO();
await powerSyncService.transaction(async (tx) => {
    await tx.execute('DELETE FROM repair_orders WHERE id = ?', [id]);
  });

  console.log(`[LocalRepair] ⚡ Marked repair ${id} for deletion via PowerSync`);
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
      // ⚡ v3.0: تم إزالة customer_name_lower - غير موجود في PowerSync schema
      device_type: order.device_type,
      // ⚡ v3.0: تم إزالة device_type_lower - غير موجود في PowerSync schema
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
      updated_at: order.updated_at || now
      // ⚠️ PowerSync يدير المزامنة تلقائياً - لا حاجة لحقول synced
    } as any;

    // ⚡ استخدام PowerSync مباشرة للحفظ من Supabase
    await powerSyncService.transaction(async (tx) => {
const keys = Object.keys(mappedOrder).filter(k => k !== 'id');
      const values = keys.map(k => (mappedOrder as any)[k]);
      const placeholders = keys.map(() => '?').join(', ');
      
      // Try UPDATE first, then INSERT if no rows affected
      const updateKeys = keys.filter(k => k !== 'created_at' && k !== 'updated_at');
      const updateSet = updateKeys.map(k => `${k} = ?`).join(', ');
      const updateValues = updateKeys.map(k => (mappedOrder as any)[k]);
      
      const updateResult = await tx.execute(
        `UPDATE repair_orders SET ${updateSet}, updated_at = ? WHERE id = ?`,
        [...updateValues, mappedOrder.updated_at || now, mappedOrder.id]
      );

      // If no rows updated, INSERT
      if (!updateResult || (Array.isArray(updateResult) && updateResult.length === 0)) {
        await tx.execute(
          `INSERT INTO repair_orders (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
          [mappedOrder.id, ...values, mappedOrder.created_at || now, mappedOrder.updated_at || now]
        );
      }
    });
  }

  console.log(`[LocalRepair] ⚡ Saved ${orders.length} remote repair orders`);
};
