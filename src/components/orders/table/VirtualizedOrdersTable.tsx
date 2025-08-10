import React, { memo } from 'react';
import { Table, TableBody } from '@/components/ui/table';
import { type ExtendedOrdersTableProps, Order } from './OrderTableTypes';
import OrdersTableHeader from './OrdersTableHeader';
import OrderTableRow from './OrderTableRow';

interface SimpleOrdersTableProps extends ExtendedOrdersTableProps {
  // Props للتحكم في الجدول
  selectedOrders: string[];
  expandedOrders: Record<string, boolean>;
  onSelectOrder: (orderId: string, selected: boolean) => void;
  onToggleExpand: (orderId: string) => void;
  allSelected: boolean;
  onSelectAll: (selected: boolean) => void;
}

const SimpleOrdersTable = memo(({
  orders,
  loading,
  onUpdateStatus,
  onUpdateCallConfirmation,
  onSendToProvider,
  hasUpdatePermission,
  hasCancelPermission,
  visibleColumns = ["checkbox", "expand", "id", "customer_name", "customer_contact", "total", "status", "call_confirmation", "shipping_provider", "actions"],
  currentUserId,
  shippingProviders = [],
  // Props للتحكم في الجدول
  selectedOrders = [],
  expandedOrders = {},
  onSelectOrder,
  onToggleExpand,
  allSelected = false,
  onSelectAll,
}: SimpleOrdersTableProps) => {

  if (loading) {
    return (
      <div className="rounded-lg border border-border/30 bg-background/50 backdrop-blur-sm overflow-hidden">
        <Table className="w-full min-w-[1200px]">
          <OrdersTableHeader
            visibleColumns={visibleColumns}
            allSelected={allSelected}
            filteredOrdersLength={0}
            onSelectAll={onSelectAll}
          />
        </Table>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">جاري تحميل الطلبيات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/30 bg-background/80 overflow-hidden">
      <Table className="w-full min-w-[1200px]">
        <OrdersTableHeader
          visibleColumns={visibleColumns}
          allSelected={allSelected}
          filteredOrdersLength={orders.length}
          onSelectAll={onSelectAll}
        />
        <TableBody>
          {orders.map((order) => (
            <OrderTableRow
              key={order.id}
              order={order}
              selected={selectedOrders.includes(order.id)}
              onSelect={onSelectOrder}
              onUpdateStatus={onUpdateStatus}
              onUpdateCallConfirmation={onUpdateCallConfirmation}
              onSendToProvider={onSendToProvider}
              hasUpdatePermission={hasUpdatePermission}
              hasCancelPermission={hasCancelPermission}
              visibleColumns={visibleColumns}
              expanded={!!expandedOrders[order.id]}
              onToggleExpand={() => onToggleExpand(order.id)}
              currentUserId={currentUserId}
              shippingProviders={shippingProviders}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

SimpleOrdersTable.displayName = "SimpleOrdersTable";

export default SimpleOrdersTable;
