import React, { memo } from "react";
import { TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface OrderRowCheckboxProps {
  selected: boolean;
  orderId: string;
  formattedOrderNumber: string;
  onSelect: (orderId: string, selected: boolean) => void;
}

const OrderRowCheckbox: React.FC<OrderRowCheckboxProps> = ({
  selected,
  orderId,
  formattedOrderNumber,
  onSelect,
}) => {
  return (
    <TableCell 
      className="w-12 py-4 px-4" 
      onClick={(e) => e.stopPropagation()}
      style={{ contain: 'layout' }}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={(checked) => onSelect(orderId, !!checked)}
        aria-label={`تحديد الطلب ${formattedOrderNumber}`}
        className="border-border/50 data-[state=checked]:border-primary"
      />
    </TableCell>
  );
};

export default memo(OrderRowCheckbox);
