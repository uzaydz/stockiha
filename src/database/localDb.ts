/**
 * قاعدة البيانات المحلية - محدث لاستخدام SQLite بدلاً من IndexedDB
 * يحافظ على نفس الواجهة للتوافقية مع الكود القديم
 */

import { inventoryDB as dbAdapter } from '@/lib/db/dbAdapter';
import { Product } from '@/api/productService';
import type { POSOrderSyncStatus } from '@/types/posOrder';

// ========================================
// التعريفات والأنواع (بدون تغيير)
// ========================================

// نموذج المنتج الموسع بإضافة حالة المزامنة
export interface LocalProduct extends Product {
  synced: boolean;
  syncStatus?: 'pending' | 'error';
  lastSyncAttempt?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
  conflictResolution?: 'local' | 'remote' | 'merge';
  name_lower?: string;
  sku_lower?: string;
  barcode_lower?: string;
  name_search?: string;
  sku_search?: string;
  barcode_digits?: string;
  category_id?: string | null;
}

// نموذج عنصر قائمة المزامنة
export interface SyncQueueItem {
  id: string;
  objectType: 'product' | 'inventory' | 'customer' | 'address' | 'order';
  objectId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  attempts: number;
  lastAttempt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  priority: number;
}

// تعريف واجهة التحديث المحلي للمخزون
export interface InventoryTransaction {
  id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  reason: string;
  notes?: string;
  source_id?: string;
  timestamp: Date;
  synced: boolean;
  created_by: string;
}

// تعريف واجهة عنصر المخزون
export interface InventoryItem {
  id?: string;
  product_id: string;
  variant_id: string | null;
  stock_quantity: number;
  last_updated: Date;
  synced: boolean;
}

// تعريف واجهة بيانات العميل المحلي
export interface LocalCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  synced: boolean;
  syncStatus?: string;
  lastSyncAttempt?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
  name_lower?: string;
  email_lower?: string;
  phone_digits?: string;
}

// تعريف واجهة بيانات عنوان العميل
export interface LocalAddress {
  id: string;
  customer_id: string;
  name: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default: boolean;
  organization_id: string;
  synced: boolean;
  syncStatus?: string;
  lastSyncAttempt?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة طلبات POS المحلية
export interface LocalPOSOrder {
  id: string;
  order_number: string;
  organization_id: string;
  employee_id?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_name_lower?: string | null;
  subtotal: number;
  total: number;
  discount?: number;
  amount_paid?: number;
  payment_method?: string;
  payment_status?: string;
  notes?: string;
  remaining_amount?: number;
  consider_remaining_as_partial?: boolean;
  status: string;
  synced: boolean;
  syncStatus?: POSOrderSyncStatus;
  lastSyncAttempt?: string;
  error?: string;
  localCreatedAt: string;
  serverCreatedAt?: string;
  created_at: string;
  created_at_ts?: number;
  updated_at: string;
  local_order_number?: number;
  local_order_number_str?: string;
  remote_order_id?: string | null;
  remote_customer_order_number?: number | string | null;
  metadata?: any;
  message?: string;
  payload?: any;
  pending_updates?: any;
  extra_fields?: any;
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة عنصر الطلب
export interface LocalPOSOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  subtotal: number;
  discount: number;
  created_at: string;
  is_wholesale?: boolean;
  original_price?: number;
  color_id?: string | null;
  color_name?: string | null;
  size_id?: string | null;
  size_name?: string | null;
  variant_info?: Record<string, unknown> | null;
  synced?: boolean;
}

// تعريف واجهة الفاتورة المحلية
export interface LocalInvoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  total_amount: number;
  paid_amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  organization_id: string;
  synced: boolean;
  syncStatus?: string;
  localCreatedAt: string;
  created_at: string;
  updated_at: string;
}

// تعريف واجهة ديون العملاء
export interface LocalCustomerDebt {
  id: string;
  customer_id: string;
  amount: number;
  description: string;
  status: 'unpaid' | 'paid' | 'partial';
  organization_id: string;
  synced: boolean;
  syncStatus?: string;
  created_at: string;
  updated_at: string;
}

