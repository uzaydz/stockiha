import { memo, useEffect, useRef, CSSProperties } from "react";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { Order, OrdersTableProps } from "./OrderTableTypes";
import OrderTableRow from "./OrderTableRow";

// ⚡ استخراج inline styles كـ constants لتحسين الأداء
const CONTAIN_LAYOUT_STYLE: CSSProperties = { contain: 'layout' };
const TABLE_BODY_STYLE: CSSProperties = { contain: 'content', contentVisibility: 'auto' as any };
const SPACER_STYLE: CSSProperties = { height: 24, visibility: 'hidden' };

interface OrdersTableBodyProps {
  loading: boolean;
  filteredOrders: Order[];
  searchFilter: string;
  visibleColumns: string[];
  selectedOrders: string[];
  expandedOrders: Record<string, boolean>;
  onSelectOrder: (orderId: string, selected: boolean) => void;
  onToggleExpand: (orderId: string) => void;
  onUpdateStatus: OrdersTableProps['onUpdateStatus'];
  onUpdateCallConfirmation?: OrdersTableProps['onUpdateCallConfirmation'];
  onSendToProvider?: OrdersTableProps['onSendToProvider'];
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  currentUserId?: string;
  shippingProviders: OrdersTableProps['shippingProviders'];
  autoLoadMoreOnScroll?: boolean;
  onLoadMore?: () => void;
  onOrderUpdated?: (orderId: string, updatedOrder: any) => void;
  localUpdates?: Record<string, any>;
}

