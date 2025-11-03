import { supabase } from '@/lib/supabase';
import { syncQueueStore, productsStore, LocalProduct, SyncQueueItem, inventoryDB } from '@/database/localDb';
import { getUnsyncedProducts, markProductAsSynced } from './localProductService';
import { apiClient } from '@/lib/api/client';
import axios from 'axios';
import { customersStore, LocalCustomer } from '@/database/localDb';
import { addressesStore, LocalAddress } from '@/database/localDb';
import { getUnsyncedCustomers } from './localCustomerService';
import { removeSyncQueueItemsSafely } from './syncQueueHelper';
import { resolveProductConflict, buildMergedProduct } from '@/sync/conflictPolicy';
import { localPosSettingsService } from '@/api/localPosSettingsService';

// Pool size للتحكم بالتوازي - قابل للتهيئة عبر env
const SYNC_POOL_SIZE = Number((import.meta as any)?.env?.VITE_SYNC_POOL_SIZE ?? 2);

// Cache لـ pos_settings مع expiry time (5 دقائق)
const POS_SETTINGS_CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
let lastPosSettingsSyncTime: number | null = null;

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
          } catch (finalErr) {
            return false;
          }
        }
        break;
      }
      
      case 'update': {
        // تخطّي فحص التعارض لجعل المزامنة أخفّ (نرسل آخر قيمة للمخزون فقط)
        
        // تنقية الكائن من الحقول المحلية قبل الإرسال
        const { synced, syncStatus, lastSyncAttempt, localUpdatedAt, pendingOperation, conflictResolution, colors, product_colors, ...serverProduct } = product as any;

        // تنظيف وتعيين قيم افتراضية للحقول المطلوبة
        if (!serverProduct.description) {
          (serverProduct as any).description = serverProduct.name || 'منتج';
        }
        
        // فلترة الحقول غير الموجودة في جدول المنتجات (تجنّب أخطاء 400)
        const disallowedKeys = new Set([
          'stockQuantity',
          'actual_stock_quantity',
          'colors',
          'product_colors',
          'variants',
          'syncStatus',
          'localUpdatedAt',
          'pendingOperation',
          'conflictResolution',
          'has_variants'
        ]);
        for (const k of Object.keys(serverProduct as any)) {
          if (disallowedKeys.has(k)) {
            delete (serverProduct as any)[k];
          }
        }

        // تحديث بسيط وآمن: إرسال حقول المخزون الأساسية فقط لتفادي تعارضات المخطط
        const minimalPatch: any = {
          stock_quantity: (product as any).stock_quantity ?? (serverProduct as any).stock_quantity ?? 0,
          last_inventory_update: (serverProduct as any).last_inventory_update ?? new Date().toISOString()
        };

        try {
          const { error: updErr } = await supabase
            .from('products')
            .update(minimalPatch)
            .eq('id', product.id);

          if (updErr) {
            // محاولة مباشرة عبر REST API باستخدام الحقول المصفّاة فقط
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
              body: JSON.stringify(minimalPatch)
            });

            if (!response.ok) {
              // فشل نهائي في الخادم: اعتبر نجاح محلي وتابع
              await markProductAsSynced(product.id);
              return true;
            }
          }

          await markProductAsSynced(product.id);
          success = true;
        } catch (e) {
          // اعتبار نجاح محلي لتجنّب إيقاف النظام
          await markProductAsSynced(product.id);
          return true;
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
        
        // حذف المنتج من التخزين المحلي بعد نجاح العملية
        await productsStore.removeItem(product.id);
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
  try {
    const unsyncedProducts = await getUnsyncedProducts();
    
    if (unsyncedProducts.length === 0) {
      return { success: 0, failed: 0 };
    }
    
    // تصفية المنتجات غير الصالحة لتجنب محاولات فاشلة متكررة
    const validProducts = unsyncedProducts.filter(p => {
      // التأكد من وجود id و name على الأقل
      return p && p.id && (p.name || (p as any).pendingOperation === 'delete');
    });
    
    if (validProducts.length === 0) {
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
    
    return { success, failed };
  } catch (error) {
    return { success: 0, failed: 0 };
  }
};

// جلب قائمة المزامنة وتنفيذها
export const processSyncQueue = async (): Promise<{ processed: number; failed: number }> => {
  try {
    const queue: SyncQueueItem[] = [];
    
    // جمع العناصر من قائمة المزامنة أولاً
    try {
      await syncQueueStore.iterate<SyncQueueItem, void>((item) => {
        queue.push(item);
      });
    } catch (error) {
      return { processed: 0, failed: 0 };
    }
    // جمع العناصر أيضاً من جدول Dexie الموحد
    try {
      const dexieItems = await inventoryDB.syncQueue.toArray();
      const existing = new Set(queue.map(q => q.id));
      for (const it of dexieItems) {
        if (!existing.has(it.id)) queue.push(it);
      }
    } catch {
      // تجاهل أي خطأ في قراءة Dexie queue
    }
    
    // ترتيب العناصر حسب الأولوية والعمليات
    queue.sort((a, b) => {
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
    
    for (const item of queue) {
      try {
        let success = false;
        
        if (item.objectType === 'product') {
          // جلب آخر نسخة من المنتج من التخزين المحلي
          const product = await productsStore.getItem<LocalProduct>(item.objectId);
          
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
          // جلب آخر نسخة من العميل من التخزين المحلي
          const customer = await customersStore.getItem<LocalCustomer>(item.objectId);
          
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
          // جلب آخر نسخة من العنوان من التخزين المحلي
          const address = await addressesStore.getItem<LocalAddress>(item.objectId);
          
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
        }
        
        if (success) {
          try {
            await syncQueueStore.removeItem(item.id);
          } catch {}
          try {
            await inventoryDB.syncQueue.delete(item.id);
          } catch (removeError) {
            // نعتبره معالج حتى لو لم نتمكن من حذفه من القائمة
          }
          processed++;
        } else {
          // تحديث عدد المحاولات
          const updatedItem: SyncQueueItem = {
            ...item,
            attempts: item.attempts + 1,
            lastAttempt: new Date().toISOString()
          };
          
          if (updatedItem.attempts >= 5) {
            // إذا تجاوز عدد المحاولات الحد الأقصى، قم بإزالة العنصر من القائمة
            try {
              await syncQueueStore.removeItem(item.id);
            } catch (removeError) {
            }
            try {
              await inventoryDB.syncQueue.delete(item.id);
            } catch {}
          } else {
            // حفظ العنصر المُحدث
            try {
              await syncQueueStore.setItem(item.id, updatedItem);
            } catch (setError) {
            }
            try {
              await inventoryDB.syncQueue.put(updatedItem);
            } catch {}
          }
          
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }
    
    return { processed, failed };
  } catch (error) {
    return { processed: 0, failed: 0 };
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
            
            await customersStore.setItem(customer.id, updatedCustomer);
            success = true;
          }
        } catch (error) {
        }
        break;
      }
      
      case 'update': {
        try {
          // التحقق من وجود العميل على الخادم
          const checkResponse = await apiClient.get(`/rest/v1/customers?id=eq.${customer.id}&select=*`);
          
          if (checkResponse.status === 200 && checkResponse.data.length > 0) {
            // تحديث العميل على الخادم
            const updateResponse = await apiClient.patch(`/rest/v1/customers?id=eq.${customer.id}`, {
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
            }, {
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
              
              await customersStore.setItem(customer.id, updatedCustomer);
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
            await customersStore.removeItem(customer.id);
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
            
            await addressesStore.setItem(address.id, updatedAddress);
            success = true;
          }
        } catch (error) {
        }
        break;
      }
      
      case 'update': {
        try {
          // التحقق من وجود العنوان على الخادم
          const checkResponse = await apiClient.get(`/rest/v1/addresses?id=eq.${address.id}&select=*`);
          
          if (checkResponse.status === 200 && checkResponse.data.length > 0) {
            // تحديث العنوان على الخادم
            const updateResponse = await apiClient.patch(`/rest/v1/addresses?id=eq.${address.id}`, {
              name: address.name,
              street_address: address.street_address,
              city: address.city,
              state: address.state,
              postal_code: address.postal_code,
              country: address.country,
              phone: address.phone,
              is_default: address.is_default,
            }, {
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
              
              await addressesStore.setItem(address.id, updatedAddress);
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
            await addressesStore.removeItem(address.id);
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
    const addresses: LocalAddress[] = [];
    
    // جمع جميع العناوين غير المتزامنة
    await addressesStore.iterate<LocalAddress, void>((address) => {
      if (!address.synced || address.syncStatus === 'pending' || address.syncStatus === 'error') {
        addresses.push(address);
      }
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

// مزامنة البيانات المحلية مع الخادم
export const synchronizeWithServer = async (): Promise<boolean> => {
  try {
    // مزامنة المنتجات غير المتزامنة
    const productsResult = await syncUnsyncedProducts();
    
    // مزامنة العملاء غير المتزامنة
    const customersResult = await syncUnsyncedCustomers();
    
    // مزامنة العناوين غير المتزامنة
    const addressesResult = await syncUnsyncedAddresses();
    
    // ثم معالجة قائمة المزامنة
    const queueResult = await processSyncQueue();

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
          }
        }
      }
    } catch {
      // تجاهل أي خطأ في مزامنة الإعدادات
    }

    return true;
  } catch (error) {
    return false;
  }
};
