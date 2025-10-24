/**
 * Modern Inventory API - Simple, Fast, Efficient
 * نظام مخزون عصري - بسيط، سريع، فعال
 */

import { supabase } from '@/lib/supabase';

// ==================== Types ====================

export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  price: number;
  cost_price: number | null;
  thumbnail_image: string | null;
  has_variants: boolean;
  variant_count: number;
  total_variant_stock: number;
  stock_status: 'in-stock' | 'low-stock' | 'out-of-stock';
  stock_value: number;
  colors?: ColorVariant[];
}

export interface ColorVariant {
  id: string;
  name: string;
  color_code: string;
  quantity: number;
  has_sizes: boolean;
  sizes?: SizeVariant[];
}

export interface SizeVariant {
  id: string;
  name: string;
  quantity: number;
}

export interface InventoryStats {
  total_products: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  total_value: number;
  total_quantity: number;
}

export interface InventoryFilters {
  search?: string;
  status?: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
  page?: number;
  pageSize?: number;
}

export interface StockUpdatePayload {
  product_id: string;
  variant_id?: string;
  quantity: number;
  operation: 'set' | 'add' | 'subtract';
  note?: string;
}

// ==================== API Functions ====================

/**
 * جلب قائمة المخزون مع الفلترة والبحث
 */
export async function fetchInventoryList(
  organizationId: string,
  filters: InventoryFilters = {}
): Promise<{ items: InventoryItem[]; total: number; filtered: number }> {
  const {
    search = '',
    status = 'all',
    page = 1,
    pageSize = 50,
  } = filters;

  // Build query
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  // Apply search
  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  // Apply status filter
  if (status !== 'all') {
    if (status === 'in-stock') {
      query = query.gt('stock_quantity', 5);
    } else if (status === 'low-stock') {
      query = query.gte('stock_quantity', 1).lte('stock_quantity', 5);
    } else if (status === 'out-of-stock') {
      query = query.eq('stock_quantity', 0);
    }
  }

  // Apply pagination
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  query = query.range(start, end);

  const { data, error, count } = await query;

  if (error) throw error;

  // Transform data
  const items: InventoryItem[] = (data || []).map((product) => {
    const stockQty = product.stock_quantity || 0;
    const price = product.price || 0;
    const purchasePrice = product.purchase_price || 0;

    // Determine stock status
    let stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock' = 'in-stock';
    if (stockQty === 0) {
      stockStatus = 'out-of-stock';
    } else if (stockQty <= 5) {
      stockStatus = 'low-stock';
    }

    // Calculate variant info
    const colors = product.colors || [];
    const hasVariants = colors.length > 0;
    let variantCount = 0;
    let totalVariantStock = 0;

    if (hasVariants) {
      colors.forEach((color: any) => {
        variantCount++;
        totalVariantStock += color.quantity || 0;
        if (color.sizes && color.sizes.length > 0) {
          variantCount += color.sizes.length;
        }
      });
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      stock_quantity: stockQty,
      price,
      cost_price: purchasePrice,
      thumbnail_image: product.thumbnail_image,
      has_variants: hasVariants,
      variant_count: variantCount,
      total_variant_stock: totalVariantStock,
      stock_status: stockStatus,
      stock_value: stockQty * purchasePrice,
      colors: colors,
    };
  });

  return {
    items,
    total: count || 0,
    filtered: count || 0,
  };
}

/**
 * جلب إحصائيات المخزون
 */
export async function fetchInventoryStats(
  organizationId: string
): Promise<InventoryStats> {
  const { data, error } = await supabase
    .from('products')
    .select('stock_quantity, purchase_price, price')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (error) throw error;

  const products = data || [];
  let totalProducts = products.length;
  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let totalValue = 0;
  let totalQuantity = 0;

  products.forEach((product) => {
    const qty = product.stock_quantity || 0;
    const cost = product.purchase_price || product.price || 0;

    totalQuantity += qty;
    totalValue += qty * cost;

    if (qty === 0) {
      outOfStock++;
    } else if (qty <= 5) {
      lowStock++;
    } else {
      inStock++;
    }
  });

  return {
    total_products: totalProducts,
    in_stock: inStock,
    low_stock: lowStock,
    out_of_stock: outOfStock,
    total_value: totalValue,
    total_quantity: totalQuantity,
  };
}

