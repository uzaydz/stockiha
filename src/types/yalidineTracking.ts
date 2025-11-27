/**
 * ============================================
 * Yalidine Tracking Types & Interfaces
 * ============================================
 * أنواع وواجهات نظام تتبع شحنات ياليدين
 */

import type { Database } from './supabase';

// ============================================
// Database Types
// ============================================

export type YalidineDeliveryHistory = Database['public']['Tables']['yalidine_delivery_history']['Row'];
export type YalidineTrackingCache = Database['public']['Tables']['yalidine_tracking_cache']['Row'];

// ============================================
// API Response Types
// ============================================

/**
 * بيانات حدث تتبع واحد من Yalidine API
 */
export interface YalidineHistoryEvent {
  date_status: string;          // ISO 8601 timestamp
  tracking: string;             // رقم التتبع
  status: string;               // الحالة بالفرنسية (مثل: Livré, En cours...)
  reason?: string | null;       // سبب الفشل/التأجيل
  center_id: number;
  center_name: string;
  wilaya_id: number;
  wilaya_name: string;
  commune_id: number;
  commune_name: string;
}

/**
 * استجابة API الكاملة من Yalidine
 */
export interface YalidineHistoryResponse {
  data?: YalidineHistoryEvent[];
  // في بعض الحالات، البيانات تأتي مباشرة بدون data wrapper
  [key: number]: YalidineHistoryEvent;
}

// ============================================
// Tracking Status Enums
// ============================================

/**
 * الحالات الموحدة للتتبع (Normalized Statuses)
 */
export enum TrackingStatus {
  DELIVERED = 'delivered',                  // ✅ تم التسليم
  OUT_FOR_DELIVERY = 'out_for_delivery',    // 🚚 في طريق التوصيل
  IN_TRANSIT = 'in_transit',                // 📦 في المركز / قيد النقل
  DELIVERY_FAILED = 'delivery_failed',      // ❌ فشل التوصيل
  RETURNED = 'returned',                    // 🔙 تم الإرجاع
  ON_HOLD = 'on_hold',                      // ⏸️ قيد الانتظار
  PENDING = 'pending',                      // ⏳ قيد المعالجة
  RECEIVED = 'received',                    // 📥 تم الاستلام من المرسل
  READY = 'ready',                          // ✓ جاهز للشحن
  PICKED_UP = 'picked_up',                  // 📤 تم التحصيل
  TRANSFERRED = 'transferred',              // 🔄 تم النقل
  CANCELLED = 'cancelled',                  // ❌ ملغي
  UNKNOWN = 'unknown'                       // ❓ غير معروف
}

// ============================================
// Status Mapping - French to Arabic
// ============================================

/**
 * خريطة ترجمة الحالات من الفرنسية إلى العربية
 */
export const YALIDINE_STATUS_AR_MAP: Record<string, string> = {
  // حالات التسليم
  'Livré': 'تم التسليم',
  'En cours de livraison': 'في طريق التوصيل',
  'Livraison en cours': 'جاري التوصيل',

  // حالات المركز والنقل
  'Centre': 'في المركز',
  'En transit': 'قيد النقل',
  'Transféré': 'تم النقل',
  'Transfert': 'نقل',

  // حالات الفشل
  'Échec': 'فشل',
  'Échec de livraison': 'فشل التوصيل',
  'Tentative échouée': 'محاولة فاشلة',

  // حالات الإرجاع
  'Retour': 'إرجاع',
  'En retour': 'قيد الإرجاع',
  'Retourné': 'تم الإرجاع',

  // حالات الانتظار
  'En attente': 'قيد الانتظار',
  'Attente': 'انتظار',

  // حالات الاستلام
  'Reçu': 'تم الاستلام',
  'Récupéré': 'تم التحصيل',
  'Ramassé': 'تم التحصيل',

  // حالات التحضير
  'Prêt': 'جاهز',
  'Préparé': 'تم التحضير',
  'En préparation': 'قيد التحضير',

  // حالات أخرى
  'Annulé': 'ملغي',
  'En cours': 'قيد المعالجة',
  'Nouveau': 'جديد',
};

