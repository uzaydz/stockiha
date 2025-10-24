import React, { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatCurrency } from "@/utils/ordersHelpers";
import { 
  Package2,
  Edit,
  Save,
  X,
  RefreshCw,
  User,
  Package,
  CreditCard,
  Check,
  Phone,
  MessageSquare,
  MapPin,
  Building2,
  Home,
  Truck
} from "lucide-react";
import OrderStatusBadge from "../table/OrderStatusBadge";
import CallConfirmationBadge from "../CallConfirmationBadge";
import { getProvinceName, getMunicipalityName } from "@/utils/addressHelpers";
import OrderEditForm from "../OrderEditForm";
import { StopDeskSelectionDialog } from "../dialogs/StopDeskSelectionDialog";
import { useTenant } from "@/context/TenantContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface OrderDetailsSheetProps {
  order: any;
  updatedOrder: any;
  editMode: string | null;
  editedData: any;
  savingOrder: boolean;
  updatingById: Record<string, boolean>;
  updatingCallById: Record<string, boolean>;
  onEditMode: (order: any) => void;
  onCancelEdit: () => void;
  onSaveOrderEdits: () => void;
  onFieldChange: (field: string, value: any) => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
  onCallConfirmationChange: (orderId: string, statusId: number, notes?: string) => void;
  callConfirmationStatuses?: Array<{ id: number; name: string; color?: string | null }>;
  isCalculatingDelivery?: boolean;
}

// تعريف statusOptions خارج المكون لتحسين الأداء
const statusOptions = [
  { value: 'pending', label: 'معلق' },
  { value: 'processing', label: 'قيد المعالجة' },
  { value: 'shipped', label: 'تم الإرسال' },
  { value: 'delivered', label: 'تم الاستلام' },
  { value: 'cancelled', label: 'ملغي' },
];