const OrdersTableBody = memo(({
  loading,
  filteredOrders,
  searchFilter,
  visibleColumns,
  selectedOrders,
  expandedOrders,
  onSelectOrder,
  onToggleExpand,
  onUpdateStatus,
  onUpdateCallConfirmation,
  onSendToProvider,
  hasUpdatePermission,
  hasCancelPermission,
  currentUserId,
  shippingProviders = [],
  autoLoadMoreOnScroll,
  onLoadMore,
  onOrderUpdated,
  localUpdates = {},
}: OrdersTableBodyProps) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!autoLoadMoreOnScroll || !onLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      }
    }, { root: null, rootMargin: '600px', threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [autoLoadMoreOnScroll, onLoadMore]);
  const renderLoadingSkeleton = () => (
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={`skeleton-${index}`} className="hover:bg-accent/10 border-b border-border/20 transition-all duration-300 transform-gpu" style={CONTAIN_LAYOUT_STYLE}>
        {visibleColumns.includes("checkbox") && (
          <TableCell className="py-5 px-6" style={CONTAIN_LAYOUT_STYLE}>
            <Skeleton className="h-5 w-5 bg-muted/60 rounded-md animate-pulse" />
          </TableCell>
        )}

        {visibleColumns.includes("expand") && (
          <TableCell className="py-5" style={CONTAIN_LAYOUT_STYLE}>
            <Skeleton className="h-5 w-5 bg-muted/60 rounded-md animate-pulse" />
          </TableCell>
        )}

        {visibleColumns.includes("id") && (
          <TableCell className="py-5 px-6" style={CONTAIN_LAYOUT_STYLE}>
            <Skeleton className="h-6 w-28 bg-muted/60 rounded-lg animate-pulse" />
          </TableCell>
        )}

        {visibleColumns.includes("customer_name") && (
          <TableCell className="py-5 px-6" style={CONTAIN_LAYOUT_STYLE}>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-36 bg-muted/60 rounded-lg animate-pulse" />
              <Skeleton className="h-4 w-24 bg-muted/40 rounded-md animate-pulse" />
            </div>
          </TableCell>
        )}

        {visibleColumns.includes("customer_contact") && (
          <TableCell className="py-5 px-6" style={CONTAIN_LAYOUT_STYLE}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 bg-muted/60 rounded-full animate-pulse" />
                <Skeleton className="h-5 w-20 bg-muted/60 rounded-lg animate-pulse" />
              </div>
              <Skeleton className="h-4 w-32 bg-muted/40 rounded-md animate-pulse" />
            </div>
          </TableCell>
        )}

        {visibleColumns.includes("total") && (
          <TableCell className="py-5 px-6" style={CONTAIN_LAYOUT_STYLE}>
            <Skeleton className="h-7 w-24 bg-muted/60 rounded-xl animate-pulse" />
          </TableCell>
        )}

        {visibleColumns.includes("status") && (
          <TableCell className="py-5 px-6" style={CONTAIN_LAYOUT_STYLE}>
            <Skeleton className="h-7 w-24 bg-muted/60 rounded-xl animate-pulse" />
          </TableCell>
        )}

        {/* عمود فريق التأكيد تم حذفه */}

        {visibleColumns.includes("assignee") && (
          <TableCell className="py-5 px-6" style={CONTAIN_LAYOUT_STYLE}>
            <Skeleton className="h-6 w-28 bg-muted/60 rounded-lg animate-pulse" />
          </TableCell>
        )}

        {visibleColumns.includes("call_confirmation") && (
          <TableCell className="py-5 px-6" style={CONTAIN_LAYOUT_STYLE}>
            <Skeleton className="h-7 w-24 bg-muted/60 rounded-xl animate-pulse" />
          </TableCell>
        )}

        {visibleColumns.includes("shipping_provider") && (
          <TableCell className="py-5 px-6" style={CONTAIN_LAYOUT_STYLE}>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full bg-muted/60 animate-pulse" />
              <Skeleton className="h-6 w-36 bg-muted/60 rounded-lg animate-pulse" />
            </div>
          </TableCell>
        )}

        {visibleColumns.includes("actions") && (
          <TableCell className="py-5 px-6" style={CONTAIN_LAYOUT_STYLE}>
            <div className="flex justify-end">
              <Skeleton className="h-9 w-9 bg-muted/60 rounded-xl animate-pulse" />
            </div>
          </TableCell>
        )}
      </TableRow>
    ))
  );

  const renderEmptyState = () => (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={visibleColumns.length} className="h-40 text-center">
        <div className="flex flex-col items-center justify-center text-muted-foreground py-16">
          <div className="p-6 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 mb-6 shadow-lg">
            <Search className="h-12 w-12 opacity-50" />
          </div>
          <p className="text-xl font-bold mb-3 text-foreground">لا توجد طلبات</p>
          <p className="text-sm text-muted-foreground max-w-md text-center leading-relaxed">
            {searchFilter ? 
              `لم يتم العثور على طلبات تطابق "${searchFilter}". جرب البحث بمصطلح آخر أو امسح الفلتر.` :
              "لم يتم العثور على أي طلبات حالياً. ستظهر الطلبات الجديدة هنا عند وصولها."
            }
          </p>
        </div>
      </TableCell>
    </TableRow>
  );

  const renderOrderRows = () => (
    filteredOrders.map((order) => (
      <OrderTableRow
        key={order.id}
        order={order}
        selected={selectedOrders.includes(order.id)}
        onSelect={onSelectOrder}
        onUpdateStatus={onUpdateStatus}
        onUpdateCallConfirmation={onUpdateCallConfirmation}
        onSendToProvider={onSendToProvider}
        hasUpdatePermission={hasUpdatePermission}
        hasCancelPermission={hasCancelPermission}
        visibleColumns={visibleColumns}
        expanded={!!expandedOrders[order.id]}
        onToggleExpand={() => onToggleExpand(order.id)}
        currentUserId={currentUserId}
        shippingProviders={shippingProviders}
        onOrderUpdated={onOrderUpdated}
        localUpdates={localUpdates}
      />
    ))
  );

  return (
    <TableBody style={TABLE_BODY_STYLE}>
      {loading ? renderLoadingSkeleton() :
       filteredOrders.length === 0 ? renderEmptyState() :
       renderOrderRows()}
      {/* Sentinel for infinite scroll */}
      {autoLoadMoreOnScroll && !loading && filteredOrders.length > 0 && (
        <TableRow>
          <TableCell colSpan={visibleColumns.length}>
            <div ref={sentinelRef} />
          </TableCell>
        </TableRow>
      )}
      {/* Spacer rows لتثبيت ارتفاع الجدول ومنع القفزات عند تحميل البيانات/توسيع الصفوف */}
      <TableRow aria-hidden>
        <TableCell colSpan={visibleColumns.length}>
          <div style={SPACER_STYLE} />
        </TableCell>
      </TableRow>
    </TableBody>
  );
});

OrdersTableBody.displayName = "OrdersTableBody";

export default OrdersTableBody;
