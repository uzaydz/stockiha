import React, { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/ordersHelpers";
import { 
  Package, 
  Phone, 
  User, 
  Clock,
  Copy,
  Ban,
  ShieldOff,
  MapPin,
  Navigation,
  MessageSquare,
  Truck,
  Package2,
  CheckCircle2,
  Home,
  Building2,
  Edit
} from "lucide-react";
import OrderStatusBadge from "../table/OrderStatusBadge";
import CallConfirmationBadge from "../CallConfirmationBadge";
import { getProvinceName, getMunicipalityName } from "@/utils/addressHelpers";
import { toast } from "sonner";
import { StopDeskSelectionDialog } from "../dialogs/StopDeskSelectionDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderCardProps {
  order: any;
  localUpdate?: any;
  updatingById: Record<string, boolean>;
  updatingCallById: Record<string, boolean>;
  isCustomerBlocked: (order: any) => boolean;
  onStatusChange: (orderId: string, newStatus: string) => void;
  onCallConfirmationChange: (orderId: string, statusId: number, notes?: string) => void;
  onBlockCustomer: (order: any) => void;
  onUnblockCustomer: (order: any) => void;
  onNavigateToDetails: (orderId: string) => void;
  onShareOrder: (order: any) => void;
  callConfirmationStatuses?: Array<{ id: number; name: string; color?: string | null }>;
  shippingProviders?: Array<{ provider_code: string; provider_name: string }>;
  onSendToProvider?: (orderId: string, providerCode: string) => void;
  organizationId?: string;
  onUpdateOrder?: (orderId: string, updates: any) => Promise<void>;
}

