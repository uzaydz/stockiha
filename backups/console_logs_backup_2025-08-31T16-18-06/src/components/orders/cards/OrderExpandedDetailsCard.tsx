import { memo, Suspense, lazy, useMemo, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Order } from "../table/OrderTableTypes";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateOnlineOrderFull } from "@/api/orders";
import { useTenant } from "@/context/TenantContext";

// Lazy load للمكونات الثقيلة
const OrderItemsList = lazy(() => import("../table/OrderItemsList"));
const OrderCustomerInfo = lazy(() => import("../table/OrderCustomerInfo"));
const OrderShippingInfo = lazy(() => import("../table/OrderShippingInfo"));
const OrderAddressInfo = lazy(() => import("../table/OrderAddressInfo"));

interface OrderExpandedDetailsCardProps {
  order: Order;
  currentUserId?: string;
}

const LoadingSkeleton = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 w-full">
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

const OrderExpandedDetailsCard = memo(({
  order,
  currentUserId,
}: OrderExpandedDetailsCardProps) => {
  const { currentOrganization } = useTenant();
  const readableOrderNumber = useMemo(() => 
    `#${order.customer_order_number || String(order.id).slice(0,8)}`,
    [order.customer_order_number, order.id]
  );

  // تحديث بيانات الطلب
  const [draft, setDraft] = useState({
    notes: order.notes || "",
    customerNote: order.metadata?.customer_note || "",
  });
  const [saving, setSaving] = useState(false);

  // دالة النسخ إلى الحافظة
  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`تم نسخ ${label} بنجاح`);
    } catch (err) {
      toast.error(`فشل في نسخ ${label}`);
    }
  }, []);

  // حفظ التحديثات
  const saveUpdates = useCallback(async () => {
    if (saving) return;
    
    try {
      setSaving(true);
      await updateOnlineOrderFull(order.id, {
        notes: draft.notes,
        metadata: {
          ...order.metadata,
          customer_note: draft.customerNote,
        },
      }, currentOrganization?.id);
      
      toast.success("تم حفظ التحديثات بنجاح");
    } catch (error) {
      toast.error("فشل في حفظ التحديثات");
    } finally {
      setSaving(false);
    }
  }, [currentOrganization?.id, order.id, draft]);

  return (
    <div className="rounded-lg bg-background/95 border border-border/30 shadow-sm w-full">
      <div className="p-4 w-full">
        <div className="flex items-start justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            <span className="truncate">تفاصيل الطلب <span dir="ltr">{readableOrderNumber}</span></span>
          </h3>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(order.id, 'معرف الطلب')}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>نسخ معرف الطلب</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* معلومات العميل */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground border-b border-border/20 pb-2">
                معلومات العميل
              </h4>
              <OrderCustomerInfo order={order} />
            </div>

            {/* معلومات الشحن */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground border-b border-border/20 pb-2">
                معلومات الشحن
              </h4>
              <OrderShippingInfo order={order} />
            </div>

            {/* عنوان التوصيل */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground border-b border-border/20 pb-2">
                عنوان التوصيل
              </h4>
              <OrderAddressInfo order={order} />
            </div>

            {/* ملاحظات الطلب */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground border-b border-border/20 pb-2">
                الملاحظات
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    ملاحظات إدارية
                  </label>
                  <Textarea
                    value={draft.notes}
                    onChange={(e) => setDraft(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="أضف ملاحظات إدارية..."
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    ملاحظات العميل
                  </label>
                  <Textarea
                    value={draft.customerNote}
                    onChange={(e) => setDraft(prev => ({ ...prev, customerNote: e.target.value }))}
                    placeholder="ملاحظات من العميل..."
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <Button
                  onClick={saveUpdates}
                  disabled={saving}
                  size="sm"
                  className="w-full"
                >
                  {saving ? "جاري الحفظ..." : "حفظ الملاحظات"}
                </Button>
              </div>
            </div>
          </div>

          {/* عناصر الطلب */}
          <div className="mt-6">
            <h4 className="font-semibold text-foreground border-b border-border/20 pb-2 mb-4">
              عناصر الطلب
            </h4>
            <OrderItemsList order={order} />
          </div>
        </Suspense>
      </div>
    </div>
  );
});

OrderExpandedDetailsCard.displayName = "OrderExpandedDetailsCard";

export default OrderExpandedDetailsCard;
