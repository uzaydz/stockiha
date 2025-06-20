import { supabase } from '@/lib/supabase';

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
  // معلومات المنتج الأساسية
  product_id: string;
  product_name: string;
  product_sku: string;
  product_barcode?: string;
  has_variants: boolean;
  use_sizes: boolean;
  
  // مخزون المنتج الأساسي
  total_stock_quantity: number;
  min_stock_level: number;
  reorder_level: number;
  reorder_quantity: number;
  last_inventory_update: string;
  
  // حالة المخزون
  stock_status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'reorder-needed';
  reorder_needed: boolean;
  
  // تفاصيل الألوان والمقاسات
  variants_data: ProductVariant[];
  
  // إحصائيات الأداء
  low_stock_variants: number;
  out_of_stock_variants: number;
  total_variants: number;
  
  // معلومات مالية
  total_stock_value: number;
  average_purchase_price: number;
}

export interface VariantUpdateRequest {
  product_id: string;
  variant_id?: string; // null للمنتجات البسيطة
  new_quantity: number;
  operation_type?: 'manual' | 'sale' | 'purchase' | 'adjustment' | 'return';
  notes?: string;
}

export interface VariantUpdateResponse {
  success: boolean;
  message: string;
  old_quantity: number;
  new_quantity: number;
  affected_levels: {
    product_level?: {
      old_quantity: number;
      new_quantity: number;
    };
    color_level?: {
      color_id: string;
      old_quantity: number;
      new_quantity: number;
    };
    size_level?: {
      size_id: string;
      old_quantity: number;
      new_quantity: number;
    };
  };
}

export interface InventoryLogEntry {
  log_id: string;
  product_id: string;
  product_name: string;
  variant_type: 'simple' | 'color' | 'size';
  variant_id?: string;
  variant_name: string;
  operation_type: string;
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  notes?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  reference_info: {
    variant_type: string;
    color_info?: {
      color_name: string;
      color_code: string;
      color_image?: string;
    };
    size_info?: {
      size_name: string;
      size_barcode?: string;
    };
  };
}

// الحصول على معرف المؤسسة الحالية
async function getCurrentUserOrganizationId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    return userProfile?.organization_id || null;
  } catch (error) {
    console.error('Error getting user organization:', error);
    return null;
  }
}

/**
 * الحصول على تفاصيل مخزون المنتج الشاملة
 */
