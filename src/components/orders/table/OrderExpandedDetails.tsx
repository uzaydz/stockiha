import { memo, Suspense, lazy, useMemo, useEffect } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Order } from "./OrderTableTypes";
import { Button } from "@/components/ui/button";
import { 
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useOrderDetails } from "@/hooks/useOrderDetails";

// Lazy load للمكونات الثقيلة
const OrderItemsList = lazy(() => import("./OrderItemsList"));
const OrderCustomerInfo = lazy(() => import("./OrderCustomerInfo"));
const OrderShippingInfo = lazy(() => import("./OrderShippingInfo"));
const OrderAddressInfo = lazy(() => import("./OrderAddressInfo"));

interface OrderExpandedDetailsProps {
  order: Order;
  visibleColumns: string[];
  currentUserId?: string;
  containerId?: string;
}

const LoadingSkeleton = memo(() => (
  <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-4 p-4 w-full">
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-4 w-24" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-4 w-24" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-4 w-24" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-4 w-24" />
    </div>
  </div>
));

LoadingSkeleton.displayName = "LoadingSkeleton";

const OrderExpandedDetails = memo(({
  order,
  visibleColumns,
  currentUserId,
  containerId,
}: OrderExpandedDetailsProps) => {
  const headingId = useMemo(() => `order-details-title-${order.id}`,[order.id]);
  const readableOrderNumber = useMemo(() => `#${order.customer_order_number || String(order.id).slice(0,8)}`,[order.customer_order_number, order.id]);

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value)
      .then(() => toast.success(`تم نسخ ${label} بنجاح`))
      .catch(() => toast.error(`تعذر نسخ ${label}`));
  };

  // تحميل تفاصيل العناصر بشكل Lazy عبر الهوك
  const { status: detailsStatus, data: detailsData, refetch } = useOrderDetails(order.id);

  // ابدأ التحميل فور فتح الصف (الحالة idle) لضمان ظهور التفاصيل مباشرة حتى بدون hover
  useEffect(() => {
    if (detailsStatus === 'idle') {
      refetch();
    }
  }, [detailsStatus, refetch]);

  return (
    <TableRow id={containerId} className="bg-muted/20 hover:bg-muted/30 transition-colors duration-200">
      <TableCell colSpan={visibleColumns.length} className="py-4 px-4 md:py-5 md:px-6 lg:py-6 lg:px-8">
        <div className="rounded-lg bg-background/95 border border-border/30 shadow-sm w-full" role="group" aria-labelledby={headingId}>
          <div className="p-4 md:p-5 lg:p-6 w-full">
            <div className="flex items-start justify-between gap-4">
              <h3 id={headingId} className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span className="truncate">تفاصيل الطلب <span dir="ltr">{readableOrderNumber}</span></span>
              </h3>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md"
                      onClick={() => copy(readableOrderNumber, 'رقم الطلب')}
                      aria-label="نسخ رقم الطلب"
                      title="نسخ رقم الطلب"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>نسخ رقم الطلب</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <Suspense fallback={<LoadingSkeleton />}>
              <div className="grid [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] grid-flow-row auto-rows-fr gap-4 md:gap-5 lg:gap-6 w-full">
                {/* معلومات العميل */}
                <div className="min-w-0">
                  <div className="h-full rounded-md border border-border/30 bg-background/60 p-4 w-full">
                    <OrderCustomerInfo order={order} />
                  </div>
                </div>
                
                {/* معلومات العنوان المحسنة */}
                <div className="min-w-0">
                  <div className="h-full rounded-md border border-border/30 bg-background/60 p-4 w-full">
                    <OrderAddressInfo order={order} />
                  </div>
                </div>
                
                {/* معلومات الشحن */}
                <div className="min-w-0">
                  <div className="h-full rounded-md border border-border/30 bg-background/60 p-4 w-full">
                    <OrderShippingInfo order={order} />
                  </div>
                </div>
                
                {/* عناصر الطلب */}
                <div className="xl:col-span-2 min-w-0">
                  <div className="h-full rounded-md border border-border/30 bg-background/60 p-4 w-full">
                    {(() => {
                      const itemsFromServer = (detailsData as any)?.order_items as any[] | undefined;
                      const itemsFromOrder = (order as any)?.order_items as any[] | undefined;
                      const effectiveItems = itemsFromServer ?? itemsFromOrder ?? [];

                      if ((detailsStatus === 'loading' || detailsStatus === 'idle') && effectiveItems.length === 0) {
                        return <LoadingSkeleton />;
                      }
                      if (detailsStatus === 'error' && effectiveItems.length === 0) {
                        return (
                          <div className="text-sm text-destructive">
                            تعذر تحميل تفاصيل العناصر.
                            <Button variant="outline" size="sm" className="ml-2" onClick={() => refetch()}>إعادة المحاولة</Button>
                          </div>
                        );
                      }

                      return (
                        <OrderItemsList
                          order={{ ...order, order_items: effectiveItems }}
                          currentUserId={currentUserId}
                        />
                      );
                    })()}
                  </div>
                </div>
              </div>
            </Suspense>
            
            {/* ملاحظات إضافية */}
            {order.notes && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h4 className="text-sm font-medium text-muted-foreground">ملاحظات</h4>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md"
                          onClick={() => copy(order.notes as unknown as string, 'الملاحظات')}
                          aria-label="نسخ الملاحظات"
                          title="نسخ الملاحظات"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>نسخ الملاحظات</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="rounded-md border border-border/30 bg-background/60 p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words" title={order.notes as unknown as string}>
                    {order.notes}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
});

OrderExpandedDetails.displayName = "OrderExpandedDetails";

export default OrderExpandedDetails;
