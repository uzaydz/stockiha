import { v4 as uuidv4 } from 'uuid';
import { customersStore, addressesStore, syncQueueStore, LocalCustomer, LocalAddress, SyncQueueItem } from '@/database/localDb';

/**
 * خدمة العملاء المحلية
 * هذه الخدمة تتعامل مع بيانات العملاء في قاعدة البيانات المحلية مع دعم وضع عدم الاتصال
 */

// الحصول على معرف المؤسسة الحالية
const getCurrentOrganizationId = (): string => {
  return localStorage.getItem('bazaar_organization_id') || '';
};

/**
 * إنشاء عميل محلي جديد
 * @param customer بيانات العميل الأساسية
 * @returns العميل المنشأ محلياً
 */
export const createLocalCustomer = async (
  customer: Omit<LocalCustomer, 'id' | 'created_at' | 'updated_at' | 'synced' | 'localUpdatedAt' | 'syncStatus' | 'pendingOperation'>
): Promise<LocalCustomer> => {
  try {
    // إنشاء معرّف فريد للعميل
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // إنشاء كائن العميل المحلي
    const localCustomer: LocalCustomer = {
      id,
      ...customer,
      created_at: now,
      updated_at: now,
      organization_id: customer.organization_id || getCurrentOrganizationId(),
      synced: false,
      syncStatus: 'pending',
      localUpdatedAt: now,
      pendingOperation: 'create'
    };
    
    // حفظ العميل في قاعدة البيانات المحلية
    await customersStore.setItem(id, localCustomer);
    
    // إضافة العنصر إلى قائمة المزامنة
    const queueId = uuidv4();
    const queueItem: SyncQueueItem = {
      id: queueId,
      objectType: 'customer',
      objectId: id,
      operation: 'create',
      data: localCustomer,
      attempts: 0,
      createdAt: now,
      priority: 1 // أولوية عالية
    };
    
    await syncQueueStore.setItem(queueId, queueItem);
    
    return localCustomer;
  } catch (error) {
    throw new Error('فشل في إنشاء العميل محلياً');
  }
};

/**
 * تحديث عميل محلي موجود
 * @param id معرّف العميل
 * @param updates التحديثات المطلوبة
 * @returns العميل المحدّث
 */
export const updateLocalCustomer = async (
  id: string,
  updates: Partial<Omit<LocalCustomer, 'id' | 'created_at' | 'synced' | 'syncStatus' | 'localUpdatedAt' | 'pendingOperation'>>
): Promise<LocalCustomer | null> => {
  try {
    // الحصول على العميل الحالي من التخزين المحلي
    const existingCustomer = await customersStore.getItem<LocalCustomer>(id);
    
    if (!existingCustomer) {
      return null;
    }
    
    const now = new Date().toISOString();
    
    // تحديث بيانات العميل
    const updatedCustomer: LocalCustomer = {
      ...existingCustomer,
      ...updates,
      updated_at: now,
      synced: false,
      syncStatus: 'pending',
      localUpdatedAt: now,
      pendingOperation: 'update'
    };
    
    // حفظ العميل المحدّث في التخزين المحلي
    await customersStore.setItem(id, updatedCustomer);
    
    // إضافة العنصر إلى قائمة المزامنة
    const queueId = uuidv4();
    const queueItem: SyncQueueItem = {
      id: queueId,
      objectType: 'customer',
      objectId: id,
      operation: 'update',
      data: updatedCustomer,
      attempts: 0,
      createdAt: now,
      priority: 2 // أولوية متوسطة
    };
    
    await syncQueueStore.setItem(queueId, queueItem);
    
    return updatedCustomer;
  } catch (error) {
    throw new Error(`فشل في تحديث العميل محلياً`);
  }
};

/**
 * حذف عميل محلي
 * @param id معرّف العميل
 * @returns نجاح أو فشل العملية
 */
export const deleteLocalCustomer = async (id: string): Promise<boolean> => {
  try {
    // الحصول على العميل من التخزين المحلي
    const existingCustomer = await customersStore.getItem<LocalCustomer>(id);
    
    if (!existingCustomer) {
      return false;
    }
    
    const now = new Date().toISOString();
    
    // وضع علامة الحذف على العميل وتحديث التخزين المحلي
    const markedCustomer: LocalCustomer = {
      ...existingCustomer,
      synced: false,
      syncStatus: 'pending',
      localUpdatedAt: now,
      pendingOperation: 'delete'
    };
    
    await customersStore.setItem(id, markedCustomer);
    
    // إضافة العنصر إلى قائمة المزامنة
    const queueId = uuidv4();
    const queueItem: SyncQueueItem = {
      id: queueId,
      objectType: 'customer',
      objectId: id,
      operation: 'delete',
      data: { id },
      attempts: 0,
      createdAt: now,
      priority: 2 // أولوية متوسطة
    };
    
    await syncQueueStore.setItem(queueId, queueItem);
    
    return true;
  } catch (error) {
    throw new Error(`فشل في حذف العميل محلياً`);
  }
};

