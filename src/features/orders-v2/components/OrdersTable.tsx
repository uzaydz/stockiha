/**
 * OrdersTable - مكون جدول الطلبيات المتقدم
 *
 * يستخدم AdvancedOrdersTable مع TanStack Table:
 * - جميع الأعمدة ظاهرة
 * - صفوف قابلة للتوسيع لعرض التفاصيل
 * - فرز وفلترة متقدمة
 * - تصميم shadcn ui احترافي
 */

import React, { memo, useCallback, useMemo } from 'react';
import AdvancedOrdersTable from '@/components/orders/table/AdvancedOrdersTable';
import { useOrders } from '../context/OrdersContext';
import { useOrdersPermissions } from '../hooks';
import { useNavigate } from 'react-router-dom';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const OrdersTable: React.FC = () => {
  const navigate = useNavigate();
  const {
    displayOrders,
    loading,
    fetching,
    pagination,
    goToPage,
    totalCount,
    userRole,
    addCallConfirmationStatus,
    deleteCallConfirmationStatus,
    updateOrderStatus,
    updateCallConfirmation,
    sendToProvider,
    sharedData,
  } = useOrders();

  const permissions = useOrdersPermissions();
  const canManageCallConfirmationStatuses = userRole === 'admin' || userRole === 'owner' || userRole === 'super_admin';

  // Handlers
  const handleUpdateStatus = useCallback(async (orderId: string, status: string) => {
    await updateOrderStatus(orderId, status);
  }, [updateOrderStatus]);

  const handleUpdateCallConfirmation = useCallback(async (
    orderId: string,
    statusId: number,
    notes?: string
  ) => {
    await updateCallConfirmation(orderId, statusId, notes);
  }, [updateCallConfirmation]);

  const handleSendToProvider = useCallback((order: any, providerCode: string) => {
    sendToProvider(order.id, providerCode);
  }, [sendToProvider]);

  const handleOrderView = useCallback((order: any) => {
    navigate(`/dashboard/orders-v2/${order.id}`);
  }, [navigate]);

  const handleOrderEdit = useCallback((order: any) => {
    // TODO: Open edit dialog
    console.log('Edit order:', order.id);
  }, []);

  const handleOrderPrint = useCallback((order: any) => {
    // TODO: Print order
    window.print();
  }, []);

  // Memoize orders to prevent unnecessary re-renders
  const memoizedOrders = useMemo(() => displayOrders, [displayOrders]);

  const { currentPage, totalPages, hasNextPage, hasPreviousPage, totalItems } = pagination;

  const handlePageChange = useCallback((page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    goToPage(page);
  }, [currentPage, goToPage, totalPages]);

  const showNumberedPages = totalItems > 0 && totalPages > 1;
  const visiblePages = useMemo(() => {
    if (!showNumberedPages) return [];
    const windowSize = 2;
    const start = Math.max(1, currentPage - windowSize);
    const end = Math.min(totalPages, currentPage + windowSize);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, showNumberedPages, totalPages]);

  return (
    <div className={`relative ${fetching ? 'opacity-90' : ''}`}>
      {/* Loading Overlay */}
      {fetching && (
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="h-0.5 bg-blue-100 overflow-hidden">
            <div
              className="h-full bg-blue-500 animate-[loading_1.5s_ease-in-out_infinite]"
              style={{ width: '30%' }}
            />
          </div>
        </div>
      )}

      <AdvancedOrdersTable
        orders={memoizedOrders as any}
        loading={loading && !memoizedOrders.length}
        onOrderView={handleOrderView}
        onOrderEdit={handleOrderEdit}
        onOrderPrint={handleOrderPrint}
        onUpdateStatus={handleUpdateStatus}
        onUpdateCallConfirmation={handleUpdateCallConfirmation}
        onSendToProvider={handleSendToProvider}
        hasUpdatePermission={permissions.canUpdate}
        hasCancelPermission={permissions.canCancel}
        shippingProviders={sharedData.shippingProviders}
        callConfirmationStatuses={sharedData.callConfirmationStatuses}
        onAddCallConfirmationStatus={canManageCallConfirmationStatuses ? addCallConfirmationStatus : undefined}
        onDeleteCallConfirmationStatus={canManageCallConfirmationStatuses ? deleteCallConfirmationStatus : undefined}
        showManageCallConfirmationStatuses={canManageCallConfirmationStatuses}
      />

      {/* Server-side pagination (20 per page) */}
      {(hasPreviousPage || hasNextPage || totalPages > 1) && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            الصفحة {currentPage}
            {totalItems > 0 ? ` من ${totalPages} • إجمالي ${totalItems.toLocaleString()} طلبية` : ''}
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={!hasPreviousPage ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              {showNumberedPages && visiblePages.map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === currentPage}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={!hasNextPage ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Loading animation styles */}
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};

export default memo(OrdersTable);
