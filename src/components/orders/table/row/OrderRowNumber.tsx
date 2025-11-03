import React, { memo } from "react";
import { TableCell } from "@/components/ui/table";

interface OrderRowNumberProps {
  formattedOrderNumber: string;
}

const OrderRowNumber: React.FC<OrderRowNumberProps> = ({
  formattedOrderNumber,
}) => {
  return (
    <TableCell className="w-[140px] min-w-[140px] py-3 px-4 select-text align-middle">
      <div className="flex items-center justify-start">
        <div
          className="font-semibold text-xs text-foreground/90 bg-muted/60 px-2.5 py-1.5 rounded-md select-text border border-border/40 transition-colors hover:bg-muted/80"
          title={formattedOrderNumber}
        >
          {formattedOrderNumber}
        </div>
      </div>
    </TableCell>
  );
};

export default memo(OrderRowNumber);
