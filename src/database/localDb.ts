/**
 * قاعدة البيانات المحلية - النظام الموحد: SQLite فقط
 * 
 * ⚡ تم توحيد النظام: SQLite + SyncManager فقط
 * - تم إزالة نظام IndexedDB القديم بالكامل
 * - تم إزالة نظام المزامنة القديم (Legacy Sync)
 * - النظام الحالي: SQLite + SyncManager (Delta Sync)
 * 
 * ⚡ ملاحظة: الأنواع الموحدة الجديدة موجودة في @/lib/types/entities/
 * يتم إعادة تصدير الأنواع القديمة هنا للتوافق العكسي
 * 
 * ⚠️ متطلبات: يجب استخدام Tauri/Electron (SQLite مطلوب)
 */

import { inventoryDB as dbAdapter } from '@/lib/db/dbAdapter';
import { Product } from '@/api/productService';
import type { POSOrderSyncStatus } from '@/types/posOrder';

// ========================================
// ⚡ الأنواع الموحدة الجديدة - للاستخدام في الكود الجديد
// ========================================
export type {
  LocalOrder as UnifiedLocalOrder,
  LocalOrderItem as UnifiedLocalOrderItem,
  LocalOrderWithItems as UnifiedLocalOrderWithItems,
  CreateOrderInput,
  CreateOrderItemInput,
} from '@/lib/types/entities/order';

export type {
  LocalProduct as UnifiedLocalProduct,
} from '@/lib/types/entities/product';

export type {
  LocalCustomer as UnifiedLocalCustomer,
} from '@/lib/types/entities/customer';

export type {
  LocalUser as UnifiedLocalEmployee,
} from '@/lib/types/entities/employee';

export type {
  LocalStaffWorkSession as UnifiedLocalWorkSession,
} from '@/lib/types/entities/work-session';

export type {
  LocalRepairOrder as UnifiedLocalRepair,
  LocalRepairStatusHistory as UnifiedLocalRepairStatusHistory,
} from '@/lib/types/entities/repair';

export type {
  LocalInvoice as UnifiedLocalInvoice,
  LocalInvoiceItem as UnifiedLocalInvoiceItem,
} from '@/lib/types/entities/invoice';

export type {
  LocalReturn as UnifiedLocalReturn,
  LocalReturnItem as UnifiedLocalReturnItem,
} from '@/lib/types/entities/return';

export type {
  LocalExpense as UnifiedLocalExpense,
  LocalExpenseCategory as UnifiedLocalExpenseCategory,
} from '@/lib/types/entities/expense';

export type {
  LocalLoss as UnifiedLocalLoss,
  LocalLossItem as UnifiedLocalLossItem,
} from '@/lib/types/entities/loss';

export type {
  LocalSupplier as UnifiedLocalSupplier,
} from '@/lib/types/entities/supplier';

export type {
  LocalSupplierPurchase as UnifiedLocalSupplierPurchase,
  LocalSupplierPurchaseItem as UnifiedLocalSupplierPurchaseItem,
  LocalSupplierPayment as UnifiedLocalSupplierPayment,
} from '@/lib/types/entities/supplier-purchase';

// ========================================
// التعريفات والأنواع - مستوردة من الملف الموحد
// ========================================
import type { LocalProductFull } from '@/types/localProduct';

// ⚡ إعادة تصدير LocalProduct للتوافقية مع الكود القديم
export type LocalProduct = LocalProductFull;

// نموذج عنصر قائمة المزامنة
export interface SyncQueueItem {
  id: string;
  objectType: 'product' | 'inventory' | 'customer' | 'address' | 'orders' | 'invoice';  // ✅ orders بدلاً من pos_orders
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
// ✅ محدّث: أعمدة المزامنة موحدة مع SQLite schema
export interface InventoryTransaction {
  id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  reason: string;
  notes?: string;
  source_id?: string;
  timestamp: Date;
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
  created_by: string;
}

// تعريف واجهة عنصر المخزون
// ✅ محدّث: أعمدة المزامنة موحدة مع SQLite schema
export interface InventoryItem {
  id?: string;
  product_id: string;
  variant_id: string | null;
  stock_quantity: number;
  last_updated: Date;
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
}

// تعريف واجهة بيانات العميل المحلي
// ✅ محدّث: أعمدة المزامنة موحدة مع SQLite schema
export interface LocalCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
  // ⚡ أعمدة البحث المحلية
  name_lower?: string;
  email_lower?: string;
  phone_digits?: string;
  // Legacy fields (للتوافق العكسي - ستُحذف لاحقاً)
  _synced?: number;
  _sync_status?: string;
  _pending_operation?: string;
  _local_updated_at?: string;
  _error?: string;
  _name_lower?: string;
  _email_lower?: string;
  _phone_digits?: string;
}

