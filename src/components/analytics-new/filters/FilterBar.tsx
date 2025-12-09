/**
 * ============================================
 * STOCKIHA ANALYTICS - FILTER BAR
 * شريط الفلاتر الشامل
 * ============================================
 */

import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  X,
  ChevronDown,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Tag,
  Users,
  Package,
  CreditCard,
  Store,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DateFilter, { getDateRangeFromPreset } from './DateFilter';
import type { FilterState, DateRange, DatePreset } from '../types';

// ==================== Types ====================

export interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  showDateFilter?: boolean;
  showCategoryFilter?: boolean;
  showPaymentFilter?: boolean;
  showSaleTypeFilter?: boolean;
  showProductTypeFilter?: boolean;
  showCustomerFilter?: boolean;
  categories?: { id: string; name: string }[];
  paymentMethods?: { id: string; name: string }[];
  className?: string;
}

// ==================== Filter Options ====================

const saleTypeOptions = [
  { id: 'retail', name: 'تجزئة' },
  { id: 'wholesale', name: 'جملة' },
  { id: 'partial_wholesale', name: 'نصف جملة' },
];

const productTypeOptions = [
  { id: 'piece', name: 'قطعة' },
  { id: 'weight', name: 'وزن' },
  { id: 'meter', name: 'متر' },
  { id: 'box', name: 'صندوق' },
];

const defaultPaymentMethods = [
  { id: 'cash', name: 'نقدي' },
  { id: 'card', name: 'بطاقة' },
  { id: 'bank_transfer', name: 'تحويل بنكي' },
  { id: 'ccp', name: 'CCP' },
  { id: 'baridimob', name: 'بريدي موب' },
  { id: 'credit', name: 'آجل' },
];

// ==================== Multi-Select Dropdown ====================

