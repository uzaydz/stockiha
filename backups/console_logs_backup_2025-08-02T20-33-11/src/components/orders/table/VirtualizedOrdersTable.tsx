import { memo, useMemo, useRef, useEffect, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { Table } from "@/components/ui/table";
import { Order, type ExtendedOrdersTableProps } from "./OrderTableTypes";
import OrdersTableHeader from "./OrdersTableHeader";
import OrderTableRow from "./OrderTableRow";

interface VirtualizedOrdersTableProps extends ExtendedOrdersTableProps {
  itemHeight?: number;
  containerHeight?: number;
}

interface RowData {
  orders: Order[];
  visibleColumns: string[];
  selectedOrders: string[];
  expandedOrders: Record<string, boolean>;
  onSelectOrder: (orderId: string, selected: boolean) => void;
  onToggleExpand: (orderId: string) => void;
  onUpdateStatus: ExtendedOrdersTableProps['onUpdateStatus'];
  onUpdateCallConfirmation?: ExtendedOrdersTableProps['onUpdateCallConfirmation'];
  onSendToProvider?: ExtendedOrdersTableProps['onSendToProvider'];
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  currentUserId?: string;
  shippingProviders: ExtendedOrdersTableProps['shippingProviders'];
}

const VirtualizedRow = memo(({ index, style, data }: {
  index: number;
  style: React.CSSProperties;
  data: RowData;
}) => {
  const {
    orders,
    visibleColumns,
    selectedOrders,
    expandedOrders,
    onSelectOrder,
    onToggleExpand,
    onUpdateStatus,
    onUpdateCallConfirmation,
    onSendToProvider,
    hasUpdatePermission,
    hasCancelPermission,
    currentUserId,
    shippingProviders,
  } = data;

  const order = orders[index];
  if (!order) return null;

  return (
    <div style={style}>
      <OrderTableRow
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
    </div>
  );
});

VirtualizedRow.displayName = "VirtualizedRow";

const VirtualizedOrdersTable = memo(({
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
  itemHeight = 80, // ارتفاع كل صف
  containerHeight = 600, // ارتفاع الحاوية
  // Props للتحكم في الجدول
  selectedOrders = [],
  expandedOrders = {},
  onSelectOrder,
  onToggleExpand,
  allSelected = false,
  onSelectAll,
}: VirtualizedOrdersTableProps & {
  selectedOrders: string[];
  expandedOrders: Record<string, boolean>;
  onSelectOrder: (orderId: string, selected: boolean) => void;
  onToggleExpand: (orderId: string) => void;
  allSelected: boolean;
  onSelectAll: (selected: boolean) => void;
}) => {
  const listRef = useRef<List>(null);

  // بيانات الصفوف للـ virtualization
  const rowData = useMemo<RowData>(() => ({
    orders,
    visibleColumns,
    selectedOrders,
    expandedOrders,
    onSelectOrder,
    onToggleExpand,
    onUpdateStatus,
    onUpdateCallConfirmation,
    onSendToProvider,
    hasUpdatePermission,
    hasCancelPermission,
    currentUserId,
    shippingProviders,
  }), [
    orders,
    visibleColumns,
    selectedOrders,
    expandedOrders,
    onSelectOrder,
    onToggleExpand,
    onUpdateStatus,
    onUpdateCallConfirmation,
    onSendToProvider,
    hasUpdatePermission,
    hasCancelPermission,
    currentUserId,
    shippingProviders,
  ]);

  // حساب ارتفاع ديناميكي للصفوف المتوسعة
  const getItemSize = useMemo(() => {
    return (index: number) => {
      const order = orders[index];
      if (!order) return itemHeight;
      
      // إذا كان الصف متوسعاً، أضف مساحة إضافية
      const isExpanded = expandedOrders[order.id];
      return isExpanded ? itemHeight * 3 : itemHeight;
    };
  }, [orders, expandedOrders, itemHeight]);

  // إعادة حساب الحجم عند تغيير التوسيع
  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [expandedOrders]);

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
    <div className="rounded-lg border border-border/30 bg-background/50 backdrop-blur-sm overflow-hidden">
      {/* رأس الجدول الثابت */}
      <Table className="w-full min-w-[1200px]">
        <OrdersTableHeader
          visibleColumns={visibleColumns}
          allSelected={allSelected}
          filteredOrdersLength={orders.length}
          onSelectAll={onSelectAll}
        />
      </Table>
      
      {/* الجدول المُحسن مع virtualization */}
      <div style={{ height: containerHeight }}>
        <List
          ref={listRef}
          height={containerHeight}
          itemCount={orders.length}
          itemSize={getItemSize}
          itemData={rowData}
          overscanCount={5} // عدد الصفوف الإضافية للتحميل المسبق
          style={{ minWidth: '1200px' }}
        >
          {VirtualizedRow}
        </List>
      </div>
    </div>
  );
});

VirtualizedOrdersTable.displayName = "VirtualizedOrdersTable";

export default VirtualizedOrdersTable;
