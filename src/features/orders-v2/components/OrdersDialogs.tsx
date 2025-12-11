/**
 * OrdersDialogs - جميع نوافذ الحوار للطلبيات
 */

import React, { memo, Suspense, lazy } from 'react';
import { useOrders } from '../context/OrdersContext';

// Lazy load dialogs
const StopDeskSelectionDialog = lazy(() =>
  import('@/components/orders/dialogs/StopDeskSelectionDialog').then(mod => ({
    default: mod.StopDeskSelectionDialog
  }))
);

const BulkAutoAssignDialog = lazy(() =>
  import('@/components/orders/dialogs/BulkAutoAssignDialog').then(mod => ({
    default: mod.default || mod.BulkAutoAssignDialog
  }))
);

const DialogSkeleton: React.FC = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div className="bg-background rounded-lg p-8">
      <div className="animate-pulse flex space-x-4">
        <div className="rounded-full bg-muted h-10 w-10"></div>
        <div className="flex-1 space-y-6 py-1">
          <div className="h-2 bg-muted rounded"></div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="h-2 bg-muted rounded col-span-2"></div>
              <div className="h-2 bg-muted rounded col-span-1"></div>
            </div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const OrdersDialogs: React.FC = () => {
  const {
    stopDeskDialogOpen,
    setStopDeskDialogOpen,
    pendingShipmentData,
    handleStopDeskConfirm,
    bulkAutoAssignOpen,
    setBulkAutoAssignOpen,
    displayOrders,
    organizationId,
    refresh,
  } = useOrders();

  // Get pending unassigned orders for bulk assign
  const pendingUnassignedOrders = displayOrders.filter(
    (o) => o.status === 'pending' && !o.assignment?.staff_id
  );

  return (
    <>
      {/* Stop Desk Selection Dialog */}
      {stopDeskDialogOpen && pendingShipmentData && (
        <Suspense fallback={<DialogSkeleton />}>
          <StopDeskSelectionDialog
            open={stopDeskDialogOpen}
            onOpenChange={setStopDeskDialogOpen}
            wilayaId={pendingShipmentData.order.wilayaId}
            communeId={pendingShipmentData.order.communeId}
            onConfirm={handleStopDeskConfirm}
            providerCode={pendingShipmentData.providerCode}
          />
        </Suspense>
      )}

      {/* Bulk Auto Assign Dialog */}
      {bulkAutoAssignOpen && organizationId && (
        <Suspense fallback={<DialogSkeleton />}>
          <BulkAutoAssignDialog
            open={bulkAutoAssignOpen}
            onOpenChange={setBulkAutoAssignOpen}
            organizationId={organizationId}
            orders={pendingUnassignedOrders as any}
            onAssignComplete={refresh}
          />
        </Suspense>
      )}
    </>
  );
};

export default memo(OrdersDialogs);
