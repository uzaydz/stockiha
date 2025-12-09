/**
 * ============================================
 * STOCKIHA ANALYTICS - DATA TABLE
 * جدول البيانات المتقدم
 * ============================================
 */

import React, { memo, useState, useMemo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== Types ====================

export interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string | number;
  minWidth?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  keyField?: keyof T;

  // Sorting
  sortable?: boolean;
  defaultSort?: { key: string; direction: 'asc' | 'desc' };
  onSort?: (key: string, direction: 'asc' | 'desc') => void;

  // Pagination
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  currentPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;

  // Search
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;

  // Selection
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (rows: T[]) => void;

  // Actions
  actions?: ReactNode;
  rowActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;

  // Styling
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rowClassName?: string | ((row: T, index: number) => string);
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  bordered?: boolean;
  stickyHeader?: boolean;
  maxHeight?: string | number;
}

// ==================== Loading Skeleton ====================

const TableSkeleton: React.FC<{ columns: number; rows: number }> = ({ columns, rows }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

// ==================== Empty State ====================

const EmptyState: React.FC<{
  message?: string;
  icon?: ReactNode;
  colSpan: number;
}> = ({ message = 'لا توجد بيانات', icon, colSpan }) => {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12">
        <div className="flex flex-col items-center justify-center text-center">
          {icon ? (
            <div className="mb-3 text-zinc-300 dark:text-zinc-600">{icon}</div>
          ) : (
            <svg
              className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          )}
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
        </div>
      </td>
    </tr>
  );
};

// ==================== Sort Icon ====================

const SortIcon: React.FC<{
  active: boolean;
  direction?: 'asc' | 'desc';
}> = ({ active, direction }) => {
  if (!active) {
    return (
      <div className="flex flex-col text-zinc-300 dark:text-zinc-600">
        <ChevronUp className="h-3 w-3 -mb-1" />
        <ChevronDown className="h-3 w-3" />
      </div>
    );
  }

  return direction === 'asc' ? (
    <ChevronUp className="h-4 w-4 text-blue-500" />
  ) : (
    <ChevronDown className="h-4 w-4 text-blue-500" />
  );
};

// ==================== Pagination ====================

