/**
 * 🏷️ Product Types V2
 *
 * أنواع TypeScript للمنتجات المحسّنة
 */

// =====================================================
// أنواع البيانات الأساسية
// =====================================================

export interface ProductBasicData {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category_id?: string;
  subcategory_id?: string;
  brand?: string;
  slug?: string;
  organization_id?: string; // مطلوب للإنشاء
  supplier_id?: string;
  manufacturer?: string;
  country_of_origin?: string;
  customs_code?: string;
}

export interface ProductPricingData {
  price: number;
  purchase_price?: number;
  compare_at_price?: number;
  tax_rate?: number;
  tax_included?: boolean;

  // أسعار الجملة
  wholesale_price?: number;
  min_wholesale_quantity?: number;
  partial_wholesale_price?: number;
  min_partial_wholesale_quantity?: number;

  allow_retail?: boolean;
  allow_wholesale?: boolean;
  allow_partial_wholesale?: boolean;
}

export interface ProductInventoryData {
  stock_quantity?: number;
  min_stock_level?: number;
  reorder_level?: number;
  reorder_quantity?: number;
  track_inventory?: boolean;
}

// =====================================================
// أنواع البيع المختلفة
// =====================================================

export interface WeightSellingConfig {
  enabled: boolean;
  weight_unit: 'kg' | 'g' | 'lb' | 'oz';
  price_per_unit: number;
  purchase_price_per_unit?: number;
  min_weight?: number;
  max_weight?: number;
  average_item_weight?: number;
}

export interface BoxSellingConfig {
  enabled: boolean;
  units_per_box: number;
  box_price: number;
  box_purchase_price?: number;
  box_barcode?: string;
  allow_single_unit_sale?: boolean;
}

export interface MeterSellingConfig {
  enabled: boolean;
  meter_unit: 'm' | 'cm' | 'ft' | 'inch';
  price_per_meter: number;
  purchase_price_per_meter?: number;
  min_meters?: number;
  roll_length?: number;
}

// =====================================================
// تتبع المخزون المتقدم
// =====================================================

export interface ExpiryTrackingConfig {
  enabled: boolean;
  default_expiry_days?: number;
  alert_days_before?: number;
}

export interface SerialTrackingConfig {
  enabled: boolean;
  require_on_sale?: boolean;
}

export interface WarrantyConfig {
  enabled: boolean;
  duration_months?: number;
  type?: 'manufacturer' | 'store' | 'extended';
}

export interface BatchTrackingConfig {
  enabled: boolean;
  use_fifo?: boolean;
}

// =====================================================
// المتغيرات (الألوان والمقاسات)
// =====================================================

export interface ProductSize {
  id?: string;
  name: string;
  quantity: number;
  price?: number;
  purchase_price?: number;
  barcode?: string;
  is_default?: boolean;
}

export interface ProductVariant {
  id?: string;
  name: string;
  color_code?: string;
  image_url?: string;
  barcode?: string;
  quantity: number;
  price?: number;
  purchase_price?: number;
  is_default?: boolean;
  has_sizes?: boolean;
  sizes?: ProductSize[];
}

// =====================================================
// الدفعات والأرقام التسلسلية
// =====================================================

export interface ProductBatch {
  id?: string;
  batch_number: string;
  quantity: number;
  purchase_price?: number;
  selling_price?: number;
  expiry_date?: string;
  supplier_id?: string;
  location?: string;
  notes?: string;
}

export interface ProductSerialNumber {
  id?: string;
  serial_number: string;
  imei?: string;
  warranty_start_date?: string;
  purchase_price?: number;
  location?: string;
  notes?: string;
}

// =====================================================
// مستويات الأسعار
// =====================================================

export type PriceTierName =
  | 'retail'
  | 'wholesale'
  | 'partial_wholesale'
  | 'vip'
  | 'reseller'
  | 'distributor'
  | 'employee'
  | 'custom';

export type PriceTierType = 'fixed' | 'percentage_discount' | 'fixed_discount';

export interface ProductPriceTier {
  id?: string;
  tier_name: PriceTierName;
  tier_label?: string;
  min_quantity: number;
  max_quantity?: number;
  price_type: PriceTierType;
  price?: number;
  discount_percentage?: number;
  discount_amount?: number;
  is_active?: boolean;
  sort_order?: number;
}

// =====================================================
// معلومات خاصة بالنشاط
// =====================================================

export interface PharmacySpecific {
  requires_prescription?: boolean;
  active_ingredient?: string;
  dosage_form?: string;
  concentration?: string;
}

export interface RestaurantSpecific {
  preparation_time_minutes?: number;
  calories?: number;
  allergens?: string[];
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_gluten_free?: boolean;
  spice_level?: number; // 0-5
}

export interface AutoPartsSpecific {
  oem_number?: string;
  compatible_models?: string[];
  vehicle_make?: string;
  vehicle_model?: string;
  year_from?: number;
  year_to?: number;
}

export interface ConstructionSpecific {
  material_type?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'm' | 'mm' | 'inch';
  };
  weight_kg?: number;
  coverage_area_sqm?: number;
}

export type BusinessSpecificData =
  & Partial<PharmacySpecific>
  & Partial<RestaurantSpecific>
  & Partial<AutoPartsSpecific>
  & Partial<ConstructionSpecific>;

// =====================================================
// الصور والوسائط
// =====================================================

export interface ProductImage {
  url: string;
  alt?: string;
  is_primary?: boolean;
}

