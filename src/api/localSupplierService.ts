/**
 * localSupplierService - خدمة الموردين المحلية
 *
 * ⚡ تدعم العمل offline مع Delta Sync
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - المزامنة التلقائية عند الاتصال
 */

import { v4 as uuidv4 } from 'uuid';
import { deltaWriteService } from '@/services/DeltaWriteService';

// أنواع الموردين
export interface LocalSupplier {
  id: string;
  organization_id: string;
  name: string;
  name_lower?: string;
  company_name?: string;
  email?: string;
  email_lower?: string;
  phone?: string;
  phone_digits?: string;
  address?: string;
  website?: string;
  tax_number?: string;
  business_type?: string;
  notes?: string;
  rating: number;
  supplier_type: 'local' | 'international';
  supplier_category: 'wholesale' | 'retail' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  synced?: boolean;
  sync_status?: 'pending' | 'synced' | 'error';
  pending_operation?: 'create' | 'update' | 'delete';
  local_updated_at?: string;
}

export interface LocalSupplierContact {
  id: string;
  supplier_id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
  sync_status?: string;
  pending_operation?: string;
}

export interface LocalSupplierPurchase {
  id: string;
  organization_id: string;
  supplier_id: string;
  purchase_number: string;
  purchase_date: string;
  due_date?: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: 'draft' | 'confirmed' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  payment_terms?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  synced?: boolean;
  sync_status?: string;
  pending_operation?: string;
  local_updated_at?: string;
}

export interface LocalSupplierPayment {
  id: string;
  organization_id: string;
  supplier_id: string;
  purchase_id?: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'other';
  reference_number?: string;
  notes?: string;
  created_at: string;
  synced?: boolean;
  sync_status?: string;
  pending_operation?: string;
  local_updated_at?: string;
}

// الحصول على معرف المؤسسة الحالية
const getCurrentOrganizationId = (): string => {
  return localStorage.getItem('bazaar_organization_id') || localStorage.getItem('currentOrganizationId') || '';
};

// دوال المساعدة
const toLower = (s: any) => (s || '').toString().toLowerCase();
const digits = (s: any) => (s || '').toString().replace(/\D+/g, '');

// ==================== إدارة الموردين ====================

/**
 * إنشاء مورد محلي جديد
 */
export const createLocalSupplier = async (
  supplier: Omit<LocalSupplier, 'id' | 'created_at' | 'updated_at' | 'synced' | 'sync_status' | 'pending_operation' | 'local_updated_at'>
): Promise<LocalSupplier> => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const orgId = supplier.organization_id || getCurrentOrganizationId();

  const localSupplier: LocalSupplier = {
    id,
    ...supplier,
    organization_id: orgId,
    rating: supplier.rating ?? 0,
    supplier_type: supplier.supplier_type || 'local',
    supplier_category: supplier.supplier_category || 'wholesale',
    is_active: supplier.is_active ?? true,
    created_at: now,
    updated_at: now,
    synced: false,
    sync_status: 'pending',
    pending_operation: 'create',
    local_updated_at: now,
    name_lower: toLower(supplier.name),
    email_lower: toLower(supplier.email),
    phone_digits: digits(supplier.phone)
  };

  // ⚡ استخدام Delta Sync
  const result = await deltaWriteService.create('suppliers', localSupplier, orgId);

  if (!result.success) {
    throw new Error(`Failed to create supplier: ${result.error}`);
  }

  console.log(`[LocalSupplier] ⚡ Created supplier ${id} via Delta Sync`);
  return localSupplier;
};

/**
 * تحديث مورد محلي موجود
 */
