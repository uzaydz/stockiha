import { useState, Fragment } from "react";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { 
  TooltipProvider, 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent 
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Copy, User, Phone, Calendar } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";

import OrderStatusBadge from "./OrderStatusBadge";
import OrderSourceBadge from "./OrderSourceBadge";
import OrderStatusDropdown from "../OrderStatusDropdown";
import OrderDetailsPanel from "./OrderDetailsPanel";
import OrderActionsDropdown from "./OrderActionsDropdown";
import { OrdersTableRowProps } from "./OrderTableTypes";
import CallConfirmationDropdown from "../CallConfirmationDropdown";
import CallConfirmationBadge from "../CallConfirmationBadge";
import ShippingProviderBadge from "./ShippingProviderBadge";

const OrdersTableRow = ({
  order,
  selected,
  onSelect,
  onUpdateStatus,
  onUpdateCallConfirmation,
  hasUpdatePermission,
  hasCancelPermission,
  visibleColumns = [],
  expanded = false,
  onToggleExpand,
  currentUserId
}: OrdersTableRowProps) => {
  // التحقق من توفر البيانات المطلوبة
  if (!order) return null;

  // <-- START: Added log for received order prop -->
  
  // <-- END: Added log for received order prop -->

  // استخراج بيانات الطلب للعرض
  const {
    id,
    customer_order_number,
    customer,
    total,
    payment_method,
    payment_status,
    created_at,
    status,
    created_from,
    order_items = []
  } = order;

  // تنسيق رقم الطلب للعرض
  const formattedOrderNumber = customer_order_number 
    ? `#${customer_order_number}` 
    : `#${id.slice(0, 8)}`;

  // استخراج بيانات العميل للعرض
  const customerName = customer?.name || 'عميل غير معرف';
  const customerContact = customer?.phone || customer?.email || '';

  return (
    <>
      <TableRow 
        className={`
          ${selected ? "bg-muted/30" : ""}
          hover:bg-muted/20 
          transition-colors 
          cursor-pointer
          group
          border-t border-b border-transparent hover:border-muted
        `}
        onClick={() => onToggleExpand?.()}
      >
        {/* خانة تحديد الطلب */}
        {visibleColumns.includes("checkbox") && (
          <TableCell className="w-10 p-2" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelect(id, !!checked)}
              aria-label={`تحديد الطلب ${formattedOrderNumber}`}
            />
          </TableCell>
        )}
        
        {/* زر توسيع/طي تفاصيل الطلب */}
        {visibleColumns.includes("expand") && (
          <TableCell className="w-10 p-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 transition-opacity opacity-70 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
              }}
              aria-label={expanded ? "طي التفاصيل" : "عرض التفاصيل"}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </TableCell>
        )}
        
        {/* رقم الطلب */}
        {visibleColumns.includes("id") && (
          <TableCell>
            <div className="font-medium">{formattedOrderNumber}</div>
          </TableCell>
        )}
        
        {/* اسم العميل */}
        {visibleColumns.includes("customer_name") && (
          <TableCell>
            <div className="font-medium">{customerName}</div>
          </TableCell>
        )}
        
        {/* بيانات الاتصال بالعميل */}
        {visibleColumns.includes("customer_contact") && (
          <TableCell>
            {customerContact ? (
              <div className="flex items-center gap-1.5">
                {customerContact.includes('@') ? (
                  <>
                    <User className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-sm">{customerContact}</span>
                  </>
                ) : (
                  <>
                    <Phone className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-sm" dir="ltr">{customerContact}</span>
                  </>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">لا توجد بيانات اتصال</span>
            )}
          </TableCell>
        )}
        
        {/* إجمالي الطلب */}
        {visibleColumns.includes("total") && (
          <TableCell>
            <div className="flex items-center gap-2">
              <span className="font-medium text-emerald-600">{formatPrice(total)}</span>
              {/* <-- START: Added log for offer condition --> */}
              {(() => {
                const hasOffer = order.metadata && typeof order.metadata === 'object' && 'applied_quantity_offer' in order.metadata;
                
                if (hasOffer) {
                  return (
                     <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 border-blue-300">
                       عرض
                     </Badge>
                  );
                }
                return null;
              })()}
              {/* <-- END: Added log for offer condition --> */}
            </div>
            {order_items?.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {(total / (order_items?.length || 1)).toFixed(2)} لكل منتج
              </div>
            )}
          </TableCell>
        )}
        
        {/* عدد العناصر */}
        {visibleColumns.includes("items") && (
          <TableCell>
            {order_items?.length || 0} {order_items?.length === 1 ? 'منتج' : 'منتجات'}
          </TableCell>
        )}
        
        {/* حالة الطلب */}
        {visibleColumns.includes("status") && (
          <TableCell onClick={(e) => hasUpdatePermission && e.stopPropagation()}>
            <div className="flex justify-start">
              {hasUpdatePermission ? (
                <OrderStatusDropdown
                  currentStatus={status}
                  orderId={id}
                  onUpdateStatus={onUpdateStatus}
                  canCancel={hasCancelPermission}
                />
              ) : (
                <OrderStatusBadge status={status} />
              )}
            </div>
          </TableCell>
        )}
        
        {/* حالة تأكيد الإتصال */}
        {visibleColumns.includes("call_confirmation") && (
          <TableCell onClick={(e) => hasUpdatePermission && e.stopPropagation()}>
            <div className="flex justify-start">
              {hasUpdatePermission && onUpdateCallConfirmation ? (
                <CallConfirmationDropdown
                  currentStatusId={order.call_confirmation_status_id || null}
                  orderId={id}
                  onUpdateStatus={onUpdateCallConfirmation}
                  userId={currentUserId}
                />
              ) : order.call_confirmation_status ? (
                <CallConfirmationBadge status={order.call_confirmation_status} />
              ) : (
                <span className="text-xs text-muted-foreground">لم يتم تحديد</span>
              )}
            </div>
          </TableCell>
        )}
        
        {/* مزود الشحن */}
        {visibleColumns.includes("shipping_provider") && (
          <TableCell>
            <ShippingProviderBadge
              yalidineTrackingId={order.yalidine_tracking_id}
              zrexpressTrackingId={order.zrexpress_tracking_id}
            />
          </TableCell>
        )}
        
        {/* معلومات الطلب */}
        {visibleColumns.includes("source") && (
          <TableCell>
            <OrderSourceBadge 
              source={created_from || 'web'} 
              deliveryType={order.shipping_option || order.form_data?.deliveryOption || "home"}
              created_at={created_at}
              shipping_option={order.shipping_option || order.form_data?.deliveryOption}
            />
          </TableCell>
        )}
        
        {/* إجراءات الطلب */}
        {visibleColumns.includes("actions") && (
          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
            <OrderActionsDropdown
              order={order}
              onUpdateStatus={onUpdateStatus}
              hasUpdatePermission={hasUpdatePermission}
              hasCancelPermission={hasCancelPermission}
            />
          </TableCell>
        )}
      </TableRow>
      
      {/* عرض تفاصيل الطلب عند توسيعه */}
      {expanded && (
        <TableRow>
          <TableCell colSpan={visibleColumns.length + 1} className="p-0 border-t-0">
            <OrderDetailsPanel order={order} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export default OrdersTableRow; 