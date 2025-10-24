import { supabase } from '@/lib/supabase';
import { z } from 'zod';

/**
 * Shared error used by the inventory service.
 */
export class InventoryServiceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'InventoryServiceError';
  }
}

function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

const numericField = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => coerceNumber(value));

const inventoryProductSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().default(''),
    price: z.union([z.number(), z.string()]).default(0),
    compare_at_price: z.union([z.number(), z.string(), z.null()]).optional(),
    sku: z.string().nullable().optional(),
    barcode: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    subcategory: z.string().nullable().optional(),
    brand: z.string().nullable().optional(),
    images: z.array(z.string()).nullable().optional().transform((v) => v ?? []),
    thumbnail_image: z.string().nullable().optional(),
    stock_quantity: z.number().nullable().optional(),
    min_stock_level: z.number().nullable().optional(),
    reorder_level: z.number().nullable().optional(),
    reorder_quantity: z.number().nullable().optional(),
    is_digital: z.boolean().nullable().optional(),
    is_new: z.boolean().nullable().optional(),
    is_featured: z.boolean().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    has_variants: z.boolean().nullable().optional(),
    use_sizes: z.boolean().nullable().optional(),
    stock_status: z.string().nullable().optional(),
    stock_value: z.union([z.number(), z.string(), z.null()]).optional(),
    reorder_needed: z.boolean().nullable().optional(),
    days_since_last_update: z.number().nullable().optional(),
    variant_count: z.number().nullable().optional(),
    total_variant_stock: z.number().nullable().optional(),
    total_count: z.number().nullable().optional(),
    filtered_count: z.number().nullable().optional(),
  })
  .passthrough();

const inventoryStatsSchema = z
  .object({
    total_products: z.number().default(0),
    active_products: z.number().default(0),
    inactive_products: z.number().default(0),
    in_stock_products: z.number().default(0),
    low_stock_products: z.number().default(0),
    out_of_stock_products: z.number().default(0),
    reorder_needed_products: z.number().default(0),
    total_stock_quantity: z.union([z.number(), z.string()]).default(0),
    total_stock_value: z.union([z.number(), z.string()]).default(0),
    average_stock_per_product: z.union([z.number(), z.string()]).default(0),
    digital_products: z.number().default(0),
    physical_products: z.number().default(0),
    products_with_variants: z.number().default(0),
    products_without_variants: z.number().default(0),
    categories_count: z.number().default(0),
    brands_count: z.number().default(0),
    last_week_additions: z.number().default(0),
    last_month_additions: z.number().default(0),
    top_stock_value_category: z.string().nullable().default(''),
    lowest_stock_category: z.string().nullable().default(''),
  })
  .passthrough();

const inventoryVariantSizeSchema = z
  .object({
    size_id: z.string().nullable().optional(),
    size_name: z.string().nullable().optional(),
    quantity: numericField.optional().default(0),
    price: numericField.optional(),
    purchase_price: numericField.optional(),
    barcode: z.string().nullable().optional(),
    stock_status: z.string().nullable().optional(),
  })
  .passthrough();

const inventoryVariantSchema = z
  .object({
    variant_id: z.string().nullable().optional(),
    color_id: z.string().nullable().optional(),
    color_name: z.string().nullable().optional(),
    color_code: z.string().nullable().optional(),
    barcode: z.string().nullable().optional(),
    quantity: numericField.optional().default(0),
    color_quantity: numericField.optional().default(0),
    purchase_price: numericField.optional(),
    price: numericField.optional(),
    type: z
      .union([z.literal('simple'), z.literal('color_only'), z.literal('color_with_sizes')])
      .optional()
      .default('simple'),
    stock_status: z.string().nullable().optional(),
    sizes: z.array(inventoryVariantSizeSchema).optional().default([]),
  })
  .passthrough();

