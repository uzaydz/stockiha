import React, { memo } from "react";
import { TableCell } from "@/components/ui/table";

interface OrderRowNumberProps {
  formattedOrderNumber: string;
}

const OrderRowNumber: React.FC<OrderRowNumberProps> = ({
  formattedOrderNumber,
}) => {
  return (
    <TableCell className="py-4 px-4 select-text" style={{ contain: 'layout', minWidth: '140px', minHeight: '32px' }}>
      <div className="flex items-center gap-2">
        <div 
          className="font-semibold text-foreground bg-accent/30 px-2 py-1 rounded-md text-sm select-text" 
          title={formattedOrderNumber}
          style={{ willChange: 'auto' }}
        >
          {formattedOrderNumber}
        </div>
      </div>
    </TableCell>
  );
};

export default memo(OrderRowNumber);
