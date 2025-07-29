import { memo } from "react";
import { Table } from "@/components/ui/table";
import { type ExtendedOrdersTableProps } from "./OrderTableTypes";

// استيراد المكونات المنفصلة
import OrdersTableSearch from "./OrdersTableSearch";
import OrdersTableScrollControls from "./OrdersTableScrollControls";
import OrdersTableHeader from "./OrdersTableHeader";
import OrdersTableBody from "./OrdersTableBody";
import OrdersTablePagination from "./OrdersTablePagination";

// استيراد الـ hooks المخصصة
import { useOrdersTableLogic } from "./useOrdersTableLogic";

const OrdersTable = memo(({
  orders,
  loading,
  onUpdateStatus,
  onUpdateCallConfirmation,
  onSendToProvider,
  onBulkUpdateStatus,
  hasUpdatePermission,
  hasCancelPermission,
  visibleColumns = ["checkbox", "expand", "id", "customer_name", "customer_contact", "total", "status", "call_confirmation", "shipping_provider", "actions"],
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
}: ExtendedOrdersTableProps) => {
  // استخدام الـ hook المخصص لمنطق الجدول
  const {
    selectedOrders,
    searchFilter,
    expandedOrders,
    showLeftScroll,
    showRightScroll,
    scrollProgress,
    tableContainerRef,
    filteredOrders,
    allSelected,
    setSearchFilter,
    handleSelectAll,
    handleSelectOrder,
    handleToggleExpand,
    resetSelections,
    checkScrollability,
    scrollTable,
    scrollToStart,
    scrollToEnd,
    scrollToProgress,
  } = useOrdersTableLogic({ orders });

  // تم حذف useScrollTableEffects لأنه غير مطلوب

  return (
    <div className="relative min-h-0">
      {/* شريط البحث والإجراءات العلوي */}
      <OrdersTableSearch
        searchFilter={searchFilter}
        onSearchChange={setSearchFilter}
        filteredOrdersCount={filteredOrders.length}
                  selectedOrders={selectedOrders}
        onBulkUpdateStatus={onBulkUpdateStatus}
        onResetSelections={resetSelections}
                  hasUpdatePermission={hasUpdatePermission}
                  hasCancelPermission={hasCancelPermission}
                />
      
      {/* الجدول المحسن مع تصميم حديث */}
      <div className="relative">
        {/* عناصر التحكم في التمرير */}
        <OrdersTableScrollControls
          showLeftScroll={showLeftScroll}
          showRightScroll={showRightScroll}
          scrollProgress={scrollProgress}
          onScrollLeft={() => scrollTable('left')}
          onScrollRight={() => scrollTable('right')}
          onScrollToStart={scrollToStart}
          onScrollToEnd={scrollToEnd}
          onScrollProgress={scrollToProgress}
        />
        
        <div className="rounded-lg border border-border/30 bg-background/50 backdrop-blur-sm overflow-hidden">
          <div 
            ref={tableContainerRef}
            className={`orders-table-container overflow-x-auto overflow-y-visible ${
              showLeftScroll && showRightScroll ? 'scroll-fade-both' :
              showLeftScroll ? 'scroll-fade-left' :
              showRightScroll ? 'scroll-fade-right' : ''
            }`}
          >
            <Table className="w-full min-w-[1200px]">
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
      </div>
    </div>
  );
});

OrdersTable.displayName = "OrdersTable";

export default OrdersTable;
