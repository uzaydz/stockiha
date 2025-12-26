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
import { unifiedOrderService } from '@/services/UnifiedOrderService';
import { saveRemoteInvoices, saveRemoteInvoiceItems } from '@/api/localInvoiceService';
import { imageSyncService } from '@/api/imageSyncService';

type ServerProductRow = Record<string, unknown> & {
  id: string;
  product_colors?: unknown[];
  product_sizes?: unknown[];
  product_images?: unknown[];
};

const buildIdentifierCandidates = (identifier: string): string[] => {
  const clean = (identifier || '').trim();
  if (!clean) return [];

  const base = clean.replaceAll(',', '').replaceAll('%', '').replaceAll('_', '');
  const candidates = new Set<string>([base]);

  if (/^\d+$/.test(base)) {
    const noLeadingZeros = base.replace(/^0+/, '');
    if (noLeadingZeros && noLeadingZeros !== base) candidates.add(noLeadingZeros);

    for (const len of [12, 13, 14]) {
      if (base.length < len) candidates.add(base.padStart(len, '0'));
      if (noLeadingZeros && noLeadingZeros.length < len) candidates.add(noLeadingZeros.padStart(len, '0'));
    }
  }

  return [...candidates].filter(Boolean);
};

const toPostgrestInList = (values: string[]): string => {
  const quoted = values.map((v) => `"${v.replaceAll('"', '').replaceAll(',', '')}"`);
  return `(${quoted.join(',')})`;
};

// Constants
const POS_SETTINGS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastPosSettingsSyncTime = 0;

/**
 * ⚡ مزامنة المنتجات من السيرفر (Server → Local)
 * v2.0: يدعم حذف المنتجات اليتيمة (المحذوفة على السيرفر)
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

    // ⚡ جمع IDs المنتجات من السيرفر
    const serverProductIds = new Set((products || []).map(p => p.id));

    let savedCount = 0;
    for (const product of products || []) {
      try {
        // ⚡ استخراج المتغيرات قبل الحفظ
        const { product_colors, product_sizes, product_images, ...productData } = product;

        // ⚡ حفظ المنتج عبر Delta Sync (بدون الأعمدة المتداخلة)
        await deltaWriteService.saveFromServer('products', productData);
        savedCount++;

        // حفظ الألوان
        if (product_colors?.length) {
          for (const color of product_colors) {
            await deltaWriteService.saveFromServer('product_colors', color);
          }
        }

        // حفظ المقاسات
        if (product_sizes?.length) {
          for (const size of product_sizes) {
            await deltaWriteService.saveFromServer('product_sizes', size);
          }
        }

        // حفظ الصور
        if (product_images?.length) {
          for (const image of product_images) {
            await deltaWriteService.saveFromServer('product_images', image);
          }
        }
      } catch (e) {
        console.error(`[syncProductsFromServer] ❌ فشل حفظ منتج:`, e);
      }
    }

    // ⚡ v2.0: حذف المنتجات اليتيمة (موجودة محلياً لكن ليست على السيرفر)
    try {
      const { powerSyncService } = await import('@/lib/powersync/PowerSyncService');
      if (powerSyncService.db) {
        const localProducts = await powerSyncService.query<{ id: string }>({
          sql: 'SELECT id FROM products WHERE organization_id = ?',
          params: [organizationId]
        });

        const orphanedIds = (localProducts || [])
          .map(p => p.id)
          .filter(id => !serverProductIds.has(id));

        if (orphanedIds.length > 0) {
          console.log(`[syncProductsFromServer] 🗑️ حذف ${orphanedIds.length} منتج يتيم...`);

          // حذف المنتجات اليتيمة مباشرة
          for (const id of orphanedIds) {
            try {
              await powerSyncService.db.execute(
                'DELETE FROM products WHERE id = ?',
                [id]
              );
              // حذف الألوان والمقاسات والصور المرتبطة
              await powerSyncService.db.execute(
                'DELETE FROM product_colors WHERE product_id = ?',
                [id]
              );
              await powerSyncService.db.execute(
                'DELETE FROM product_sizes WHERE product_id = ?',
                [id]
              );
              await powerSyncService.db.execute(
                'DELETE FROM product_images WHERE product_id = ?',
                [id]
              );
            } catch (delErr) {
              console.warn(`[syncProductsFromServer] تعذر حذف منتج ${id}:`, delErr);
            }
          }

          console.log(`[syncProductsFromServer] ✅ تم حذف ${orphanedIds.length} منتج يتيم`);
        }
      }
    } catch (orphanErr) {
      console.warn('[syncProductsFromServer] ⚠️ تعذر فحص المنتجات اليتيمة:', orphanErr);
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
 * ⚡ مزامنة منتج واحد بالباركود/sku/box_barcode (Server → Local)
 * الهدف: عند ظهور المنتج في الـ POS أونلاين، نضمن حفظه محلياً للاستخدام Offline لاحقاً.
 */
