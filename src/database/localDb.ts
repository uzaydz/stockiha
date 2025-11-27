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

// نموذج المنتج الموسع بإضافة حالة المزامنة - شامل جميع الأعمدة
export interface LocalProduct extends Product {
  // ⚡ حقول المزامنة
  synced: boolean;
  syncStatus?: 'pending' | 'error';
  lastSyncAttempt?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
  conflictResolution?: 'local' | 'remote' | 'merge';
  
  // ⚡ حقول البحث المحلية
  name_lower?: string;
  name_search?: string;
  name_normalized?: string;
  sku_lower?: string;
  sku_search?: string;
  barcode_lower?: string;
  barcode_digits?: string;
  
  // ⚡ الفئات
  category_id?: string | null;
  subcategory_id?: string | null;
  brand?: string | null;
  
  // ⚡ الأسعار (قد تكون موجودة في Product أيضاً)
  purchase_price?: number | null;
  compare_at_price?: number | null;
  wholesale_price?: number | null;
  partial_wholesale_price?: number | null;
  unit_purchase_price?: number | null;
  unit_sale_price?: number | null;
  
  // ⚡ المخزون
  min_stock_level?: number | null;
  min_wholesale_quantity?: number | null;
  min_partial_wholesale_quantity?: number | null;
  reorder_level?: number | null;
  reorder_quantity?: number | null;
  
  // ⚡ الحالات
  is_digital?: boolean;
  is_featured?: boolean;
  is_new?: boolean;
  is_sold_by_unit?: boolean;
  has_variants?: boolean;
  show_price_on_landing?: boolean;
  use_sizes?: boolean;
  use_variant_prices?: boolean;
  use_shipping_clone?: boolean;
  
  // ⚡ إعدادات البيع
  allow_retail?: boolean;
  allow_wholesale?: boolean;
  allow_partial_wholesale?: boolean;
  unit_type?: string | null;
  
  // ⚡ الصور المحلية
  thumbnail_base64?: string | null;
  images_base64?: string | null;
  
  // ⚡ الشحن والضمانات
  has_fast_shipping?: boolean;
  has_money_back?: boolean;
  has_quality_guarantee?: boolean;
  fast_shipping_text?: string | null;
  money_back_text?: string | null;
  quality_guarantee_text?: string | null;
  shipping_clone_id?: number | null;
  shipping_method_type?: string | null;
  shipping_provider_id?: number | null;
  
  // ⚡ إعدادات متقدمة
  purchase_page_config?: any | null;
  form_template_id?: string | null;
  last_inventory_update?: string | null;
}