// تعريف واجهة بيانات عنوان العميل
// ✅ محدّث: أعمدة المزامنة موحدة مع SQLite schema
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
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
  // Legacy fields (للتوافق العكسي - ستُحذف لاحقاً)
  syncStatus?: string;
  lastSyncAttempt?: string;
  localUpdatedAt?: string;
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة الطلبات المحلية
// ✅ محدّث: الجدول الآن "orders" (كان pos_orders)، أعمدة المزامنة موحدة مع SQLite schema
export interface LocalOrder {
  id: string;
  global_order_number?: string;  // ✅ كان order_number
  organization_id: string;
  employee_id?: string | null;  // ✅ كان staff_id
  customer_id?: string | null;
  customer_name?: string | null;
  subtotal: number;
  total: number;  // ✅ كان total_amount
  tax?: number;
  discount?: number;
  amount_paid?: number;  // ✅ كان paid_amount
  payment_method?: string;
  payment_status?: string;
  notes?: string;
  remaining_amount?: number;
  consider_remaining_as_partial?: boolean;
  is_online?: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
  // ⚡ حقول إضافية
  customer_name_lower?: string;
  local_order_number?: number;
  metadata?: any;
  extra_fields?: any;
  // Legacy fields (للتوافق العكسي - ستُحذف لاحقاً)
  _synced?: number;
  _sync_status?: string;
  _pending_operation?: string;
  _local_updated_at?: string;
  _error?: string;
  _local_order_number?: number;
  _customer_name_lower?: string;
}

// ✅ Alias للتوافق العكسي مع الكود القديم
export type LocalPOSOrder = LocalOrder;

// تعريف واجهة عنصر الطلب
// ✅ محدّث: الجدول الآن "order_items" (كان pos_order_items)
export interface LocalOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  name: string;  // ✅ كان product_name
  quantity: number;
  unit_price: number;
  total_price: number;  // ✅ كان subtotal
  discount: number;
  created_at: string;
  is_wholesale?: boolean;
  original_price?: number;
  sale_type?: 'retail' | 'wholesale' | 'partial_wholesale';
  color_id?: string | null;
  color_name?: string | null;
  size_id?: string | null;
  size_name?: string | null;
  variant_info?: Record<string, unknown> | null;
  slug?: string;
  // ⚡ حقول البيع المتقدم
  selling_unit_type?: 'piece' | 'weight' | 'box' | 'meter';
  weight_sold?: number | null;
  weight_unit?: string | null;
  price_per_weight_unit?: number | null;
  meters_sold?: number | null;
  price_per_meter?: number | null;
  boxes_sold?: number | null;
  units_per_box?: number | null;
  box_price?: number | null;
  // ⚡ حقول التتبع
  batch_id?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  serial_numbers?: string | null;
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced?: number;
  // Legacy fields (للتوافق العكسي)
  _synced?: number;
}

// ✅ Alias للتوافق العكسي
export type LocalPOSOrderItem = LocalOrderItem;

// تعريف واجهة الفاتورة المحلية
// ✅ محدّث: أعمدة المزامنة موحدة مع SQLite schema
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
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
  // Legacy fields (للتوافق العكسي - ستُحذف لاحقاً)
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة ديون العملاء
// ⚡ v2.0: الديون يتم حسابها من جدول orders وليس جدول منفصل
// الدين = طلب فيه remaining_amount > 0
export interface LocalCustomerDebt {
  id: string;                    // order_id - الدين هو الطلب نفسه
  organization_id: string;
  customer_id: string | null;
  customer_name?: string;
  // Order info
  order_number?: number;
  // Amounts
  total: number;                 // إجمالي الطلب
  total_amount: number;          // alias for total
  amount_paid: number;           // المبلغ المدفوع
  paid_amount: number;           // alias for amount_paid (legacy)
  remaining_amount: number;      // المبلغ المتبقي
  amount?: number;               // alias for remaining_amount (legacy)
  // Status
  status: string;                // حالة الطلب
  payment_status: string;        // حالة الدفع: pending | partial | paid
  // Staff info
  employee_id?: string;
  employee_name?: string;
  // Timestamps
  created_at: string;
  updated_at?: string;
  // Legacy fields (للتوافق العكسي - لم تعد مستخدمة)
  synced?: number;
  syncStatus?: string;
  pendingOperation?: string;
}

