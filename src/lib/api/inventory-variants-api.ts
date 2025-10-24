import {
  fetchProductInventoryDetails,
  updateVariantInventory as serviceUpdateVariantInventory,
  syncInventoryLevels as serviceSyncInventoryLevels,
  fetchInventoryLog,
  fetchInventoryQuickSummary,
  resolveCurrentOrganizationId,
  InventoryServiceError,
} from '@/services/InventoryService';

// أنواع البيانات للمتغيرات
export interface ProductVariant {
  type: 'simple' | 'color_only' | 'color_with_sizes';
  color_id?: string;
  color_name?: string;
  color_code?: string;
  color_image?: string;
  color_quantity?: number;
  color_price?: number;
  color_purchase_price?: number;

  // للمنتجات البسيطة
  quantity?: number;
  price?: number;
  purchase_price?: number;

  // للمقاسات
  sizes?: ProductSize[];
  sizes_count?: number;
  out_of_stock_sizes?: number;
  low_stock_sizes?: number;

  stock_status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'reorder-needed';
  barcode?: string;
}

export interface ProductSize {
  size_id: string;
  size_name: string;
  quantity: number;
  price?: number;
  purchase_price?: number;
  barcode?: string;
  is_default: boolean;
  stock_status: 'in-stock' | 'low-stock' | 'out-of-stock';
}

export interface ProductInventoryDetails {
  product_id: string;
  product_name: string;
  product_sku: string;
  product_barcode?: string;
  has_variants: boolean;
  use_sizes: boolean;
  total_stock_quantity: number;
  min_stock_level: number;
  reorder_level: number;
  reorder_quantity: number;
  last_inventory_update: string;
  stock_status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'reorder-needed';
  reorder_needed: boolean;
  variants_data: ProductVariant[];
  low_stock_variants: number;
  out_of_stock_variants: number;
  total_variants: number;
  total_stock_value: number;
  average_purchase_price: number;
}

export interface VariantUpdateRequest {
  product_id: string;
  variant_id?: string;
  size_id?: string;
  quantity_change: number;
  operation_type?: 'manual' | 'sale' | 'purchase' | 'adjustment' | 'return';
  notes?: string;
}

export interface VariantUpdateResponse {
  success: boolean;
  message: string;
  updated_quantity: number;
  previous_quantity: number;
  timestamp: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  synced_variants: number;
  updated_levels: number;
  timestamp: string;
}

export interface InventoryLogEntry {
  id: string;
  product_id: string;
  variant_id?: string | null;
  size_id?: string | null;
  quantity_change: number;
  previous_quantity: number | null;
  new_quantity: number | null;
  operation_type: string;
  notes?: string | null;
  updated_by?: string | null;
  updated_at: string;
}

async function ensureOrganizationId(): Promise<string> {
  return resolveCurrentOrganizationId();
}

/**
 * الحصول على تفاصيل مخزون المنتج الشاملة
 */
export async function getProductInventoryDetails(
  productId: string
): Promise<ProductInventoryDetails> {
  try {
    await ensureOrganizationId();
    const details = await fetchProductInventoryDetails(productId);

    const variants: ProductVariant[] = details.variants.map((variant) => {
      const sizes: ProductSize[] | undefined = variant.type === 'color_with_sizes'
        ? variant.sizes.map((size) => ({
            size_id: size.sizeId,
            size_name: size.sizeName,
            quantity: size.quantity,
            price: size.price,
            purchase_price: size.purchasePrice,
            barcode: size.barcode ?? undefined,
            is_default: false,
            stock_status: (size.stockStatus ?? 'in-stock') as ProductSize['stock_status'],
          }))
        : undefined;

      return {
        type: variant.type,
        color_id: variant.colorId ?? undefined,
        color_name: variant.colorName ?? undefined,
        color_code: variant.colorCode ?? undefined,
        color_quantity: variant.type === 'color_with_sizes' ? variant.quantity : undefined,
        color_price: variant.price,
        color_purchase_price: variant.purchasePrice,
        quantity: variant.type !== 'color_with_sizes' ? variant.quantity : undefined,
        price: variant.price,
        purchase_price: variant.purchasePrice,
        sizes,
        sizes_count: sizes?.length,
        out_of_stock_sizes: sizes?.filter((size) => size.stock_status === 'out-of-stock').length,
        low_stock_sizes: sizes?.filter((size) => size.stock_status === 'low-stock').length,
        stock_status: (variant.stockStatus ?? 'in-stock') as ProductVariant['stock_status'],
        barcode: variant.barcode ?? undefined,
      } as ProductVariant;
    });

    return {
      product_id: details.productId,
      product_name: details.productName,
      product_sku: details.productSku,
      product_barcode: details.productBarcode ?? undefined,
      has_variants: details.hasVariants,
      use_sizes: details.useSizes,
      total_stock_quantity: details.totalStockQuantity,
      min_stock_level: details.minStockLevel,
      reorder_level: details.reorderLevel,
      reorder_quantity: details.reorderQuantity,
      last_inventory_update: details.lastInventoryUpdate ?? new Date().toISOString(),
      stock_status: details.stockStatus as ProductInventoryDetails['stock_status'],
      reorder_needed: details.reorderNeeded,
      variants_data: variants,
      low_stock_variants: details.lowStockVariants,
      out_of_stock_variants: details.outOfStockVariants,
      total_variants: details.totalVariants,
      total_stock_value: details.totalStockValue,
      average_purchase_price: details.averagePurchasePrice,
    };
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      throw error;
    }
    throw new InventoryServiceError('خطأ في جلب تفاصيل مخزون المنتج', error);
  }
}