// ============================================
// Status Normalization Map
// ============================================

/**
 * خريطة تحويل الحالات الفرنسية إلى الحالات الموحدة
 */
export const YALIDINE_STATUS_NORMALIZED_MAP: Record<string, TrackingStatus> = {
  // Delivered states
  'Livré': TrackingStatus.DELIVERED,

  // Out for delivery
  'En cours de livraison': TrackingStatus.OUT_FOR_DELIVERY,
  'Livraison en cours': TrackingStatus.OUT_FOR_DELIVERY,

  // In transit / Center
  'Centre': TrackingStatus.IN_TRANSIT,
  'En transit': TrackingStatus.IN_TRANSIT,
  'Transféré': TrackingStatus.IN_TRANSIT,
  'Transfert': TrackingStatus.IN_TRANSIT,

  // Delivery failed
  'Échec': TrackingStatus.DELIVERY_FAILED,
  'Échec de livraison': TrackingStatus.DELIVERY_FAILED,
  'Tentative échouée': TrackingStatus.DELIVERY_FAILED,

  // Returned
  'Retour': TrackingStatus.RETURNED,
  'En retour': TrackingStatus.RETURNED,
  'Retourné': TrackingStatus.RETURNED,

  // On hold
  'En attente': TrackingStatus.ON_HOLD,
  'Attente': TrackingStatus.ON_HOLD,

  // Received from sender
  'Reçu': TrackingStatus.RECEIVED,
  'Récupéré': TrackingStatus.PICKED_UP,
  'Ramassé': TrackingStatus.PICKED_UP,

  // Ready
  'Prêt': TrackingStatus.READY,
  'Préparé': TrackingStatus.READY,
  'En préparation': TrackingStatus.PENDING,

  // Cancelled
  'Annulé': TrackingStatus.CANCELLED,

  // Pending
  'En cours': TrackingStatus.PENDING,
  'Nouveau': TrackingStatus.PENDING,
};

// ============================================
// Status UI Configuration
// ============================================

/**
 * ألوان Badge لكل حالة
 */
export const TRACKING_STATUS_COLORS: Record<TrackingStatus, string> = {
  [TrackingStatus.DELIVERED]: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  [TrackingStatus.OUT_FOR_DELIVERY]: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  [TrackingStatus.IN_TRANSIT]: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  [TrackingStatus.DELIVERY_FAILED]: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  [TrackingStatus.RETURNED]: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
  [TrackingStatus.ON_HOLD]: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  [TrackingStatus.PENDING]: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
  [TrackingStatus.RECEIVED]: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800',
  [TrackingStatus.READY]: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800',
  [TrackingStatus.PICKED_UP]: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800',
  [TrackingStatus.TRANSFERRED]: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  [TrackingStatus.CANCELLED]: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800',
  [TrackingStatus.UNKNOWN]: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
};

/**
 * أيقونات لكل حالة
 */
export const TRACKING_STATUS_ICONS: Record<TrackingStatus, string> = {
  [TrackingStatus.DELIVERED]: 'CheckCircle2',
  [TrackingStatus.OUT_FOR_DELIVERY]: 'Truck',
  [TrackingStatus.IN_TRANSIT]: 'Package',
  [TrackingStatus.DELIVERY_FAILED]: 'AlertCircle',
  [TrackingStatus.RETURNED]: 'Undo2',
  [TrackingStatus.ON_HOLD]: 'Clock',
  [TrackingStatus.PENDING]: 'Clock',
  [TrackingStatus.RECEIVED]: 'PackageCheck',
  [TrackingStatus.READY]: 'PackagePlus',
  [TrackingStatus.PICKED_UP]: 'PackageSearch',
  [TrackingStatus.TRANSFERRED]: 'ArrowRightLeft',
  [TrackingStatus.CANCELLED]: 'XCircle',
  [TrackingStatus.UNKNOWN]: 'HelpCircle',
};

// ============================================
// Utility Functions
// ============================================

/**
 * تحويل الحالة الفرنسية إلى حالة موحدة
 */
