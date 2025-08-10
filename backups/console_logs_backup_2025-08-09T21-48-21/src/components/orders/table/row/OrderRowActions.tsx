import React, { memo, useCallback } from "react";
import { TableCell } from "@/components/ui/table";
import OrderActionsDropdown from "../OrderActionsDropdown";

interface OrderRowActionsProps {
  order: any;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  onUpdateStatus: (orderId: string, status: string) => void;
}

const OrderRowActions: React.FC<OrderRowActionsProps> = ({
  order,
  hasUpdatePermission,
  hasCancelPermission,
  onUpdateStatus,
}) => {
  const handleCellClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <TableCell 
      className="text-right py-4 px-4" 
      onClick={handleCellClick}
      style={{ contain: 'layout' }}
    >
      <div style={{ willChange: 'auto' }}>
        <OrderActionsDropdown
          order={order}
          onUpdateStatus={onUpdateStatus}
          hasUpdatePermission={hasUpdatePermission}
          hasCancelPermission={hasCancelPermission}
        />
      </div>
    </TableCell>
  );
};

export default memo(OrderRowActions);
