/**
 * 📦 Inventory Batch Service
 *
 * خدمة إدارة دفعات المخزون (FIFO)
 * تتعامل مع إنشاء وتحديث وجلب دفعات المخزون
 */

import { supabase } from '@/lib/supabase';

// =====================================================
// الأنواع
// =====================================================

export interface InventoryBatch {
  id: string;
  product_id: string;
  organization_id: string;
  batch_number: string;
  supplier_id?: string;
  purchase_date?: string;
  purchase_price: number;
  selling_price: number;
  quantity_received: number;
  quantity_remaining: number;
  expiry_date?: string;
  location?: string;
  notes?: string;
  cost_per_unit?: number;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  // حقول العلاقات
  color_id?: string;
  size_id?: string;
  variant_type?: 'simple' | 'color' | 'size';
  variant_display_name?: string;
  // حقول محسوبة
  days_until_expiry?: number;
  usage_percentage?: number;
  total_value?: number;
}

export interface CreateBatchInput {
  product_id: string;
  organization_id: string;
  batch_number?: string;
  supplier_id?: string;
  purchase_price: number;
  selling_price: number;
  quantity_received: number;
  expiry_date?: string;
  location?: string;
  notes?: string;
  color_id?: string;
  size_id?: string;
}

export interface UpdateBatchInput {
  quantity_remaining?: number;
  selling_price?: number;
  expiry_date?: string;
  location?: string;
  notes?: string;
  is_active?: boolean;
}

export interface BatchFilters {
  product_id?: string;
  organization_id: string;
  status?: 'all' | 'active' | 'expired' | 'low' | 'empty';
  expiring_within_days?: number;
  supplier_id?: string;
  has_expiry?: boolean;
}

export interface BatchSummary {
  total_batches: number;
  active_batches: number;
  expired_batches: number;
  expiring_soon: number;
  empty_batches: number;
  total_quantity: number;
  total_value: number;
}

export interface BatchConsumption {
  batch_id: string;
  quantity_consumed: number;
  order_id?: string;
  reason: 'sale' | 'return' | 'adjustment' | 'loss' | 'transfer';
  notes?: string;
}

// =====================================================
// دوال الجلب
// =====================================================

/**
 * جلب دفعات منتج معين
 */
export async function getProductBatches(
  productId: string,
  organizationId: string,
  options?: {
    includeEmpty?: boolean;
    sortByFIFO?: boolean;
  }
): Promise<InventoryBatch[]> {
  let query = supabase
    .from('inventory_batches')
    .select('*')
    .eq('product_id', productId)
    .eq('organization_id', organizationId);

  if (!options?.includeEmpty) {
    query = query.gt('quantity_remaining', 0);
  }

  if (options?.sortByFIFO) {
    // FIFO: الأقدم أولاً، ثم الأقرب انتهاءً
    query = query
      .order('expiry_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error fetching product batches:', error);
    throw new Error(`فشل جلب دفعات المنتج: ${error.message}`);
  }

  return (data || []).map(enrichBatchData);
}

/**
 * جلب جميع الدفعات مع الفلترة
 */
export async function getBatches(filters: BatchFilters): Promise<InventoryBatch[]> {
  let query = supabase
    .from('inventory_batches')
    .select(`
      *,
      products:product_id (name, sku, thumbnail_image),
      suppliers:supplier_id (name)
    `)
    .eq('organization_id', filters.organization_id);

  if (filters.product_id) {
    query = query.eq('product_id', filters.product_id);
  }

  if (filters.supplier_id) {
    query = query.eq('supplier_id', filters.supplier_id);
  }

  if (filters.has_expiry === true) {
    query = query.not('expiry_date', 'is', null);
  } else if (filters.has_expiry === false) {
    query = query.is('expiry_date', null);
  }

  // فلترة حسب الحالة
  const now = new Date().toISOString();
  switch (filters.status) {
    case 'active':
      query = query.gt('quantity_remaining', 0).eq('is_active', true);
      break;
    case 'expired':
      query = query.lt('expiry_date', now).gt('quantity_remaining', 0);
      break;
    case 'low':
      // الدفعات التي استهلك منها أكثر من 80%
      query = query.gt('quantity_remaining', 0);
      break;
    case 'empty':
      query = query.eq('quantity_remaining', 0);
      break;
  }

  if (filters.expiring_within_days) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filters.expiring_within_days);
    query = query
      .gte('expiry_date', now)
      .lte('expiry_date', futureDate.toISOString());
  }

  query = query.order('expiry_date', { ascending: true, nullsFirst: false });

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error fetching batches:', error);
    throw new Error(`فشل جلب الدفعات: ${error.message}`);
  }

  let batches = (data || []).map(enrichBatchData);

  // فلترة إضافية للـ low stock (لا يمكن عملها في SQL بسهولة)
  if (filters.status === 'low') {
    batches = batches.filter(b => {
      const usage = ((b.quantity_received - b.quantity_remaining) / b.quantity_received) * 100;
      return usage >= 80 && b.quantity_remaining > 0;
    });
  }

  return batches;
}

