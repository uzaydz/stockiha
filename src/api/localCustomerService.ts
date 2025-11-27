/**
 * localCustomerService - خدمة العملاء المحلية
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - يدعم العملاء مع عناوينهم
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalCustomer, LocalAddress } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';

// Re-export types
export type { LocalCustomer, LocalAddress } from '@/database/localDb';

// الحصول على معرف المؤسسة الحالية
const getCurrentOrganizationId = (): string => {
  return localStorage.getItem('bazaar_organization_id') || localStorage.getItem('currentOrganizationId') || '';
};

/**
 * إنشاء عميل محلي جديد
 */
export const createLocalCustomer = async (
  customer: Omit<LocalCustomer, 'id' | 'created_at' | 'updated_at' | 'synced' | 'localUpdatedAt' | 'syncStatus' | 'pendingOperation'>
): Promise<LocalCustomer> => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const orgId = customer.organization_id || getCurrentOrganizationId();

  const toLower = (s: any) => (s || '').toString().toLowerCase();
  const digits = (s: any) => (s || '').toString().replace(/\D+/g, '');

  const localCustomer: LocalCustomer = {
    id,
    ...customer,
    created_at: now,
    updated_at: now,
    organization_id: orgId,
    synced: false,
    syncStatus: 'pending',
    localUpdatedAt: now,
    pendingOperation: 'create',
    name_lower: toLower((customer as any).name),
    email_lower: toLower((customer as any).email),
    phone_digits: digits((customer as any).phone)
  };

  // ⚡ استخدام Delta Sync
  const result = await deltaWriteService.create('customers', localCustomer, orgId);

  if (!result.success) {
    throw new Error(`Failed to create customer: ${result.error}`);
  }

  console.log(`[LocalCustomer] ⚡ Created customer ${id} via Delta Sync`);
  return localCustomer;
};

/**
 * تحديث عميل محلي موجود
 */
export const updateLocalCustomer = async (
  id: string,
  updates: Partial<Omit<LocalCustomer, 'id' | 'created_at' | 'synced' | 'syncStatus' | 'localUpdatedAt' | 'pendingOperation'>>
): Promise<LocalCustomer | null> => {
  try {
    const existingCustomer = await deltaWriteService.get<LocalCustomer>('customers', id);

    if (!existingCustomer) {
      return null;
    }

    const now = new Date().toISOString();
    const toLower = (s: any) => (s || '').toString().toLowerCase();
    const digits = (s: any) => (s || '').toString().replace(/\D+/g, '');

    const updatedData = {
      ...updates,
      updated_at: now,
      synced: false,
      syncStatus: 'pending',
      localUpdatedAt: now,
      pendingOperation: existingCustomer.pendingOperation === 'create' ? 'create' : 'update',
      name_lower: (updates as any).name ? toLower((updates as any).name) : existingCustomer.name_lower,
      email_lower: (updates as any).email ? toLower((updates as any).email) : existingCustomer.email_lower,
      phone_digits: (updates as any).phone ? digits((updates as any).phone) : existingCustomer.phone_digits
    };

    // ⚡ استخدام Delta Sync
    const result = await deltaWriteService.update('customers', id, updatedData);

    if (!result.success) {
      console.error(`[LocalCustomer] Failed to update customer ${id}:`, result.error);
      return null;
    }

    console.log(`[LocalCustomer] ⚡ Updated customer ${id} via Delta Sync`);
    return {
      ...existingCustomer,
      ...updatedData
    } as LocalCustomer;
  } catch (error) {
    console.error(`[LocalCustomer] Update error:`, error);
    return null;
  }
};

/**
 * حذف عميل محلي
 */
