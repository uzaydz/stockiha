import { supabase } from '@/lib/supabase';
import { LocalProduct, SyncQueueItem, inventoryDB } from '@/database/localDb';
import { getUnsyncedProducts, markProductAsSynced } from './localProductService';
import { apiClient } from '@/lib/api/client';
import axios from 'axios';
import { LocalCustomer } from '@/database/localDb';
import { LocalAddress } from '@/database/localDb';
import { LocalInvoice, LocalInvoiceItem } from '@/database/localDb';
import { getUnsyncedCustomers } from './localCustomerService';
import { removeSyncQueueItemsSafely } from './syncQueueHelper';
import { resolveProductConflict, buildMergedProduct } from '@/sync/conflictPolicy';
import { localPosSettingsService } from '@/api/localPosSettingsService';
import { createProductColor, createProductSize, createProductImage } from '@/lib/api/productVariants';
import { syncLockManager } from '@/lib/sync/SyncLockManager';
import { conflictDetector, conflictResolver, conflictLogger } from '@/lib/sync';
import { syncPendingCustomerDebts } from '@/api/syncCustomerDebts';

// Pool size للتحكم بالتوازي - قابل للتهيئة عبر env
const SYNC_POOL_SIZE = Number((import.meta as any)?.env?.VITE_SYNC_POOL_SIZE ?? 2);

// Cache لـ pos_settings مع expiry time (5 دقائق)
const POS_SETTINGS_CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
let lastPosSettingsSyncTime: number | null = null;

// تحويل آمن لقيم JSON المحتملة
const parseMaybeJSON = (value: any) => {
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

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
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

  await Promise.all(executing);
  return results;
}

// الحصول على عنوان Supabase الصحيح
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * مزامنة ألوان منتج محلي إلى السيرفر
 * @param productId معرف المنتج على السيرفر
 * @param colors مصفوفة الألوان من البيانات المحلية
 */
async function syncProductColors(productId: string, colors: any[]): Promise<boolean> {
  try {
    if (!colors || colors.length === 0) {
      return true; // لا توجد ألوان للمزامنة
    }

    console.log(`[syncProductColors] مزامنة ${colors.length} لون للمنتج ${productId}`);

    // مزامنة كل لون
    for (const color of colors) {
      try {
        // إعداد بيانات اللون
        const colorData: any = {
          product_id: productId,
          name: color.name || color.color_name || 'لون',
          color_code: color.color_code || null,
          quantity: color.quantity || 0,
          price: color.price || null,
          purchase_price: color.purchase_price || null,
          image_url: color.image_url || null,
          barcode: color.barcode || null,
          is_default: color.is_default || false,
          has_sizes: color.has_sizes || false
        };

        // إنشاء اللون على السيرفر
        const createdColor = await createProductColor(colorData);
        console.log(`[syncProductColors] تم إنشاء لون ${createdColor.id}`);

        // إذا كان اللون يحتوي على مقاسات، قم بمزامنتها
        if (color.sizes && Array.isArray(color.sizes) && color.sizes.length > 0) {
          await syncProductSizes(productId, createdColor.id, color.sizes);
        }
      } catch (colorError) {
        console.error(`[syncProductColors] فشل مزامنة لون:`, colorError);
        // نستمر في مزامنة الألوان الأخرى حتى لو فشل أحدها
      }
    }

    return true;
  } catch (error) {
    console.error('[syncProductColors] خطأ في مزامنة الألوان:', error);
    return false;
  }
}

/**
 * مزامنة مقاسات لون معين إلى السيرفر
 * @param productId معرف المنتج
 * @param colorId معرف اللون على السيرفر
 * @param sizes مصفوفة المقاسات
 */
async function syncProductSizes(productId: string, colorId: string, sizes: any[]): Promise<boolean> {
  try {
    if (!sizes || sizes.length === 0) {
      return true;
    }

    console.log(`[syncProductSizes] مزامنة ${sizes.length} مقاس للون ${colorId}`);

    for (const size of sizes) {
      try {
        const sizeData: any = {
          product_id: productId,
          color_id: colorId,
          size_name: size.size_name || size.name || '',
          quantity: size.quantity || 0,
          price: size.price || null,
          purchase_price: size.purchase_price || null,
          barcode: size.barcode || null,
          is_default: size.is_default || false
        };

        await createProductSize(sizeData);
        console.log(`[syncProductSizes] تم إنشاء مقاس ${sizeData.size_name}`);
      } catch (sizeError) {
        console.error(`[syncProductSizes] فشل مزامنة مقاس:`, sizeError);
      }
    }

    return true;
  } catch (error) {
    console.error('[syncProductSizes] خطأ في مزامنة المقاسات:', error);
    return false;
  }
}

/**
 * مزامنة صور منتج إضافية إلى السيرفر
 * @param productId معرف المنتج
 * @param images مصفوفة الصور
 */
async function syncProductImages(productId: string, images: any[]): Promise<boolean> {
  try {
    if (!images || images.length === 0) {
      return true;
    }

    console.log(`[syncProductImages] مزامنة ${images.length} صورة للمنتج ${productId}`);

    for (const image of images) {
      try {
        const imageData: any = {
          product_id: productId,
          url: image.url,
          position: image.position || 0,
          alt_text: image.alt_text || null,
          is_primary: image.is_primary || false
        };

        await createProductImage(imageData);
        console.log(`[syncProductImages] تم إنشاء صورة`);
      } catch (imageError) {
        console.error(`[syncProductImages] فشل مزامنة صورة:`, imageError);
      }
    }

    return true;
  } catch (error) {
    console.error('[syncProductImages] خطأ في مزامنة الصور:', error);
    return false;
  }
}

