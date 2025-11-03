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
      className="w-[50px] min-w-[50px] py-3 px-3 text-center align-middle"
      onClick={(e) => e.stopPropagation()}
      style={{ contain: 'layout' }}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={(checked) => onSelect(orderId, !!checked)}
        aria-label={`تحديد الطلب ${formattedOrderNumber}`}
        className="border-2 border-border mx-auto transition-all"
      />
    </TableCell>
  );
};

export default memo(OrderRowCheckbox);
