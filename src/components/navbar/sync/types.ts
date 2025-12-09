/**
 * ⚡ أنواع مؤشر المزامنة المحسّن
 * @version 2.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 أنواع حالة المزامنة
// ═══════════════════════════════════════════════════════════════════════════════

export type SyncConnectionStatus = 
  | 'connected'       // متصل ومتزامن
  | 'connecting'      // جارٍ الاتصال
  | 'disconnected'    // غير متصل
  | 'syncing'         // جارٍ المزامنة
  | 'error'           // خطأ
  | 'offline';        // غير متصل بالإنترنت

export interface PowerSyncStatus {
  connected: boolean;
  connecting: boolean;
  hasSynced: boolean;
  lastSyncedAt: Date | null;
  downloadProgress: number | null;
  uploadProgress: number | null;
  error: string | null;
  syncRulesDeployed?: boolean;
  syncRulesError?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 إحصائيات الجداول
// ═══════════════════════════════════════════════════════════════════════════════

export interface TableStats {
  name: string;
  nameAr: string;
  icon: string;
  local: number;      // عدد السجلات المحلية
  pending: number;    // عدد العمليات المعلقة
  synced: boolean;    // هل الجدول متزامن؟
}

/**
 * ✅ محدث ليتطابق مع PowerSyncSchema.ts - 30 جدول
 */
export interface SyncSnapshot {
  // ═══ المنتجات (7 جداول) ═══
  products: TableStats;
  productCategories: TableStats;
  productSubcategories: TableStats;
  productColors: TableStats;
  productSizes: TableStats;
  productImages: TableStats;
  productWholesaleTiers: TableStats;

  // ═══ المخزون (2 جداول) ═══
  inventoryBatches: TableStats;
  productSerialNumbers: TableStats;

  // ═══ الطلبات (2 جداول) ═══
  orders: TableStats;
  orderItems: TableStats;

  // ═══ العملاء والموردين (2 جداول) ═══
  customers: TableStats;
  suppliers: TableStats;

  // ═══ الفواتير (2 جداول) ═══
  invoices: TableStats;
  invoiceItems: TableStats;

  // ═══ الخسائر (2 جداول) ═══
  losses: TableStats;
  lossItems: TableStats;

  // ═══ المرتجعات (2 جداول) ═══
  returns: TableStats;
  returnItems: TableStats;

  // ═══ الإصلاحات (2 جداول) ═══
  repairOrders: TableStats;
  repairLocations: TableStats;

  // ═══ الموظفين وجلسات العمل (2 جداول) ═══
  posStaffSessions: TableStats;
  staffWorkSessions: TableStats;

  // ═══ المصروفات (2 جداول) ═══
  expenses: TableStats;
  expenseCategories: TableStats;

  // ═══ الاشتراكات (2 جداول) ═══
  subscriptionTransactions: TableStats;
  subscriptions: TableStats;

  // ═══ النظام (4 جداول) ═══
  users: TableStats;
  organizations: TableStats;
  posSettings: TableStats;
  subscriptionPlans: TableStats;

