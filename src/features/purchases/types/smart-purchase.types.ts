/**
 * 🚀 Smart Purchase Types - نظام المشتريات الذكي
 * ============================================================
 * أنواع متطورة لدعم:
 * - تعدد الوحدات (قطعة، كرتونة، لفة، كيلو، متر)
 * - مصفوفة المتغيرات (الألوان والمقاسات)
 * - التسعير الذكي
 * - توزيع التكاليف الإضافية (Landed Costs)
 * ============================================================
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 وحدات القياس والتحويل
// ═══════════════════════════════════════════════════════════════════════════

/** أنواع الوحدات المتاحة للشراء */
export type PurchaseUnitType =
  | 'piece'       // قطعة
  | 'box'         // كرتونة/صندوق
  | 'pack'        // علبة/باكيت
  | 'roll'        // لفة
  | 'meter'       // متر
  | 'kg'          // كيلوغرام
  | 'gram'        // غرام
  | 'liter'       // لتر
  | 'dozen'       // دزينة (12)
  | 'pallet';     // بالتة

/** معلومات الوحدة */
export interface UnitInfo {
  type: PurchaseUnitType;
  label: string;
  labelAr: string;
  conversionFactor: number; // عامل التحويل للوحدة الأساسية
  baseUnit: PurchaseUnitType; // الوحدة الأساسية
}

/** خريطة الوحدات المتاحة */
export const UNIT_DEFINITIONS: Record<PurchaseUnitType, UnitInfo> = {
  piece: { type: 'piece', label: 'Piece', labelAr: 'قطعة', conversionFactor: 1, baseUnit: 'piece' },
  box: { type: 'box', label: 'Box', labelAr: 'كرتونة', conversionFactor: 1, baseUnit: 'piece' },
  pack: { type: 'pack', label: 'Pack', labelAr: 'علبة', conversionFactor: 1, baseUnit: 'piece' },
  roll: { type: 'roll', label: 'Roll', labelAr: 'لفة', conversionFactor: 1, baseUnit: 'meter' },
  meter: { type: 'meter', label: 'Meter', labelAr: 'متر', conversionFactor: 1, baseUnit: 'meter' },
  kg: { type: 'kg', label: 'Kilogram', labelAr: 'كيلو', conversionFactor: 1000, baseUnit: 'gram' },
  gram: { type: 'gram', label: 'Gram', labelAr: 'غرام', conversionFactor: 1, baseUnit: 'gram' },
  liter: { type: 'liter', label: 'Liter', labelAr: 'لتر', conversionFactor: 1, baseUnit: 'liter' },
  dozen: { type: 'dozen', label: 'Dozen', labelAr: 'دزينة', conversionFactor: 12, baseUnit: 'piece' },
  pallet: { type: 'pallet', label: 'Pallet', labelAr: 'بالتة', conversionFactor: 1, baseUnit: 'piece' },
};

// ═══════════════════════════════════════════════════════════════════════════
// 📦 المتغيرات (Variants)
// ═══════════════════════════════════════════════════════════════════════════

/** نوع المتغير */
export type VariantType = 'simple' | 'color_only' | 'size_only' | 'color_size';

/** متغير اللون في المصفوفة */
export interface VariantColor {
  id: string;
  name: string;
  colorCode: string;
}

/** متغير المقاس في المصفوفة */
export interface VariantSize {
  id: string;
  name: string;
  sortOrder: number;
}

/** خلية في مصفوفة المتغيرات */
export interface VariantMatrixCell {
  colorId: string | null;
  sizeId: string | null;
  quantity: number;
  unitCost: number;
  barcode?: string;
}

/** مصفوفة المتغيرات الكاملة */
export interface VariantMatrix {
  productId: string;
  colors: VariantColor[];
  sizes: VariantSize[];
  cells: VariantMatrixCell[];
  totalQuantity: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 عنصر المشتريات الذكي
// ═══════════════════════════════════════════════════════════════════════════

/** عنصر مشتريات واحد */
export interface SmartPurchaseItem {
  id: string;
  tempId: string; // معرف مؤقت للـ UI

  // معلومات المنتج
  productId: string | null;
  productName: string;
  productSku?: string;
  productBarcode?: string;
  productImage?: string;

  // المتغيرات
  variantType: VariantType;
  colorId?: string | null;
  colorName?: string | null;
  sizeId?: string | null;
  sizeName?: string | null;
  variantDisplayName?: string;

