import React, { memo, useMemo } from "react";
import { TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface OrderRowTotalProps {
  total: number;
  orderItems?: any[];
  hasOffer: boolean;
}

const OrderRowTotal: React.FC<OrderRowTotalProps> = ({
  total,
  orderItems = [],
  hasOffer,
}) => {
  const itemsCount = orderItems?.length || 0;
  
  const averagePrice = useMemo(() => {
    if (itemsCount === 0) return 0;
    return (total / itemsCount).toFixed(2);
  }, [total, itemsCount]);

  return (
    <TableCell className="w-[140px] min-w-[140px] py-3 px-4 select-text align-middle">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 select-text"
          >
            {formatPrice(total)}
          </span>
          {hasOffer && (
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700/30 rounded-full"
            >
              عرض
            </Badge>
          )}
        </div>
        {itemsCount > 0 && (
          <div className="text-[10px] text-muted-foreground">
            {itemsCount} {itemsCount === 1 ? 'منتج' : 'منتجات'}
          </div>
        )}
      </div>
    </TableCell>
  );
};

export default memo(OrderRowTotal);
