import { memo, useMemo } from "react";
import { Truck, Package, Calendar, DollarSign, Home, Building } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Order } from "./OrderTableTypes";

interface OrderShippingInfoProps {
  order: Order;
}

const OrderShippingInfo = memo(({ order }: OrderShippingInfoProps) => {
  // Helper function to determine delivery type with memoization
  const isOfficeDelivery = useMemo(() => {
    return !!(
      // Primary checks
      order.shipping_option === 'desk' ||
      order.form_data?.deliveryOption === 'desk' ||
      order.stop_desk_id ||
      order.form_data?.stopDeskId ||
      // Metadata checks
      order.metadata?.shipping_details?.delivery_type === 'desk' ||
      order.metadata?.shipping_details?.delivery_option === 'desk' ||
      order.metadata?.shipping_details?.stop_desk_id ||
      // Form data checks (the actual fields used in your system)
      order.form_data?.delivery_type === 'office' ||
      order.form_data?.delivery_type === 'desk' ||
      order.form_data?.fixedDeliveryType === 'desk' ||
      order.form_data?.shipping_type === 'desk'
    );
  }, [
    order.shipping_option, 
    order.form_data?.deliveryOption, 
    order.stop_desk_id, 
    order.form_data?.stopDeskId,
    order.metadata?.shipping_details?.delivery_type,
    order.metadata?.shipping_details?.delivery_option,
    order.metadata?.shipping_details?.stop_desk_id,
    order.form_data?.delivery_type,
    order.form_data?.fixedDeliveryType,
    order.form_data?.shipping_type
  ]);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Truck className="h-4 w-4" />
        معلومات الشحن والدفع
      </h4>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Package className="h-4 w-4 text-orange-500" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {order.shipping_method || "غير محدد"}
            </p>
            <p className="text-xs text-muted-foreground">طريقة الشحن</p>
          </div>
        </div>
        
        {order.shipping_cost && (
          <div className="flex items-center gap-3">
            <DollarSign className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {formatCurrency(order.shipping_cost)}
              </p>
              <p className="text-xs text-muted-foreground">تكلفة الشحن</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-blue-500" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {formatDate(order.created_at)}
            </p>
            <p className="text-xs text-muted-foreground">تاريخ الطلب</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isOfficeDelivery ? (
            <Building className="h-4 w-4 text-purple-500" />
          ) : (
            <Home className="h-4 w-4 text-purple-500" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {isOfficeDelivery ? 'استلام من المكتب' : 'توصيل للمنزل'}
            </p>
            <p className="text-xs text-muted-foreground">نوع التوصيل</p>
          </div>
        </div>
        
        {/* معلومات التتبع */}
        {(order.yalidine_tracking_id || order.zrexpress_tracking_id || order.ecotrack_tracking_id) && (
          <div className="mt-4 p-3 bg-muted/30 rounded-md">
            <p className="text-xs font-medium text-muted-foreground mb-2">معلومات التتبع</p>
            {order.yalidine_tracking_id && (
              <p className="text-xs text-foreground">ياليدين: {order.yalidine_tracking_id}</p>
            )}
            {order.zrexpress_tracking_id && (
              <p className="text-xs text-foreground">ZR Express: {order.zrexpress_tracking_id}</p>
            )}
            {order.ecotrack_tracking_id && (
              <p className="text-xs text-foreground">Ecotrack: {order.ecotrack_tracking_id}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

OrderShippingInfo.displayName = "OrderShippingInfo";

export default OrderShippingInfo;
