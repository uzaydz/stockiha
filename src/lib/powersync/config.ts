/**
 * PowerSync Configuration v2.0
 * =============================
 * ملف تكوين مركزي لجميع إعدادات PowerSync
 * يسهل الصيانة وتعديل الإعدادات في مكان واحد
 *
 * v2.0 التحسينات:
 * - تحكم أدق في مستويات السجلات
 * - تقليل السجلات الزائدة في وضع التطوير
 */

// التحقق من وضع التطوير
const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;

// التحقق من وجود flag للتصحيح المفصل في localStorage
const isVerboseDebug = typeof window !== 'undefined' &&
  window.localStorage?.getItem('POWERSYNC_VERBOSE_DEBUG') === 'true';

/**
 * ⚡ كشف بيئة التشغيل
 * الويب = أونلاين فقط (بدون PowerSync)
 * Electron = أونلاين + أوفلاين (مع PowerSync)
 *
 * ملاحظة: بعض إضافات المتصفح تضيف window.electronAPI
 * لذلك نتحقق من userAgent أولاً (الأكثر موثوقية)
 */
export function isElectronEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || '';

  // ✅ الطريقة الأكثر موثوقية: التحقق من userAgent
  // Electron يضيف "Electron/X.X.X" إلى userAgent دائماً
  if (userAgent.includes('Electron')) {
    return true;
  }

  // ✅ التحقق من وجود process.versions.electron (خاص بـ Electron فقط)
  if (typeof process !== 'undefined' && (process as any).versions?.electron) {
    return true;
  }

  // ✅ التحقق من window.electron.isElectron (يجب أن يكون true صريحاً)
  if ((window as any).electron?.isElectron === true) {
    return true;
  }

  // ⚠️ window.electronAPI و window.__ELECTRON__ قد تُضاف بواسطة إضافات المتصفح
  // لذلك لا نعتمد عليها وحدها - يجب أن يكون userAgent يحتوي على 'Electron'

  return false;
}

/**
 * ⚡ هل نحتاج PowerSync؟
 * - Electron: نعم (للعمل أوفلاين مع better-sqlite3)
 * - الويب: نعم (للعمل أوفلاين مع wa-sqlite WASM)
 */
export function needsPowerSync(): boolean {
  // PowerSync مفعّل في كل البيئات - الويب يستخدم WASM
  return true;
}

/**
 * إعدادات PowerSync الرئيسية
 */
