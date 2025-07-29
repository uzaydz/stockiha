import { memo } from "react";
import { ShoppingCart, Hash, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Order } from "./OrderTableTypes";

interface OrderItemsListProps {
  order: Order;
  currentUserId?: string;
}

const OrderItemRow = memo(({ item }: { item: any }) => (
  <div className="flex items-center justify-between p-3 bg-background/50 rounded-md border border-border/20">
    <div className="flex-1">
      <p className="text-sm font-medium text-foreground">{item.product_name}</p>
      
      {/* عرض اللون والمقاس */}
      <div className="flex items-center gap-3 mt-1">
        {item.color_name && (
          <div className="flex items-center gap-1">
            {item.color_code && (
              <div
                className="w-3 h-3 rounded-full border border-border"
                style={{ backgroundColor: item.color_code }}
              />
            )}
            <span className="text-xs text-muted-foreground">اللون: {item.color_name}</span>
          </div>
        )}
        
        {item.size_name && (
          <span className="text-xs text-muted-foreground">المقاس: {item.size_name}</span>
        )}
      </div>
      
      <div className="flex items-center gap-4 mt-1">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Hash className="h-3 w-3" />
          الكمية: {item.quantity}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          {formatCurrency(item.unit_price)}
        </span>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-semibold text-primary">
        {formatCurrency(item.total_price)}
      </p>
      <p className="text-xs text-muted-foreground">المجموع</p>
    </div>
  </div>
));

OrderItemRow.displayName = "OrderItemRow";

const OrderItemsList = memo(({ order, currentUserId }: OrderItemsListProps) => {
  const items = order.order_items || [];

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <ShoppingCart className="h-4 w-4" />
        عناصر الطلب ({items.length})
      </h4>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.length > 0 ? (
          items.map((item: any, index: number) => (
            <OrderItemRow key={item.id || index} item={item} />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد عناصر في هذا الطلب</p>
          </div>
        )}
      </div>
      
      {/* ملخص المبالغ */}
      <div className="mt-4 pt-4 border-t border-border/30 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">المجموع الفرعي:</span>
          <span className="font-medium">{formatCurrency(order.subtotal)}</span>
        </div>
        
        {order.tax > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الضريبة:</span>
            <span className="font-medium">{formatCurrency(order.tax)}</span>
          </div>
        )}
        
        {order.discount && order.discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الخصم:</span>
            <span className="font-medium text-red-500">-{formatCurrency(order.discount)}</span>
          </div>
        )}
        
        {order.shipping_cost && order.shipping_cost > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">الشحن:</span>
            <span className="font-medium">{formatCurrency(order.shipping_cost)}</span>
          </div>
        )}
        
        <div className="flex justify-between text-base font-semibold pt-2 border-t border-border/30">
          <span>المجموع الكلي:</span>
          <span className="text-primary">{formatCurrency(order.total)}</span>
        </div>
      </div>
    </div>
  );
});

OrderItemsList.displayName = "OrderItemsList";

export default OrderItemsList; 