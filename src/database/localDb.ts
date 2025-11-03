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
  name_lower?: string;
  sku_lower?: string;
  barcode_lower?: string;
  // حقول مساعدة للبحث والتطبيع
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
  // فهارس مساعدة للبحث
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
  customer_name_lower?: string | null;
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
  created_at_ts?: number;
  updated_at: string;
  lastSyncAttempt?: string;
  error?: string;
  local_order_number: number;
  local_order_number_str?: string;
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

// Online Order Groups (offline-first)
export interface LocalOrderGroup {
  id: string;
  organization_id: string;
  name: string;
  enabled: boolean;
  strategy: 'round_robin' | 'least_busy' | 'weighted' | 'claim_only' | 'manual';
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface LocalOrderGroupRule {
  id: string;
  group_id: string;
  type: 'all' | 'product_ids';
  include: boolean;
  values: string[]; // product ids when type=product_ids
}

export interface LocalOrderAssignment {
  id: string;
  organization_id: string;
  order_id: string;
  group_id: string;
  staff_id: string;
  status: 'assigned' | 'accepted' | 'closed';
  assigned_at: string;
}

// بيانات اعتماد الموظف للأوفلاين (PIN مُشفّر)
export interface LocalStaffPIN {
  id: string; // staff_id
  organization_id: string;
  staff_name: string;
  pin_hash: string; // SHA-256(salt:pin)
  salt: string;     // base64
  permissions?: any;
  updated_at: string;
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

// سجل مدفوعات ديون العملاء (Ledger)
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

// المصروفات المحلية (أوفلاين)
export interface LocalExpense {
  id: string;
  organization_id: string;
  title: string;
  amount: number;
  category: string; // category_id
  expense_date: string; // ISO
  notes?: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  is_recurring: boolean;
  payment_method?: string | null;
  payment_ref?: string | null;
  vendor_name?: string | null;
  cost_center_id?: string | null;
  receipt_url?: string | null;
  created_at: string;
  updated_at: string;
  // تزامن
  synced: boolean;
  pendingOperation?: 'create' | 'update' | 'delete';
}

export interface LocalRecurringExpense {
  id: string;
  expense_id: string;
  frequency: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date?: string | null;
  next_due?: string | null;
  day_of_month?: number | null;
  day_of_week?: number | null;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
  // تزامن
  synced: boolean;
  pendingOperation?: 'create' | 'update' | 'delete';
}

export interface LocalExpenseCategory {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  created_at: string;
  updated_at: string;
  synced: boolean;
  pendingOperation?: 'create' | 'update' | 'delete';
}

// ==========================
// Repairs (Offline-first)
// ==========================
export interface LocalRepairOrder {
  id: string;
  organization_id: string;
  customer_name: string;
  customer_phone: string;
  customer_name_lower?: string;
  device_type?: string | null;
  device_type_lower?: string | null;
  repair_location_id?: string | null;
  custom_location?: string | null;
  issue_description?: string | null;
  status: string; // قيد الانتظار | جاري التصليح | مكتمل | ملغي | تم الاستلام | معلق
  total_price: number | null; // قد يكون null إن كان يحدد لاحقاً
  paid_amount: number; // تراكمية
  price_to_be_determined_later?: boolean;
  received_by?: string | null;
  order_number?: string | null;
  repair_tracking_code?: string | null;
  payment_method?: string | null;
  repair_notes?: string | null;
  created_at: string;
  updated_at: string;
  // sync flags
  synced: boolean;
  pendingOperation?: 'create' | 'update' | 'delete';
}

export interface LocalRepairStatusHistory {
  id: string;
  repair_order_id: string;
  status: string;
  notes?: string | null;
  created_by: string | 'customer';
  created_at: string;
  // sync
  synced: boolean;
  pendingOperation?: 'create' | 'update' | 'delete';
}

export interface LocalRepairImage {
  id: string;
  repair_order_id: string;
  image_type: 'before' | 'after' | 'other';
  description?: string | null;
  created_at: string;
  // storage linkage
  image_url?: string | null; // after upload
  storage_path?: string | null; // in remote bucket
  // sync
  synced: boolean;
  pendingOperation?: 'create' | 'update' | 'delete';
}

export interface LocalRepairImageFile {
  id: string; // same as image id or dedicated
  repair_image_id: string;
  mime: string;
  size: number;
  blob: Blob; // stored locally until uploaded
  uploaded: boolean;
}

export interface LocalRepairLocation {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_default?: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  // sync
  synced: boolean;
  pendingOperation?: 'create' | 'update' | 'delete';
}
// تعريف واجهة الإرجاعات المحلية
export interface LocalProductReturn {
  id: string;
  return_number: string;
  return_number_lower?: string;
  remote_return_id?: string | null;
  original_order_id?: string | null;
  original_order_number?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_name_lower?: string | null;
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

// تعريف واجهة الفواتير المحلية
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
  staffPins: Dexie.Table<LocalStaffPIN, string>;
  expenses: Dexie.Table<LocalExpense, string>;
  recurringExpenses: Dexie.Table<LocalRecurringExpense, string>;
  expenseCategories: Dexie.Table<LocalExpenseCategory, string>;
  customerDebtPayments: Dexie.Table<LocalCustomerDebtPayment, string>;
  // Repairs
  repairOrders: Dexie.Table<LocalRepairOrder, string>;
  repairStatusHistory: Dexie.Table<LocalRepairStatusHistory, string>;
  repairImages: Dexie.Table<LocalRepairImage, string>;
  repairImageFiles: Dexie.Table<LocalRepairImageFile, string>;
  repairLocations: Dexie.Table<LocalRepairLocation, string>;
  orderGroups: Dexie.Table<LocalOrderGroup, string>;
  orderGroupRules: Dexie.Table<LocalOrderGroupRule, string>;
  orderAssignments: Dexie.Table<LocalOrderAssignment, string>;
  orderGroupMembers: Dexie.Table<LocalOrderGroupMember, string>;

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

