/**
 * 🏠 Local Services - الخدمات المحلية (Offline-First)
 * ============================================================
 * تجميع جميع الخدمات التي تعمل محلياً بدون إنترنت
 *
 * الميزات:
 * - جميع الخدمات تعمل 100% offline
 * - تستخدم PowerSync/SQLite للتخزين
 * - تُزامن تلقائياً عند عودة الاتصال
 *
 * @version 1.0.0
 * @date 2025-12-12
 */

// =====================================================
// الخدمات الرئيسية
// =====================================================

// خدمة الدفعات المحلية
export {
  LocalBatchService,
  useLocalBatchService,
  type LocalBatch,
  type BatchConsumptionInput,
  type BatchMovement,
  type ConsumeResult
} from './LocalBatchService';

// خدمة الأرقام التسلسلية المحلية
export {
  LocalSerialService,
  useLocalSerialService,
  type LocalSerial,
  type LocalSerialStatus,
  type ReserveSerialInput,
  type SellSerialInput,
  type SerialConflict
} from './LocalSerialService';

// =====================================================
// أدوات مساعدة
// =====================================================

// أدوات الضمان
export {
  getWarrantyMonths,
  hasWarranty,
  getWarrantyType,
  calculateWarrantyEndDate,
  getWarrantyInfo,
  isWarrantyValid,
  getWarrantyDaysRemaining,
  formatWarrantyDisplay,
  formatWarrantyStatus,
  type WarrantyInfo,
  type ProductWithWarranty
} from './warrantyUtils';

// =====================================================
// Constants
// =====================================================

/**
 * مدة حجز الرقم التسلسلي الافتراضية (بالدقائق)
 */
export const DEFAULT_SERIAL_RESERVATION_MINUTES = 30;

/**
 * عدد الأيام لتنبيه انتهاء الصلاحية
 */
export const DEFAULT_EXPIRY_ALERT_DAYS = 30;

/**
 * أنواع وحدات البيع المدعومة
 */
export const SELLING_UNIT_TYPES = ['piece', 'weight', 'meter', 'box'] as const;
export type SellingUnitType = typeof SELLING_UNIT_TYPES[number];

/**
 * حالات الأرقام التسلسلية
 */
export const SERIAL_STATUSES = [
  'available',
  'reserved',
  'sold',
  'returned',
  'defective',
  'warranty_claimed'
] as const;

/**
 * أسباب حركة المخزون
 */
export const MOVEMENT_SOURCES = [
  'sale',
  'return',
  'loss',
  'adjustment',
  'transfer'
] as const;
export type MovementSource = typeof MOVEMENT_SOURCES[number];

// =====================================================
// Utility Functions
// =====================================================

/**
 * توليد معرف جهاز فريد
 */
export function getOrCreateDeviceId(): string {
  const stored = localStorage.getItem('device_id');
  if (stored) return stored;

  const newId = `device_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`.slice(0, 20);
  localStorage.setItem('device_id', newId);
  return newId;
}

/**
 * التحقق من حالة الاتصال
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * مراقب حالة الاتصال
 */
export function onConnectionChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
