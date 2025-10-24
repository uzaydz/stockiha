import React, { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  RefreshCw,
  Phone,
  Truck,
  CheckCircle2,
  Loader2
} from "lucide-react";

interface OrderActionsProps {
  order: any;
  updatedOrder: any;
  updatingById: Record<string, boolean>;
  updatingCallById: Record<string, boolean>;
  onStatusChange: (orderId: string, newStatus: string) => void;
  onCallConfirmationChange: (orderId: string, statusId: number, notes?: string) => void;
  callConfirmationStatuses?: Array<{ id: number; name: string; color?: string | null }>;
  shippingProviders?: Array<{ provider_code: string; provider_name: string }>;
  onSendToProvider?: (orderId: string, providerCode: string) => void;
}

// تعريف statusOptions خارج المكون لتجنب إعادة إنشائها في كل render
const statusOptions = [
  { value: 'pending', label: 'معلق' },
  { value: 'processing', label: 'قيد المعالجة' },
  { value: 'shipped', label: 'تم الإرسال' },
  { value: 'delivered', label: 'تم الاستلام' },
  { value: 'cancelled', label: 'ملغي' },
];

const OrderActions = memo(({
  order,
  updatedOrder,
  updatingById,
  updatingCallById,
  onStatusChange,
  onCallConfirmationChange,
  callConfirmationStatuses = [],
  shippingProviders = [],
  onSendToProvider
}: OrderActionsProps) => {
  const [sendingToProvider, setSendingToProvider] = useState<string | null>(null);

  return (
    <div className="space-y-3 pt-3 border-t border-border/10">
      {/* تغيير الحالة */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          تغيير حالة الطلب
        </label>
        <div className="flex items-center gap-2">
          <Select
            value={order.status}
            onValueChange={(v) => onStatusChange(order.id, v)}
            disabled={!!updatingById[order.id]}
          >
            <SelectTrigger className="h-11 text-sm font-medium">
              <SelectValue placeholder="اختر الحالة" />
            </SelectTrigger>
            <SelectContent align="end">
              {statusOptions.map(s => (
                <SelectItem key={s.value} value={s.value} className="text-sm py-3">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {updatingById[order.id] && (
            <div className="flex items-center justify-center w-11 h-11">
              <RefreshCw className="w-4 h-4 text-primary" />
            </div>
          )}
        </div>
      </div>

      {/* تأكيد المكالمة */}
      {callConfirmationStatuses.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" />
            تأكيد الاتصال
          </label>
          <div className="flex items-center gap-2">
            <Select
              value={String(updatedOrder.call_confirmation_status_id ?? '')}
              onValueChange={(v) => {
                const statusId = v ? Number(v) : 0;
                const notes = updatedOrder.call_confirmation_notes || '';
                onCallConfirmationChange(order.id, statusId, notes);
              }}
              disabled={!!updatingCallById[order.id]}
            >
              <SelectTrigger className="h-11 text-sm font-medium">
                <SelectValue placeholder="اختر حالة التأكيد" />
              </SelectTrigger>
              <SelectContent align="end">
                {callConfirmationStatuses.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)} className="text-sm py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: s.color || '#6b7280' }}
                      ></div>
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {updatingCallById[order.id] && (
              <div className="flex items-center justify-center w-11 h-11">
                <RefreshCw className="w-4 h-4 text-primary" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* اختيار مزود الشحن */}
      {shippingProviders.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            مزود الشحن
          </label>
          <Select
            value={order.shipping_method || ""}
            disabled={!!sendingToProvider}
            onValueChange={async (providerCode) => {
              if (providerCode && onSendToProvider) {
                setSendingToProvider(providerCode);
                try {
                  await onSendToProvider(order.id, providerCode);
                } finally {
                  setSendingToProvider(null);
                }
              }
            }}
          >
            <SelectTrigger className="h-11 text-sm font-medium">
              <SelectValue placeholder="اختر شركة التوصيل" />
            </SelectTrigger>
            <SelectContent align="end">
              {shippingProviders.map((p) => (
                <SelectItem key={p.provider_code} value={p.provider_code} className="text-sm py-3">
                  {p.provider_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* مؤشر التحميل */}
          {sendingToProvider && (
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="font-medium">جاري الإرسال لشركة التوصيل...</span>
            </div>
          )}
          
          {/* عرض حالة الإرسال ورقم التتبع */}
          {!sendingToProvider && order.shipping_method && (
            <div className="space-y-1.5">
              <div className="text-xs flex items-center gap-1 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-medium">
                  تم الإرسال إلى: {shippingProviders.find(p => p.provider_code === order.shipping_method)?.provider_name || order.shipping_method}
                </span>
              </div>
              
              {/* عرض رقم التتبع إن وجد */}
              {(order.yalidine_tracking_id || order.zrexpress_tracking_id || order.ecotrack_tracking_id) && (
                <div className="text-xs flex items-center gap-1 text-muted-foreground bg-muted/20 p-2 rounded">
                  <Truck className="w-3.5 h-3.5" />
                  <span className="font-mono">
                    رقم التتبع: {order.yalidine_tracking_id || order.zrexpress_tracking_id || order.ecotrack_tracking_id}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

OrderActions.displayName = "OrderActions";

export default OrderActions;