export async function getProductInventoryDetails(
  productId: string
): Promise<ProductInventoryDetails> {
  try {
    const organizationId = await getCurrentUserOrganizationId();
    if (!organizationId) {
      throw new Error('لم يتم العثور على معرف المؤسسة');
    }

    const { data, error } = await supabase.rpc('get_product_inventory_details', {
      p_organization_id: organizationId,
      p_product_id: productId
    });

    if (error) {
      console.error('Error fetching product inventory details:', error);
      throw new Error(`خطأ في جلب تفاصيل مخزون المنتج: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('المنتج غير موجود أو لا تملك صلاحية الوصول إليه');
    }

    const details = data[0];
    
    return {
      product_id: details.product_id,
      product_name: details.product_name,
      product_sku: details.product_sku,
      product_barcode: details.product_barcode,
      has_variants: details.has_variants,
      use_sizes: details.use_sizes,
      
      total_stock_quantity: details.total_stock_quantity,
      min_stock_level: details.min_stock_level,
      reorder_level: details.reorder_level,
      reorder_quantity: details.reorder_quantity,
      last_inventory_update: details.last_inventory_update,
      
      stock_status: details.stock_status,
      reorder_needed: details.reorder_needed,
      
      variants_data: details.variants_data || [],
      
      low_stock_variants: details.low_stock_variants,
      out_of_stock_variants: details.out_of_stock_variants,
      total_variants: details.total_variants,
      
      total_stock_value: parseFloat(details.total_stock_value || '0'),
      average_purchase_price: parseFloat(details.average_purchase_price || '0')
    };
  } catch (error) {
    console.error('Error in getProductInventoryDetails:', error);
    throw error;
  }
}

/**
 * تحديث مخزون المتغيرات
 */
export async function updateVariantInventory(
  request: VariantUpdateRequest
): Promise<VariantUpdateResponse> {
  try {
    const organizationId = await getCurrentUserOrganizationId();
    if (!organizationId) {
      throw new Error('لم يتم العثور على معرف المؤسسة');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('المستخدم غير مسجل الدخول');
    }

    const { data, error } = await supabase.rpc('update_variant_inventory', {
      p_organization_id: organizationId,
      p_product_id: request.product_id,
      p_variant_id: request.variant_id || null,
      p_new_quantity: request.new_quantity,
      p_operation_type: request.operation_type || 'manual',
      p_notes: request.notes || null,
      p_updated_by: user.id
    });

    if (error) {
      console.error('Error updating variant inventory:', error);
      throw new Error(`خطأ في تحديث المخزون: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('فشل في تحديث المخزون');
    }

    const result = data[0];
    
    if (!result.success) {
      throw new Error(result.message || 'فشل في تحديث المخزون');
    }

    return {
      success: result.success,
      message: result.message,
      old_quantity: result.old_quantity,
      new_quantity: result.new_quantity,
      affected_levels: result.affected_levels || {}
    };
  } catch (error) {
    console.error('Error in updateVariantInventory:', error);
    throw error;
  }
}

/**
 * مزامنة مستويات المخزون
 */
export async function syncInventoryLevels(productId: string): Promise<{
  success: boolean;
  message: string;
  sync_report: any;
}> {
  try {
    const organizationId = await getCurrentUserOrganizationId();
    if (!organizationId) {
      throw new Error('لم يتم العثور على معرف المؤسسة');
    }

    const { data, error } = await supabase.rpc('sync_inventory_levels', {
      p_organization_id: organizationId,
      p_product_id: productId
    });

    if (error) {
      console.error('Error syncing inventory levels:', error);
      throw new Error(`خطأ في مزامنة المخزون: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('فشل في مزامنة المخزون');
    }

    return data[0];
  } catch (error) {
    console.error('Error in syncInventoryLevels:', error);
    throw error;
  }
}

/**
 * الحصول على سجل المخزون للمتغيرات
 */
export async function getInventoryVariantsLog(
  productId?: string,
  variantId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<InventoryLogEntry[]> {
  try {
    const organizationId = await getCurrentUserOrganizationId();
    if (!organizationId) {
      throw new Error('لم يتم العثور على معرف المؤسسة');
    }

    const { data, error } = await supabase.rpc('get_inventory_variants_log', {
      p_organization_id: organizationId,
      p_product_id: productId || null,
      p_variant_id: variantId || null,
      p_limit: limit,
      p_offset: offset
    });

    if (error) {
      console.error('Error fetching inventory log:', error);
      throw new Error(`خطأ في جلب سجل المخزون: ${error.message}`);
    }

    return (data || []).map((entry: any) => ({
      log_id: entry.log_id,
      product_id: entry.product_id,
      product_name: entry.product_name,
      variant_type: entry.variant_type,
      variant_id: entry.variant_id,
      variant_name: entry.variant_name,
      operation_type: entry.operation_type,
      quantity_change: entry.quantity_change,
      previous_stock: entry.previous_stock,
      new_stock: entry.new_stock,
      notes: entry.notes,
      created_by: entry.created_by,
      created_by_name: entry.created_by_name,
      created_at: entry.created_at,
      reference_info: entry.reference_info || {}
    }));
  } catch (error) {
    console.error('Error in getInventoryVariantsLog:', error);
    throw error;
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
    const details = await getProductInventoryDetails(productId);
    
    return {
      total_stock: details.total_stock_quantity,
      variants_count: details.total_variants,
      low_stock_count: details.low_stock_variants,
      out_of_stock_count: details.out_of_stock_variants,
      stock_status: details.stock_status,
      last_update: details.last_inventory_update
    };
  } catch (error) {
    console.error('Error in getInventoryQuickSummary:', error);
    throw error;
  }
}

/**
 * تحديث مجمع للمتغيرات
 */
export async function bulkUpdateVariants(updates: Array<{
  product_id: string;
  variant_id?: string;
  new_quantity: number;
  notes?: string;
}>): Promise<{
  success_count: number;
  error_count: number;
  errors: Array<{ product_id: string; variant_id?: string; error: string }>;
}> {
  try {
    const results = await Promise.allSettled(
      updates.map(update => updateVariantInventory({
        product_id: update.product_id,
        variant_id: update.variant_id,
        new_quantity: update.new_quantity,
        operation_type: 'manual',
        notes: update.notes || 'تحديث مجمع'
      }))
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const errorCount = results.filter(r => r.status === 'rejected').length;
    
    const errors = results
      .map((result, index) => {
        if (result.status === 'rejected') {
          return {
            product_id: updates[index].product_id,
            variant_id: updates[index].variant_id,
            error: result.reason?.message || 'خطأ غير معروف'
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{ product_id: string; variant_id?: string; error: string }>;

    return {
      success_count: successCount,
      error_count: errorCount,
      errors
    };
  } catch (error) {
    console.error('Error in bulkUpdateVariants:', error);
    throw error;
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