/**
 * الحصول على جميع العملاء المحليين
 * @param options خيارات استرجاع البيانات
 * @returns قائمة العملاء
 */
export const getLocalCustomers = async (
  options: { 
    includeDeleted?: boolean; 
    onlySynced?: boolean;
    onlyUnsynced?: boolean;
    organizationId?: string;
  } = {}
): Promise<LocalCustomer[]> => {
  try {
    const customers: LocalCustomer[] = [];
    const { includeDeleted = false, onlySynced = false, onlyUnsynced = false, organizationId } = options;
    
    await customersStore.iterate<LocalCustomer, void>((customer, key) => {
      // تجاهل العناصر المحذوفة حسب الخيارات
      if (!includeDeleted && customer.pendingOperation === 'delete') {
        return;
      }
      
      // فلترة حسب حالة المزامنة
      if (onlySynced && !customer.synced) {
        return;
      }
      
      if (onlyUnsynced && customer.synced) {
        return;
      }
      
      // فلترة حسب المؤسسة
      if (organizationId && customer.organization_id !== organizationId) {
        return;
      }
      
      customers.push(customer);
    });
    
    return customers;
  } catch (error) {
    return [];
  }
};

/**
 * الحصول على عميل محلي بواسطة المعرّف
 * @param id معرّف العميل
 * @returns العميل المطلوب أو null إذا لم يتم العثور عليه
 */
export const getLocalCustomerById = async (id: string): Promise<LocalCustomer | null> => {
  try {
    return await customersStore.getItem<LocalCustomer>(id);
  } catch (error) {
    return null;
  }
};

/**
 * وضع علامة على العميل كمتزامن
 * @param id معرّف العميل
 * @param remoteCustomer بيانات العميل من الخادم (اختياري)
 * @returns العميل بعد التحديث
 */
export const markCustomerAsSynced = async (
  id: string,
  remoteCustomer?: any
): Promise<LocalCustomer | null> => {
  try {
    const localCustomer = await customersStore.getItem<LocalCustomer>(id);
    
    if (!localCustomer) {
      return null;
    }
    
    // في حالة وجود عملية حذف
    if (localCustomer.pendingOperation === 'delete') {
      // حذف العميل فعلياً من التخزين المحلي
      await customersStore.removeItem(id);
      return null;
    }
    
    // تحديث العميل بالبيانات من الخادم إذا كانت متوفرة
    const updatedCustomer: LocalCustomer = {
      ...localCustomer,
      ...(remoteCustomer || {}),
      synced: true,
      syncStatus: undefined,
      lastSyncAttempt: new Date().toISOString(),
      pendingOperation: undefined
    };
    
    await customersStore.setItem(id, updatedCustomer);
    return updatedCustomer;
  } catch (error) {
    return null;
  }
};

/**
 * الحصول على عملاء غير متزامنين للمزامنة مع الخادم
 * @returns قائمة العملاء غير المتزامنين
 */
export const getUnsyncedCustomers = async (): Promise<LocalCustomer[]> => {
  return await getLocalCustomers({ onlyUnsynced: true });
};

/**
 * إضافة عنوان جديد للعميل
 * @param address بيانات العنوان
 * @returns العنوان المضاف
 */
export const createLocalAddress = async (
  address: Omit<LocalAddress, 'id' | 'synced' | 'syncStatus' | 'localUpdatedAt' | 'pendingOperation'>
): Promise<LocalAddress> => {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const localAddress: LocalAddress = {
      id,
      ...address,
      synced: false,
      syncStatus: 'pending',
      localUpdatedAt: now,
      pendingOperation: 'create'
    };
    
    await addressesStore.setItem(id, localAddress);
    
    // إضافة العنصر إلى قائمة المزامنة
    const queueId = uuidv4();
    const queueItem: SyncQueueItem = {
      id: queueId,
      objectType: 'address',
      objectId: id,
      operation: 'create',
      data: localAddress,
      attempts: 0,
      createdAt: now,
      priority: 2 // أولوية متوسطة
    };
    
    await syncQueueStore.setItem(queueId, queueItem);
    
    return localAddress;
  } catch (error) {
    throw new Error('فشل في إنشاء العنوان محلياً');
  }
};

/**
 * الحصول على عناوين العميل
 * @param customerId معرّف العميل
 * @returns قائمة عناوين العميل
 */
export const getLocalAddressesByCustomerId = async (customerId: string): Promise<LocalAddress[]> => {
  try {
    const addresses: LocalAddress[] = [];
    
    await addressesStore.iterate<LocalAddress, void>((address, key) => {
      if (address.customer_id === customerId && address.pendingOperation !== 'delete') {
        addresses.push(address);
      }
    });
    
    return addresses;
  } catch (error) {
    return [];
  }
};