export function normalizeYalidineStatus(status: string): TrackingStatus {
  return YALIDINE_STATUS_NORMALIZED_MAP[status] || TrackingStatus.UNKNOWN;
}

/**
 * ترجمة الحالة من الفرنسية إلى العربية
 */
export function translateYalidineStatus(status: string): string {
  return YALIDINE_STATUS_AR_MAP[status] || status;
}

/**
 * الحصول على لون Badge للحالة
 */
export function getStatusColor(status: string | TrackingStatus): string {
  if (typeof status === 'string') {
    const normalized = normalizeYalidineStatus(status);
    return TRACKING_STATUS_COLORS[normalized] || TRACKING_STATUS_COLORS[TrackingStatus.UNKNOWN];
  }
  return TRACKING_STATUS_COLORS[status] || TRACKING_STATUS_COLORS[TrackingStatus.UNKNOWN];
}

/**
 * التحقق من كون الحالة نهائية (لا تحتاج تحديث)
 */
export function isFinalStatus(status: string | TrackingStatus): boolean {
  const normalized = typeof status === 'string' ? normalizeYalidineStatus(status) : status;
  return [
    TrackingStatus.DELIVERED,
    TrackingStatus.RETURNED,
    TrackingStatus.CANCELLED
  ].includes(normalized);
}

/**
 * التحقق من حاجة الحالة للانتباه (فشل أو مشكلة)
 */
export function needsAttention(status: string | TrackingStatus): boolean {
  const normalized = typeof status === 'string' ? normalizeYalidineStatus(status) : status;
  return [
    TrackingStatus.DELIVERY_FAILED,
    TrackingStatus.ON_HOLD
  ].includes(normalized);
}

// ============================================
// Cache Configuration
// ============================================

/**
 * إعدادات TTL للكاش حسب الحالة
 */
export const TRACKING_CACHE_TTL: Record<TrackingStatus, number> = {
  [TrackingStatus.DELIVERED]: 24 * 60,          // 24 ساعة (حالة نهائية)
  [TrackingStatus.RETURNED]: 24 * 60,           // 24 ساعة (حالة نهائية)
  [TrackingStatus.CANCELLED]: 24 * 60,          // 24 ساعة (حالة نهائية)
  [TrackingStatus.OUT_FOR_DELIVERY]: 15,        // 15 دقيقة (حالة نشطة)
  [TrackingStatus.DELIVERY_FAILED]: 30,         // 30 دقيقة (تحتاج متابعة)
  [TrackingStatus.ON_HOLD]: 60,                 // ساعة واحدة
  [TrackingStatus.IN_TRANSIT]: 30,              // 30 دقيقة
  [TrackingStatus.PENDING]: 60,                 // ساعة واحدة
  [TrackingStatus.RECEIVED]: 30,                // 30 دقيقة
  [TrackingStatus.READY]: 30,                   // 30 دقيقة
  [TrackingStatus.PICKED_UP]: 30,               // 30 دقيقة
  [TrackingStatus.TRANSFERRED]: 30,             // 30 دقيقة
  [TrackingStatus.UNKNOWN]: 30,                 // 30 دقيقة
};

/**
 * الحصول على TTL مناسب للحالة
 */
export function getCacheTTL(status: string | TrackingStatus): number {
  const normalized = typeof status === 'string' ? normalizeYalidineStatus(status) : status;
  return TRACKING_CACHE_TTL[normalized] || 30; // افتراضي: 30 دقيقة
}

// ============================================
// Type Guards
// ============================================

/**
 * التحقق من كون البيانات حدث تتبع صحيح
 */
export function isYalidineHistoryEvent(data: any): data is YalidineHistoryEvent {
  return (
    data &&
    typeof data === 'object' &&
    'date_status' in data &&
    'tracking' in data &&
    'status' in data
  );
}

/**
 * التحقق من كون البيانات مصفوفة أحداث تتبع
 */
export function isYalidineHistoryArray(data: any): data is YalidineHistoryEvent[] {
  return Array.isArray(data) && data.every(isYalidineHistoryEvent);
}