  // إحصائيات عامة
  totalLocal: number;
  totalPending: number;
  totalTables: number;
  syncedTables: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 تفاصيل Outbox
// ═══════════════════════════════════════════════════════════════════════════════

export interface OutboxEntry {
  id: number;
  table: string;
  operation: 'PUT' | 'PATCH' | 'DELETE';
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface OutboxDetails {
  entries: OutboxEntry[];
  byTable: Record<string, number>;
  byOperation: Record<string, number>;
  total: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 أخطاء المزامنة
// ═══════════════════════════════════════════════════════════════════════════════

export interface SyncError {
  code: string;
  message: string;
  messageAr: string;
  timestamp: Date;
  recoverable: boolean;
  details?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 معلومات التشخيص
// ═══════════════════════════════════════════════════════════════════════════════

export interface DiagnosticsInfo {
  // معلومات PowerSync
  powersync: {
    version: string;
    instanceId: string;
    databaseName: string;
    isInitialized: boolean;
    schemaVersion: string | null;
  };
  
  // معلومات الاتصال
  connection: {
    endpoint: string;
    isOnline: boolean;
    lastConnectedAt: Date | null;
    reconnectAttempts: number;
    syncRulesDeployed?: boolean;
    syncRulesError?: string;
  };
  
  // معلومات قاعدة البيانات
  database: {
    totalTables: number;
    totalRecords: number;
    sizeEstimate: string;
    lastModified: Date | null;
  };
  
  // معلومات المصادقة
  auth: {
    userId: string | null;
    organizationId: string | null;
    tokenExpiry: Date | null;
    isAuthenticated: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 القيم الافتراضية
// ═══════════════════════════════════════════════════════════════════════════════

export const createEmptyTableStats = (name: string, nameAr: string, icon: string): TableStats => ({
  name,
  nameAr,
  icon,
  local: 0,
  pending: 0,
  synced: true
});

/**
 * ✅ محدث ليتطابق مع PowerSyncSchema.ts (30 جدول مزامن)
 */
export const EMPTY_SNAPSHOT: SyncSnapshot = {
  // ═══ المنتجات (7) ═══
  products: createEmptyTableStats('products', 'المنتجات', '📦'),
  productCategories: createEmptyTableStats('product_categories', 'التصنيفات', '📁'),
  productSubcategories: createEmptyTableStats('product_subcategories', 'التصنيفات الفرعية', '📂'),
  productColors: createEmptyTableStats('product_colors', 'ألوان المنتجات', '🎨'),
  productSizes: createEmptyTableStats('product_sizes', 'مقاسات المنتجات', '📏'),
  productImages: createEmptyTableStats('product_images', 'صور المنتجات', '🖼️'),
  productWholesaleTiers: createEmptyTableStats('product_wholesale_tiers', 'مستويات الجملة', '📊'),

  // ═══ المخزون (2) ═══
  inventoryBatches: createEmptyTableStats('inventory_batches', 'دفعات المخزون', '📋'),
  productSerialNumbers: createEmptyTableStats('product_serial_numbers', 'الأرقام التسلسلية', '🔢'),

  // ═══ الطلبات (2) ═══
  orders: createEmptyTableStats('orders', 'الطلبات', '🛒'),
  orderItems: createEmptyTableStats('order_items', 'عناصر الطلبات', '📝'),

  // ═══ العملاء والموردين (2) ═══
  customers: createEmptyTableStats('customers', 'العملاء', '👤'),
  suppliers: createEmptyTableStats('suppliers', 'الموردين', '🏭'),

  // ═══ الفواتير (2) ═══
  invoices: createEmptyTableStats('invoices', 'الفواتير', '🧾'),
  invoiceItems: createEmptyTableStats('invoice_items', 'عناصر الفواتير', '📄'),

  // ═══ الخسائر (2) ═══
  losses: createEmptyTableStats('losses', 'الخسائر', '📉'),
  lossItems: createEmptyTableStats('loss_items', 'عناصر الخسائر', '❌'),

  // ═══ المرتجعات (2) ═══
  returns: createEmptyTableStats('returns', 'المرتجعات', '↩️'),
  returnItems: createEmptyTableStats('return_items', 'عناصر المرتجعات', '📦'),

  // ═══ الإصلاحات (2) ═══
  repairOrders: createEmptyTableStats('repair_orders', 'طلبات الإصلاح', '🔧'),
  repairLocations: createEmptyTableStats('repair_locations', 'مواقع الإصلاح', '📍'),

  // ═══ الموظفين وجلسات العمل (2) ═══
  posStaffSessions: createEmptyTableStats('pos_staff_sessions', 'الموظفين', '👷'),
  staffWorkSessions: createEmptyTableStats('staff_work_sessions', 'جلسات العمل', '⏱️'),

  // ═══ المصروفات (2) ═══
  expenses: createEmptyTableStats('expenses', 'المصروفات', '💸'),
  expenseCategories: createEmptyTableStats('expense_categories', 'تصنيفات المصروفات', '📋'),

  // ═══ الاشتراكات (2) ═══
  subscriptionTransactions: createEmptyTableStats('subscription_transactions', 'معاملات الاشتراكات', '💰'),
  subscriptions: createEmptyTableStats('organization_subscriptions', 'الاشتراكات', '💳'),

  // ═══ النظام (4) ═══
  users: createEmptyTableStats('users', 'المستخدمين', '👥'),
  organizations: createEmptyTableStats('organizations', 'المنظمة', '🏢'),
  posSettings: createEmptyTableStats('pos_settings', 'إعدادات POS', '⚙️'),
  subscriptionPlans: createEmptyTableStats('subscription_plans', 'خطط الاشتراك', '📋'),

  // Totals
  totalLocal: 0,
  totalPending: 0,
  totalTables: 30,
  syncedTables: 0
};

export const EMPTY_POWERSYNC_STATUS: PowerSyncStatus = {
  connected: false,
  connecting: false,
  hasSynced: false,
  lastSyncedAt: null,
  downloadProgress: null,
  uploadProgress: null,
  error: null
};

export const EMPTY_OUTBOX: OutboxDetails = {
  entries: [],
  byTable: {},
  byOperation: {},
  total: 0
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 رسائل الأخطاء بالعربية
// ═══════════════════════════════════════════════════════════════════════════════

export const ERROR_MESSAGES: Record<string, string> = {
  'PSYNC_S2002': 'Sync Rules غير منشورة - يرجى نشرها من PowerSync Dashboard',
  'NETWORK_ERROR': 'خطأ في الشبكة - تحقق من اتصالك بالإنترنت',
  'AUTH_ERROR': 'خطأ في المصادقة - يرجى تسجيل الدخول مرة أخرى',
  'TIMEOUT': 'انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى',
  'SCHEMA_MISMATCH': 'عدم تطابق المخطط - يرجى تحديث التطبيق',
  'DATABASE_ERROR': 'خطأ في قاعدة البيانات المحلية',
  'UNKNOWN': 'خطأ غير معروف'
};
