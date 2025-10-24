import { supabase } from '@/lib/supabase';
import {
  getUnsyncedInvoices,
  updateInvoiceSyncStatus,
  cleanupSyncedInvoices
} from './localInvoiceService';
import { inventoryDB, type LocalInvoice } from '@/database/localDb';

/**
 * خدمة مزامنة الفواتير
 * تطبق نمط Server Win لفض النزاعات
 */

const SYNC_POOL_SIZE = Number((import.meta as any)?.env?.VITE_SYNC_POOL_SIZE ?? 2);

// دالة مساعدة لتنفيذ مهام متوازية مع حد أقصى
async function runWithPool<T, R>(
  items: T[],
  handler: (item: T) => Promise<R>,
  poolSize: number = SYNC_POOL_SIZE
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = handler(item).then(result => {
      results.push(result);
    });
    executing.push(promise);

    if (executing.length >= poolSize) {
      await Promise.race(executing);
      const index = executing.findIndex(p => p === promise);
      if (index !== -1) executing.splice(index, 1);
    }
  }

  await Promise.all(executing);
  return results;
}

// مزامنة فاتورة واحدة
const syncSingleInvoice = async (invoice: LocalInvoice): Promise<boolean> => {
  try {
    await updateInvoiceSyncStatus(invoice.id, false, 'syncing');

    if (invoice.pendingOperation === 'create') {
      // جلب عناصر الفاتورة
      const items = await inventoryDB.invoiceItems
        .where('invoice_id')
        .equals(invoice.id)
        .toArray();

      // إنشاء فاتورة جديدة في السيرفر
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoice.invoice_number,
          customer_name: invoice.customer_name,
          customer_id: invoice.customer_id,
          total_amount: invoice.total_amount,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date,
          status: invoice.status,
          source_type: invoice.source_type,
          payment_method: invoice.payment_method,
          payment_status: invoice.payment_status,
          notes: invoice.notes,
          tax_amount: invoice.tax_amount,
          discount_amount: invoice.discount_amount,
          subtotal_amount: invoice.subtotal_amount,
          shipping_amount: invoice.shipping_amount,
          discount_type: invoice.discount_type || null,
          discount_percentage: invoice.discount_percentage || null,
          tva_rate: invoice.tva_rate || null,
          amount_ht: invoice.amount_ht || null,
          amount_tva: invoice.amount_tva || null,
          amount_ttc: invoice.amount_ttc || null,
          organization_id: invoice.organization_id
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // إضافة عناصر الفاتورة
      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({
          invoice_id: invoiceData.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_id: item.product_id,
          type: item.type,
          sku: item.sku || null,
          barcode: item.barcode || null,
          tva_rate: item.tva_rate || null,
          unit_price_ht: item.unit_price_ht || null,
          unit_price_ttc: item.unit_price_ttc || null,
          total_ht: item.total_ht || null,
          total_tva: item.total_tva || null,
          total_ttc: item.total_ttc || null
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // تحديث رقم الفاتورة المحلي بالرقم النهائي من السيرفر
      await inventoryDB.invoices.update(invoice.id, {
        invoice_number: invoiceData.invoice_number,
        synced: true,
        syncStatus: undefined,
        pendingOperation: undefined
      });

      return true;

    } else if (invoice.pendingOperation === 'update') {
      // تحديث فاتورة في السيرفر
      const { error } = await supabase
        .from('invoices')
        .update({
          customer_name: invoice.customer_name,
          customer_id: invoice.customer_id,
          total_amount: invoice.total_amount,
          due_date: invoice.due_date,
          status: invoice.status,
          payment_method: invoice.payment_method,
          payment_status: invoice.payment_status,
          notes: invoice.notes,
          tax_amount: invoice.tax_amount,
          discount_amount: invoice.discount_amount,
          subtotal_amount: invoice.subtotal_amount,
          shipping_amount: invoice.shipping_amount,
          discount_type: invoice.discount_type || null,
          discount_percentage: invoice.discount_percentage || null,
          amount_ht: invoice.amount_ht || null,
          amount_tva: invoice.amount_tva || null,
          amount_ttc: invoice.amount_ttc || null
        })
        .eq('invoice_number', invoice.invoice_number);

      if (error) throw error;

      // حذف العناصر القديمة وإضافة الجديدة
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoice.id);

      if (deleteError) throw deleteError;

      const items = await inventoryDB.invoiceItems
        .where('invoice_id')
        .equals(invoice.id)
        .toArray();

      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({
          invoice_id: invoice.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          product_id: item.product_id,
          type: item.type,
          sku: item.sku || null,
          barcode: item.barcode || null,
          tva_rate: item.tva_rate || null,
          unit_price_ht: item.unit_price_ht || null,
          unit_price_ttc: item.unit_price_ttc || null,
          total_ht: item.total_ht || null,
          total_tva: item.total_tva || null,
          total_ttc: item.total_ttc || null
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      await updateInvoiceSyncStatus(invoice.id, true);
      return true;

    } else if (invoice.pendingOperation === 'delete') {
      // حذف فاتورة من السيرفر
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('invoice_number', invoice.invoice_number);

      if (error) throw error;

      await updateInvoiceSyncStatus(invoice.id, true);
      return true;
    }

    return false;
  } catch (error) {
    console.error('فشل مزامنة الفاتورة:', invoice.invoice_number, error);
    await updateInvoiceSyncStatus(invoice.id, false, 'error');
    
    // Server Win: في حالة الفشل، نجلب البيانات من السيرفر
    try {
      const { data: serverInvoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_number', invoice.invoice_number)
        .single();

      if (serverInvoice) {
        // تحديث البيانات المحلية بنسخة السيرفر
        await inventoryDB.invoices.update(invoice.id, {
          status: serverInvoice.status,
          payment_status: serverInvoice.payment_status,
          total_amount: serverInvoice.total_amount,
          synced: true,
          syncStatus: undefined,
          pendingOperation: undefined
        });
      }
    } catch (serverError) {
      console.error('فشل جلب البيانات من السيرفر:', serverError);
    }

    return false;
  }
};

// مزامنة جميع الفواتير المعلقة
export const syncPendingInvoices = async (): Promise<{ success: number; failed: number }> => {
  try {
    const unsyncedInvoices = await getUnsyncedInvoices();

    if (unsyncedInvoices.length === 0) {
      return { success: 0, failed: 0 };
    }

    console.log(`🔄 مزامنة ${unsyncedInvoices.length} فاتورة...`);

    // استخدام Pool للتحكم بالتوازي
    const results = await runWithPool(
      unsyncedInvoices,
      async (invoice) => await syncSingleInvoice(invoice),
      SYNC_POOL_SIZE
    );

    const success = results.filter(r => r === true).length;
    const failed = results.filter(r => r === false).length;

    console.log(`✅ تمت مزامنة ${success} فاتورة، فشل ${failed}`);

    // تنظيف الفواتير المتزامنة والمحذوفة
    await cleanupSyncedInvoices();

    return { success, failed };
  } catch (error) {
    console.error('خطأ في مزامنة الفواتير:', error);
    return { success: 0, failed: 0 };
  }
};

// جلب الفواتير من السيرفر وحفظها محلياً
export const fetchInvoicesFromServer = async (organizationId: string): Promise<number> => {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    let savedCount = 0;

    for (const invoiceData of invoices || []) {
      const localInvoice: LocalInvoice = {
        id: invoiceData.id,
        invoice_number: invoiceData.invoice_number,
        customer_name: invoiceData.customer_name,
        customer_id: invoiceData.customer_id,
        total_amount: invoiceData.total_amount,
        invoice_date: invoiceData.invoice_date,
        due_date: invoiceData.due_date,
        status: invoiceData.status,
        source_type: invoiceData.source_type,
        payment_method: invoiceData.payment_method,
        payment_status: invoiceData.payment_status,
        notes: invoiceData.notes,
        tax_amount: invoiceData.tax_amount,
        discount_amount: invoiceData.discount_amount,
        subtotal_amount: invoiceData.subtotal_amount,
        shipping_amount: invoiceData.shipping_amount,
        discount_type: (invoiceData as any).discount_type || null,
        discount_percentage: (invoiceData as any).discount_percentage || null,
        tva_rate: (invoiceData as any).tva_rate || null,
        amount_ht: (invoiceData as any).amount_ht || null,
        amount_tva: (invoiceData as any).amount_tva || null,
        amount_ttc: (invoiceData as any).amount_ttc || null,
        organization_id: organizationId,
        created_at: invoiceData.created_at,
        updated_at: invoiceData.updated_at || invoiceData.created_at,
        synced: true,
        syncStatus: undefined,
        pendingOperation: undefined
      };

      await inventoryDB.invoices.put(localInvoice);

      // حفظ عناصر الفاتورة
      if (invoiceData.invoice_items && Array.isArray(invoiceData.invoice_items)) {
        for (const item of invoiceData.invoice_items) {
          await inventoryDB.invoiceItems.put({
            id: item.id,
            invoice_id: invoiceData.id,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            product_id: item.product_id,
            type: item.type,
            sku: (item as any).sku || null,
            barcode: (item as any).barcode || null,
            tva_rate: (item as any).tva_rate || null,
            unit_price_ht: (item as any).unit_price_ht || null,
            unit_price_ttc: (item as any).unit_price_ttc || null,
            total_ht: (item as any).total_ht || null,
            total_tva: (item as any).total_tva || null,
            total_ttc: (item as any).total_ttc || null,
            created_at: item.created_at,
            synced: true
          });
        }
      }

      savedCount++;
    }

    console.log(`✅ تم جلب ${savedCount} فاتورة من السيرفر`);
    return savedCount;
  } catch (error) {
    console.error('خطأ في جلب الفواتير من السيرفر:', error);
    return 0;
  }
};
