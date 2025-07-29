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
import ShippingProviderColumn from "./ShippingProviderColumn";

const OrdersTableRow = ({
  order,
  selected,
  onSelect,
  onUpdateStatus,
  onUpdateCallConfirmation,
  onSendToProvider,
  hasUpdatePermission,
  hasCancelPermission,
  visibleColumns = [],
  expanded = false,
  onToggleExpand,
  currentUserId,
  shippingProviders = []
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

  // استخراج بيانات العميل للعرض مع استخدام البيانات المحسنة
  const customerName = (order as any).customerName || 
                      customer?.name || 
                      (order.form_data?.fullName) ||
                      (order.form_data?.name) ||
                      `عميل #${customer_order_number}` ||
                      'عميل غير معرف';
                      
  const customerContact = (order as any).customerContact || 
                         customer?.phone || 
                         customer?.email || 
                         (order.form_data?.phone) ||
                         (order as any).shipping_address?.phone ||
                         '';

  return (
    <>
      <TableRow 
        className={`
          ${selected ? "bg-primary/5 border-primary/20" : ""}
          hover:bg-accent/20 
          transition-all duration-200
          cursor-pointer
          group
          border-b border-border/30
          ${selected ? "shadow-sm" : ""}
        `}
        onClick={() => onToggleExpand?.()}
      >
        {/* خانة تحديد الطلب */}
        {visibleColumns.includes("checkbox") && (
          <TableCell className="w-12 py-4 px-4" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelect(id, !!checked)}
              aria-label={`تحديد الطلب ${formattedOrderNumber}`}
              className="border-border/50 data-[state=checked]:border-primary"
            />
          </TableCell>
        )}
        
        {/* زر توسيع/طي تفاصيل الطلب */}
        {visibleColumns.includes("expand") && (
          <TableCell className="w-10 py-4 px-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 transition-opacity opacity-70 group-hover:opacity-100 text-foreground dark:text-zinc-200 hover:bg-accent dark:hover:bg-zinc-700"
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
          <TableCell className="py-4 px-4">
            <div className="font-semibold text-foreground bg-accent/30 px-2 py-1 rounded-md text-sm">{formattedOrderNumber}</div>
          </TableCell>
        )}
        
        {/* اسم العميل */}
        {visibleColumns.includes("customer_name") && (
          <TableCell className="py-4 px-4">
            <div className="font-medium text-foreground">{customerName}</div>
          </TableCell>
        )}
        
        {/* بيانات الاتصال بالعميل */}
        {visibleColumns.includes("customer_contact") && (
          <TableCell className="py-4 px-4">
            {customerContact ? (
              <div className="flex items-center gap-2">
                {customerContact.includes('@') ? (
                  <>
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/20">
                      <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm text-foreground">{customerContact}</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/20">
                      <Phone className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm text-foreground font-mono" dir="ltr">{customerContact}</span>
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
          <TableCell className="py-4 px-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatPrice(total)}</span>
              {(() => {
                const hasOffer = order.metadata && typeof order.metadata === 'object' && 'applied_quantity_offer' in order.metadata;
                
                if (hasOffer) {
                  return (
                     <Badge variant="outline" className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700/30 rounded-full">
                       عرض
                     </Badge>
                  );
                }
                return null;
              })()}
            </div>
            {order_items?.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {(total / (order_items?.length || 1)).toFixed(2)} د.ج لكل منتج
              </div>
            )}
          </TableCell>
        )}
        
        {/* عدد العناصر */}
        {visibleColumns.includes("items") && (
          <TableCell className="py-4 px-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground bg-muted/30 px-2 py-1 rounded-full text-sm">
                {order_items?.length || 0}
              </span>
              <span className="text-xs text-muted-foreground">
                {order_items?.length === 1 ? 'منتج' : 'منتجات'}
              </span>
            </div>
          </TableCell>
        )}
        
        {/* حالة الطلب */}
        {visibleColumns.includes("status") && (
          <TableCell className="py-4 px-4" onClick={(e) => hasUpdatePermission && e.stopPropagation()}>
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
          <TableCell className="py-4 px-4" onClick={(e) => hasUpdatePermission && e.stopPropagation()}>
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
                <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/20 rounded-md">لم يتم تحديد</span>
              )}
            </div>
          </TableCell>
        )}
        
        {/* مزود الشحن */}
        {visibleColumns.includes("shipping_provider") && (
          <TableCell className="py-4 px-4">
            <ShippingProviderColumn
              order={order}
              onSendToProvider={onSendToProvider}
              hasUpdatePermission={hasUpdatePermission}
              enabledProviders={shippingProviders}
            />
          </TableCell>
        )}
        
        {/* معلومات الطلب */}
        {visibleColumns.includes("source") && (
          <TableCell className="py-4 px-4">
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
          <TableCell className="text-right py-4 px-4" onClick={(e) => e.stopPropagation()}>
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
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={visibleColumns.length + 1} className="p-0 border-t border-border/30">
            <div className="bg-gradient-to-r from-accent/20 to-accent/10 p-6 border-l-4 border-primary/30">
              <OrderDetailsPanel order={order} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export default OrdersTableRow;
