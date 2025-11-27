/**
 * localInvoiceService - خدمة الفواتير المحلية
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - يدعم الفواتير مع عناصرها
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalInvoice, LocalInvoiceItem } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';

// Re-export types
export type { LocalInvoice, LocalInvoiceItem } from '@/database/localDb';

interface CreateInvoiceData {
  invoiceData: Omit<LocalInvoice, 'id' | 'created_at' | 'updated_at' | 'synced' | 'syncStatus' | 'pendingOperation'>;
  items: Array<Omit<LocalInvoiceItem, 'id' | 'invoice_id' | 'created_at' | 'synced'>>;
}

// إنشاء فاتورة جديدة محلياً
export const createLocalInvoice = async (
  data: CreateInvoiceData
): Promise<{ invoice: LocalInvoice; items: LocalInvoiceItem[] }> => {
  const now = new Date().toISOString();
  const invoiceId = uuidv4();

  const invoiceRecord: LocalInvoice = {
    ...data.invoiceData,
    id: invoiceId,
    invoice_number_lower: data.invoiceData.invoice_number?.toLowerCase(),
    customer_name_lower: data.invoiceData.customer_name?.toLowerCase(),
    created_at: now,
    updated_at: now,
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'create'
  };

  const itemRecords: LocalInvoiceItem[] = data.items.map(item => ({
    ...item,
    id: uuidv4(),
    invoice_id: invoiceId,
    created_at: now,
    synced: false
  }));

  // ⚡ استخدام Delta Sync مع العناصر
  const result = await deltaWriteService.createInvoiceWithItems(
    data.invoiceData.organization_id,
    invoiceRecord,
    itemRecords
  );

  if (!result.success) {
    throw new Error(`Failed to create invoice: ${result.error}`);
  }

  console.log(`[LocalInvoice] ⚡ Created invoice ${invoiceId} with ${itemRecords.length} items via Delta Sync`);
  return { invoice: invoiceRecord, items: itemRecords };
};

// تحديث فاتورة محلياً
export const updateLocalInvoice = async (
  invoiceId: string,
  updates: Partial<Omit<LocalInvoice, 'id' | 'created_at' | 'organization_id' | 'invoice_number'>>,
  newItems?: Array<Omit<LocalInvoiceItem, 'id' | 'invoice_id' | 'created_at' | 'synced'>>
): Promise<{ invoice: LocalInvoice; items: LocalInvoiceItem[] } | null> => {
  try {
    const existing = await deltaWriteService.get<LocalInvoice>('invoices', invoiceId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedData = {
      ...updates,
      updated_at: now,
      synced: false,
      syncStatus: 'pending',
      pendingOperation: existing.pendingOperation === 'create' ? 'create' : 'update'
    };

    // ⚡ تحديث الفاتورة
    const result = await deltaWriteService.update('invoices', invoiceId, updatedData);

    if (!result.success) {
      console.error(`[LocalInvoice] Failed to update invoice ${invoiceId}:`, result.error);
      return null;
    }

    let itemRecords: LocalInvoiceItem[] = [];

    // إذا تم تمرير عناصر جديدة
    if (newItems) {
      // حذف العناصر القديمة
      const oldItems = await deltaWriteService.getAll<LocalInvoiceItem>('invoice_items', existing.organization_id, {
        where: 'invoice_id = ?',
        params: [invoiceId]
      });

      for (const oldItem of oldItems) {
        await deltaWriteService.delete('invoice_items', oldItem.id);
      }

      // إضافة العناصر الجديدة
      for (const item of newItems) {
        const itemRecord: LocalInvoiceItem = {
          ...item,
          id: uuidv4(),
          invoice_id: invoiceId,
          created_at: now,
          synced: false
        };

        itemRecords.push(itemRecord);
        await deltaWriteService.create('invoice_items', itemRecord, existing.organization_id);
      }
    } else {
      // جلب العناصر الحالية
      itemRecords = await deltaWriteService.getAll<LocalInvoiceItem>('invoice_items', existing.organization_id, {
        where: 'invoice_id = ?',
        params: [invoiceId]
      });
    }

    console.log(`[LocalInvoice] ⚡ Updated invoice ${invoiceId} via Delta Sync`);
    return {
      invoice: { ...existing, ...updatedData } as LocalInvoice,
      items: itemRecords
    };
  } catch (error) {
    console.error(`[LocalInvoice] Update error:`, error);
    return null;
  }
};

// حذف فاتورة محلياً
export const deleteLocalInvoice = async (invoiceId: string): Promise<boolean> => {
  try {
    const existing = await deltaWriteService.get<LocalInvoice>('invoices', invoiceId);
    if (!existing) return false;

    // ⚡ استخدام Delta Sync للحذف
    const result = await deltaWriteService.delete('invoices', invoiceId);

    if (result.success) {
      console.log(`[LocalInvoice] ⚡ Deleted invoice ${invoiceId} via Delta Sync`);
    }

    return result.success;
  } catch (error) {
    console.error(`[LocalInvoice] Delete error:`, error);
    return false;
  }
};

// جلب فاتورة واحدة مع عناصرها
export const getLocalInvoice = async (
  invoiceId: string
): Promise<{ invoice: LocalInvoice; items: LocalInvoiceItem[] } | null> => {
  const invoice = await deltaWriteService.get<LocalInvoice>('invoices', invoiceId);
  if (!invoice) return null;

  const items = await deltaWriteService.getAll<LocalInvoiceItem>('invoice_items', invoice.organization_id, {
    where: 'invoice_id = ?',
    params: [invoiceId]
  });

  return { invoice, items };
};

// جلب فاتورة برقمها
export const getLocalInvoiceByNumber = async (
  invoiceNumber: string
): Promise<{ invoice: LocalInvoice; items: LocalInvoiceItem[] } | null> => {
  const orgId = localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') || '';

  const invoices = await deltaWriteService.getAll<LocalInvoice>('invoices', orgId, {
    where: 'invoice_number = ?',
    params: [invoiceNumber],
    limit: 1
  });

  if (invoices.length === 0) return null;

  const invoice = invoices[0];
  const items = await deltaWriteService.getAll<LocalInvoiceItem>('invoice_items', orgId, {
    where: 'invoice_id = ?',
    params: [invoice.id]
  });

  return { invoice, items };
};

// جلب جميع الفواتير حسب المؤسسة
export const getAllLocalInvoices = async (organizationId: string): Promise<LocalInvoice[]> => {
  return deltaWriteService.getAll<LocalInvoice>('invoices', organizationId, {
    where: "(pending_operation IS NULL OR pending_operation != 'delete')",
    orderBy: 'created_at DESC'
  });
};

// جلب الفواتير غير المتزامنة
export const getUnsyncedInvoices = async (): Promise<LocalInvoice[]> => {
  const orgId = localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') || '';

  return deltaWriteService.getAll<LocalInvoice>('invoices', orgId, {
    where: 'synced = 0'
  });
};

// تحديث حالة المزامنة
export const updateInvoiceSyncStatus = async (
  invoiceId: string,
  synced: boolean,
  syncStatus?: 'pending' | 'syncing' | 'error'
): Promise<void> => {
  const updatedData: any = {
    synced,
    sync_status: syncStatus || null
  };

  if (synced) {
    updatedData.pending_operation = null;
  }

  await deltaWriteService.update('invoices', invoiceId, updatedData);
};

// تحديث حالة الدفع
export const updateInvoicePaymentStatus = async (
  invoiceId: string,
  paymentStatus: string,
  paymentMethod?: string
): Promise<LocalInvoice | null> => {
  const updates: Partial<LocalInvoice> = {
    payment_status: paymentStatus
  };

  if (paymentMethod) {
    updates.payment_method = paymentMethod;
  }

  const result = await updateLocalInvoice(invoiceId, updates);
  return result?.invoice || null;
};

// مسح الفواتير المتزامنة والمحذوفة
export const cleanupSyncedInvoices = async (): Promise<number> => {
  console.log('[LocalInvoice] Cleanup handled by Delta Sync automatically');
  return 0;
};

// ==================== بحث وتصفح محلي للفواتير ====================

export async function getLocalInvoicesPage(
  organizationId: string,
  options: { offset?: number; limit?: number; status?: string | string[]; createdSort?: 'asc' | 'desc' } = {}
): Promise<{ invoices: LocalInvoice[]; total: number }> {
  const { offset = 0, limit = 50, status, createdSort = 'desc' } = options;

  let whereClause = "organization_id = ?";
  const params: any[] = [organizationId];

  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    const placeholders = statuses.map(() => '?').join(',');
    whereClause += ` AND status IN (${placeholders})`;
    params.push(...statuses);
  }

  const invoices = await deltaWriteService.getAll<LocalInvoice>('invoices', organizationId, {
    where: whereClause,
    params,
    orderBy: `created_at ${createdSort === 'desc' ? 'DESC' : 'ASC'}`,
    limit,
    offset
  });

  const total = await deltaWriteService.count('invoices', organizationId);

  return { invoices, total };
}

export async function fastSearchLocalInvoices(
  organizationId: string,
  query: string,
  options: { limit?: number; status?: string | string[] } = {}
): Promise<LocalInvoice[]> {
  const q = (query || '').toLowerCase();
  if (!q) return [];
  const limit = options.limit ?? 200;

  return deltaWriteService.search<LocalInvoice>(
    'invoices',
    organizationId,
    ['invoice_number_lower', 'customer_name_lower'],
    q,
    limit
  );
}

export async function getLocalInvoiceStats(organizationId: string): Promise<{
  total: number;
  pending: number;
  paid: number;
  draft: number;
}> {
  const invoices = await deltaWriteService.getAll<LocalInvoice>('invoices', organizationId);

  const total = invoices.length;
  const pending = invoices.filter((i: any) => i.payment_status === 'pending').length;
  const paid = invoices.filter((i: any) => i.payment_status === 'paid').length;
  const draft = invoices.filter((i: any) => i.status === 'draft').length;

  return { total, pending, paid, draft };
}

// حساب إجماليات الفاتورة
export const calculateInvoiceTotals = (
  items: LocalInvoiceItem[],
  discountAmount: number = 0,
  shippingAmount: number = 0,
  tvaRate: number = 19
): {
  subtotal: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
} => {
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const afterDiscount = subtotal - discountAmount;
  const totalHT = afterDiscount / (1 + tvaRate / 100);
  const totalTVA = afterDiscount - totalHT;
  const totalTTC = afterDiscount + shippingAmount;

  return {
    subtotal,
    totalHT,
    totalTVA,
    totalTTC
  };
};

// توليد رقم فاتورة محلي مؤقت
export const generateLocalInvoiceNumber = (type: 'invoice' | 'proforma' | 'bon_commande' = 'invoice'): string => {
  const prefix = type === 'proforma' ? 'PRO-' : type === 'bon_commande' ? 'BC-' : 'INV-';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

// حفظ الفواتير القادمة من السيرفر
export const saveRemoteInvoices = async (invoices: any[]): Promise<void> => {
  if (!invoices || invoices.length === 0) return;

  const now = new Date().toISOString();

  for (const invoice of invoices) {
    const mappedInvoice: LocalInvoice = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_number_lower: invoice.invoice_number?.toLowerCase(),
      remote_invoice_id: invoice.id,
      customer_name: invoice.customer_name,
      customer_name_lower: invoice.customer_name?.toLowerCase(),
      customer_id: invoice.customer_id,
      total_amount: invoice.total_amount || 0,
      invoice_date: invoice.invoice_date || now,
      due_date: invoice.due_date,
      status: invoice.status || 'draft',
      source_type: invoice.source_type || 'manual',
      payment_method: invoice.payment_method || 'cash',
      payment_status: invoice.payment_status || 'pending',
      notes: invoice.notes,
      tax_amount: invoice.tax_amount || 0,
      discount_amount: invoice.discount_amount || 0,
      subtotal_amount: invoice.subtotal_amount || 0,
      shipping_amount: invoice.shipping_amount || 0,
      discount_type: invoice.discount_type,
      discount_percentage: invoice.discount_percentage,
      tva_rate: invoice.tva_rate,
      amount_ht: invoice.amount_ht,
      amount_tva: invoice.amount_tva,
      amount_ttc: invoice.amount_ttc,
      organization_id: invoice.organization_id,
      created_at: invoice.created_at || now,
      updated_at: invoice.updated_at || now,
      synced: true,
      syncStatus: undefined,
      pendingOperation: undefined
    };

    // حفظ عبر Delta Sync (لا يُضاف للـ outbox لأنها من السيرفر)
    await deltaWriteService.saveFromServer('invoices', mappedInvoice);
  }

  console.log(`[LocalInvoice] ⚡ Saved ${invoices.length} remote invoices`);
};

// حفظ عناصر الفاتورة القادمة من السيرفر
export const saveRemoteInvoiceItems = async (invoiceId: string, items: any[]): Promise<void> => {
  if (!items || items.length === 0) return;

  const now = new Date().toISOString();

  for (const item of items) {
    const mappedItem: LocalInvoiceItem = {
      id: item.id,
      invoice_id: invoiceId,
      name: item.name || 'عنصر',
      description: item.description,
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      total_price: item.total_price || 0,
      product_id: item.product_id,
      type: item.type || 'product',
      sku: item.sku,
      barcode: item.barcode,
      tva_rate: item.tva_rate,
      unit_price_ht: item.unit_price_ht,
      unit_price_ttc: item.unit_price_ttc,
      total_ht: item.total_ht,
      total_tva: item.total_tva,
      total_ttc: item.total_ttc,
      created_at: item.created_at || now,
      synced: true
    };

    await deltaWriteService.saveFromServer('invoice_items', mappedItem);
  }

  console.log(`[LocalInvoice] ⚡ Saved ${items.length} remote invoice items`);
};
