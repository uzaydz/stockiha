/**
 * Optimized Inventory API - Single RPC Call
 * واجهة المخزون المحسّنة - استدعاء واحد فقط
 */

import { supabase } from '@/lib/supabase';

// ==================== Types ====================

export interface InventoryColor {
  id: string;
  name: string;
  color_code: string;
  quantity: number;
  has_sizes: boolean;
  sizes: InventorySize[];
}

export interface InventorySize {
  id: string;
  name: string;
  quantity: number;
}

export interface InventoryProduct {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  price: number;
  purchase_price: number | null;
  thumbnail_image: string | null;
  has_variants: boolean;
  stock_status: 'in-stock' | 'low-stock' | 'out-of-stock';
  variant_count: number;
  total_variant_stock: number;
  colors: InventoryColor[];
  total_count: number;
  filtered_count: number;
}

export interface InventoryFilters {
  search?: string;
  stockFilter?: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
  sortBy?: 'name' | 'stock' | 'price';
  page?: number;
  pageSize?: number;
}

export interface InventoryResponse {
  products: InventoryProduct[];
  total: number;
  filtered: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== Main Function ====================

/**
 * جلب المخزون المحسّن - استدعاء واحد فقط
 */
export async function fetchInventoryOptimized(
  organizationId: string,
  filters: InventoryFilters = {}
): Promise<InventoryResponse> {
  const {
    search = '',
    stockFilter = 'all',
    sortBy = 'name',
    page = 1,
    pageSize = 50,
  } = filters;

  try {
    const { data, error } = await supabase.rpc('get_inventory_optimized', {
      p_organization_id: organizationId,
      p_search: search,
      p_stock_filter: stockFilter,
      p_sort_by: sortBy,
      p_page: page,
      p_page_size: pageSize,
    });

    if (error) {
      console.error('❌ Inventory fetch error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return {
        products: [],
        total: 0,
        filtered: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    // تحويل البيانات
    const products: InventoryProduct[] = data.map((row: any) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      stock_quantity: row.stock_quantity || 0,
      price: Number(row.price || 0),
      purchase_price: row.purchase_price ? Number(row.purchase_price) : null,
      thumbnail_image: row.thumbnail_image,
      has_variants: row.has_variants || false,
      stock_status: row.stock_status || 'in-stock',
      variant_count: row.variant_count || 0,
      total_variant_stock: row.total_variant_stock || 0,
      colors: Array.isArray(row.colors) ? row.colors : [],
      total_count: Number(row.total_count || 0),
      filtered_count: Number(row.filtered_count || 0),
    }));

    const total = products.length > 0 ? products[0].total_count : 0;
    const filtered = products.length > 0 ? products[0].filtered_count : 0;
    const totalPages = Math.ceil(filtered / pageSize);

    console.log('✅ Inventory loaded:', {
      products: products.length,
      total,
      filtered,
      page,
      totalPages,
    });

    return {
      products,
      total,
      filtered,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error('❌ Failed to fetch inventory:', error);
    throw error;
  }
}

/**
 * جلب إحصائيات المخزون السريعة
 */
export async function fetchInventoryStatsQuick(
  organizationId: string
): Promise<{
  total_products: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  total_value: number;
}> {
  try {
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

    products.forEach((product) => {
      const qty = product.stock_quantity || 0;
      const price = product.purchase_price || product.price || 0;

      totalValue += qty * Number(price);

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
    };
  } catch (error) {
    console.error('❌ Failed to fetch stats:', error);
    throw error;
  }
}

