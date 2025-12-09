/**
 * ⚡ Repairs Sync Service - نظام Delta Sync الموحد
 *
 * تم تبسيط هذا الملف - المزامنة للسيرفر تحدث تلقائياً عبر BatchSender
 */

import { supabase } from '@/lib/supabase';
import type { LocalRepairOrder, LocalRepairStatusHistory, LocalRepairLocation, LocalRepairImage } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';

const getOrgId = (): string | null => {
  try {
    return (
      localStorage.getItem('currentOrganizationId') ||
      localStorage.getItem('bazaar_organization_id') ||
      null
    );
  } catch { return null; }
};

/**
 * ⚡ جلب مواقع الإصلاح من السيرفر
 */
async function pullRepairLocations(): Promise<number> {
  const orgId = getOrgId();
  if (!orgId) return 0;

  try {
    console.log('[pullRepairLocations] ⚡ جلب مواقع الإصلاح...');

    const { data, error } = await supabase
      .from('repair_locations')
      .select('*')
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: true });

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
        is_default: r.is_default,
        is_active: r.is_active,
        created_at: r.created_at,
        updated_at: r.updated_at || r.created_at,
        synced: true,
        pendingOperation: undefined,
      } as any;

      await deltaWriteService.saveFromServer('repair_locations', rec);
      upserts++;
    }

    console.log(`[pullRepairLocations] ✅ تم جلب ${upserts} موقع`);
    return upserts;
  } catch (error) {
    console.error('[pullRepairLocations] ❌ خطأ:', error);
    return 0;
  }
}

/**
 * ⚡ جلب طلبات الإصلاح من السيرفر
 */
async function pullRepairOrders(): Promise<number> {
  const orgId = getOrgId();
  if (!orgId) return 0;

  try {
    console.log('[pullRepairOrders] ⚡ جلب طلبات الإصلاح...');

    const { data, error } = await supabase
      .from('repair_orders')
      .select('*')
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(500);

    if (error || !Array.isArray(data)) return 0;

    let upserts = 0;
    for (const r of data) {
      const rec: LocalRepairOrder = {
        id: r.id,
        organization_id: r.organization_id,
        customer_name: r.customer_name,
        customer_phone: r.customer_phone,
        // ⚡ v3.0: تم إزالة customer_name_lower - غير موجود في PowerSync schema
        device_type: r.device_type,
        // ⚡ v3.0: تم إزالة device_type_lower - غير موجود في PowerSync schema
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
        notes: r.notes,
        created_at: r.created_at,
        updated_at: r.updated_at || r.created_at,
        synced: true,
        pendingOperation: undefined,
      } as any;

      await deltaWriteService.saveFromServer('repair_orders', rec);
      upserts++;
    }

    console.log(`[pullRepairOrders] ✅ تم جلب ${upserts} طلب إصلاح`);
    return upserts;
  } catch (error) {
    console.error('[pullRepairOrders] ❌ خطأ:', error);
    return 0;
  }
}

/**
 * ⚡ جلب تاريخ حالات الإصلاح من السيرفر
 */
async function pullRepairStatusHistory(): Promise<number> {
  const orgId = getOrgId();
  if (!orgId) return 0;

  try {
    console.log('[pullRepairStatusHistory] ⚡ جلب تاريخ الحالات...');

    // جلب طلبات الإصلاح المحلية
    const orders = await deltaWriteService.getAll<LocalRepairOrder>('repair_orders', orgId);

    let upserts = 0;
    for (const o of orders.slice(0, 300)) {
      const { data, error } = await supabase
        .from('repair_status_history')
        .select('*')
        .eq('repair_order_id', o.id)
        .order('created_at', { ascending: true });

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

        await deltaWriteService.saveFromServer('repair_status_history', rec);
        upserts++;
      }
    }

    console.log(`[pullRepairStatusHistory] ✅ تم جلب ${upserts} سجل حالة`);
    return upserts;
  } catch (error) {
    console.error('[pullRepairStatusHistory] ❌ خطأ:', error);
    return 0;
  }
}

/**
 * ⚡ جلب صور الإصلاح من السيرفر
 */
async function pullRepairImages(): Promise<number> {
  const orgId = getOrgId();
  if (!orgId) return 0;

  try {
    console.log('[pullRepairImages] ⚡ جلب صور الإصلاح...');

    const orders = await deltaWriteService.getAll<LocalRepairOrder>('repair_orders', orgId);

    let upserts = 0;
    for (const o of orders.slice(0, 300)) {
      const { data, error } = await supabase
        .from('repair_images')
        .select('*')
        .eq('repair_order_id', o.id)
        .order('created_at', { ascending: true });

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

        await deltaWriteService.saveFromServer('repair_images', rec);
        upserts++;
      }
    }

    console.log(`[pullRepairImages] ✅ تم جلب ${upserts} صورة`);
    return upserts;
  } catch (error) {
    console.error('[pullRepairImages] ❌ خطأ:', error);
    return 0;
  }
}

/**
 * ⚡ مزامنة الإصلاحات المعلقة
 * ملاحظة: BatchSender يتعامل مع الإرسال للسيرفر تلقائياً
 */
