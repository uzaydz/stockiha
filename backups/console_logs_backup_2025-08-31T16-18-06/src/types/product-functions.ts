/**
 * ملف Types خاص بدوال المنتجات المحسنة
 * يحتوي على تعريفات واضحة للمعاملات والنتائج المتوقعة
 */

import { Json } from './database.types';

// =================================================================
// 🎯 Types للدوال المحسنة
// =================================================================

/**
 * نتيجة العمليات المحسنة للمنتجات
 */
export interface ProductOperationResult {
  success: boolean;
  product_id?: string;
  message: string;
  error?: string;
  created_at?: string;
  updated_at?: string;
  total_stock?: number;
}

/**
 * معاملات دالة إنشاء المنتج الكاملة
 */
export interface CreateProductCompleteArgs {
  p_product_data: ProductCoreData;
  p_advanced_settings?: ProductAdvancedSettings | null;
  p_marketing_settings?: ProductMarketingSettings | null;
  p_colors?: ProductColorInput[] | null;
  p_images?: ProductImageInput[] | null;
  p_wholesale_tiers?: WholesaleTierInput[] | null;
  p_user_id?: string | null;
}

/**
 * معاملات دالة تحديث المنتج الكاملة
 */
export interface UpdateProductCompleteArgs {
  p_product_id: string;
  p_product_data: Partial<ProductCoreData>;
  p_advanced_settings?: ProductAdvancedSettings | null;
  p_marketing_settings?: ProductMarketingSettings | null;
  p_colors?: ProductColorInput[] | null;
  p_images?: ProductImageInput[] | null;
  p_wholesale_tiers?: WholesaleTierInput[] | null;
  p_user_id?: string | null;
}

// =================================================================
// 🎯 Types للبيانات الأساسية
// =================================================================

/**
 * بيانات المنتج الأساسية
 */
export interface ProductCoreData {
  organization_id: string;
  name: string;
  description?: string;
  price: number;
  purchase_price?: number | null;
  category_id: string;
  stock_quantity?: number;
  thumbnail_image?: string;
  sku?: string | null;
  barcode?: string | null;
  subcategory_id?: string | null;
  brand?: string | null;
  compare_at_price?: number | null;
  wholesale_price?: number | null;
  partial_wholesale_price?: number | null;
  min_wholesale_quantity?: number | null;
  min_partial_wholesale_quantity?: number | null;
  unit_purchase_price?: number | null;
  unit_sale_price?: number | null;
  allow_retail?: boolean;
  allow_wholesale?: boolean;
  allow_partial_wholesale?: boolean;
  has_variants?: boolean;
  show_price_on_landing?: boolean;
  is_featured?: boolean;
  is_new?: boolean;
  use_sizes?: boolean;
  is_sold_by_unit?: boolean;
  unit_type?: string | null;
  use_variant_prices?: boolean;
  form_template_id?: string | null;
  shipping_provider_id?: string | null;
  use_shipping_clone?: boolean;
  shipping_clone_id?: string | null;
  is_digital?: boolean;
  features?: Json;
  specifications?: Json;
  name_for_shipping?: string | null;
  slug?: string;
}

/**
 * الإعدادات المتقدمة للمنتج
 */
export interface ProductAdvancedSettings {
  auto_approve_orders?: boolean;
  require_shipping_address?: boolean;
  allow_guest_checkout?: boolean;
  max_quantity_per_order?: number | null;
  min_quantity_per_order?: number;
  inventory_tracking?: boolean;
  low_stock_threshold?: number;
  out_of_stock_message?: string | null;
  pre_order_enabled?: boolean;
  pre_order_message?: string | null;
  digital_delivery_enabled?: boolean;
  digital_file_url?: string | null;
  weight?: number | null;
  dimensions?: Json | null;
  shipping_class?: string | null;
  tax_class?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
}

/**
 * إعدادات التسويق للمنتج
 */
export interface ProductMarketingSettings {
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  social_media_title?: string | null;
  social_media_description?: string | null;
  social_media_image?: string | null;
  google_analytics_tracking?: boolean;
  facebook_pixel_tracking?: boolean;
  related_products?: Json | null;
  upsell_products?: Json | null;
  cross_sell_products?: Json | null;
}

/**
 * بيانات إدخال اللون
 */
export interface ProductColorInput {
  name: string;
  color_code: string;
  image_url?: string | null;
  quantity?: number;
  is_default?: boolean;
  barcode?: string | null;
  has_sizes?: boolean;
  price?: number | null;
  purchase_price?: number | null;
  variant_number?: number | null;
  sizes?: ProductSizeInput[];
}

/**
 * بيانات إدخال المقاس
 */
export interface ProductSizeInput {
  size_name: string;
  quantity?: number;
  price?: number | null;
  purchase_price?: number | null;
  barcode?: string | null;
  is_default?: boolean;
}

/**
 * بيانات إدخال الصورة
 */
export interface ProductImageInput {
  image_url: string;
  sort_order?: number;
}

/**
 * بيانات إدخال أسعار الجملة
 */
export interface WholesaleTierInput {
  min_quantity: number;
  price_per_unit: number;
}

// =================================================================
// 🎯 Helper Types للاستجابات
// =================================================================

/**
 * نوع للاستجابة من Supabase RPC
 */
export type SupabaseRPCResponse<T> = {
  data: T | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
};

/**
 * نوع مُحسن لاستدعاء دوال RPC
 */
export type ProductRPCFunction = 
  | 'create_product_complete'
  | 'update_product_complete';

// =================================================================
// 🎯 Utility Types
// =================================================================

/**
 * نوع للتحقق من نجاح العملية
 */
export interface OperationSuccess {
  success: true;
  data: ProductOperationResult;
}

/**
 * نوع للتحقق من فشل العملية
 */
export interface OperationFailure {
  success: false;
  error: string;
  message: string;
}

/**
 * نوع موحد لنتائج العمليات
 */
export type OperationResult = OperationSuccess | OperationFailure;

// =================================================================
// 🎯 Validation Helpers
// =================================================================

/**
 * دالة للتحقق من صحة نتيجة العملية
 */
export const isOperationSuccess = (result: any): result is OperationSuccess => {
  return result && typeof result === 'object' && result.success === true;
};

/**
 * دالة للتحقق من فشل العملية
 */
export const isOperationFailure = (result: any): result is OperationFailure => {
  return result && typeof result === 'object' && result.success === false;
};

/**
 * دالة للتحقق من صحة نتيجة RPC
 */
export const validateRPCResult = (result: any): ProductOperationResult => {
  if (!result) {
    throw new Error('No result returned from RPC function');
  }
  
  if (typeof result !== 'object') {
    throw new Error('Invalid result format from RPC function');
  }
  
  if (!('success' in result)) {
    throw new Error('Missing success field in RPC result');
  }
  
  return result as ProductOperationResult;
};

export default {
  isOperationSuccess,
  isOperationFailure,
  validateRPCResult,
};
