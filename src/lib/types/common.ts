/**
 * ⚡ Common Types
 * أنواع مشتركة تُستخدم في جميع أنحاء التطبيق
 */

/**
 * ⚡ Audit Columns - أعمدة التدقيق القياسية
 */
export interface AuditColumns {
    created_at: string;
    updated_at: string;
}

/**
 * ⚡ Local Sync Columns - أعمدة المزامنة المحلية
 * جميعها تبدأ بـ _ (underscore) لتسهيل الفلترة
 */
export interface LocalSyncColumns {
    _synced?: 0 | 1;
    _sync_status?: 'pending' | 'syncing' | 'synced' | 'failed';
    _pending_operation?: 'INSERT' | 'UPDATE' | 'DELETE' | null;
    _local_updated_at?: string;
    _error?: string;
    _last_sync_attempt?: string;
}

/**
 * ⚡ Base Entity - الكيان الأساسي
 */
export interface BaseEntity extends AuditColumns {
    id: string;
}

/**
 * ⚡ Organization Entity - كيان مرتبط بمنظمة
 */
export interface OrganizationEntity extends BaseEntity {
    organization_id: string;
}

/**
 * ⚡ Local Entity - كيان محلي مع أعمدة المزامنة
 */
export type LocalEntity<T> = T & LocalSyncColumns;

/**
 * ⚡ Sale Type - نوع البيع
 */
export type SaleType = 'retail' | 'wholesale' | 'partial_wholesale';

/**
 * ⚡ Selling Unit Type - نوع وحدة البيع
 */
export type SellingUnitType = 'piece' | 'weight' | 'meter' | 'box';

/**
 * ⚡ Order Status - حالة الطلب
 */
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

/**
 * ⚡ Payment Method - طريقة الدفع
 */
export type PaymentMethod = 'cash' | 'card' | 'credit' | 'mixed' | 'bank_transfer' | 'check';

/**
 * ⚡ Payment Status - حالة الدفع
 */
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded';

/**
 * ⚡ Publication Status - حالة النشر
 */
export type PublicationStatus = 'draft' | 'scheduled' | 'published' | 'archived';

/**
 * ⚡ Weight Unit - وحدة الوزن
 */
export type WeightUnit = 'kg' | 'g' | 'lb' | 'oz';

/**
 * ⚡ Length Unit - وحدة الطول
 */
export type LengthUnit = 'm' | 'cm' | 'ft' | 'in';

/**
 * ⚡ Warranty Type - نوع الضمان
 */
export type WarrantyType = 'none' | 'manufacturer' | 'store' | 'extended';

/**
 * ⚡ Expense Type - نوع المصروف
 */
export type ExpenseType = 'one_time' | 'recurring';

/**
 * ⚡ Recurrence Frequency - تكرار المصروفات
 */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * ⚡ Nullable - جعل الحقل قابل للـ null
 */
export type Nullable<T> = T | null;

/**
 * ⚡ WithOptional - جعل بعض الحقول اختيارية
 */
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * ⚡ WithRequired - جعل بعض الحقول مطلوبة
 */
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * ⚡ CreateInput - نوع الإدخال للإنشاء (بدون id و timestamps)
 */
export type CreateInput<T extends BaseEntity> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * ⚡ UpdateInput - نوع الإدخال للتحديث (جزئي)
 */
export type UpdateInput<T extends BaseEntity> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;

/**
 * ⚡ JSON Types
 */
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject { [key: string]: JSONValue }
export type JSONArray = JSONValue[];
