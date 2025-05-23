import { z } from 'zod';

// نموذج بيانات لون المنتج
export const productColorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: 'اسم اللون مطلوب' }),
  color_code: z.string().min(3, { message: 'رمز اللون مطلوب' }),
  image_url: z.string().min(0).optional(),
  quantity: z.coerce.number().nonnegative({ message: 'الكمية يجب أن تكون صفر أو أكثر' }),
  price: z.coerce.number().nonnegative({ message: 'السعر يجب أن يكون صفر أو أكثر' }).optional(),
  purchase_price: z.coerce.number().min(0, { message: "سعر الشراء يجب أن يكون 0 أو أكبر" }).optional(),
  is_default: z.boolean().default(false),
  product_id: z.string().optional(),
  barcode: z.string().optional(),
  variant_number: z.number().optional(),
  sizes: z.array(z.lazy(() => productSizeSchema)).optional(),
  has_sizes: z.boolean().default(false),
});

export type ProductColor = z.infer<typeof productColorSchema>;

// نموذج بيانات مقاس المنتج
export const productSizeSchema = z.object({
  id: z.string().optional(),
  color_id: z.string(),
  product_id: z.string(),
  size_name: z.string().min(1, { message: 'اسم المقاس مطلوب' }),
  quantity: z.coerce.number().nonnegative({ message: 'الكمية يجب أن تكون صفر أو أكثر' }),
  price: z.coerce.number().nonnegative({ message: 'السعر يجب أن يكون صفر أو أكثر' }).optional(),
  purchase_price: z.coerce.number().min(0, { message: "سعر الشراء يجب أن يكون 0 أو أكبر" }).optional(),
  barcode: z.string().optional(),
  is_default: z.boolean().default(false),
});

export type ProductSize = z.infer<typeof productSizeSchema>;

// نموذج بيانات المرحلة السعرية للجملة
export const wholesaleTierSchema = z.object({
  id: z.string().optional(),
  min_quantity: z.coerce.number().positive({ message: "الكمية يجب أن تكون أكبر من 0" }),
  price_per_unit: z.coerce.number().nonnegative({ message: "السعر يجب أن يكون 0 أو أكبر" }),
  product_id: z.string().optional(),
});

export type WholesaleTier = z.infer<typeof wholesaleTierSchema>;

// Add new schema for Advanced Settings
export const productAdvancedSettingsSchema = z.object({
  use_custom_currency: z.boolean().optional().default(false),
  custom_currency_code: z.string().max(10, { message: "رمز العملة يجب ألا يتجاوز 10 أحرف"}).optional().nullable(),
  is_base_currency: z.boolean().optional().default(false),
  skip_cart: z.boolean().optional().default(true),
  enable_stock_notification: z.boolean().optional().default(false),
  
  show_fake_visitor_counter: z.boolean().optional().default(false),
  min_fake_visitors: z.coerce.number().int().min(0, {message: "أقل عدد زوار يجب أن يكون 0 أو أكثر"}).optional().nullable().default(5),
  max_fake_visitors: z.coerce.number().int().min(0, {message: "أقصى عدد زوار يجب أن يكون 0 أو أكثر"}).optional().nullable().default(25),

  enable_fake_low_stock: z.boolean().optional().default(false),
  min_fake_stock_threshold: z.coerce.number().int().min(0, {message: "أقل كمية للتنبيه يجب أن تكون 0 أو أكثر"}).optional().nullable().default(1),
  max_fake_stock_threshold: z.coerce.number().int().min(0, {message: "أقصى كمية للتنبيه يجب أن تكون 0 أو أكثر"}).optional().nullable().default(5),
  
  show_stock_countdown: z.boolean().optional().default(false),
  stock_countdown_duration_hours: z.coerce.number().int().min(1, {message: "مدة العداد يجب أن تكون ساعة واحدة على الأقل"}).optional().nullable().default(24),
  reset_stock_countdown_on_zero: z.boolean().optional().default(false),

  prevent_exit_popup: z.boolean().optional().default(false),
  show_popularity_badge: z.boolean().optional().default(false),
  popularity_badge_text: z.string().max(50, {message: "نص شارة الشعبية يجب ألا يتجاوز 50 حرفًا"}).optional().nullable(),
  enable_gift_wrapping: z.boolean().optional().default(false),
  
  // Referral Program Settings
  enable_referral_program: z.boolean().optional().default(false),
  referral_commission_type: z.enum(['percentage', 'fixed']).optional().nullable(),
  referral_commission_value: z.coerce.number().positive({message: "قيمة العمولة يجب أن تكون موجبة"}).optional().nullable(),
  referral_cookie_duration_days: z.coerce.number().int().positive({message: "مدة الكوكيز يجب أن تكون عددًا صحيحًا موجبًا"}).optional().nullable(),
  
  // New Buyer Discount Settings for Referral Program
  enable_buyer_discount: z.boolean().optional().default(false), 
  buyer_discount_percentage: z.coerce.number().int()
    .min(0, { message: "نسبة الخصم للمشتري يجب أن تكون 0 أو أكثر" })
    .max(100, { message: "نسبة الخصم للمشتري يجب ألا تتجاوز 100" })
    .optional().nullable().default(5),

}).deepPartial().optional();

