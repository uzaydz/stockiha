import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { Product } from '@/api/productService';
import type { POSOrderPayload, POSOrderSyncStatus } from '@/types/posOrder';

// تكوين قواعد البيانات المحلية

// نموذج المنتج الموسع بإضافة حالة المزامنة
export interface LocalProduct extends Product {
  synced: boolean;
  syncStatus?: 'pending' | 'error';
  lastSyncAttempt?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
  conflictResolution?: 'local' | 'remote' | 'merge';
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
  priority: number; // 1: عالي، 2: متوسط، 3: منخفض
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
  // حقول التزامن
  synced: boolean;
  syncStatus?: string;
  lastSyncAttempt?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
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
  // حقول التزامن
  synced: boolean;
  syncStatus?: string;
  lastSyncAttempt?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
}

export interface LocalPOSOrder {
  id: string;
  organization_id: string;
  employee_id: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  subtotal: number;
  total: number;
  discount: number;
  amount_paid: number;
  payment_method: string;
  payment_status: string;
  notes?: string;
  remaining_amount?: number;
  consider_remaining_as_partial?: boolean;
  status: 'pending_sync' | 'syncing' | 'synced' | 'failed';
  synced: boolean;
  syncStatus?: POSOrderSyncStatus;
  pendingOperation?: 'create' | 'update' | 'delete';
  created_at: string;
  updated_at: string;
  lastSyncAttempt?: string;
  error?: string;
  local_order_number: number;
  remote_order_id?: string;
  remote_customer_order_number?: number;
  payload?: POSOrderPayload;
  metadata?: Record<string, unknown>;
  message?: string;
  pending_updates?: Record<string, any> | null;
  extra_fields?: Record<string, any> | null;
}

export interface LocalPOSOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_wholesale?: boolean;
  original_price?: number;
  color_id?: string | null;
  color_name?: string | null;
  size_id?: string | null;
  size_name?: string | null;
  variant_info?: any;
  synced: boolean;
  created_at: string;
}

export interface LocalOrganizationSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  billing_cycle?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  amount?: number | null;
  currency?: string | null;
  is_auto_renew?: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface LocalSubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  features?: any;
  monthly_price?: number | null;
  yearly_price?: number | null;
  trial_period_days?: number | null;
  limits?: any;
  is_active?: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface LocalPOSSettings {
  organization_id: string;
  store_name?: string | null;
  store_address?: string | null;
  store_phone?: string | null;
  store_email?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  receipt_logo_url?: string | null;
  receipt_show_logo?: boolean | null;
  receipt_show_barcode?: boolean | null;
  receipt_show_qr?: boolean | null;
  receipt_paper_size?: string | null;
  receipt_font_size?: string | null;
  receipt_font_family?: string | null;
  auto_print_receipt?: boolean | null;
  print_copies?: number | null;
  tax_enabled?: boolean | null;
  tax_rate?: number | null;
  tax_number?: string | null;
  currency?: string | null;
  currency_symbol?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  synced?: boolean | null;
  pending_sync?: boolean | null;
  [key: string]: any;
}