/**
 * تحديث مخزون المتغيرات
 */
export async function updateVariantInventory(
  request: VariantUpdateRequest
): Promise<VariantUpdateResponse> {
  try {
    const response = await serviceUpdateVariantInventory({
      productId: request.product_id,
      variantId: request.variant_id,
      newQuantity: request.quantity_change,
      operationType: request.operation_type,
      notes: request.notes,
    });

    return {
      success: response.success,
      message: response.message,
      updated_quantity: response.updated_quantity,
      previous_quantity: response.previous_quantity,
      timestamp: response.timestamp,
    };
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      throw error;
    }
    throw new InventoryServiceError('خطأ في تحديث مخزون المتغير', error);
  }
}

/**
 * مزامنة مستويات المخزون
 */
export async function syncInventoryLevels(
  productId: string
): Promise<SyncResponse> {
  try {
    const result = await serviceSyncInventoryLevels(productId);
    return {
      success: result.success,
      message: result.message,
      synced_variants: result.synced_variants,
      updated_levels: result.updated_levels,
      timestamp: result.timestamp,
    };
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      throw error;
    }
    throw new InventoryServiceError('خطأ في مزامنة مستويات المخزون', error);
  }
}

/**
 * الحصول على سجل مخزون المتغيرات
 */
export async function getInventoryVariantsLog(
  productId: string,
  limit: number = 50
): Promise<InventoryLogEntry[]> {
  try {
    await ensureOrganizationId();
    const log = await fetchInventoryLog(productId, limit);
    return log.map((entry) => ({
      id: entry.id,
      product_id: entry.product_id,
      variant_id: entry.variant_id ?? null,
      size_id: entry.size_id ?? null,
      quantity_change: entry.quantity_change,
      previous_quantity: entry.previous_quantity,
      new_quantity: entry.new_quantity,
      operation_type: entry.operation_type,
      notes: entry.notes ?? null,
      updated_by: entry.updated_by ?? null,
      updated_at: entry.updated_at,
    }));
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      throw error;
    }
    throw new InventoryServiceError('خطأ في جلب سجل المخزون', error);
  }
}

/**
 * الحصول على ملخص سريع لحالة المخزون
 */
export async function getInventoryQuickSummary(productId: string): Promise<{
  total_stock: number;
  variants_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  stock_status: string;
  last_update: string;
}> {
  try {
    await ensureOrganizationId();
    return await fetchInventoryQuickSummary(productId);
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      throw error;
    }
    throw new InventoryServiceError('خطأ في الحصول على الملخص السريع للمخزون', error);
  }
}

/**
 * تحديث مجمع للمتغيرات
 */
export async function bulkUpdateVariants(updates: Array<{
  product_id: string;
  variant_id?: string;
  quantity_change: number;
  notes?: string;
}>): Promise<{
  success_count: number;
  error_count: number;
  errors: Array<{ product_id: string; variant_id?: string; error: string }>;
}> {
  try {
    const results = await Promise.allSettled(
      updates.map((update) =>
        serviceUpdateVariantInventory({
          productId: update.product_id,
          variantId: update.variant_id,
          newQuantity: update.quantity_change,
          operationType: 'manual',
          notes: update.notes || 'تحديث مجمع',
        })
      )
    );

    const successCount = results.filter((result) => result.status === 'fulfilled').length;
    const errors = results
      .map((result, index) => {
        if (result.status === 'rejected') {
          const reason = result.reason as Error | undefined;
          return {
            product_id: updates[index].product_id,
            variant_id: updates[index].variant_id,
            error: reason?.message || 'خطأ غير معروف',
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{ product_id: string; variant_id?: string; error: string }>;

    return {
      success_count: successCount,
      error_count: errors.length,
      errors,
    };
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      throw error;
    }
    throw new InventoryServiceError('خطأ في التحديث المجمع للمتغيرات', error);
  }
}

// دوال مساعدة لمعالجة البيانات
export function getVariantDisplayName(variant: ProductVariant): string {
  switch (variant.type) {
    case 'simple':
      return 'منتج بسيط';
    case 'color_only':
      return variant.color_name || 'لون غير محدد';
    case 'color_with_sizes':
      return variant.color_name || 'لون غير محدد';
    default:
      return 'متغير غير محدد';
  }
}

export function getSizeDisplayName(size: ProductSize): string {
  return size.size_name;
}

export function getStockStatusColor(status: string): string {
  switch (status) {
    case 'in-stock':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'low-stock':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'out-of-stock':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'reorder-needed':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getStockStatusText(status: string): string {
  switch (status) {
    case 'in-stock':
      return 'متوفر';
    case 'low-stock':
      return 'منخفض';
    case 'out-of-stock':
      return 'نفذ';
    case 'reorder-needed':
      return 'يحتاج إعادة طلب';
    default:
      return 'غير محدد';
  }
}