// مزامنة منتج واحد مع Supabase
export const syncProduct = async (product: LocalProduct): Promise<boolean> => {
  try {
    if (!product || !product.id) {
      return false;
    }
    
    // تحديد نوع العملية
    const operation = product.pendingOperation || 'update';
    let success = false;
    
    switch (operation) {
      case 'create': {
        // تنقية الكائن من الحقول المحلية قبل الإرسال
        const { synced, syncStatus, lastSyncAttempt, localUpdatedAt, pendingOperation, conflictResolution, colors, product_colors, ...serverProduct } = product as any;

        // حفظ الألوان والمقاسات والصور قبل حذفها لمزامنتها لاحقاً
        const savedColors = colors || product_colors || (product as any).colors || [];
        const savedImages = (product as any).product_images || (product as any).images || [];

        console.log(`[syncProduct] إنشاء منتج جديد مع:`, {
          productId: product.id,
          colorsCount: savedColors.length,
          imagesCount: savedImages.length
        });

        // تنظيف وتعيين قيم افتراضية للحقول المطلوبة
        const cleanProduct = {
          ...serverProduct,
          // تعيين قيمة افتراضية لـ description إذا كانت null أو undefined
          description: serverProduct.description || serverProduct.name || 'منتج',
          // تأكد من وجود الحقول الأساسية
          name: serverProduct.name || 'منتج بدون اسم',
        };

        // حذف الحقول التي قد تسبب مشاكل في schema
        delete (cleanProduct as any).colors;
        delete (cleanProduct as any).product_colors;
        delete (cleanProduct as any).has_variants;
        delete (cleanProduct as any).product_images;
        delete (cleanProduct as any).images;
        
        try {
          // استخدام الدالة المخزنة لإنشاء المنتج بأمان
          const { data, error } = await supabase
            .rpc('create_product_safe', {
              product_data: cleanProduct
            });
          
          if (error) {
            console.warn('[syncProduct] create_product_safe failed, trying direct insert:', error.message);
            
            // محاولة الإنشاء العادية
            const { data: insertData, error: insertError } = await supabase
              .from('products')
              .insert(cleanProduct as any)
              .select('*');
            
            if (insertError) {
              // محاولة بطريقة بديلة بدون RETURNING
              
              const insertResult = await supabase
                .from('products')
                .insert(cleanProduct as any);
              
              if (insertResult.error) {
                console.error('[syncProduct] All create attempts failed:', insertResult.error);
                // تعليم المنتج كمتزامن لتجنب محاولات لا نهائية
                await markProductAsSynced(product.id);
                return false;
              }
              
              await markProductAsSynced(product.id);
              success = true;
            } else {
              // اختر المنتج المناسب من البيانات المعادة
              let createdProduct = null;
              if (Array.isArray(insertData) && insertData.length > 0) {
                createdProduct = insertData[0];
              } else if (insertData) {
                createdProduct = insertData;
              }

              if (createdProduct) {
                await markProductAsSynced(product.id, createdProduct);
              } else {
                await markProductAsSynced(product.id);
              }
              success = true;

              // مزامنة الألوان والمقاسات والصور بعد إنشاء المنتج بنجاح
              if (success && product.id) {
                console.log('[syncProduct] بدء مزامنة الألوان والصور (direct insert)...');

                // مزامنة الألوان (التي تحتوي على المقاسات)
                if (savedColors.length > 0) {
                  await syncProductColors(product.id, savedColors);
                }

                // مزامنة الصور الإضافية
                if (savedImages.length > 0) {
                  await syncProductImages(product.id, savedImages);
                }

                console.log('[syncProduct] اكتملت مزامنة المنتج مع الألوان والصور (direct insert)');
              }
            }
          } else {
            // اختر المنتج المناسب من البيانات المعادة من الدالة المخزنة
            let createdProduct = null;
            if (Array.isArray(data) && data.length > 0) {
              createdProduct = data[0];
            } else if (data) {
              createdProduct = data;
            }

            if (createdProduct) {
              await markProductAsSynced(product.id, createdProduct);
            } else {
              await markProductAsSynced(product.id);
            }
            success = true;

            // مزامنة الألوان والمقاسات والصور بعد إنشاء المنتج بنجاح
            if (success && product.id) {
              console.log('[syncProduct] بدء مزامنة الألوان والصور...');

              // مزامنة الألوان (التي تحتوي على المقاسات)
              if (savedColors.length > 0) {
                await syncProductColors(product.id, savedColors);
              }

              // مزامنة الصور الإضافية
              if (savedImages.length > 0) {
                await syncProductImages(product.id, savedImages);
              }

              console.log('[syncProduct] اكتملت مزامنة المنتج مع الألوان والصور');
            }
          }
        } catch (err) {

          // محاولة بديلة بدون توقع أي بيانات معادة
          try {
            await supabase
              .from('products')
              .insert(cleanProduct as any);

            // تعليم المنتج كمتزامن بدون استخدام البيانات المعادة
            await markProductAsSynced(product.id);
            success = true;

            // مزامنة الألوان والمقاسات والصور بعد إنشاء المنتج بنجاح
            if (success && product.id) {
              console.log('[syncProduct] بدء مزامنة الألوان والصور (fallback)...');

              // مزامنة الألوان (التي تحتوي على المقاسات)
              if (savedColors.length > 0) {
                await syncProductColors(product.id, savedColors);
              }

              // مزامنة الصور الإضافية
              if (savedImages.length > 0) {
                await syncProductImages(product.id, savedImages);
              }

              console.log('[syncProduct] اكتملت مزامنة المنتج مع الألوان والصور (fallback)');
            }
          } catch (finalErr) {
            return false;
          }
        }
        break;
      }
      
      case 'update': {
        // 🔍 STEP 1: Fetch current server version to detect conflicts
        console.log(`[syncProduct] 🔍 Fetching server version for conflict detection: ${product.id}`);

        const { data: serverProduct, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('id', product.id)
          .single();

        if (fetchError || !serverProduct) {
          // المنتج غير موجود على السيرفر - حاول إنشائه بدلاً من التحديث
          console.log(`[syncProduct] ⚠️ Product not found on server, switching to create: ${product.id}`);
          return await syncProduct({ ...product, pendingOperation: 'create' });
        }

        // 🔍 STEP 2: Detect conflict
        const conflict = conflictDetector.detect(
          product,
          serverProduct as any,
          'product',
          {
            criticalFields: ['stock_quantity', 'last_inventory_update', 'price'],
            timestampThreshold: 5000, // 5 seconds
            ignoreNullUndefined: true
          }
        );

        console.log(
          `[syncProduct] ${conflict.hasConflict ? '⚠️ CONFLICT' : '✅ No conflict'} detected for ${product.id}` +
          (conflict.hasConflict ? ` (severity: ${conflict.severity}, fields: ${conflict.fields.join(', ')})` : '')
        );

        let resolvedProduct: any;

        if (!conflict.hasConflict) {
          // No conflict - simple merge: server metadata + local stock
          resolvedProduct = {
            ...serverProduct,
            stock_quantity: product.stock_quantity ?? serverProduct.stock_quantity ?? 0,
            last_inventory_update: product.localUpdatedAt || product.updated_at || serverProduct.updated_at,
            updated_at: new Date().toISOString()
          };
        } else {
          // 🔍 STEP 3: Resolve conflict
          const resolution = await conflictResolver.resolve(
            product,
            serverProduct as any,
            'merge', // استراتيجية المنتجات: دمج
            'product',
            {
              userId: product.organization_id || 'system', // TODO: get actual user ID
              organizationId: product.organization_id || '',
              entityType: 'product',
              entityId: product.id
            }
          );

          if (resolution.requiresManualResolution) {
            console.warn(`[syncProduct] ⚠️ Manual resolution required for ${product.id} - skipping for now`);
            // TODO: Add to manual resolution queue
            return false;
          }

          resolvedProduct = resolution.data;

          // 🔍 STEP 4: Log conflict
          await conflictLogger.log({
            entityType: 'product',
            entityId: product.id,
            localVersion: product,
            serverVersion: serverProduct,
            conflictFields: conflict.fields,
            severity: conflict.severity,
            resolution: 'merge',
            resolvedVersion: resolvedProduct,
            userId: product.organization_id || 'system',
            organizationId: product.organization_id || '',
            localTimestamp: conflict.localTimestamp,
            serverTimestamp: conflict.serverTimestamp,
            notes: `Auto-resolved: ${conflict.fields.length} fields conflicted`
          });
        }

        // 🔍 STEP 5: Prepare update payload (only necessary fields)
        const updatePayload: any = {
          stock_quantity: resolvedProduct.stock_quantity,
          last_inventory_update: resolvedProduct.last_inventory_update || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // إذا تغيرت حقول metadata أيضاً، أضفها
        if (conflict.hasConflict && conflict.fields.some(f => ['name', 'price', 'description'].includes(f))) {
          if (resolvedProduct.name) updatePayload.name = resolvedProduct.name;
          if (resolvedProduct.price !== undefined) updatePayload.price = resolvedProduct.price;
          if (resolvedProduct.description) updatePayload.description = resolvedProduct.description;
        }

        // 🔍 STEP 6: Update server with resolved version
        try {
          const { error: updErr } = await supabase
            .from('products')
            .update(updatePayload)
            .eq('id', product.id);

          if (updErr) {
            console.error(`[syncProduct] ❌ Update failed: ${updErr.message}`);
            // Fallback: try REST API
            if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
              throw new Error('قيم البيئة غير صالحة');
            }

            const response = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${product.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(updatePayload)
            });

            if (!response.ok) {
              console.error(`[syncProduct] ❌ REST API update also failed for ${product.id}`);
              return false;
            }
          }

          // 🔍 STEP 7: Update local DB with resolved version
          await markProductAsSynced(product.id);

          console.log(`[syncProduct] ✅ Product ${product.id} synced successfully with conflict resolution`);
          success = true;
        } catch (e) {
          console.error(`[syncProduct] ❌ Exception during update:`, e);
          return false;
        }
        break;
      }
      
      case 'delete': {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', product.id);
        
        if (error) {
          return false;
        }
        
        // حذف المنتج من التخزين المحلي بعد نجاح العملية (SQLite)
        await inventoryDB.products.delete(product.id as any);
        success = true;
        break;
      }
    }
    
    // في حالة النجاح، قم بإزالة العنصر من قائمة المزامنة
    if (success) {
      await removeSyncQueueItemsSafely(product.id, 'product');
    }
    
    return success;
  } catch (error) {
    console.error('[syncProduct] Unexpected error syncing product:', product.id, error);
    return false;
  }
};