interface MultiSelectProps {
  label: string;
  icon: React.ReactNode;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const MultiSelectDropdown: React.FC<MultiSelectProps> = ({
  label,
  icon,
  options,
  selected,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => {
    onChange(options.map((o) => o.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  const selectedCount = selected.length;
  const isAllSelected = selectedCount === options.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
          'border',
          selectedCount > 0
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
        )}
      >
        {icon}
        <span className="font-medium">{label}</span>
        {selectedCount > 0 && (
          <span className="px-1.5 py-0.5 text-xs font-semibold bg-blue-500 text-white rounded-full">
            {selectedCount}
          </span>
        )}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className={cn(
                'absolute left-0 top-full mt-1 z-50 w-56',
                'bg-white dark:bg-zinc-900',
                'border border-zinc-200 dark:border-zinc-800',
                'rounded-xl shadow-lg overflow-hidden'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={isAllSelected ? clearAll : selectAll}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {isAllSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
                <span className="text-xs text-zinc-500">{selectedCount} من {options.length}</span>
              </div>

              {/* Options */}
              <div className="max-h-48 overflow-y-auto py-1">
                {options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleOption(option.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                      'text-right hover:bg-zinc-50 dark:hover:bg-zinc-800',
                      selected.includes(option.id) && 'bg-blue-50 dark:bg-blue-900/10'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                      selected.includes(option.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-zinc-300 dark:border-zinc-600'
                    )}>
                      {selected.includes(option.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span className={cn(
                      selected.includes(option.id)
                        ? 'text-zinc-900 dark:text-zinc-100 font-medium'
                        : 'text-zinc-700 dark:text-zinc-300'
                    )}>
                      {option.name}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==================== Active Filters Chips ====================

interface ActiveFiltersProps {
  filters: FilterState;
  onRemoveFilter: (type: string, value?: string) => void;
  onClearAll: () => void;
  categories?: { id: string; name: string }[];
}

const ActiveFiltersChips: React.FC<ActiveFiltersProps> = ({
  filters,
  onRemoveFilter,
  onClearAll,
  categories = [],
}) => {
  const chips: { type: string; label: string; value?: string }[] = [];

  // Categories
  filters.categories.forEach((catId) => {
    const cat = categories.find((c) => c.id === catId);
    if (cat) {
      chips.push({ type: 'categories', label: cat.name, value: catId });
    }
  });

  // Sale Types
  filters.saleTypes.forEach((type) => {
    const opt = saleTypeOptions.find((o) => o.id === type);
    if (opt) {
      chips.push({ type: 'saleTypes', label: opt.name, value: type });
    }
  });

  // Payment Methods
  filters.paymentMethods.forEach((method) => {
    const opt = defaultPaymentMethods.find((o) => o.id === method);
    if (opt) {
      chips.push({ type: 'paymentMethods', label: opt.name, value: method });
    }
  });

  // Product Types
  filters.productTypes.forEach((type) => {
    const opt = productTypeOptions.find((o) => o.id === type);
    if (opt) {
      chips.push({ type: 'productTypes', label: opt.name, value: type });
    }
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">الفلاتر النشطة:</span>

      {chips.map((chip, index) => (
        <motion.span
          key={`${chip.type}-${chip.value}-${index}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
          )}
        >
          {chip.label}
          <button
            onClick={() => onRemoveFilter(chip.type, chip.value)}
            className="hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-full p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </motion.span>
      ))}

      {chips.length > 0 && (
        <button
          onClick={onClearAll}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
        >
          مسح الكل
        </button>
      )}
    </div>
  );
};

// ==================== Main Component ====================

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  showDateFilter = true,
  showCategoryFilter = true,
  showPaymentFilter = true,
  showSaleTypeFilter = true,
  showProductTypeFilter = true,
  showCustomerFilter = false,
  categories = [],
  paymentMethods = defaultPaymentMethods,
  className,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update handlers
  const updateDateRange = (range: DateRange) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const updatePreset = (preset: DatePreset) => {
    onFiltersChange({ ...filters, datePreset: preset });
  };

  const updateCategories = (selected: string[]) => {
    onFiltersChange({ ...filters, categories: selected });
  };

  const updateSaleTypes = (selected: string[]) => {
    onFiltersChange({ ...filters, saleTypes: selected as any });
  };

  const updatePaymentMethods = (selected: string[]) => {
    onFiltersChange({ ...filters, paymentMethods: selected });
  };

  const updateProductTypes = (selected: string[]) => {
    onFiltersChange({ ...filters, productTypes: selected as any });
  };

  // Remove single filter
  const handleRemoveFilter = (type: string, value?: string) => {
    if (!value) return;

    switch (type) {
      case 'categories':
        onFiltersChange({
          ...filters,
          categories: filters.categories.filter((c) => c !== value),
        });
        break;
      case 'saleTypes':
        onFiltersChange({
          ...filters,
          saleTypes: filters.saleTypes.filter((s) => s !== value),
        });
        break;
      case 'paymentMethods':
        onFiltersChange({
          ...filters,
          paymentMethods: filters.paymentMethods.filter((p) => p !== value),
        });
        break;
      case 'productTypes':
        onFiltersChange({
          ...filters,
          productTypes: filters.productTypes.filter((p) => p !== value),
        });
        break;
    }
  };

  // Clear all filters
  const handleClearAll = () => {
    onFiltersChange({
      ...filters,
      categories: [],
      saleTypes: [],
      paymentMethods: [],
      productTypes: [],
      products: [],
      customers: [],
      suppliers: [],
      staff: [],
      orderStatuses: [],
    });
  };

  // Reset to defaults
  const handleReset = () => {
    const defaultRange = getDateRangeFromPreset('last_30_days');
    onFiltersChange({
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
    });
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.saleTypes.length > 0 ||
    filters.paymentMethods.length > 0 ||
    filters.productTypes.length > 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Filter */}
        {showDateFilter && (
          <DateFilter
            dateRange={filters.dateRange}
            onDateRangeChange={updateDateRange}
            preset={filters.datePreset}
            onPresetChange={updatePreset}
            showPresets
          />
        )}

        {/* Divider */}
        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

        {/* Category Filter */}
        {showCategoryFilter && categories.length > 0 && (
          <MultiSelectDropdown
            label="الفئات"
            icon={<Tag className="h-4 w-4" />}
            options={categories}
            selected={filters.categories}
            onChange={updateCategories}
          />
        )}

        {/* Sale Type Filter */}
        {showSaleTypeFilter && (
          <MultiSelectDropdown
            label="نوع البيع"
            icon={<Store className="h-4 w-4" />}
            options={saleTypeOptions}
            selected={filters.saleTypes}
            onChange={updateSaleTypes}
          />
        )}

        {/* Payment Method Filter */}
        {showPaymentFilter && (
          <MultiSelectDropdown
            label="الدفع"
            icon={<CreditCard className="h-4 w-4" />}
            options={paymentMethods}
            selected={filters.paymentMethods}
            onChange={updatePaymentMethods}
          />
        )}

        {/* Product Type Filter */}
        {showProductTypeFilter && (
          <MultiSelectDropdown
            label="نوع المنتج"
            icon={<Package className="h-4 w-4" />}
            options={productTypeOptions}
            selected={filters.productTypes}
            onChange={updateProductTypes}
          />
        )}

        {/* More Filters Button */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
            'border border-zinc-200 dark:border-zinc-800',
            'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100',
            'hover:border-zinc-300 dark:hover:border-zinc-700',
            showAdvanced && 'bg-zinc-50 dark:bg-zinc-800'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>المزيد</span>
        </button>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            إعادة تعيين
          </button>
        )}
      </div>

      {/* Active Filters */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ActiveFiltersChips
              filters={filters}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAll}
              categories={categories}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default memo(FilterBar);