// تعريف واجهة سجل مدفوعات ديون العملاء
// ✅ محدّث: أعمدة المزامنة موحدة مع SQLite schema
export interface LocalCustomerDebtPayment {
  id: string;
  organization_id: string;
  customer_id: string;
  amount: number;
  method?: string | null;
  note?: string | null;
  created_at: string;
  applied_by?: string | null;
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
  // Legacy fields (للتوافق العكسي - ستُحذف لاحقاً)
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة طلبات الإصلاح
// ✅ محدّث: أعمدة المزامنة موحدة مع SQLite schema
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
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
  localCreatedAt?: string;
  created_at: string;
  updated_at: string;
  // Legacy fields (للتوافق العكسي - ستُحذف لاحقاً)
  syncStatus?: string;
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة سجل حالة الإصلاح
// ✅ محدّث: أعمدة المزامنة موحدة مع SQLite schema
export interface LocalRepairStatusHistory {
  id: string;
  repair_order_id: string;
  status: string;
  created_by: string;
  created_at: string;
  notes?: string | null;
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
  // Legacy fields (للتوافق العكسي - ستُحذف لاحقاً)
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة موقع الإصلاح (الورشة)
// ✅ محدّث: أعمدة المزامنة موحدة مع SQLite schema
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
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
  // Legacy fields (للتوافق العكسي - ستُحذف لاحقاً)
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة صور الإصلاح
// ⚡ v3.0: محدّث ليتطابق مع Supabase schema
export interface LocalRepairImage {
  id: string;
  repair_order_id: string; // ⚡ v3.0: تم تصحيح الاسم ليتطابق مع Supabase
  image_url: string;
  image_type: string; // 'before' | 'after' | 'during' | 'receipt'
  description?: string | null;
  created_at: string;
  updated_at?: string;
  // ⚡ Legacy fields - للتوافق فقط
  storage_path?: string | null;
  synced?: boolean;
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
// ✅ محدّث: الجدول الآن "work_sessions"، أعمدة المزامنة موحدة مع SQLite schema
export interface LocalStaffWorkSession {
  id: string;
  employee_id: string;  // ✅ كان staff_id
  employee_name?: string;  // ✅ كان staff_name
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
  total_pause_duration?: number;

  // الحالة
  status: 'active' | 'paused' | 'closed';

  // ملاحظات
  opening_notes?: string;
  closing_notes?: string;