export const updateLocalSupplier = async (
  id: string,
  updates: Partial<Omit<LocalSupplier, 'id' | 'created_at' | 'synced' | 'sync_status' | 'pending_operation'>>
): Promise<LocalSupplier | null> => {
  try {
    const existingSupplier = await deltaWriteService.get<LocalSupplier>('suppliers', id);

    if (!existingSupplier) {
      console.warn(`[LocalSupplier] Supplier ${id} not found`);
      return null;
    }

    const now = new Date().toISOString();

    const updatedData = {
      ...updates,
      updated_at: now,
      synced: false,
      sync_status: 'pending',
      local_updated_at: now,
      pending_operation: existingSupplier.pending_operation === 'create' ? 'create' : 'update',
      name_lower: updates.name ? toLower(updates.name) : existingSupplier.name_lower,
      email_lower: updates.email ? toLower(updates.email) : existingSupplier.email_lower,
      phone_digits: updates.phone ? digits(updates.phone) : existingSupplier.phone_digits
    };

    // ⚡ استخدام Delta Sync
    const result = await deltaWriteService.update('suppliers', id, updatedData);

    if (!result.success) {
      console.error(`[LocalSupplier] Failed to update supplier ${id}:`, result.error);
      return null;
    }

    console.log(`[LocalSupplier] ⚡ Updated supplier ${id} via Delta Sync`);
    return {
      ...existingSupplier,
      ...updatedData
    } as LocalSupplier;
  } catch (error) {
    console.error(`[LocalSupplier] Update error:`, error);
    return null;
  }
};

/**
 * حذف مورد محلي
 */
export const deleteLocalSupplier = async (id: string): Promise<boolean> => {
  try {
    const existingSupplier = await deltaWriteService.get<LocalSupplier>('suppliers', id);

    if (!existingSupplier) {
      return false;
    }

    // ⚡ استخدام Delta Sync للحذف
    const result = await deltaWriteService.delete('suppliers', id);

    if (result.success) {
      console.log(`[LocalSupplier] ⚡ Deleted supplier ${id} via Delta Sync`);
    }

    return result.success;
  } catch (error) {
    console.error(`[LocalSupplier] Delete error:`, error);
    return false;
  }
};

/**
 * جلب جميع الموردين المحليين
 */
export const getLocalSuppliers = async (organizationId: string): Promise<LocalSupplier[]> => {
  try {
    const suppliers = await deltaWriteService.getAll<LocalSupplier>('suppliers', organizationId);
    
    // استبعاد المحذوفين
    return suppliers.filter(s => s.pending_operation !== 'delete');
  } catch (error) {
    console.error(`[LocalSupplier] Error getting suppliers:`, error);
    return [];
  }
};

/**
 * جلب مورد بالـ ID
 */
export const getLocalSupplierById = async (id: string): Promise<LocalSupplier | null> => {
  try {
    return await deltaWriteService.get<LocalSupplier>('suppliers', id);
  } catch (error) {
    console.error(`[LocalSupplier] Error getting supplier ${id}:`, error);
    return null;
  }
};

/**
 * بحث سريع في الموردين المحليين
 */
export const searchLocalSuppliers = async (
  organizationId: string,
  query: string,
  options: { limit?: number } = {}
): Promise<LocalSupplier[]> => {
  const q = (query || '').toLowerCase();
  if (!q) return [];
  const limit = options.limit ?? 100;

  return deltaWriteService.search<LocalSupplier>(
    'suppliers',
    organizationId,
    ['name_lower', 'email_lower', 'phone_digits', 'company_name'],
    q,
    limit
  );
};

/**
 * جلب الموردين غير المتزامنين
 */
export const getUnsyncedSuppliers = async (organizationId: string): Promise<LocalSupplier[]> => {
  try {
    const allSuppliers = await deltaWriteService.getAll<LocalSupplier>('suppliers', organizationId);
    return allSuppliers.filter(s => s.synced === false || s.sync_status === 'pending');
  } catch (error) {
    console.error(`[LocalSupplier] Error getting unsynced suppliers:`, error);
    return [];
  }
};

/**
 * تحديث حالة المزامنة للمورد
 */
export const markSupplierAsSynced = async (id: string): Promise<boolean> => {
  try {
    const result = await deltaWriteService.update('suppliers', id, {
      synced: true,
      sync_status: 'synced',
      pending_operation: null
    });
    return result.success;
  } catch (error) {
    console.error(`[LocalSupplier] Error marking supplier as synced:`, error);
    return false;
  }
};

// ==================== مشتريات الموردين ====================

/**
 * إنشاء مشتريات محلية
 */
