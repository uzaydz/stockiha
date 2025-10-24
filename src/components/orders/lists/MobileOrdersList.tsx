import React, { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Package, ChevronRight, ChevronLeft, RefreshCw } from "lucide-react";
import OrderCard from "../cards/OrderCard";
import OrderActions from "../cards/OrderActions";
import OrderDetailsSheet from "../sheets/OrderDetailsSheet";

// مكون skeleton محسّن
const OrderSkeleton = memo(() => (
  <div className="rounded-xl border border-border/20 bg-card p-4 shadow-sm">
    <div className="h-4 w-24 bg-muted/40 rounded mb-3" />
    <div className="h-3 w-36 bg-muted/30 rounded mb-2" />
    <div className="h-3 w-28 bg-muted/30 rounded mb-2" />
    <div className="h-10 w-full bg-muted/20 rounded mt-3" />
  </div>
));
OrderSkeleton.displayName = "OrderSkeleton";

interface MobileOrdersListProps {
  orders: any[];
  loading: boolean;
  localUpdates: Record<string, any>;
  updatingById: Record<string, boolean>;
  updatingCallById: Record<string, boolean>;
  editMode: string | null;
  editedData: any;
  savingOrder: boolean;
  isCalculatingDelivery: boolean;
  isCustomerBlocked: (order: any) => boolean;
  onStatusChange: (orderId: string, newStatus: string) => void;
  onCallConfirmationChange: (orderId: string, statusId: number, notes?: string) => void;
  onBlockCustomer: (order: any) => void;
  onUnblockCustomer: (order: any) => void;
  onNavigateToDetails: (orderId: string) => void;
  onShareOrder: (order: any) => void;
  onEditMode: (order: any) => void;
  onCancelEdit: () => void;
  onSaveOrderEdits: () => void;
  onFieldChange: (field: string, value: any) => void;
  callConfirmationStatuses?: Array<{ id: number; name: string; color?: string | null }>;
  shippingProviders?: Array<{ provider_code: string; provider_name: string }>;
  onSendToProvider?: (orderId: string, providerCode: string) => void;
  organizationId?: string;
  onUpdateOrder?: (orderId: string, updates: any) => Promise<void>;
  // Pagination props
  totalItems?: number;
  currentPage?: number;
  pageSize?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
  hasMoreOrders?: boolean;
  onPageChange?: (page: number) => void;
  onLoadMore?: () => void;
}

const MobileOrdersList = memo(({
  orders,
  loading,
  localUpdates,
  updatingById,
  updatingCallById,
  editMode,
  editedData,
  savingOrder,
  isCalculatingDelivery,
  isCustomerBlocked,
  onStatusChange,
  onCallConfirmationChange,
  onBlockCustomer,
  onUnblockCustomer,
  onNavigateToDetails,
  onShareOrder,
  onEditMode,
  onCancelEdit,
  onSaveOrderEdits,
  onFieldChange,
  callConfirmationStatuses = [],
  shippingProviders = [],
  onSendToProvider,
  organizationId,
  onUpdateOrder,
  totalItems,
  currentPage,
  pageSize,
  hasPreviousPage,
  hasNextPage,
  hasMoreOrders,
  onPageChange,
  onLoadMore
}: MobileOrdersListProps) => {
  if (loading && orders.length === 0) {
    return (
      <div className="space-y-3 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <OrderSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {orders.map((order: any) => {
        const localUpdate = localUpdates[order.id] || {};
        const updatedOrder = { ...order, ...localUpdate };
        
        return (
          <div key={order.id} className="space-y-3">
            <OrderCard
              order={order}
              localUpdate={localUpdate}
              updatingById={updatingById}
              updatingCallById={updatingCallById}
              isCustomerBlocked={isCustomerBlocked}
              onStatusChange={onStatusChange}
              onCallConfirmationChange={onCallConfirmationChange}
              onBlockCustomer={onBlockCustomer}
              onUnblockCustomer={onUnblockCustomer}
              onNavigateToDetails={onNavigateToDetails}
              onShareOrder={onShareOrder}
              callConfirmationStatuses={callConfirmationStatuses}
              shippingProviders={shippingProviders}
              onSendToProvider={onSendToProvider}
              organizationId={organizationId}
              onUpdateOrder={onUpdateOrder}
            />

            <OrderActions
              order={order}
              updatedOrder={updatedOrder}
              updatingById={updatingById}
              updatingCallById={updatingCallById}
              onStatusChange={onStatusChange}
              onCallConfirmationChange={onCallConfirmationChange}
              callConfirmationStatuses={callConfirmationStatuses}
              shippingProviders={shippingProviders}
              onSendToProvider={onSendToProvider}
            />

            <OrderDetailsSheet
              order={order}
              updatedOrder={updatedOrder}
              editMode={editMode}
              editedData={editedData}
              savingOrder={savingOrder}
              updatingById={updatingById}
              updatingCallById={updatingCallById}
              onEditMode={onEditMode}
              onCancelEdit={onCancelEdit}
              onSaveOrderEdits={onSaveOrderEdits}
              onFieldChange={onFieldChange}
              onStatusChange={onStatusChange}
              onCallConfirmationChange={onCallConfirmationChange}
              callConfirmationStatuses={callConfirmationStatuses}
              isCalculatingDelivery={isCalculatingDelivery}
            />
          </div>
        );
      })}

      {/* Pagination للهاتف */}
      {orders.length > 0 && (
        <div className="py-4 space-y-3">
          {/* معلومات الصفحة */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/20 rounded-full text-sm">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                عرض {orders.length} من أصل {totalItems || orders.length} طلب
              </span>
            </div>
          </div>

          {/* أزرار التنقل */}
          {onPageChange && (
            <div className="flex items-center justify-between gap-3 px-2">
              <Button
                variant="outline"
                size="lg"
                disabled={!hasPreviousPage || (currentPage || 1) <= 1}
                onClick={() => onPageChange((currentPage || 1) - 1)}
                className="flex-1 h-12 text-sm font-medium"
              >
                <ChevronRight className="w-5 h-5 ml-1" />
                السابق
              </Button>
              
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                <span className="text-sm font-bold text-primary">
                  {currentPage || 1}
                </span>
                <span className="text-xs text-muted-foreground">/</span>
                <span className="text-sm text-muted-foreground">
                  {Math.ceil((totalItems || orders.length) / (pageSize || 20))}
                </span>
              </div>

              <Button
                variant="outline"
                size="lg"
                disabled={!hasNextPage}
                onClick={() => onPageChange((currentPage || 1) + 1)}
                className="flex-1 h-12 text-sm font-medium"
              >
                التالي
                <ChevronLeft className="w-5 h-5 mr-1" />
              </Button>
            </div>
          )}

          {/* أو زر "تحميل المزيد" إذا كان هناك infinite scroll */}
          {hasMoreOrders && onLoadMore && !onPageChange && (
            <div className="px-2">
              <Button
                variant="outline"
                size="lg"
                disabled={loading}
                onClick={onLoadMore}
                className="w-full h-12 text-sm font-medium"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 ml-2" />
                    جاري التحميل...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 ml-2" />
                    تحميل المزيد
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

MobileOrdersList.displayName = "MobileOrdersList";

export default MobileOrdersList;