const productInventoryDetailsSchema = z
  .object({
    product_id: z.string(),
    product_name: z.string(),
    product_sku: z.string(),
    product_barcode: z.string().nullable().optional(),
    has_variants: z.boolean().optional().default(false),
    use_sizes: z.boolean().optional().default(false),
    total_stock_quantity: numericField.optional().default(0),
    min_stock_level: numericField.optional().default(0),
    reorder_level: numericField.optional().default(0),
    reorder_quantity: numericField.optional().default(0),
    last_inventory_update: z.string().nullable().optional(),
    stock_status: z.string().nullable().optional(),
    reorder_needed: z.boolean().optional().default(false),
    total_stock_value: numericField.optional().default(0),
    average_purchase_price: numericField.optional().default(0),
    low_stock_variants: z.number().optional().default(0),
    out_of_stock_variants: z.number().optional().default(0),
    total_variants: z.number().optional().default(0),
    variants_data: z.array(inventoryVariantSchema).optional().default([]),
  })
  .passthrough();

const inventoryLogEntrySchema = z
  .object({
    id: z.string(),
    product_id: z.string(),
    variant_id: z.string().nullable(),
    size_id: z.string().nullable(),
    quantity_change: z.number(),
    previous_quantity: z.number().nullable(),
    new_quantity: z.number().nullable(),
    operation_type: z.string(),
    notes: z.string().nullable(),
    updated_by: z.string().nullable(),
    updated_at: z.string(),
  })
  .passthrough();

export type RpcInventoryProduct = z.infer<typeof inventoryProductSchema>;

export interface InventoryProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sku?: string;
  barcode?: string | null;
  category?: string | null;
  subcategory?: string | null;
  brand?: string | null;
  images: string[];
  thumbnailImage?: string;
  stockQuantity: number;
  minStockLevel: number;
  reorderLevel: number;
  reorderQuantity: number;
  isDigital: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  hasVariants: boolean;
  useSizes: boolean;
  stockStatus: string;
  stockValue: number;
  reorderNeeded: boolean;
  daysSinceLastUpdate: number;
  variantCount: number;
  totalVariantStock: number;
}

export interface InventoryListResult {
  products: InventoryProduct[];
  totalCount: number;
  filteredCount: number;
}

export type InventoryStats = z.infer<typeof inventoryStatsSchema>;

export interface InventoryVariantSize {
  id: string;
  sizeId: string;
  sizeName: string;
  quantity: number;
  price?: number;
  purchasePrice?: number;
  barcode?: string | null;
  stockStatus: string;
}

export interface InventoryVariant {
  id: string;
  variantId: string | null;
  colorId?: string | null;
  colorName?: string | null;
  colorCode?: string | null;
  barcode?: string | null;
  type: 'simple' | 'color_only' | 'color_with_sizes';
  quantity: number;
  stockStatus: string;
  price?: number;
  purchasePrice?: number;
  sizes: InventoryVariantSize[];
}

export interface ProductInventoryDetails {
  productId: string;
  productName: string;
  productSku: string;
  productBarcode?: string | null;
  hasVariants: boolean;
  useSizes: boolean;
  totalStockQuantity: number;
  minStockLevel: number;
  reorderLevel: number;
  reorderQuantity: number;
  lastInventoryUpdate: string | null;
  stockStatus: string;
  reorderNeeded: boolean;
  totalStockValue: number;
  averagePurchasePrice: number;
  lowStockVariants: number;
  outOfStockVariants: number;
  totalVariants: number;
  variants: InventoryVariant[];
}

export interface InventoryFilters {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  categoryId?: string;
  stockFilter?: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'reorder-needed';
  sortBy?: 'name' | 'stock' | 'price' | 'created' | 'updated' | 'last_inventory_update' | 'reorder_priority';
  sortOrder?: 'ASC' | 'DESC';
  includeVariants?: boolean;
  includeInactive?: boolean;
}

export interface BulkInventoryUpdate {
  product_id: string;
  new_quantity: number;
  reason?: string;
  notes?: string;
}

export interface BulkInventoryUpdateResult {
  success: boolean;
  updated_count: number;
  failed_updates: Array<{ product_id: string; error: string }>;
  message: string;
}

const DEFAULT_PAGE_SIZE = 50;

async function requireOrganizationId(): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    throw new InventoryServiceError('فشل في التحقق من المستخدم', authError);
  }

  const user = authData?.user;
  if (!user) {
    throw new InventoryServiceError('المستخدم غير مسجل الدخول');
  }

  const { data, error } = await supabase
    .from('users')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new InventoryServiceError('تعذر جلب معرف المؤسسة', error);
  }

  if (data?.organization_id) {
    return data.organization_id;
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();

  if (fallbackError) {
    throw new InventoryServiceError('تعذر جلب معرف المؤسسة الاحتياطي', fallbackError);
  }

  if (!fallback?.organization_id) {
    throw new InventoryServiceError('لم يتم العثور على معرف المؤسسة للمستخدم الحالي');
  }

  return fallback.organization_id;
}

