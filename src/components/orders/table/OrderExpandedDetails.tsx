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
      <TableRow id={containerId} className="bg-muted/20 hover:bg-muted/30 transition-colors duration-200 transform-gpu" style={{ contain: 'layout' }}>
        <TableCell colSpan={visibleColumns?.length || 10} className="py-4 px-4 md:py-5 md:px-6 lg:py-6 lg:px-8" style={{ contain: 'layout' }}>
          <div className="rounded-lg bg-background/95 border border-border/30 shadow-sm w-full transform-gpu" role="group" aria-labelledby={headingId} style={{ contain: 'layout' }}>
            <div className="p-4 md:p-5 lg:p-6 w-full" style={{ contain: 'layout' }}>
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
                // استخدام العناصر المحدثة محلياً فقط - لا حاجة للخادم
                const itemsFromOrder = (updatedOrder as any)?.order_items as any[] | undefined;
                const itemsFromServer = (detailsData as any)?.order_items as any[] | undefined;
                // أولوية للتحديثات المحلية، ثم البيانات المحفوظة، ثم الخادم
                const effectiveItems = itemsFromOrder ?? itemsFromServer ?? [];
                return (
                <ExpandedInfoGrid
                  order={updatedOrder}
                  currentUserId={currentUserId}
                  isEditing={false}
                  draft={{ items: effectiveItems }}
                  detailsStatus="success" // نجح التحديث المحلي
                  detailsItems={effectiveItems}
                  onChangeDraft={() => {}}
                  onRefetch={() => {}} // لا حاجة لإعادة جلب
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