// تعريف واجهة ديون العملاء المحلية
export interface LocalCustomerDebt {
  id: string;
  customer_id: string;
  customer_name: string;
  order_id: string;
  order_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending' | 'partial' | 'paid';
  due_date?: string | null;
  notes?: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة الإرجاعات المحلية
export interface LocalProductReturn {
  id: string;
  return_number: string;
  original_order_id?: string | null;
  original_order_number?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  return_type: 'full' | 'partial';
  return_reason: string;
  return_reason_description?: string | null;
  original_total: number;
  return_amount: number;
  refund_amount: number;
  restocking_fee?: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approved_by?: string | null;
  approved_at?: string | null;
  refund_method?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  requires_manager_approval?: boolean | null;
  created_by?: string | null;
  processed_by?: string | null;
  processed_at?: string | null;
  approval_notes?: string | null;
  rejection_reason?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
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
  return_quantity: number;
  return_unit_price: number;
  total_return_amount: number;
  condition_status?: string | null;
  resellable: boolean;
  inventory_returned: boolean;
  color_id?: string | null;
  color_name?: string | null;
  size_id?: string | null;
  size_name?: string | null;
  created_at: string;
  synced: boolean;
}

// تعريف واجهة الخسائر المحلية
export interface LocalLossDeclaration {
  id: string;
  loss_number: string;
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

// تعريف واجهة الفواتير المحلية
export interface LocalInvoice {
  id: string;
  invoice_number: string;
  customer_name?: string | null;
  customer_id?: string | null;
  total_amount: number;
  invoice_date: string;
  due_date?: string | null;
  status: string;
  source_type: string;
  payment_method: string;
  payment_status: string;
  notes?: string | null;
  tax_amount: number;
  discount_amount: number;
  subtotal_amount: number;
  shipping_amount?: number | null;
  discount_type?: string | null;
  discount_percentage?: number | null;
  tva_rate?: number | null;
  amount_ht?: number | null;
  amount_tva?: number | null;
  amount_ttc?: number | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
}

export interface LocalInvoiceItem {
  id: string;
  invoice_id: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_id?: string | null;
  type: string;
  sku?: string | null;
  barcode?: string | null;
  tva_rate?: number | null;
  unit_price_ht?: number | null;
  unit_price_ttc?: number | null;
  total_ht?: number | null;
  total_tva?: number | null;
  total_ttc?: number | null;
  created_at: string;
  synced: boolean;
}

// تعريف واجهة جلسة العمل المحلية
export interface LocalWorkSession {
  id: string;
  organization_id: string;
  staff_id: string;
  staff_name: string;
  opening_cash: number;
  closing_cash?: number | null;
  expected_cash?: number | null;
  cash_difference?: number | null;
  total_sales: number;
  total_orders: number;
  cash_sales: number;
  card_sales: number;
  started_at: string;
  ended_at?: string | null;
  paused_at?: string | null;
  resumed_at?: string | null;
  pause_count: number;
  total_pause_duration: number; // بالثواني
  status: 'active' | 'paused' | 'closed';
  opening_notes?: string | null;
  closing_notes?: string | null;
  created_at: string;
  updated_at: string;
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update';
}

// تعريف فئة قاعدة البيانات المحلية
export class LocalDatabase extends Dexie {
  // تعريف الجداول
  products: Dexie.Table<LocalProduct, string>;
  inventory: Dexie.Table<InventoryItem, string>;
  transactions: Dexie.Table<InventoryTransaction, string>;
  syncQueue: Dexie.Table<SyncQueueItem, string>;
  customers: Dexie.Table<LocalCustomer, string>;
  addresses: Dexie.Table<LocalAddress, string>;
  posOrders: Dexie.Table<LocalPOSOrder, string>;
  posOrderItems: Dexie.Table<LocalPOSOrderItem, string>;
  organizationSubscriptions: Dexie.Table<LocalOrganizationSubscription, string>;
  subscriptionPlans: Dexie.Table<LocalSubscriptionPlan, string>;
  posSettings: Dexie.Table<LocalPOSSettings, string>;
  workSessions: Dexie.Table<LocalWorkSession, string>;
  customerDebts: Dexie.Table<LocalCustomerDebt, string>;
  productReturns: Dexie.Table<LocalProductReturn, string>;
  returnItems: Dexie.Table<LocalReturnItem, string>;
  lossDeclarations: Dexie.Table<LocalLossDeclaration, string>;
  lossItems: Dexie.Table<LocalLossItem, string>;
  invoices: Dexie.Table<LocalInvoice, string>;
  invoiceItems: Dexie.Table<LocalInvoiceItem, string>;

