import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage = 1,
  totalPages = 1,
  pageSize = 30,
  onPageChange,
  onPageSizeChange,
  isLoading = false
}) => {
  const pageSizeOptions = [10, 20, 30, 50, 100];

  // Handler مع logging للتشخيص
  const handlePageClick = (page: number) => {
    console.log(`[PaginationControls] 🖱️ Clicked page ${page}, currentPage=${currentPage}, totalPages=${totalPages}`);
    if (onPageChange) {
      onPageChange(page);
    } else {
      console.error('[PaginationControls] ❌ onPageChange is not defined!');
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      {/* أزرار التنقل - على اليمين */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className="h-8 w-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 min-w-[60px] justify-center">
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-orange-500" />}
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {currentPage} / {totalPages}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="h-8 w-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* عدد المنتجات في الصفحة */}
      <Select
        value={(pageSize || 30).toString()}
        onValueChange={(value) => onPageSizeChange(Number(value))}
        disabled={isLoading}
      >
        <SelectTrigger className="w-20 h-8 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pageSizeOptions.map(size => (
            <SelectItem key={size} value={size.toString()}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PaginationControls;