// مزامنة قائمة المنتجات غير المتزامنة مع Pool محدود
export const syncUnsyncedProducts = async (): Promise<{ success: number; failed: number }> => {
  // 🔒 استخدام Lock لمنع المزامنة المتزامنة من نوافذ متعددة
  const result = await syncLockManager.withLock('products', async () => {
    try {
      console.log('[SyncService] 🔄 Starting products sync...');

      const unsyncedProducts = await getUnsyncedProducts();

      if (unsyncedProducts.length === 0) {
        console.log('[SyncService] ✅ No unsynced products');
        return { success: 0, failed: 0 };
      }

      console.log(`[SyncService] 📦 Found ${unsyncedProducts.length} unsynced products`);

      // تصفية المنتجات غير الصالحة لتجنب محاولات فاشلة متكررة
      const validProducts = unsyncedProducts.filter(p => {
        // التأكد من وجود id و name على الأقل
        return p && p.id && (p.name || (p as any).pendingOperation === 'delete');
      });

      if (validProducts.length === 0) {
        console.log('[SyncService] ⚠️ No valid products to sync');
        return { success: 0, failed: 0 };
      }

      // استخدام Pool للتحكم بالتوازي
      const results = await runWithPool(
        validProducts,
        async (product) => await syncProduct(product),
        SYNC_POOL_SIZE
      );

      const success = results.filter(r => r === true).length;
      const failed = results.filter(r => r === false).length;

      console.log(`[SyncService] ✅ Products sync completed: ${success} success, ${failed} failed`);

      return { success, failed };
    } catch (error) {
      console.error('[SyncService] ❌ Products sync error:', error);
      return { success: 0, failed: 0 };
    }
  }, 60000); // timeout 60 ثانية

  // إذا فشل الحصول على القفل، أرجع نتيجة فارغة
  return result || { success: 0, failed: 0 };
};