// Schema for Product Marketing and Engagement Settings
export const productMarketingSettingsSchema = z.object({
  // Review Settings
  enable_reviews: z.boolean().optional().default(true),
  reviews_verify_purchase: z.boolean().optional().default(false),
  reviews_auto_approve: z.boolean().optional().default(true),
  allow_images_in_reviews: z.boolean().optional().default(true),
  enable_review_replies: z.boolean().optional().default(true),
  review_display_style: z.string().optional().default('stars_summary'),
  
  // Fake Engagement Settings
  enable_fake_star_ratings: z.boolean().optional().default(false),
  fake_star_rating_value: z.coerce.number().min(1.0).max(5.0).optional().default(4.5).nullable(),
  fake_star_rating_count: z.coerce.number().int().min(0).optional().default(100).nullable(),
  enable_fake_purchase_counter: z.boolean().optional().default(false),
  fake_purchase_count: z.coerce.number().int().min(0).optional().default(50).nullable(),

  // Facebook Pixel Settings
  enable_facebook_pixel: z.boolean().optional().default(false),
  facebook_pixel_id: z.string().optional().nullable(),
  facebook_standard_events: z.record(z.string(), z.boolean()).optional().nullable(), // e.g., { ViewContent: true, AddToCart: false }
  facebook_advanced_matching_enabled: z.boolean().optional().default(false),
  facebook_conversations_api_enabled: z.boolean().optional().default(false),
  enable_facebook_conversion_api: z.boolean().optional().default(false),
  facebook_access_token: z.string().optional().nullable(),
  facebook_test_event_code: z.string().optional().nullable(),
  facebook_dataset_id: z.string().optional().nullable(),

  // TikTok Pixel Settings
  enable_tiktok_pixel: z.boolean().optional().default(false),
  tiktok_pixel_id: z.string().optional().nullable(),
  tiktok_standard_events: z.record(z.string(), z.boolean()).optional().nullable(),
  tiktok_advanced_matching_enabled: z.boolean().optional().default(false),
  tiktok_events_api_enabled: z.boolean().optional().default(false),
  tiktok_access_token: z.string().optional().nullable(),
  tiktok_test_event_code: z.string().optional().nullable(),

  // Snapchat Pixel Settings
  enable_snapchat_pixel: z.boolean().optional().default(false),
  snapchat_pixel_id: z.string().optional().nullable(),
  snapchat_standard_events: z.record(z.string(), z.boolean()).optional().nullable(),
  snapchat_advanced_matching_enabled: z.boolean().optional().default(false),
  snapchat_events_api_enabled: z.boolean().optional().default(false),
  snapchat_api_token: z.string().optional().nullable(),
  snapchat_test_event_code: z.string().optional().nullable(),

  // Google Ads Tracking Settings
  enable_google_ads_tracking: z.boolean().optional().default(false),
  google_ads_conversion_id: z.string().optional().nullable(),
  google_ads_conversion_label: z.string().optional().nullable(),
  google_gtag_id: z.string().optional().nullable(),
  google_ads_global_site_tag_enabled: z.boolean().optional().default(false),
  google_ads_event_snippets: z.record(z.string(), z.string()).optional().nullable(), // e.g., { purchase: "AW-XXXX/YYYY", add_to_cart: "AW-XXXX/ZZZZ" }
  google_ads_phone_conversion_number: z.string().optional().nullable(),
  google_ads_phone_conversion_label: z.string().optional().nullable(),
  google_ads_enhanced_conversions_enabled: z.boolean().optional().default(false),

  // Offer Timer Settings
  offer_timer_enabled: z.boolean().optional().default(false),
  offer_timer_title: z.string().optional().nullable(),
  offer_timer_type: z.enum(['specific_date', 'evergreen', 'fixed_duration_per_visitor']).optional().nullable(),
  offer_timer_end_date: z.string().optional().nullable(), // Should be a date string, consider z.date() if input is Date object
  offer_timer_duration_minutes: z.coerce.number().int().positive().optional().nullable(),
  offer_timer_display_style: z.string().optional().nullable(), // Could be enum: ['banner_top', 'inline_under_price']
  offer_timer_text_above: z.string().optional().nullable(),
  offer_timer_text_below: z.string().optional().nullable(),
  offer_timer_end_action: z.enum(['hide_timer', 'show_message', 'redirect_to_url']).optional().nullable(),
  offer_timer_end_action_url: z.string().url({ message: "الرجاء إدخال رابط صحيح" }).optional().nullable(),
  offer_timer_end_action_message: z.string().optional().nullable(),
  offer_timer_restart_for_new_session: z.boolean().optional().default(false),
  offer_timer_cookie_duration_days: z.coerce.number().int().positive().optional().nullable(),
  offer_timer_show_on_specific_pages_only: z.boolean().optional().default(false),
  offer_timer_specific_page_urls: z.array(z.string()).optional().nullable(),

  // Loyalty Points Settings
  loyalty_points_enabled: z.boolean().optional().default(false),
  loyalty_points_name_singular: z.string().optional().nullable(),
  loyalty_points_name_plural: z.string().optional().nullable(),
  points_per_currency_unit: z.coerce.number().positive({ message: "النقاط لكل وحدة عملة يجب أن تكون موجبة" }).optional().nullable(),
  min_purchase_to_earn_points: z.coerce.number().nonnegative({ message: "الحد الأدنى للشراء يجب أن يكون 0 أو أكثر" }).optional().nullable(),
  max_points_per_order: z.coerce.number().int().positive({ message: "الحد الأقصى للنقاط يجب أن يكون عددًا صحيحًا موجبًا" }).optional().nullable(),
  redeem_points_for_discount: z.boolean().optional().default(false),
  points_needed_for_fixed_discount: z.coerce.number().int().positive({ message: "النقاط المطلوبة للخصم يجب أن تكون عددًا صحيحًا موجبًا" }).optional().nullable(),
  fixed_discount_value_for_points: z.coerce.number().positive({ message: "قيمة الخصم يجب أن تكون موجبة" }).optional().nullable(),
  points_expiration_months: z.coerce.number().int().nonnegative({ message: "مدة صلاحية النقاط يجب أن تكون 0 أو أكثر" }).optional().default(0),

  // Global Test Mode
  test_mode: z.boolean().optional().default(true),

}).deepPartial().optional();

