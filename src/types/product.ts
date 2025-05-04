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
  price: z.coerce.number().nonnegative({ message: "السعر يجب أن يكون 0 أو أكبر" }),
  product_id: z.string().optional(),
});

export type WholesaleTier = z.infer<typeof wholesaleTierSchema>;

// نموذج بيانات المنتج الموسع
export const productSchema = z.object({
  name: z.string().min(1, { message: "اسم المنتج مطلوب" }),
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

// واجهة بيانات للمرحلة السعرية للجملة
export interface InsertWholesaleTier {
  product_id: string;
  min_quantity: number;
  price: number;
  organization_id: string;
}

// واجهة المنتج كما هي في قاعدة البيانات مع الألوان والصور
export interface ProductWithVariants {
  id: string;
  name: string;
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
} 