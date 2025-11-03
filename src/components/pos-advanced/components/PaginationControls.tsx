import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
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
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  isLoading = false
}) => {
  const pageSizeOptions = [10, 20, 30, 50, 100];
  
  const startItem = Math.max(1, (currentPage - 1) * pageSize + 1);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 bg-card border-t border-border transition-colors backdrop-blur-sm">
      {/* معلومات العرض */}
      <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 text-xs sm:text-sm w-full sm:w-auto">
        <span className="text-muted-foreground text-center sm:text-right">
          <span className="text-foreground font-medium">{startItem}</span>-<span className="text-foreground font-medium">{endItem}</span> <span className="hidden sm:inline">من</span> <span className="text-foreground font-medium">{totalItems}</span>
        </span>
        
        {/* اختيار حجم الصفحة */}
        <div className="flex items-center gap-1.5 sm:gap-2 sm:mr-4">
          <span className="text-foreground text-[10px] sm:text-xs">عدد:</span>
          <Select 
            value={(pageSize || 30).toString()} 
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-16 sm:w-20 h-7 sm:h-8 border-border bg-background hover:bg-muted/50 transition-colors text-xs sm:text-sm">
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
      </div>

      {/* أزرار التنقل */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {/* الذهاب للصفحة الأولى */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || isLoading}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-muted/50 border-border transition-colors disabled:opacity-30 hidden sm:flex"
          title="الصفحة الأولى"
        >
          <ChevronsRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        
        {/* الصفحة السابقة */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-muted/50 border-border transition-colors disabled:opacity-30"
          title="السابقة"
        >
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>

        {/* معلومات الصفحة الحالية */}
        <div className="flex items-center px-1.5 sm:px-2 md:px-3 mx-0.5 sm:mx-1 md:mx-2 py-0.5 sm:py-1 rounded-md bg-muted/30 border border-border/50">
          {isLoading && (
            <Loader2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin ml-1 sm:ml-2 text-primary" />
          )}
          <span className="text-[10px] sm:text-xs md:text-sm text-foreground font-medium whitespace-nowrap">
            {currentPage}/{totalPages}
          </span>
        </div>

        {/* الصفحة التالية */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading || totalPages === 0}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-muted/50 border-border transition-colors disabled:opacity-30"
          title="التالية"
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        
        {/* الذهاب للصفحة الأخيرة */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || isLoading || totalPages === 0}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-muted/50 border-border transition-colors disabled:opacity-30 hidden sm:flex"
          title="الأخيرة"
        >
          <ChevronsLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;