// تعريف واجهة طلبات الإصلاح
export interface LocalRepairOrder {
  id: string;
  repair_number: string;
  customer_id?: string;
  customer_name?: string;
  device_type?: string;
  issue_description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  total_cost: number;
  organization_id: string;
  synced: boolean;
  syncStatus?: string;
  localCreatedAt: string;
  created_at: string;
  updated_at: string;
}

// تعريف واجهة صور الإصلاح
export interface LocalRepairImage {
  id: string;
  repair_id: string;
  image_data: string;
  image_type: string;
  file_size: number;
  is_thumbnail: boolean;
  synced: boolean;
  uploaded_to_server: boolean;
  server_url?: string;
  created_at: string;
}

// تعريف واجهة PINs الموظفين
export interface LocalStaffPIN {
  id: string;
  organization_id: string;
  staff_name: string;
  pin_hash: string;
  salt: string;
  permissions: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// تعريف واجهة جلسات العمل
export interface LocalWorkSession {
  id: string;
  staff_id: string;
  staff_name?: string;
  organization_id: string;
  
  // معلومات النقد
  opening_cash: number;
  closing_cash?: number;
  expected_cash?: number;
  cash_difference?: number;
  
  // إحصائيات المبيعات
  total_sales: number;
  total_orders: number;
  cash_sales: number;
  card_sales: number;
  
  // التواريخ والأوقات
  started_at: string;
  ended_at?: string;
  paused_at?: string;
  resumed_at?: string;
  
  // معلومات الإيقاف المؤقت
  pause_count?: number;
  total_pause_duration?: number; // بالثواني
  
  // الحالة
  status: 'active' | 'paused' | 'closed';
  
  // ملاحظات
  opening_notes?: string;
  closing_notes?: string;
  
  // حقول المزامنة
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
  
  created_at: string;
  updated_at: string;
  
  // Legacy fields for backward compatibility
  opening_balance?: number;
  closing_balance?: number;
  opened_at?: string;
  closed_at?: string;
}

// تعريف واجهة الخسائر المحلية
export interface LocalLossDeclaration {
  id: string;
  loss_number: string;
  loss_number_lower?: string;
  remote_loss_id?: string | null;
  loss_type: 'damage' | 'theft' | 'expiry' | 'other';
  loss_category?: string | null;
  loss_description: string;
  incident_date: string;
  reported_by: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  approved_by?: string | null;
  approved_at?: string | null;
  total_cost_value: number;
  total_selling_value: number;
  total_items_count: number;
  notes?: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
}

export interface LocalLossItem {
  id: string;
  loss_id: string;
  product_id: string;
  product_name: string;
  product_sku?: string | null;
  lost_quantity: number;
  unit_cost_price: number;
  unit_selling_price: number;
  total_cost_value: number;
  total_selling_value: number;
  loss_condition: string;
  inventory_adjusted: boolean;
  color_id?: string | null;
  color_name?: string | null;
  size_id?: string | null;
  size_name?: string | null;
  created_at: string;
  synced: boolean;
}

// تعريف واجهة عنصر الفاتورة المحلية
export interface LocalInvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name: string;
  product_sku?: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  color_id?: string | null;
  color_name?: string | null;
  size_id?: string | null;
  size_name?: string | null;
  created_at: string;
  synced: boolean;
}

// تعريف واجهة إرجاع المنتج المحلي
export interface LocalProductReturn {
  id: string;
  return_number: string;
  return_number_lower?: string;
  remote_return_id?: string | null;
  customer_name?: string | null;
  customer_name_lower?: string | null;
  customer_id?: string | null;
  return_type: 'refund' | 'exchange' | 'store_credit';
  return_reason: string;
  total_amount: number;
  refund_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  processed_by?: string | null;
  processed_at?: string | null;
  notes?: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
}

export interface LocalReturnItem {
  id: string;
  return_id: string;
  product_id: string;
  product_name: string;
  product_sku?: string | null;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  condition: string;
  restocked: boolean;
  color_id?: string | null;
  color_name?: string | null;
  size_id?: string | null;
  size_name?: string | null;
  created_at: string;
  synced: boolean;
}

// ========================================
// تصدير قاعدة البيانات
// ========================================

/**
 * قاعدة البيانات المحلية - تستخدم الآن SQLite في Electron و IndexedDB في المتصفح
 */
export const inventoryDB = dbAdapter;

/**
 * دوال مساعدة للتوافقية
 */
export const normalizeArabicText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .toLowerCase()
    .trim();
};

