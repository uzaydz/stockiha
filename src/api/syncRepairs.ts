import { supabase } from '@/lib/supabase';
import { inventoryDB, type LocalRepairOrder, type LocalRepairStatusHistory, type LocalRepairLocation, type LocalRepairImage } from '@/database/localDb';

const getOrgId = (): string | null => {
  try {
    return (
      localStorage.getItem('currentOrganizationId') ||
      localStorage.getItem('bazaar_organization_id') ||
      null
    );
  } catch { return null; }
};

const mimeToExt = (mime: string): string => {
  if (!mime) return 'bin';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'bin';
};

async function pushRepairLocations(): Promise<{ success: number; failed: number }> {
  const orgId = getOrgId();
  if (!orgId) return { success: 0, failed: 0 };
  const list = await inventoryDB.repairLocations
    .where('organization_id').equals(orgId)
    .and((l) => l.synced === false)
    .toArray();
  let success = 0, failed = 0;
  for (const loc of list) {
    try {
      const op = loc.pendingOperation || 'update';
      if (op === 'create') {
        const { error } = await supabase.from('repair_locations').insert({
          id: loc.id,
          organization_id: loc.organization_id,
          name: loc.name,
          description: loc.description,
          address: loc.address,
          phone: loc.phone,
          email: loc.email,
          is_default: loc.is_default,
          is_active: loc.is_active,
          created_at: loc.created_at,
          updated_at: loc.updated_at,
        } as any);
        if (error) throw error;
        await inventoryDB.repairLocations.put({ ...loc, synced: true, pendingOperation: undefined });
        success++;
      } else if (op === 'update') {
        const { error } = await supabase.from('repair_locations').update({
          name: loc.name,
          description: loc.description,
          address: loc.address,
          phone: loc.phone,
          email: loc.email,
          is_default: loc.is_default,
          is_active: loc.is_active,
          updated_at: loc.updated_at,
        } as any).eq('id', loc.id);
        if (error) throw error;
        await inventoryDB.repairLocations.put({ ...loc, synced: true, pendingOperation: undefined });
        success++;
      } else if (op === 'delete') {
        const { error } = await supabase.from('repair_locations').delete().eq('id', loc.id);
        if (error) throw error;
        await inventoryDB.repairLocations.delete(loc.id);
        success++;
      }
    } catch {
      failed++;
    }
  }
  return { success, failed };
}

async function pushRepairOrders(): Promise<{ success: number; failed: number }> {
  const orgId = getOrgId();
  if (!orgId) return { success: 0, failed: 0 };
  const list = await inventoryDB.repairOrders
    .where('organization_id').equals(orgId)
    .and((o) => o.synced === false)
    .toArray();
  let success = 0, failed = 0;
  for (const o of list) {
    try {
      const op = o.pendingOperation || 'update';
      if (op === 'create') {
        const { error } = await supabase.from('repair_orders').insert({
          id: o.id,
          organization_id: o.organization_id,
          customer_name: o.customer_name,
          customer_phone: o.customer_phone,
          device_type: o.device_type,
          repair_location_id: o.repair_location_id,
          custom_location: o.custom_location,
          issue_description: o.issue_description,
          status: o.status,
          total_price: o.total_price,
          paid_amount: o.paid_amount,
          price_to_be_determined_later: o.price_to_be_determined_later,
          received_by: o.received_by,
          order_number: o.order_number,
          repair_tracking_code: o.repair_tracking_code,
          payment_method: o.payment_method,
          repair_notes: o.repair_notes,
          created_at: o.created_at,
          updated_at: o.updated_at,
        } as any);
        if (error) throw error;
        await inventoryDB.repairOrders.put({ ...o, synced: true, pendingOperation: undefined });
        success++;
      } else if (op === 'update') {
        const { error } = await supabase.from('repair_orders').update({
          customer_name: o.customer_name,
          customer_phone: o.customer_phone,
          device_type: o.device_type,
          repair_location_id: o.repair_location_id,
          custom_location: o.custom_location,
          issue_description: o.issue_description,
          status: o.status,
          total_price: o.total_price,
          paid_amount: o.paid_amount,
          price_to_be_determined_later: o.price_to_be_determined_later,
          received_by: o.received_by,
          order_number: o.order_number,
          repair_tracking_code: o.repair_tracking_code,
          payment_method: o.payment_method,
          repair_notes: o.repair_notes,
          updated_at: o.updated_at,
        } as any).eq('id', o.id);
        if (error) throw error;
        await inventoryDB.repairOrders.put({ ...o, synced: true, pendingOperation: undefined });
        success++;
      } else if (op === 'delete') {
        await supabase.from('repair_images').delete().eq('repair_order_id', o.id);
        await supabase.from('repair_status_history').delete().eq('repair_order_id', o.id);
        const { error } = await supabase.from('repair_orders').delete().eq('id', o.id);
        if (error) throw error;
        await inventoryDB.repairOrders.delete(o.id);
        success++;
      }
    } catch {
      failed++;
    }
  }
  return { success, failed };
}