export async function resolveCurrentOrganizationId(): Promise<string> {
  return requireOrganizationId();
}

function mapInventoryProduct(record: RpcInventoryProduct): InventoryProduct {
  const parsed = inventoryProductSchema.parse(record);

  return {
    id: parsed.id,
    name: parsed.name,
    description: parsed.description ?? '',
    price: coerceNumber(parsed.price),
    compareAtPrice: parsed.compare_at_price != null ? coerceNumber(parsed.compare_at_price) : undefined,
    sku: parsed.sku ?? undefined,
    barcode: parsed.barcode ?? null,
    category: parsed.category ?? null,
    subcategory: parsed.subcategory ?? null,
    brand: parsed.brand ?? null,
    images: parsed.images ?? [],
    thumbnailImage: parsed.thumbnail_image ?? undefined,
    stockQuantity: parsed.stock_quantity ?? 0,
    minStockLevel: parsed.min_stock_level ?? 0,
    reorderLevel: parsed.reorder_level ?? 0,
    reorderQuantity: parsed.reorder_quantity ?? 0,
    isDigital: Boolean(parsed.is_digital),
    isNew: parsed.is_new ?? undefined,
    isFeatured: parsed.is_featured ?? undefined,
    createdAt: parsed.created_at ? new Date(parsed.created_at) : null,
    updatedAt: parsed.updated_at ? new Date(parsed.updated_at) : null,
    hasVariants: Boolean(parsed.has_variants),
    useSizes: Boolean(parsed.use_sizes),
    stockStatus: parsed.stock_status ?? 'unknown',
    stockValue: coerceNumber(parsed.stock_value),
    reorderNeeded: Boolean(parsed.reorder_needed),
    daysSinceLastUpdate: parsed.days_since_last_update ?? 0,
    variantCount: parsed.variant_count ?? 0,
    totalVariantStock: parsed.total_variant_stock ?? 0,
  };
}

export async function fetchInventoryProducts(filters: InventoryFilters = {}): Promise<InventoryListResult> {
  const organizationId = await requireOrganizationId();

  const {
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    searchQuery,
    categoryId,
    stockFilter = 'all',
    sortBy = 'name',
    sortOrder = 'ASC',
    includeVariants = true,
    includeInactive = false,
  } = filters;

  const { data, error } = await supabase.rpc('get_inventory_products_paginated' as never, {
    p_organization_id: organizationId,
    p_page: page,
    p_page_size: pageSize,
    p_search_query: searchQuery || null,
    p_category_id: categoryId || null,
    p_stock_filter: stockFilter,
    p_sort_by: sortBy,
    p_sort_order: sortOrder,
    p_include_variants: includeVariants,
    p_include_inactive: includeInactive,
  });

  if (error) {
    throw new InventoryServiceError('خطأ في جلب بيانات المخزون', error);
  }

  const rows = Array.isArray(data) ? data : [];
  const products = rows.map(mapInventoryProduct);

  const firstRow = rows[0] ?? {};
  const totalCount = coerceNumber((firstRow as Record<string, unknown>).total_count, products.length);
  const filteredCount = coerceNumber((firstRow as Record<string, unknown>).filtered_count, products.length);

  return {
    products,
    totalCount,
    filteredCount,
  };
}

export async function fetchInventoryStats(): Promise<InventoryStats> {
  const organizationId = await requireOrganizationId();
  const { data, error } = await supabase.rpc('get_inventory_advanced_stats' as never, {
    p_organization_id: organizationId,
  });

  if (error) {
    throw new InventoryServiceError('خطأ في جلب إحصائيات المخزون', error);
  }

  const statsRow = Array.isArray(data) && data.length > 0 ? data[0] : {};
  return inventoryStatsSchema.parse(statsRow);
}