/**
 * جلب دفعة واحدة
 */
export async function getBatch(batchId: string): Promise<InventoryBatch | null> {
  const { data, error } = await supabase
    .from('inventory_batches')
    .select(`
      *,
      products:product_id (name, sku, thumbnail_image),
      suppliers:supplier_id (name)
    `)
    .eq('id', batchId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('❌ Error fetching batch:', error);
    throw new Error(`فشل جلب الدفعة: ${error.message}`);
  }

  return enrichBatchData(data);
}

/**
 * جلب ملخص الدفعات
 */
export async function getBatchSummary(organizationId: string): Promise<BatchSummary> {
  const { data: batches, error } = await supabase
    .from('inventory_batches')
    .select('quantity_received, quantity_remaining, selling_price, expiry_date, is_active')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('❌ Error fetching batch summary:', error);
    throw new Error(`فشل جلب ملخص الدفعات: ${error.message}`);
  }

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const summary: BatchSummary = {
    total_batches: batches?.length || 0,
    active_batches: 0,
    expired_batches: 0,
    expiring_soon: 0,
    empty_batches: 0,
    total_quantity: 0,
    total_value: 0,
  };

  batches?.forEach(batch => {
    if (batch.quantity_remaining === 0) {
      summary.empty_batches++;
    } else {
      summary.active_batches++;
      summary.total_quantity += batch.quantity_remaining;
      summary.total_value += batch.quantity_remaining * batch.selling_price;

      if (batch.expiry_date) {
        const expiryDate = new Date(batch.expiry_date);
        if (expiryDate < now) {
          summary.expired_batches++;
        } else if (expiryDate <= thirtyDaysFromNow) {
          summary.expiring_soon++;
        }
      }
    }
  });

  return summary;
}

// =====================================================
// دوال الإنشاء والتحديث
// =====================================================

/**
 * إنشاء دفعة جديدة
 */
export async function createBatch(input: CreateBatchInput): Promise<InventoryBatch> {
  const { data: { user } } = await supabase.auth.getUser();

  // توليد رقم دفعة إذا لم يتم تقديمه
  const batchNumber = input.batch_number || generateBatchNumber();

  const { data, error } = await supabase
    .from('inventory_batches')
    .insert({
      ...input,
      batch_number: batchNumber,
      quantity_remaining: input.quantity_received,
      cost_per_unit: input.purchase_price,
      is_active: true,
      created_by: user?.id,
      variant_type: input.color_id || input.size_id ? (input.size_id ? 'size' : 'color') : 'simple',
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating batch:', error);
    throw new Error(`فشل إنشاء الدفعة: ${error.message}`);
  }

  return enrichBatchData(data);
}

/**
 * إنشاء عدة دفعات
 */
export async function createBatches(inputs: CreateBatchInput[]): Promise<InventoryBatch[]> {
  const { data: { user } } = await supabase.auth.getUser();

  const batchesToInsert = inputs.map(input => ({
    ...input,
    batch_number: input.batch_number || generateBatchNumber(),
    quantity_remaining: input.quantity_received,
    cost_per_unit: input.purchase_price,
    is_active: true,
    created_by: user?.id,
    variant_type: input.color_id || input.size_id ? (input.size_id ? 'size' : 'color') : 'simple',
  }));

  const { data, error } = await supabase
    .from('inventory_batches')
    .insert(batchesToInsert)
    .select();

  if (error) {
    console.error('❌ Error creating batches:', error);
    throw new Error(`فشل إنشاء الدفعات: ${error.message}`);
  }

  return (data || []).map(enrichBatchData);
}

/**
 * تحديث دفعة
 */
export async function updateBatch(batchId: string, updates: UpdateBatchInput): Promise<InventoryBatch> {
  const { data, error } = await supabase
    .from('inventory_batches')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId)
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating batch:', error);
    throw new Error(`فشل تحديث الدفعة: ${error.message}`);
  }

  return enrichBatchData(data);
}

/**
 * استهلاك كمية من الدفعات (FIFO)
 */
