import { memo, Suspense, lazy } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Order } from "./OrderTableTypes";

// Lazy load للمكونات الثقيلة
const OrderItemsList = lazy(() => import("./OrderItemsList"));
const OrderCustomerInfo = lazy(() => import("./OrderCustomerInfo"));
const OrderShippingInfo = lazy(() => import("./OrderShippingInfo"));
const OrderAddressInfo = lazy(() => import("./OrderAddressInfo"));

interface OrderExpandedDetailsProps {
  order: Order;
  visibleColumns: string[];
  currentUserId?: string;
}

const LoadingSkeleton = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
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
}: OrderExpandedDetailsProps) => {
  return (
    <TableRow className="bg-muted/20 hover:bg-muted/30 transition-colors duration-200">
      <TableCell colSpan={visibleColumns.length} className="py-6 px-8">
        <div className="rounded-lg bg-background/80 border border-border/30 shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              تفاصيل الطلب #{order.customer_order_number}
            </h3>
            
            <Suspense fallback={<LoadingSkeleton />}>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* معلومات العميل */}
                <div className="lg:col-span-1">
                  <OrderCustomerInfo order={order} />
                </div>
                
                {/* معلومات العنوان المحسنة */}
                <div className="lg:col-span-1">
                  <OrderAddressInfo order={order} />
                </div>
                
                {/* معلومات الشحن */}
                <div className="lg:col-span-1">
                  <OrderShippingInfo order={order} />
                </div>
                
                {/* عناصر الطلب */}
                <div className="lg:col-span-1">
                  <OrderItemsList 
                    order={order} 
                    currentUserId={currentUserId} 
                  />
                </div>
              </div>
            </Suspense>
            
            {/* ملاحظات إضافية */}
            {order.notes && (
              <div className="mt-6 pt-4 border-t border-border/30">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">ملاحظات</h4>
                <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md">
                  {order.notes}
                </p>
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
