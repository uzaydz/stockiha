import {
  fetchInventoryProducts,
  fetchInventoryStats,
  fetchProductInventoryDetails,
  searchInventoryProducts,
  bulkUpdateInventory as serviceBulkUpdateInventory,
  type InventoryFilters as ServiceInventoryFilters,
  type InventoryProduct as ServiceInventoryProduct,
  type InventoryStats as ServiceInventoryStats,
} from '@/services/InventoryService';

export type InventoryFilters = ServiceInventoryFilters;

export interface InventoryProduct extends ServiceInventoryProduct {
  total_count: number;
  filtered_count: number;
}

export type InventoryStats = ServiceInventoryStats;

export async function getInventoryProductsPaginated(
  filters: InventoryFilters = {}
): Promise<InventoryProduct[]> {
  const { products, totalCount, filteredCount } = await fetchInventoryProducts(filters);
  return products.map((product) => ({
    ...product,
    total_count: totalCount,
    filtered_count: filteredCount,
  }));
}

export const getInventoryAdvancedStats = fetchInventoryStats;

export const getProductInventoryDetails = fetchProductInventoryDetails;

export const searchInventoryAutocomplete = searchInventoryProducts;

export const bulkUpdateInventory = serviceBulkUpdateInventory;

export function clearInventoryCache(): void {
  // تم إلغاء نظام التخزين المؤقت المحلي في النسخة المحسّنة.
}

export function getCacheInfo(): { size: number; keys: string[] } {
  return { size: 0, keys: [] };
}

export default {
  getInventoryProductsPaginated,
  getInventoryAdvancedStats,
  getProductInventoryDetails,
  searchInventoryAutocomplete,
  bulkUpdateInventory,
  clearInventoryCache,
  getCacheInfo,
};
