import { memo } from "react";
import { Table } from "@/components/ui/table";
import { type ExtendedOrdersTableProps } from "./OrderTableTypes";

// استيراد المكونات المنفصلة
import OrdersTableSearch from "./OrdersTableSearch";
import OrdersTableHeader from "./OrdersTableHeader";
import OrdersTableBody from "./OrdersTableBody";
import OrdersTablePagination from "./OrdersTablePagination";

// استيراد الـ hooks المخصصة
import { useOrdersTableLogic } from "./useOrdersTableLogic";

// استيراد ملف CSS المخصص لتحسين الأداء
import "../orders-performance.css";

// ملاحظة: للحصول على عرض متجاوب للهاتف، استخدم ResponsiveOrdersTable بدلاً من هذا المكون

const OrdersTable = memo(({ 
  orders,
  loading,
  onUpdateStatus,
  onUpdateCallConfirmation,
  onSendToProvider,
  onBulkUpdateStatus,
  hasUpdatePermission,
  hasCancelPermission,
  visibleColumns = ["checkbox", "expand", "id", "customer_name", "customer_contact", "total", "status", "confirmation", "call_confirmation", "shipping_provider", "delivery_type", "financial", "actions"],
  currentUserId,
  currentPage = 1,
  totalItems = 0,
  pageSize = 15,
  hasNextPage = false,
  hasPreviousPage = false,
  onPageChange,
  onLoadMore,
  hasMoreOrders = false,
  shippingProviders = [],
  onSearchTermChange,
  autoLoadMoreOnScroll,
  onOrderUpdated,
  localUpdates = {},
}: ExtendedOrdersTableProps) => {
  // استخدام الـ hook المخصص لمنطق الجدول
  const {
    selectedOrders,
    searchFilter,
    expandedOrders,
    showLeftScroll,
    showRightScroll,
    tableContainerRef,
    filteredOrders,
    allSelected,
    setSearchFilter,
    handleSelectAll,
    handleSelectOrder,
    handleToggleExpand,
    resetSelections,
  } = useOrdersTableLogic({ orders, processLocally: !onSearchTermChange });

  // عند وجود بحث محلي، يمكن أن يتعارض مع فلاتر الخادم.
  // لذا نعرض عدّ الفلاتر على أساس عدد الطلبات، ونجعل المرسل الخارجي مسؤولاً عن الفلترة الفعلية.
  const effectiveFilteredCount = orders.length;

  // تم حذف useScrollTableEffects لأنه غير مطلوب

  return (
    <div className="relative min-h-0">
      {/* شريط البحث والإجراءات العلوي */}
      <OrdersTableSearch
        searchFilter={searchFilter}
        onSearchChange={(q) => {
          setSearchFilter(q);
          if (onSearchTermChange) onSearchTermChange(q);
        }}
        filteredOrdersCount={effectiveFilteredCount}
                  selectedOrders={selectedOrders}
        onBulkUpdateStatus={onBulkUpdateStatus}
        onResetSelections={resetSelections}
                  hasUpdatePermission={hasUpdatePermission}
                  hasCancelPermission={hasCancelPermission}
                />
      
      {/* الجدول المحسن مع تصميم حديث */}
      <div className="relative w-full overflow-auto" style={{ contain: 'layout paint', contentVisibility: 'auto' as any }}>
        <Table className="table-fixed" style={{ minWidth: '1200px', tableLayout: 'fixed' as any }}>
          {/* رأس الجدول */}
          <OrdersTableHeader
            visibleColumns={visibleColumns}
            allSelected={allSelected}
            filteredOrdersLength={filteredOrders.length}
            onSelectAll={handleSelectAll}
          />
          
          {/* جسم الجدول */}
          <OrdersTableBody
            loading={loading}
            filteredOrders={filteredOrders}
            searchFilter={searchFilter}
            visibleColumns={visibleColumns}
            selectedOrders={selectedOrders}
            expandedOrders={expandedOrders}
            onSelectOrder={handleSelectOrder}
            onToggleExpand={handleToggleExpand}
            onUpdateStatus={onUpdateStatus}
            onUpdateCallConfirmation={onUpdateCallConfirmation}
            onSendToProvider={onSendToProvider}
            hasUpdatePermission={hasUpdatePermission}
            hasCancelPermission={hasCancelPermission}
            currentUserId={currentUserId}
            shippingProviders={shippingProviders}
            autoLoadMoreOnScroll={autoLoadMoreOnScroll}
            onLoadMore={onLoadMore}
            onOrderUpdated={onOrderUpdated}
            localUpdates={localUpdates}
          />
        </Table>
      </div>
      
      {/* شريط التنقل السفلي */}
      {filteredOrders.length > 0 && (
        <OrdersTablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          ordersLength={orders.length}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          hasMoreOrders={hasMoreOrders}
          loading={loading}
          onPageChange={onPageChange}
          onLoadMore={onLoadMore}
        />
      )}
    </div>
  );
});

OrdersTable.displayName = "OrdersTable";

export default OrdersTable;
