import React, { memo, useCallback } from "react";
import { TableCell } from "@/components/ui/table";
import OrderStatusBadge from "../OrderStatusBadge";
import OrderStatusDropdown from "../../OrderStatusDropdown";

interface OrderRowStatusProps {
  status: string;
  orderId: string;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  onUpdateStatus: (orderId: string, status: string) => void;
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
      className="py-4 px-4" 
      onClick={handleCellClick}
      style={{ contain: 'layout' }}
    >
      <div className="flex justify-start" style={{ willChange: 'auto' }}>
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