export const createLocalSupplierPurchase = async (
  purchase: Omit<LocalSupplierPurchase, 'id' | 'created_at' | 'updated_at' | 'synced' | 'sync_status' | 'pending_operation' | 'local_updated_at'>
): Promise<LocalSupplierPurchase> => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const orgId = purchase.organization_id || getCurrentOrganizationId();

  const localPurchase: LocalSupplierPurchase = {
    id,
    ...purchase,
    organization_id: orgId,
    balance_due: purchase.total_amount - purchase.paid_amount,
    payment_status: purchase.paid_amount >= purchase.total_amount ? 'paid' : 
                    purchase.paid_amount > 0 ? 'partially_paid' : 'unpaid',
    created_at: now,
    updated_at: now,
    synced: false,
    sync_status: 'pending',
    pending_operation: 'create',
    local_updated_at: now
  };

  const result = await deltaWriteService.create('supplier_purchases', localPurchase, orgId);

  if (!result.success) {
    throw new Error(`Failed to create purchase: ${result.error}`);
  }

  console.log(`[LocalSupplier] ⚡ Created purchase ${id}`);
  return localPurchase;
};

/**
 * جلب مشتريات مورد معين
 */
export const getLocalSupplierPurchases = async (
  organizationId: string, 
  supplierId?: string
): Promise<LocalSupplierPurchase[]> => {
  try {
    const purchases = await deltaWriteService.getAll<LocalSupplierPurchase>('supplier_purchases', organizationId);
    
    if (supplierId) {
      return purchases.filter(p => p.supplier_id === supplierId && p.pending_operation !== 'delete');
    }
    
    return purchases.filter(p => p.pending_operation !== 'delete');
  } catch (error) {
    console.error(`[LocalSupplier] Error getting purchases:`, error);
    return [];
  }
};

// ==================== مدفوعات الموردين ====================

/**
 * إنشاء دفعة محلية
 */
export const createLocalSupplierPayment = async (
  payment: Omit<LocalSupplierPayment, 'id' | 'created_at' | 'synced' | 'sync_status' | 'pending_operation' | 'local_updated_at'>
): Promise<LocalSupplierPayment> => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const orgId = payment.organization_id || getCurrentOrganizationId();

  const localPayment: LocalSupplierPayment = {
    id,
    ...payment,
    organization_id: orgId,
    created_at: now,
    synced: false,
    sync_status: 'pending',
    pending_operation: 'create',
    local_updated_at: now
  };

  const result = await deltaWriteService.create('supplier_payments', localPayment, orgId);

  if (!result.success) {
    throw new Error(`Failed to create payment: ${result.error}`);
  }

  console.log(`[LocalSupplier] ⚡ Created payment ${id}`);
  return localPayment;
};

/**
 * جلب مدفوعات مورد معين
 */
export const getLocalSupplierPayments = async (
  organizationId: string,
  supplierId: string
): Promise<LocalSupplierPayment[]> => {
  try {
    const payments = await deltaWriteService.getAll<LocalSupplierPayment>('supplier_payments', organizationId);
    return payments.filter(p => p.supplier_id === supplierId && p.pending_operation !== 'delete');
  } catch (error) {
    console.error(`[LocalSupplier] Error getting payments:`, error);
    return [];
  }
};

// ==================== حفظ البيانات من السيرفر ====================

/**
 * حفظ الموردين من السيرفر للقاعدة المحلية (bulk)
 */
export const saveServerSuppliersToLocal = async (
  suppliers: LocalSupplier[],
  organizationId: string
): Promise<number> => {
  if (!suppliers || suppliers.length === 0) return 0;

  let savedCount = 0;
  for (const supplier of suppliers) {
    try {
      const localSupplier: LocalSupplier = {
        ...supplier,
        organization_id: organizationId,
        synced: true,
        sync_status: 'synced',
        pending_operation: undefined,
        name_lower: toLower(supplier.name),
        email_lower: toLower(supplier.email),
        phone_digits: digits(supplier.phone)
      };

      // استخدام create أو update حسب وجود السجل
      const existing = await deltaWriteService.get<LocalSupplier>('suppliers', supplier.id);
      let result;
      if (existing) {
        result = await deltaWriteService.update('suppliers', supplier.id, localSupplier);
      } else {
        result = await deltaWriteService.create('suppliers', localSupplier, organizationId);
      }
      if (result.success) savedCount++;
    } catch (error) {
      console.warn(`[LocalSupplier] Failed to save supplier ${supplier.id}:`, error);
    }
  }

  console.log(`[LocalSupplier] ✅ Saved ${savedCount}/${suppliers.length} suppliers from server`);
  return savedCount;
};
