/**
 * ⚡ Sync Service - نظام Delta Sync الموحد
 *
 * تم إعادة كتابة هذا الملف لاستخدام Delta Sync فقط
 *
 * ❌ تم حذف:
 * - syncProduct (Legacy RPC)
 * - syncCustomer (Legacy RPC)
 * - syncInvoice (Legacy RPC)
 * - processSyncQueue (Legacy)
 *
 * ✅ يتم الإبقاء على:
 * - syncProductsFromServer (جلب من السيرفر)
 * - syncOrdersFromServer (جلب من السيرفر)
 * - syncCustomersFromServer (جلب من السيرفر)
 * - syncPosSettings (إعدادات POS)
 *
 * المزامنة للسيرفر تحدث تلقائياً عبر:
 * - BatchSender (كل 5 ثواني)
 * - RealtimeReceiver (فوري)
 */

import { supabase } from '@/lib/supabase';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { localPosSettingsService } from '@/api/localPosSettingsService';
import { saveRemoteOrders, saveRemoteOrderItems } from '@/api/localPosOrderService';
import { saveRemoteInvoices, saveRemoteInvoiceItems } from '@/api/localInvoiceService';
import { imageSyncService } from '@/api/imageSyncService';

// Constants
const POS_SETTINGS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastPosSettingsSyncTime = 0;

/**
 * ⚡ مزامنة المنتجات من السيرفر (Server → Local)
 */
