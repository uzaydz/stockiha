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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { Clock, Home, Mail, MapPin, Phone, User, PhoneCall, Building } from "lucide-react";
import { OrderDetailsPanelProps } from "./OrderTableTypes";
import CallConfirmationBadge from "../CallConfirmationBadge";
import OrderSourceBadge from "./OrderSourceBadge";
import OrderStatusDropdown from "../OrderStatusDropdown";
import CallConfirmationDropdown from "../CallConfirmationDropdown";
import ShippingProviderColumn from "./ShippingProviderColumn";
import OrderStatusBadge from "./OrderStatusBadge";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";
import { getProvinceName, getMunicipalityName } from "@/utils/addressHelpers";

const OrderDetailsPanel = ({ 
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
  const [stopDeskDetails, setStopDeskDetails] = useState<{ name?: string, commune_name?: string } | null>(null);

  // دالة للبحث عن معلومات مكتب الاستلام والبلدية
  useEffect(() => {
    const fetchStopDeskDetails = async () => {
      // البحث فقط إذا كان نوع التوصيل للمكتب ولدينا معرف المكتب أو البلدية
      if (
        (order.shipping_option === 'desk' || order.form_data?.deliveryOption === 'desk')
      ) {
        // تحقق أولاً من وجود معلومات الشحن في metadata
        if (order.metadata && typeof order.metadata === 'object' && 'shipping_details' in order.metadata) {
          const shippingDetails = (order.metadata as any).shipping_details;
          
          // إذا كان لدينا معلومات البلدية، استخدمها مباشرة
          if (shippingDetails && shippingDetails.municipality_name) {
            setStopDeskDetails({
              name: `مكتب في ${shippingDetails.municipality_name}`,
              commune_name: shippingDetails.municipality_name
            });
            return;
          }
        }
        
        // إذا وصلنا إلى هنا، نجرب البحث في جدول yalidine_centers_global
        const stopDeskId = order.stop_desk_id || order.form_data?.stopDeskId;
        
        if (stopDeskId) {
          try {
            
            const { data, error } = await supabase
              .from('yalidine_centers_global')
              .select('center_id, name, commune_id, wilaya_id, commune_name')
              .eq('center_id', stopDeskId)
              .single();

            if (!error && data) {
              setStopDeskDetails({
                name: data.name,
                commune_name: data.commune_name
              });
            } else {
            }
          } catch (error) {
          }
        }
      }
    };

    fetchStopDeskDetails();
  }, [order]);

  // Debug logs to check the order structure

  const hasItems = order.order_items && order.order_items.length > 0;
  const hasCustomer = !!order.customer;
  // Check if there's a shipping_address_id even if shipping_address object is null
  const hasShippingAddress = !!order.shipping_address || !!order.shipping_address_id || !!order.form_data;
  const hasCallConfirmation = !!order.call_confirmation_status;

  return (
    <div className="p-2 sm:p-4 bg-muted/20 dark:bg-zinc-800/20">
      {/* تصميم للهواتف المحمولة */}
      <div className="block lg:hidden">
        <Accordion type="multiple" className="w-full space-y-2">
          
          {/* معلومات الطلب الأساسية - مفتوح افتراضياً */}
          <AccordionItem value="basic-info" className="border rounded-lg bg-background/50">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                معلومات أساسية
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid gap-3">
                {/* رقم الطلب */}
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">رقم الطلب:</span>
                  <span className="font-semibold text-sm bg-accent/30 px-2 py-1 rounded-md">
                    {order.customer_order_number ? `#${order.customer_order_number}` : `#${order.id.slice(0, 8)}`}
                  </span>
                </div>
                
                {/* إجمالي المبلغ */}
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">المبلغ:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(order.total)}
                  </span>
                </div>
                
                {/* عدد المنتجات */}
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">المنتجات:</span>
                  <span className="text-sm">
                    {order.order_items?.length || 0} {order.order_items?.length === 1 ? 'منتج' : 'منتجات'}
                  </span>
                </div>
                
                {/* التاريخ */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">التاريخ:</span>
                  <span className="text-sm font-mono">{formatDateTime(order.created_at)}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* المنتجات */}
          {hasItems && (
            <AccordionItem value="items" className="border rounded-lg bg-background/50">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  المنتجات ({order.order_items?.length || 0})
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3">
                  {order.order_items?.map((item, index) => (
                    <div key={item.id || `item-${index}`} className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div className="font-medium text-sm">{item.product_name}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الكمية:</span>
                          <span>{item.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">السعر:</span>
                          <span>{formatCurrency(item.unit_price)}</span>
                        </div>
                        {item.color_name && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">اللون:</span>
                            <div className="flex items-center gap-1">
                              {item.color_code && (
                                <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: item.color_code }}></div>
                              )}
                              <span>{item.color_name}</span>
                            </div>
                          </div>
                        )}
                        {item.size_name && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">المقاس:</span>
                            <span>{item.size_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-border/30">
                        <span className="text-muted-foreground text-xs">الإجمالي:</span>
                        <span className="font-medium text-sm">{formatCurrency(item.total_price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* معلومات العميل */}
          {hasCustomer && (
            <AccordionItem value="customer" className="border rounded-lg bg-background/50">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  معلومات العميل
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/30">
                    <span className="text-sm text-muted-foreground">الاسم:</span>
                    <span className="text-sm font-medium">{order.customer?.name || 'غير محدد'}</span>
                  </div>
                  {order.customer?.phone && (
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <span className="text-sm text-muted-foreground">الهاتف:</span>
                      <span className="text-sm font-mono" dir="ltr">{order.customer.phone}</span>
                    </div>
                  )}
                  {order.customer?.email && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">البريد:</span>
                      <span className="text-sm">{order.customer.email}</span>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* معلومات الشحن */}
          {hasShippingAddress && (
            <AccordionItem value="shipping" className="border rounded-lg bg-background/50">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  عنوان التوصيل
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3">
                  {order.shipping_address?.street_address && (
                    <div className="flex justify-between items-start py-2 border-b border-border/30">
                      <span className="text-sm text-muted-foreground">العنوان:</span>
                      <span className="text-sm text-left max-w-[60%]">{order.shipping_address.street_address}</span>
                    </div>
                  )}
                  {order.shipping_address?.phone && (
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                      <span className="text-sm text-muted-foreground">هاتف التوصيل:</span>
                      <span className="text-sm font-mono" dir="ltr">{order.shipping_address.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">نوع التوصيل:</span>
                    <span className="text-sm">{order.shipping_option === 'home' ? 'توصيل منزلي' : 'استلام من المكتب'}</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* تفاصيل تأكيد الإتصال */}
          {hasCallConfirmation && (
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

          {/* تفاصيل الشحن */}
          {hasShippingAddress && (
            <AccordionItem value="shipping" className="border rounded-lg bg-background/50">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  تفاصيل الشحن
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="font-medium w-24 text-muted-foreground">طريقة الشحن:</span>
                    <span className="text-foreground dark:text-zinc-100">
                      {order.shipping_method === "1" 
                        ? "ياليدين" 
                        : order.shipping_method === "2" 
                          ? "توصيل سريع" 
                          : order.shipping_method === "3"
                            ? "بريد الجزائر"
                            : order.shipping_method || "غير محدد"}
                    </span>
                  </div>
                  {order.shipping_option && (
                    <div className="flex items-start">
                      <span className="font-medium w-24 text-muted-foreground">خيار التوصيل:</span>
                      <span className="font-semibold text-foreground dark:text-zinc-100">
                        {order.shipping_option === "desk" 
                          ? "استلام من المكتب" 
                          : order.shipping_option === "home" 
                            ? "توصيل للمنزل"
                            : order.shipping_option}
                      </span>
                    </div>
                  )}
                  {order.shipping_cost !== null && order.shipping_cost !== undefined && (
                    <div className="flex items-start">
                      <span className="font-medium w-24 text-muted-foreground">تكلفة الشحن:</span>
                      <span className="text-foreground dark:text-zinc-100">{formatCurrency(order.shipping_cost)}</span>
                    </div>
                  )}
                  
                  {/* معلومات من form_data إذا كانت متوفرة */}
                  {order.form_data && (
                    <>
                      {order.form_data.province && (
                        <div className="flex items-start">
                          <span className="font-medium w-24">الولاية:</span>
                          <span>{getProvinceName(order.form_data.province)}</span>
                        </div>
                      )}
                      
                      {order.form_data.municipality && (
                        <div className="flex items-start">
                          <span className="font-medium w-24">البلدية:</span>
                          <span className="text-primary font-medium">
                            {stopDeskDetails?.commune_name || 
                             (order.shipping_address?.municipality) || 
                             getMunicipalityName(order.form_data.municipality, order.form_data.province)}
                          </span>
                        </div>
                      )}
                      
                      {order.form_data.address && (
                        <div className="flex items-start">
                          <span className="font-medium w-24">العنوان:</span>
                          <span>{order.form_data.address}</span>
                        </div>
                      )}
                      
                      {order.form_data.deliveryOption && (
                        <div className="flex items-start">
                          <span className="font-medium w-24">خيار التوصيل:</span>
                          <span>
                            {order.form_data.deliveryOption === 'home' ? 'توصيل للمنزل' : 
                             order.form_data.deliveryOption === 'desk' ? 'استلام من المكتب' : 
                             order.form_data.deliveryOption}
                          </span>
                        </div>
                      )}
                      
                      {/* إظهار معلومات مكتب الاستلام إذا كان نوع التوصيل هو desk */}
                      {(order.shipping_option === 'desk' || order.form_data.deliveryOption === 'desk') && (
                        <div className="flex items-start">
                          <span className="font-medium w-24">مكتب الاستلام:</span>
                          <span className="text-primary font-medium">
                            {stopDeskDetails?.name 
                              ? `${stopDeskDetails.name} (${order.stop_desk_id || order.form_data?.stopDeskId})` 
                              : `مكتب رقم ${order.stop_desk_id || order.form_data?.stopDeskId || 'غير محدد'}`}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* معلومات من shipping_address إذا كانت متوفرة */}
                  {order.shipping_address && (
                    <>
                      {order.shipping_address.state && !order.form_data?.province && (
                        <div className="flex items-start">
                          <span className="font-medium w-24">الولاية:</span>
                          <span>{getProvinceName(order.shipping_address.state)}</span>
                        </div>
                      )}
                      
                      {order.shipping_address.municipality && !order.form_data?.municipality && (
                        <div className="flex items-start">
                          <span className="font-medium w-24">البلدية:</span>
                          <span>{getMunicipalityName(order.shipping_address.municipality, order.shipping_address.state)}</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* معلومات من metadata إذا كانت متوفرة */}
                  {order.metadata?.shipping_details && (
                    <>
                      {order.metadata.shipping_details.stop_desk_commune_name && 
                       !order.form_data?.municipality && 
                       !order.shipping_address?.municipality && (
                        <div className="flex items-start">
                          <span className="font-medium w-24">البلدية:</span>
                          <span>{order.metadata.shipping_details.stop_desk_commune_name}</span>
                        </div>
                      )}
                      
                      {/* إظهار معلومات مكتب الاستلام إذا كان نوع التوصيل هو الاستلام من المكتب */}
                      {(order.shipping_option === 'desk' || order.form_data?.deliveryOption === 'desk') && (
                        <div className="flex items-start">
                          <span className="font-medium w-24">مكتب الاستلام:</span>
                          <span className="text-primary">
                            {stopDeskDetails?.name 
                              ? `${stopDeskDetails.name} (${order.stop_desk_id || order.form_data?.stopDeskId})` 
                              : order.form_data?.stopDeskId
                                ? `مكتب رقم ${order.form_data.stopDeskId}`
                                : order.stop_desk_id
                                  ? `مكتب رقم ${order.stop_desk_id}`
                                  : "غير محدد"}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="mt-4">
                  <Button variant="outline" size="sm">
                    تتبع الشحنة
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* إجراءات سريعة */}
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
                  {/* حالة الطلب */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">حالة الطلب:</label>
                    <OrderStatusDropdown
                      currentStatus={order.status}
                      orderId={order.id}
                      onUpdateStatus={onUpdateStatus}
                      canCancel={hasCancelPermission}
                    />
                  </div>

                  {/* تأكيد الإتصال */}
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

                  {/* مزود الشحن */}
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

      {/* تصميم للشاشات الكبيرة */}
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

        {/* تفاصيل المنتجات */}
        <TabsContent value="items" className="mt-0">
          {hasItems ? (
            <div className="rounded-md border border-border dark:border-zinc-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 dark:bg-zinc-800/50 border-b border-border dark:border-zinc-700">
                    <TableHead className="text-foreground dark:text-zinc-200">المنتج</TableHead>
                    <TableHead className="text-foreground dark:text-zinc-200">الكمية</TableHead>
                    <TableHead className="text-foreground dark:text-zinc-200">السعر</TableHead>
                    <TableHead className="text-foreground dark:text-zinc-200">اللون</TableHead>
                    <TableHead className="text-foreground dark:text-zinc-200">المقاس</TableHead>
                    <TableHead className="text-left text-foreground dark:text-zinc-200">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_items?.map((item, index) => (
                    <TableRow key={item.id || `item-${index}`} className="border-b border-border dark:border-zinc-700">
                      <TableCell className="font-medium text-foreground dark:text-zinc-200">{item.product_name}</TableCell>
                      <TableCell className="text-foreground dark:text-zinc-200">{item.quantity}</TableCell>
                      <TableCell className="text-foreground dark:text-zinc-200">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell>
                        {item.color_name ? (
                          <div className="flex items-center">
                            {item.color_code && (
                              <div
                                className="w-4 h-4 rounded-full ml-2 border border-border dark:border-zinc-600"
                                style={{ backgroundColor: item.color_code }}
                              />
                            )}
                            <span className="text-foreground dark:text-zinc-200">{item.color_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground dark:text-zinc-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.size_name ? (
                          <span className="text-foreground dark:text-zinc-200">{item.size_name}</span>
                        ) : (
                          <span className="text-muted-foreground dark:text-zinc-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-foreground dark:text-zinc-200">
                        {formatCurrency(item.total_price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground dark:text-zinc-400">
              لا توجد منتجات في هذا الطلب
            </div>
          )}

          {/* ملخص المبلغ - Placed correctly within items TabContent */}
          <div className="mt-4 flex justify-end">
            {/* Use Grid layout for summary */}
            {(() => {
              let appliedOffer = null;
              let offerDescription = "";
              let offerDiscount = 0;
              let offerFreeShipping = false;

              if (order.metadata && typeof order.metadata === 'object' && 'applied_quantity_offer' in order.metadata) {
                  appliedOffer = (order.metadata as any).applied_quantity_offer;
                  offerDiscount = appliedOffer?.appliedDiscountAmount || 0;
                  offerFreeShipping = appliedOffer?.appliedFreeShipping || false;
                  // Generate offer description...
                  if (appliedOffer.type === 'buy_x_get_y_free') {
                    offerDescription = `عرض الكمية: اشتر ${appliedOffer.minQuantity} واحصل على ${appliedOffer.discountValue} مجاناً`;
                  } else if (appliedOffer.type === 'percentage_discount') {
                    offerDescription = `عرض الكمية: خصم ${appliedOffer.discountValue}% عند شراء ${appliedOffer.minQuantity} أو أكثر`;
                  } else if (appliedOffer.type === 'fixed_amount_discount') {
                    offerDescription = `عرض الكمية: خصم ${formatCurrency(appliedOffer.discountValue)} عند شراء ${appliedOffer.minQuantity} أو أكثر`;
                  } else if (appliedOffer.type === 'free_shipping') {
                    offerDescription = `عرض الكمية: شحن مجاني عند شراء ${appliedOffer.minQuantity} أو أكثر`;
                  }
              }
              
              // Return the grid structure directly
              return (
                <div className="w-80 space-y-1 grid grid-cols-2 gap-x-4 gap-y-1">
                    {/* Row 1: Subtotal */}
                    <span className="text-muted-foreground dark:text-zinc-400 text-right">المجموع الفرعي:</span>
                    <span className="text-left text-foreground dark:text-zinc-200">{formatCurrency(order.subtotal)}</span>

                    {/* Row 2: Offer Description */}
                    {offerDescription && (
                      <>
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 text-right">العرض المطبق:</span>
                        <span className="text-sm text-blue-600 dark:text-blue-400 text-left">{offerDescription}</span>
                      </>
                    )}

                    {/* Row 3: Offer Discount */}
                    {offerDiscount > 0 && (
                      <>
                        <span className="text-muted-foreground dark:text-zinc-400 text-right">خصم العرض:</span>
                        <span className="text-green-600 dark:text-green-400 text-left">- {formatCurrency(offerDiscount)}</span>
                      </>
                    )}

                    {/* Row 4: Shipping */}
                    <span className="text-muted-foreground dark:text-zinc-400 text-right">رسوم الشحن:</span>
                    {offerFreeShipping ? (
                      <span className="text-green-600 dark:text-green-400 text-left">مجاني (عرض)</span>
                    ) : order.shipping_cost && order.shipping_cost > 0 ? (
                      <span className="text-left text-foreground dark:text-zinc-200">{formatCurrency(order.shipping_cost)}</span>
                    ) : (
                      <span className="text-left text-foreground dark:text-zinc-200">{formatCurrency(0)}</span>
                    )}
                    
                    {/* Separator Row */}
                    <div className="col-span-2">
                       <Separator className="my-2 bg-border dark:bg-zinc-700" />
                    </div>

                    {/* Row 5: Total */}
                    <span className="font-medium text-lg text-right text-foreground dark:text-zinc-100">الإجمالي:</span>
                    <span className="font-medium text-lg text-left text-foreground dark:text-zinc-100">{formatCurrency(order.total)}</span>
                  </div>
              );
            })()}
          </div>
        </TabsContent>

        {/* معلومات الطلب */}
        <TabsContent value="info" className="mt-0">
          <div className="grid gap-4 bg-background dark:bg-zinc-900 p-4 rounded-md border border-border dark:border-zinc-700">
            
            {/* عدد المنتجات */}
            <div className="flex items-center justify-between py-2 border-b border-border/50 dark:border-zinc-700/50">
              <span className="text-muted-foreground dark:text-zinc-400">عدد المنتجات:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground bg-muted/30 px-2 py-1 rounded-full text-sm">
                  {order.order_items?.length || 0}
                </span>
                <span className="text-xs text-muted-foreground">
                  {order.order_items?.length === 1 ? 'منتج' : 'منتجات'}
                </span>
              </div>
            </div>

            {/* مصدر الطلب ونوع التوصيل */}
            <div className="flex items-center justify-between py-2 border-b border-border/50 dark:border-zinc-700/50">
              <span className="text-muted-foreground dark:text-zinc-400">مصدر الطلب:</span>
              <OrderSourceBadge 
                source={order.created_from || 'web'} 
                deliveryType={order.shipping_option || order.form_data?.deliveryOption || order.form_data?.fixedDeliveryType || "home"}
                created_at={order.created_at}
                shipping_option={order.shipping_option || order.form_data?.deliveryOption || order.form_data?.fixedDeliveryType}
              />
            </div>

            {/* تاريخ الإنشاء */}
            <div className="flex items-center justify-between py-2 border-b border-border/50 dark:border-zinc-700/50">
              <span className="text-muted-foreground dark:text-zinc-400">تاريخ الطلب:</span>
              <div className="flex items-center gap-2 text-foreground dark:text-zinc-200">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{formatDateTime(order.created_at)}</span>
              </div>
            </div>

            {/* رقم الطلب */}
            <div className="flex items-center justify-between py-2 border-b border-border/50 dark:border-zinc-700/50">
              <span className="text-muted-foreground dark:text-zinc-400">رقم الطلب:</span>
              <span className="font-semibold text-foreground bg-accent/30 px-2 py-1 rounded-md text-sm">
                {order.customer_order_number ? `#${order.customer_order_number}` : `#${order.id.slice(0, 8)}`}
              </span>
            </div>

            {/* إجمالي الطلب */}
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground dark:text-zinc-400">إجمالي المبلغ:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-lg">
                {formatCurrency(order.total)}
              </span>
            </div>

          </div>
        </TabsContent>

        {/* تفاصيل العميل */}
        <TabsContent value="customer" className="mt-0">
          {hasCustomer ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center text-foreground">
                  <User className="ml-2 h-5 w-5 text-muted-foreground" />
                  معلومات العميل
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="font-medium w-24 text-muted-foreground">الاسم:</span>
                    <span className="text-foreground">{order.customer.name}</span>
                  </div>
                  {order.customer.phone && (
                    <div className="flex items-start">
                      <span className="font-medium w-24 text-muted-foreground">الهاتف:</span>
                      <span className="text-foreground">{order.customer.phone}</span>
                    </div>
                  )}
                  {order.customer.email && (
                    <div className="flex items-start">
                      <span className="font-medium w-24 text-muted-foreground">البريد:</span>
                      <span className="text-foreground">{order.customer.email}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center text-foreground dark:text-zinc-100">
                  <Clock className="ml-2 h-5 w-5 text-muted-foreground dark:text-zinc-400" />
                  معلومات الطلب
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="font-medium w-24 text-muted-foreground dark:text-zinc-400">رقم الطلب:</span>
                    <span className="text-foreground dark:text-zinc-200">{order.customer_order_number || "-"}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium w-24 text-muted-foreground dark:text-zinc-400">التاريخ:</span>
                    <span className="text-foreground dark:text-zinc-200">{formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium w-24 text-muted-foreground dark:text-zinc-400">المصدر:</span>
                    <span className="text-foreground dark:text-zinc-200">
                      {order.created_from === "store"
                        ? "المتجر"
                        : order.created_from === "app"
                        ? "التطبيق"
                        : order.created_from === "pos"
                        ? "نقطة البيع"
                        : "الموقع الإلكتروني"}
                    </span>
                  </div>
                  {order.shipping_option && (
                    <div className="flex items-start">
                      <span className="font-medium w-24 text-muted-foreground dark:text-zinc-400">طريقة التوصيل:</span>
                      <span className="font-semibold text-foreground dark:text-zinc-200">
                        {order.shipping_option === "desk" 
                          ? "استلام من المكتب" 
                          : order.shipping_option === "home" 
                            ? "توصيل للمنزل" 
                            : order.shipping_option}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground dark:text-zinc-400">
              لا توجد معلومات عن العميل
            </div>
          )}
        </TabsContent>

        {/* تفاصيل الشحن */}
        <TabsContent value="shipping" className="mt-0">
          {hasShippingAddress ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <Home className="ml-2 h-5 w-5" />
                    عنوان الشحن
                  </h3>
                  <div className="space-y-2 border p-4 rounded-md">
                    {order.shipping_address ? (
                      <>
                        {order.shipping_address.name && (
                          <div className="flex items-start">
                            <User className="h-4 w-4 mt-1 ml-2 text-muted-foreground" />
                            <span>{order.shipping_address.name}</span>
                          </div>
                        )}
                        {order.shipping_address.street_address && (
                          <div className="flex items-start">
                            <MapPin className="h-4 w-4 mt-1 ml-2 text-muted-foreground" />
                            <span>{order.shipping_address.street_address}</span>
                          </div>
                        )}
                        {(order.shipping_address.state || order.shipping_address.municipality || order.shipping_address.country) && (
                          <div className="flex items-start">
                            <span className="h-4 w-4 mt-1 ml-2" />
                            <span>
                              {[
                                order.shipping_address.state ? getProvinceName(order.shipping_address.state) : null,
                                order.shipping_address.municipality ? getMunicipalityName(order.shipping_address.municipality, order.shipping_address.state) : null,
                                order.shipping_address.country
                              ]
                                .filter(Boolean)
                                .join("، ")}
                            </span>
                          </div>
                        )}
                        {order.shipping_address.phone && (
                          <div className="flex items-start">
                            <Phone className="h-4 w-4 mt-1 ml-2 text-muted-foreground" />
                            <span dir="ltr" className="text-left">
                              {order.shipping_address.phone}
                            </span>
                          </div>
                        )}
                      </>
                    ) : order.form_data ? (
                      <>
                        {order.customer && order.customer.name && (
                          <div className="flex items-start">
                            <User className="h-4 w-4 mt-1 ml-2 text-muted-foreground" />
                            <span>{order.customer.name}</span>
                          </div>
                        )}
                        {order.form_data.address && (
                          <div className="flex items-start">
                            <MapPin className="h-4 w-4 mt-1 ml-2 text-muted-foreground" />
                            <span>{order.form_data.address}</span>
                          </div>
                        )}
                        {(order.form_data.province || order.form_data.municipality) && (
                          <div className="flex items-start">
                            <span className="h-4 w-4 mt-1 ml-2" />
                            <span>
                              {[
                                order.form_data.province ? getProvinceName(order.form_data.province) : null,
                                order.form_data.municipality ? getMunicipalityName(order.form_data.municipality, order.form_data.province) : null
                              ]
                                .filter(Boolean)
                                .join("، ")}
                            </span>
                          </div>
                        )}
                        {order.customer && order.customer.phone && (
                          <div className="flex items-start">
                            <Phone className="h-4 w-4 mt-1 ml-2 text-muted-foreground" />
                            <span dir="ltr" className="text-left">
                              {order.customer.phone}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-muted-foreground">
                        {order.shipping_address_id ? 
                          "تم تعيين معرف عنوان الشحن ولكن تفاصيل العنوان غير متوفرة" : 
                          "لم يتم تعيين عنوان الشحن"}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center text-foreground dark:text-zinc-100">
                    <MapPin className="ml-2 h-5 w-5 text-muted-foreground dark:text-zinc-400" />
                    تفاصيل الشحن
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <span className="font-medium w-24 text-muted-foreground dark:text-zinc-300">طريقة الشحن:</span>
                      <span className="text-foreground dark:text-zinc-100">
                        {order.shipping_method === "1" 
                          ? "ياليدين" 
                          : order.shipping_method === "2" 
                            ? "توصيل سريع" 
                            : order.shipping_method === "3"
                              ? "بريد الجزائر"
                              : order.shipping_method || "غير محدد"}
                      </span>
                    </div>
                    {order.shipping_option && (
                      <div className="flex items-start">
                        <span className="font-medium w-24 text-muted-foreground dark:text-zinc-300">خيار التوصيل:</span>
                        <span className="font-semibold text-foreground dark:text-zinc-100">
                          {order.shipping_option === "desk" 
                            ? "استلام من المكتب" 
                            : order.shipping_option === "home" 
                              ? "توصيل للمنزل"
                              : order.shipping_option}
                        </span>
                      </div>
                    )}
                    {order.shipping_cost !== null && order.shipping_cost !== undefined && (
                      <div className="flex items-start">
                        <span className="font-medium w-24 text-muted-foreground dark:text-zinc-300">تكلفة الشحن:</span>
                        <span className="text-foreground dark:text-zinc-100">{formatCurrency(order.shipping_cost)}</span>
                      </div>
                    )}
                    
                    {/* معلومات من form_data إذا كانت متوفرة */}
                    {order.form_data && (
                      <>
                        {order.form_data.province && (
                          <div className="flex items-start">
                            <span className="font-medium w-24">الولاية:</span>
                            <span>{getProvinceName(order.form_data.province)}</span>
                          </div>
                        )}
                        
                        {order.form_data.municipality && (
                          <div className="flex items-start">
                            <span className="font-medium w-24">البلدية:</span>
                            <span className="text-primary font-medium">
                              {stopDeskDetails?.commune_name || 
                               (order.shipping_address?.municipality) || 
                               getMunicipalityName(order.form_data.municipality, order.form_data.province)}
                            </span>
                          </div>
                        )}
                        
                        {order.form_data.address && (
                          <div className="flex items-start">
                            <span className="font-medium w-24">العنوان:</span>
                            <span>{order.form_data.address}</span>
                          </div>
                        )}
                        
                        {order.form_data.deliveryOption && (
                          <div className="flex items-start">
                            <span className="font-medium w-24">خيار التوصيل:</span>
                            <span>
                              {order.form_data.deliveryOption === 'home' ? 'توصيل للمنزل' : 
                               order.form_data.deliveryOption === 'desk' ? 'استلام من المكتب' : 
                               order.form_data.deliveryOption}
                            </span>
                          </div>
                        )}
                        
                        {/* إظهار معلومات مكتب الاستلام إذا كان نوع التوصيل هو desk */}
                        {(order.shipping_option === 'desk' || order.form_data.deliveryOption === 'desk') && (
                          <div className="flex items-start">
                            <span className="font-medium w-24">مكتب الاستلام:</span>
                            <span className="text-primary font-medium">
                              {stopDeskDetails?.name 
                                ? `${stopDeskDetails.name} (${order.stop_desk_id || order.form_data?.stopDeskId})` 
                                : `مكتب رقم ${order.stop_desk_id || order.form_data?.stopDeskId || 'غير محدد'}`}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* معلومات من shipping_address إذا كانت متوفرة */}
                    {order.shipping_address && (
                      <>
                        {order.shipping_address.state && !order.form_data?.province && (
                          <div className="flex items-start">
                            <span className="font-medium w-24">الولاية:</span>
                            <span>{getProvinceName(order.shipping_address.state)}</span>
                          </div>
                        )}
                        
                        {order.shipping_address.municipality && !order.form_data?.municipality && (
                          <div className="flex items-start">
                            <span className="font-medium w-24">البلدية:</span>
                            <span>{getMunicipalityName(order.shipping_address.municipality, order.shipping_address.state)}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* معلومات من metadata إذا كانت متوفرة */}
                    {order.metadata?.shipping_details && (
                      <>
                        {order.metadata.shipping_details.stop_desk_commune_name && 
                         !order.form_data?.municipality && 
                         !order.shipping_address?.municipality && (
                          <div className="flex items-start">
                            <span className="font-medium w-24">البلدية:</span>
                            <span>{order.metadata.shipping_details.stop_desk_commune_name}</span>
                          </div>
                        )}
                        
                        {/* إظهار معلومات مكتب الاستلام إذا كان نوع التوصيل هو الاستلام من المكتب */}
                        {(order.shipping_option === 'desk' || order.form_data?.deliveryOption === 'desk') && (
                          <div className="flex items-start">
                            <span className="font-medium w-24">مكتب الاستلام:</span>
                            <span className="text-primary">
                              {stopDeskDetails?.name 
                                ? `${stopDeskDetails.name} (${order.stop_desk_id || order.form_data?.stopDeskId})` 
                                : order.form_data?.stopDeskId
                                  ? `مكتب رقم ${order.form_data.stopDeskId}`
                                  : order.stop_desk_id
                                    ? `مكتب رقم ${order.stop_desk_id}`
                                    : "غير محدد"}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" size="sm">
                      تتبع الشحنة
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد معلومات عن الشحن
            </div>
          )}
        </TabsContent>

        {/* تفاصيل تأكيد الإتصال */}
        <TabsContent value="call" className="mt-0">
          {hasCallConfirmation ? (
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

        {/* تفاصيل الدفع */}
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
                  <span className="font-medium">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* الملاحظات */}
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
};

export default OrderDetailsPanel;