export async function searchInventoryProducts(query: string, limit = 20) {
  if (!query.trim()) {
    return [] as Array<{ id: string; name: string; sku: string; barcode: string | null; thumbnail_image: string | null; stock_quantity: number; stock_status: string; category: string | null }>;
  }

  const organizationId = await requireOrganizationId();
  const { data, error } = await supabase.rpc('search_inventory_autocomplete' as never, {
    p_organization_id: organizationId,
    p_search_query: query.trim(),
    p_limit: limit,
  });

  if (error) {
    throw new InventoryServiceError('خطأ في البحث داخل المخزون', error);
  }

  return (Array.isArray(data) ? data : []).map((entry) => ({
    id: entry.id as string,
    name: entry.name as string,
    sku: entry.sku as string,
    barcode: (entry.barcode as string) ?? null,
    thumbnail_image: (entry.thumbnail_image as string) ?? null,
    stock_quantity: coerceNumber(entry.stock_quantity),
    stock_status: (entry.stock_status as string) ?? 'unknown',
    category: (entry.category as string) ?? null,
  }));
}

export async function fetchProductInventoryDetails(productId: string): Promise<ProductInventoryDetails> {
  const organizationId = await requireOrganizationId();
  const { data, error } = await supabase.rpc('get_product_inventory_details' as never, {
    p_organization_id: organizationId,
    p_product_id: productId,
  });

  if (error) {
    throw new InventoryServiceError('خطأ في جلب تفاصيل مخزون المنتج', error);
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new InventoryServiceError('المنتج غير موجود أو لا تملك صلاحية الوصول إليه');
  }

  const raw = Array.isArray(data) ? data[0] : data;
  const parsed = productInventoryDetailsSchema.parse(raw);

  const variants: InventoryVariant[] = (parsed.variants_data ?? []).map((variant, index) => {
    const baseIdentifier = variant.variant_id ?? variant.color_id ?? `${parsed.product_id}-variant-${index}`;
    const resolvedQuantity = variant.type === 'color_with_sizes'
      ? coerceNumber(variant.color_quantity)
      : coerceNumber(variant.quantity);

    const sizes: InventoryVariantSize[] = (variant.sizes ?? []).map((size, sizeIndex) => {
      const sizeId = size.size_id ?? `${baseIdentifier}-size-${sizeIndex}`;
      return {
        id: sizeId,
        sizeId,
        sizeName: size.size_name ?? 'غير محدد',
        quantity: coerceNumber(size.quantity),
        price: size.price != null ? coerceNumber(size.price) : undefined,
        purchasePrice: size.purchase_price != null ? coerceNumber(size.purchase_price) : undefined,
        barcode: size.barcode ?? null,
        stockStatus: size.stock_status ?? 'unknown',
      };
    });

    return {
      id: baseIdentifier,
      variantId: variant.variant_id ?? variant.color_id ?? null,
      colorId: variant.color_id ?? null,
      colorName: variant.color_name ?? null,
      colorCode: variant.color_code ?? null,
      barcode: variant.barcode ?? null,
      type: (variant.type ?? 'simple') as InventoryVariant['type'],
      quantity: resolvedQuantity,
      stockStatus: variant.stock_status ?? 'unknown',
      price: variant.price != null ? coerceNumber(variant.price) : undefined,
      purchasePrice: variant.purchase_price != null ? coerceNumber(variant.purchase_price) : undefined,
      sizes,
    };
  });

  return {
    productId: parsed.product_id,
    productName: parsed.product_name,
    productSku: parsed.product_sku,
    productBarcode: parsed.product_barcode ?? null,
    hasVariants: Boolean(parsed.has_variants),
    useSizes: Boolean(parsed.use_sizes),
    totalStockQuantity: coerceNumber(parsed.total_stock_quantity),
    minStockLevel: coerceNumber(parsed.min_stock_level),
    reorderLevel: coerceNumber(parsed.reorder_level),
    reorderQuantity: coerceNumber(parsed.reorder_quantity),
    lastInventoryUpdate: parsed.last_inventory_update ?? null,
    stockStatus: parsed.stock_status ?? 'unknown',
    reorderNeeded: Boolean(parsed.reorder_needed),
    totalStockValue: coerceNumber(parsed.total_stock_value),
    averagePurchasePrice: coerceNumber(parsed.average_purchase_price),
    lowStockVariants: parsed.low_stock_variants ?? 0,
    outOfStockVariants: parsed.out_of_stock_variants ?? 0,
    totalVariants: parsed.total_variants || variants.length,
    variants,
  };
}