export async function syncPendingRepairs() {
  console.log('[syncPendingRepairs] ⚡ Delta Sync - المزامنة تلقائية عبر BatchSender');

  try {
    // جلب البيانات من السيرفر فقط
    await pullRepairLocations();
    await pullRepairOrders();
    await pullRepairStatusHistory();
    await pullRepairImages();

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * ⚡ مزامنة صور الإصلاح
 * ملاحظة: BatchSender يتعامل مع الإرسال للسيرفر تلقائياً
 */
export async function syncPendingRepairImages() {
  console.log('[syncPendingRepairImages] ⚡ Delta Sync - المزامنة تلقائية عبر BatchSender');
  await pullRepairImages();
  return { success: 0, failed: 0 };
}

/**
 * ⚡ مزامنة مواقع الإصلاح
 * ملاحظة: BatchSender يتعامل مع الإرسال للسيرفر تلقائياً
 */
export async function syncPendingRepairLocations() {
  console.log('[syncPendingRepairLocations] ⚡ Delta Sync - المزامنة تلقائية عبر BatchSender');
  await pullRepairLocations();
  return { success: 0, failed: 0 };
}

/**
 * ⚡ جلب جميع بيانات الإصلاح من السيرفر
 */
export async function fetchRepairsFromServer(organizationId?: string): Promise<number> {
  const orgId = organizationId || getOrgId();
  if (!orgId) return 0;

  console.log('[fetchRepairsFromServer] ⚡ جلب جميع بيانات الإصلاح...');

  let total = 0;
  total += await pullRepairLocations();
  total += await pullRepairOrders();
  total += await pullRepairStatusHistory();
  total += await pullRepairImages();

  console.log(`[fetchRepairsFromServer] ✅ تم جلب ${total} سجل`);
  return total;
}

/**
 * ⚡ مزامنة كاملة للإصلاحات (تنزيل + رفع)
 * تنزيل: جلب البيانات من السيرفر
 * رفع: BatchSender يتعامل مع هذا تلقائياً
 */
export async function fullRepairSync(organizationId?: string): Promise<{
  pulled: number;
  success: boolean;
  error?: string;
}> {
  try {
    console.log('[fullRepairSync] ⚡ بدء المزامنة الكاملة للإصلاحات...');

    // 1. تنزيل البيانات من السيرفر
    const pulled = await fetchRepairsFromServer(organizationId);

    // 2. BatchSender يتعامل مع رفع التغييرات المحلية تلقائياً
    console.log('[fullRepairSync] ⚡ البيانات المحلية المعلقة ستُزامن تلقائياً عبر BatchSender');

    console.log(`[fullRepairSync] ✅ اكتملت المزامنة - تم جلب ${pulled} سجل`);

    return {
      pulled,
      success: true,
    };
  } catch (error) {
    console.error('[fullRepairSync] ❌ خطأ في المزامنة:', error);
    return {
      pulled: 0,
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    };
  }
}

/**
 * ⚡ مزامنة موقع إصلاح واحد من السيرفر
 */
export async function syncSingleRepairLocationFromServer(
  locationId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[syncSingleRepairLocationFromServer] ⚡ جلب الموقع ${locationId}...`);

    const { data, error } = await supabase
      .from('repair_locations')
      .select('*')
      .eq('id', locationId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      console.error('[syncSingleRepairLocationFromServer] ❌ خطأ:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'الموقع غير موجود' };
    }

    const rec: LocalRepairLocation = {
      id: data.id,
      organization_id: data.organization_id,
      name: data.name,
      description: data.description,
      address: data.address,
      phone: data.phone,
      is_default: data.is_default,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at || data.created_at,
      synced: true,
      pendingOperation: undefined,
    } as any;

    await deltaWriteService.saveFromServer('repair_locations', rec);

    console.log(`[syncSingleRepairLocationFromServer] ✅ تم حفظ الموقع ${locationId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[syncSingleRepairLocationFromServer] ❌ خطأ:', error);
    return { success: false, error: error.message || 'حدث خطأ غير متوقع' };
  }
}

/**
 * ⚡ مزامنة طلب إصلاح واحد من السيرفر
 */
export async function syncSingleRepairOrderFromServer(
  orderId: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[syncSingleRepairOrderFromServer] ⚡ جلب الطلب ${orderId}...`);

    const { data, error } = await supabase
      .from('repair_orders')
      .select('*')
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      console.error('[syncSingleRepairOrderFromServer] ❌ خطأ:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'الطلب غير موجود' };
    }

    const rec: LocalRepairOrder = {
      id: data.id,
      organization_id: data.organization_id,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      // ⚡ v3.0: تم إزالة customer_name_lower - غير موجود في PowerSync schema
      device_type: data.device_type,
      // ⚡ v3.0: تم إزالة device_type_lower - غير موجود في PowerSync schema
      repair_location_id: data.repair_location_id,
      custom_location: data.custom_location,
      issue_description: data.issue_description,
      status: data.status,
      total_price: data.total_price,
      paid_amount: data.paid_amount || 0,
      price_to_be_determined_later: data.price_to_be_determined_later,
      received_by: data.received_by,
      order_number: data.order_number,
      repair_tracking_code: data.repair_tracking_code,
      payment_method: data.payment_method,
      notes: data.notes,
      created_at: data.created_at,
      updated_at: data.updated_at || data.created_at,
      synced: true,
      pendingOperation: undefined,
    } as any;

    await deltaWriteService.saveFromServer('repair_orders', rec);

    console.log(`[syncSingleRepairOrderFromServer] ✅ تم حفظ الطلب ${orderId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[syncSingleRepairOrderFromServer] ❌ خطأ:', error);
    return { success: false, error: error.message || 'حدث خطأ غير متوقع' };
  }
}