export const syncProductsFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[syncProductsFromServer] ⚡ Delta Sync - جلب المنتجات...');

    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_colors(*),
        product_sizes(*),
        product_images(*)
      `)
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    let savedCount = 0;
    for (const product of products || []) {
      try {
        // ⚡ حفظ عبر Delta Sync
        await deltaWriteService.saveFromServer('products', {
          ...product,
          synced: true,
          syncStatus: undefined,
          pendingOperation: undefined
        });
        savedCount++;

        // حفظ الألوان
        if (product.product_colors?.length) {
          for (const color of product.product_colors) {
            await deltaWriteService.saveFromServer('product_colors', {
              ...color,
              synced: true
            });
          }
        }

        // حفظ المقاسات
        if (product.product_sizes?.length) {
          for (const size of product.product_sizes) {
            await deltaWriteService.saveFromServer('product_sizes', {
              ...size,
              synced: true
            });
          }
        }

        // حفظ الصور
        if (product.product_images?.length) {
          for (const image of product.product_images) {
            await deltaWriteService.saveFromServer('product_images', {
              ...image,
              synced: true
            });
          }
        }
      } catch (e) {
        console.error(`[syncProductsFromServer] ❌ فشل حفظ منتج:`, e);
      }
    }

    // مزامنة الصور
    await imageSyncService.syncProductImages(organizationId);

    console.log(`[syncProductsFromServer] ✅ تم حفظ ${savedCount} منتج`);
    return savedCount;
  } catch (error) {
    console.error('[syncProductsFromServer] ❌ خطأ:', error);
    return 0;
  }
};

/**
 * ⚡ مزامنة العملاء من السيرفر (Server → Local)
 */
export const syncCustomersFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[syncCustomersFromServer] ⚡ Delta Sync - جلب العملاء...');

    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    let savedCount = 0;
    for (const customer of customers || []) {
      try {
        await deltaWriteService.saveFromServer('customers', {
          ...customer,
          synced: true,
          syncStatus: undefined,
          pendingOperation: undefined
        });
        savedCount++;
      } catch (e) {
        console.error(`[syncCustomersFromServer] ❌ فشل حفظ عميل:`, e);
      }
    }

    console.log(`[syncCustomersFromServer] ✅ تم حفظ ${savedCount} عميل`);
    return savedCount;
  } catch (error) {
    console.error('[syncCustomersFromServer] ❌ خطأ:', error);
    return 0;
  }
};

/**
 * ⚡ مزامنة الطلبات من السيرفر (Server → Local)
 */
export const syncOrdersFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[syncOrdersFromServer] ⚡ Delta Sync - جلب الطلبات...');

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    // حفظ الطلبات
    await saveRemoteOrders(orders || []);

    // حفظ عناصر الطلبات
    for (const order of orders || []) {
      if (order.order_items?.length) {
        await saveRemoteOrderItems(order.id, order.order_items);
      }
    }

    console.log(`[syncOrdersFromServer] ✅ تم حفظ ${orders?.length || 0} طلب`);
    return orders?.length || 0;
  } catch (error) {
    console.error('[syncOrdersFromServer] ❌ خطأ:', error);
    return 0;
  }
};

/**
 * ⚡ مزامنة الفواتير من السيرفر (Server → Local)
 */
export const syncInvoicesFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[syncInvoicesFromServer] ⚡ Delta Sync - جلب الفواتير...');

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    // حفظ الفواتير
    await saveRemoteInvoices(invoices || []);

    // حفظ عناصر الفواتير
    for (const invoice of invoices || []) {
      if (invoice.invoice_items?.length) {
        await saveRemoteInvoiceItems(invoice.id, invoice.invoice_items);
      }
    }

    console.log(`[syncInvoicesFromServer] ✅ تم حفظ ${invoices?.length || 0} فاتورة`);
    return invoices?.length || 0;
  } catch (error) {
    console.error('[syncInvoicesFromServer] ❌ خطأ:', error);
    return 0;
  }
};

/**
 * ⚡ مزامنة إعدادات POS
 */
export const syncPosSettings = async (organizationId: string): Promise<boolean> => {
  const now = Date.now();
  if (now - lastPosSettingsSyncTime < POS_SETTINGS_CACHE_DURATION) {
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('pos_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
      await localPosSettingsService.saveSettings(data);
      lastPosSettingsSyncTime = now;
    }

    return true;
  } catch (error) {
    console.error('[syncPosSettings] ❌ خطأ:', error);
    return false;
  }
};

/**
 * ⚡ المزامنة الشاملة (Server → Local)
 */
export const synchronizeWithServer = async (organizationId: string): Promise<{
  products: number;
  customers: number;
  orders: number;
  invoices: number;
}> => {
  console.log('[synchronizeWithServer] ⚡ Delta Sync - بدء المزامنة الشاملة...');

  const results = {
    products: 0,
    customers: 0,
    orders: 0,
    invoices: 0
  };

  try {
    // مزامنة متوازية
    const [products, customers, orders, invoices] = await Promise.all([
      syncProductsFromServer(organizationId),
      syncCustomersFromServer(organizationId),
      syncOrdersFromServer(organizationId),
      syncInvoicesFromServer(organizationId)
    ]);

    results.products = products;
    results.customers = customers;
    results.orders = orders;
    results.invoices = invoices;

    // مزامنة الإعدادات
    await syncPosSettings(organizationId);

    console.log('[synchronizeWithServer] ✅ اكتملت المزامنة:', results);
  } catch (error) {
    console.error('[synchronizeWithServer] ❌ خطأ:', error);
  }

  return results;
};

// ⚡ Deprecated - المزامنة للسيرفر تحدث تلقائياً عبر BatchSender
export const syncUnsyncedProducts = async (): Promise<{ success: number; failed: number }> => {
  console.log('[syncUnsyncedProducts] ⚡ Deprecated - المزامنة تلقائية عبر Delta Sync');
  return { success: 0, failed: 0 };
};

export const syncUnsyncedCustomers = async (): Promise<{ success: number; failed: number }> => {
  console.log('[syncUnsyncedCustomers] ⚡ Deprecated - المزامنة تلقائية عبر Delta Sync');
  return { success: 0, failed: 0 };
};

export const processSyncQueue = async (): Promise<{ processed: number; failed: number }> => {
  console.log('[processSyncQueue] ⚡ Deprecated - المزامنة تلقائية عبر Delta Sync');
  return { processed: 0, failed: 0 };
};