// =====================================================
// إعدادات متقدمة
// =====================================================

export interface ProductAdvancedSettings {
  skip_cart?: boolean;
  enable_sticky_buy_button?: boolean;
  require_login_to_purchase?: boolean;
  prevent_repeat_purchase?: boolean;
  disable_quantity_selection?: boolean;
  enable_stock_notification?: boolean;
  show_fake_visitor_counter?: boolean;
  enable_fake_low_stock?: boolean;
  show_recent_purchases?: boolean;
}

export interface ProductMarketingSettings {
  enable_facebook_pixel?: boolean;
  facebook_pixel_id?: string;
  enable_tiktok_pixel?: boolean;
  tiktok_pixel_id?: string;
  enable_snapchat_pixel?: boolean;
  snapchat_pixel_id?: string;
  enable_google_ads_tracking?: boolean;
  google_ads_conversion_id?: string;
  enable_reviews?: boolean;
  reviews_auto_approve?: boolean;
  offer_timer_enabled?: boolean;
  offer_timer_title?: string;
  offer_timer_type?: string;
}

// =====================================================
// حالة النشر
// =====================================================

export type PublicationStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface ProductPublication {
  status: PublicationStatus;
  publish_at?: string;
}

// =====================================================
// معاملات الدوال
// =====================================================

export interface UpsertProductV2Params {
  product_id?: string;
  basic_data?: ProductBasicData;
  pricing_data?: ProductPricingData;
  inventory_data?: ProductInventoryData;
  weight_selling?: WeightSellingConfig;
  box_selling?: BoxSellingConfig;
  meter_selling?: MeterSellingConfig;
  expiry_tracking?: ExpiryTrackingConfig;
  serial_tracking?: SerialTrackingConfig;
  warranty?: WarrantyConfig;
  batch_tracking?: BatchTrackingConfig;
  variants?: ProductVariant[];
  initial_batches?: ProductBatch[];
  initial_serials?: ProductSerialNumber[];
  price_tiers?: ProductPriceTier[];
  images?: ProductImage[];
  business_specific?: BusinessSpecificData;
  advanced_settings?: ProductAdvancedSettings;
  marketing_settings?: ProductMarketingSettings;
  special_offers?: Record<string, unknown>;
  advanced_description?: Record<string, unknown>;
  publication?: ProductPublication;
  user_id?: string;
}

export type ProductScope = 'basic' | 'pos' | 'full' | 'edit';

export interface GetProductV2Params {
  product_identifier: string; // UUID, slug, SKU, or barcode
  organization_id?: string;
  scope?: ProductScope;
  include_inactive?: boolean;
}

// =====================================================
// نتائج الدوال
// =====================================================

export interface UpsertProductV2Result {
  success: boolean;
  product_id?: string;
  action?: 'created' | 'updated';
  data?: {
    id: string;
    name: string;
    sku: string;
    stock_quantity: number;
    has_variants: boolean;
    variants_count: number;
    batches_count: number;
    serials_count: number;
  };
  warnings?: string[];
  error?: string;
  error_detail?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductV2Data {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  slug: string;
  category_id?: string;
  subcategory_id?: string;
  brand?: string;
  thumbnail_image?: string;
  is_active: boolean;
  publication_status: PublicationStatus;
  price: number;
  purchase_price?: number;
  compare_at_price?: number;
  tax_rate?: number;
  tax_included?: boolean;
  stock_quantity: number;
  has_variants: boolean;
  sell_by_weight: boolean;
  sell_by_box: boolean;
  sell_by_meter: boolean;
  track_expiry: boolean;
  track_serial_numbers: boolean;
  track_batches: boolean;
  has_warranty: boolean;
  created_at: string;
  updated_at: string;

  // بيانات إضافية حسب النطاق
  weight_selling?: WeightSellingConfig;
  box_selling?: BoxSellingConfig;
  meter_selling?: MeterSellingConfig;
  wholesale?: {
    allow_retail: boolean;
    allow_wholesale: boolean;
    wholesale_price?: number;
    min_wholesale_quantity?: number;
  };
  expiry_tracking?: ExpiryTrackingConfig;
  warranty?: WarrantyConfig;
  batch_tracking?: BatchTrackingConfig;
  serial_tracking?: SerialTrackingConfig;
  business_specific?: BusinessSpecificData;
  inventory?: ProductInventoryData;
  publication?: ProductPublication;
}

export interface GetProductV2Result {
  success: boolean;
  product?: ProductV2Data;
  variants?: ProductVariant[];
  price_tiers?: ProductPriceTier[];
  images?: ProductImage[];
  batches?: ProductBatch[];
  serials?: ProductSerialNumber[];
  serials_available?: number;
  advanced_settings?: ProductAdvancedSettings;
  marketing_settings?: ProductMarketingSettings;
  special_offers?: Record<string, unknown>;
  advanced_description?: Record<string, unknown>;
  error?: string;
}

// =====================================================
// حساب السعر
// =====================================================

export interface CalculatePriceParams {
  product_id: string;
  quantity: number;
  customer_type?: 'retail' | 'wholesale' | 'partial_wholesale' | 'vip' | 'reseller';
  customer_id?: string;
}

export interface CalculatePriceResult {
  success: boolean;
  base_price?: number;
  unit_price?: number;
  quantity?: number;
  subtotal?: number;
  discount_per_unit?: number;
  total_discount?: number;
  tier_applied?: string;
  tax_rate?: number;
  tax_included?: boolean;
  error?: string;
}
