import { memo } from "react";
import { Button } from "@/components/ui/button";

interface OrdersTablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  ordersLength: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  hasMoreOrders: boolean;
  loading: boolean;
  onPageChange?: (page: number) => void;
  onLoadMore?: () => void;
}

const OrdersTablePagination = memo(({
  currentPage,
  pageSize,
  totalItems,
  ordersLength,
  hasNextPage,
  hasPreviousPage,
  hasMoreOrders,
  loading,
  onPageChange,
  onLoadMore,
}: OrdersTablePaginationProps) => {
  const effectiveTotal = (totalItems ?? ordersLength) || 0;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));
  const hasAny = effectiveTotal > 0;
  const rangeStart = hasAny ? (currentPage - 1) * pageSize + 1 : 0;
  const rangeEnd = hasAny ? Math.min(currentPage * pageSize, effectiveTotal) : 0;
  
  return (
    <div className="py-4 px-6 bg-gradient-to-r from-muted/20 to-muted/10 border-t border-border/30 flex items-center justify-between">
      <div className="text-sm text-muted-foreground" aria-live="polite">
        {hasAny ? (
          <>
            عرض <span className="font-semibold text-foreground bg-accent/50 px-2 py-1 rounded-md">{rangeStart}</span>
            {" "}إلى{" "}
            <span className="font-semibold text-foreground bg-accent/50 px-2 py-1 rounded-md">{rangeEnd}</span>
            {" "}من إجمالي{" "}
            <span className="font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">{effectiveTotal}</span> طلب
          </>
        ) : (
          <span>لا توجد طلبات للعرض</span>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {onPageChange ? (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!hasPreviousPage || currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-4 py-2 rounded-lg border-border/40 bg-background/70 hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 disabled:opacity-50"
            >
              السابق
            </Button>
            <div className="text-sm text-muted-foreground bg-muted/20 px-3 py-2 rounded-lg border border-border/30" aria-live="polite">
              صفحة <span className="font-semibold text-foreground">{hasAny ? currentPage : 0}</span> من <span className="font-semibold text-foreground">{hasAny ? totalPages : 0}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!hasNextPage}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-4 py-2 rounded-lg border-border/40 bg-background/70 hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 disabled:opacity-50"
            >
              التالي
            </Button>
          </>
        ) : onLoadMore ? (
          <Button 
            variant="outline" 
            size="sm" 
            disabled={!hasMoreOrders || loading}
            onClick={onLoadMore}
            className="px-6 py-2 rounded-lg border-border/40 bg-background/70 hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" disabled className="px-4 py-2 rounded-lg border-border/40 bg-muted/20 text-muted-foreground">السابق</Button>
            <Button variant="outline" size="sm" disabled className="px-4 py-2 rounded-lg border-border/40 bg-muted/20 text-muted-foreground">التالي</Button>
          </>
        )}
      </div>
    </div>
  );
});

OrdersTablePagination.displayName = "OrdersTablePagination";

export default OrdersTablePagination;