export const POWERSYNC_CONFIG = {
  // ======================================
  // إعدادات التصحيح والسجلات
  // ======================================

  /** تفعيل وضع التصحيح الأساسي - يعرض سجلات التهيئة والاتصال فقط */
  DEBUG_MODE: false, // معطل افتراضياً - فعّل يدوياً عند الحاجة

  /** تفعيل وضع التصحيح المفصل - يعرض كل السجلات */
  DEBUG_VERBOSE: isVerboseDebug,

  /** تفعيل سجلات المزامنة المفصلة */
  DEBUG_SYNC: false,

  /** تفعيل سجلات الاستعلامات (كثيرة جداً - فعّل فقط عند التصحيح) */
  DEBUG_QUERIES: false,

  /** تفعيل سجلات معالجة الدفعات */
  DEBUG_BATCHING: false,

  /** تفعيل سجلات الاتصال (Connector) */
  DEBUG_CONNECTOR: false,

  // ======================================
  // إعدادات الـ Cache
  // ======================================

  /** مدة صلاحية cache عدد التغييرات المعلقة (بالميلي ثانية) */
  PENDING_CACHE_TTL: 5000, // 5 ثوانٍ (زيادة من 2 ثوانٍ)

  /** مدة صلاحية cache بيانات الاعتماد (بالميلي ثانية) */
  CREDENTIALS_CACHE_TTL: 5 * 60 * 1000, // 5 دقائق

  /** مدة صلاحية cache organization_id (بالميلي ثانية) */
  ORG_ID_CACHE_TTL: 10 * 60 * 1000, // 10 دقائق

  // ======================================
  // إعدادات المزامنة
  // ======================================

  /** الحد الأقصى لعدد السجلات في كل دفعة */
  MAX_BATCH_SIZE: 50,

  /** الحد الأقصى لعدد محاولات إعادة المزامنة */
  MAX_RETRY_ATTEMPTS: 3,

  /** التأخيرات بين محاولات إعادة الاتصال (بالميلي ثانية) */
  RECONNECT_DELAYS: [2000, 4000, 8000, 16000, 30000],

  /** الحد الأقصى لمحاولات إعادة الاتصال */
  MAX_RECONNECT_ATTEMPTS: 5,

  /** تأخير تسجيل الانقطاع (للتجاهل التذبذب السريع) */
  DISCONNECT_LOG_DELAY: 2000, // 2 ثانية

  /** الحد الأدنى بين تسجيلات تغيير الحالة */
  STATUS_CHANGE_LOG_INTERVAL: 30000, // 30 ثانية

  /** الحد الأدنى بين فحوصات التصحيح */
  DEBUG_CHECK_INTERVAL: 60000, // 60 ثانية

  // ======================================
  // إعدادات التهيئة
  // ======================================

  /** الحد الأقصى لمحاولات التهيئة */
  MAX_INIT_ATTEMPTS: 3,

  /** مهلة انتظار جاهزية قاعدة البيانات (بالميلي ثانية) */
  DB_READY_TIMEOUT: 30000, // 30 ثانية

  /** مهلة الاتصال (بالميلي ثانية) */
  CONNECTION_TIMEOUT: 15000, // 15 ثانية

  /** مهلة انتظار المزامنة الأولى (بالميلي ثانية) */
  FIRST_SYNC_TIMEOUT: 10000, // 10 ثوانٍ

  // ======================================
  // إعدادات فحص الاتصال
  // ======================================

  /** فاصل فحص صحة الاتصال (بالميلي ثانية) */
  HEALTH_CHECK_INTERVAL: 30000, // 30 ثانية

  /** مهلة فحص صحة الاتصال (بالميلي ثانية) */
  HEALTH_CHECK_TIMEOUT: 5000, // 5 ثوانٍ

  /** تأخير debounce للتذبذب في حالة الاتصال */
  OFFLINE_DEBOUNCE_DELAY: 500, // 500 ميلي ثانية

  // ======================================
  // إعدادات قاعدة البيانات
  // ======================================

  /** اسم ملف قاعدة البيانات لـ Electron */
  DB_FILENAME_ELECTRON: 'stockiha_powersync_electron.db',

  /** اسم ملف قاعدة البيانات لـ Safari/WebKit */
  DB_FILENAME_WEBKIT: 'stockiha_powersync_webkit.db',

  /** اسم ملف قاعدة البيانات للويب */
  DB_FILENAME_WEB: 'stockiha_powersync_v4.db',

  // ======================================
  // إعدادات PRAGMA لـ SQLite
  // ======================================

  /** حجم الـ cache (بالكيلوبايت، سالب = كيلوبايت) */
  PRAGMA_CACHE_SIZE: -32000, // 32MB

  /** حجم memory-mapped I/O (بالبايت) */
  PRAGMA_MMAP_SIZE: 268435456, // 256MB

  /** حجم الصفحة (بالبايت) */
  PRAGMA_PAGE_SIZE: 4096, // 4KB

  // ======================================
  // إعدادات رفع الصور
  // ======================================

  /** الحد الأقصى لحجم الصورة Base64 (بالبايت) */
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB

  /** bucket الصور في Supabase Storage */
  STORAGE_BUCKET: 'product-images',
} as const;

/**
 * مفاتيح التخزين المحلي
 */
export const STORAGE_KEYS = {
  /** مفتاح organization_id الرئيسي */
  ORG_ID: 'bazaar_organization_id',

  /** مفتاح organization_id البديل */
  ORG_ID_ALT: 'currentOrganizationId',

  /** مفتاح بيانات المستخدم */
  USER_DATA: 'bazaar_user_data',

  /** مفتاح جلسة المصادقة */
  AUTH_SESSION: 'supabase.auth.token',
} as const;

/**
 * مفاتيح الـ Global لحماية Hot Reload
 */
export const GLOBAL_KEYS = {
  /** مفتاح PowerSync Service في window */
  POWERSYNC_SERVICE: '__POWERSYNC_SERVICE_V4__',

  /** مفتاح Supabase Connector في window */
  SUPABASE_CONNECTOR: '__SUPABASE_CONNECTOR_INSTANCE__',
} as const;

/**
 * الجداول التابعة (يجب مزامنتها بعد الجداول الأساسية)
 * بسبب Foreign Key constraints
 */
