/**
 * 📦 Inventory Types
 * أنواع المخزون المتقدمة
 */

export type SellingUnitType = 'piece' | 'weight' | 'box' | 'meter';

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export type MovementType =
  | 'purchase'      // شراء
  | 'sale'          // بيع
  | 'return'        // إرجاع
  | 'adjustment'    // تعديل يدوي
  | 'transfer'      // تحويل
  | 'damage'        // تالف
  | 'expired';      // منتهي الصلاحية

export interface InventoryColor {
  id: string;
  name: string;
  color_code: string;
  quantity: number;
  has_sizes: boolean;
  sizes?: InventorySize[];
}

export interface InventorySize {
  id: string;
  name: string;
  quantity: number;
}

/**
 * منتج المخزون المتقدم - يدعم جميع أنواع البيع
 */
export interface AdvancedInventoryProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode?: string | null;
  thumbnail_image: string | null;
  thumbnail_base64?: string | null; // ⚡ للعمل Offline

  // المخزون الأساسي (قطعة)
  stock_quantity: number;
  price: number;
  purchase_price: number | null;

  // البيع بالوزن
  sell_by_weight: boolean;
  weight_unit?: 'kg' | 'g' | 'lb' | 'oz';
  price_per_weight_unit?: number;
  purchase_price_per_weight_unit?: number;
  available_weight?: number;
  total_weight_purchased?: number;
  min_weight_per_sale?: number;
  max_weight_per_sale?: number;

  // البيع بالكرتون
  sell_by_box: boolean;
  units_per_box?: number;
  box_price?: number;
  box_purchase_price?: number;
  box_barcode?: string;
  available_boxes?: number;
  total_boxes_purchased?: number;
  allow_single_unit_sale?: boolean;

  // البيع بالمتر
  sell_by_meter: boolean;
  meter_unit?: 'm' | 'cm' | 'ft' | 'inch';
  price_per_meter?: number;
  purchase_price_per_meter?: number;
  available_length?: number;
  total_meters_purchased?: number;
  min_meters_per_sale?: number;
  roll_length_meters?: number;

  // تتبع الصلاحية
  track_expiry?: boolean;
  default_expiry_days?: number;
  expiry_alert_days?: number;

  // الأرقام التسلسلية
  track_serial_numbers?: boolean;
  require_serial_on_sale?: boolean;

  // تتبع الدفعات
  track_batches?: boolean;
  use_fifo?: boolean;

  // المتغيرات (الألوان والمقاسات)
  has_variants: boolean;
  colors?: InventoryColor[];
  variant_count?: number;
  total_variant_stock?: number;

  // حالة المخزون
  stock_status: StockStatus;
  min_stock_level?: number;
  reorder_level?: number;

  // معلومات إضافية
  category?: string;
  category_id?: string;
  is_active?: boolean;

  // للعرض
  total_count?: number;
  filtered_count?: number;
}

/**
 * فلاتر المخزون المتقدمة
 */
export interface AdvancedInventoryFilters {
  search?: string;
  stockFilter?: 'all' | StockStatus;
  sellingType?: 'all' | SellingUnitType;
  categoryId?: string;
  sortBy?: 'name' | 'stock' | 'price' | 'updated' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
}

/**
 * إحصائيات المخزون المتقدمة
 */
export interface AdvancedInventoryStats {
  total_products: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  total_value: number;

  // إحصائيات حسب نوع البيع
  weight_products?: number;
  box_products?: number;
  meter_products?: number;

  // إحصائيات المخزون المتقدم
  total_weight_available?: number;
  total_boxes_available?: number;
  total_meters_available?: number;

  // منتجات تحتاج اهتمام
  expiring_soon?: number;
  below_reorder_level?: number;
}

/**
 * حركة المخزون
 */
export interface InventoryMovement {
  id: string;
  organizationId: string;
  productId: string;
  movementType: MovementType;
  unitType: SellingUnitType;

  // الكميات
  quantityPieces?: number;
  quantityWeight?: number;
  quantityMeters?: number;
  quantityBoxes?: number;

  // الأرصدة
  balanceBeforePieces?: number;
  balanceAfterPieces?: number;
  balanceBeforeWeight?: number;
  balanceAfterWeight?: number;
  balanceBeforeMeters?: number;
  balanceAfterMeters?: number;
  balanceBeforeBoxes?: number;
  balanceAfterBoxes?: number;

  // المتغيرات
  colorId?: string;
  sizeId?: string;

  // الدفعة
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  serialNumbers?: string[];

  // المرجع
  referenceType?: string;
  referenceId?: string;

  // التكلفة
  unitCost?: number;
  totalValue?: number;

  // معلومات إضافية
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  synced?: boolean;
}

/**
 * نتيجة عملية المخزون
 */
export interface InventoryOperationResult {
  success: boolean;
  historyId?: string;
  balanceBefore?: {
    pieces: number;
    weight: number;
    meters: number;
    boxes: number;
  };
  balanceAfter?: {
    pieces: number;
    weight: number;
    meters: number;
    boxes: number;
  };
  error?: string;
}
