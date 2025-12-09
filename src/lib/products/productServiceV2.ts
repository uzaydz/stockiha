/**
 * 🚀 Product Service V2
 *
 * خدمة المنتجات المحسّنة مع دعم جميع أنواع البيع
 */

import { supabase } from '@/lib/supabase';
import type {
  UpsertProductV2Params,
  UpsertProductV2Result,
  GetProductV2Params,
  GetProductV2Result,
  CalculatePriceParams,
  CalculatePriceResult,
  ProductScope,
} from './types';

// =====================================================
// الدوال الرئيسية
// =====================================================

/**
 * إنشاء أو تحديث منتج
 */
export async function upsertProductV2(
  params: UpsertProductV2Params
): Promise<UpsertProductV2Result> {
  try {
    const { data, error } = await supabase.rpc('upsert_product_v2', {
      p_product_id: params.product_id || null,
      p_basic_data: params.basic_data || {},
      p_pricing_data: params.pricing_data || {},
      p_inventory_data: params.inventory_data || {},
      p_weight_selling: params.weight_selling || null,
      p_box_selling: params.box_selling || null,
      p_meter_selling: params.meter_selling || null,
      p_expiry_tracking: params.expiry_tracking || null,
      p_serial_tracking: params.serial_tracking || null,
      p_warranty: params.warranty || null,
      p_batch_tracking: params.batch_tracking || null,
      p_variants: params.variants || null,
      p_initial_batches: params.initial_batches || null,
      p_initial_serials: params.initial_serials || null,
      p_price_tiers: params.price_tiers || null,
      p_images: params.images || null,
      p_business_specific: params.business_specific || null,
      p_advanced_settings: params.advanced_settings || null,
      p_marketing_settings: params.marketing_settings || null,
      p_special_offers: params.special_offers || null,
      p_advanced_description: params.advanced_description || null,
      p_publication: params.publication || null,
      p_user_id: params.user_id || null,
    });

    if (error) {
      console.error('[ProductServiceV2] upsertProductV2 error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return data as UpsertProductV2Result;
  } catch (err) {
    console.error('[ProductServiceV2] upsertProductV2 exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * جلب بيانات منتج
 */
export async function getProductV2(
  params: GetProductV2Params
): Promise<GetProductV2Result> {
  try {
    const { data, error } = await supabase.rpc('get_product_v2', {
      p_product_identifier: params.product_identifier,
      p_organization_id: params.organization_id || null,
      p_scope: params.scope || 'full',
      p_include_inactive: params.include_inactive || false,
    });

    if (error) {
      console.error('[ProductServiceV2] getProductV2 error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return data as GetProductV2Result;
  } catch (err) {
    console.error('[ProductServiceV2] getProductV2 exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * حساب سعر المنتج
 */
export async function calculateProductPrice(
  params: CalculatePriceParams
): Promise<CalculatePriceResult> {
  try {
    const { data, error } = await supabase.rpc('calculate_product_price', {
      p_product_id: params.product_id,
      p_quantity: params.quantity,
      p_customer_type: params.customer_type || 'retail',
      p_customer_id: params.customer_id || null,
    });

    if (error) {
      console.error('[ProductServiceV2] calculateProductPrice error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return data as CalculatePriceResult;
  } catch (err) {
    console.error('[ProductServiceV2] calculateProductPrice exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// =====================================================
// دوال مساعدة
// =====================================================

/**
 * إنشاء منتج جديد (اختصار)
 */
export async function createProduct(
  organizationId: string,
  productData: Omit<UpsertProductV2Params, 'product_id'>
): Promise<UpsertProductV2Result> {
  return upsertProductV2({
    ...productData,
    basic_data: {
      ...productData.basic_data,
      organization_id: organizationId,
    },
  });
}

/**
 * تحديث منتج موجود (اختصار)
 */
export async function updateProduct(
  productId: string,
  productData: Omit<UpsertProductV2Params, 'product_id'>
): Promise<UpsertProductV2Result> {
  return upsertProductV2({
    ...productData,
    product_id: productId,
  });
}

/**
 * جلب منتج بالـ ID
 */
export async function getProductById(
  productId: string,
  scope: ProductScope = 'full'
): Promise<GetProductV2Result> {
  return getProductV2({
    product_identifier: productId,
    scope,
  });
}

/**
 * جلب منتج بالباركود
 */
export async function getProductByBarcode(
  barcode: string,
  organizationId: string,
  scope: ProductScope = 'pos'
): Promise<GetProductV2Result> {
  return getProductV2({
    product_identifier: barcode,
    organization_id: organizationId,
    scope,
  });
}

/**
 * جلب منتج بالـ SKU
 */
export async function getProductBySku(
  sku: string,
  organizationId: string,
  scope: ProductScope = 'full'
): Promise<GetProductV2Result> {
  return getProductV2({
    product_identifier: sku,
    organization_id: organizationId,
    scope,
  });
}

/**
 * جلب منتج بالـ Slug
 */
export async function getProductBySlug(
  slug: string,
  organizationId: string,
  scope: ProductScope = 'full'
): Promise<GetProductV2Result> {
  return getProductV2({
    product_identifier: slug,
    organization_id: organizationId,
    scope,
  });
}

// =====================================================
// دوال إدارة الدفعات
// =====================================================

/**
 * إضافة دفعة جديدة للمنتج
 */
export async function addProductBatch(
  productId: string,
  batchData: {
    batch_number: string;
    quantity: number;
    purchase_price?: number;
    selling_price?: number;
    expiry_date?: string;
    supplier_id?: string;
    location?: string;
    notes?: string;
  },
  organizationId: string
) {
  const { data, error } = await supabase
    .from('inventory_batches')
    .insert({
      product_id: productId,
      organization_id: organizationId,
      batch_number: batchData.batch_number,
      quantity_received: batchData.quantity,
      quantity_remaining: batchData.quantity,
      purchase_price: batchData.purchase_price || 0,
      selling_price: batchData.selling_price || 0,
      expiry_date: batchData.expiry_date,
      supplier_id: batchData.supplier_id,
      location: batchData.location,
      notes: batchData.notes,
    })
    .select()
    .single();

  if (error) {
    console.error('[ProductServiceV2] addProductBatch error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, batch: data };
}

/**
 * جلب دفعات المنتج
 */
export async function getProductBatches(
  productId: string,
  onlyActive: boolean = true
) {
  let query = supabase
    .from('inventory_batches')
    .select('*')
    .eq('product_id', productId)
    .order('expiry_date', { ascending: true, nullsFirst: false });

  if (onlyActive) {
    query = query.eq('is_active', true).gt('quantity_remaining', 0);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[ProductServiceV2] getProductBatches error:', error);
    return { success: false, error: error.message, batches: [] };
  }

  return { success: true, batches: data };
}

// =====================================================
// دوال إدارة الأرقام التسلسلية
// =====================================================

/**
 * إضافة أرقام تسلسلية للمنتج
 */
export async function addSerialNumbers(
  productId: string,
  organizationId: string,
  serials: Array<{
    serial_number: string;
    imei?: string;
    warranty_start_date?: string;
    location?: string;
    notes?: string;
  }>
) {
  const records = serials.map(s => ({
    product_id: productId,
    organization_id: organizationId,
    serial_number: s.serial_number,
    imei: s.imei,
    warranty_start_date: s.warranty_start_date,
    location: s.location,
    notes: s.notes,
    status: 'available',
  }));

  const { data, error } = await supabase
    .from('product_serial_numbers')
    .insert(records)
    .select();

  if (error) {
    console.error('[ProductServiceV2] addSerialNumbers error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, serials: data, count: data.length };
}

/**
 * جلب الأرقام التسلسلية المتاحة
 */
export async function getAvailableSerials(
  productId: string,
  limit: number = 100
) {
  const { data, error } = await supabase
    .from('product_serial_numbers')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ProductServiceV2] getAvailableSerials error:', error);
    return { success: false, error: error.message, serials: [] };
  }

  return { success: true, serials: data };
}

/**
 * بيع رقم تسلسلي
 */
export async function sellSerialNumber(
  serialNumber: string,
  organizationId: string,
  saleData: {
    order_id: string;
    customer_id?: string;
    sale_price: number;
    sold_by_user_id?: string;
  }
) {
  const { data, error } = await supabase
    .from('product_serial_numbers')
    .update({
      status: 'sold',
      sold_at: new Date().toISOString(),
      sold_in_order_id: saleData.order_id,
      sold_to_customer_id: saleData.customer_id,
      sold_price: saleData.sale_price,
      sold_by_user_id: saleData.sold_by_user_id,
    })
    .eq('serial_number', serialNumber)
    .eq('organization_id', organizationId)
    .eq('status', 'available')
    .select()
    .single();

  if (error) {
    console.error('[ProductServiceV2] sellSerialNumber error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, serial: data };
}

/**
 * إرجاع رقم تسلسلي
 */
export async function returnSerialNumber(
  serialNumber: string,
  organizationId: string,
  returnData: {
    reason: string;
    condition: string;
  }
) {
  const { data, error } = await supabase
    .from('product_serial_numbers')
    .update({
      status: 'returned',
      returned_at: new Date().toISOString(),
      return_reason: returnData.reason,
      return_condition: returnData.condition,
    })
    .eq('serial_number', serialNumber)
    .eq('organization_id', organizationId)
    .eq('status', 'sold')
    .select()
    .single();

  if (error) {
    console.error('[ProductServiceV2] returnSerialNumber error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, serial: data };
}

// =====================================================
// دوال مستويات الأسعار
// =====================================================

/**
 * جلب مستويات أسعار المنتج
 */
export async function getProductPriceTiers(productId: string) {
  const { data, error } = await supabase
    .from('product_price_tiers')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('sort_order')
    .order('min_quantity');

  if (error) {
    console.error('[ProductServiceV2] getProductPriceTiers error:', error);
    return { success: false, error: error.message, tiers: [] };
  }

  return { success: true, tiers: data };
}

/**
 * تحديث مستويات الأسعار
 */
export async function updateProductPriceTiers(
  productId: string,
  organizationId: string,
  tiers: Array<{
    tier_name: string;
    min_quantity: number;
    max_quantity?: number;
    price_type: 'fixed' | 'percentage_discount' | 'fixed_discount';
    price?: number;
    discount_percentage?: number;
    discount_amount?: number;
  }>
) {
  // حذف المستويات القديمة
  await supabase
    .from('product_price_tiers')
    .delete()
    .eq('product_id', productId);

  // إضافة المستويات الجديدة
  const records = tiers.map((t, index) => ({
    product_id: productId,
    organization_id: organizationId,
    tier_name: t.tier_name,
    min_quantity: t.min_quantity,
    max_quantity: t.max_quantity,
    price_type: t.price_type,
    price: t.price,
    discount_percentage: t.discount_percentage,
    discount_amount: t.discount_amount,
    sort_order: index,
    is_active: true,
  }));

  const { data, error } = await supabase
    .from('product_price_tiers')
    .insert(records)
    .select();

  if (error) {
    console.error('[ProductServiceV2] updateProductPriceTiers error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, tiers: data };
}

// =====================================================
// تصدير الخدمة
// =====================================================

export const ProductServiceV2 = {
  // الدوال الرئيسية
  upsert: upsertProductV2,
  get: getProductV2,
  calculatePrice: calculateProductPrice,

  // اختصارات
  create: createProduct,
  update: updateProduct,
  getById: getProductById,
  getByBarcode: getProductByBarcode,
  getBySku: getProductBySku,
  getBySlug: getProductBySlug,

  // الدفعات
  addBatch: addProductBatch,
  getBatches: getProductBatches,

  // الأرقام التسلسلية
  addSerials: addSerialNumbers,
  getAvailableSerials,
  sellSerial: sellSerialNumber,
  returnSerial: returnSerialNumber,

  // مستويات الأسعار
  getPriceTiers: getProductPriceTiers,
  updatePriceTiers: updateProductPriceTiers,
};

export default ProductServiceV2;
