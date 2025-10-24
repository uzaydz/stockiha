import { v4 as uuidv4 } from 'uuid';
import { inventoryDB, type LocalInvoice, type LocalInvoiceItem } from '@/database/localDb';
import { UnifiedQueue } from '@/sync/UnifiedQueue';

/**
 * خدمة إدارة الفواتير المحلية
 * تدعم الأوفلاين والأونلاين مع المزامنة التلقائية
 */

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
    created_at: now,
    updated_at: now,
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'create'
  };

  await inventoryDB.invoices.put(invoiceRecord);

  const itemRecords: LocalInvoiceItem[] = [];
  
  for (const item of data.items) {
    const itemRecord: LocalInvoiceItem = {
      ...item,
      id: uuidv4(),
      invoice_id: invoiceId,
      created_at: now,
      synced: false
    };
    
    itemRecords.push(itemRecord);
    await inventoryDB.invoiceItems.put(itemRecord);
  }

  // إضافة إلى صف المزامنة
  await UnifiedQueue.enqueue({
    objectType: 'order',
    objectId: invoiceId,
    operation: 'create',
    data: { invoice: invoiceRecord, items: itemRecords },
    priority: 2
  });

  return { invoice: invoiceRecord, items: itemRecords };
};

// تحديث فاتورة محلياً
export const updateLocalInvoice = async (
  invoiceId: string,
  updates: Partial<Omit<LocalInvoice, 'id' | 'created_at' | 'organization_id' | 'invoice_number'>>,
  newItems?: Array<Omit<LocalInvoiceItem, 'id' | 'invoice_id' | 'created_at' | 'synced'>>
): Promise<{ invoice: LocalInvoice; items: LocalInvoiceItem[] } | null> => {
  const existing = await inventoryDB.invoices.get(invoiceId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: LocalInvoice = {
    ...existing,
    ...updates,
    updated_at: now,
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'update'
  };

  await inventoryDB.invoices.put(updated);

  let itemRecords: LocalInvoiceItem[] = [];

  // إذا تم تمرير عناصر جديدة، نحذف القديمة ونضيف الجديدة
  if (newItems) {
    // حذف العناصر القديمة
    const oldItems = await inventoryDB.invoiceItems
      .where('invoice_id')
      .equals(invoiceId)
      .toArray();
    
    for (const oldItem of oldItems) {
      await inventoryDB.invoiceItems.delete(oldItem.id);
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
      await inventoryDB.invoiceItems.put(itemRecord);
    }
  } else {
    // جلب العناصر الحالية
    itemRecords = await inventoryDB.invoiceItems
      .where('invoice_id')
      .equals(invoiceId)
      .toArray();
  }

  // إضافة إلى صف المزامنة
  await UnifiedQueue.enqueue({
    objectType: 'order',
    objectId: invoiceId,
    operation: 'update',
    data: { invoice: updated, items: itemRecords },
    priority: 2
  });

  return { invoice: updated, items: itemRecords };
};

// حذف فاتورة محلياً
export const deleteLocalInvoice = async (invoiceId: string): Promise<boolean> => {
  const existing = await inventoryDB.invoices.get(invoiceId);
  if (!existing) return false;

  // وضع علامة للحذف بدلاً من الحذف الفوري
  const marked: LocalInvoice = {
    ...existing,
    updated_at: new Date().toISOString(),
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'delete'
  };

  await inventoryDB.invoices.put(marked);

  // إضافة إلى صف المزامنة
  await UnifiedQueue.enqueue({
    objectType: 'order',
    objectId: invoiceId,
    operation: 'delete',
    data: marked,
    priority: 2
  });

  return true;
};

// جلب فاتورة واحدة مع عناصرها
export const getLocalInvoice = async (
  invoiceId: string
): Promise<{ invoice: LocalInvoice; items: LocalInvoiceItem[] } | null> => {
  const invoice = await inventoryDB.invoices.get(invoiceId);
  if (!invoice) return null;

  const items = await inventoryDB.invoiceItems
    .where('invoice_id')
    .equals(invoiceId)
    .toArray();

  return { invoice, items };
};

// جلب فاتورة برقمها
export const getLocalInvoiceByNumber = async (
  invoiceNumber: string
): Promise<{ invoice: LocalInvoice; items: LocalInvoiceItem[] } | null> => {
  const invoice = await inventoryDB.invoices
    .where('invoice_number')
    .equals(invoiceNumber)
    .first();
  
  if (!invoice) return null;

  const items = await inventoryDB.invoiceItems
    .where('invoice_id')
    .equals(invoice.id)
    .toArray();

  return { invoice, items };
};

// جلب جميع الفواتير حسب المؤسسة
export const getAllLocalInvoices = async (organizationId: string): Promise<LocalInvoice[]> => {
  return await inventoryDB.invoices
    .where('organization_id')
    .equals(organizationId)
    .and(invoice => invoice.pendingOperation !== 'delete')
    .reverse()
    .toArray();
};

// جلب الفواتير غير المتزامنة
export const getUnsyncedInvoices = async (): Promise<LocalInvoice[]> => {
  return await inventoryDB.invoices
    .filter(invoice => invoice.synced === false)
    .toArray();
};

// تحديث حالة المزامنة
export const updateInvoiceSyncStatus = async (
  invoiceId: string,
  synced: boolean,
  syncStatus?: 'pending' | 'syncing' | 'error'
): Promise<void> => {
  const invoice = await inventoryDB.invoices.get(invoiceId);
  if (!invoice) return;

  await inventoryDB.invoices.update(invoiceId, {
    synced,
    syncStatus,
    pendingOperation: synced ? undefined : invoice.pendingOperation
  });
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
  const toDelete = await inventoryDB.invoices
    .filter(invoice => invoice.synced === true && invoice.pendingOperation === 'delete')
    .toArray();

  for (const invoice of toDelete) {
    // حذف العناصر المرتبطة
    const items = await inventoryDB.invoiceItems
      .where('invoice_id')
      .equals(invoice.id)
      .toArray();
    
    for (const item of items) {
      await inventoryDB.invoiceItems.delete(item.id);
    }

    await inventoryDB.invoices.delete(invoice.id);
  }

  return toDelete.length;
};

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
