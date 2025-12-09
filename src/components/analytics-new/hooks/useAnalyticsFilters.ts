/**
 * ============================================
 * STOCKIHA ANALYTICS - FILTERS HOOK
 * إدارة حالة الفلاتر للتقارير
 * ============================================
 */

import { useState, useCallback, useMemo } from 'react';
import type { FilterState, DateRange, DatePreset } from '../types';
import { getDateRangeFromPreset } from '../filters/DateFilter';

// ==================== Default Filter State ====================

export const getDefaultFilters = (): FilterState => {
  const defaultRange = getDateRangeFromPreset('last_30_days');

  return {
    dateRange: defaultRange,
    datePreset: 'last_30_days',
    comparisonMode: 'none',
    categories: [],
    products: [],
    customers: [],
    suppliers: [],
    staff: [],
    paymentMethods: [],
    saleTypes: [],
    orderStatuses: [],
    productTypes: [],
  };
};

// ==================== Hook ====================

export interface UseAnalyticsFiltersReturn {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  updateDateRange: (range: DateRange) => void;
  updateDatePreset: (preset: DatePreset) => void;
  updateCategories: (categories: string[]) => void;
  updateProducts: (products: string[]) => void;
  updateCustomers: (customers: string[]) => void;
  updateSuppliers: (suppliers: string[]) => void;
  updateStaff: (staff: string[]) => void;
  updatePaymentMethods: (methods: string[]) => void;
  updateSaleTypes: (types: FilterState['saleTypes']) => void;
  updateOrderStatuses: (statuses: string[]) => void;
  updateProductTypes: (types: FilterState['productTypes']) => void;
  toggleComparisonMode: () => void;
  resetFilters: () => void;
  clearArrayFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

export function useAnalyticsFilters(
  initialFilters?: Partial<FilterState>
): UseAnalyticsFiltersReturn {
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...getDefaultFilters(),
    ...initialFilters,
  }));

  // Update date range
  const updateDateRange = useCallback((range: DateRange) => {
    setFilters((prev) => ({ ...prev, dateRange: range }));
  }, []);

  // Update date preset
  const updateDatePreset = useCallback((preset: DatePreset) => {
    const range = getDateRangeFromPreset(preset);
    setFilters((prev) => ({
      ...prev,
      datePreset: preset,
      dateRange: range,
    }));
  }, []);

  // Update categories
  const updateCategories = useCallback((categories: string[]) => {
    setFilters((prev) => ({ ...prev, categories }));
  }, []);

  // Update products
  const updateProducts = useCallback((products: string[]) => {
    setFilters((prev) => ({ ...prev, products }));
  }, []);

  // Update customers
  const updateCustomers = useCallback((customers: string[]) => {
    setFilters((prev) => ({ ...prev, customers }));
  }, []);

  // Update suppliers
  const updateSuppliers = useCallback((suppliers: string[]) => {
    setFilters((prev) => ({ ...prev, suppliers }));
  }, []);

  // Update staff
  const updateStaff = useCallback((staff: string[]) => {
    setFilters((prev) => ({ ...prev, staff }));
  }, []);

  // Update payment methods
  const updatePaymentMethods = useCallback((methods: string[]) => {
    setFilters((prev) => ({ ...prev, paymentMethods: methods }));
  }, []);

  // Update sale types
  const updateSaleTypes = useCallback((types: FilterState['saleTypes']) => {
    setFilters((prev) => ({ ...prev, saleTypes: types }));
  }, []);

  // Update order statuses
  const updateOrderStatuses = useCallback((statuses: string[]) => {
    setFilters((prev) => ({ ...prev, orderStatuses: statuses }));
  }, []);

  // Update product types
  const updateProductTypes = useCallback((types: FilterState['productTypes']) => {
    setFilters((prev) => ({ ...prev, productTypes: types }));
  }, []);

  // Toggle comparison mode
  const toggleComparisonMode = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      comparisonMode: prev.comparisonMode === 'none' ? 'previous_period' : 'none',
    }));
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(getDefaultFilters());
  }, []);

  // Clear only array filters (keep date)
  const clearArrayFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      categories: [],
      products: [],
      customers: [],
      suppliers: [],
      staff: [],
      paymentMethods: [],
      saleTypes: [],
      orderStatuses: [],
      productTypes: [],
    }));
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.categories.length > 0 ||
      filters.products.length > 0 ||
      filters.customers.length > 0 ||
      filters.suppliers.length > 0 ||
      filters.staff.length > 0 ||
      filters.paymentMethods.length > 0 ||
      filters.saleTypes.length > 0 ||
      filters.orderStatuses.length > 0 ||
      filters.productTypes.length > 0
    );
  }, [filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return (
      filters.categories.length +
      filters.products.length +
      filters.customers.length +
      filters.suppliers.length +
      filters.staff.length +
      filters.paymentMethods.length +
      filters.saleTypes.length +
      filters.orderStatuses.length +
      filters.productTypes.length
    );
  }, [filters]);

  return {
    filters,
    setFilters,
    updateDateRange,
    updateDatePreset,
    updateCategories,
    updateProducts,
    updateCustomers,
    updateSuppliers,
    updateStaff,
    updatePaymentMethods,
    updateSaleTypes,
    updateOrderStatuses,
    updateProductTypes,
    toggleComparisonMode,
    resetFilters,
    clearArrayFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}

export default useAnalyticsFilters;
