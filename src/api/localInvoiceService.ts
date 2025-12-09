/**
 * localInvoiceService - خدمة الفواتير المحلية
 *
 * ⚡ تم التحديث لاستخدام PowerSync
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - يدعم الفواتير مع عناصرها
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalInvoice, LocalInvoiceItem } from '@/database/localDb';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// Re-export types
export type { LocalInvoice, LocalInvoiceItem } from '@/database/localDb';

interface CreateInvoiceData {
  invoiceData: Omit<LocalInvoice, 'id' | 'created_at' | 'updated_at'>;
  items: Array<Omit<LocalInvoiceItem, 'id' | 'invoice_id' | 'created_at'>>;
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
    // ⚡ v3.0: تم إزالة invoice_number_lower و customer_name_lower - غير موجودين في PowerSync schema
    created_at: now,
    updated_at: now,
  } as LocalInvoice;

  const itemRecords: LocalInvoiceItem[] = data.items.map(item => ({
    ...item,
    id: uuidv4(),
    invoice_id: invoiceId,
    organization_id: data.invoiceData.organization_id, // ⚡ مطلوب في Supabase
    created_at: now,
  } as LocalInvoiceItem));

  // ⚡ استخدام PowerSync مع العناصر
  await powerSyncService.transaction(async (tx) => {
    // حفظ الفاتورة
    const invoiceKeys = Object.keys(invoiceRecord).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    const invoicePlaceholders = invoiceKeys.map(() => '?').join(', ');
    const invoiceValues = invoiceKeys.map(k => (invoiceRecord as any)[k]);
    
    await tx.execute(
      `INSERT INTO invoices (id, ${invoiceKeys.join(', ')}, created_at, updated_at) VALUES (?, ${invoicePlaceholders}, ?, ?)`,
      [invoiceId, ...invoiceValues, now, now]
    );

    // حفظ العناصر
    for (const item of itemRecords) {
      const itemKeys = Object.keys(item).filter(k => k !== 'id' && k !== 'invoice_id' && k !== 'created_at');
      const itemPlaceholders = itemKeys.map(() => '?').join(', ');
      const itemValues = itemKeys.map(k => (item as any)[k]);
      
      await tx.execute(
        `INSERT INTO invoice_items (id, invoice_id, ${itemKeys.join(', ')}, created_at) VALUES (?, ?, ${itemPlaceholders}, ?)`,
        [item.id, invoiceId, ...itemValues, now]
      );
    }
  });

  console.log(`[LocalInvoice] ⚡ Created invoice ${invoiceId} with ${itemRecords.length} items via PowerSync`);
  return { invoice: invoiceRecord, items: itemRecords };
};

// تحديث فاتورة محلياً
export const updateLocalInvoice = async (
  invoiceId: string,
  updates: Partial<Omit<LocalInvoice, 'id' | 'created_at' | 'organization_id' | 'invoice_number'>>,
  newItems?: Array<Omit<LocalInvoiceItem, 'id' | 'invoice_id' | 'created_at'>>
): Promise<{ invoice: LocalInvoice; items: LocalInvoiceItem[] } | null> => {
  try {
    const existing = await powerSyncService.get<LocalInvoice>(
      'SELECT * FROM invoices WHERE id = ?',
      [invoiceId]
    );
    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedData = {
      ...updates,
      updated_at: now,
    };

    let itemRecords: LocalInvoiceItem[] = [];

    // ⚡ تحديث الفاتورة والعناصر
    await powerSyncService.transaction(async (tx) => {
// تحديث الفاتورة
      const keys = Object.keys(updatedData).filter(k => k !== 'id' && k !== 'created_at');
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => (updatedData as any)[k]);
      
      await tx.execute(
        `UPDATE invoices SET ${setClause}, updated_at = ? WHERE id = ?`,
        [...values, now, invoiceId]
      );

      // إذا تم تمرير عناصر جديدة
      if (newItems) {
        // حذف العناصر القديمة
        await tx.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [invoiceId]);

        // إضافة العناصر الجديدة
        for (const item of newItems) {
          const itemRecord: LocalInvoiceItem = {
            ...item,
            id: uuidv4(),
            invoice_id: invoiceId,
            organization_id: existing.organization_id, // ⚡ مطلوب في Supabase
            created_at: now,
          } as LocalInvoiceItem;

          itemRecords.push(itemRecord);
          
          const itemKeys = Object.keys(itemRecord).filter(k => k !== 'id' && k !== 'invoice_id' && k !== 'created_at');
          const itemPlaceholders = itemKeys.map(() => '?').join(', ');
          const itemValues = itemKeys.map(k => (itemRecord as any)[k]);
          
          await tx.execute(
            `INSERT INTO invoice_items (id, invoice_id, ${itemKeys.join(', ')}, created_at) VALUES (?, ?, ${itemPlaceholders}, ?)`,
            [itemRecord.id, invoiceId, ...itemValues, now]
          );
        }
      } else {
        // جلب العناصر الحالية
itemRecords = await powerSyncService.query<LocalInvoiceItem>({
          sql: 'SELECT * FROM invoice_items WHERE invoice_id = ?',
          params: [invoiceId]
        });
      }
    });

    console.log(`[LocalInvoice] ⚡ Updated invoice ${invoiceId} via PowerSync`);
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
    const existing = await powerSyncService.get<LocalInvoice>(
      'SELECT * FROM invoices WHERE id = ?',
      [invoiceId]
    );
    if (!existing) return false;

    // ⚡ استخدام PowerSync للحذف
    await powerSyncService.transaction(async (tx) => {
// حذف العناصر أولاً
      await tx.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
      // ثم حذف الفاتورة
      await tx.execute('DELETE FROM invoices WHERE id = ?', [invoiceId]);
    });

    console.log(`[LocalInvoice] ⚡ Deleted invoice ${invoiceId} via PowerSync`);
    return true;
  } catch (error) {
    console.error(`[LocalInvoice] Delete error:`, error);
    return false;
  }
};

// جلب فاتورة واحدة مع عناصرها
export const getLocalInvoice = async (
  invoiceId: string
): Promise<{ invoice: LocalInvoice; items: LocalInvoiceItem[] } | null> => {
  const invoice = await powerSyncService.get<LocalInvoice>(
    'SELECT * FROM invoices WHERE id = ?',
    [invoiceId]
  );
  if (!invoice) return null;

  const items = await powerSyncService.query<LocalInvoiceItem>({
    sql: 'SELECT * FROM invoice_items WHERE invoice_id = ?',
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

  if (!powerSyncService.db) {
    console.warn('[localInvoiceService] PowerSync DB not initialized');
    return [];
  }
  const invoices = await powerSyncService.query<LocalInvoice>({
    sql: 'SELECT * FROM invoices WHERE organization_id = ? AND invoice_number = ? LIMIT 1',
    params: [orgId, invoiceNumber]
  });

  if (invoices.length === 0) return null;

  const invoice = invoices[0];
  const items = await powerSyncService.query<LocalInvoiceItem>({
    sql: 'SELECT * FROM invoice_items WHERE invoice_id = ?',
    params: [invoice.id]
  });

  return { invoice, items };
};

// جلب جميع الفواتير حسب المؤسسة
export const getAllLocalInvoices = async (organizationId: string): Promise<LocalInvoice[]> => {
  if (!powerSyncService.db) {
    console.warn('[localInvoiceService] PowerSync DB not initialized');
    return [];
  }
  return powerSyncService.query<LocalInvoice>({
    sql: 'SELECT * FROM invoices WHERE organization_id = ? ORDER BY created_at DESC',
    params: [organizationId]
  });
};

// جلب الفواتير غير المتزامنة
export const getUnsyncedInvoices = async (): Promise<LocalInvoice[]> => {
  // ⚡ PowerSync يتعامل مع المزامنة تلقائياً
  const orgId = localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') || '';

  if (!powerSyncService.db) {
    console.warn('[localInvoiceService] PowerSync DB not initialized');
    return [];
  }
  return powerSyncService.query<LocalInvoice>({
    sql: 'SELECT * FROM invoices WHERE organization_id = ?',
    params: [orgId]
  });
};

// تحديث حالة المزامنة (⚠️ PowerSync يدير المزامنة تلقائياً)
export const updateInvoiceSyncStatus = async (
  invoiceId: string,
  synced: boolean,
  syncStatus?: 'pending' | 'syncing' | 'error'
): Promise<void> => {
  // PowerSync يدير المزامنة تلقائياً - لا حاجة لتحديث يدوي
  console.log(`[LocalInvoice] ⚠️ PowerSync manages sync automatically for invoice ${invoiceId}`);
  console.log(`[LocalInvoice] updateInvoiceSyncStatus called - PowerSync handles sync automatically`);
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

  if (!powerSyncService.db) {
    console.warn('[localInvoiceService] PowerSync DB not initialized');
    return [];
  }
  const invoices = await powerSyncService.query<LocalInvoice>({
    sql: `SELECT * FROM invoices WHERE ${whereClause} ORDER BY created_at ${createdSort === 'desc' ? 'DESC' : 'ASC'} LIMIT ? OFFSET ?`,
    params: [...params, limit, offset]
  });

  const totalResult = await powerSyncService.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM invoices WHERE ${whereClause}`,
    params
  );
  const total = totalResult?.count || 0;

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

  if (!powerSyncService.db) {
    console.warn('[localInvoiceService] PowerSync DB not initialized');
    return [];
  }
  // ⚡ v3.0: استخدام LOWER() بدلاً من الأعمدة غير الموجودة
  return powerSyncService.query<LocalInvoice>({
    sql: `SELECT * FROM invoices WHERE organization_id = ? AND (LOWER(invoice_number) LIKE ? OR LOWER(customer_name) LIKE ?) LIMIT ?`,
    params: [organizationId, `%${q}%`, `%${q}%`, limit]
  });
}

export async function getLocalInvoiceStats(organizationId: string): Promise<{
  total: number;
  pending: number;
  paid: number;
  draft: number;
}> {
  if (!powerSyncService.db) {
    console.warn('[localInvoiceService] PowerSync DB not initialized');
    return [];
  }
  const invoices = await powerSyncService.query<LocalInvoice>({
    sql: 'SELECT * FROM invoices WHERE organization_id = ?',
    params: [organizationId]
  });

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
      // ⚡ v3.0: تم إزالة invoice_number_lower - غير موجود في PowerSync schema
      remote_invoice_id: invoice.id,
      customer_name: invoice.customer_name,
      // ⚡ v3.0: تم إزالة customer_name_lower - غير موجود في PowerSync schema
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
    } as LocalInvoice;

    // حفظ عبر PowerSync
    await powerSyncService.transaction(async (tx) => {
const keys = Object.keys(mappedInvoice).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map(k => (mappedInvoice as any)[k]);
      
      await tx.execute(
        `INSERT OR REPLACE INTO invoices (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
        [mappedInvoice.id, ...values, mappedInvoice.created_at, mappedInvoice.updated_at]
      );
    });
  }

  console.log(`[LocalInvoice] ⚡ Saved ${invoices.length} remote invoices`);
};

// حفظ عناصر الفاتورة القادمة من السيرفر
export const saveRemoteInvoiceItems = async (invoiceId: string, items: any[], organizationId?: string): Promise<void> => {
  if (!items || items.length === 0) return;

  const now = new Date().toISOString();

  for (const item of items) {
    const mappedItem: LocalInvoiceItem = {
      id: item.id,
      invoice_id: invoiceId,
      organization_id: organizationId || item.organization_id, // ⚡ مطلوب في Supabase
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
    } as LocalInvoiceItem;

    await powerSyncService.transaction(async (tx) => {
const keys = Object.keys(mappedItem).filter(k => k !== 'id' && k !== 'invoice_id' && k !== 'created_at');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map(k => (mappedItem as any)[k]);
      
      await tx.execute(
        `INSERT OR REPLACE INTO invoice_items (id, invoice_id, ${keys.join(', ')}, created_at) VALUES (?, ?, ${placeholders}, ?)`,
        [mappedItem.id, invoiceId, ...values, mappedItem.created_at]
      );
    });
  }

  console.log(`[LocalInvoice] ⚡ Saved ${items.length} remote invoice items`);
};
