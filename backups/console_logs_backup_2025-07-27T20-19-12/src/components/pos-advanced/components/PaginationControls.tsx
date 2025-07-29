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
    <div className="flex items-center justify-between px-4 py-3 bg-card border-t border-border transition-colors backdrop-blur-sm">
      {/* معلومات العرض */}
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-muted-foreground">
          عرض <span className="text-foreground font-medium">{startItem}</span> إلى{' '}
          <span className="text-foreground font-medium">{endItem}</span> من{' '}
          <span className="text-foreground font-medium">{totalItems}</span> منتج
        </span>
        
        {/* اختيار حجم الصفحة */}
        <div className="flex items-center space-x-2 mr-6">
          <span className="text-foreground text-xs">عدد المنتجات:</span>
          <Select 
            value={(pageSize || 30).toString()} 
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-20 h-8 border-border bg-background hover:bg-muted/50 transition-colors">
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
      <div className="flex items-center space-x-1">
        {/* الذهاب للصفحة الأولى */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || isLoading}
          className="h-8 w-8 p-0 hover:bg-muted/50 border-border transition-colors disabled:opacity-30"
          title="الصفحة الأولى"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
        
        {/* الصفحة السابقة */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="h-8 w-8 p-0 hover:bg-muted/50 border-border transition-colors disabled:opacity-30"
          title="الصفحة السابقة"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* معلومات الصفحة الحالية */}
        <div className="flex items-center px-3 mx-2 py-1 rounded-md bg-muted/30 border border-border/50">
          {isLoading && (
            <Loader2 className="h-3 w-3 animate-spin ml-2 text-primary" />
          )}
          <span className="text-sm text-foreground font-medium whitespace-nowrap">
            صفحة {currentPage} من {totalPages}
          </span>
        </div>

        {/* الصفحة التالية */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading || totalPages === 0}
          className="h-8 w-8 p-0 hover:bg-muted/50 border-border transition-colors disabled:opacity-30"
          title="الصفحة التالية"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* الذهاب للصفحة الأخيرة */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || isLoading || totalPages === 0}
          className="h-8 w-8 p-0 hover:bg-muted/50 border-border transition-colors disabled:opacity-30"
          title="الصفحة الأخيرة"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;