export const syncProductByIdentifierFromServer = async (
  organizationId: string,
  identifier: string
): Promise<{ success: boolean; productId?: string; error?: string }> => {
  try {
    const candidates = buildIdentifierCandidates(identifier);
    if (candidates.length === 0) return { success: false, error: 'Missing identifier' };

    const list = toPostgrestInList(candidates);

    const { data: product, error } = await supabase
      .from('products')
      .select(
        `
        *,
        product_colors(*),
        product_sizes(*),
        product_images(*)
      `
      )
      .eq('organization_id', organizationId)
      .or(`barcode.in.${list},sku.in.${list},box_barcode.in.${list}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!product) {
      const probe = candidates[0];
      const { data: productIlike, error: ilikeError } = await supabase
        .from('products')
        .select(
          `
          *,
          product_colors(*),
          product_sizes(*),
          product_images(*)
        `
        )
        .eq('organization_id', organizationId)
        .or(`barcode.ilike.${probe},sku.ilike.${probe},box_barcode.ilike.${probe}`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ilikeError) throw ilikeError;
      if (!productIlike) {
        console.warn('[syncProductByIdentifierFromServer] Not found', {
          organizationId,
          identifier,
          candidates: candidates.slice(0, 6),
        });
        return { success: false, error: 'Not found on server' };
      }

      const row = productIlike as ServerProductRow;
      const { product_colors, product_sizes, product_images, ...productData } = row;

      await deltaWriteService.saveFromServer('products', productData);

      if (Array.isArray(product_colors) && product_colors.length) {
        for (const color of product_colors) {
          await deltaWriteService.saveFromServer('product_colors', color);
        }
      }
      if (Array.isArray(product_sizes) && product_sizes.length) {
        for (const size of product_sizes) {
          await deltaWriteService.saveFromServer('product_sizes', size);
        }
      }
      if (Array.isArray(product_images) && product_images.length) {
        for (const image of product_images) {
          await deltaWriteService.saveFromServer('product_images', image);
        }
      }

      return { success: true, productId: productData.id as string };
    }

    const row = product as ServerProductRow;
    const { product_colors, product_sizes, product_images, ...productData } = row;

    await deltaWriteService.saveFromServer('products', productData);

    if (Array.isArray(product_colors) && product_colors.length) {
      for (const color of product_colors) {
        await deltaWriteService.saveFromServer('product_colors', color);
      }
    }
    if (Array.isArray(product_sizes) && product_sizes.length) {
      for (const size of product_sizes) {
        await deltaWriteService.saveFromServer('product_sizes', size);
      }
    }
    if (Array.isArray(product_images) && product_images.length) {
      for (const image of product_images) {
        await deltaWriteService.saveFromServer('product_images', image);
      }
    }

    return { success: true, productId: productData.id as string };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to sync product' };
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
        await deltaWriteService.saveFromServer('customers', customer);
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
/**
 * ⚡ مزامنة الطلبات من السيرفر (Server → Local)
 * ملاحظة: PowerSync يتعامل مع المزامنة تلقائياً، هذه الدالة للتوافق فقط
 */
export const syncOrdersFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[syncOrdersFromServer] ⚡ PowerSync handles sync automatically');
    
    // PowerSync يتعامل مع المزامنة تلقائياً من Supabase
    // لا حاجة لاستدعاء صريح هنا
    unifiedOrderService.setOrganizationId(organizationId);
    
    // يمكن جلب عدد الطلبات المحلية للتحقق
    const result = await unifiedOrderService.getOrders({}, 1, 1);
    console.log(`[syncOrdersFromServer] ✅ PowerSync sync active, local orders count: ${result.total}`);
    return result.total;
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
