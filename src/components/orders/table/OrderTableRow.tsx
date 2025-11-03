import React, { useMemo } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { OrdersTableRowProps } from "./OrderTableTypes";
import OrderExpandedDetails from "./OrderExpandedDetails";
import ShippingProviderColumn from "./ShippingProviderColumn";

// المكونات الفرعية المحسّنة
import OrderRowCheckbox from "./row/OrderRowCheckbox";
import OrderRowExpand from "./row/OrderRowExpand";
import OrderRowNumber from "./row/OrderRowNumber";
import OrderRowCustomer from "./row/OrderRowCustomer";
import OrderRowTotal from "./row/OrderRowTotal";
import OrderRowStatus from "./row/OrderRowStatus";
import OrderRowCallConfirmation from "./row/OrderRowCallConfirmation";
import OrderRowActions from "./row/OrderRowActions";
import OrderDeliveryTypeEditor from "./OrderDeliveryTypeEditor";
import OrderFinancialEditor from "./OrderFinancialEditor";

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
  shippingProviders = [],
  onOrderUpdated,
  localUpdates = {}
}: OrdersTableRowProps) => {
  // التحقق من توفر البيانات المطلوبة
  if (!order) return null;

  //

  // استخراج بيانات الطلب الأساسية
  const { id, customer_order_number, customer, total, status, order_items = [] } = order;
  const assignment = (order as any).confirmation_assignment || null;
  const confirmationAgent = (order as any).confirmation_agent || null;
  const assignedStaffDisplayName = useMemo(() => {
    const o: any = order as any;
    const resolved = o.assigned_staff_name_resolved || o.assigned_staff_name;
    if (resolved && typeof resolved === 'string') return resolved;
    const sid: string | undefined = (o.assignment && o.assignment.staff_id) || undefined;
    if (sid) return `${sid.slice(0, 6)}…`;
    return null;
  }, [order]);

  // تنسيق رقم الطلب للعرض
  const formattedOrderNumber = useMemo(() => 
    customer_order_number 
      ? `#${customer_order_number}` 
      : `#${id.slice(0, 8)}`,
    [customer_order_number, id]
  );

  // استخراج بيانات العميل للعرض مع استخدام البيانات المحسنة
  const customerName = useMemo(() => 
    (order as any).customer_name || 
    customer?.name || 
    (order.form_data?.fullName) ||
    (order.form_data?.name) ||
    `عميل #${customer_order_number}` ||
    'عميل غير معرف',
    [order, customer, customer_order_number]
  );
                      
  const customerContact = useMemo(() => 
    (order as any).customer_phone || 
    (order as any).customer_email ||
    customer?.phone ||
    customer?.email ||
    (order.form_data?.phoneNumber) ||
    (order.form_data?.phone) ||
    'غير متوفر',
    [order, customer]
  );

  // تم نقل دالة النسخ إلى المكونات الفرعية

  // معرف قسم التفاصيل لمطابقة aria-controls
  const expandedDetailsId = useMemo(() => `order-details-${id}`,[id]);

  // هل يوجد عرض مطبق على الطلب
  const hasOffer = useMemo(() => {
    try {
      return Boolean(order.metadata && typeof order.metadata === 'object' && 'applied_quantity_offer' in (order as any).metadata);
    } catch {
      return false;
    }
  }, [order]);

  return (
    <>
      <TableRow
        className={`
          ${selected ? "bg-primary/5 border-l-[3px] border-l-primary" : "border-l-[3px] border-l-transparent"}
          hover:bg-muted/40
          transition-all duration-200 ease-in-out
          group
          border-b border-border/30
          ${selected ? "shadow-sm" : ""}
          select-text
          cursor-default
        `}
        style={{
          userSelect: 'text'
        }}
      >
        {/* خانة تحديد الطلب */}
        {visibleColumns.includes("checkbox") && (
          <OrderRowCheckbox
            selected={selected}
            orderId={id}
            formattedOrderNumber={formattedOrderNumber}
            onSelect={onSelect}
          />
        )}
        
        {/* زر توسيع/طي تفاصيل الطلب */}
        {visibleColumns.includes("expand") && (
          <OrderRowExpand
            expanded={expanded}
            orderId={id}
            expandedDetailsId={expandedDetailsId}
            onToggleExpand={onToggleExpand}
          />
        )}
        
        {/* رقم الطلب */}
        {visibleColumns.includes("id") && (
          <OrderRowNumber formattedOrderNumber={formattedOrderNumber} />
        )}
        
        {/* اسم العميل */}
        {visibleColumns.includes("customer_name") && (
          <OrderRowCustomer customerName={customerName} />
        )}
        
        {/* بيانات الاتصال بالعميل */}
        {visibleColumns.includes("customer_contact") && (
          <OrderRowCustomer 
            customerName={customerContact || 'لا توجد بيانات اتصال'} 
            customerContact={customerContact}
            showContact={true}
          />
        )}
        
        {/* إجمالي الطلب */}
        {visibleColumns.includes("total") && (
          <OrderRowTotal
            total={total}
            orderItems={order_items}
            hasOffer={hasOffer}
          />
        )}
        
        {/* حالة الطلب */}
        {visibleColumns.includes("status") && (
          <OrderRowStatus
            status={status}
            orderId={id}
            hasUpdatePermission={hasUpdatePermission}
            hasCancelPermission={hasCancelPermission}
            onUpdateStatus={onUpdateStatus}
          />
        )}

        {/* عمود فريق التأكيد تم حذفه */}

        {/* الموظف المعين */}
        {visibleColumns.includes("assignee") && (
          <TableCell className="w-[150px] min-w-[150px] py-3 px-4 align-middle">
            {assignedStaffDisplayName ? (
              <div className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-lg inline-block">
                {assignedStaffDisplayName}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">غير معين</span>
            )}
          </TableCell>
        )}

        {/* حالة تأكيد الإتصال */}
        {visibleColumns.includes("call_confirmation") && (
          <OrderRowCallConfirmation
            order={order}
            orderId={id}
            hasUpdatePermission={hasUpdatePermission}
            currentUserId={currentUserId}
            onUpdateCallConfirmation={onUpdateCallConfirmation}
          />
        )}
        
        {/* مزود الشحن */}
        {visibleColumns.includes("shipping_provider") && (
          <TableCell className="w-[200px] min-w-[200px] py-3 px-4 align-middle">
            <ShippingProviderColumn
              order={order}
              onSendToProvider={onSendToProvider}
              hasUpdatePermission={hasUpdatePermission}
              enabledProviders={shippingProviders}
            />
          </TableCell>
        )}

        {/* نوع التوصيل */}
        {visibleColumns.includes("delivery_type") && (
          <TableCell className="w-[140px] min-w-[140px] py-3 px-4 align-middle">
            <OrderDeliveryTypeEditor
              order={order}
              hasUpdatePermission={hasUpdatePermission}
              onOrderUpdated={(updatedOrder) => {
                if (onOrderUpdated) {
                  onOrderUpdated(order.id, updatedOrder);
                }
              }}
            />
          </TableCell>
        )}

        {/* المبالغ المالية */}
        {visibleColumns.includes("financial") && (
          <TableCell className="w-[160px] min-w-[160px] py-3 px-4 align-middle">
            <OrderFinancialEditor
              order={order}
              hasUpdatePermission={hasUpdatePermission}
              onOrderUpdated={(updatedOrder) => {
                if (onOrderUpdated) {
                  onOrderUpdated(order.id, updatedOrder);
                }
              }}
            />
          </TableCell>
        )}

        {/* إجراءات الطلب */}
        {visibleColumns.includes("actions") && (
          <TableCell className="w-[80px] min-w-[80px] py-3 px-3 align-middle text-center">
            <OrderRowActions
              order={order}
              hasUpdatePermission={hasUpdatePermission}
              hasCancelPermission={hasCancelPermission}
              onUpdateStatus={onUpdateStatus}
              onOrderUpdated={(updatedOrder) => {
                if (onOrderUpdated) {
                  onOrderUpdated(order.id, updatedOrder);
                }
              }}
            />
          </TableCell>
        )}
      </TableRow>
      
      {/* عرض تفاصيل الطلب عند توسيعه - مع تحسين الأداء */}
      {expanded && (
        <OrderExpandedDetails
          order={order}
          visibleColumns={visibleColumns}
          currentUserId={currentUserId}
          containerId={expandedDetailsId}
          localUpdates={localUpdates}
          onOrderUpdated={onOrderUpdated}
        />
      )}
    </>
  );
};

export default React.memo(OrdersTableRow);
