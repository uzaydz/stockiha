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

const OrdersTable: React.FC = () => {
  const navigate = useNavigate();
  const {
    displayOrders,
    loading,
    fetching,
    updateOrderStatus,
    updateCallConfirmation,
    sendToProvider,
    sharedData,
  } = useOrders();

  const permissions = useOrdersPermissions();

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
      />

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