  // ⚡ إعدادات الوحدات (من المنتج)
  sellByBox?: boolean;
  unitsPerBox?: number;
  sellByMeter?: boolean;
  rollLength?: number;
  sellByWeight?: boolean;

  // الوحدات والكميات
  purchaseUnit: PurchaseUnitType;
  conversionFactor: number; // كم وحدة أساسية في وحدة الشراء
  purchaseQuantity: number; // الكمية بوحدة الشراء
  baseQuantity: number; // الكمية بالوحدة الأساسية (محسوبة)

  // التكاليف
  unitCost: number; // تكلفة وحدة الشراء
  baseCost: number; // تكلفة الوحدة الأساسية (محسوبة)
  taxRate: number; // نسبة الضريبة %
  taxAmount: number; // قيمة الضريبة (محسوبة)
  subtotal: number; // المجموع قبل الضريبة
  totalCost: number; // المجموع شامل الضريبة

  // التكاليف الإضافية (Landed Cost)
  landedCostShare: number; // حصة هذا العنصر من التكاليف الإضافية
  finalCost: number; // التكلفة النهائية الحقيقية
  finalBaseCost: number; // التكلفة النهائية للوحدة الأساسية

  // التسعير الذكي
  currentSellingPrice?: number; // السعر الحالي للبيع
  suggestedSellingPrice?: number; // السعر المقترح للبيع
  currentMargin?: number; // الهامش الحالي %
  suggestedMargin?: number; // الهامش المقترح %
  priceChanged: boolean; // هل تغير السعر؟

  // المخزون
  currentStock: number; // المخزون الحالي
  newStock: number; // المخزون الجديد بعد الشراء
  stockDisplay: string; // عرض المخزون (مثل "500m (5 Rolls)")

  // تتبع إضافي
  batchNumber?: string;
  expiryDate?: string;
  serialNumbers?: string[];

  // ملاحظات
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 التكاليف الإضافية (Landed Costs)
// ═══════════════════════════════════════════════════════════════════════════

/** نوع التكلفة الإضافية */
export type LandedCostType =
  | 'shipping'    // شحن
  | 'customs'     // جمارك
  | 'insurance'   // تأمين
  | 'handling'    // مناولة
  | 'other';      // أخرى

/** طريقة توزيع التكاليف */
export type CostDistributionMethod =
  | 'by_value'    // حسب القيمة
  | 'by_quantity' // حسب الكمية
  | 'by_weight'   // حسب الوزن
  | 'equal';      // بالتساوي

/** تكلفة إضافية واحدة */
export interface LandedCost {
  id: string;
  type: LandedCostType;
  label: string;
  amount: number;
  distributionMethod: CostDistributionMethod;
}

/** ملخص التكاليف الإضافية */
export interface LandedCostsSummary {
  costs: LandedCost[];
  totalAmount: number;
  distributedAmounts: Record<string, number>; // itemId -> amount
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 فاتورة المشتريات الذكية
// ═══════════════════════════════════════════════════════════════════════════

/** حالة المشتريات */
export type PurchaseStatus =
  | 'draft'           // مسودة
  | 'confirmed'       // مؤكدة
  | 'partially_paid'  // مدفوعة جزئياً
  | 'paid'            // مدفوعة بالكامل
  | 'overdue'         // متأخرة
  | 'cancelled';      // ملغاة

/** حالة الدفع */
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

/** طريقة الدفع */
export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'credit' | 'other';

/** فاتورة مشتريات ذكية */
export interface SmartPurchase {
  id: string;
  purchaseNumber: string;
  organizationId: string;

  // المورد
  supplierId: string;
  supplierName?: string;
  supplierPhone?: string;

  // المخزن/الفرع
  warehouseId?: string;
  warehouseName?: string;

  // التواريخ
  purchaseDate: string;
  dueDate?: string;
  receivedDate?: string;

  // العناصر
  items: SmartPurchaseItem[];

  // المجاميع
  subtotal: number; // مجموع العناصر قبل الضريبة
  taxAmount: number; // إجمالي الضريبة
  landedCostsTotal: number; // إجمالي التكاليف الإضافية
  totalAmount: number; // المجموع الكلي

  // الدفعات
  paidAmount: number;
  balanceDue: number;

  // الحالة
  status: PurchaseStatus;
  paymentStatus: PaymentStatus;
  paymentTerms?: string;

  // التكاليف الإضافية
  landedCosts: LandedCost[];

  // ملاحظات ومرفقات
  notes?: string;
  attachments?: string[];

