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
  size_id?: string; // للمقاسات
  quantity_change: number; // التغيير في الكمية (موجب أو سالب)
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
  variant_id?: string;
  size_id?: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  operation_type: string;
  notes?: string;
  updated_by: string;
  updated_at: string;
}

// الحصول على معرف المؤسسة الحالية
async function getCurrentUserOrganizationId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // محاولة أولى: استخدام auth_user_id
    let userProfile = null;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('organization_id')
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .single();
      
      if (!error && data) {
        userProfile = data;
      }
    } catch (firstError) {
    }

    // محاولة ثانية: استخدام id مباشرة إذا كان auth_user_id هو نفسه id
    if (!userProfile) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .eq('is_active', true)
          .single();
        
        if (!error && data) {
          userProfile = data;
        }
      } catch (secondError) {
      }
    }

    if (!userProfile) {
      return null;
    }

    return userProfile.organization_id;
  } catch (error) {
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

    const { data, error } = await supabase.rpc('get_product_inventory_details' as any, {
      p_organization_id: organizationId,
      p_product_id: productId
    });

    if (error) {
      throw new Error(`خطأ في جلب تفاصيل مخزون المنتج: ${error.message}`);
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error('المنتج غير موجود أو لا تملك صلاحية الوصول إليه');
    }

    const details = Array.isArray(data) ? data[0] : data;
    
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

    const { data, error } = await supabase.rpc('update_variant_inventory' as any, {
      p_organization_id: organizationId,
      p_product_id: request.product_id,
      p_variant_id: request.variant_id || null,
      p_new_quantity: request.quantity_change,
      p_operation_type: request.operation_type || 'manual',
      p_notes: request.notes || '',
      p_updated_by: user.id
    });

    if (error) {
      throw new Error(`خطأ في تحديث مخزون المتغير: ${error.message}`);
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error('فشل في تحديث المخزون');
    }

    const result = Array.isArray(data) ? data[0] : data;
    
    return {
      success: true,
      message: 'تم تحديث المخزون بنجاح',
      updated_quantity: result.updated_quantity,
      previous_quantity: result.previous_quantity,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw error;
  }
}

/**
 * مزامنة مستويات المخزون
 */
export async function syncInventoryLevels(
  productId: string
): Promise<SyncResponse> {
  try {
    const organizationId = await getCurrentUserOrganizationId();
    if (!organizationId) {
      throw new Error('لم يتم العثور على معرف المؤسسة');
    }

    const { data, error } = await supabase.rpc('sync_inventory_levels' as any, {
      p_organization_id: organizationId,
      p_product_id: productId
    });

    if (error) {
      throw new Error(`خطأ في مزامنة مستويات المخزون: ${error.message}`);
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error('فشل في مزامنة مستويات المخزون');
    }

    const result = Array.isArray(data) ? data[0] : data;
    
    return {
      success: true,
      message: 'تمت مزامنة مستويات المخزون بنجاح',
      synced_variants: result.synced_variants || 0,
      updated_levels: result.updated_levels || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw error;
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
    const organizationId = await getCurrentUserOrganizationId();
    if (!organizationId) {
      throw new Error('لم يتم العثور على معرف المؤسسة');
    }

    const { data, error } = await supabase.rpc('get_inventory_variants_log' as any, {
      p_organization_id: organizationId,
      p_product_id: productId,
      p_limit: limit
    });

    if (error) {
      throw new Error(`خطأ في جلب سجل المخزون: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    const logData = Array.isArray(data) ? data : [data];
    
    return logData.map((entry: any) => ({
      id: entry.id,
      product_id: entry.product_id,
      variant_id: entry.variant_id,
      size_id: entry.size_id,
      quantity_change: entry.quantity_change,
      previous_quantity: entry.previous_quantity,
      new_quantity: entry.new_quantity,
      operation_type: entry.operation_type,
      notes: entry.notes,
      updated_by: entry.updated_by,
      updated_at: entry.updated_at
    }));
  } catch (error) {
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
    throw error;
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
      updates.map(update => updateVariantInventory({
        product_id: update.product_id,
        variant_id: update.variant_id,
        quantity_change: update.quantity_change,
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
