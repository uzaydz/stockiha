import { memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

interface OrderItem {
  id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  color_name?: string;
  color_code?: string;
  size_name?: string;
}

interface OrderDetailsItemsProps {
  order: {
    order_items?: OrderItem[];
    subtotal: number;
    total: number;
    shipping_cost?: number;
    metadata?: {
      applied_quantity_offer?: {
        type: string;
        minQuantity: number;
        discountValue: number;
        appliedDiscountAmount?: number;
        appliedFreeShipping?: boolean;
      };
    };
  };
  isMobile?: boolean;
}

const OrderDetailsItems = memo(({ order, isMobile = false }: OrderDetailsItemsProps) => {
  const hasItems = order.order_items && order.order_items.length > 0;

  if (!hasItems) {
    return (
      <div className="text-center py-8 text-muted-foreground dark:text-zinc-400">
        لا توجد منتجات في هذا الطلب
      </div>
    );
  }

  // Calculate offer details
  const appliedOffer = order.metadata?.applied_quantity_offer;
  const offerDiscount = appliedOffer?.appliedDiscountAmount || 0;
  const offerFreeShipping = appliedOffer?.appliedFreeShipping || false;
  
  let offerDescription = "";
  if (appliedOffer) {
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

  if (isMobile) {
    return (
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
    );
  }

  return (
    <>
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

      {/* Order Summary */}
      <div className="mt-4 flex justify-end">
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
      </div>
    </>
  );
});

OrderDetailsItems.displayName = "OrderDetailsItems";

export default OrderDetailsItems; 