const OrderDetailsSheet = memo(({
  order,
  updatedOrder,
  editMode,
  editedData,
  savingOrder,
  updatingById,
  updatingCallById,
  onEditMode,
  onCancelEdit,
  onSaveOrderEdits,
  onFieldChange,
  onStatusChange,
  onCallConfirmationChange,
  callConfirmationStatuses = [],
  isCalculatingDelivery = false
}: OrderDetailsSheetProps) => {
  // استخدام updatedOrder بدلاً من order لعرض البيانات المحدثة
  const displayOrder = updatedOrder || order;
  const { currentOrganization } = useTenant();
  
  // حالة نوع التوصيل والمكتب
  const [stopDeskDialogOpen, setStopDeskDialogOpen] = useState(false);
  const formData = (displayOrder.form_data as any) || {};
  const deliveryType = formData.deliveryType || formData.delivery_type || 'home';
  const isStopDesk = deliveryType === 'office' || 
                     deliveryType === 'stop_desk' || 
                     deliveryType === 'stopdesk' || 
                     deliveryType === 2 ||
                     deliveryType === '2';
  const stopdeskId = formData.stopdesk_id || formData.stopdeskId || null;

  // دالة لتأكيد اختيار المكتب
  const handleStopDeskConfirm = async (stopdeskId: number, selectedCenter: any) => {
    try {
      console.log('OrderDetailsSheet - Selected center:', selectedCenter);
      
      const updatedFormData = {
        ...formData,
        stopdesk_id: stopdeskId,
        stopdeskId: stopdeskId,
        // تحديث البلدية والولاية - كـ strings
        commune: selectedCenter.commune_id.toString(),
        communeId: selectedCenter.commune_id.toString(),
        municipality: selectedCenter.commune_id.toString(),
        wilaya: selectedCenter.wilaya_id.toString(),
        wilayaId: selectedCenter.wilaya_id.toString(),
        province: selectedCenter.wilaya_id.toString(),
        communeName: selectedCenter.commune_name,
        wilayaName: selectedCenter.wilaya_name,
      };
      
      console.log('OrderDetailsSheet - Updated form_data:', updatedFormData);
      
      if (currentOrganization?.id) {
        const { error } = await supabase
          .from('online_orders')
          .update({ form_data: updatedFormData })
          .eq('id', displayOrder.id)
          .eq('organization_id', currentOrganization.id);
        
        if (error) throw error;
        
        toast.success('تم تحديث المكتب والبيانات بنجاح');
        
        // إعادة تحميل البيانات
        window.location.reload();
      }
    } catch (error) {
      console.error('OrderDetailsSheet - Error:', error);
      toast.error('فشل في تحديث المكتب');
    }
  };
  
  // استخراج بيانات العنوان بشكل موحد
  const getAddressData = () => {
    // إذا كنا في وضع التعديل، نستخدم البيانات المعدلة
    if (editMode === displayOrder.id && editedData.province) {
      return {
        province: editedData.province,
        municipality: editedData.municipality,
        address: editedData.address
      };
    }
    
    // أولوية للبيانات من form_data (لأنها تُحدث عند الحفظ)
    // ثم shipping_address كبديل
    const province = displayOrder.form_data?.province || 
                     (displayOrder.shipping_address as any)?.province || 
                     displayOrder.shipping_address?.state;
    const municipality = displayOrder.form_data?.municipality || 
                        displayOrder.shipping_address?.municipality;
    const address = displayOrder.form_data?.address || 
                   displayOrder.shipping_address?.street_address;
    
    return { province, municipality, address };
  };
  
  const addressData = getAddressData();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="h-11 text-sm gap-2 w-full font-medium"
        >
          <Package2 className="w-4 h-4" />
          معاينة سريعة
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto will-change-transform">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Package2 className="w-5 h-5 text-primary" />
              </div>
              تفاصيل الطلبية #{displayOrder.customer_order_number ?? displayOrder.id}
            </SheetTitle>
            <SheetDescription className="sr-only">
              عرض وتعديل تفاصيل الطلبية الكاملة
            </SheetDescription>
            {editMode !== order.id ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEditMode(order)}
                className="gap-1.5"
              >
                <Edit className="w-4 h-4" />
                تعديل
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onCancelEdit}
                  disabled={savingOrder}
                >
                  <X className="w-4 h-4 mr-1" />
                  إلغاء
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={onSaveOrderEdits}
                  disabled={savingOrder}
                  className="gap-1.5"
                >
                  {savingOrder ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      حفظ
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>
        <div className="space-y-4 py-4">
          {/* واجهة التعديل */}
          {editMode === order.id ? (
            <OrderEditForm
              editedData={editedData}
              onFieldChange={onFieldChange}
              isCalculatingDelivery={isCalculatingDelivery}
              orderId={order.id}
            />
          ) : (
            <>
              {/* معلومات العميل */}
              <div className="bg-card rounded-lg p-6 border border-border/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  معلومات العميل
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-muted-foreground">الاسم</div>
                      <div className="font-medium">{displayOrder.customer?.name || displayOrder.form_data?.fullName || 'غير محدد'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">الهاتف</div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{displayOrder.customer?.phone || displayOrder.form_data?.phone || 'غير محدد'}</span>
                        {displayOrder.customer?.phone || displayOrder.form_data?.phone ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 px-2" asChild>
                              <a href={`tel:${displayOrder.customer?.phone || displayOrder.form_data?.phone}`}>
                                <Phone className="w-3 h-3" />
                              </a>
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2" asChild>
                              <a href={`sms:${displayOrder.customer?.phone || displayOrder.form_data?.phone}`}>
                                <MessageSquare className="w-3 h-3" />
                              </a>
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {displayOrder.customer?.email || displayOrder.form_data?.email ? (
                      <div>
                        <div className="text-sm text-muted-foreground">البريد الإلكتروني</div>
                        <div className="font-medium">{displayOrder.customer?.email || displayOrder.form_data?.email}</div>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-muted-foreground">الولاية</div>
                      <div className="font-medium">{(() => {
                        if (!addressData.province) return 'غير محدد';
                        if (typeof addressData.province === 'string' && /[A-Za-zأ-ي]/.test(addressData.province)) return addressData.province;
                        try { return getProvinceName(addressData.province as any); } catch { return String(addressData.province); }
                      })()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">البلدية</div>
                      <div className="font-medium">{(() => {
                        if (!addressData.municipality) return 'غير محدد';
                        const municipalityName = getMunicipalityName(addressData.municipality, addressData.province);
                        return municipalityName || addressData.municipality;
                      })()}</div>
                    </div>
                    {addressData.address ? (
                      <div>
                        <div className="text-sm text-muted-foreground">العنوان</div>
                        <div className="font-medium text-sm">{addressData.address}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* نوع التوصيل والمكتب */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-6 border-2 border-indigo-200 dark:border-indigo-800/50 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                    <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  نوع التوصيل
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {isStopDesk ? (
                      <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Home className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    )}
                    <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 font-semibold text-base px-4 py-1.5">
                      {isStopDesk ? '🏢 توصيل للمكتب' : '🏠 توصيل للمنزل'}
                    </Badge>
                  </div>
                  
                  {/* معلومات المكتب إذا كان توصيل للمكتب */}
                  {isStopDesk && (
                    <div className="space-y-3 pt-3 border-t border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          <div>
                            <div className="text-sm text-muted-foreground">رقم المكتب</div>
                            <div className="font-bold text-lg">
                              {stopdeskId ? `#${stopdeskId}` : 'لم يتم تحديد المكتب'}
                            </div>
                          </div>
                        </div>
                        {currentOrganization?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => setStopDeskDialogOpen(true)}
                          >
                            <Building2 className="w-4 h-4" />
                            {stopdeskId ? 'تغيير المكتب' : 'اختيار المكتب'}
                          </Button>
                        )}
                      </div>
                      
                      {!stopdeskId && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ يرجى اختيار مكتب التوصيل قبل إرسال الطلبية لشركة التوصيل
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* معلومات الطلبية */}
              <div className="bg-card rounded-lg p-6 border border-border/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  معلومات الطلبية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-muted-foreground">رقم الطلبية</div>
                      <div className="font-bold text-lg">#{order.customer_order_number ?? order.id}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">تاريخ الإنشاء</div>
                      <div className="font-medium">{new Date(order.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'numeric', 
                        day: 'numeric' 
                      })}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">الحالة</div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-muted-foreground">طريقة الدفع</div>
                      <div className="font-medium">{order.payment_method}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">حالة الدفع</div>
                      <div className="font-medium">{order.payment_status}</div>
                    </div>
                    {order.shipping_method && (
                      <div>
                        <div className="text-sm text-muted-foreground">طريقة الشحن</div>
                        <div className="font-medium">{order.shipping_method}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* المبالغ المالية */}
              <div className="bg-card rounded-lg p-6 border border-border/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                    <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  المبالغ المالية
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المجموع الفرعي</span>
                    <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الضريبة</span>
                    <span className="font-medium">{formatCurrency(order.tax)}</span>
                  </div>
                  {order.discount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الخصم</span>
                      <span className="font-medium text-green-600">-{formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  {order.shipping_cost && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تكلفة الشحن</span>
                      <span className="font-medium">{formatCurrency(order.shipping_cost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t text-lg font-bold">
                    <span>المجموع الكلي</span>
                    <span className="text-primary">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>

              {/* إدارة الطلبية */}
              <div className="bg-card rounded-lg p-6 border border-border/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Check className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  إدارة الطلبية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">تغيير حالة الطلبية</label>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <Select
                      value={order.status}
                      onValueChange={(v) => onStatusChange(order.id, v)}
                      disabled={!!updatingById[order.id]}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحالة الجديدة" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(s => (
                          <SelectItem key={s.value} value={s.value}>
                            <div className="flex items-center gap-2">
                              <OrderStatusBadge status={s.value} />
                              <span>{s.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {updatingById[order.id] && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                        جاري تحديث الحالة...
                      </div>
                    )}
                  </div>
                  
                  {callConfirmationStatuses.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">تأكيد الاتصال</label>
                        {updatedOrder.call_confirmation_status && (
                          <CallConfirmationBadge status={updatedOrder.call_confirmation_status} />
                        )}
                      </div>
                      <Select
                        value={String(updatedOrder.call_confirmation_status_id ?? '')}
                        onValueChange={(v) => {
                          const statusId = v ? Number(v) : 0;
                          const notes = updatedOrder.call_confirmation_notes || '';
                          onCallConfirmationChange(order.id, statusId, notes);
                        }}
                        disabled={!!updatingCallById[order.id]}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حالة التأكيد" />
                        </SelectTrigger>
                        <SelectContent>
                          {callConfirmationStatuses.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: s.color || '#6b7280' }}
                                ></div>
                                <span>{s.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {updatingCallById[order.id] && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                          جاري تحديث التأكيد...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* عناصر الطلبية */}
              {order.order_items && order.order_items.length > 0 && (
                <div className="bg-card rounded-lg p-4 md:p-6 border border-border/20">
                  <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
                    <div className="p-1.5 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <Package2 className="w-4 md:w-5 h-4 md:h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    عناصر الطلبية ({order.order_items.length})
                  </h3>
                  <div className="space-y-3">
                    {order.order_items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-start p-3 bg-muted/20 rounded-lg border border-border/10">
                        <div className="flex gap-2 flex-1 min-w-0">
                          {/* صورة المنتج */}
                          <div className="w-12 h-12 rounded bg-muted/30 flex items-center justify-center flex-shrink-0">
                            {item.image_url ? (
                              <img 
                                src={item.image_url} 
                                alt={item.product_name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <Package2 className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm md:text-base mb-1">{item.product_name}</div>
                            <div className="space-y-1">
                              <div className="text-xs md:text-sm text-muted-foreground">
                                الكمية: {item.quantity} × {formatCurrency(item.unit_price)}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {item.color_name && (
                                  <div className="flex items-center gap-1 text-xs px-2 py-0.5 bg-background rounded">
                                    {item.color_code && (
                                      <div 
                                        className="w-3 h-3 rounded-full border border-border" 
                                        style={{ backgroundColor: item.color_code }}
                                      />
                                    )}
                                    <span className="text-muted-foreground">{item.color_name}</span>
                                  </div>
                                )}
                                {item.size_name && (
                                  <Badge variant="outline" className="h-5 px-2 py-0 text-[10px] font-normal">
                                    {item.size_name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="font-bold text-sm md:text-base ml-2 flex-shrink-0">
                          {formatCurrency(item.total_price)}
                        </div>
                      </div>
                    ))}
                    
                    {/* المجاميع */}
                    <div className="mt-4 pt-4 border-t border-border/20 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">المجموع الفرعي:</span>
                        <span className="font-medium">{formatCurrency(order.subtotal || 0)}</span>
                      </div>
                      {order.shipping_cost > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">الشحن:</span>
                          <span className="font-medium">{formatCurrency(order.shipping_cost)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold pt-2 border-t">
                        <span>المجموع الكلي:</span>
                        <span className="text-primary">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ملاحظات */}
              {order.notes && (
                <div className="bg-card rounded-lg p-6 border border-border/20">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    ملاحظات
                  </h3>
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <p className="text-sm">{order.notes}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>

      {/* نافذة اختيار المكتب */}
      {currentOrganization?.id && stopDeskDialogOpen && (
        <StopDeskSelectionDialog
          open={stopDeskDialogOpen}
          onOpenChange={setStopDeskDialogOpen}
          onConfirm={handleStopDeskConfirm}
          wilayaId={formData.province || formData.wilaya || formData.wilayaId}
          communeId={formData.municipality || formData.commune || formData.communeId}
          organizationId={currentOrganization.id}
        />
      )}
    </Sheet>
  );
});

OrderDetailsSheet.displayName = "OrderDetailsSheet";

export default OrderDetailsSheet;