export const DEPENDENT_TABLES = [
  'order_items',
  'product_colors',
  'product_sizes',
  'loss_items',
  'return_items',
  'invoice_items',
  'repair_images',
  'repair_status_history',
  // Stocktake depends on sessions/products
  'stocktake_items',
  'stocktake_adjustments',
  'stocktake_events',
  'employee_shift_assignments',
  'employee_attendance',
  'leave_requests',
  'payroll_records',
  'loan_payments',
  'performance_reviews',
  'goal_updates',
] as const;

/**
 * الجداول التي لا تحتوي على updated_at
 */
export const TABLES_WITHOUT_UPDATED_AT = [
  'order_items',
  'pos_order_items',
  // stocktake_events only has created_at
  'stocktake_events',
] as const;

/**
 * دالة مساعدة للتحقق من وضع التصحيح
 */
export function isDebugMode(): boolean {
  return POWERSYNC_CONFIG.DEBUG_MODE || POWERSYNC_CONFIG.DEBUG_VERBOSE;
}

/**
 * دالة مساعدة لتسجيل السجلات بشروط
 * تدعم مستويات مختلفة من التصحيح
 */
export function debugLog(scope: string, message: string, extra?: any): void {
  // تحقق من نوع السجل والإعداد المناسب
  const isQueryLog = scope === 'query' || scope === 'queryOne';
  const isConnectorLog = scope === 'Connector';
  const isSyncLog = scope === 'sync';
  const isInitLog = scope === 'init';

  // سجلات الاستعلامات - تحتاج DEBUG_QUERIES أو DEBUG_VERBOSE
  if (isQueryLog && !POWERSYNC_CONFIG.DEBUG_QUERIES && !POWERSYNC_CONFIG.DEBUG_VERBOSE) {
    return;
  }

  // سجلات الاتصال - تحتاج DEBUG_CONNECTOR أو DEBUG_VERBOSE
  if (isConnectorLog && !POWERSYNC_CONFIG.DEBUG_CONNECTOR && !POWERSYNC_CONFIG.DEBUG_VERBOSE) {
    return;
  }

  // سجلات المزامنة - تحتاج DEBUG_SYNC أو DEBUG_VERBOSE
  if (isSyncLog && !POWERSYNC_CONFIG.DEBUG_SYNC && !POWERSYNC_CONFIG.DEBUG_VERBOSE) {
    return;
  }

  // سجلات التهيئة - تحتاج DEBUG_MODE أو DEBUG_VERBOSE
  if (isInitLog && !POWERSYNC_CONFIG.DEBUG_MODE && !POWERSYNC_CONFIG.DEBUG_VERBOSE) {
    return;
  }

  // للسجلات الأخرى، تحقق من DEBUG_MODE أو DEBUG_VERBOSE
  if (!isQueryLog && !isConnectorLog && !isSyncLog && !isInitLog) {
    if (!POWERSYNC_CONFIG.DEBUG_MODE && !POWERSYNC_CONFIG.DEBUG_VERBOSE) {
      return;
    }
  }

  if (extra !== undefined) {
    console.log(`[PowerSync:${scope}] ${message}`, extra);
  } else {
    console.log(`[PowerSync:${scope}] ${message}`);
  }
}

/**
 * دالة مساعدة لتسجيل أخطاء المزامنة
 */
export function syncErrorLog(scope: string, message: string, error?: any): void {
  // الأخطاء تُسجَّل دائماً بغض النظر عن DEBUG_MODE
  console.error(`[PowerSync:${scope}] ${message}`, error || '');
}

/**
 * دالة مساعدة لتسجيل تحذيرات المزامنة
 */
export function syncWarnLog(scope: string, message: string, extra?: any): void {
  // التحذيرات تُسجَّل دائماً بغض النظر عن DEBUG_MODE
  if (extra !== undefined) {
    console.warn(`[PowerSync:${scope}] ${message}`, extra);
  } else {
    console.warn(`[PowerSync:${scope}] ${message}`);
  }
}

/**
 * تفعيل وضع التصحيح المفصل (للاستخدام في console المتصفح)
 * localStorage.setItem('POWERSYNC_VERBOSE_DEBUG', 'true')
 * ثم أعد تحميل الصفحة
 */
export function enableVerboseDebug(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('POWERSYNC_VERBOSE_DEBUG', 'true');
    console.log('✅ Verbose debug enabled. Reload the page to apply.');
  }
}

/**
 * تعطيل وضع التصحيح المفصل
 */
export function disableVerboseDebug(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('POWERSYNC_VERBOSE_DEBUG');
    console.log('✅ Verbose debug disabled. Reload the page to apply.');
  }
}

export default POWERSYNC_CONFIG;
