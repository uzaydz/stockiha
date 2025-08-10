import React, { memo, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const OrderCustomerInfo = React.lazy(() => import("../OrderCustomerInfo"));
const OrderAddressInfo = React.lazy(() => import("../OrderAddressInfo"));
const OrderShippingInfo = React.lazy(() => import("../OrderShippingInfo"));
const OrderItemsList = React.lazy(() => import("../OrderItemsList"));

interface ExpandedInfoGridProps {
  order: any;
  currentUserId?: string;
  isEditing: boolean;
  draft: any;
  detailsStatus: 'idle' | 'loading' | 'success' | 'error';
  detailsItems: any[];
  onChangeDraft: (path: string, value: any) => void;
  onRefetch: () => void;
}

const ExpandedInfoGrid: React.FC<ExpandedInfoGridProps> = ({
  order,
  currentUserId,
  isEditing,
  draft,
  detailsStatus,
  detailsItems,
  onChangeDraft,
  onRefetch,
}) => {
  const effectiveItems = detailsItems;
  return (
    <Suspense fallback={<div className="p-4">جاري التحميل...</div>}>
      <div 
        className="grid [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] grid-flow-row auto-rows-fr gap-4 md:gap-5 lg:gap-6 w-full" 
        style={{ 
          contain: 'layout', 
          contentVisibility: 'auto' as any,
          willChange: isEditing ? 'contents' : 'auto'
        }}
      >
        <div className="min-w-0">
          <div className="h-full rounded-md border border-border/30 bg-background/60 p-4 w-full">
            {!isEditing ? (
              <OrderCustomerInfo order={order} />
            ) : (
              <div className="space-y-3">
                <Input value={draft.form_data.fullName} onChange={(e)=>onChangeDraft('form_data.fullName', e.target.value)} placeholder="اسم العميل" />
                <Input value={draft.form_data.phone} onChange={(e)=>onChangeDraft('form_data.phone', e.target.value)} placeholder="رقم الهاتف" dir="ltr" />
                <Input value={draft.form_data.email} onChange={(e)=>onChangeDraft('form_data.email', e.target.value)} placeholder="البريد الإلكتروني" dir="ltr" />
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="h-full rounded-md border border-border/30 bg-background/60 p-4 w-full">
            {!isEditing ? (
              <OrderAddressInfo order={order} />
            ) : (
              <div className="space-y-3">
                <Input value={draft.form_data.address} onChange={(e)=>onChangeDraft('form_data.address', e.target.value)} placeholder="عنوان الشارع" />
                <Input value={draft.form_data.province} onChange={(e)=>onChangeDraft('form_data.province', e.target.value)} placeholder="الولاية" />
                <Input value={draft.form_data.municipality} onChange={(e)=>onChangeDraft('form_data.municipality', e.target.value)} placeholder="البلدية" />
                <Input value={draft.form_data.stopDeskId} onChange={(e)=>onChangeDraft('form_data.stopDeskId', e.target.value)} placeholder="مكتب الاستلام (إن وجد)" />
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="h-full rounded-md border border-border/30 bg-background/60 p-4 w-full">
            {!isEditing ? (
              <OrderShippingInfo order={order} />
            ) : (
              <div className="space-y-3">
                <Input value={draft.order.shipping_method} onChange={(e)=>onChangeDraft('order.shipping_method', e.target.value)} placeholder="طريقة الشحن" />
                <Input value={String(draft.order.shipping_cost)} onChange={(e)=>onChangeDraft('order.shipping_cost', e.target.value)} placeholder="تكلفة الشحن" />
                <Input value={draft.order.shipping_option} onChange={(e)=>onChangeDraft('order.shipping_option', e.target.value)} placeholder="نوع التوصيل" />
                <Input value={draft.order.shipping_provider} onChange={(e)=>onChangeDraft('order.shipping_provider', e.target.value)} placeholder="مزود الشحن" />
                <Input value={draft.order.yalidine_tracking_id} onChange={(e)=>onChangeDraft('order.yalidine_tracking_id', e.target.value)} placeholder="Yalidine Tracking" dir="ltr" />
                <Input value={draft.order.zrexpress_tracking_id} onChange={(e)=>onChangeDraft('order.zrexpress_tracking_id', e.target.value)} placeholder="ZR Express Tracking" dir="ltr" />
                <Input value={draft.order.ecotrack_tracking_id} onChange={(e)=>onChangeDraft('order.ecotrack_tracking_id', e.target.value)} placeholder="Ecotrack Tracking" dir="ltr" />
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 min-w-0">
          <div className="h-full rounded-md border border-border/30 bg-background/60 p-4 w-full">
            {(() => {
              if ((detailsStatus === 'loading') && effectiveItems.length === 0) {
                return <div className="text-sm text-muted-foreground">جاري تحميل العناصر...</div>;
              }
              if (detailsStatus === 'error' && effectiveItems.length === 0) {
                return (
                  <div className="text-sm text-destructive">
                    تعذر تحميل تفاصيل العناصر.
                    <Button variant="outline" size="sm" className="ml-2" onClick={onRefetch}>إعادة المحاولة</Button>
                  </div>
                );
              }
              if (effectiveItems.length === 0) {
                return (
                  <div className="text-sm text-muted-foreground">
                    لا توجد عناصر محمّلة. <Button variant="outline" size="sm" className="ml-2" onClick={onRefetch}>تحميل العناصر</Button>
                  </div>
                );
              }
              return (
                <OrderItemsList
                  order={{ ...order, order_items: effectiveItems }}
                  currentUserId={currentUserId}
                  editable={isEditing}
                  items={draft.items || effectiveItems}
                  onItemChange={(index, changes) => {
                    const currentItems = draft.items || effectiveItems;
                    const updatedItems = currentItems.map((it: any, i: number) => 
                      i === index ? {
                        ...it,
                        ...changes,
                        total_price: Number(changes.unit_price ?? it.unit_price ?? 0) * Number(changes.quantity ?? it.quantity ?? 0)
                      } : it
                    );
                    onChangeDraft('items', updatedItems);
                  }}
                  onItemDelete={(index) => {
                    const currentItems = draft.items || effectiveItems;
                    const filteredItems = currentItems.filter((_: any, i: number) => i !== index);
                    onChangeDraft('items', filteredItems);
                  }}
                  onItemAdd={() => {
                    const currentItems = draft.items || effectiveItems;
                    const newItems = [...currentItems, {
                      product_id: null,
                      product_name: '',
                      quantity: 1,
                      unit_price: 0,
                      total_price: 0,
                      color_id: null,
                      color_name: null,
                      size_id: null,
                      size_name: null,
                    }];
                    onChangeDraft('items', newItems);
                  }}
                />
              );
            })()}
          </div>
        </div>
      </div>
    </Suspense>
  );
};

export default memo(ExpandedInfoGrid);


