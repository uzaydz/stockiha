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
    <TableCell className="py-4 px-4 select-text" style={{ contain: 'layout' }}>
      <div className="flex items-center gap-2">
        <span 
          className="font-semibold text-emerald-600 dark:text-emerald-400 select-text"
          style={{ willChange: 'auto' }}
        >
          {formatPrice(total)}
        </span>
        {hasOffer && (
          <Badge 
            variant="outline" 
            className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700/30 rounded-full"
          >
            عرض
          </Badge>
        )}
      </div>
      {itemsCount > 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          {averagePrice} د.ج لكل منتج
        </div>
      )}
    </TableCell>
  );
};

export default memo(OrderRowTotal);
