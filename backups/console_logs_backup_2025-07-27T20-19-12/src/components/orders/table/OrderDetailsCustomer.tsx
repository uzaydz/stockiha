import { memo } from "react";
import { User, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface OrderDetailsCustomerProps {
  order: {
    id: string;
    customer?: {
      name?: string;
      phone?: string;
      email?: string;
    };
    customer_order_number?: string;
    created_at: string;
    created_from?: string;
    shipping_option?: string;
    form_data?: {
      deliveryOption?: string;
      fixedDeliveryType?: string;
    };
  };
  isMobile?: boolean;
}

const OrderDetailsCustomer = memo(({ order, isMobile = false }: OrderDetailsCustomerProps) => {
  const hasCustomer = !!order.customer;

  if (!hasCustomer) {
    return (
      <div className="text-center py-8 text-muted-foreground dark:text-zinc-400">
        لا توجد معلومات عن العميل
      </div>
    );
  }

  if (isMobile) {
    return (
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
    );
  }

  return (
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
  );
});

OrderDetailsCustomer.displayName = "OrderDetailsCustomer";

export default OrderDetailsCustomer; 