/**
 * OrdersToolbar - شريط أدوات الطلبيات (إعدادات المخزون، التعيين الجماعي)
 */

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Users } from 'lucide-react';
import { useOrders } from '../context/OrdersContext';
import { useOrdersPermissions } from '../hooks';

const OrdersToolbar: React.FC = () => {
  const {
    autoDeductInventory,
    updatingInventorySettings,
    toggleAutoDeductInventory,
    setBulkAutoAssignOpen,
    displayOrders,
  } = useOrders();

  const permissions = useOrdersPermissions();

  // Count pending orders
  const pendingOrdersCount = displayOrders.filter(
    (o) => o.status === 'pending' && !o.assignment?.staff_id
  ).length;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border border-border/30">
      {/* Auto Deduct Inventory Toggle */}
      <div className="flex items-center gap-3">
        <Switch
          id="auto-deduct-inventory"
          checked={autoDeductInventory}
          onCheckedChange={toggleAutoDeductInventory}
          disabled={updatingInventorySettings}
        />
        <Label
          htmlFor="auto-deduct-inventory"
          className="text-sm cursor-pointer flex items-center gap-2"
        >
          {updatingInventorySettings && <Loader2 className="h-4 w-4 animate-spin" />}
          خصم المخزون تلقائياً عند قبول الطلبية
        </Label>
      </div>

      {/* Bulk Actions */}
      {permissions.canBulkAssign && pendingOrdersCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setBulkAutoAssignOpen(true)}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          تعيين جماعي ({pendingOrdersCount})
        </Button>
      )}
    </div>
  );
};

export default memo(OrdersToolbar);
