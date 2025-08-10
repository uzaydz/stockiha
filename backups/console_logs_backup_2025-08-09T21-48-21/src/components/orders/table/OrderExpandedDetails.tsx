import { memo, useMemo, useState, useCallback, useEffect } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Order } from "./OrderTableTypes";
import { useOrderDetails } from "@/hooks/useOrderDetails";
import { updateOnlineOrderFull } from "@/api/orders";
import { useTenant } from "@/context/TenantContext";
import { useOptimizedOrdersData } from "@/hooks/useOptimizedOrdersData";
import { toast } from "sonner";
import ExpandedHeader from "./expanded/ExpandedHeader";
import ExpandedInfoGrid from "./expanded/ExpandedInfoGrid";
import ExpandedNotes from "./expanded/ExpandedNotes";

// تمت تجزئة المكوّنات الثقيلة إلى مكونات فرعية مميموة

interface OrderExpandedDetailsProps {
  order: Order;
  visibleColumns?: string[];
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
  visibleColumns = [],
  currentUserId,
  containerId = `order-expanded-${order.id}`,
}: OrderExpandedDetailsProps) => {
  const { currentOrganization } = useTenant();
  const { updateOrderLocally } = useOptimizedOrdersData({ readOnly: true });
  const headingId = useMemo(() => `order-details-title-${order.id}`,[order.id]);
  const readableOrderNumber = useMemo(() => `#${order.customer_order_number || String(order.id).slice(0,8)}`,[order.customer_order_number, order.id]);

  const copyNotes = useCallback(() => {
    const v = (order.notes as unknown as string) || '';
    navigator.clipboard.writeText(v).catch(() => {});
  }, [order.notes]);

  // تحميل تفاصيل العناصر عند الحاجة فقط (Fallback)
  // عند فتح التفاصيل لأول مرة، سنجلب العناصر عند الحاجة، مع استخدام كاش داخلي
  const { status: detailsStatus, data: detailsData, refetch } = useOrderDetails(order?.id);

  // عند فتح تفاصيل الطلب، ابدأ جلب العناصر تلقائياً إذا لم تكن متوفرة
  useEffect(() => {
    const items = (detailsData as any)?.order_items as any[] | undefined;
    if (order?.id && (!items || items.length === 0) && detailsStatus !== 'loading') {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  // وضع التحرير الشامل
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<any>(() => ({
    order: {
      status: order.status,
      notes: order.notes || '',
      shipping_method: order.shipping_method || '',
      shipping_cost: order.shipping_cost || 0,
      shipping_option: order.shipping_option || (order.form_data?.deliveryOption ?? ''),
      shipping_provider: (order as any).shipping_provider || '',
      yalidine_tracking_id: (order as any).yalidine_tracking_id || '',
      zrexpress_tracking_id: (order as any).zrexpress_tracking_id || '',
      ecotrack_tracking_id: (order as any).ecotrack_tracking_id || '',
    },
    form_data: {
      fullName: order.customer?.name || order.form_data?.fullName || '',
      phone: order.customer?.phone || order.form_data?.phone || '',
      email: order.customer?.email || order.form_data?.email || '',
      address: order.shipping_address?.street_address || order.form_data?.address || '',
      province: (order.shipping_address as any)?.province ?? order.shipping_address?.state ?? order.form_data?.province ?? '',
      municipality: order.shipping_address?.municipality ?? order.form_data?.municipality ?? '',
      deliveryOption: order.form_data?.deliveryOption || order.shipping_option || '',
      stopDeskId: (order as any).stop_desk_id || order.form_data?.stopDeskId || ''
    }
  }));

  const onChangeDraft = useCallback((path: string, value: any) => {
    setDraft((prev: any) => {
      const clone = { ...prev } as any;
      const keys = path.split('.');
      let obj = clone;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]] = { ...(obj[keys[i]] || {}) };
      obj[keys[keys.length - 1]] = value;
      return clone;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setSaving(true);
    try {
      // تحديد العناصر المراد حذفها (العناصر الموجودة في الأصل ولكن غير موجودة في المسودة)
      const originalItemIds = new Set((order.order_items || []).map((item: any) => item.id).filter(Boolean));
      const draftItemIds = new Set((draft.items || []).map((item: any) => item.id).filter(Boolean));
      const itemsToDelete = Array.from(originalItemIds).filter(id => !draftItemIds.has(id));

      const payload = {
        order: {
          status: draft.order.status || null,
          notes: draft.order.notes || null,
          shipping_method: draft.order.shipping_method || null,
          shipping_cost: Number(draft.order.shipping_cost) || 0,
          shipping_option: draft.order.shipping_option || null,
          shipping_provider: draft.order.shipping_provider || null,
          yalidine_tracking_id: draft.order.yalidine_tracking_id || null,
          zrexpress_tracking_id: draft.order.zrexpress_tracking_id || null,
          ecotrack_tracking_id: draft.order.ecotrack_tracking_id || null,
        },
        form_data: draft.form_data,
        items_upsert: Array.isArray(draft.items) ? draft.items.map((it:any) => ({
          id: it.id,
          product_id: it.product_id || null,
          product_name: it.product_name || '',
          quantity: Number(it.quantity||0),
          unit_price: Number(it.unit_price||0),
          total_price: Number(it.quantity||0) * Number(it.unit_price||0),
          color_id: it.color_id || null,
          color_name: it.color_name || null,
          color_code: it.color_code || null,
          size_id: it.size_id || null,
          size_name: it.size_name || null,
        })) : undefined,
        items_delete: itemsToDelete.length > 0 ? itemsToDelete.map(id => ({ id })) : undefined,
      };
      const { data, error } = await updateOnlineOrderFull(currentOrganization.id, order.id, payload);
      if (error) {
        toast.error(`فشل في حفظ التغييرات: ${error.message}`);
        return;
      }
      
      // تحديث تفاؤلي محلي
      if (data) {
        updateOrderLocally(order.id, {
          ...draft.order,
          order_items: draft.items || order.order_items,
        });
      }
      
      toast.success('تم حفظ التغييرات بنجاح');
      setIsEditing(false);
      setDraft(null);
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ التغييرات');
      console.error('Error saving order:', error);
    } finally {
      setSaving(false);
    }
  }, [currentOrganization?.id, order.id, draft, updateOrderLocally]);

  return (
    <TableRow id={containerId} className="bg-muted/20 hover:bg-muted/30 transition-colors duration-200">
      <TableCell colSpan={visibleColumns?.length || 10} className="py-4 px-4 md:py-5 md:px-6 lg:py-6 lg:px-8">
        <div className="rounded-lg bg-background/95 border border-border/30 shadow-sm w-full" role="group" aria-labelledby={headingId}>
          <div className="p-4 md:p-5 lg:p-6 w-full">
            <ExpandedHeader
              headingId={headingId}
              readableOrderNumber={readableOrderNumber}
              isEditing={isEditing}
              saving={saving}
              onEdit={() => setIsEditing(true)}
              onCancel={() => setIsEditing(false)}
              onSave={handleSave}
            />
            
            {(() => {
              const itemsFromServer = (detailsData as any)?.order_items as any[] | undefined;
              const itemsFromOrder = (order as any)?.order_items as any[] | undefined;
              const effectiveItems = itemsFromServer ?? itemsFromOrder ?? [];
              return (
                <ExpandedInfoGrid
                  order={order}
                  currentUserId={currentUserId}
                  isEditing={isEditing}
                  draft={draft}
                  detailsStatus={detailsStatus as any}
                  detailsItems={effectiveItems}
                  onChangeDraft={onChangeDraft}
                  onRefetch={refetch}
                />
              );
            })()}
            
            <ExpandedNotes
              isEditing={isEditing}
              notes={order.notes}
              draftNotes={draft.order.notes}
              onCopy={copyNotes}
              onChange={(v) => onChangeDraft('order.notes', v)}
            />
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
});

OrderExpandedDetails.displayName = "OrderExpandedDetails";

export default OrderExpandedDetails;
