import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Home, MapPin, Phone, User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getProvinceName, getMunicipalityName } from "@/utils/addressHelpers";
import { useStopDeskDetails } from "@/hooks/useStopDeskDetails";

interface OrderDetailsShippingProps {
  order: {
    shipping_address?: {
      name?: string;
      street_address?: string;
      state?: string;
      municipality?: string;
      country?: string;
      phone?: string;
    };
    shipping_address_id?: string;
    shipping_method?: string;
    shipping_option?: string;
    shipping_cost?: number;
    stop_desk_id?: string;
    customer?: {
      name?: string;
      phone?: string;
    };
    form_data?: {
      address?: string;
      province?: string;
      municipality?: string;
      deliveryOption?: string;
      stopDeskId?: string;
    };
    metadata?: {
      shipping_details?: {
        municipality_name?: string;
        stop_desk_commune_name?: string;
      };
    };
  };
  isMobile?: boolean;
}

const OrderDetailsShipping = memo(({ order, isMobile = false }: OrderDetailsShippingProps) => {
  const { stopDeskDetails } = useStopDeskDetails({ order });
  
  const hasShippingAddress = !!order.shipping_address || !!order.shipping_address_id || !!order.form_data;

  if (!hasShippingAddress) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        لا توجد معلومات عن الشحن
      </div>
    );
  }

  if (isMobile) {
    return (
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
    );
  }

  return (
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
  );
});

OrderDetailsShipping.displayName = "OrderDetailsShipping";

export default OrderDetailsShipping; 