    // Version 6: إضافة جدول بيانات اعتماد الموظف (PIN)
    this.version(6).stores({
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
      invoiceItems: 'id, invoice_id, product_id',
      staffPins: 'id, organization_id' // id = staff_id، وفهرس على المؤسسة
    });

    // Version 7: فهارس بحث محلية فائقة السرعة للمنتجات
    this.version(7)
      .stores({
        products: [
          'id',
          'organization_id',
          'category_id',
          'name',
          'sku',
          'name_lower',
          'sku_lower',
          'barcode_lower',
          '[organization_id+name_lower]',
          '[organization_id+sku_lower]',
          '[organization_id+barcode_lower]',
          'synced',
          'pendingOperation'
        ].join(', ')
      })
      .upgrade(async (tx) => {
        const table = tx.table('products');
        await table.toCollection().modify((p: any) => {
          try {
            p.name_lower = (p.name || '').toString().toLowerCase();
            p.sku_lower = (p.sku || '').toString().toLowerCase();
            p.barcode_lower = (p.barcode || '').toString().toLowerCase();
            if (p.category_id == null) {
              p.category_id = p.category_id || (p.category && p.category.id ? p.category.id : null);
            }
          } catch {}
        });
      });

    // Version 8: فهارس إضافية للفئة والباركود الرقمي وتطبيع عربي
    this.version(8)
      .stores({
        products: [
          'id',
          'organization_id',
          'category_id',
          'is_active',
          'name',
          'sku',
          'name_lower',
          'sku_lower',
          'barcode_lower',
          'name_search',
          'sku_search',
          'barcode_digits',
          '[organization_id+name_lower]',
          '[organization_id+sku_lower]',
          '[organization_id+barcode_lower]',
          '[organization_id+category_id]',
          '[organization_id+barcode_digits]',
          'synced',
          'pendingOperation'
        ].join(', ')
      })
      .upgrade(async (tx) => {
        const table = tx.table('products');
        const normalizeArabic = (s: string) => {
          try {
            let t = (s || '').toString().toLowerCase();
            // إزالة التشكيل والتمطيط
            t = t.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
            // توحيد الألف والهمزات والتاء المربوطة والياء المقصورة
            t = t.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627'); // آأإٱ → ا
            t = t.replace(/\u0624/g, '\u0648'); // ؤ → و
            t = t.replace(/\u0626/g, '\u064a'); // ئ → ي
            t = t.replace(/\u0629/g, '\u0647'); // ة → ه
            t = t.replace(/\u0649/g, '\u064a'); // ى → ي
            // إزالة الرموز غير الأحرف/الأرقام/المسافات
            t = t.replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ');
            t = t.replace(/\s+/g, ' ').trim();
            return t;
          } catch {
            return (s || '').toString().toLowerCase();
          }
        };
        await table.toCollection().modify((p: any) => {
          try {
            const name = (p.name || '').toString();
            const sku = (p.sku || '').toString();
            const barcode = (p.barcode || '').toString();
            p.name_lower = name.toLowerCase();
            p.sku_lower = sku.toLowerCase();
            p.barcode_lower = barcode.toLowerCase();
            p.name_search = normalizeArabic(name);
            p.sku_search = normalizeArabic(sku);
            p.barcode_digits = barcode.replace(/\D+/g, '');
            if (p.category_id == null) {
              p.category_id = p.category_id || (p.category && p.category.id ? p.category.id : null);
            }
          } catch {}
        });
      });