  // البيانات الوصفية
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // المزامنة
  synced: boolean;
  syncStatus: 'synced' | 'pending' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Zod Schemas للتحقق
// ═══════════════════════════════════════════════════════════════════════════

export const smartPurchaseItemSchema = z.object({
  productId: z.string().nullable(),
  productName: z.string().min(1, 'اسم المنتج مطلوب'),
  purchaseUnit: z.enum(['piece', 'box', 'pack', 'roll', 'meter', 'kg', 'gram', 'liter', 'dozen', 'pallet']),
  conversionFactor: z.number().positive('عامل التحويل يجب أن يكون موجباً'),
  purchaseQuantity: z.number().positive('الكمية يجب أن تكون موجبة'),
  unitCost: z.number().nonnegative('التكلفة يجب أن تكون صفر أو أكثر'),
  taxRate: z.number().min(0).max(100, 'نسبة الضريبة يجب أن تكون بين 0 و 100'),
  colorId: z.string().nullable().optional(),
  sizeId: z.string().nullable().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
});

export const landedCostSchema = z.object({
  id: z.string(),
  type: z.enum(['shipping', 'customs', 'insurance', 'handling', 'other']),
  label: z.string().min(1, 'اسم التكلفة مطلوب'),
  amount: z.number().nonnegative('المبلغ يجب أن يكون صفر أو أكثر'),
  distributionMethod: z.enum(['by_value', 'by_quantity', 'by_weight', 'equal']),
});

export const smartPurchaseSchema = z.object({
  supplierId: z.string().min(1, 'يجب اختيار مورد'),
  purchaseDate: z.string().min(1, 'تاريخ الشراء مطلوب'),
  dueDate: z.string().optional(),
  items: z.array(smartPurchaseItemSchema).min(1, 'يجب إضافة عنصر واحد على الأقل'),
  landedCosts: z.array(landedCostSchema).optional(),
  notes: z.string().optional(),
  warehouseId: z.string().optional(),
});

export type SmartPurchaseFormData = z.infer<typeof smartPurchaseSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// 📦 إعدادات Turbo Mode
// ═══════════════════════════════════════════════════════════════════════════

export interface TurboModeSettings {
  enabled: boolean;
  autoFocusNext: boolean; // التنقل التلقائي للحقل التالي
  skipEmptyFields: boolean; // تخطي الحقول الفارغة
  soundFeedback: boolean; // صوت عند الإضافة
  vibrateOnAdd: boolean; // اهتزاز عند الإضافة (موبايل)
  showQuickActions: boolean; // إظهار الإجراءات السريعة
  compactMode: boolean; // الوضع المضغوط
}

export const DEFAULT_TURBO_SETTINGS: TurboModeSettings = {
  enabled: false,
  autoFocusNext: true,
  skipEmptyFields: true,
  soundFeedback: true,
  vibrateOnAdd: true,
  showQuickActions: true,
  compactMode: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// 📦 اختصارات لوحة المفاتيح
// ═══════════════════════════════════════════════════════════════════════════

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: string;
  description: string;
  descriptionAr: string;
}

export const PURCHASE_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'Enter', action: 'addItem', description: 'Add item and move to next', descriptionAr: 'إضافة وانتقال للتالي' },
  { key: 'Tab', action: 'nextField', description: 'Move to next field', descriptionAr: 'انتقل للحقل التالي' },
  { key: 'Escape', action: 'clearSearch', description: 'Clear search', descriptionAr: 'مسح البحث' },
  { key: 'F2', action: 'editSelected', description: 'Edit selected item', descriptionAr: 'تعديل العنصر المحدد' },
  { key: 'Delete', action: 'removeSelected', description: 'Remove selected item', descriptionAr: 'حذف العنصر المحدد' },
  { key: 's', ctrl: true, action: 'saveDraft', description: 'Save as draft', descriptionAr: 'حفظ كمسودة' },
  { key: 'Enter', ctrl: true, action: 'confirmPurchase', description: 'Confirm purchase', descriptionAr: 'تأكيد المشتريات' },
  { key: 'm', ctrl: true, action: 'openMatrix', description: 'Open variant matrix', descriptionAr: 'فتح مصفوفة المتغيرات' },
  { key: 'l', ctrl: true, action: 'openLandedCosts', description: 'Open landed costs', descriptionAr: 'فتح التكاليف الإضافية' },
  { key: 't', ctrl: true, action: 'toggleTurbo', description: 'Toggle Turbo mode', descriptionAr: 'تبديل وضع السرعة' },
];
