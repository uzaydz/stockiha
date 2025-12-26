/**
 * ⚡ مكون Pagination محسّن لصفحة طباعة الباركود
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { PaginationInfo } from '@/hooks/useProductsForBarcodePrintingOffline';

interface BarcodePaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export const BarcodePagination: React.FC<BarcodePaginationProps> = ({
  pagination,
  onPageChange,
  onPageSizeChange,
  onNext,
  onPrevious
}) => {
  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    hasNextPage,
    hasPreviousPage
  } = pagination;

  // حساب النطاق الحالي
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      {/* معلومات العدد */}
      <div className="text-sm text-muted-foreground">
        عرض <span className="font-medium">{startItem}</span> إلى{' '}
        <span className="font-medium">{endItem}</span> من أصل{' '}
        <span className="font-medium">{totalItems}</span> منتج
      </div>

      <div className="flex items-center gap-4">
        {/* حجم الصفحة */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">عرض:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* أزرار التنقل */}
        <div className="flex items-center gap-1">
          {/* الذهاب للصفحة الأولى */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={!hasPreviousPage}
            title="الصفحة الأولى"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>

          {/* الصفحة السابقة */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onPrevious}
            disabled={!hasPreviousPage}
            title="الصفحة السابقة"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* رقم الصفحة الحالي */}
          <div className="flex items-center justify-center h-8 min-w-[100px] px-3 text-sm">
            <span className="font-medium">{currentPage}</span>
            <span className="mx-1">/</span>
            <span className="text-muted-foreground">{totalPages}</span>
          </div>

          {/* الصفحة التالية */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onNext}
            disabled={!hasNextPage}
            title="الصفحة التالية"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* الذهاب للصفحة الأخيرة */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNextPage}
            title="الصفحة الأخيرة"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BarcodePagination;
