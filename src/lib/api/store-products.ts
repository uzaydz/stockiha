/**
 * Store products API utilities
 */

import { supabase } from '@/lib/supabase';

export interface StoreProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface StoreProductFilters {
  category_id?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  limit?: number;
  offset?: number;
}

/**
 * Get store products with optional filters
 */
export async function getStoreProducts(
  organizationId: string,
  filters: StoreProductFilters = {}
): Promise<StoreProduct[]> {
  try {
    let query = supabase
      .from('products')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (filters.min_price !== undefined) {
      query = query.gte('price', filters.min_price);
    }

    if (filters.max_price !== undefined) {
      query = query.lte('price', filters.max_price);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching store products:', error);
    return [];
  }
}

/**
 * Get a single store product by ID
 */
export async function getStoreProduct(
  productId: string,
  organizationId: string
): Promise<StoreProduct | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching store product:', error);
    return null;
  }
}

/**
 * Create a new store product
 */
export async function createStoreProduct(
  product: Omit<StoreProduct, 'id' | 'created_at' | 'updated_at'>
): Promise<StoreProduct | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating store product:', error);
    return null;
  }
}

/**
 * Update a store product
 */
export async function updateStoreProduct(
  productId: string,
  updates: Partial<StoreProduct>
): Promise<StoreProduct | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating store product:', error);
    return null;
  }
}

/**
 * Delete a store product
 */
export async function deleteStoreProduct(productId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting store product:', error);
    return false;
  }
}

/**
 * Get store products with pagination
 */
export async function getStoreProductsPage(
  organizationId: string,
  page: number = 1,
  limit: number = 10,
  filters: Omit<StoreProductFilters, 'limit' | 'offset'> = {}
): Promise<{ products: StoreProduct[]; total: number; pages: number }> {
  try {
    const offset = (page - 1) * limit;
    
    // Get total count
    let countQuery = supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (filters.category_id) {
      countQuery = countQuery.eq('category_id', filters.category_id);
    }

    if (filters.search) {
      countQuery = countQuery.ilike('name', `%${filters.search}%`);
    }

    if (filters.min_price !== undefined) {
      countQuery = countQuery.gte('price', filters.min_price);
    }

    if (filters.max_price !== undefined) {
      countQuery = countQuery.lte('price', filters.max_price);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    // Get products with pagination
    const products = await getStoreProducts(organizationId, {
      ...filters,
      limit,
      offset
    });

    const total = count || 0;
    const pages = Math.ceil(total / limit);

    return {
      products,
      total,
      pages
    };
  } catch (error) {
    console.error('Error fetching store products page:', error);
    return {
      products: [],
      total: 0,
      pages: 0
    };
  }
}
