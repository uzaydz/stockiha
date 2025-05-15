import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";

const OrderDetailsPanel = ({ order }: OrderDetailsPanelProps) => {
  const [stopDeskDetails, setStopDeskDetails] = useState<{ name?: string, commune_name?: string } | null>(null);

  // دالة للبحث عن معلومات مكتب الاستلام والبلدية
  useEffect(() => {
    const fetchStopDeskDetails = async () => {
      // البحث فقط إذا كان نوع التوصيل للمكتب ولدينا معرف المكتب
      if (
        (order.shipping_option === 'desk' || order.form_data?.deliveryOption === 'desk') &&
        (order.stop_desk_id || order.form_data?.stopDeskId)
      ) {
        try {
          console.log("[OrderDetailsPanel] جاري البحث عن معرف المكتب:", order.stop_desk_id || order.form_data?.stopDeskId);
          const stopDeskId = order.stop_desk_id || order.form_data?.stopDeskId;
          const { data, error } = await supabase
            .from('yalidine_centers_global')
            .select('center_id, name, commune_id, wilaya_id, commune_name')
            .eq('center_id', stopDeskId)
            .single();

          if (!error && data) {
            console.log("[OrderDetailsPanel] تم العثور على بيانات المكتب:", data);
            setStopDeskDetails({
              name: data.name,
              commune_name: data.commune_name
            });
          } else {
            console.error("[OrderDetailsPanel] لم يتم العثور على بيانات المكتب:", error);
          }
        } catch (error) {
          console.error("[OrderDetailsPanel] خطأ في البحث عن معلومات المكتب:", error);
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
    <div className="p-4 bg-muted/20">
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="items">المنتجات</TabsTrigger>
          <TabsTrigger value="customer">العميل</TabsTrigger>
          <TabsTrigger value="shipping">الشحن والتوصيل</TabsTrigger>
          <TabsTrigger value="call">تأكيد الإتصال</TabsTrigger>
          <TabsTrigger value="payment">الدفع</TabsTrigger>
          <TabsTrigger value="notes">ملاحظات</TabsTrigger>
        </TabsList>

        {/* تفاصيل المنتجات */}
        <TabsContent value="items" className="mt-0">
          {hasItems ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>المنتج</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>اللون</TableHead>
                    <TableHead>المقاس</TableHead>
                    <TableHead className="text-left">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell>
                        {item.color_name ? (
                          <div className="flex items-center">
                            {item.color_code && (
                              <div
                                className="w-4 h-4 rounded-full ml-2"
                                style={{ backgroundColor: item.color_code }}
                              />
                            )}
                            <span>{item.color_name}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{item.size_name || "-"}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.total_price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
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
                    <span className="text-muted-foreground text-right">المجموع الفرعي:</span>
                    <span className="text-left">{formatCurrency(order.subtotal)}</span>

                    {/* Row 2: Offer Description */}
                    {offerDescription && (
                      <>
                        <span className="text-sm font-medium text-blue-600 text-right">العرض المطبق:</span>
                        <span className="text-sm text-blue-600 text-left">{offerDescription}</span>
                      </>
                    )}

                    {/* Row 3: Offer Discount */}
                    {offerDiscount > 0 && (
                      <>
                        <span className="text-muted-foreground text-right">خصم العرض:</span>
                        <span className="text-green-600 text-left">- {formatCurrency(offerDiscount)}</span>
                      </>
                    )}

                    {/* Row 4: Shipping */}
                    <span className="text-muted-foreground text-right">رسوم الشحن:</span>
                    {offerFreeShipping ? (
                      <span className="text-green-600 text-left">مجاني (عرض)</span>
                    ) : order.shipping_cost && order.shipping_cost > 0 ? (
                      <span className="text-left">{formatCurrency(order.shipping_cost)}</span>
                    ) : (
                      <span className="text-left">{formatCurrency(0)}</span>
                    )}
                    
                    {/* Separator Row */}
                    <div className="col-span-2">
                       <Separator className="my-2" />
                    </div>

                    {/* Row 5: Total */}
                    <span className="font-medium text-lg text-right">الإجمالي:</span>
                    <span className="font-medium text-lg text-left">{formatCurrency(order.total)}</span>
                  </div>
              );
            })()}
          </div>
        </TabsContent>

        {/* تفاصيل العميل */}
        <TabsContent value="customer" className="mt-0">
          {hasCustomer ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <User className="ml-2 h-5 w-5" />
                  معلومات العميل
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="font-medium w-24">الاسم:</span>
                    <span>{order.customer.name}</span>
                  </div>
                  {order.customer.phone && (
                    <div className="flex items-start">
                      <span className="font-medium w-24">الهاتف:</span>
                      <span dir="ltr" className="text-left">
                        <a
                          href={`tel:${order.customer.phone}`}
                          className="hover:text-primary"
                        >
                          {order.customer.phone}
                        </a>
                      </span>
                    </div>
                  )}
                  {order.customer.email && (
                    <div className="flex items-start">
                      <span className="font-medium w-24">البريد:</span>
                      <span>
                        <a
                          href={`mailto:${order.customer.email}`}
                          className="hover:text-primary"
                        >
                          {order.customer.email}
                        </a>
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <Clock className="ml-2 h-5 w-5" />
                  معلومات الطلب
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="font-medium w-24">رقم الطلب:</span>
                    <span>{order.customer_order_number || "-"}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium w-24">التاريخ:</span>
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium w-24">المصدر:</span>
                    <span>
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
                      <span className="font-medium w-24">طريقة التوصيل:</span>
                      <span className="font-semibold">
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
            <div className="text-center py-8 text-muted-foreground">
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
                                order.shipping_address.state,
                                order.shipping_address.municipality,
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
                                order.form_data.province,
                                order.form_data.municipality
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
                  <h3 className="text-lg font-medium flex items-center">
                    <MapPin className="ml-2 h-5 w-5" />
                    تفاصيل الشحن
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <span className="font-medium w-24">طريقة الشحن:</span>
                      <span>
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
                        <span className="font-medium w-24">خيار التوصيل:</span>
                        <span className="font-semibold">
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
                        <span className="font-medium w-24">تكلفة الشحن:</span>
                        <span>{formatCurrency(order.shipping_cost)}</span>
                      </div>
                    )}
                    
                    {/* معلومات من form_data إذا كانت متوفرة */}
                    {order.form_data && (
                      <>
                        {order.form_data.province && (
                          <div className="flex items-start">
                            <span className="font-medium w-24">الولاية:</span>
                            <span>{order.form_data.province}</span>
                          </div>
                        )}
                        
                        {order.form_data.municipality && (
                          <div className="flex items-start">
                            <span className="font-medium w-24">البلدية:</span>
                            <span className="text-primary font-medium">
                              {stopDeskDetails?.commune_name || order.form_data.municipality}
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
                            <span>{order.shipping_address.state}</span>
                          </div>
                        )}
                        
                        {order.shipping_address.municipality && !order.form_data?.municipality && (
                          <div className="flex items-start">
                            <span className="font-medium w-24">البلدية:</span>
                            <span>{order.shipping_address.municipality}</span>
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
  );
};

export default OrderDetailsPanel; 