const OrderCard = memo(({
  order,
  localUpdate = {},
  updatingById,
  updatingCallById,
  isCustomerBlocked,
  onStatusChange,
  onCallConfirmationChange,
  onBlockCustomer,
  onUnblockCustomer,
  onNavigateToDetails,
  onShareOrder,
  callConfirmationStatuses = [],
  shippingProviders = [],
  onSendToProvider,
  organizationId,
  onUpdateOrder
}: OrderCardProps) => {
  const updatedOrder = { ...order, ...localUpdate };
  
  // تخزين القيم المحسوبة لتحسين الأداء
  const customerName = order.customer?.name || order.form_data?.fullName || "عميل غير معروف";
  const customerPhone = order.customer?.phone || order.form_data?.phone;
  const orderNumber = order.customer_order_number ?? order.id?.slice(0, 8);
  const orderTotal = Number(order.total) || 0;

  // حالة نوع التوصيل والمكتب
  const formData = (order.form_data as any) || {};
  const deliveryType = formData.deliveryType || formData.delivery_type || 'home';
  const isStopDesk = deliveryType === 'office' || 
                     deliveryType === 'stop_desk' || 
                     deliveryType === 'stopdesk' || 
                     deliveryType === 2 ||
                     deliveryType === '2';
  const stopdeskId = formData.stopdesk_id || formData.stopdeskId || null;
  
  const [stopDeskDialogOpen, setStopDeskDialogOpen] = useState(false);
  const [isEditingDeliveryType, setIsEditingDeliveryType] = useState(false);

  const statusOptions = [
    { value: 'pending', label: 'معلق' },
    { value: 'processing', label: 'قيد المعالجة' },
    { value: 'shipped', label: 'تم الإرسال' },
    { value: 'delivered', label: 'تم الاستلام' },
    { value: 'cancelled', label: 'ملغي' },
  ];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`تم نسخ ${label}`);
    }).catch(() => {
      toast.error("فشل النسخ");
    });
  };

  const openInMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  // دالة لتغيير نوع التوصيل
  const handleDeliveryTypeChange = async (newType: string) => {
    if (!onUpdateOrder) return;
    
    try {
      const updatedFormData = {
        ...formData,
        deliveryType: newType,
        delivery_type: newType,
      };
      
      // إذا تم التغيير من مكتب للمنزل، نحذف stopdesk_id
      if (newType === 'home') {
        delete updatedFormData.stopdesk_id;
        delete updatedFormData.stopdeskId;
      }
      
      await onUpdateOrder(order.id, { form_data: updatedFormData });
      toast.success('تم تحديث نوع التوصيل');
      setIsEditingDeliveryType(false);
    } catch (error) {
      toast.error('فشل في تحديث نوع التوصيل');
    }
  };

  // دالة لتأكيد اختيار المكتب
  const handleStopDeskConfirm = async (stopdeskId: number, selectedCenter: any) => {
    if (!onUpdateOrder) return;
    
    try {
      console.log('OrderCard - Selected center:', selectedCenter);
      
      const updatedFormData = {
        ...formData,
        stopdesk_id: stopdeskId,
        stopdeskId: stopdeskId,
        // تحديث البلدية والولاية لتطابق المكتب المختار - كـ strings
        commune: selectedCenter.commune_id.toString(),
        communeId: selectedCenter.commune_id.toString(),
        municipality: selectedCenter.commune_id.toString(),
        wilaya: selectedCenter.wilaya_id.toString(),
        wilayaId: selectedCenter.wilaya_id.toString(),
        province: selectedCenter.wilaya_id.toString(),
        // حفظ الأسماء أيضاً للمرجعية
        communeName: selectedCenter.commune_name,
        wilayaName: selectedCenter.wilaya_name,
      };
      
      console.log('OrderCard - Updated form_data:', updatedFormData);
      
      await onUpdateOrder(order.id, { form_data: updatedFormData });
      toast.success('تم تحديث المكتب والبيانات بنجاح');
    } catch (error) {
      console.error('OrderCard - Error:', error);
      toast.error('فشل في تحديث المكتب');
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* رأس البطاقة */}
      <div className="bg-muted/30 p-4 border-b border-border">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-base font-semibold text-foreground">
                طلب #{orderNumber}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{new Date(order.created_at).toLocaleDateString('ar-DZ', { 
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
              })}</span>
            </div>
          </div>
          <div className="text-left">
            <div className="text-lg font-semibold text-foreground mb-1">
              {formatCurrency(orderTotal)}
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>
      </div>

      {/* محتوى البطاقة */}
      <div className="p-4 space-y-3">
        {order.confirmation_agent && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">موظف التأكيد المسؤول</span>
              <span className="text-sm font-medium text-primary">{order.confirmation_agent.full_name}</span>
              {order.confirmation_assignment?.assignment_strategy && (
                <span className="text-[11px] text-muted-foreground mt-1">
                  نمط التوزيع: {order.confirmation_assignment.assignment_strategy}
                </span>
              )}
            </div>
            <Badge variant="outline" className="text-[11px]">
              {order.confirmation_assignment?.status === 'confirmed' ? 'تم التأكيد' : 'قيد المعالجة'}
            </Badge>
          </div>
        )}

        {/* معلومات العميل */}
        <div className="flex items-center justify-between p-3 bg-muted/10 rounded border border-border">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-foreground truncate">
                {customerName}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {customerPhone || "لا يوجد"}
              </div>
            </div>
          </div>
          {customerPhone && (
            <div className="flex gap-1 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-9 w-9 p-0"
                onClick={() => window.open(`tel:${customerPhone}`, '_self')}
              >
                <Phone className="w-4 h-4 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 w-9 p-0"
                onClick={() => copyToClipboard(customerPhone, "رقم الهاتف")}
              >
                <Copy className="w-4 h-4" />
              </Button>
              {isCustomerBlocked(order) ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 p-0 border-red-200 bg-red-50 hover:bg-red-100"
                  onClick={() => onUnblockCustomer(order)}
                  title="إلغاء حظر العميل"
                >
                  <ShieldOff className="w-4 h-4 text-red-600" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => onBlockCustomer(order)}
                  title="حظر العميل"
                >
                  <Ban className="w-4 h-4 text-orange-600" />
              </Button>
            )}
          </div>
          )}
        </div>

        {/* معلومات العنوان والشحن */}
        <div className="space-y-2">
          {(order.shipping_address?.city || order.shipping_address?.municipality || order.form_data?.province) && (
            <div className="p-3 bg-muted/10 rounded border border-border">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(() => {
                      const provinceRaw = order.form_data?.province || (order.shipping_address as any)?.province || order.shipping_address?.state;
                      if (provinceRaw) {
                        const provinceName = typeof provinceRaw === 'string' && /[A-Za-zأ-ي]/.test(provinceRaw) 
                          ? provinceRaw 
                          : getProvinceName(provinceRaw as any);
                        return (
                          <Badge variant="outline" className="text-foreground">
                            {provinceName}
                          </Badge>
                        );
                      }
                    })()}
                    {(order.form_data?.municipality || order.shipping_address?.municipality) && (
                      <Badge variant="outline" className="text-foreground">
                        {getMunicipalityName(
                          order.form_data?.municipality || order.shipping_address?.municipality,
                          order.form_data?.province || (order.shipping_address as any)?.province
                        ) || order.form_data?.municipality || order.shipping_address?.municipality}
                      </Badge>
                    )}
          </div>
                  {(order.form_data?.address || order.shipping_address?.street_address) && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {order.form_data?.address || order.shipping_address?.street_address}
                    </p>
                  )}
            </div>
                {(order.form_data?.address || order.shipping_address?.street_address) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 flex-shrink-0"
                    onClick={() => openInMaps(order.form_data?.address || order.shipping_address?.street_address)}
                  >
                    <Navigation className="w-4 h-4 text-blue-600" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* نوع التوصيل - قسم جديد مميز */}
          <div className="p-3 bg-muted/10 rounded border border-border">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                {isStopDesk ? (
                  <Building2 className="w-5 h-5 text-foreground" />
                ) : (
                  <Home className="w-5 h-5 text-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">
                  نوع التوصيل
                </span>
              </div>
              {onUpdateOrder && !isEditingDeliveryType && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setIsEditingDeliveryType(true)}
                >
                  <Edit className="w-3 h-3 ml-1" />
                  تعديل
                </Button>
              )}
            </div>

            {isEditingDeliveryType ? (
              <div className="space-y-2">
                <Select
                  value={isStopDesk ? 'office' : 'home'}
                  onValueChange={handleDeliveryTypeChange}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home" className="text-xs">
                      <div className="flex items-center gap-2">
                        <Home className="w-3.5 h-3.5" />
                        توصيل للمنزل
                      </div>
                    </SelectItem>
                    <SelectItem value="office" className="text-xs">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" />
                        توصيل للمكتب
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-full text-xs"
                  onClick={() => setIsEditingDeliveryType(false)}
                >
                  إلغاء
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Badge variant="outline" className="text-foreground font-medium text-sm px-3 py-1">
                  {isStopDesk ? '🏢 توصيل للمكتب' : '🏠 توصيل للمنزل'}
                </Badge>

                {/* عرض/تعديل المكتب إذا كان التوصيل للمكتب */}
                {isStopDesk && (
                  <div className="space-y-2">
                    {stopdeskId ? (
                      <div className="flex items-center justify-between gap-2 p-2.5 bg-background rounded border border-border">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Building2 className="w-4 h-4 text-foreground flex-shrink-0" />
                          <span className="text-sm font-medium truncate">
                            مكتب رقم: {stopdeskId}
                          </span>
                        </div>
                        {onUpdateOrder && organizationId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => setStopDeskDialogOpen(true)}
                          >
                            تغيير
                          </Button>
                        )}
                      </div>
                    ) : (
                      onUpdateOrder && organizationId && (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-9 w-full text-sm"
                          onClick={() => setStopDeskDialogOpen(true)}
                        >
                          <Building2 className="w-4 h-4 ml-1" />
                          اختيار المكتب
                        </Button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* معلومات الشحن - محسّنة */}
          {(order.yalidine_tracking_id || order.zrexpress_tracking_id || order.ecotrack_tracking_id || order.shipping_method) && (
            <div className="space-y-2">
              {/* رقم التتبع - عرض بارز */}
              {(order.yalidine_tracking_id || order.zrexpress_tracking_id || order.ecotrack_tracking_id) && (
                <div className="p-3 bg-muted/10 rounded border border-border">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <Truck className="w-4 h-4 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-muted-foreground font-medium mb-0.5">
                          رقم التتبع
                        </div>
                        <div className="text-xs font-mono font-semibold text-foreground truncate">
                          {order.yalidine_tracking_id || order.zrexpress_tracking_id || order.ecotrack_tracking_id}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 flex-shrink-0"
                      onClick={() => copyToClipboard(
                        order.yalidine_tracking_id || order.zrexpress_tracking_id || order.ecotrack_tracking_id,
                        "رقم التتبع"
                      )}
                    >
                      <Copy className="w-3.5 h-3.5 text-foreground" />
                    </Button>
                  </div>
                </div>
              )}
              
              {/* شركة التوصيل */}
              {order.shipping_method && (
            <div className="flex flex-wrap gap-2 text-xs">
              {order.yalidine_tracking_id && (
                <Badge variant="outline" className="text-foreground">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      ياليدين
                </Badge>
              )}
              {order.zrexpress_tracking_id && (
                <Badge variant="outline" className="text-foreground">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      زر إكسبرس
                    </Badge>
                  )}
                  {order.ecotrack_tracking_id && (
                    <Badge variant="outline" className="text-foreground">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      إيكوتراك
                </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* تأكيد الاتصال */}
          {updatedOrder.call_confirmation_status && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <CallConfirmationBadge status={updatedOrder.call_confirmation_status} />
              {updatedOrder.call_confirmation_updated_at && (
                <span className="text-xs text-muted-foreground">
                  {new Date(updatedOrder.call_confirmation_updated_at).toLocaleDateString('ar-DZ', { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
            </div>
          )}

          {/* الملاحظات */}
          {order.notes && (
            <div className="p-2 bg-muted/10 rounded border border-border text-xs text-muted-foreground line-clamp-2">
              <MessageSquare className="w-3 h-3 inline mr-1" />
              {order.notes}
            </div>
          )}
        </div>

        {/* عرض المنتجات المطلوبة */}
        {order.order_items && order.order_items.length > 0 && (
          <div className="pt-3 pb-1 border-t border-border">
            <div className="flex items-center justify-between mb-2 px-4">
          <div className="flex items-center gap-2">
                <Package2 className="w-3.5 h-3.5 text-foreground" />
                <span className="text-xs font-medium text-foreground">
                  المنتجات ({order.order_items.length})
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5">
                {formatCurrency(order.subtotal || 0)}
              </Badge>
            </div>
            <div className="px-4 space-y-2 max-h-[200px] overflow-y-auto">
              {order.order_items.map((item: any, idx: number) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-2 p-2 rounded bg-muted/10 border border-transparent hover:border-border"
                >
                  {/* الصورة أو placeholder */}
                  <div className="w-10 h-10 rounded bg-muted/30 flex items-center justify-center flex-shrink-0">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.product_name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <Package2 className="w-5 h-5 text-muted-foreground" />
            )}
          </div>

                  {/* التفاصيل */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs leading-tight mb-1 line-clamp-1">
                      {item.product_name}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="text-muted-foreground">
                        ×{item.quantity}
                      </span>
                      {item.color_name && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-background rounded">
                          {item.color_code && (
                            <div 
                              className="w-2.5 h-2.5 rounded-full border border-border/50" 
                              style={{ backgroundColor: item.color_code }}
                            />
                          )}
                          <span className="text-muted-foreground">{item.color_name}</span>
                        </div>
                      )}
                      {item.size_name && (
                        <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px] font-normal">
                          {item.size_name}
                        </Badge>
            )}
          </div>
        </div>

                  {/* السعر */}
                  <div className="text-xs font-semibold text-primary flex-shrink-0">
                    {formatCurrency(item.total_price)}
          </div>
        </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* أزرار الإجراءات السريعة */}
      <div className="flex gap-2 border-t border-border p-4 bg-muted/10">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-10 text-sm font-medium"
          onClick={() => onNavigateToDetails(order.customer_order_number || order.id)}
        >
          <Package2 className="w-4 h-4 mr-1.5" />
          التفاصيل الكاملة
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0"
          onClick={() => onShareOrder(order)}
        >
          <Package2 className="w-4 h-4" />
        </Button>
      </div>

      {/* نافذة اختيار المكتب */}
      {organizationId && stopDeskDialogOpen && (
        <StopDeskSelectionDialog
          open={stopDeskDialogOpen}
          onOpenChange={setStopDeskDialogOpen}
          onConfirm={handleStopDeskConfirm}
          wilayaId={formData.province || formData.wilaya || formData.wilayaId}
          communeId={formData.municipality || formData.commune || formData.communeId}
          organizationId={organizationId}
        />
      )}
    </div>
  );
});

OrderCard.displayName = "OrderCard";

export default OrderCard;