    // Version 9: فهرس مرتب للاسم داخل الفئة
    this.version(9)
      .stores({
        products: [
          'id',
          'organization_id',
          'category_id',
          'is_active',
          'name',
          'sku',
          'name_lower',
          'sku_lower',
          'barcode_lower',
          'name_search',
          'sku_search',
          'barcode_digits',
          '[organization_id+name_lower]',
          '[organization_id+sku_lower]',
          '[organization_id+barcode_lower]',
          '[organization_id+category_id]',
          '[organization_id+category_id+name_lower]',
          '[organization_id+barcode_digits]',
          'synced',
          'pendingOperation'
        ].join(', ')
      });

    // Version 10: تحسينات الأوفلاين لطلبات POS، الفواتير، العملاء، الإرجاعات، والخسائر
    this.version(10)
      .stores({
        posOrders: [
          'id',
          'organization_id',
          'status',
          'payment_status',
          'customer_name_lower',
          'created_at',
          'created_at_ts',
          'local_order_number',
          'local_order_number_str',
          'remote_order_id',
          '[organization_id+created_at]',
          '[organization_id+status+created_at]',
          '[organization_id+customer_name_lower]'
        ].join(', '),
        invoices: [
          'id',
          'organization_id',
          'status',
          'invoice_number',
          'invoice_number_lower',
          'customer_name_lower',
          'created_at',
          '[organization_id+invoice_number_lower]',
          '[organization_id+status]',
          '[organization_id+created_at]'
        ].join(', '),
        customers: [
          'id',
          'organization_id',
          'name',
          'name_lower',
          'email',
          'email_lower',
          'phone',
          'phone_digits',
          'synced',
          'pendingOperation',
          '[organization_id+name_lower]',
          '[organization_id+phone_digits]',
          '[organization_id+email_lower]'
        ].join(', '),
        productReturns: [
          'id',
          'organization_id',
          'status',
          'return_number',
          'return_number_lower',
          'customer_name_lower',
          'created_at',
          '[organization_id+status]',
          '[organization_id+return_number_lower]',
          '[organization_id+created_at]'
        ].join(', '),
        lossDeclarations: [
          'id',
          'organization_id',
          'status',
          'loss_number',
          'loss_number_lower',
          'created_at',
          '[organization_id+status]',
          '[organization_id+loss_number_lower]',
          '[organization_id+created_at]'
        ].join(', '),
        workSessions: [
          'id',
          'organization_id',
          'staff_id',
          'status',
          'started_at',
          '[organization_id+status+started_at]'
        ].join(', ')
      })
      .upgrade(async (tx) => {
        // تطبيع الحقول للمساعدة في البحث والفهرسة
        const toLower = (s: any) => (s || '').toString().toLowerCase();
        const digits = (s: any) => (s || '').toString().replace(/\D+/g, '');

        try {
          const pos = tx.table('posOrders');
          await pos.toCollection().modify((o: any) => {
            o.customer_name_lower = toLower(o.customer_name);
            o.created_at_ts = o.created_at ? Date.parse(o.created_at) : undefined;
            o.local_order_number_str = (o.local_order_number != null) ? String(o.local_order_number) : undefined;
          });
        } catch {}

        try {
          const inv = tx.table('invoices');
          await inv.toCollection().modify((i: any) => {
            i.invoice_number_lower = toLower(i.invoice_number);
            i.customer_name_lower = toLower(i.customer_name);
          });
        } catch {}

        try {
          const cust = tx.table('customers');
          await cust.toCollection().modify((c: any) => {
            c.name_lower = toLower(c.name);
            c.email_lower = toLower(c.email);
            c.phone_digits = digits(c.phone);
          });
        } catch {}

        try {
          const rets = tx.table('productReturns');
          await rets.toCollection().modify((r: any) => {
            r.return_number_lower = toLower(r.return_number);
            r.customer_name_lower = toLower(r.customer_name);
          });
        } catch {}

        try {
          const losses = tx.table('lossDeclarations');
          await losses.toCollection().modify((l: any) => {
            l.loss_number_lower = toLower(l.loss_number);
          });
        } catch {}
      });

    // Version 11: إضافة فهرس pendingOperation وsynced لطلبات POS
    this.version(11)
      .stores({
        posOrders: [
          'id',
          'organization_id',
          'status',
          'payment_status',
          'customer_name_lower',
          'created_at',
          'created_at_ts',
          'local_order_number',
          'local_order_number_str',
          'remote_order_id',
          'pendingOperation',
          'synced',
          '[organization_id+created_at]',
          '[organization_id+status+created_at]',
          '[organization_id+customer_name_lower]'
        ].join(', ')
      });