/**
 * تهيئة قاعدة البيانات
 */
export const initializeDatabase = async (organizationId: string): Promise<void> => {
  await inventoryDB.initialize(organizationId);
  console.log(`[LocalDB] Database initialized for organization: ${organizationId}`);
};

/**
 * فحص نوع قاعدة البيانات المستخدمة
 */
export const getDatabaseType = (): 'sqlite' | 'indexeddb' => {
  return inventoryDB.getDatabaseType();
};

/**
 * فحص إذا كان SQLite مستخدم
 */
export const isSQLiteDatabase = (): boolean => {
  return inventoryDB.isSQLite();
};

/**
 * Wrapper stores للتوافقية مع localforage API
 * تستخدم في بعض الملفات القديمة
 */
export const productsStore = {
  async getItem<T>(id: string): Promise<T | null> {
    return await inventoryDB.products.get(id) as unknown as T;
  },

  async setItem(id: string, value: LocalProduct): Promise<string> {
    await inventoryDB.products.put(value);
    return id;
  },

  async removeItem(id: string): Promise<void> {
    await inventoryDB.products.delete(id);
  },

  async iterate<T, U>(callback: (item: T, key: string) => U | void): Promise<void> {
    const items = await inventoryDB.products.toArray();
    items.forEach((item: any) => {
      callback(item as unknown as T, item.id);
    });
  },

  async keys(): Promise<string[]> {
    const items = await inventoryDB.products.toArray();
    return items.map((item: any) => item.id);
  },

  async length(): Promise<number> {
    return await inventoryDB.products.count();
  },

  async clear(): Promise<void> {
    await inventoryDB.products.clear();
  }
};

export const syncQueueStore = {
  async getItem<T>(id: string): Promise<T | null> {
    return await inventoryDB.syncQueue.get(id) as unknown as T;
  },

  async setItem(id: string, value: SyncQueueItem): Promise<string> {
    await inventoryDB.syncQueue.put(value);
    return id;
  },

  async removeItem(id: string): Promise<void> {
    await inventoryDB.syncQueue.delete(id);
  },

  async iterate<T, U>(callback: (item: T, key: string) => U | void): Promise<void> {
    const items = await inventoryDB.syncQueue.toArray();
    items.forEach((item: any) => {
      callback(item as unknown as T, item.id);
    });
  },

  async keys(): Promise<string[]> {
    const items = await inventoryDB.syncQueue.toArray();
    return items.map((item: any) => item.id);
  },

  async length(): Promise<number> {
    return await inventoryDB.syncQueue.count();
  },

  async clear(): Promise<void> {
    await inventoryDB.syncQueue.clear();
  }
};

export const customersStore = {
  async getItem<T>(id: string): Promise<T | null> {
    return await inventoryDB.customers.get(id) as unknown as T;
  },

  async setItem(id: string, value: LocalCustomer): Promise<string> {
    await inventoryDB.customers.put(value);
    return id;
  },

  async removeItem(id: string): Promise<void> {
    await inventoryDB.customers.delete(id);
  },

  async iterate<T, U>(callback: (item: T, key: string) => U | void): Promise<void> {
    const items = await inventoryDB.customers.toArray();
    items.forEach((item: any) => {
      callback(item as unknown as T, item.id);
    });
  }
};

export const addressesStore = {
  async getItem<T>(id: string): Promise<T | null> {
    return await inventoryDB.addresses.get(id) as unknown as T;
  },

  async setItem(id: string, value: LocalAddress): Promise<string> {
    await inventoryDB.addresses.put(value);
    return id;
  },

  async removeItem(id: string): Promise<void> {
    await inventoryDB.addresses.delete(id);
  },

  async iterate<T, U>(callback: (item: T, key: string) => U | void): Promise<void> {
    const items = await inventoryDB.addresses.toArray();
    items.forEach((item: any) => {
      callback(item as unknown as T, item.id);
    });
  },

  async keys(): Promise<string[]> {
    const items = await inventoryDB.addresses.toArray();
    return items.map((item: any) => item.id);
  },

  async length(): Promise<number> {
    return await inventoryDB.addresses.count();
  },

  async clear(): Promise<void> {
    await inventoryDB.addresses.clear();
  }
};

// تصدير للتوافقية مع الكود القديم
export default inventoryDB;