export async function consumeFromBatches(
  productId: string,
  organizationId: string,
  quantityNeeded: number,
  consumption: Omit<BatchConsumption, 'batch_id' | 'quantity_consumed'>
): Promise<{ consumed: BatchConsumption[]; remaining: number }> {
  // جلب الدفعات المتاحة بترتيب FIFO
  const batches = await getProductBatches(productId, organizationId, {
    includeEmpty: false,
    sortByFIFO: true,
  });

  const consumed: BatchConsumption[] = [];
  let remaining = quantityNeeded;

  for (const batch of batches) {
    if (remaining <= 0) break;

    const available = batch.quantity_remaining;
    const toConsume = Math.min(available, remaining);

    if (toConsume > 0) {
      // تحديث الدفعة
      await updateBatch(batch.id, {
        quantity_remaining: available - toConsume,
      });

      consumed.push({
        batch_id: batch.id,
        quantity_consumed: toConsume,
        ...consumption,
      });

      remaining -= toConsume;
    }
  }

  return { consumed, remaining };
}

/**
 * إرجاع كمية للدفعة
 */
export async function returnToBatch(
  batchId: string,
  quantityToReturn: number,
  notes?: string
): Promise<InventoryBatch> {
  const batch = await getBatch(batchId);
  if (!batch) {
    throw new Error('الدفعة غير موجودة');
  }

  const newQuantity = batch.quantity_remaining + quantityToReturn;
  if (newQuantity > batch.quantity_received) {
    throw new Error('الكمية المرجعة تتجاوز الكمية الأصلية');
  }

  return updateBatch(batchId, {
    quantity_remaining: newQuantity,
    notes: notes ? `${batch.notes || ''}\n[إرجاع]: ${notes}` : batch.notes,
  });
}

// =====================================================
// دوال تنبيهات الصلاحية
// =====================================================

/**
 * جلب الدفعات التي ستنتهي صلاحيتها قريباً
 */
export async function getExpiringBatches(
  organizationId: string,
  daysAhead: number = 30
): Promise<InventoryBatch[]> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('inventory_batches')
    .select(`
      *,
      products:product_id (name, sku, thumbnail_image)
    `)
    .eq('organization_id', organizationId)
    .gt('quantity_remaining', 0)
    .gte('expiry_date', now.toISOString())
    .lte('expiry_date', futureDate.toISOString())
    .order('expiry_date', { ascending: true });

  if (error) {
    console.error('❌ Error fetching expiring batches:', error);
    throw new Error(`فشل جلب الدفعات المنتهية: ${error.message}`);
  }

  return (data || []).map(enrichBatchData);
}

/**
 * جلب الدفعات المنتهية الصلاحية
 */
export async function getExpiredBatches(organizationId: string): Promise<InventoryBatch[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('inventory_batches')
    .select(`
      *,
      products:product_id (name, sku, thumbnail_image)
    `)
    .eq('organization_id', organizationId)
    .gt('quantity_remaining', 0)
    .lt('expiry_date', now)
    .order('expiry_date', { ascending: true });

  if (error) {
    console.error('❌ Error fetching expired batches:', error);
    throw new Error(`فشل جلب الدفعات المنتهية: ${error.message}`);
  }

  return (data || []).map(enrichBatchData);
}

// =====================================================
// دوال مساعدة
// =====================================================

/**
 * توليد رقم دفعة فريد
 */
function generateBatchNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `B${year}${month}${day}-${random}`;
}

/**
 * إثراء بيانات الدفعة بالحقول المحسوبة
 */
function enrichBatchData(batch: any): InventoryBatch {
  const now = new Date();
  let daysUntilExpiry: number | undefined;

  if (batch.expiry_date) {
    const expiryDate = new Date(batch.expiry_date);
    const diffTime = expiryDate.getTime() - now.getTime();
    daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const usagePercentage = batch.quantity_received > 0
    ? ((batch.quantity_received - batch.quantity_remaining) / batch.quantity_received) * 100
    : 0;

  const totalValue = batch.quantity_remaining * batch.selling_price;

  return {
    ...batch,
    days_until_expiry: daysUntilExpiry,
    usage_percentage: Math.round(usagePercentage * 100) / 100,
    total_value: totalValue,
  };
}

/**
 * تحديد حالة الدفعة
 */
export function getBatchStatus(batch: InventoryBatch): 'active' | 'expired' | 'low' | 'empty' {
  if (batch.quantity_remaining === 0) return 'empty';
  if (batch.days_until_expiry !== undefined && batch.days_until_expiry <= 0) return 'expired';
  if ((batch.usage_percentage || 0) >= 80) return 'low';
  return 'active';
}

export default {
  getProductBatches,
  getBatches,
  getBatch,
  getBatchSummary,
  createBatch,
  createBatches,
  updateBatch,
  consumeFromBatches,
  returnToBatch,
  getExpiringBatches,
  getExpiredBatches,
  getBatchStatus,
};