    // Version 12: جدول مدفوعات الديون
    this.version(12)
      .stores({
        customerDebtPayments: [
          'id',
          'organization_id',
          'customer_id',
          'created_at',
          'synced',
          'pendingOperation',
          '[organization_id+customer_id]',
          '[organization_id+created_at]'
        ].join(', ')
      });

    // Version 13: جداول المصروفات للأوفلاين
    this.version(13)
      .stores({
        expenses: [
          'id',
          'organization_id',
          'category',
          'expense_date',
          'status',
          'is_recurring',
          'synced',
          'pendingOperation',
          '[organization_id+expense_date]',
          '[organization_id+category]'
        ].join(', '),
        recurringExpenses: [
          'id',
          'expense_id',
          'frequency',
          'start_date',
          'next_due',
          'status',
          'synced',
          'pendingOperation',
          '[expense_id+status]'
        ].join(', '),
        expenseCategories: [
          'id',
          'organization_id',
          'name',
          'synced',
          'pendingOperation',
          '[organization_id+name]'
        ].join(', ')
      });
    
    // Version 14: جداول خدمات التصليح (أوفلاين)
    this.version(14)
      .stores({
        repairOrders: [
          'id',
          'organization_id',
          'status',
          'order_number',
          'repair_tracking_code',
          'customer_phone',
          'customer_name_lower',
          'device_type_lower',
          'synced',
          'pendingOperation',
          '[organization_id+created_at]',
          '[organization_id+status+created_at]'
        ].join(', '),
        repairStatusHistory: [
          'id',
          'repair_order_id',
          'created_at',
          'synced',
          'pendingOperation',
          '[repair_order_id+created_at]'
        ].join(', '),
        repairImages: [
          'id',
          'repair_order_id',
          'created_at',
          'synced',
          'pendingOperation',
          '[repair_order_id+created_at]'
        ].join(', '),
        repairImageFiles: [
          'id',
          'repair_image_id',
          'uploaded'
        ].join(', '),
        repairLocations: [
          'id',
          'organization_id',
          'name',
          'is_default',
          'is_active',
          'created_at',
          'synced',
          'pendingOperation',
          '[organization_id+is_active]',
          '[organization_id+name]'
        ].join(', ')
      });

    // Version 15: إضافة فهارس مركبة لحالة الدفع وطريقة الدفع لطلبات POS
    this.version(15)
      .stores({
        posOrders: [
          'id',
          'organization_id',
          'status',
          'payment_status',
          'payment_method',
          'customer_name_lower',
          'created_at',
          'created_at_ts',
          'local_order_number',
          'local_order_number_str',
          'remote_order_id',
          'pendingOperation',
          'synced',
          '[organization_id+created_at]',
          '[organization_id+status+created_at]',
          '[organization_id+customer_name_lower]',
          '[organization_id+payment_status]',
          '[organization_id+payment_method]'
        ].join(', ')
      });

    // Version 16: Online order groups (local-only)
    this.version(16)
      .stores({
        orderGroups: [
          'id',
          'organization_id',
          'name',
          'enabled',
          'strategy',
          'priority',
          'created_at',
          'updated_at',
          '[organization_id+name]'
        ].join(', '),
        orderGroupRules: [
          'id',
          'group_id',
          'type',
          'include'
        ].join(', '),
        orderAssignments: [
          'id',
          'organization_id',
          'order_id',
          'group_id',
          'staff_id',
          'status',
          'assigned_at',
          '[organization_id+order_id]'
        ].join(', ')
      });

    this.version(17)
      .stores({
        orderGroupMembers: [
          'id',
          'group_id',
          'staff_id',
          'active'
        ].join(', ')
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
    this.staffPins = this.table('staffPins');
    this.customerDebtPayments = this.table('customerDebtPayments');
    this.expenses = this.table('expenses');
    this.recurringExpenses = this.table('recurringExpenses');
    this.expenseCategories = this.table('expenseCategories');
    // repairs
    this.repairOrders = this.table('repairOrders');
    this.repairStatusHistory = this.table('repairStatusHistory');
    this.repairImages = this.table('repairImages');
    this.repairImageFiles = this.table('repairImageFiles');
    this.repairLocations = this.table('repairLocations');
    // online order groups
    this.orderGroups = this.table('orderGroups');
    this.orderGroupRules = this.table('orderGroupRules');
    this.orderAssignments = this.table('orderAssignments');
    this.orderGroupMembers = this.table('orderGroupMembers');
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
