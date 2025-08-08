import { memo } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Clock } from "lucide-react";
import OrderSourceBadge from "./OrderSourceBadge";

interface OrderDetailsBasicInfoProps {
  order: {
    id: string;
    customer_order_number?: string;
    total: number;
    order_items?: any[];
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

const OrderDetailsBasicInfo = memo(({ order, isMobile = false }: OrderDetailsBasicInfoProps) => {
  if (isMobile) {
    return (
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
    );
  }

  return (
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
  );
});

OrderDetailsBasicInfo.displayName = "OrderDetailsBasicInfo";

export default OrderDetailsBasicInfo;
