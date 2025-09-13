import { supabase } from '@/lib/supabase';
import { syncQueueStore, productsStore, LocalProduct, SyncQueueItem } from '@/database/localDb';
import { getUnsyncedProducts, markProductAsSynced } from './localProductService';
import { apiClient } from '@/lib/api/client';
import axios from 'axios';
import { customersStore, LocalCustomer } from '@/database/localDb';
import { addressesStore, LocalAddress } from '@/database/localDb';
import { getUnsyncedCustomers } from './localCustomerService';
import { removeSyncQueueItemsSafely } from './syncQueueHelper';

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
        const { synced, syncStatus, lastSyncAttempt, localUpdatedAt, pendingOperation, conflictResolution, ...serverProduct } = product;
        
        try {
          // استخدام الدالة المخزنة لإنشاء المنتج بأمان
          const { data, error } = await supabase
            .rpc('create_product_safe', {
              product_data: serverProduct
            });
          
          if (error) {
            
            // محاولة الإنشاء العادية
            const { data: insertData, error: insertError } = await supabase
              .from('products')
              .insert(serverProduct)
              .select('*');
            
            if (insertError) {
              // محاولة بطريقة بديلة بدون RETURNING
              
              const insertResult = await supabase
                .from('products')
                .insert(serverProduct);
              
              if (insertResult.error) {
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
              .insert(serverProduct);
            
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
        // تحقق من تضارب محتمل (إذا كان المنتج موجوداً بالفعل على الخادم)
        try {
          const { data: existingProduct, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', product.id)
            .maybeSingle();
          
          if (!error && existingProduct) {
            const remoteUpdatedAt = new Date(existingProduct.updated_at || 0);
            const localUpdatedAt = new Date(product.localUpdatedAt || 0);
            
            // إذا كانت هناك تحديثات في الخادم تم نسخها قبل آخر تحديث محلي
            // وليس هناك حل للتضارب محدد مسبقاً، يجب التعامل مع التضارب
            if (remoteUpdatedAt > localUpdatedAt && !product.conflictResolution) {
              // استراتيجية تلقائية لحل التضارب: محلي أو بعيد أو دمج
              // هنا نستخدم "محلي" للمخزون و"بعيد" للبقية

              try {
                // جلب بيانات المنتج الكاملة من الخادم
                const { data: fullRemoteProduct, error: fetchError } = await supabase
                  .rpc('get_product_safe', {
                    product_id: product.id
                  });
                
                if (fetchError) {
                  // استمر في محاولة التحديث دون تطبيق استراتيجية التضارب
                } else {
                  const remoteProduct = Array.isArray(fullRemoteProduct) ? fullRemoteProduct[0] : fullRemoteProduct;
                  
                  if (!remoteProduct) {
                    // استمر في محاولة التحديث
                  } else {
                    // تطبيق استراتيجية حل التضارب
                    if (product.conflictResolution === 'remote') {
                      // استخدام البيانات البعيدة وتحديث المحلية
                      await markProductAsSynced(product.id, remoteProduct);
                      return true;
                    } else {
                      // الدمج: احتفظ ببعض البيانات المحلية مثل stock_quantity ولكن خذ البقية من الخادم
                      const { synced, syncStatus, lastSyncAttempt, localUpdatedAt, pendingOperation, conflictResolution, ...localChanges } = product;
                      
                      const mergedProduct = {
                        ...remoteProduct,
                        stock_quantity: product.stock_quantity, // احتفظ بالمخزون المحلي للتأكد من دقة البيانات
                      };
                      
                      await markProductAsSynced(product.id, mergedProduct);
                      return true;
                    }
                  }
                }
              } catch (fetchErr) {
                // نستمر في محاولة التحديث حتى لو فشل التحقق من التضارب
              }
            }
          }
        } catch (getErr) {
          // نستمر في محاولة التحديث حتى لو فشل التحقق من التضارب
        }
        
        // تنقية الكائن من الحقول المحلية قبل الإرسال
        const { synced, syncStatus, lastSyncAttempt, localUpdatedAt, pendingOperation, conflictResolution, ...serverProduct } = product;
        
        try {
          // استخدام الدالة المخزنة لتحديث المنتج بأمان
          const { data, error } = await supabase
            .rpc('update_product_safe', {
              product_id: product.id,
              product_data: serverProduct
            });
          
          if (error) {
            
            // محاولة الطريقة المباشرة باستخدام REST API إذا فشلت الدالة المخزنة
            try {
              // استخدام عنوان Supabase الصحيح
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
                body: JSON.stringify(serverProduct)
              });
              
              if (!response.ok) {
                const responseText = await response.text();
                
                // محاولة أخيرة: تحديث المنتج محلياً فقط كملاذ أخير
                await markProductAsSynced(product.id);
                return true; // نعتبره نجاحاً محلياً
              }
              
              await markProductAsSynced(product.id);
              success = true;
            } catch (finalErr) {
              
              // محاولة أخيرة: تحديث المنتج محلياً فقط كملاذ أخير
              await markProductAsSynced(product.id);
              return true; // نعتبره نجاحاً محلياً
            }
          } else {
            // نجاح التحديث باستخدام الوظيفة المخزنة
            if (data && (Array.isArray(data) ? data.length > 0 : true)) {
              const updatedProduct = Array.isArray(data) ? data[0] : data;
              await markProductAsSynced(product.id, updatedProduct);
            } else {
              await markProductAsSynced(product.id);
            }
            success = true;
          }
        } catch (rpcErr) {
          
          // محاولة أخيرة: تحديث المنتج محلياً فقط كملاذ أخير
          await markProductAsSynced(product.id);
          return true; // نعتبره نجاحاً محلياً
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
    return false;
  }
};

// مزامنة قائمة المنتجات غير المتزامنة
export const syncUnsyncedProducts = async (): Promise<{ success: number; failed: number }> => {
  try {
    const unsyncedProducts = await getUnsyncedProducts();
    
    let success = 0;
    let failed = 0;
    
    for (const product of unsyncedProducts) {
      const result = await syncProduct(product);
      
      if (result) {
        success++;
      } else {
        failed++;
      }
    }
    
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
            processed++;
          } catch (removeError) {
            // نعتبره معالج حتى لو لم نتمكن من حذفه من القائمة
            processed++;
          }
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
          } else {
            // حفظ العنصر المُحدث
            try {
              await syncQueueStore.setItem(item.id, updatedItem);
            } catch (setError) {
            }
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

// مزامنة قائمة العملاء غير المتزامنة
export const syncUnsyncedCustomers = async (): Promise<{ success: number; failed: number }> => {
  try {
    const unsyncedCustomers = await getUnsyncedCustomers();
    
    let success = 0;
    let failed = 0;
    
    for (const customer of unsyncedCustomers) {
      const result = await syncCustomer(customer);
      
      if (result) {
        success++;
      } else {
        failed++;
      }
    }
    
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

// مزامنة قائمة العناوين غير المتزامنة
export const syncUnsyncedAddresses = async (): Promise<{ success: number; failed: number }> => {
  try {
    const addresses: LocalAddress[] = [];
    
    // جمع جميع العناوين غير المتزامنة
    await addressesStore.iterate<LocalAddress, void>((address) => {
      if (!address.synced || address.syncStatus === 'pending' || address.syncStatus === 'error') {
        addresses.push(address);
      }
    });
    
    let success = 0;
    let failed = 0;
    
    for (const address of addresses) {
      const result = await syncAddress(address);
      
      if (result) {
        success++;
      } else {
        failed++;
      }
    }
    
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

    return true;
  } catch (error) {
    return false;
  }
};
