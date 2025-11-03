import React, { memo, useCallback } from "react";
import { TableCell } from "@/components/ui/table";
import OrderStatusBadge from "../OrderStatusBadge";
import OrderStatusDropdown from "../../OrderStatusDropdown";

interface OrderRowStatusProps {
  status: string;
  orderId: string;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  onUpdateStatus: (orderId: string, newStatus: string, userId?: string) => Promise<void>;
}

const OrderRowStatus: React.FC<OrderRowStatusProps> = ({
  status,
  orderId,
  hasUpdatePermission,
  hasCancelPermission,
  onUpdateStatus,
}) => {
  const handleCellClick = useCallback((e: React.MouseEvent) => {
    if (hasUpdatePermission) {
      e.stopPropagation();
    }
  }, [hasUpdatePermission]);

  return (
    <TableCell
      className="w-[160px] min-w-[160px] py-3 px-4 align-middle"
      onClick={handleCellClick}
    >
      <div className="flex justify-start">
        {hasUpdatePermission ? (
          <OrderStatusDropdown
            currentStatus={status}
            orderId={orderId}
            onUpdateStatus={onUpdateStatus}
            canCancel={hasCancelPermission}
          />
        ) : (
          <OrderStatusBadge status={status} />
        )}
      </div>
    </TableCell>
  );
};

export default memo(OrderRowStatus);
