import { memo, useMemo, useState, useCallback, useEffect } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Order } from "./OrderTableTypes";
import { useOrderDetails } from "@/hooks/useOrderDetails";
import ExpandedHeader from "./expanded/ExpandedHeader";
import ExpandedInfoGrid from "./expanded/ExpandedInfoGrid";
import ExpandedNotes from "./expanded/ExpandedNotes";
import OrderEditDialog from "../dialogs/OrderEditDialog";

// تمت تجزئة المكوّنات الثقيلة إلى مكونات فرعية مميموة

interface OrderExpandedDetailsProps {
  order: Order;
  visibleColumns?: string[];
  currentUserId?: string;
  containerId?: string;
  localUpdates?: Record<string, any>;
  onOrderUpdated?: (orderId: string, updatedOrder: any) => void;
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
  visibleColumns = [],
  currentUserId,
  containerId = `order-expanded-${order.id}`,
  localUpdates = {},
  onOrderUpdated,
}: OrderExpandedDetailsProps) => {
  const headingId = useMemo(() => `order-details-title-${order.id}`,[order.id]);
  const readableOrderNumber = useMemo(() => `#${order.customer_order_number || String(order.id).slice(0,8)}`,[order.customer_order_number, order.id]);

  // دمج التحديثات المحلية مع بيانات الطلب
  const updatedOrder = useMemo(() => {
    const localUpdate = localUpdates[order.id];
    return localUpdate ? { ...order, ...localUpdate } : order;
  }, [order, localUpdates]);

  const copyNotes = useCallback(() => {
    const v = (updatedOrder.notes as unknown as string) || '';
    navigator.clipboard.writeText(v).catch(() => {});
  }, [updatedOrder.notes]);

  // تحميل تفاصيل العناصر عند الحاجة فقط (Fallback)
  // عند فتح التفاصيل لأول مرة، سنجلب العناصر عند الحاجة، مع استخدام كاش داخلي
  const { status: detailsStatus, data: detailsData, refetch } = useOrderDetails(updatedOrder?.id);

  // عند فتح تفاصيل الطلب، ابدأ جلب العناصر تلقائياً إذا لم تكن متوفرة
  useEffect(() => {
    const items = (detailsData as any)?.order_items as any[] | undefined;
    if (updatedOrder?.id && (!items || items.length === 0) && detailsStatus !== 'loading') {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatedOrder?.id]);

  // استخدام التحديثات المحلية فقط - لا حاجة لإعادة جلب البيانات


  // وضع التحرير الجديد
  const [editDialogOpen, setEditDialogOpen] = useState(false);



  return (
    <>
      <TableRow id={containerId} className="bg-gradient-to-r from-muted/30 to-muted/20 hover:from-muted/40 hover:to-muted/30 transition-colors duration-200">
        <TableCell colSpan={visibleColumns?.length || 10} className="py-5 px-6">
          <div className="rounded-xl bg-background border-2 border-border/40 shadow-md w-full overflow-hidden" role="group" aria-labelledby={headingId}>
            <div className="p-6 w-full bg-gradient-to-br from-background to-muted/5">
              <ExpandedHeader
                headingId={headingId}
                readableOrderNumber={readableOrderNumber}
                isEditing={false}
                saving={false}
                onEdit={() => setEditDialogOpen(true)}
                onCancel={() => {}}
                onSave={() => {}}
              />
              
              {(() => {
                // استخدام العناصر من الطلب - أولوية للعناصر المحملة مع الطلب
                const itemsFromOrder = (updatedOrder as any)?.order_items as any[] | undefined;
                const itemsFromServer = (detailsData as any)?.order_items as any[] | undefined;
                // أولوية للعناصر المحملة مع الطلب، ثم من السيرفر
                const effectiveItems = itemsFromOrder && itemsFromOrder.length > 0 
                  ? itemsFromOrder 
                  : itemsFromServer && itemsFromServer.length > 0
                  ? itemsFromServer
                  : [];
                
                // تشخيص لعناصر الطلب
                if (process.env.NODE_ENV === 'development') {
                  console.log('OrderExpandedDetails Items Debug:', {
                    orderId: order.id,
                    itemsFromOrderCount: itemsFromOrder?.length || 0,
                    itemsFromServerCount: itemsFromServer?.length || 0,
                    effectiveItemsCount: effectiveItems.length,
                    detailsStatus,
                    hasOrderItems: !!(updatedOrder as any)?.order_items
                  });
                }
                
                const currentStatus = effectiveItems.length > 0 ? 'success' : detailsStatus;
                
                return (
                <ExpandedInfoGrid
                  order={updatedOrder}
                  currentUserId={currentUserId}
                  isEditing={false}
                  draft={{ items: effectiveItems }}
                  detailsStatus={currentStatus}
                  detailsItems={effectiveItems}
                  onChangeDraft={() => {}}
                  onRefetch={refetch}
                />
                );
              })()}
              
              <ExpandedNotes
                isEditing={false}
                notes={updatedOrder.notes}
                draftNotes={updatedOrder.notes}
                onCopy={() => {
                  const v = (updatedOrder.notes as unknown as string) || '';
                  navigator.clipboard.writeText(v).catch(() => {});
                }}
                onChange={() => {}}
              />
            </div>
          </div>
        </TableCell>
      </TableRow>
      
      {/* حوار التعديل الجديد */}
      <OrderEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        order={updatedOrder}
        onOrderUpdated={(updatedOrder) => {
          if (onOrderUpdated) {
            onOrderUpdated(updatedOrder.id, updatedOrder);
          }
        }}
      />
    </>
  );
});

OrderExpandedDetails.displayName = "OrderExpandedDetails";

export default OrderExpandedDetails;
