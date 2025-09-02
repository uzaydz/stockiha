import React, { memo, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Grid, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

import OrderCard from "./OrderCard";
import OrdersTableSearch from "../table/OrdersTableSearch";
import OrdersTablePagination from "../table/OrdersTablePagination";
import { type ExtendedOrdersTableProps, Order } from "../table/OrderTableTypes";
import { useOrdersTableLogic } from "../table/useOrdersTableLogic";

interface OrdersCardViewProps extends ExtendedOrdersTableProps {
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

const OrdersCardView = memo(({ 
  orders,
  loading,
  onUpdateStatus,
  onUpdateCallConfirmation,
  onSendToProvider,
  onBulkUpdateStatus,
  hasUpdatePermission,
  hasCancelPermission,
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
  viewMode = 'grid',
  onViewModeChange,
}: OrdersCardViewProps) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  // استخدام الـ hook المخصص لمنطق الجدول
  const {
    selectedOrders,
    searchFilter,
    expandedOrders,
    filteredOrders,
    allSelected,
    setSearchFilter,
    handleSelectAll,
    handleSelectOrder,
    handleToggleExpand,
    resetSelections,
  } = useOrdersTableLogic({ orders, processLocally: !onSearchTermChange });

  // عدد الطلبات المفلترة
  const effectiveFilteredCount = orders.length;

  // Infinite scroll effect
  useEffect(() => {
    if (!autoLoadMoreOnScroll || !onLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !loading) {
          onLoadMore();
        }
      }
    }, { 
      root: null, 
      rootMargin: '200px', 
      threshold: 0 
    });
    
    io.observe(el);
    return () => io.disconnect();
  }, [autoLoadMoreOnScroll, onLoadMore, loading]);

  // Loading skeleton for cards
  const renderLoadingSkeleton = () => (
    <div className={cn(
      "gap-4",
      viewMode === 'grid' 
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
        : "flex flex-col"
    )}>
      {Array.from({ length: pageSize }).map((_, index) => (
        <div 
          key={`skeleton-${index}`}
          className="bg-card/50 rounded-lg border border-border/20 p-4 space-y-4"
        >
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 bg-muted/60 rounded" />
              <Skeleton className="h-6 w-24 bg-muted/60 rounded" />
            </div>
            <Skeleton className="h-8 w-8 bg-muted/60 rounded" />
          </div>

          {/* Customer info skeleton */}
          <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
            <Skeleton className="h-8 w-8 bg-muted/60 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 bg-muted/60 rounded" />
              <Skeleton className="h-3 w-24 bg-muted/40 rounded" />
            </div>
          </div>

          {/* Info grid skeleton */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50/50 rounded-lg">
              <Skeleton className="h-4 w-16 bg-muted/60 rounded mb-1" />
              <Skeleton className="h-5 w-20 bg-muted/60 rounded" />
            </div>
            <div className="p-3 bg-blue-50/50 rounded-lg">
              <Skeleton className="h-4 w-16 bg-muted/60 rounded mb-1" />
              <Skeleton className="h-5 w-16 bg-muted/60 rounded" />
            </div>
          </div>

          {/* Status skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-20 bg-muted/60 rounded-full" />
            <Skeleton className="h-6 w-24 bg-muted/60 rounded" />
          </div>

          {/* Footer skeleton */}
          <div className="flex items-center justify-between pt-2 border-t border-border/20">
            <Skeleton className="h-4 w-28 bg-muted/40 rounded" />
            <Skeleton className="h-4 w-20 bg-muted/40 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center text-muted-foreground py-24">
      <div className="p-8 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 mb-8 shadow-lg">
        <Search className="h-16 w-16 opacity-50" />
      </div>
      <h3 className="text-2xl font-bold mb-4 text-foreground">لا توجد طلبات</h3>
      <p className="text-lg text-muted-foreground max-w-md text-center leading-relaxed">
        {searchFilter ? 
          `لم يتم العثور على طلبات تطابق "${searchFilter}". جرب البحث بمصطلح آخر أو امسح الفلتر.` :
          "لم يتم العثور على أي طلبات حالياً. ستظهر الطلبات الجديدة هنا عند وصولها."
        }
      </p>
    </div>
  );

  // Render orders cards
  const renderOrderCards = () => (
    <div className={cn(
      "gap-4 transition-all duration-300",
      viewMode === 'grid' 
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
        : "flex flex-col"
    )}>
      {filteredOrders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          selected={selectedOrders.includes(order.id)}
          onSelect={handleSelectOrder}
          onUpdateStatus={onUpdateStatus}
          onUpdateCallConfirmation={onUpdateCallConfirmation}
          onSendToProvider={onSendToProvider}
          hasUpdatePermission={hasUpdatePermission}
          hasCancelPermission={hasCancelPermission}
          expanded={!!expandedOrders[order.id]}
          onToggleExpand={() => handleToggleExpand(order.id)}
          currentUserId={currentUserId}
          shippingProviders={shippingProviders}
        />
      ))}
    </div>
  );

  return (
    <div className="relative min-h-0 pb-4">
      {/* Search and Controls Header */}
      <div className="bg-background/95 backdrop-blur-sm border-b border-border/20 sticky top-0 z-10 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">إدارة الطلبات</h2>
          
          {/* View Mode Toggle */}
          {onViewModeChange && (
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className="h-8 w-8 p-0"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                className="h-8 w-8 p-0"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Search Component */}
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
      </div>

      {/* Cards Content */}
      <div className="px-4">
        {loading ? renderLoadingSkeleton() : 
         filteredOrders.length === 0 ? renderEmptyState() : 
         renderOrderCards()}

        {/* Infinite Scroll Sentinel */}
        {autoLoadMoreOnScroll && !loading && filteredOrders.length > 0 && (
          <div ref={sentinelRef} className="h-10 flex items-center justify-center mt-6">
            {hasMoreOrders && (
              <div className="text-muted-foreground text-sm">جاري تحميل المزيد...</div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredOrders.length > 0 && !autoLoadMoreOnScroll && (
        <div className="mt-8 px-4">
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
        </div>
      )}
    </div>
  );
});

OrdersCardView.displayName = "OrdersCardView";

export default OrdersCardView;