  created_at: string;
  updated_at: string;

  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
  // Legacy fields (للتوافق العكسي - ستُحذف لاحقاً)
  _synced?: number;
  _sync_status?: string;
  _pending_operation?: string;
  _local_updated_at?: string;
  _error?: string;
}

// ✅ Alias للتوافق العكسي
export type LocalWorkSession = LocalStaffWorkSession;

// تعريف واجهة الخسائر المحلية
// ✅ محدّث: الجدول الآن "losses" و "loss_declarations"، أعمدة المزامنة موحدة مع SQLite schema
export interface LocalLoss {
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
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
  loss_number_lower?: string;
  // Legacy fields (للتوافق العكسي - ستُحذف لاحقاً)
  _synced?: number;
  _sync_status?: string;
  _pending_operation?: string;
  _local_updated_at?: string;
  _error?: string;
  _loss_number_lower?: string;
}

// ✅ Alias للتوافق العكسي
export type LocalLossDeclaration = LocalLoss;

// ✅ محدّث: أعمدة المزامنة موحدة مع SQLite schema
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
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
}

// تعريف واجهة عنصر الفاتورة المحلية
// ✅ محدّث: أعمدة المزامنة موحدة مع SQLite schema
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
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
}

// تعريف واجهة إرجاع المنتج المحلي
// ✅ محدّث: الجدول الآن "returns" (كان product_returns)، أعمدة المزامنة موحدة مع SQLite schema
export interface LocalReturn {
  id: string;
  return_number: string;
  original_order_id?: string | null;
  original_order_number?: string | null;
  customer_name?: string | null;
  customer_id?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  return_type: string;
  return_reason: string;
  return_reason_description?: string | null;
  original_total?: number;
  return_amount: number;
  refund_amount: number;
  restocking_fee?: number;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
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
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
  return_number_lower?: string;
  customer_name_lower?: string;
  // Legacy fields (للتوافق العكسي - ستُحذف لاحقاً)
  _synced?: number;
  _sync_status?: string;
  _pending_operation?: string;
  _local_updated_at?: string;
  _error?: string;
  _return_number_lower?: string;
  _customer_name_lower?: string;
}

// ✅ Alias للتوافق العكسي
export type LocalProductReturn = LocalReturn;

// ✅ محدّث: أعمدة المزامنة موحدة مع SQLite schema + دعم أنواع البيع
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
  // ⚡ حقول المتغيرات (الألوان والمقاسات)
  color_id?: string | null;
  color_name?: string | null;
  size_id?: string | null;
  size_name?: string | null;
  // ⚡ حقول أنواع البيع المختلفة
  selling_unit_type?: 'piece' | 'weight' | 'meter' | 'box';
  // البيع بالوزن
  weight_returned?: number;
  weight_unit?: string;
  price_per_weight_unit?: number;
  // البيع بالمتر
  meters_returned?: number;
  price_per_meter?: number;
  // البيع بالعلبة/الصندوق
  boxes_returned?: number;
  units_per_box?: number;
  box_price?: number;
  // ⚡ حقول الجملة
  original_sale_type?: 'retail' | 'wholesale' | 'partial_wholesale';
  original_is_wholesale?: boolean;
  // الأوقات
  created_at: string;
  updated_at?: string;
  // ⚡ أعمدة المزامنة المحلية (موحدة مع SQLite schema)
  synced: number;  // 0 = not synced, 1 = synced
  sync_status?: string;
  pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  local_updated_at?: string;
}

// تعريف واجهة الاشتراك المحلي - محدث للخطط الجديدة (v2)
export interface LocalSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  // ⭐ حقول الخطط الجديدة (v2)
  plan_code?: 'trial' | 'starter_v2' | 'growth_v2' | 'business_v2' | 'enterprise_v2' | 'unlimited_v2';
  plan_name?: string;
  status: 'active' | 'expired' | 'cancelled' | 'trial' | 'pending';
  billing_cycle?: 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  trial_end_date?: string;
  grace_end_date?: string;
  // ⭐ الحدود والصلاحيات (JSON)
  limits?: {
    max_products: number | null;
    max_users: number | null;
    max_pos: number | null;
    max_branches: number | null;
    max_staff: number | null;
    max_customers: number | null;
    max_suppliers: number | null;
  };
  permissions?: {
    all_features: boolean;
    accessPOS: boolean;
    offlineMode: boolean;
    realtimeSync: boolean;
    invoicing: boolean;
    inventory: boolean;
    customers: boolean;
    suppliers: boolean;
    repairs: boolean;
    ecommerce: boolean;
    delivery: boolean;
    staff: boolean;
    reports: boolean;
    analytics: boolean;
    zakat: boolean;
    expenses: boolean;
    debts: boolean;
    callCenter: boolean;
    aiAssistant: boolean;
    courses: boolean;
    support: 'email' | 'priority' | 'premium' | 'dedicated' | 'vip';
  };
  features: string[]; // JSON array of enabled features
  amount_paid?: number;
  currency?: string;
  last_check: string;
  synced: boolean;
  created_at?: string;
  updated_at?: string;
}

// ✅ Alias للتوافق العكسي
export type LocalOrganizationSubscription = LocalSubscription;