async function pushRepairStatusHistory(): Promise<{ success: number; failed: number }> {
  const orgId = getOrgId();
  if (!orgId) return { success: 0, failed: 0 };
  const list = await inventoryDB.repairStatusHistory
    .filter(h => !h.synced)
    .toArray();
  let success = 0, failed = 0;
  for (const h of list) {
    try {
      const op = h.pendingOperation || 'create';
      if (op === 'create') {
        const { error } = await supabase.from('repair_status_history').insert({
          id: h.id,
          repair_order_id: h.repair_order_id,
          status: h.status,
          notes: h.notes,
          created_by: h.created_by,
          created_at: h.created_at,
        } as any);
        if (error) throw error;
        await inventoryDB.repairStatusHistory.put({ ...h, synced: true, pendingOperation: undefined });
        success++;
      } else if (op === 'delete') {
        const { error } = await supabase.from('repair_status_history').delete().eq('id', h.id);
        if (error) throw error;
        await inventoryDB.repairStatusHistory.delete(h.id);
        success++;
      }
    } catch {
      failed++;
    }
  }
  return { success, failed };
}

async function pushRepairImages(): Promise<{ success: number; failed: number }> {
  const orgId = getOrgId();
  if (!orgId) return { success: 0, failed: 0 };
  // Ensure orders are synced first to satisfy FK
  const list = await inventoryDB.repairImages
    .filter(img => !img.synced)
    .toArray();
  let success = 0, failed = 0;
  for (const img of list) {
    try {
      // Find attached blob file
      const blobRec = await inventoryDB.repairImageFiles.where('repair_image_id').equals(img.id).and((r) => r.uploaded === false).first();
      let storage_path = img.storage_path || null;
      let image_url = img.image_url || null;
      if (blobRec && (blobRec as any).blob) {
        const ext = mimeToExt(blobRec.mime);
        const filePath = `repair_images/${img.repair_order_id}/${img.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('repair_images')
          .upload(filePath, blobRec.blob, { upsert: true, cacheControl: '31536000' });
        if (uploadErr && !String(uploadErr.message || '').includes('already exists')) {
          throw uploadErr;
        }
        storage_path = filePath;
        const { data: urlData } = await supabase.storage.from('repair_images').getPublicUrl(filePath);
        image_url = (urlData as any)?.publicUrl || image_url;
        await inventoryDB.repairImageFiles.put({ ...blobRec, uploaded: true });
      }
      // Upsert DB row
      // Try insert first, then update on conflict
      const insertRes = await supabase.from('repair_images').insert({
        id: img.id,
        repair_order_id: img.repair_order_id,
        image_url,
        image_type: img.image_type,
        description: img.description,
        created_at: img.created_at,
      } as any);
      if (insertRes.error) {
        const { error: updErr } = await supabase.from('repair_images').update({
          image_url,
          image_type: img.image_type,
          description: img.description,
        } as any).eq('id', img.id);
        if (updErr) throw updErr;
      }
      await inventoryDB.repairImages.put({ ...img, image_url, storage_path, synced: true, pendingOperation: undefined });
      success++;
    } catch {
      failed++;
    }
  }
  return { success, failed };
}

// Pullers
async function pullRepairLocations(): Promise<number> {
  const orgId = getOrgId();
  if (!orgId) return 0;
  // compute since
  const all = await inventoryDB.repairLocations.where('organization_id').equals(orgId).toArray();
  const since = all.reduce((max, x) => (x.updated_at && x.updated_at > max ? x.updated_at : max), '');
  const query = supabase.from('repair_locations').select('*').eq('organization_id', orgId).order('updated_at', { ascending: true });
  const { data, error } = since ? await query.gte('updated_at', since) : await query;
  if (error || !Array.isArray(data)) return 0;
  let upserts = 0;
  for (const r of data) {
    const rec: LocalRepairLocation = {
      id: r.id,
      organization_id: r.organization_id,
      name: r.name,
      description: r.description,
      address: r.address,
      phone: r.phone,
      email: r.email,
      is_default: r.is_default,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at || r.created_at,
      synced: true,
      pendingOperation: undefined,
    } as any;
    await inventoryDB.repairLocations.put(rec);
    upserts++;
  }
  return upserts;
}

async function pullRepairOrders(): Promise<number> {
  const orgId = getOrgId();
  if (!orgId) return 0;
  const all = await inventoryDB.repairOrders.where('organization_id').equals(orgId).toArray();
  const since = all.reduce((max, x) => (x.updated_at && x.updated_at > max ? x.updated_at : max), '');
  const query = supabase.from('repair_orders').select('*').eq('organization_id', orgId).order('updated_at', { ascending: true });
  const { data, error } = since ? await query.gte('updated_at', since) : await query;
  if (error || !Array.isArray(data)) return 0;
  let upserts = 0;
  for (const r of data) {
    const rec: LocalRepairOrder = {
      id: r.id,
      organization_id: r.organization_id,
      customer_name: r.customer_name,
      customer_phone: r.customer_phone,
      customer_name_lower: r.customer_name?.toLowerCase?.() || r.customer_name,
      device_type: r.device_type,
      device_type_lower: r.device_type?.toLowerCase?.() || r.device_type,
      repair_location_id: r.repair_location_id,
      custom_location: r.custom_location,
      issue_description: r.issue_description,
      status: r.status,
      total_price: r.total_price,
      paid_amount: r.paid_amount || 0,
      price_to_be_determined_later: r.price_to_be_determined_later,
      received_by: r.received_by,
      order_number: r.order_number,
      repair_tracking_code: r.repair_tracking_code,
      payment_method: r.payment_method,
      repair_notes: r.repair_notes,
      created_at: r.created_at,
      updated_at: r.updated_at || r.created_at,
      synced: true,
      pendingOperation: undefined,
    } as any;
    await inventoryDB.repairOrders.put(rec);
    upserts++;
  }
  return upserts;
}

async function pullRepairStatusHistory(): Promise<number> {
  const orgId = getOrgId();
  if (!orgId) return 0;
  // We don't have organization_id in history table; pull by orders updated recently
  const orders = await inventoryDB.repairOrders.where('organization_id').equals(orgId).toArray();
  let upserts = 0;
  for (const o of orders.slice(0, 300)) { // cap to avoid heavy pulls
    const localMax = (await inventoryDB.repairStatusHistory.where('repair_order_id').equals(o.id).toArray())
      .reduce((m, x) => (x.created_at && x.created_at > m ? x.created_at : m), '');
    const query = supabase.from('repair_status_history').select('*').eq('repair_order_id', o.id).order('created_at', { ascending: true });
    const { data, error } = localMax ? await query.gte('created_at', localMax) : await query;
    if (error || !Array.isArray(data)) continue;
    for (const r of data) {
      const rec: LocalRepairStatusHistory = {
        id: r.id,
        repair_order_id: r.repair_order_id,
        status: r.status,
        notes: r.notes,
        created_by: r.created_by,
        created_at: r.created_at,
        synced: true,
        pendingOperation: undefined,
      } as any;
      await inventoryDB.repairStatusHistory.put(rec);
      upserts++;
    }
  }
  return upserts;
}

async function pullRepairImages(): Promise<number> {
  const orgId = getOrgId();
  if (!orgId) return 0;
  const orders = await inventoryDB.repairOrders.where('organization_id').equals(orgId).toArray();
  let upserts = 0;
  for (const o of orders.slice(0, 300)) {
    const localMax = (await inventoryDB.repairImages.where('repair_order_id').equals(o.id).toArray())
      .reduce((m, x) => (x.created_at && x.created_at > m ? x.created_at : m), '');
    const query = supabase.from('repair_images').select('*').eq('repair_order_id', o.id).order('created_at', { ascending: true });
    const { data, error } = localMax ? await query.gte('created_at', localMax) : await query;
    if (error || !Array.isArray(data)) continue;
    for (const r of data) {
      const rec: LocalRepairImage = {
        id: r.id,
        repair_order_id: r.repair_order_id,
        image_type: r.image_type || 'before',
        description: r.description,
        created_at: r.created_at,
        image_url: r.image_url,
        storage_path: null,
        synced: true,
        pendingOperation: undefined,
      } as any;
      await inventoryDB.repairImages.put(rec);
      upserts++;
    }
  }
  return upserts;
}

export async function syncPendingRepairs() {
  try {
    // Push order: locations -> orders -> history -> images
    await pushRepairLocations();
    await pushRepairOrders();
    await pushRepairStatusHistory();
    await pushRepairImages();
    // Pull back recent changes
    await pullRepairLocations();
    await pullRepairOrders();
    await pullRepairStatusHistory();
    await pullRepairImages();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function syncPendingRepairImages() {
  const res = await pushRepairImages();
  await pullRepairImages();
  return res;
}

export async function syncPendingRepairLocations() {
  const res = await pushRepairLocations();
  await pullRepairLocations();
  return res;
}
