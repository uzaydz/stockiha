import { memo, useMemo } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { PhoneCall } from "lucide-react";
import { OrderDetailsPanelProps } from "./OrderTableTypes";

// Import optimized components
import OrderDetailsBasicInfo from "./OrderDetailsBasicInfo";
import OrderDetailsItems from "./OrderDetailsItems";
import OrderDetailsCustomer from "./OrderDetailsCustomer";
import OrderDetailsShipping from "./OrderDetailsShipping";

// Import existing components
import CallConfirmationBadge from "../CallConfirmationBadge";
import OrderStatusDropdown from "../OrderStatusDropdown";
import CallConfirmationDropdown from "../CallConfirmationDropdown";
import ShippingProviderColumn from "./ShippingProviderColumn";

const OrderDetailsPanel = memo(({ 
  order,
  onUpdateStatus,
  onUpdateCallConfirmation, 
  onSendToProvider,
  hasUpdatePermission = false,
  hasCancelPermission = false,
  currentUserId,
  shippingProviders = []
}: OrderDetailsPanelProps & {
  onUpdateStatus?: (orderId: string, newStatus: string) => Promise<void>;
  onUpdateCallConfirmation?: (orderId: string, statusId: number, notes?: string) => Promise<void>;
  onSendToProvider?: (orderId: string, providerId: string) => void;
  hasUpdatePermission?: boolean;
  hasCancelPermission?: boolean;
  currentUserId?: string;
  shippingProviders?: any[];
}) => {
  // Memoize computed values to prevent unnecessary re-renders
  const orderData = useMemo(() => ({
    hasItems: order.order_items && order.order_items.length > 0,
    hasCustomer: !!order.customer,
    hasShippingAddress: !!order.shipping_address || !!order.shipping_address_id || !!order.form_data,
    hasCallConfirmation: !!order.call_confirmation_status,
  }), [
    order.order_items,
    order.customer,
    order.shipping_address,
    order.shipping_address_id,
    order.form_data,
    order.call_confirmation_status
  ]);

  return (
    <div className="p-2 sm:p-4 bg-muted/20 dark:bg-zinc-800/20">
      {/* Mobile Design */}
      <div className="block lg:hidden">
        <Accordion type="multiple" className="w-full space-y-2">
          
          {/* Basic Info - Open by default */}
          <AccordionItem value="basic-info" className="border rounded-lg bg-background/50">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                معلومات أساسية
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <OrderDetailsBasicInfo order={order} isMobile={true} />
            </AccordionContent>
          </AccordionItem>

          {/* Items */}
          {orderData.hasItems && (
            <AccordionItem value="items" className="border rounded-lg bg-background/50">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  المنتجات ({order.order_items?.length || 0})
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <OrderDetailsItems order={order} isMobile={true} />
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Customer Info */}
          {orderData.hasCustomer && (
            <AccordionItem value="customer" className="border rounded-lg bg-background/50">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  معلومات العميل
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <OrderDetailsCustomer order={order} isMobile={true} />
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Shipping Info */}
          {orderData.hasShippingAddress && (
            <AccordionItem value="shipping" className="border rounded-lg bg-background/50">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  عنوان التوصيل
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <OrderDetailsShipping order={order} isMobile={true} />
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Call Confirmation */}
          {orderData.hasCallConfirmation && (
            <AccordionItem value="call" className="border rounded-lg bg-background/50">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  تأكيد الإتصال
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="font-medium w-24">الحالة:</span>
                    <CallConfirmationBadge status={order.call_confirmation_status} showTooltip={false} />
                  </div>
                  
                  {order.call_confirmation_updated_at && (
                    <div className="flex items-start">
                      <span className="font-medium w-24">آخر تحديث:</span>
                      <span>{formatDateTime(order.call_confirmation_updated_at)}</span>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Quick Actions */}
          {hasUpdatePermission && (
            <AccordionItem value="actions" className="border rounded-lg bg-background/50">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  إجراءات سريعة
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {/* Order Status */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">حالة الطلب:</label>
                    <OrderStatusDropdown
                      currentStatus={order.status}
                      orderId={order.id}
                      onUpdateStatus={onUpdateStatus}
                      canCancel={hasCancelPermission}
                    />
                  </div>

                  {/* Call Confirmation */}
                  {onUpdateCallConfirmation && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">تأكيد الإتصال:</label>
                      <CallConfirmationDropdown
                        currentStatusId={order.call_confirmation_status_id || null}
                        orderId={order.id}
                        onUpdateStatus={(orderId, statusId, notes) => onUpdateCallConfirmation(orderId, statusId, notes)}
                        userId={currentUserId}
                      />
                    </div>
                  )}

                  {/* Shipping Provider */}
                  {onSendToProvider && shippingProviders.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">مزود الشحن:</label>
                      <ShippingProviderColumn
                        order={order}
                        onSendToProvider={onSendToProvider}
                        hasUpdatePermission={hasUpdatePermission}
                        enabledProviders={shippingProviders}
                      />
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

        </Accordion>
      </div>

      {/* Desktop Design */}
      <div className="hidden lg:block">
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="mb-4 bg-background dark:bg-zinc-800 border-border dark:border-zinc-700 flex-wrap h-auto p-1">
            <TabsTrigger value="items" className="text-foreground dark:text-zinc-200 data-[state=active]:bg-background dark:data-[state=active]:bg-zinc-700 text-xs sm:text-sm">المنتجات</TabsTrigger>
            <TabsTrigger value="info" className="text-foreground dark:text-zinc-200 data-[state=active]:bg-background dark:data-[state=active]:bg-zinc-700 text-xs sm:text-sm">معلومات الطلب</TabsTrigger>
            <TabsTrigger value="customer" className="text-foreground dark:text-zinc-200 data-[state=active]:bg-background dark:data-[state=active]:bg-zinc-700 text-xs sm:text-sm">العميل</TabsTrigger>
            <TabsTrigger value="shipping" className="text-foreground dark:text-zinc-200 data-[state=active]:bg-background dark:data-[state=active]:bg-zinc-700 text-xs sm:text-sm">الشحن والتوصيل</TabsTrigger>
            <TabsTrigger value="call" className="text-foreground dark:text-zinc-200 data-[state=active]:bg-background dark:data-[state=active]:bg-zinc-700 text-xs sm:text-sm">تأكيد الإتصال</TabsTrigger>
            <TabsTrigger value="payment" className="text-foreground dark:text-zinc-200 data-[state=active]:bg-background dark:data-[state=active]:bg-zinc-700 text-xs sm:text-sm">الدفع</TabsTrigger>
            <TabsTrigger value="notes" className="text-foreground dark:text-zinc-200 data-[state=active]:bg-background dark:data-[state=active]:bg-zinc-700 text-xs sm:text-sm">ملاحظات</TabsTrigger>
          </TabsList>

          {/* Items Tab */}
        <TabsContent value="items" className="mt-0">
            {orderData.hasItems ? (
              <OrderDetailsItems order={order} isMobile={false} />
          ) : (
            <div className="text-center py-8 text-muted-foreground dark:text-zinc-400">
              لا توجد منتجات في هذا الطلب
            </div>
          )}
        </TabsContent>

          {/* Order Info Tab */}
        <TabsContent value="info" className="mt-0">
            <OrderDetailsBasicInfo order={order} isMobile={false} />
        </TabsContent>

          {/* Customer Tab */}
        <TabsContent value="customer" className="mt-0">
            <OrderDetailsCustomer order={order} isMobile={false} />
        </TabsContent>

          {/* Shipping Tab */}
        <TabsContent value="shipping" className="mt-0">
            <OrderDetailsShipping order={order} isMobile={false} />
          </TabsContent>

          {/* Call Confirmation Tab */}
          <TabsContent value="call" className="mt-0">
            {orderData.hasCallConfirmation ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <PhoneCall className="ml-2 h-5 w-5" />
                  معلومات تأكيد الإتصال
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <span className="font-medium w-24">الحالة:</span>
                    <CallConfirmationBadge status={order.call_confirmation_status} showTooltip={false} />
                  </div>
                  
                  {order.call_confirmation_updated_at && (
                    <div className="flex items-start">
                      <span className="font-medium w-24">آخر تحديث:</span>
                      <span>{formatDateTime(order.call_confirmation_updated_at)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {order.call_confirmation_notes && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">ملاحظات الإتصال</h3>
                  <div className="p-4 border rounded-md bg-white">
                    {order.call_confirmation_notes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لم يتم تحديد حالة تأكيد الإتصال بعد
            </div>
          )}
        </TabsContent>

          {/* Payment Tab */}
        <TabsContent value="payment" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">معلومات الدفع</h3>
              <div className="space-y-2">
                <div className="flex items-start">
                  <span className="font-medium w-32">طريقة الدفع:</span>
                  <span>
                    {order.payment_method === "cash_on_delivery"
                      ? "الدفع عند الاستلام"
                      : order.payment_method === "credit_card"
                      ? "بطاقة ائتمان"
                      : order.payment_method === "bank_transfer"
                      ? "تحويل بنكي"
                      : order.payment_method}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium w-32">حالة الدفع:</span>
                  <span>
                    {order.payment_status === "paid" ? (
                      <span className="text-green-600">مدفوع</span>
                    ) : (
                      <span className="text-amber-600">غير مدفوع</span>
                    )}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium w-32">المبلغ الإجمالي:</span>
                    <span className="font-medium">{order.total}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

          {/* Notes Tab */}
        <TabsContent value="notes" className="mt-0">
          {order.notes ? (
            <div className="p-4 border rounded-md">
              <h3 className="text-lg font-medium mb-2">ملاحظات الطلب</h3>
              <p className="whitespace-pre-wrap">{order.notes}</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد ملاحظات لهذا الطلب
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
});

OrderDetailsPanel.displayName = "OrderDetailsPanel";

export default OrderDetailsPanel;