// تعريف واجهة إعدادات نقطة البيع المحلية
export interface LocalPOSSettings {
  id?: string;
  organization_id: string;
  store_name?: string | null;
  store_address?: string | null;
  store_phone?: string | null;
  store_email?: string | null;
  store_website?: string | null;
  store_logo_url?: string | null;
  // إعدادات الوصل
  receipt_header_text?: string | null;
  receipt_footer_text?: string | null;
  welcome_message?: string | null;
  show_qr_code?: boolean;
  show_tracking_code?: boolean;
  show_customer_info?: boolean;
  show_store_logo?: boolean;
  show_store_info?: boolean;
  show_date_time?: boolean;
  show_employee_name?: boolean;
  // إعدادات الطباعة الأساسية
  paper_width?: number;
  font_size?: number;
  line_spacing?: number;
  print_density?: 'light' | 'normal' | 'dark';
  auto_cut?: boolean;
  receipt_template?: 'classic' | 'modern' | 'minimal' | 'apple' | 'custom';
  // ⚡ إعدادات الطابعة الحرارية المتقدمة
  printer_name?: string | null;
  printer_type?: 'thermal' | 'normal';
  silent_print?: boolean;
  print_copies?: number;
  print_on_order?: boolean;
  open_cash_drawer?: boolean;
  beep_after_print?: boolean;
  // هوامش الطباعة
  margin_top?: number;
  margin_bottom?: number;
  margin_left?: number;
  margin_right?: number;
  // الألوان
  primary_color?: string;
  secondary_color?: string;
  text_color?: string;
  background_color?: string;
  // تخطيط الوصل
  header_style?: 'centered' | 'left' | 'right';
  footer_style?: 'centered' | 'left' | 'right';
  item_display_style?: 'table' | 'list' | 'compact';
  price_position?: 'right' | 'left';
  custom_css?: string | null;
  // الصلاحيات
  allow_price_edit?: boolean;
  require_manager_approval?: boolean;
  // المعلومات التجارية
  business_license?: string | null;
  tax_number?: string | null;
  activity?: string | null;
  rc?: string | null;
  nif?: string | null;
  nis?: string | null;
  rib?: string | null;
  // إعدادات العملة
  currency_symbol?: string;
  currency_position?: 'before' | 'after';
  tax_label?: string;
  // التواريخ
  created_at?: string;
  updated_at?: string;
  // المزامنة
  synced?: boolean;
  pending_sync?: boolean;
  pendingOperation?: 'create' | 'update' | 'delete';
  [key: string]: any;
}

// تعريف واجهة إعدادات المتجر (المؤسسة) المحلية
export interface LocalOrganizationSettings {
  id?: string;
  organization_id: string;
  // المعلومات الأساسية
  site_name?: string | null;
  default_language?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  display_text_with_logo?: boolean;
  // الألوان والمظهر
  theme_primary_color?: string | null;
  theme_secondary_color?: string | null;
  theme_mode?: 'light' | 'dark' | 'auto' | null;
  custom_css?: string | null;
  // الأكواد المخصصة
  custom_js?: string | null;
  custom_header?: string | null;
  custom_footer?: string | null;
  // إعدادات الوصول
  enable_registration?: boolean;
  enable_public_site?: boolean;
  // SEO
  meta_description?: string | null;
  meta_keywords?: string | null;
  // التواريخ
  created_at?: string;
  updated_at?: string;
  // المزامنة
  synced?: boolean;
  pending_sync?: boolean;
  pendingOperation?: 'create' | 'update' | 'delete';
  [key: string]: any;
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
 * قاعدة البيانات المحلية - النظام الموحد: SQLite فقط
 * 
 * ⚡ النظام الموحد: SQLite + SyncManager فقط
 * - لا يوجد دعم لـ IndexedDB (تم إزالته)
 * - لا يوجد دعم لنظام المزامنة القديم (تم إزالته)
 * - يتطلب Tauri/Electron (SQLite مطلوب)
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
 * ⚡ النظام الموحد: دائماً SQLite
 */
export const getDatabaseType = (): 'sqlite' | 'indexeddb' => {
  // ⚡ النظام الموحد: دائماً SQLite
  return 'sqlite';
};

/**
 * فحص إذا كان SQLite مستخدم
 * ⚡ النظام الموحد: دائماً true
 */
export const isSQLiteDatabase = (): boolean => {
  // ⚡ النظام الموحد: دائماً SQLite
  return true;
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