/**
 * تحديث المخزون - بسيط وسريع مع دعم كامل للمتغيرات
 */
export async function updateInventoryStock(
  payload: StockUpdatePayload
): Promise<boolean> {
  const { product_id, variant_id, quantity, operation, note } = payload;

  try {
    // Get current product
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single();

    if (fetchError || !product) throw new Error('منتج غير موجود');

    let newQuantity = 0;
    const colors = product.colors || [];

    // If updating variant (color or size)
    if (variant_id && colors.length > 0) {
      let updated = false;
      let isColorUpdate = false;
      let isSizeUpdate = false;

      const updatedColors = colors.map((color: any) => {
        // Case 1: Direct color update (no sizes)
        if (color.id === variant_id) {
          isColorUpdate = true;
          
          // If color has sizes, don't allow direct update
          if (color.has_sizes && color.sizes && color.sizes.length > 0) {
            console.warn('Cannot update color with sizes directly. Update individual sizes instead.');
            return color;
          }
          
          const currentQty = color.quantity || 0;
          newQuantity = calculateNewQuantity(currentQty, quantity, operation);
          updated = true;
          
          return { ...color, quantity: newQuantity };
        }

        // Case 2: Size update within a color
        if (color.sizes && color.sizes.length > 0) {
          const updatedSizes = color.sizes.map((size: any) => {
            if (size.id === variant_id) {
              isSizeUpdate = true;
              const currentQty = size.quantity || 0;
              newQuantity = calculateNewQuantity(currentQty, quantity, operation);
              updated = true;
              return { ...size, quantity: newQuantity };
            }
            return size;
          });

          // If a size was updated, recalculate the color's total quantity
          if (isSizeUpdate) {
            const colorTotal = updatedSizes.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
            return { ...color, quantity: colorTotal, sizes: updatedSizes };
          }

          return { ...color, sizes: updatedSizes };
        }

        return color;
      });

      if (!updated) {
        console.error('Variant not found:', variant_id);
        throw new Error('المتغير غير موجود');
      }

      // Recalculate total product stock from all colors
      const totalStock = updatedColors.reduce((sum: number, color: any) => {
        return sum + (color.quantity || 0);
      }, 0);

      // Update product in database
      const { error: updateError } = await supabase
        .from('products')
        .update({
          colors: updatedColors,
          stock_quantity: totalStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product_id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('✅ Variant updated successfully:', {
        variant_id,
        newQuantity,
        totalStock,
        isColorUpdate,
        isSizeUpdate
      });

    } else {
      // Update main product stock (no variants)
      const currentQty = product.stock_quantity || 0;
      newQuantity = calculateNewQuantity(currentQty, quantity, operation);

      const { error: updateError } = await supabase
        .from('products')
        .update({
          stock_quantity: newQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product_id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('✅ Product stock updated successfully:', {
        product_id,
        newQuantity
      });
    }

    // Log inventory change
    await logInventoryChange(product_id, variant_id, quantity, operation, note);

    return true;
  } catch (error) {
    console.error('❌ Stock update error:', error);
    return false;
  }
}

/**
 * حساب الكمية الجديدة
 */
function calculateNewQuantity(
  current: number,
  quantity: number,
  operation: 'set' | 'add' | 'subtract'
): number {
  if (operation === 'set') {
    return Math.max(0, quantity);
  } else if (operation === 'add') {
    return Math.max(0, current + quantity);
  } else {
    return Math.max(0, current - quantity);
  }
}

/**
 * تسجيل تغيير المخزون
 */
async function logInventoryChange(
  productId: string,
  variantId: string | undefined,
  quantity: number,
  operation: string,
  note?: string
): Promise<void> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    await supabase.from('inventory_logs').insert({
      product_id: productId,
      variant_id: variantId,
      quantity_change: quantity,
      operation_type: operation,
      notes: note,
      created_by: user?.user?.id,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Log silently, don't fail the operation
    console.warn('Failed to log inventory change:', error);
  }
}

