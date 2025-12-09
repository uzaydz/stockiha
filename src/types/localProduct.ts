/**
 * تعريفات موحدة للمنتجات المحلية
 *
 * ⚡ هذا الملف يوحد جميع تعريفات المنتجات المحلية في مكان واحد
 * لتجنب التكرار وضمان التوافق بين الملفات
 */

import { Product } from '@/api/productService';

// =====================================================
// الأنواع الأساسية للمنتجات المحلية
// =====================================================

/**
 * ⚡ المنتج المحلي الأساسي (للبحث والعرض السريع)
 * يحتوي على الحقول الأساسية فقط للأداء العالي
 */
export interface LocalProductBasic {
  id: string;
  name: string;
  price: number;
  barcode?: string;
  sku?: string;
  stock_quantity: number;
  actual_stock_quantity?: number;
  has_variants: boolean;
  category_id?: string;
  category_name?: string;
  thumbnail_image?: string;
  thumbnail_base64?: string;
  wholesale_price?: number;
  allow_retail?: boolean;
  allow_wholesale?: boolean;
  organization_id: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;

  // === ⚡ حقول المخزون المتقدم ===
  /** المخزون المتاح بالوزن */
  available_weight?: number;
  /** المخزون المتاح بالأمتار */
  available_length?: number;
  /** المخزون المتاح بالصناديق */
  available_boxes?: number;

  // === ⚡ حقول البيع المتقدم ===
  /** البيع بالوزن */
  sell_by_weight?: boolean;
  /** البيع بالمتر */
  sell_by_meter?: boolean;
  /** البيع بالصندوق */
  sell_by_box?: boolean;
  /** السعر لكل وحدة وزن */
  price_per_weight_unit?: number;
  /** وحدة الوزن */
  weight_unit?: string;
  /** السعر لكل متر */
  price_per_meter?: number;
  /** سعر الصندوق */
  box_price?: number;
  /** عدد الوحدات في الصندوق */
  units_per_box?: number;
  /** الحد الأدنى للأمتار لكل بيع */
  min_meters_per_sale?: number;
  /** الحد الأدنى للوزن لكل بيع */
  min_weight_per_sale?: number;
}

/**
 * ⚡ حقول المزامنة المشتركة
 */
export interface SyncFields {
  synced: boolean;
  syncStatus?: 'pending' | 'error';
  lastSyncAttempt?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
  conflictResolution?: 'local' | 'remote' | 'merge';
}

/**
 * ⚡ حقول البحث المحلية
 */
export interface LocalSearchFields {
  name_lower?: string;
  name_search?: string;
  name_normalized?: string;
  sku_lower?: string;
  sku_search?: string;
  barcode_lower?: string;
  barcode_digits?: string;
}

/**
 * ⚡ المنتج المحلي الكامل (يمتد من Product مع حقول المزامنة)
 * يُستخدم للتخزين الكامل والمزامنة
 */
export interface LocalProductFull extends Product, SyncFields, LocalSearchFields {
  // ⚡ الفئات الإضافية
  category_id?: string | null;
  subcategory_id?: string | null;
  brand?: string | null;

  // ⚡ الأسعار الإضافية
  purchase_price?: number | null;
  compare_at_price?: number | null;
  wholesale_price?: number | null;
  partial_wholesale_price?: number | null;
  unit_purchase_price?: number | null;
  unit_sale_price?: number | null;

  // ⚡ المخزون الإضافي
  min_stock_level?: number | null;
  min_wholesale_quantity?: number | null;
  min_partial_wholesale_quantity?: number | null;
  reorder_level?: number | null;
  reorder_quantity?: number | null;

  // ⚡ الحالات
  is_digital?: boolean;
  is_featured?: boolean;
  is_new?: boolean;
  is_sold_by_unit?: boolean;
  has_variants?: boolean;
  show_price_on_landing?: boolean;
  use_sizes?: boolean;
  use_variant_prices?: boolean;
  use_shipping_clone?: boolean;

  // ⚡ إعدادات البيع
  allow_retail?: boolean;
  allow_wholesale?: boolean;
  allow_partial_wholesale?: boolean;
  unit_type?: string | null;

  // ⚡ الصور المحلية
  thumbnail_base64?: string | null;
  images_base64?: string | null;

  // ⚡ الشحن والضمانات
  has_fast_shipping?: boolean;
  has_money_back?: boolean;
  has_quality_guarantee?: boolean;
  fast_shipping_text?: string | null;
  money_back_text?: string | null;
  quality_guarantee_text?: string | null;
  shipping_clone_id?: number | null;
  shipping_method_type?: string | null;
  shipping_provider_id?: number | null;

  // ⚡ إعدادات متقدمة
  purchase_page_config?: any | null;
  form_template_id?: string | null;
  last_inventory_update?: string | null;
}

// =====================================================
// أنواع الألوان والمقاسات
// =====================================================

/**
 * ⚡ لون المنتج المحلي
 */
export interface LocalProductColor {
  id: string;
  product_id: string;
  name: string;
  color_code?: string;
  quantity: number;
  barcode?: string;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * ⚡ مقاس المنتج المحلي
 */
export interface LocalProductSize {
  id: string;
  product_id: string;
  color_id: string;
  size_name: string;
  quantity: number;
  barcode?: string;
  price?: number;
  created_at?: string;
  updated_at?: string;
}

// =====================================================
// أنواع نتائج البحث
// =====================================================

/**
 * ⚡ نتيجة البحث بالباركود
 */
export interface BarcodeSearchResult {
  id: string;
  name: string;
  price: number;
  barcode: string;
  stock_quantity: number;
  actual_stock_quantity: number;
  type: 'main_product' | 'color_variant' | 'size_variant';
  found_in: 'local' | 'server';
  variant_info?: {
    color_id?: string;
    color_name?: string;
    color_code?: string;
    size_id?: string;
    size_name?: string;
  };
  thumbnail_image?: string;
  category_id?: string;
  wholesale_price?: number;
  allow_retail?: boolean;
  allow_wholesale?: boolean;
  fullProduct?: LocalProductBasic;
}

/**
 * ⚡ نتيجة البحث بالاسم
 */
export interface NameSearchResult {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  thumbnail_image?: string;
  thumbnail_base64?: string;
  barcode?: string;
  has_variants: boolean;
  category_name?: string;
}

/**
 * ⚡ نتائج البحث مع Pagination
 */
export interface PaginatedProductsResult {
  products: LocalProductBasic[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
  source: 'local' | 'server';
}

// =====================================================
// أنواع البحث والفلترة
// =====================================================

/**
 * ⚡ خيارات البحث عن المنتجات
 */
export interface ProductSearchOptions {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  stockFilter?: 'all' | 'in_stock' | 'out_of_stock';
  sortBy?: 'name' | 'price' | 'stock' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * ⚡ فلتر المنتجات
 */
export interface ProductFilter {
  isActive?: boolean;
  hasVariants?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  categoryIds?: string[];
}

// =====================================================
// Aliases للتوافقية
// =====================================================

/**
 * ⚡ LocalProduct (alias للتوافقية مع الكود القديم)
 * يشير إلى النسخة الأساسية للبحث السريع
 */
export type LocalProduct = LocalProductBasic;

// ⚡ تم إزالة export default لتجنب مشكلة star export
// جميع الأنواع متاحة عبر named exports
