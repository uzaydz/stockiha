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

  //

  // استخراج بيانات الطلب الأساسية
  const { id, customer_order_number, customer, total, status, order_items = [] } = order;

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
          ${selected ? "bg-primary/5 border-primary/20" : ""}
          hover:bg-accent/20 
          transition-colors duration-200
          group
          border-b border-border/30
          ${selected ? "shadow-sm" : ""}
          select-text
          transform-gpu
        `}
        style={{ 
          userSelect: 'text', 
          contain: 'layout paint', 
          willChange: selected ? 'background-color' : 'auto' 
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
          <TableCell className="py-4 px-4" style={{ contain: 'layout' }}>
            <ShippingProviderColumn
              order={order}
              onSendToProvider={onSendToProvider}
              hasUpdatePermission={hasUpdatePermission}
              enabledProviders={shippingProviders}
            />
          </TableCell>
        )}
        
        {/* إجراءات الطلب */}
        {visibleColumns.includes("actions") && (
          <OrderRowActions
            order={order}
            hasUpdatePermission={hasUpdatePermission}
            hasCancelPermission={hasCancelPermission}
            onUpdateStatus={onUpdateStatus}
          />
        )}
      </TableRow>
      
      {/* عرض تفاصيل الطلب عند توسيعه - مع تحسين الأداء */}
      {expanded && (
        <OrderExpandedDetails
          order={order}
          visibleColumns={visibleColumns}
          currentUserId={currentUserId}
          containerId={expandedDetailsId}
        />
      )}
    </>
  );
};

export default React.memo(OrdersTableRow);