const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
      {/* Items info */}
      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        عرض <span className="font-medium text-zinc-700 dark:text-zinc-300">{startItem}</span>
        {' - '}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{endItem}</span>
        {' من '}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{totalItems}</span>
      </div>

      {/* Page size selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">عدد الصفوف:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className={cn(
            'px-2 py-1 text-sm rounded-lg',
            'bg-zinc-100 dark:bg-zinc-800',
            'border border-zinc-200 dark:border-zinc-700',
            'text-zinc-700 dark:text-zinc-300',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/20'
          )}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'hover:bg-zinc-100 dark:hover:bg-zinc-800',
            'text-zinc-600 dark:text-zinc-400'
          )}
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'hover:bg-zinc-100 dark:hover:bg-zinc-800',
            'text-zinc-600 dark:text-zinc-400'
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <span className="px-3 text-sm text-zinc-600 dark:text-zinc-400">
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'hover:bg-zinc-100 dark:hover:bg-zinc-800',
            'text-zinc-600 dark:text-zinc-400'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'hover:bg-zinc-100 dark:hover:bg-zinc-800',
            'text-zinc-600 dark:text-zinc-400'
          )}
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ==================== Main Component ====================

function DataTableInner<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  emptyMessage,
  emptyIcon,
  keyField,
  sortable = false,
  defaultSort,
  onSort,
  pagination = false,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  currentPage: controlledPage,
  totalItems: controlledTotal,
  onPageChange,
  onPageSizeChange,
  searchable = false,
  searchPlaceholder = 'بحث...',
  onSearch,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  actions,
  rowActions,
  onRowClick,
  className,
  headerClassName,
  bodyClassName,
  rowClassName,
  striped = false,
  hoverable = true,
  compact = false,
  bordered = false,
  stickyHeader = false,
  maxHeight,
}: DataTableProps<T>) {
  // Local state
  const [sortState, setSortState] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    defaultSort || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting logic
  const handleSort = (key: string) => {
    if (!sortable) return;

    const newDirection = sortState?.key === key && sortState.direction === 'asc' ? 'desc' : 'asc';
    setSortState({ key, direction: newDirection });
    onSort?.(key, newDirection);
  };

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortState || onSort) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortState.key];
      const bVal = b[sortState.key];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortState.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      return sortState.direction === 'asc'
        ? aStr.localeCompare(bStr, 'ar')
        : bStr.localeCompare(aStr, 'ar');
    });
  }, [data, sortState, onSort]);

  // Pagination
  const totalItems = controlledTotal ?? sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedData = pagination
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    onPageChange?.(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    onPageSizeChange?.(size);
  };

  // Get row key
  const getRowKey = (row: T, index: number): string => {
    if (keyField && row[keyField] !== undefined) {
      return String(row[keyField]);
    }
    return String(index);
  };

  // Cell value getter
  const getCellValue = (row: T, key: string): any => {
    if (key.includes('.')) {
      const keys = key.split('.');
      let value: any = row;
      for (const k of keys) {
        value = value?.[k];
      }
      return value;
    }
    return row[key as keyof T];
  };

  // Styles
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className={cn('overflow-hidden rounded-xl', bordered && 'border border-zinc-200 dark:border-zinc-800', className)}>
      {/* Toolbar */}
      {(searchable || actions) && (
        <div className="flex items-center justify-between gap-4 p-4 border-b border-zinc-200 dark:border-zinc-800">
          {searchable && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch?.(e.target.value);
                }}
                placeholder={searchPlaceholder}
                className={cn(
                  'w-full pr-9 pl-4 py-2 text-sm rounded-lg',
                  'bg-zinc-100 dark:bg-zinc-800',
                  'border border-zinc-200 dark:border-zinc-700',
                  'text-zinc-900 dark:text-zinc-100',
                  'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/20'
                )}
              />
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Table container */}
      <div
        className={cn('overflow-auto', stickyHeader && 'relative')}
        style={maxHeight ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined}
      >
        <table className="w-full">
          {/* Header */}
          <thead className={cn(
            'bg-zinc-50 dark:bg-zinc-800/50',
            stickyHeader && 'sticky top-0 z-10',
            headerClassName
          )}>
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    cellPadding,
                    'text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-left',
                    column.align !== 'center' && column.align !== 'right' && 'text-right',
                    (column.sortable ?? sortable) && 'cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-300',
                    column.headerClassName
                  )}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                  }}
                  onClick={() => (column.sortable ?? sortable) && handleSort(String(column.key))}
                >
                  <div className={cn(
                    'flex items-center gap-1.5',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-start',
                    column.align !== 'center' && column.align !== 'right' && 'justify-end'
                  )}>
                    {column.header}
                    {(column.sortable ?? sortable) && (
                      <SortIcon
                        active={sortState?.key === column.key}
                        direction={sortState?.key === column.key ? sortState.direction : undefined}
                      />
                    )}
                  </div>
                </th>
              ))}
              {rowActions && (
                <th className={cn(cellPadding, 'text-center w-16')}>
                  <span className="sr-only">إجراءات</span>
                </th>
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody className={cn('divide-y divide-zinc-100 dark:divide-zinc-800', bodyClassName)}>
            {isLoading ? (
              <TableSkeleton columns={columns.length + (rowActions ? 1 : 0)} rows={pageSize} />
            ) : paginatedData.length === 0 ? (
              <EmptyState
                message={emptyMessage}
                icon={emptyIcon}
                colSpan={columns.length + (rowActions ? 1 : 0)}
              />
            ) : (
              <AnimatePresence mode="wait">
                {paginatedData.map((row, index) => (
                  <motion.tr
                    key={getRowKey(row, index)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      'bg-white dark:bg-zinc-900',
                      striped && index % 2 === 1 && 'bg-zinc-50 dark:bg-zinc-800/30',
                      hoverable && 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                      onRowClick && 'cursor-pointer',
                      typeof rowClassName === 'function' ? rowClassName(row, index) : rowClassName
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => {
                      const value = getCellValue(row, String(column.key));
                      return (
                        <td
                          key={String(column.key)}
                          className={cn(
                            cellPadding,
                            'text-sm text-zinc-700 dark:text-zinc-300',
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-left',
                            column.align !== 'center' && column.align !== 'right' && 'text-right',
                            column.className
                          )}
                        >
                          {column.render ? column.render(value, row, index) : value}
                        </td>
                      );
                    })}
                    {rowActions && (
                      <td className={cn(cellPadding, 'text-center')}>
                        {rowActions(row)}
                      </td>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && !isLoading && paginatedData.length > 0 && (
        <Pagination
          currentPage={controlledPage ?? currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          pageSizeOptions={pageSizeOptions}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}

const DataTable = memo(DataTableInner) as typeof DataTableInner;

export default DataTable;
