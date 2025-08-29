import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { 
  ChevronDown, 
  ChevronRight, 
  User, 
  Phone, 
  Clock,
  DollarSign,
  Package,
  MapPin,
  MoreVertical,
  Calendar,
  CreditCard
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

import { cn } from "@/lib/utils";

import OrderStatusBadge from "../table/OrderStatusBadge";
import OrderStatusDropdown from "../OrderStatusDropdown";
import OrderExpandedDetailsCard from "./OrderExpandedDetailsCard";
import OrderActionsDropdown from "../table/OrderActionsDropdown";
import CallConfirmationDropdownStandalone from "../CallConfirmationDropdownStandalone";
import CallConfirmationBadge from "../CallConfirmationBadge";
import ShippingProviderBadge from "../table/ShippingProviderBadge";
import ShippingProviderColumn from "../table/ShippingProviderColumn";
import { Order } from "../table/OrderTableTypes";

interface OrderCardProps {
  order: Order;
  selected: boolean;
  onSelect: (orderId: string, selected: boolean) => void;
  onUpdateStatus: (orderId: string, newStatus: string, userId?: string) => Promise<void>;
  onUpdateCallConfirmation?: (orderId: string, statusId: number, notes?: string, userId?: string) => Promise<void>;
  onSendToProvider?: (orderId: string, providerCode: string) => Promise<void>;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  currentUserId?: string;
  shippingProviders?: Array<{
    provider_id: number | null;
    provider_code: string;
    provider_name: string;
    is_enabled: boolean;
  }>;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  selected,
  onSelect,
  onUpdateStatus,
  onUpdateCallConfirmation,
  onSendToProvider,
  hasUpdatePermission,
  hasCancelPermission,
  expanded = false,
  onToggleExpand,
  currentUserId,
  shippingProviders = []
}) => {
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  if (!order) return null;

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
  const formattedOrderNumber = useMemo(() => 
    customer_order_number 
      ? `#${customer_order_number}` 
      : `#${id.slice(0, 8)}`,
    [customer_order_number, id]
  );

  // استخراج بيانات العميل للعرض
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

  // تنسيق التاريخ
  const formattedDate = useMemo(() => {
    try {
      return new Date(created_at).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'تاريخ غير صحيح';
    }
  }, [created_at]);

  // عدد المنتجات
  const itemsCount = useMemo(() => 
    order_items.reduce((sum, item) => sum + item.quantity, 0),
    [order_items]
  );

  return (
    <Card className={cn(
      "relative transition-all duration-300 hover:shadow-lg",
      "border border-border/20 bg-card/95 backdrop-blur-sm",
      selected && "ring-2 ring-primary/50 border-primary/30"
    )}>
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          {/* Checkbox and Order Number */}
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelect(id, !!checked)}
              className="mt-1"
            />
            <div>
              <div className="font-bold text-lg text-primary">
                {formattedOrderNumber}
              </div>
              
              {/* Order Source Badge */}
              {created_from && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {created_from === 'website' ? 'الموقع' :
                   created_from === 'admin' ? 'الإدارة' :
                   created_from === 'pos' ? 'نقطة البيع' :
                   created_from}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <div className="flex items-center gap-2">
            {/* Expand/Collapse Button */}
            {onToggleExpand && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className="h-8 w-8 p-0"
              >
                {expanded ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </Button>
            )}

            {/* Actions Dropdown */}
            <OrderActionsDropdown
              order={order}
              onUpdateStatus={onUpdateStatus}
              onUpdateCallConfirmation={onUpdateCallConfirmation}
              hasUpdatePermission={hasUpdatePermission}
              hasCancelPermission={hasCancelPermission}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Customer Info */}
        <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
          <div className="p-2 bg-primary/10 rounded-full">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground truncate">{customerName}</h4>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                {customerContact}
              </div>
            </div>
          </div>
        </div>

        {/* Order Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Amount */}
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <div className="p-2 bg-green-100 dark:bg-green-800/50 rounded-full">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">المجموع</p>
              <p className="font-bold text-green-700 dark:text-green-300">
                {formatPrice(total)}
              </p>
            </div>
          </div>

          {/* Items Count */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-full">
              <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">العناصر</p>
              <p className="font-bold text-blue-700 dark:text-blue-300">
                {itemsCount} منتج
              </p>
            </div>
          </div>
        </div>

        {/* Status and Actions Row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Order Status */}
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={status} />
            {hasUpdatePermission && (
              <OrderStatusDropdown
                currentStatus={status}
                orderId={id}
                onUpdateStatus={(orderId, newStatus) => onUpdateStatus(orderId, newStatus, currentUserId)}
              />
            )}
          </div>

          {/* Call Confirmation */}
          <div className="flex items-center gap-2">
            {order.call_confirmation_status && (
              <CallConfirmationBadge status={order.call_confirmation_status} />
            )}
            {onUpdateCallConfirmation && (
              <CallConfirmationDropdownStandalone
                orderId={id}
                currentStatusId={order.call_confirmation_status_id}
                currentNotes={order.call_confirmation_notes}
                onUpdate={onUpdateCallConfirmation}
                currentUserId={currentUserId}
              />
            )}
          </div>
        </div>

        {/* Shipping Provider */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">مزود الشحن:</span>
          </div>
          <ShippingProviderColumn
            order={order}
            onSendToProvider={onSendToProvider}
            enabledProviders={shippingProviders}
          />
        </div>

        {/* Date and Payment */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border/20">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>{payment_method || 'غير محدد'}</span>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border/20">
            <OrderExpandedDetailsCard 
              order={order} 
              currentUserId={currentUserId}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderCard;
