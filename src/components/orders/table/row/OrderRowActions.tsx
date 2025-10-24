import React, { memo, useCallback, useState } from "react";
import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye as EyeIcon, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import OrderActionsDropdown from "../OrderActionsDropdown";
import OrderEditDialog from "../../dialogs/OrderEditDialog";

interface OrderRowActionsProps {
  order: any;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  onUpdateStatus: (orderId: string, status: string) => Promise<void>;
  onOrderUpdated?: (updatedOrder: any) => void;
}

const OrderRowActions: React.FC<OrderRowActionsProps> = ({
  order,
  hasUpdatePermission,
  hasCancelPermission,
  onUpdateStatus,
  onOrderUpdated,
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const handleCellClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const detailsUrl = order?.customer_order_number
    ? `/dashboard/orders-v2/${order.customer_order_number}`
    : `/dashboard/orders-v2/${order?.id}`;

  return (
    <TableCell 
      className="text-right py-4 px-4" 
      onClick={handleCellClick}
      style={{ 
        contain: 'layout',
        willChange: 'auto'
      }}
    >
      <div className="flex items-center justify-end gap-2" style={{ willChange: 'auto', contain: 'layout' }}>
        {/* زر تفاصيل سريع */}
        <Button variant="ghost" size="icon" asChild aria-label="تفاصيل الطلب">
          <Link to={detailsUrl} target="_self" onClick={(e) => e.stopPropagation()}>
            <EyeIcon className="h-4 w-4" />
          </Link>
        </Button>

        {/* زر التعديل */}
        {hasUpdatePermission && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setEditDialogOpen(true)}
            aria-label="تعديل الطلب"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}

        {/* قائمة الإجراءات */}
        <OrderActionsDropdown
          order={order}
          onUpdateStatus={onUpdateStatus}
          hasUpdatePermission={hasUpdatePermission}
          hasCancelPermission={hasCancelPermission}
        />
      </div>

      {/* حوار التعديل */}
      <OrderEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        order={order}
        onOrderUpdated={onOrderUpdated}
      />
    </TableCell>
  );
};

export default memo(OrderRowActions);