export const deleteLocalCustomer = async (id: string): Promise<boolean> => {
  try {
    const existingCustomer = await deltaWriteService.get<LocalCustomer>('customers', id);

    if (!existingCustomer) {
      return false;
    }

    // ⚡ استخدام Delta Sync للحذف
    const result = await deltaWriteService.delete('customers', id);

    if (result.success) {
      console.log(`[LocalCustomer] ⚡ Deleted customer ${id} via Delta Sync`);
    }

    return result.success;
  } catch (error) {
    console.error(`[LocalCustomer] Delete error:`, error);
    return false;
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

  return deltaWriteService.search<LocalCustomer>(
    'customers',
    organizationId,
    ['name_lower', 'email_lower', 'phone_digits'],
    q,
    limit
  );
}

export async function getLocalCustomersPage(
  organizationId: string,
  options: { offset?: number; limit?: number } = {}
): Promise<{ customers: LocalCustomer[]; total: number }> {
  const { offset = 0, limit = 50 } = options;

  console.log('[localCustomerService] getLocalCustomersPage called:', { organizationId, offset, limit });

  const customers = await deltaWriteService.getAll<LocalCustomer>('customers', organizationId, {
    where: "(pending_operation IS NULL OR pending_operation != 'delete')",
    limit,
    offset
  });

  const total = await deltaWriteService.count('customers', organizationId);

  console.log('[localCustomerService] ✅ Delta Sync:', { total, page: customers.length });
  return { customers, total };
}

/**
 * الحصول على جميع العملاء المحليين
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
    const { includeDeleted = false, onlySynced = false, onlyUnsynced = false, organizationId } = options;
    const orgId = organizationId || getCurrentOrganizationId();

    let whereClause = "1=1";
    if (!includeDeleted) {
      whereClause += " AND (pending_operation IS NULL OR pending_operation != 'delete')";
    }
    if (onlySynced) {
      whereClause += " AND synced = 1";
    }
    if (onlyUnsynced) {
      whereClause += " AND (synced = 0 OR synced IS NULL)";
    }

    const results = await deltaWriteService.getAll<LocalCustomer>('customers', orgId, {
      where: whereClause
    });

    console.log('[localCustomerService] ✅ Delta Sync getLocalCustomers:', results.length);
    return results;
  } catch (error) {
    console.error('[localCustomerService] ❌ getLocalCustomers error:', error);
    return [];
  }
};

/**
 * الحصول على عميل محلي بواسطة المعرّف
 */
export const getLocalCustomerById = async (id: string): Promise<LocalCustomer | null> => {
  return deltaWriteService.get<LocalCustomer>('customers', id);
};

/**
 * وضع علامة على العميل كمتزامن
 */
export const markCustomerAsSynced = async (
  id: string,
  remoteCustomer?: any
): Promise<LocalCustomer | null> => {
  try {
    const localCustomer = await deltaWriteService.get<LocalCustomer>('customers', id);

    if (!localCustomer) {
      return null;
    }

    // في حالة وجود عملية حذف، حذف العميل فعلياً
    if (localCustomer.pendingOperation === 'delete') {
      await deltaWriteService.delete('customers', id);
      return null;
    }

    const updatedData = {
      ...(remoteCustomer || {}),
      synced: true,
      syncStatus: undefined,
      lastSyncAttempt: new Date().toISOString(),
      pendingOperation: undefined
    };

    await deltaWriteService.update('customers', id, updatedData);

    return {
      ...localCustomer,
      ...updatedData
    } as LocalCustomer;
  } catch (error) {
    console.error(`[LocalCustomer] Mark synced error:`, error);
    return null;
  }
};

/**
 * الحصول على عملاء غير متزامنين للمزامنة مع الخادم
 */
export const getUnsyncedCustomers = async (): Promise<LocalCustomer[]> => {
  return await getLocalCustomers({ onlyUnsynced: true });
};

/**
 * إضافة عنوان جديد للعميل
 */
export const createLocalAddress = async (
  address: Omit<LocalAddress, 'id' | 'synced' | 'syncStatus' | 'localUpdatedAt' | 'pendingOperation'>
): Promise<LocalAddress> => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const orgId = getCurrentOrganizationId();

  const localAddress: LocalAddress = {
    id,
    ...address,
    synced: false,
    syncStatus: 'pending',
    localUpdatedAt: now,
    pendingOperation: 'create'
  };

  // ⚡ استخدام Delta Sync
  const result = await deltaWriteService.create('customer_addresses', localAddress, orgId);

  if (!result.success) {
    throw new Error(`Failed to create address: ${result.error}`);
  }

  console.log(`[LocalCustomer] ⚡ Created address ${id} via Delta Sync`);
  return localAddress;
};

/**
 * الحصول على عناوين العميل
 */
export const getLocalAddressesByCustomerId = async (customerId: string): Promise<LocalAddress[]> => {
  const orgId = getCurrentOrganizationId();

  return deltaWriteService.getAll<LocalAddress>('customer_addresses', orgId, {
    where: "customer_id = ? AND (pending_operation IS NULL OR pending_operation != 'delete')",
    params: [customerId]
  });
};

// =====================
// حفظ البيانات من السيرفر
// =====================

export const saveRemoteCustomers = async (customers: any[]): Promise<void> => {
  if (!customers || customers.length === 0) return;

  const now = new Date().toISOString();
  const toLower = (s: any) => (s || '').toString().toLowerCase();
  const digits = (s: any) => (s || '').toString().replace(/\D+/g, '');

  for (const customer of customers) {
    const mappedCustomer: LocalCustomer = {
      id: customer.id,
      name: customer.name,
      name_lower: toLower(customer.name),
      email: customer.email,
      email_lower: toLower(customer.email),
      phone: customer.phone,
      phone_digits: digits(customer.phone),
      city: customer.city,
      address: customer.address,
      notes: customer.notes,
      organization_id: customer.organization_id,
      created_at: customer.created_at || now,
      updated_at: customer.updated_at || now,
      synced: true,
      syncStatus: undefined,
      pendingOperation: undefined,
      localUpdatedAt: now
    };

    await deltaWriteService.saveFromServer('customers', mappedCustomer);
  }

  console.log(`[LocalCustomer] ⚡ Saved ${customers.length} remote customers`);
};

export const saveRemoteAddresses = async (addresses: any[]): Promise<void> => {
  if (!addresses || addresses.length === 0) return;

  const now = new Date().toISOString();

  for (const address of addresses) {
    const mappedAddress: LocalAddress = {
      id: address.id,
      customer_id: address.customer_id,
      label: address.label,
      city: address.city,
      commune: address.commune,
      address_line: address.address_line,
      phone: address.phone,
      is_default: address.is_default || false,
      synced: true,
      syncStatus: undefined,
      pendingOperation: undefined,
      localUpdatedAt: now
    };

    await deltaWriteService.saveFromServer('customer_addresses', mappedAddress);
  }

  console.log(`[LocalCustomer] ⚡ Saved ${addresses.length} remote addresses`);
};