  constructor() {
    super('bazaarDB_v2');
    
    // تعريف مخطط قاعدة البيانات
    this.version(1).stores({
      products: 'id, name, sku, category, organization_id, synced, pendingOperation',
      inventory: 'id, product_id, variant_id, synced',
      transactions: 'id, product_id, variant_id, reason, timestamp, synced, created_by',
      syncQueue: 'id, objectType, objectId, operation, priority, createdAt',
      customers: 'id, name, email, phone, organization_id, synced, pendingOperation', 
      addresses: 'id, customer_id, organization_id, is_default, synced, pendingOperation'
    });

    this.version(2).stores({
      products: 'id, name, sku, category, organization_id, synced, pendingOperation',
      inventory: 'id, product_id, variant_id, synced',
      transactions: 'id, product_id, variant_id, reason, timestamp, synced, created_by',
      syncQueue: 'id, objectType, objectId, operation, priority, createdAt',
      customers: 'id, name, email, phone, organization_id, synced, pendingOperation', 
      addresses: 'id, customer_id, organization_id, is_default, synced, pendingOperation',
      posOrders: 'id, organization_id, status, synced, pendingOperation, local_order_number, created_at',
      posOrderItems: 'id, order_id, product_id'
    });

    this.version(3).stores({
      products: 'id, name, sku, category, organization_id, synced, pendingOperation',
      inventory: 'id, product_id, variant_id, synced',
      transactions: 'id, product_id, variant_id, reason, timestamp, synced, created_by',
      syncQueue: 'id, objectType, objectId, operation, priority, createdAt',
      customers: 'id, name, email, phone, organization_id, synced, pendingOperation', 
      addresses: 'id, customer_id, organization_id, is_default, synced, pendingOperation',
      posOrders: 'id, organization_id, status, synced, pendingOperation, local_order_number, created_at',
      posOrderItems: 'id, order_id, product_id',
      organizationSubscriptions: 'id, organization_id, status, end_date',
      subscriptionPlans: 'id, code',
      posSettings: 'organization_id'
    });

    this.version(4).stores({
      products: 'id, name, sku, category, organization_id, synced, pendingOperation',
      inventory: 'id, product_id, variant_id, synced',
      transactions: 'id, product_id, variant_id, reason, timestamp, synced, created_by',
      syncQueue: 'id, objectType, objectId, operation, priority, createdAt',
      customers: 'id, name, email, phone, organization_id, synced, pendingOperation', 
      addresses: 'id, customer_id, organization_id, is_default, synced, pendingOperation',
      posOrders: 'id, organization_id, status, synced, pendingOperation, local_order_number, created_at',
      posOrderItems: 'id, order_id, product_id',
      organizationSubscriptions: 'id, organization_id, status, end_date',
      subscriptionPlans: 'id, code',
      posSettings: 'organization_id',
      workSessions: 'id, organization_id, staff_id, status, synced, started_at'
    });

    // Version 5: إضافة جداول الديون، الإرجاعات، الخسائر، والفواتير
    this.version(5).stores({
      products: 'id, name, sku, category, organization_id, synced, pendingOperation',
      inventory: 'id, product_id, variant_id, synced',
      transactions: 'id, product_id, variant_id, reason, timestamp, synced, created_by',
      syncQueue: 'id, objectType, objectId, operation, priority, createdAt',
      customers: 'id, name, email, phone, organization_id, synced, pendingOperation', 
      addresses: 'id, customer_id, organization_id, is_default, synced, pendingOperation',
      posOrders: 'id, organization_id, status, synced, pendingOperation, local_order_number, created_at',
      posOrderItems: 'id, order_id, product_id',
      organizationSubscriptions: 'id, organization_id, status, end_date',
      subscriptionPlans: 'id, code',
      posSettings: 'organization_id',
      workSessions: 'id, organization_id, staff_id, status, synced, started_at',
      customerDebts: 'id, customer_id, order_id, organization_id, status, synced, pendingOperation, created_at',
      productReturns: 'id, return_number, organization_id, status, synced, pendingOperation, created_at',
      returnItems: 'id, return_id, product_id',
      lossDeclarations: 'id, loss_number, organization_id, status, synced, pendingOperation, created_at',
      lossItems: 'id, loss_id, product_id',
      invoices: 'id, invoice_number, organization_id, status, synced, pendingOperation, created_at',
      invoiceItems: 'id, invoice_id, product_id'
    });
    
    // تعريف الجداول بأنواعها
    this.products = this.table('products');
    this.inventory = this.table('inventory');
    this.transactions = this.table('transactions');
    this.syncQueue = this.table('syncQueue');
    this.customers = this.table('customers');
    this.addresses = this.table('addresses');
    this.posOrders = this.table('posOrders');
    this.posOrderItems = this.table('posOrderItems');
    this.organizationSubscriptions = this.table('organizationSubscriptions');
    this.subscriptionPlans = this.table('subscriptionPlans');
    this.posSettings = this.table('posSettings');
    this.workSessions = this.table('workSessions');
    this.customerDebts = this.table('customerDebts');
    this.productReturns = this.table('productReturns');
    this.returnItems = this.table('returnItems');
    this.lossDeclarations = this.table('lossDeclarations');
    this.lossItems = this.table('lossItems');
    this.invoices = this.table('invoices');
    this.invoiceItems = this.table('invoiceItems');
  }
}

// إنشاء نسخة فردية من قاعدة البيانات
export const inventoryDB = new LocalDatabase();

// المخازن المستخدمة للتعامل مع الكائنات المختلفة
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
    await inventoryDB.products.each((item, cursor) => {
      callback(item as unknown as T, cursor.primaryKey.toString());
    });
  },
  
  // وظائف إضافية لدعم عمليات localforage
  async keys(): Promise<string[]> {
    const keys = await inventoryDB.products.toCollection().primaryKeys();
    return keys.map((k) => String(k));
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
    await inventoryDB.syncQueue.each((item, cursor) => {
      callback(item as unknown as T, cursor.primaryKey.toString());
    });
  },
  
  // وظائف إضافية لدعم عمليات localforage
  async keys(): Promise<string[]> {
    const keys = await inventoryDB.syncQueue.toCollection().primaryKeys();
    return keys.map((k) => String(k));
  },
  
  async length(): Promise<number> {
    return await inventoryDB.syncQueue.count();
  },
  
  async clear(): Promise<void> {
    await inventoryDB.syncQueue.clear();
  }
};

// إضافة مخازن جديدة للعملاء والعناوين
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
    await inventoryDB.customers.each((item, cursor) => {
      callback(item as unknown as T, cursor.primaryKey.toString());
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
    await inventoryDB.addresses.each((item, cursor) => {
      callback(item as unknown as T, cursor.primaryKey.toString());
    });
  }
};

// استيراد في بداية تشغيل التطبيق
export async function hydrateLocalDB() {
  try {
    // التحقق مما إذا كان التخزين المحلي فارغًا
    const count = await inventoryDB.products.count();
    
    if (count === 0) {
      
      // يمكن تنفيذ منطق لتعبئة التخزين المحلي هنا إذا لزم الأمر
    } else {
      
    }
  } catch (error) {
  }
}