export async function fetchInventoryLog(productId: string, limit = 50) {
  const organizationId = await requireOrganizationId();
  const { data, error } = await supabase.rpc('get_inventory_variants_log' as never, {
    p_organization_id: organizationId,
    p_product_id: productId,
    p_limit: limit,
  });

  if (error) {
    throw new InventoryServiceError('خطأ في جلب سجل المخزون', error);
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => inventoryLogEntrySchema.parse(row));
}

export async function updateVariantInventory(params: {
  productId: string;
  variantId?: string | null;
  newQuantity: number;
  operationType?: string;
  notes?: string;
}) {
  const organizationId = await requireOrganizationId();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;

  if (!userId) {
    throw new InventoryServiceError('المستخدم غير مسجل الدخول');
  }

  const { data, error } = await supabase.rpc('update_variant_inventory' as never, {
    p_organization_id: organizationId,
    p_product_id: params.productId,
    p_variant_id: params.variantId ?? null,
    p_new_quantity: params.newQuantity,
    p_operation_type: params.operationType ?? 'manual',
    p_notes: params.notes ?? '',
    p_updated_by: userId,
  });

  if (error) {
    throw new InventoryServiceError('خطأ في تحديث مخزون المتغير', error);
  }

  const payload = Array.isArray(data) ? data[0] : data;
  if (!payload) {
    throw new InventoryServiceError('فشل في تحديث المخزون');
  }

  return {
    success: true,
    updated_quantity: coerceNumber((payload as Record<string, unknown>).updated_quantity),
    previous_quantity: coerceNumber((payload as Record<string, unknown>).previous_quantity),
    message: 'تم تحديث المخزون بنجاح',
    timestamp: new Date().toISOString(),
  };
}

export async function bulkUpdateInventory(updates: BulkInventoryUpdate[]): Promise<BulkInventoryUpdateResult> {
  const organizationId = await requireOrganizationId();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;

  if (!userId) {
    throw new InventoryServiceError('المستخدم غير مسجل الدخول');
  }

  const payload = updates.map((update) => ({
    product_id: update.product_id,
    new_quantity: update.new_quantity,
    reason: update.reason ?? 'manual',
    notes: update.notes ?? '',
  }));

  const { data, error } = await supabase.rpc('bulk_update_inventory' as never, {
    p_organization_id: organizationId,
    p_updates: payload,
    p_updated_by: userId,
  });

  if (error) {
    throw new InventoryServiceError('خطأ في التحديث المجمع للمخزون', error);
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    throw new InventoryServiceError('لم يتم استلام نتيجة من التحديث المجمع');
  }

  return {
    success: Boolean((result as Record<string, unknown>).success ?? true),
    updated_count: coerceNumber((result as Record<string, unknown>).updated_count),
    failed_updates: ((result as Record<string, unknown>).failed_updates as Array<{ product_id: string; error: string }> | undefined) ?? [],
    message: ((result as Record<string, unknown>).message as string) ?? 'تم التحديث',
  };
}

export async function syncInventoryLevels(productId: string) {
  const organizationId = await requireOrganizationId();
  const { data, error } = await supabase.rpc('sync_inventory_levels' as never, {
    p_organization_id: organizationId,
    p_product_id: productId,
  });

  if (error) {
    throw new InventoryServiceError('خطأ في مزامنة مستويات المخزون', error);
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    throw new InventoryServiceError('لم يتم استلام نتيجة من عملية المزامنة');
  }

  return {
    success: Boolean((result as Record<string, unknown>).success ?? true),
    synced_variants: coerceNumber((result as Record<string, unknown>).synced_variants),
    updated_levels: coerceNumber((result as Record<string, unknown>).updated_levels),
    message: ((result as Record<string, unknown>).message as string) ?? 'تمت مزامنة مستويات المخزون بنجاح',
    timestamp: new Date().toISOString(),
  };
}

export async function fetchInventoryQuickSummary(productId: string) {
  const details = await fetchProductInventoryDetails(productId);
  return {
    total_stock: details.totalStockQuantity,
    variants_count: details.totalVariants,
    low_stock_count: details.lowStockVariants,
    out_of_stock_count: details.outOfStockVariants,
    stock_status: details.stockStatus,
    last_update: details.lastInventoryUpdate ?? new Date().toISOString(),
  };
}
