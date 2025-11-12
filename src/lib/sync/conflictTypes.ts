/**
 * أنواع البيانات لنظام Conflict Resolution
 */

/**
 * أنواع الكيانات القابلة للمزامنة
 */
export type EntityType = 'product' | 'customer' | 'invoice' | 'order' | 'address';

/**
 * استراتيجيات حل التضاربات
 */
export type ResolutionStrategy =
  | 'server_wins'   // السيرفر يفوز
  | 'client_wins'   // الكلاينت يفوز
  | 'merge'         // دمج ذكي
  | 'manual';       // حل يدوي من المستخدم

/**
 * قرار حل التضارب (للواجهة القديمة)
 */
export type ConflictDecision = 'local' | 'remote' | 'merge';

/**
 * كيان أساسي بحقول مشتركة
 */
export interface BaseEntity {
  id: string;
  updated_at?: string;
  created_at?: string;
  organization_id?: string;
}

/**
 * نتيجة كشف التضارب
 */
export interface ConflictDetectionResult {
  hasConflict: boolean;
  fields: string[];           // الحقول المختلفة
  severity: number;           // 0-100
  localTimestamp: string;
  serverTimestamp: string;
  timeDifference: number;     // بالمللي ثانية
}

/**
 * إعدادات كشف التضارب
 */
export interface DetectionConfig {
  // الحقول الحرجة التي تحتاج فحص دقيق
  criticalFields?: string[];

  // هل نتجاهل فروق timestamps الصغيرة؟
  timestampThreshold?: number;  // بالمللي ثانية (افتراضي: 5000)

  // هل نتجاهل null vs undefined؟
  ignoreNullUndefined?: boolean;

  // استراتيجية افتراضية
  defaultStrategy?: ResolutionStrategy;

  // حقول يتم تجاهلها في المقارنة
  ignoreFields?: string[];
}

/**
 * سياق حل التضارب
 */
export interface ResolutionContext {
  userId: string;
  organizationId: string;
  entityType: EntityType;
  entityId: string;

  // معلومات إضافية
  source?: string;           // 'sync', 'manual_edit', 'import', etc.
  userAgent?: string;        // browser/app info
}

/**
 * نتيجة حل التضارب
 */
export interface ResolvedEntity<T = any> {
  resolved: boolean;          // هل تم الحل؟
  data: T;                    // البيانات المحلولة
  strategy: ResolutionStrategy;
  requiresManualResolution: boolean;
  notes?: string;
}

/**
 * سجل تضارب
 */
export interface ConflictLogEntry {
  id: string;
  entityType: EntityType;
  entityId: string;

  // النسخ المتضاربة
  localVersion: any;
  serverVersion: any;

  // تفاصيل التضارب
  conflictFields: string[];
  severity: number;           // 0-100

  // الحل
  resolution: ResolutionStrategy;
  resolvedVersion: any;
  resolvedBy?: string;        // user ID للحل اليدوي

  // Timestamps
  detectedAt: string;
  resolvedAt: string;
  userId: string;
  organizationId: string;

  localTimestamp: string;
  serverTimestamp: string;

  // ملاحظات
  notes?: string;
}

/**
 * إحصائيات التضاربات
 */
export interface ConflictStatistics {
  summary: {
    total: number;
    avgSeverity: number;
    affectedEntities: number;
  };
  byEntityAndResolution: Array<{
    entityType: string;
    resolution: string;
    count: number;
    avgSeverity: number;
    maxSeverity: number;
  }>;
}

/**
 * إعدادات استراتيجية الحل
 */
export interface StrategyConfig {
  // للمنتجات
  product?: {
    metadata: ResolutionStrategy;    // name, price, description, etc.
    inventory: ResolutionStrategy;   // stock_quantity
    images: ResolutionStrategy;      // images, thumbnail_image
  };

  // للعملاء
  customer?: ResolutionStrategy;

  // للعناوين
  address?: ResolutionStrategy;

  // للفواتير
  invoice?: ResolutionStrategy;

  // للطلبات
  order?: ResolutionStrategy;
}

/**
 * الحقول الحرجة لكل نوع كيان
 */
export const CRITICAL_FIELDS: Record<EntityType, string[]> = {
  product: ['stock_quantity', 'last_inventory_update', 'price'],
  customer: ['name', 'email', 'phone'],
  invoice: ['total_amount', 'paid_amount', 'status'],
  order: ['total', 'status', 'payment_status'],
  address: ['street_address', 'city', 'phone']
};

/**
 * الحقول المتجاهلة في المقارنة (حقول محلية فقط)
 */
export const IGNORED_FIELDS = [
  'synced',
  'syncStatus',
  'lastSyncAttempt',
  'localUpdatedAt',
  'pendingOperation',
  'conflictResolution',
  'name_lower',
  'sku_lower',
  'barcode_lower',
  'name_search',
  'sku_search',
  'barcode_digits',
  'email_lower',
  'phone_digits'
];

/**
 * استراتيجيات افتراضية لكل نوع
 */
export const DEFAULT_STRATEGIES: Record<EntityType, ResolutionStrategy> = {
  product: 'merge',           // دمج (server metadata + local inventory)
  customer: 'server_wins',    // السيرفر يفوز (بيانات بسيطة)
  address: 'server_wins',     // السيرفر يفوز
  invoice: 'manual',          // يدوي (بيانات حرجة)
  order: 'client_wins'        // الكلاينت يفوز (orders created locally)
};
