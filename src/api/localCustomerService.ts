import { v4 as uuidv4 } from 'uuid';
import { inventoryDB, LocalCustomer, LocalAddress } from '@/database/localDb';
import { UnifiedQueue } from '@/sync/UnifiedQueue';

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
    const toLower = (s: any) => (s || '').toString().toLowerCase();
    const digits = (s: any) => (s || '').toString().replace(/\D+/g, '');

    const localCustomer: LocalCustomer = {
      id,
      ...customer,
      created_at: now,
      updated_at: now,
      organization_id: customer.organization_id || getCurrentOrganizationId(),
      synced: false,
      syncStatus: 'pending',
      localUpdatedAt: now,
      pendingOperation: 'create',
      name_lower: toLower((customer as any).name),
      email_lower: toLower((customer as any).email),
      phone_digits: digits((customer as any).phone)
    };
    
    // حفظ العميل في قاعدة البيانات المحلية (SQLite)
    await inventoryDB.customers.put(localCustomer);
    
    // إضافة العنصر إلى قائمة المزامنة (موحّد)
    await UnifiedQueue.enqueue({
      objectType: 'customer',
      objectId: id,
      operation: 'create',
      data: localCustomer,
      priority: 1
    });
    
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
    // الحصول على العميل الحالي من SQLite
    const existingCustomer = await inventoryDB.customers.get(id);
    
    if (!existingCustomer) {
      return null;
    }
    
    const now = new Date().toISOString();
    
    // تحديث بيانات العميل
    const toLower = (s: any) => (s || '').toString().toLowerCase();
    const digits = (s: any) => (s || '').toString().replace(/\D+/g, '');

    const updatedCustomer: LocalCustomer = {
      ...existingCustomer,
      ...updates,
      updated_at: now,
      synced: false,
      syncStatus: 'pending',
      localUpdatedAt: now,
      pendingOperation: 'update',
      name_lower: (updates as any).name ? toLower((updates as any).name) : existingCustomer.name_lower,
      email_lower: (updates as any).email ? toLower((updates as any).email) : existingCustomer.email_lower,
      phone_digits: (updates as any).phone ? digits((updates as any).phone) : existingCustomer.phone_digits
    };
    
    // حفظ العميل المحدّث في SQLite
    await inventoryDB.customers.put(updatedCustomer);
    
    // إضافة العنصر إلى قائمة المزامنة (موحّد)
    await UnifiedQueue.enqueue({
      objectType: 'customer',
      objectId: id,
      operation: 'update',
      data: updatedCustomer,
      priority: 2
    });
    
    return updatedCustomer;
  } catch (error) {
    throw new Error(`فشل في تحديث العميل محلياً`);
  }
};

// ==================== بحث وتصفح محلي للعملاء ====================

export async function fastSearchLocalCustomers(
  organizationId: string,
  query: string,
  options: { limit?: number } = {}
): Promise<LocalCustomer[]> {
  const q = (query || '').toLowerCase();
  if (!q) return [];
  const limit = options.limit ?? 200;

  const results = new Map<string, LocalCustomer>();

  const byName = await (inventoryDB.customers as any)
    .where('[organization_id+name_lower]')
    .between([organizationId, q], [organizationId, q + '\\uffff'])
    .limit(limit)
    .toArray();
  byName.forEach((c: any) => results.set(c.id, c));

  if (results.size < limit) {
    const digits = q.replace(/\D+/g, '');
    if (digits) {
      const byPhone = await (inventoryDB.customers as any)
        .where('[organization_id+phone_digits]')
        .between([organizationId, digits], [organizationId, digits + '\\uffff'])
        .limit(limit - results.size)
        .toArray();
      byPhone.forEach((c: any) => results.set(c.id, c));
    }
  }

  if (results.size < limit) {
    const byEmail = await (inventoryDB.customers as any)
      .where('[organization_id+email_lower]')
      .between([organizationId, q], [organizationId, q + '\\uffff'])
      .limit(limit - results.size)
      .toArray();
    byEmail.forEach((c: any) => results.set(c.id, c));
  }

  return Array.from(results.values()).slice(0, limit);
}

export async function getLocalCustomersPage(
  organizationId: string,
  options: { offset?: number; limit?: number } = {}
): Promise<{ customers: LocalCustomer[]; total: number }> {
  const { offset = 0, limit = 50 } = options;
  const coll = (inventoryDB.customers as any)
    .where('[organization_id+name_lower]')
    .between([organizationId, ''], [organizationId, '\\uffff']);
  const total = await coll.count();
  const page = await coll.offset(offset).limit(limit).toArray();
  return { customers: page as any, total };
}

/**
 * حذف عميل محلي
 * @param id معرّف العميل
 * @returns نجاح أو فشل العملية
 */
export const deleteLocalCustomer = async (id: string): Promise<boolean> => {
  try {
    // الحصول على العميل من SQLite
    const existingCustomer = await inventoryDB.customers.get(id);
    
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
    
    await inventoryDB.customers.put(markedCustomer);
    
    // إضافة العنصر إلى قائمة المزامنة (موحّد)
    await UnifiedQueue.enqueue({
      objectType: 'customer',
      objectId: id,
      operation: 'delete',
      data: { id },
      priority: 2
    });
    
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
    
    const all = await inventoryDB.customers.toArray();
    for (const customer of all as any[]) {
      if (!includeDeleted && customer.pendingOperation === 'delete') continue;
      if (onlySynced && !customer.synced) continue;
      if (onlyUnsynced && customer.synced) continue;
      if (organizationId && customer.organization_id !== organizationId) continue;
      customers.push(customer);
    }
    
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
    return await inventoryDB.customers.get(id) as LocalCustomer | null;
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
    const localCustomer = await inventoryDB.customers.get(id);
    
    if (!localCustomer) {
      return null;
    }
    
    // في حالة وجود عملية حذف
    if (localCustomer.pendingOperation === 'delete') {
      // حذف العميل فعلياً من SQLite
      await inventoryDB.customers.delete(id);
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
    
    await inventoryDB.customers.put(updatedCustomer);
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
    
    await inventoryDB.addresses.put(localAddress);
    
    // إضافة العنصر إلى قائمة المزامنة (موحّد)
    await UnifiedQueue.enqueue({
      objectType: 'address',
      objectId: id,
      operation: 'create',
      data: localAddress,
      priority: 2
    });
    
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
    const addresses = await inventoryDB.addresses
      .where('customer_id')
      .equals(customerId)
      .toArray();
    return addresses.filter((a: any) => a.pendingOperation !== 'delete');
  } catch (error) {
    return [];
  }
};