// جلب قائمة المزامنة وتنفيذها
export const processSyncQueue = async (): Promise<{ processed: number; failed: number }> => {
  // 🔒 استخدام Lock لمنع معالجة Queue من نوافذ متعددة
  const result = await syncLockManager.withLock('sync_queue', async () => {
    try {
      console.log('[SyncService] 🔄 Starting sync queue processing...');

      const queue: SyncQueueItem[] = [];
      // جمع العناصر من جدول SQLite فقط وتحويل snake_case إلى camelCase
      try {
        const rows = await inventoryDB.syncQueue.toArray();
        for (const row of rows as any[]) {
          const mapped: any = {
            id: row.id,
            objectType: row.objectType ?? row.object_type,
            objectId: row.objectId ?? row.object_id,
            operation: row.operation,
            data: parseMaybeJSON(row.data),
            attempts: row.attempts ?? 0,
            lastAttempt: row.lastAttempt ?? row.last_attempt,
            error: row.error,
            createdAt: row.createdAt ?? row.created_at,
            updatedAt: row.updatedAt ?? row.updated_at,
            priority: row.priority ?? 1
          } as SyncQueueItem;
          queue.push(mapped);
        }
      } catch (e) {
        console.warn('[SyncService] Failed to read sync_queue from SQLite:', e);
        return { processed: 0, failed: 0 };
      }

      // ⚡ Deduplication - إزالة التكرار
      const uniqueQueue = Array.from(
        new Map(
          queue.map(item => [`${item.objectType}:${item.objectId}:${item.operation}`, item])
        ).values()
      );

      if (uniqueQueue.length !== queue.length) {
        console.log(`[SyncService] 🧹 Removed ${queue.length - uniqueQueue.length} duplicate queue items`);
      }

      if (uniqueQueue.length === 0) {
        console.log('[SyncService] ✅ No items in sync queue');
        return { processed: 0, failed: 0 };
      }

      console.log(`[SyncService] 📋 Processing ${uniqueQueue.length} queue items`);

      // ترتيب العناصر حسب الأولوية والعمليات
      uniqueQueue.sort((a, b) => {
        // الإنشاء قبل التحديث قبل الحذف
        if (a.operation !== b.operation) {
          if (a.operation === 'create') return -1;
          if (b.operation === 'create') return 1;
          if (a.operation === 'update') return -1;
          if (b.operation === 'update') return 1;
        }

        // ثم حسب الأولوية (أقل قيمة = أعلى أولوية)
        return a.priority - b.priority;
      });

      let processed = 0;
      let failed = 0;

      for (const item of uniqueQueue) {
        try {
          let success = false;

          // تحقق من صحة البيانات
          if (!item.objectType || !item.objectId) {
            console.warn(`⚠️ [SyncService] عنصر queue غير صالح (بيانات ناقصة) - سيتم حذفه:`, {
              itemId: item.id,
              objectType: item.objectType,
              objectId: item.objectId,
              operation: item.operation,
              attempts: item.attempts
            });
            // حذف العنصر غير الصالح من القائمة
            try {
              await inventoryDB.syncQueue.delete(item.id);
            } catch {}
            processed++;
            continue; // تخطي هذا العنصر
          }

          if (item.objectType === 'product') {
          // جلب آخر نسخة من المنتج - SQLite فقط
          const product = await inventoryDB.products.get(item.objectId) as LocalProduct | undefined;

          if (product) {
            success = await syncProduct(product);
          } else if (item.operation === 'delete') {
            // إذا كان العنصر محذوفاً بالفعل محلياً ولكن العملية هي حذف من الخادم
            const { error } = await supabase
              .from('products')
              .delete()
              .eq('id', item.objectId);
            
            success = !error;
          }
        } else if (item.objectType === 'customer') {
          // جلب آخر نسخة من العميل - SQLite فقط
          const customer = await inventoryDB.customers.get(item.objectId) as LocalCustomer | undefined;
          if (customer) {
            success = await syncCustomer(customer);
          } else if (item.operation === 'delete') {
            // إذا كان العميل محذوفاً بالفعل محلياً ولكن العملية هي حذف من الخادم
            try {
              const { status } = await apiClient.delete(`/rest/v1/customers?id=eq.${item.objectId}`, {
                headers: {
                  'Prefer': 'return=minimal'
                }
              });
              success = status === 200 || status === 204;
            } catch (error) {
              success = false;
            }
          }
        } else if (item.objectType === 'address') {
          // جلب آخر نسخة من العنوان - SQLite فقط
          const address = await inventoryDB.addresses.get(item.objectId) as LocalAddress | undefined;
          if (address) {
            success = await syncAddress(address);
          } else if (item.operation === 'delete') {
            // إذا كان العنوان محذوفاً بالفعل محلياً ولكن العملية هي حذف من الخادم
            try {
              const { status } = await apiClient.delete(`/rest/v1/addresses?id=eq.${item.objectId}`, {
                headers: {
                  'Prefer': 'return=minimal'
                }
              });
              success = status === 200 || status === 204;
            } catch (error) {
              success = false;
            }
          }
        } else if (item.objectType === 'invoice') {
          // مزامنة فاتورة وبنودها
          const invoice = await inventoryDB.invoices.get(item.objectId) as LocalInvoice | undefined;
          if (invoice) {
            success = await syncInvoice(invoice);
          } else if (item.operation === 'delete') {
            try {
              // حذف العناصر أولاً ثم الفاتورة
              await apiClient.delete(`/rest/v1/invoice_items?invoice_id=eq.${item.objectId}`, {
                headers: { 'Prefer': 'return=minimal' }
              });
              const { status } = await apiClient.delete(`/rest/v1/invoices?id=eq.${item.objectId}`, {
                headers: { 'Prefer': 'return=minimal' }
              });
              success = status === 200 || status === 204;
            } catch {
              success = false;
            }
          }
        } else if (item.objectType === 'pos_orders' || item.objectType === 'order') {
          // ✅ طلبات POS تُزامن عبر posOrderService
          // هذا العنصر موجود في القائمة بالخطأ أو تمت معالجته بالفعل
          // نحذفه من القائمة لتجنب الفشل المتكرر
          console.log('[SyncService] ⚠️ POS order in queue - already handled by posOrderService, removing:', item.objectId);
          success = true; // نعتبره نجاح لحذفه من القائمة
        }
        
        if (success) {
          try {
            await inventoryDB.syncQueue.delete(item.id);
          } catch (removeError) {
            // نعتبره معالج حتى لو لم نتمكن من حذفه من القائمة
          }
          processed++;
        } else {
          // فشل المزامنة - تحديث عدد المحاولات
          console.warn(`⚠️ [SyncService] فشلت مزامنة عنصر queue:`, {
            itemId: item.id,
            objectType: item.objectType,
            objectId: item.objectId,
            operation: item.operation,
            currentAttempts: item.attempts,
            nextAttempt: item.attempts + 1
          });
          
          const now = new Date().toISOString();
          const updatedItem: SyncQueueItem = {
            ...item,
            attempts: item.attempts + 1,
            lastAttempt: now,
            updatedAt: now
          };
          
          if (updatedItem.attempts >= 5) {
            // إذا تجاوز عدد المحاولات الحد الأقصى، قم بإزالة العنصر من القائمة
            console.error(`🗑️ [SyncService] حذف عنصر بعد ${updatedItem.attempts} محاولات فاشلة:`, {
              itemId: item.id,
              objectType: item.objectType,
              objectId: item.objectId,
              operation: item.operation
            });
            try {
              await inventoryDB.syncQueue.delete(item.id);
            } catch {}
          } else {
            // حفظ العنصر المُحدث
            try {
              await inventoryDB.syncQueue.put(updatedItem);
            } catch {}
          }
          
          failed++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ [SyncService] فشل معالجة عنصر queue:`, {
          itemId: item.id,
          objectType: item.objectType,
          objectId: item.objectId,
          operation: item.operation,
          attempts: item.attempts,
          error: errorMsg
        });
        failed++;
      }
    }

    if (failed > 0) {
      console.warn(`⚠️ [SyncService] Queue processing completed: ${processed} processed, ${failed} failed`);
    } else {
      console.log(`✅ [SyncService] Queue processing completed: ${processed} processed, ${failed} failed`);
    }

    return { processed, failed };
    } catch (error) {
      console.error('[SyncService] ❌ Queue processing error:', error);
      return { processed: 0, failed: 0 };
    }
  }, 90000); // timeout 90 ثانية للـ queue

  // إذا فشل الحصول على القفل، أرجع نتيجة فارغة
  return result || { processed: 0, failed: 0 };
};

// مزامنة فاتورة واحدة مع الخادم
export const syncInvoice = async (invoice: LocalInvoice): Promise<boolean> => {
  try {
    let success = false;
    const operation = (invoice as any).pendingOperation || 'update';
    const headers = { 'Prefer': 'return=representation' } as any;

    // تحميل عناصر الفاتورة المحلية (SQLite: where('field').equals())
    const items: LocalInvoiceItem[] = await (inventoryDB.invoiceItems as any)
      .where('invoice_id')
      .equals(invoice.id)
      .toArray();

    if (operation === 'create') {
      // إنشاء الفاتورة ثم العناصر
      try {
        const payload: any = {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          customer_id: invoice.customer_id || null,
          total_amount: Number(invoice.total_amount) || 0,
          status: invoice.status,
          organization_id: invoice.organization_id,
          invoice_date: invoice.created_at,
          created_at: invoice.created_at,
          updated_at: new Date().toISOString()
        };
        const invRes = await apiClient.post('/rest/v1/invoices', payload, { headers });
        if (invRes.status !== 201 && invRes.status !== 200) return false;

        if ((items || []).length > 0) {
          const itemPayload = (items || []).map((it) => ({
            id: it.id,
            invoice_id: invoice.id,
            name: it.name,
            description: it.description || null,
            quantity: Number(it.quantity) || 0,
            unit_price: Number(it.unit_price) || 0,
            total_price: Number(it.total_price) || 0,
            product_id: it.product_id || null,
            type: it.type || 'product'
          }));
          const itemsRes = await apiClient.post('/rest/v1/invoice_items', itemPayload as any, { headers });
          if (itemsRes.status !== 201 && itemsRes.status !== 200) return false;
        }

        // تعليم محلي كمزامن
        const now = new Date().toISOString();
        await inventoryDB.invoices.put({ ...invoice, synced: true, syncStatus: 'synced', pendingOperation: undefined, updated_at: now } as any);
        success = true;
      } catch (err) {
        success = false;
      }
    } else if (operation === 'update') {
      try {
        // 🔍 STEP 1: Fetch server version for conflict detection
        console.log(`[syncInvoice] 🔍 Fetching server version for conflict detection: ${invoice.id}`);
        const fetchRes = await apiClient.get(`/rest/v1/invoices?id=eq.${invoice.id}&select=*`);

        if (fetchRes.status === 200 && fetchRes.data.length > 0) {
          const serverInvoice = fetchRes.data[0];

          // 🔍 STEP 2: Detect conflict
          const conflict = conflictDetector.detect(
            invoice,
            serverInvoice as any,
            'invoice',
            {
              criticalFields: ['total_amount', 'paid_amount', 'status'],
              timestampThreshold: 5000,
              ignoreNullUndefined: true
            }
          );

          console.log(
            `[syncInvoice] ${conflict.hasConflict ? '⚠️ CONFLICT' : '✅ No conflict'} detected for ${invoice.id}` +
            (conflict.hasConflict ? ` (severity: ${conflict.severity}, fields: ${conflict.fields.join(', ')})` : '')
          );

          // 🔍 STEP 3: Check if manual resolution required
          if (conflict.hasConflict && conflict.severity >= 60) {
            console.warn(`[syncInvoice] ⚠️ High severity conflict (${conflict.severity}) - requires manual resolution`);

            // Log as manual resolution required
            await conflictLogger.log({
              entityType: 'invoice',
              entityId: invoice.id,
              localVersion: invoice,
              serverVersion: serverInvoice,
              conflictFields: conflict.fields,
              severity: conflict.severity,
              resolution: 'manual',
              resolvedVersion: serverInvoice, // مؤقتاً نحفظ السيرفر
              userId: invoice.organization_id || 'system',
              organizationId: invoice.organization_id || '',
              localTimestamp: conflict.localTimestamp,
              serverTimestamp: conflict.serverTimestamp,
              notes: `Manual resolution required - high severity conflict in invoice`
            });

            // TODO: Add to manual resolution queue UI
            // For now, skip this invoice
            return false;
          }

          // 🔍 STEP 4: Auto-resolve low severity conflicts
          let resolvedInvoice: any;

          if (!conflict.hasConflict) {
            // No conflict - use local version
            resolvedInvoice = {
              total_amount: Number(invoice.total_amount) || 0,
              status: invoice.status,
              updated_at: new Date().toISOString()
            };
          } else {
            // Low severity - resolve automatically (last write wins)
            const resolution = await conflictResolver.resolve(
              invoice,
              serverInvoice as any,
              'merge', // دمج بسيط للفواتير
              'invoice',
              {
                userId: invoice.organization_id || 'system',
                organizationId: invoice.organization_id || '',
                entityType: 'invoice',
                entityId: invoice.id
              }
            );

            resolvedInvoice = {
              total_amount: Number(resolution.data.total_amount) || 0,
              status: resolution.data.status,
              updated_at: new Date().toISOString()
            };

            // 🔍 STEP 5: Log conflict
            await conflictLogger.log({
              entityType: 'invoice',
              entityId: invoice.id,
              localVersion: invoice,
              serverVersion: serverInvoice,
              conflictFields: conflict.fields,
              severity: conflict.severity,
              resolution: 'merge',
              resolvedVersion: resolution.data,
              userId: invoice.organization_id || 'system',
              organizationId: invoice.organization_id || '',
              localTimestamp: conflict.localTimestamp,
              serverTimestamp: conflict.serverTimestamp,
              notes: `Auto-resolved with merge: ${conflict.fields.length} fields conflicted`
            });
          }

          // 🔍 STEP 6: Update server
          const updRes = await apiClient.patch(`/rest/v1/invoices?id=eq.${invoice.id}`, resolvedInvoice, { headers });
          if (updRes.status === 200) {
            await inventoryDB.invoices.put({ ...invoice, synced: true, syncStatus: 'synced', pendingOperation: undefined } as any);
            success = true;
            console.log(`[syncInvoice] ✅ Invoice ${invoice.id} synced successfully with conflict resolution`);
          }
        }
      } catch (err) {
        console.error(`[syncInvoice] ❌ Update failed:`, err);
        success = false;
      }
    } else if (operation === 'delete') {
      try {
        await apiClient.delete(`/rest/v1/invoice_items?invoice_id=eq.${invoice.id}`, { headers: { 'Prefer': 'return=minimal' } });
        const delRes = await apiClient.delete(`/rest/v1/invoices?id=eq.${invoice.id}`, { headers: { 'Prefer': 'return=minimal' } });
        if (delRes.status === 200 || delRes.status === 204) {
          // حذف محلياً
          try {
            const localItems = await inventoryDB.invoiceItems.where({ invoice_id: invoice.id }).toArray();
            for (const it of (localItems || [])) await inventoryDB.invoiceItems.delete((it as any).id);
          } catch {}
          await inventoryDB.invoices.delete(invoice.id);
          success = true;
        }
      } catch {
        success = false;
      }
    }

    return success;
  } catch {
    return false;
  }
};

// مزامنة عميل واحد مع الخادم
export const syncCustomer = async (customer: LocalCustomer): Promise<boolean> => {
  try {
    let success = false;
    
    // تحديد العملية المطلوبة بناءً على حالة العميل
    const operation = customer.pendingOperation || 'update';
    
    // رؤوس إضافية لطلبات Supabase
    const supabaseHeaders = {
      'Prefer': 'return=representation',
      // تجنب استخدام withCredentials أو رؤوس غير ضرورية
    };
    
    switch (operation) {
      case 'create': {
        try {
          // استخدام Supabase REST API مباشرة
          const response = await apiClient.post('/rest/v1/customers', {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            organization_id: customer.organization_id,
          }, {
            headers: supabaseHeaders
          });
          
          if (response.status === 201 || response.status === 200) {
            // تحديث العميل المحلي بعد نجاح عملية الإنشاء
            const updatedCustomer: LocalCustomer = {
              ...customer,
              synced: true,
              syncStatus: 'synced',
              lastSyncAttempt: new Date().toISOString(),
              pendingOperation: undefined
            };
            
            await inventoryDB.customers.put(updatedCustomer as any);
            success = true;
          }
        } catch (error) {
        }
        break;
      }
      
      case 'update': {
        try {
          // 🔍 STEP 1: Fetch server version for conflict detection
          console.log(`[syncCustomer] 🔍 Fetching server version for conflict detection: ${customer.id}`);
          const checkResponse = await apiClient.get(`/rest/v1/customers?id=eq.${customer.id}&select=*`);

          if (checkResponse.status === 200 && checkResponse.data.length > 0) {
            const serverCustomer = checkResponse.data[0];

            // 🔍 STEP 2: Detect conflict
            const conflict = conflictDetector.detect(
              customer,
              serverCustomer,
              'customer',
              {
                criticalFields: ['name', 'email', 'phone'],
                timestampThreshold: 5000,
                ignoreNullUndefined: true
              }
            );

            console.log(
              `[syncCustomer] ${conflict.hasConflict ? '⚠️ CONFLICT' : '✅ No conflict'} detected for ${customer.id}` +
              (conflict.hasConflict ? ` (severity: ${conflict.severity}, fields: ${conflict.fields.join(', ')})` : '')
            );

            let resolvedCustomer: any;

            if (!conflict.hasConflict) {
              // No conflict - use local version
              resolvedCustomer = {
                name: customer.name,
                email: customer.email,
                phone: customer.phone
              };
            } else {
              // 🔍 STEP 3: Resolve conflict using server_wins strategy
              const resolution = await conflictResolver.resolve(
                customer,
                serverCustomer,
                'server_wins', // استراتيجية العملاء: السيرفر يفوز
                'customer',
                {
                  userId: customer.organization_id || 'system',
                  organizationId: customer.organization_id || '',
                  entityType: 'customer',
                  entityId: customer.id
                }
              );

              resolvedCustomer = {
                name: resolution.data.name,
                email: resolution.data.email,
                phone: resolution.data.phone
              };

              // 🔍 STEP 4: Log conflict
              await conflictLogger.log({
                entityType: 'customer',
                entityId: customer.id,
                localVersion: customer,
                serverVersion: serverCustomer,
                conflictFields: conflict.fields,
                severity: conflict.severity,
                resolution: 'server_wins',
                resolvedVersion: resolution.data,
                userId: customer.organization_id || 'system',
                organizationId: customer.organization_id || '',
                localTimestamp: conflict.localTimestamp,
                serverTimestamp: conflict.serverTimestamp,
                notes: `Auto-resolved with server_wins: ${conflict.fields.length} fields conflicted`
              });
            }

            // 🔍 STEP 5: Update server with resolved version
            const updateResponse = await apiClient.patch(`/rest/v1/customers?id=eq.${customer.id}`, resolvedCustomer, {
              headers: supabaseHeaders
            });
            
            if (updateResponse.status === 200) {
              // تحديث العميل المحلي بعد نجاح عملية التحديث
              const updatedCustomer: LocalCustomer = {
                ...customer,
                synced: true,
                syncStatus: 'synced',
                lastSyncAttempt: new Date().toISOString(),
                pendingOperation: undefined
              };
              
              await inventoryDB.customers.put(updatedCustomer as any);
              success = true;
            }
          } else {
            // إذا لم يكن العميل موجودًا على الخادم، قم بإنشائه
            return await syncCustomer({
              ...customer,
              pendingOperation: 'create'
            });
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            // إذا لم يتم العثور على العميل، قم بإنشائه
            return await syncCustomer({
              ...customer,
              pendingOperation: 'create'
            });
          }
        }
        break;
      }
      
      case 'delete': {
        try {
          // حذف العميل على الخادم
          const { status } = await apiClient.delete(`/rest/v1/customers?id=eq.${customer.id}`, {
            headers: {
              'Prefer': 'return=minimal'
            }
          });
          
          if (status === 200 || status === 204) {
            // حذف العميل من التخزين المحلي بعد نجاح العملية
            await inventoryDB.customers.delete(customer.id as any);
            success = true;
          }
        } catch (error) {
        }
        break;
      }
    }
    
    // في حالة النجاح، قم بإزالة العنصر من قائمة المزامنة
    if (success) {
      await removeSyncQueueItemsSafely(customer.id, 'customer');
    }
    
    return success;
  } catch (error) {
    return false;
  }
};

// مزامنة قائمة العملاء غير المتزامنة مع Pool محدود
export const syncUnsyncedCustomers = async (): Promise<{ success: number; failed: number }> => {
  try {
    const unsyncedCustomers = await getUnsyncedCustomers();
    
    if (unsyncedCustomers.length === 0) {
      return { success: 0, failed: 0 };
    }

    // استخدام Pool للتحكم بالتوازي
    const results = await runWithPool(
      unsyncedCustomers,
      async (customer) => await syncCustomer(customer),
      SYNC_POOL_SIZE
    );

    const success = results.filter(r => r === true).length;
    const failed = results.filter(r => r === false).length;
    
    return { success, failed };
  } catch (error) {
    return { success: 0, failed: 0 };
  }
};

// مزامنة عنوان واحد مع الخادم
export const syncAddress = async (address: LocalAddress): Promise<boolean> => {
  try {
    let success = false;
    
    // تحديد العملية المطلوبة بناءً على حالة العنوان
    const operation = address.pendingOperation || 'update';
    
    // رؤوس إضافية لطلبات Supabase
    const supabaseHeaders = {
      'Prefer': 'return=representation',
      // تجنب استخدام withCredentials أو رؤوس غير ضرورية
    };
    
    switch (operation) {
      case 'create': {
        try {
          // استخدام Supabase REST API مباشرة
          const response = await apiClient.post('/rest/v1/addresses', {
            id: address.id,
            customer_id: address.customer_id,
            name: address.name,
            street_address: address.street_address,
            city: address.city,
            state: address.state,
            postal_code: address.postal_code,
            country: address.country,
            phone: address.phone,
            is_default: address.is_default,
            organization_id: address.organization_id,
          }, {
            headers: supabaseHeaders
          });
          
          if (response.status === 201 || response.status === 200) {
            // تحديث العنوان المحلي بعد نجاح عملية الإنشاء
            const updatedAddress: LocalAddress = {
              ...address,
              synced: true,
              syncStatus: 'synced',
              lastSyncAttempt: new Date().toISOString(),
              pendingOperation: undefined
            };
            
            await inventoryDB.addresses.put(updatedAddress as any);
            success = true;
          }
        } catch (error) {
        }
        break;
      }
      
      case 'update': {
        try {
          // 🔍 STEP 1: Fetch server version for conflict detection
          console.log(`[syncAddress] 🔍 Fetching server version for conflict detection: ${address.id}`);
          const checkResponse = await apiClient.get(`/rest/v1/addresses?id=eq.${address.id}&select=*`);

          if (checkResponse.status === 200 && checkResponse.data.length > 0) {
            const serverAddress = checkResponse.data[0];

            // 🔍 STEP 2: Detect conflict
            const conflict = conflictDetector.detect(
              address,
              serverAddress as any,
              'address',
              {
                criticalFields: ['street_address', 'city', 'phone'],
                timestampThreshold: 5000,
                ignoreNullUndefined: true
              }
            );

            console.log(
              `[syncAddress] ${conflict.hasConflict ? '⚠️ CONFLICT' : '✅ No conflict'} detected for ${address.id}` +
              (conflict.hasConflict ? ` (severity: ${conflict.severity}, fields: ${conflict.fields.join(', ')})` : '')
            );

            let resolvedAddress: any;

            if (!conflict.hasConflict) {
              // No conflict - use local version
              resolvedAddress = {
                name: address.name,
                street_address: address.street_address,
                city: address.city,
                state: address.state,
                postal_code: address.postal_code,
                country: address.country,
                phone: address.phone,
                is_default: address.is_default
              };
            } else {
              // 🔍 STEP 3: Resolve conflict using server_wins strategy
              const resolution = await conflictResolver.resolve(
                address,
                serverAddress as any,
                'server_wins', // استراتيجية العناوين: السيرفر يفوز
                'address',
                {
                  userId: address.organization_id || 'system',
                  organizationId: address.organization_id || '',
                  entityType: 'address',
                  entityId: address.id
                }
              );

              resolvedAddress = {
                name: resolution.data.name,
                street_address: resolution.data.street_address,
                city: resolution.data.city,
                state: resolution.data.state,
                postal_code: resolution.data.postal_code,
                country: resolution.data.country,
                phone: resolution.data.phone,
                is_default: resolution.data.is_default
              };

              // 🔍 STEP 4: Log conflict
              await conflictLogger.log({
                entityType: 'address',
                entityId: address.id,
                localVersion: address,
                serverVersion: serverAddress,
                conflictFields: conflict.fields,
                severity: conflict.severity,
                resolution: 'server_wins',
                resolvedVersion: resolution.data,
                userId: address.organization_id || 'system',
                organizationId: address.organization_id || '',
                localTimestamp: conflict.localTimestamp,
                serverTimestamp: conflict.serverTimestamp,
                notes: `Auto-resolved with server_wins: ${conflict.fields.length} fields conflicted`
              });
            }

            // 🔍 STEP 5: Update server with resolved version
            const updateResponse = await apiClient.patch(`/rest/v1/addresses?id=eq.${address.id}`, resolvedAddress, {
              headers: supabaseHeaders
            });

            if (updateResponse.status === 200) {
              // تحديث العنوان المحلي بعد نجاح عملية التحديث
              const updatedAddress: LocalAddress = {
                ...address,
                synced: true,
                syncStatus: 'synced',
                lastSyncAttempt: new Date().toISOString(),
                pendingOperation: undefined
              };
              
              await inventoryDB.addresses.put(updatedAddress as any);
              success = true;
            }
          } else {
            // إذا لم يكن العنوان موجودًا على الخادم، قم بإنشائه
            return await syncAddress({
              ...address,
              pendingOperation: 'create'
            });
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            // إذا لم يتم العثور على العنوان، قم بإنشائه
            return await syncAddress({
              ...address,
              pendingOperation: 'create'
            });
          }
        }
        break;
      }
      
      case 'delete': {
        try {
          // حذف العنوان على الخادم
          const { status } = await apiClient.delete(`/rest/v1/addresses?id=eq.${address.id}`, {
            headers: {
              'Prefer': 'return=minimal'
            }
          });
          
          if (status === 200 || status === 204) {
            // حذف العنوان من التخزين المحلي بعد نجاح العملية
            await inventoryDB.addresses.delete(address.id as any);
            success = true;
          }
        } catch (error) {
        }
        break;
      }
    }
    
    // في حالة النجاح، قم بإزالة العنصر من قائمة المزامنة
    if (success) {
      await removeSyncQueueItemsSafely(address.id, 'address');
    }
    
    return success;
  } catch (error) {
    return false;
  }
};

// مزامنة قائمة العناوين غير المتزامنة مع Pool محدود
export const syncUnsyncedAddresses = async (): Promise<{ success: number; failed: number }> => {
  try {
    // جمع جميع العناوين غير المتزامنة من SQLite
    const all = await (inventoryDB.addresses as any).toArray();
    const addresses: LocalAddress[] = (all || []).filter((address: any) => {
      return !address.synced || address.syncStatus === 'pending' || address.syncStatus === 'error';
    });
    
    if (addresses.length === 0) {
      return { success: 0, failed: 0 };
    }

    // استخدام Pool للتحكم بالتوازي
    const results = await runWithPool(
      addresses,
      async (address) => await syncAddress(address),
      SYNC_POOL_SIZE
    );

    const success = results.filter(r => r === true).length;
    const failed = results.filter(r => r === false).length;
    
    return { success, failed };
  } catch (error) {
    return { success: 0, failed: 0 };
  }
};

/**
 * تحميل المنتجات من السيرفر وحفظها في SQLite
 * هذه الدالة تُستخدم لملء SQLite بالمنتجات عند أول تشغيل أو بعد مسح البيانات
 */
export const syncProductsFromServer = async (organizationId: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> => {
  try {
    console.log('[syncProductsFromServer] 🔄 Starting products download from server...', { organizationId });

    if (!organizationId) {
      console.error('[syncProductsFromServer] ❌ No organization ID provided');
      return { success: false, count: 0, error: 'No organization ID' };
    }

    // جلب عدد المنتجات أولاً
    const { count: totalCount, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (countError) {
      console.error('[syncProductsFromServer] ❌ Error counting products:', countError);
      return { success: false, count: 0, error: countError.message };
    }

    console.log('[syncProductsFromServer] 📊 Total products on server:', totalCount);

    if (!totalCount || totalCount === 0) {
      console.log('[syncProductsFromServer] ℹ️ No products found on server');
      return { success: true, count: 0 };
    }

    // جلب جميع المنتجات باستخدام pagination
    let allProducts: any[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const offset = page * pageSize;
      console.log('[syncProductsFromServer] 📥 Fetching page', { page: page + 1, offset, limit: pageSize });

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('[syncProductsFromServer] ❌ Error fetching products:', error);
        return { success: false, count: allProducts.length, error: error.message };
      }

      if (data && data.length > 0) {
        allProducts = allProducts.concat(data);
        hasMore = data.length === pageSize;
        page++;
        
        console.log('[syncProductsFromServer] 📦 Fetched', {
          pageCount: data.length,
          totalFetched: allProducts.length,
          hasMore
        });
      } else {
        hasMore = false;
      }

      // حد أقصى 10 صفحات لتجنب الحلقات اللانهائية
      if (page >= 10) {
        console.warn('[syncProductsFromServer] ⚠️ Reached max pages limit (10)');
        break;
      }
    }

    console.log('[syncProductsFromServer] ✅ All products fetched:', {
      total: allProducts.length,
      expected: totalCount
    });

    // حفظ المنتجات في SQLite
    if (allProducts.length > 0) {
      console.log('[syncProductsFromServer] 💾 Saving products to SQLite...');
      
      let savedCount = 0;
      let errorCount = 0;

      // حفظ المنتجات بشكل متوازي (في مجموعات)
      const batchSize = 50;
      for (let i = 0; i < allProducts.length; i += batchSize) {
        const batch = allProducts.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
          batch.map(async (product) => {
            try {
              // إضافة حقول البحث المفهرسة
              const productToSave = {
                ...product,
                name_lower: (product.name || '').toLowerCase(),
                sku_lower: (product.sku || '').toLowerCase(),
                barcode_lower: (product.barcode || '').toLowerCase(),
                synced: true,
                localUpdatedAt: new Date().toISOString()
              };
              
              await inventoryDB.products.put(productToSave);
              return { success: true };
            } catch (err) {
              console.error('[syncProductsFromServer] ❌ Error saving product:', {
                productId: product.id,
                error: err
              });
              return { success: false };
            }
          })
        );

        const batchSuccess = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
        const batchErrors = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !(r.value as any).success)).length;
        
        savedCount += batchSuccess;
        errorCount += batchErrors;

        console.log('[syncProductsFromServer] 📊 Batch progress:', {
          batchStart: i + 1,
          batchEnd: Math.min(i + batchSize, allProducts.length),
          saved: batchSuccess,
          errors: batchErrors,
          totalSaved: savedCount,
          totalErrors: errorCount
        });
      }

      console.log('[syncProductsFromServer] ✅ Products saved to SQLite:', {
        total: allProducts.length,
        saved: savedCount,
        errors: errorCount
      });

      return { success: errorCount === 0, count: savedCount };
    }

    return { success: true, count: 0 };
  } catch (error: any) {
    console.error('[syncProductsFromServer] ❌ Fatal error:', error);
    return { success: false, count: 0, error: error?.message || 'Unknown error' };
  }
};

// مزامنة البيانات المحلية مع الخادم
export const synchronizeWithServer = async (): Promise<boolean> => {
  // 🔒 استخدام Global Lock لمنع المزامنة المتعددة المتزامنة
  const result = await syncLockManager.withLock('global_sync', async () => {
    try {
      console.log('[SyncService] 🌐 Starting global synchronization...');

      // 📥 فحص إذا كانت SQLite فارغة من المنتجات - تحميل من السيرفر
      try {
        const orgId = (typeof localStorage !== 'undefined' && localStorage.getItem('bazaar_organization_id')) || '';
        if (orgId) {
          const localProductsCount = await inventoryDB.products
            .where('organization_id')
            .equals(orgId)
            .count();
          
          console.log('[SyncService] 📊 Local products count:', localProductsCount);
          
          if (localProductsCount === 0) {
            console.log('[SyncService] 📥 SQLite is empty - downloading products from server...');
            const downloadResult = await syncProductsFromServer(orgId);
            console.log('[SyncService] 📥 Products download result:', downloadResult);
          }
        }
      } catch (downloadError) {
        console.warn('[SyncService] ⚠️ Failed to check/download products:', downloadError);
        // تجاهل الخطأ والمتابعة مع باقي المزامنة
      }

      // مزامنة المنتجات غير المتزامنة
      const productsResult = await syncUnsyncedProducts();
      console.log(`[SyncService] Products: ${productsResult.success} success, ${productsResult.failed} failed`);

      // مزامنة العملاء غير المتزامنة
      const customersResult = await syncUnsyncedCustomers();
      console.log(`[SyncService] Customers: ${customersResult.success} success, ${customersResult.failed} failed`);

      // مزامنة العناوين غير المتزامنة
      const addressesResult = await syncUnsyncedAddresses();
      console.log(`[SyncService] Addresses: ${addressesResult.success} success, ${addressesResult.failed} failed`);

      // ⚠️ مهم: مزامنة طلبيات POS أولاً قبل الديون
      // الديون تحتاج الطلبيات موجودة في السيرفر لتحديث remaining_amount
      try {
        const { syncPendingPOSOrders } = await import('@/context/shop/posOrderService');
        const posOrdersResult = await syncPendingPOSOrders();
        console.log(`[SyncService] POS Orders: ${posOrdersResult.synced} synced, ${posOrdersResult.failed} failed`);
      } catch (posErr) {
        console.warn('[SyncService] POS Orders sync failed:', posErr);
      }

      // معالجة قائمة المزامنة (منتجات، عملاء، عناوين)
      const queueResult = await processSyncQueue();
      console.log(`[SyncService] Queue: ${queueResult.processed} processed, ${queueResult.failed} failed`);

      // مزامنة ديون العملاء غير المتزامنة (بعد الطلبيات)
      try {
        const debtsResult = await syncPendingCustomerDebts();
        console.log(`[SyncService] Debts: ${debtsResult.success} success, ${debtsResult.failed} failed`);
      } catch (debtsErr) {
        console.warn('[SyncService] Debts sync failed:', debtsErr);
      }

      // Server Win: مزامنة إعدادات POS من السيرفر إلى المحلي (مع caching)
      try {
        const now = Date.now();
        const shouldSync = !lastPosSettingsSyncTime || (now - lastPosSettingsSyncTime) >= POS_SETTINGS_CACHE_DURATION;

        if (shouldSync) {
          const orgId = (typeof localStorage !== 'undefined' && localStorage.getItem('bazaar_organization_id')) || '';
          if (orgId) {
            const { data: settings, error: settingsError } = await supabase
              .from('pos_settings')
              .select('*')
              .eq('organization_id', orgId)
              .maybeSingle();
            if (!settingsError && settings) {
              await localPosSettingsService.save({
                ...(settings as any),
                organization_id: orgId,
                synced: true,
                pending_sync: false
              } as any);
              lastPosSettingsSyncTime = now;
              console.log('[SyncService] POS settings synced from server');
            }
          }
        }
      } catch (settingsError) {
        console.warn('[SyncService] Failed to sync POS settings:', settingsError);
        // تجاهل أي خطأ في مزامنة الإعدادات
      }

      console.log('[SyncService] ✅ Global synchronization completed successfully');
      return true;
    } catch (error) {
      console.error('[SyncService] ❌ Global synchronization failed:', error);
      return false;
    }
  }, 180000); // timeout 3 دقائق للمزامنة الشاملة

  // إذا فشل الحصول على القفل، أرجع false
  return result !== null ? result : false;
};