// نموذج عنصر قائمة المزامنة
export interface SyncQueueItem {
  id: string;
  objectType: 'product' | 'inventory' | 'customer' | 'address' | 'order' | 'pos_orders' | 'invoice';
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
  invoice_number_lower?: string;
  remote_invoice_id?: string | null;
  customer_name?: string | null;
  customer_name_lower?: string | null;
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

// تعريف واجهة ديون العملاء
export interface LocalCustomerDebt {
  id: string;
  customer_id: string;
  customer_name?: string;
  // Order linkage
  order_id?: string;
  order_number?: string;
  // Amounts
  amount?: number; // legacy
  subtotal?: number; // المبلغ قبل الخصم
  discount?: number; // التخفيض
  total_amount: number; // المبلغ النهائي (بعد الخصم)
  paid_amount: number;
  remaining_amount: number;
  // Status & metadata
  status: 'pending' | 'partial' | 'paid' | 'unpaid';
  description?: string;
  due_date?: string | null;
  notes?: string | null;
  organization_id: string;
  // Sync fields
  synced: boolean;
  syncStatus?: string;
  pendingOperation?: 'create' | 'update' | 'delete';
  // Timestamps
  created_at: string;
  updated_at: string;
}

// تعريف واجهة سجل مدفوعات ديون العملاء
export interface LocalCustomerDebtPayment {
  id: string;
  organization_id: string;
  customer_id: string;
  amount: number;
  method?: string | null;
  note?: string | null;
  created_at: string;
  applied_by?: string | null;
  // حالة المزامنة
  synced: boolean;
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة طلبات الإصلاح
export interface LocalRepairOrder {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_name_lower?: string; // حقل محلي للبحث فقط
  device_type?: string | null;
  device_type_lower?: string; // حقل محلي للبحث فقط
  repair_location_id?: string | null;
  custom_location?: string | null;
  issue_description?: string | null;
  status: string;
  total_price?: number | null;
  paid_amount?: number;
  price_to_be_determined_later?: boolean;
  payment_method?: string | null;
  notes?: string | null;
  received_by?: string | null;
  repair_tracking_code?: string | null;
  organization_id: string;
  synced: boolean;
  syncStatus?: string;
  pendingOperation?: 'create' | 'update' | 'delete';
  localCreatedAt?: string;
  created_at: string;
  updated_at: string;
}

// تعريف واجهة سجل حالة الإصلاح
export interface LocalRepairStatusHistory {
  id: string;
  repair_order_id: string;
  status: string;
  created_by: string;
  created_at: string;
  notes?: string | null;
  synced: boolean;
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة موقع الإصلاح (الورشة)
export interface LocalRepairLocation {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  is_default: boolean;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  synced: boolean;
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة صور الإصلاح
export interface LocalRepairImage {
  id: string;
  repair_id: string;
  image_data: string;
  image_url?: string;
  image_type: string;
  file_size: number;
  is_thumbnail: boolean;
  synced: boolean;
  uploaded_to_server: boolean;
  server_url?: string;
  created_at: string;
  notes?: string | null;
  pendingOperation?: 'create' | 'update' | 'delete';
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

// تعريف واجهة إرجاع المنتج المحلي
export interface LocalProductReturn {
  id: string;
  return_number: string;
  return_number_lower?: string;
  remote_return_id?: string | null;
  original_order_id?: string | null;
  original_order_number?: string | null;
  customer_name?: string | null;
  customer_name_lower?: string | null;
  customer_id?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  return_type: string; // 'refund' | 'exchange' | 'store_credit' | etc.
  return_reason: string;
  return_reason_description?: string | null;
  original_total?: number;
  return_amount: number; // This seems to be the total value of returned items
  refund_amount: number; // This is the amount to be refunded
  restocking_fee?: number;
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'syncing' | 'error';
  refund_method?: string | null;
  requires_manager_approval?: boolean;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  approval_notes?: string | null;
  rejection_reason?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  processed_by?: string | null;
  processed_at?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
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
  quantity: number; // This maps to return_quantity
  return_quantity?: number; // Alias for quantity
  unit_price: number; // This maps to return_unit_price
  return_unit_price?: number; // Alias for unit_price
  refund_amount: number; // This maps to total_return_amount
  total_return_amount?: number; // Alias for refund_amount
  condition: string; // This maps to condition_status
  condition_status?: string; // Alias for condition
  restocked: boolean; // This maps to resellable
  resellable?: boolean; // Alias for restocked
  inventory_returned?: boolean;
  color_id?: string | null;
  color_name?: string | null;
  size_id?: string | null;
  size_name?: string | null;
  created_at: string;
  synced: boolean;
}

// تعريف واجهة الاشتراك المحلي
export interface LocalSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  start_date: string;
  end_date: string;
  trial_end_date?: string;
  features: string[]; // JSON array of enabled features
  last_check: string;
  synced: boolean;
}

// تعريف واجهة الصور المخبأة محلياً
export interface LocalImage {
  id: string;
  url: string; // Remote URL
  local_path: string; // Local file path
  entity_type: 'product' | 'category' | 'user' | 'organization';
  entity_id: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  last_accessed: string;
}

// ========================================
// تعريفات تحميلات الألعاب (Game Downloads)
// ========================================

// تعريف واجهة تصنيف الألعاب المحلي
export interface LocalGameCategory {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parent_id?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة اللعبة المحلية
export interface LocalGame {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  category_id?: string;
  platform: string;
  size_gb?: number;
  requirements?: Record<string, any>; // Stored as JSON string in SQLite
  images?: string[]; // Stored as JSON string in SQLite
  price: number;
  is_featured: boolean;
  is_active: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة طلب تحميل اللعبة المحلي
export interface LocalGameOrder {
  id: string;
  organization_id: string;
  tracking_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  game_id: string;
  device_type?: string;
  device_specs?: string;
  notes?: string;
  status: string;
  status_history: any[]; // Stored as JSON string
  assigned_to?: string;
  processing_started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  price: number;
  payment_status: string;
  payment_method?: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة إعدادات تحميل الألعاب المحلية
export interface LocalGameDownloadsSettings {
  id: string;
  organization_id: string;
  business_name?: string;
  business_logo?: string;
  welcome_message?: string;
  terms_conditions?: string;
  contact_info?: Record<string, any>; // JSON
  social_links?: Record<string, any>; // JSON
  order_prefix?: string;
  auto_assign_orders?: boolean;
  notification_settings?: Record<string, any>; // JSON
  working_hours?: Record<string, any>; // JSON
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
}

// ========================================
// تصدير قاعدة البيانات
// ========================================

/**
 * قاعدة البيانات المحلية - تستخدم SQLite فقط (Tauri/Electron)
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