// نموذج بيانات المنتج الموسع
export const productSchema = z.object({
  id: z.string().optional(),
  organization_id: z.string().uuid({ message: "معرف المؤسسة مطلوب وصيغته غير صحيحة" }),
  name: z.string().min(1, { message: "اسم المنتج مطلوب" }),
  name_for_shipping: z.string().optional(),
  description: z.string().min(1, { message: "وصف المنتج مطلوب" }),
  price: z.coerce.number().min(0, { message: "السعر يجب أن يكون 0 أو أكبر" }),
  purchase_price: z.coerce.number().min(0, { message: "سعر الشراء يجب أن يكون 0 أو أكبر" }),
  compare_at_price: z.coerce.number().min(0, { message: "السعر المقارن يجب أن يكون 0 أو أكبر" }).optional(),
  wholesale_price: z.coerce.number().min(0, { message: "سعر الجملة يجب أن يكون 0 أو أكبر" }).optional(),
  partial_wholesale_price: z.coerce.number().min(0, { message: "سعر الجملة الجزئي يجب أن يكون 0 أو أكبر" }).optional(),
  min_wholesale_quantity: z.coerce.number().min(0, { message: "الحد الأدنى لكمية الجملة يجب أن يكون 0 أو أكبر" }).optional(),
  min_partial_wholesale_quantity: z.coerce.number().min(0, { message: "الحد الأدنى لكمية الجملة الجزئية يجب أن يكون 0 أو أكبر" }).optional(),
  allow_retail: z.boolean().default(true),
  allow_wholesale: z.boolean().default(false),
  allow_partial_wholesale: z.boolean().default(false),
  sku: z.string().min(1, { message: "رمز المنتج (SKU) مطلوب" }),
  barcode: z.string().optional(),
  category_id: z.string().min(1, { message: "يجب اختيار فئة للمنتج" }),
  subcategory_id: z.string().optional().nullable(),
  brand: z.string().optional(),
  stock_quantity: z.coerce.number().min(0, { message: "الكمية المتاحة يجب أن تكون 0 أو أكبر" }),
  thumbnail_image: z.string().min(1, { message: "يجب رفع صورة رئيسية للمنتج" }),
  has_variants: z.boolean().default(false),
  show_price_on_landing: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  is_new: z.boolean().default(true),
  colors: z.array(productColorSchema).optional(),
  additional_images: z.array(z.string()).optional(),
  wholesale_tiers: z.array(wholesaleTierSchema).optional(),
  use_sizes: z.boolean().default(false),
  is_sold_by_unit: z.boolean().default(true),
  unit_type: z.string().optional(),
  use_variant_prices: z.boolean().default(false),
  unit_purchase_price: z.coerce.number().min(0, { message: "سعر شراء الوحدة يجب أن يكون 0 أو أكبر" }).optional(),
  unit_sale_price: z.coerce.number().min(0, { message: "سعر بيع الوحدة يجب أن يكون 0 أو أكبر" }).optional(),
  form_template_id: z.string().uuid().nullable().optional(),
  shipping_provider_id: z.number().int().nullable().optional(),
  use_shipping_clone: z.boolean().default(false).optional(),
  shipping_clone_id: z.number().int().nullable().optional(),
  created_by_user_id: z.string().uuid().optional(),
  updated_by_user_id: z.string().uuid().optional(),
  slug: z.string().optional(),
  is_digital: z.boolean().default(false),
  features: z.array(z.string()).optional(),
  specifications: z.record(z.string()).optional(),
  advancedSettings: productAdvancedSettingsSchema,
  marketingSettings: productMarketingSettingsSchema,
});

