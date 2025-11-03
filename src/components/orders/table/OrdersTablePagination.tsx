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
    <div className="py-3 px-4 bg-muted/10 border-t border-border/30 flex items-center justify-between">
      <div className="text-xs text-muted-foreground" aria-live="polite">
        {hasAny ? (
          <div className="flex items-center gap-1.5">
            <span>عرض</span>
            <span className="font-semibold text-foreground bg-muted/60 px-1.5 py-0.5 rounded">{rangeStart}</span>
            <span>إلى</span>
            <span className="font-semibold text-foreground bg-muted/60 px-1.5 py-0.5 rounded">{rangeEnd}</span>
            <span>من</span>
            <span className="font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{effectiveTotal}</span>
            <span>طلب</span>
          </div>
        ) : (
          <span>لا توجد طلبات للعرض</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onPageChange ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPreviousPage || currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-3 py-1.5 h-8 rounded-lg border-border/40 bg-card hover:bg-muted/60 hover:border-primary/30 transition-all disabled:opacity-50 text-xs"
            >
              السابق
            </Button>
            <div className="text-xs text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/30" aria-live="polite">
              <span className="font-semibold text-foreground">{hasAny ? currentPage : 0}</span>
              <span className="mx-1">/</span>
              <span className="font-semibold text-foreground">{hasAny ? totalPages : 0}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNextPage}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-3 py-1.5 h-8 rounded-lg border-border/40 bg-card hover:bg-muted/60 hover:border-primary/30 transition-all disabled:opacity-50 text-xs"
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
            className="px-4 py-1.5 h-8 rounded-lg border-border/40 bg-card hover:bg-muted/60 hover:border-primary/30 transition-all disabled:opacity-50 text-xs"
          >
            {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" disabled className="px-3 py-1.5 h-8 rounded-lg border-border/40 bg-muted/20 text-muted-foreground text-xs">السابق</Button>
            <Button variant="outline" size="sm" disabled className="px-3 py-1.5 h-8 rounded-lg border-border/40 bg-muted/20 text-muted-foreground text-xs">التالي</Button>
          </>
        )}
      </div>
    </div>
  );
});

OrdersTablePagination.displayName = "OrdersTablePagination";

export default OrdersTablePagination;
