import React, { memo, useCallback } from "react";
import { TableCell } from "@/components/ui/table";
import CallConfirmationDropdown from "../../CallConfirmationDropdown";
import CallConfirmationDropdownLite from "../../CallConfirmationDropdownLite";
import CallConfirmationBadge from "../../CallConfirmationBadge";

interface OrderRowCallConfirmationProps {
  order: any;
  orderId: string;
  hasUpdatePermission: boolean;
  currentUserId?: string;
  onUpdateCallConfirmation?: (orderId: string, statusId: number, notes?: string, userId?: string) => void;
}

const OrderRowCallConfirmation: React.FC<OrderRowCallConfirmationProps> = ({
  order,
  orderId,
  hasUpdatePermission,
  currentUserId,
  onUpdateCallConfirmation,
}) => {
  const handleCellClick = useCallback((e: React.MouseEvent) => {
    if (hasUpdatePermission) {
      e.stopPropagation();
    }
  }, [hasUpdatePermission]);

  const renderContent = () => {
    if (hasUpdatePermission && onUpdateCallConfirmation && Array.isArray(order.available_call_statuses)) {
      return (
        <CallConfirmationDropdownLite
          currentStatusId={order.call_confirmation_status_id || null}
          orderId={orderId}
          onUpdateStatus={onUpdateCallConfirmation}
          userId={currentUserId}
          statuses={order.available_call_statuses}
        />
      );
    }
    
    if (hasUpdatePermission && onUpdateCallConfirmation) {
      return (
        <CallConfirmationDropdown
          currentStatusId={order.call_confirmation_status_id || null}
          orderId={orderId}
          onUpdateStatus={onUpdateCallConfirmation}
          userId={currentUserId}
        />
      );
    }
    
    if (order.call_confirmation_status) {
      return <CallConfirmationBadge status={order.call_confirmation_status} />;
    }
    
    return (
      <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/20 rounded-md">
        لم يتم تحديد
      </span>
    );
  };

  return (
    <TableCell 
      className="py-4 px-4" 
      onClick={handleCellClick}
      style={{ contain: 'layout', minWidth: '160px', minHeight: '32px' }}
    >
      <div className="flex justify-start" style={{ willChange: 'auto' }}>
        {renderContent()}
      </div>
    </TableCell>
  );
};

export default memo(OrderRowCallConfirmation);