export type ProductFormValues = z.infer<typeof productSchema>;

// واجهة بيانات لإدخال اللون في قاعدة البيانات
export interface InsertProductColor {
  product_id: string;
  name: string;
  color_code: string;
  image_url?: string;
  quantity: number;
  price?: number;
  is_default: boolean;
  barcode?: string;
  variant_number?: number;
  has_sizes?: boolean;
}

// واجهة بيانات لإدخال المقاس في قاعدة البيانات
export interface InsertProductSize {
  color_id: string;
  product_id: string;
  size_name: string;
  quantity: number;
  price?: number;
  barcode?: string;
  is_default: boolean;
}

// واجهة بيانات لصورة المنتج الإضافية في قاعدة البيانات
export interface InsertProductImage {
  id?: string;
  product_id: string;
  image_url: string;
  sort_order?: number;
}

// واجهة بيانات للمرحلة السعرية بالجملة
export interface InsertWholesaleTier {
  product_id: string;
  min_quantity: number;
  price_per_unit: number;
  organization_id: string;
}

// واجهة المنتج كما هي في قاعدة البيانات مع الألوان والصور
export interface ProductWithVariants {
  id: string;
  name: string;
  name_for_shipping?: string;
  description: string;
  price: number;
  purchase_price?: number;
  compare_at_price?: number;
  wholesale_price?: number;
  partial_wholesale_price?: number;
  min_wholesale_quantity?: number;
  min_partial_wholesale_quantity?: number;
  allow_retail: boolean;
  allow_wholesale: boolean;
  allow_partial_wholesale: boolean;
  sku: string;
  barcode?: string;
  thumbnail_image: string;
  stock_quantity: number;
  is_featured: boolean;
  is_new: boolean;
  organization_id: string;
  category_id: string;
  category?: string;
  subcategory_id?: string;
  subcategory?: string | null;
  has_variants: boolean;
  show_price_on_landing: boolean;
  colors?: ProductColor[];
  additional_images?: string[];
  wholesale_tiers?: WholesaleTier[];
  brand?: string;
  images?: string[];
  is_digital?: boolean;
  created_at?: string;
  updated_at?: string;
  use_sizes?: boolean;
  // ميزات المنتج الإضافية
  has_fast_shipping?: boolean;
  has_money_back?: boolean;
  has_quality_guarantee?: boolean;
  fast_shipping_text?: string;
  money_back_text?: string;
  quality_guarantee_text?: string;
  is_sold_by_unit: boolean;
  unit_type?: string;
  use_variant_prices: boolean;
  unit_purchase_price?: number;
  unit_sale_price?: number;
  form_template_id?: string;
  shipping_provider_id?: number;
  use_shipping_clone?: boolean;
  shipping_clone_id?: number;
  created_by_user_id?: string;
  updated_by_user_id?: string;
  slug?: string;
  advancedSettings?: z.infer<typeof productAdvancedSettingsSchema>;
  marketingSettings?: z.infer<typeof productMarketingSettingsSchema>;
} 