import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/utils";
import { Phone, Mail, MapPin, ExternalLink, ClipboardList, PackageCheck, Truck, RefreshCcw, User, Map, CreditCard, Globe, Store, Building, Building2, Home } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import FormDataViewer from './FormDataViewer';
import { getProvinceName, getMunicipalityName } from "@/utils/addressHelpers";
import { StopDeskSelectionDialog } from './dialogs/StopDeskSelectionDialog';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';

// مكون لعرض مصدر الطلب
const OrderSourceBadge = ({ source }) => {
  // تعيين أنماط وأيقونات مختلفة حسب مصدر الطلب
  let sourceInfo = {
    icon: Store,
    label: "المتجر",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400"
  };
  
  if (source === "landing_page") {
    sourceInfo = {
      icon: Globe,
      label: "صفحة هبوط",
      className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
    };
  }
  
  return (
    <Badge variant="secondary" className={`flex items-center gap-1 ml-2 ${sourceInfo.className}`}>
      <sourceInfo.icon className="h-3 w-3" />
      <span>{sourceInfo.label}</span>
    </Badge>
  );
};

// ترجمة نوع التوصيل
const translateDeliveryOption = (option) => {
  if (!option) return "غير محدد";
  
  const options = {
    'home': 'توصيل للمنزل',
    'desk': 'استلام من المكتب',
    'office': 'استلام من المكتب'
  };
  return options[option] || option;
};

const OrderDetails = ({ 
  order, 
  updateOrderStatus, 
  updateShippingInfo, 
  updateCustomerInfo,
  hasUpdatePermission = false,  // صلاحية تعديل حالة الطلب
  hasCancelPermission = false   // صلاحية إلغاء الطلب
}) => {
  const { currentOrganization } = useTenant();
  
  // حالات لحوارات التعديل
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isShippingDialogOpen, setIsShippingDialogOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [stopDeskDialogOpen, setStopDeskDialogOpen] = useState(false);
  
  // استخراج معلومات التوصيل من form_data
  const formData = (order.form_data as any) || {};
  const deliveryType = formData.deliveryType || formData.delivery_type || 'home';
  const isStopDesk = deliveryType === 'office' || 
                     deliveryType === 'stop_desk' || 
                     deliveryType === 'stopdesk' || 
                     deliveryType === 2 ||
                     deliveryType === '2';
  
  // قيم الحالة المؤقتة للتحديثات
  const [newStatus, setNewStatus] = useState(order.status);
  const [shippingData, setShippingData] = useState({
    shipping_method: order.shipping_method || "",
    shipping_cost: order.shipping_cost || 0,
    notes: order.notes || "",
    shipping_option: order.shipping_option || "home",
    deliveryType: deliveryType,
    stopdeskId: formData.stopdesk_id || formData.stopdeskId || null
  });
  const [customerData, setCustomerData] = useState({
    name: order.customer?.name || "",
    phone: order.customer?.phone || "",
    email: order.customer?.email || ""
  });
  
  // تحديث بيانات العميل عند تغير order.customer
  useEffect(() => {
    if (order.customer) {
      setCustomerData({
        name: order.customer.name || "",
        phone: order.customer.phone || "",
        email: order.customer.email || ""
      });
    }
  }, [order.customer]);
  
  // تحديث بيانات الشحن عند تغير order
  useEffect(() => {
    const formData = (order.form_data as any) || {};
    const deliveryType = formData.deliveryType || formData.delivery_type || 'home';
    
    setShippingData({
      shipping_method: order.shipping_method || "",
      shipping_cost: order.shipping_cost || 0,
      notes: order.notes || "",
      shipping_option: order.shipping_option || "home",
      deliveryType: deliveryType,
      stopdeskId: formData.stopdesk_id || formData.stopdeskId || null
    });
  }, [order]);
  
  // تنسيق التاريخ
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-DZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };
  
  // حفظ التغييرات في حالة الطلب
  const handleStatusUpdate = () => {
    // التحقق إذا كان الطلب يتم إلغاؤه وليس لدى المستخدم صلاحية الإلغاء
    if (newStatus === 'cancelled' && !hasCancelPermission) {
      toast({
        variant: "destructive",
        title: "ليس لديك صلاحية",
        description: "ليس لديك صلاحية لإلغاء الطلبات"
      });
      return;
    }
    
    updateOrderStatus(order.id, newStatus);
    setIsStatusDialogOpen(false);
  };
  
  // حفظ التغييرات في معلومات الشحن
  const handleShippingUpdate = async () => {
    try {
      // تحديث form_data مع deliveryType و stopdeskId
      const updatedFormData = {
        ...formData,
        deliveryType: shippingData.deliveryType,
        delivery_type: shippingData.deliveryType,
      };
      
      // إضافة أو حذف stopdesk_id حسب نوع التوصيل
      if (shippingData.deliveryType === 'office' && shippingData.stopdeskId) {
        updatedFormData.stopdesk_id = shippingData.stopdeskId;
        updatedFormData.stopdeskId = shippingData.stopdeskId;
      } else {
        delete updatedFormData.stopdesk_id;
        delete updatedFormData.stopdeskId;
      }
      
      // تحديث في قاعدة البيانات
      if (currentOrganization?.id) {
        const { error } = await supabase
          .from('online_orders')
          .update({ 
            form_data: updatedFormData,
            shipping_method: shippingData.shipping_method,
            shipping_cost: shippingData.shipping_cost,
            notes: shippingData.notes
          })
          .eq('id', order.id)
          .eq('organization_id', currentOrganization.id);
        
        if (error) throw error;
        
        toast({
          title: "تم التحديث",
          description: "تم تحديث معلومات الشحن بنجاح",
        });
      }
      
      updateShippingInfo(order.id, shippingData);
      setIsShippingDialogOpen(false);
    } catch (error) {
      console.error('Error updating shipping info:', error);
      toast({
        variant: "destructive",
        title: "حدث خطأ",
        description: "فشل في تحديث معلومات الشحن",
      });
    }
  };

  // دالة لتأكيد اختيار المكتب
  const handleStopDeskConfirm = async (stopdeskId: number, selectedCenter: any) => {
    try {
      console.log('OrderDetails - Selected center:', selectedCenter);
      
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
      
      console.log('OrderDetails - Updated form_data:', updatedFormData);
      
      if (currentOrganization?.id) {
        const { error } = await supabase
          .from('online_orders')
          .update({ form_data: updatedFormData })
          .eq('id', order.id)
          .eq('organization_id', currentOrganization.id);
        
        if (error) throw error;
        
        setShippingData({
          ...shippingData,
          stopdeskId: stopdeskId,
          deliveryType: 'office'
        });
        
        toast({
          title: "تم التحديث",
          description: "تم تحديث المكتب والبيانات بنجاح",
        });
        
        // إعادة تحميل الصفحة لعرض التحديثات
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('OrderDetails - Error:', error);
      toast({
        variant: "destructive",
        title: "حدث خطأ",
        description: "فشل في تحديث المكتب",
      });
    }
  };
  
  // حفظ التغييرات في معلومات العميل
  const handleCustomerUpdate = () => {
    if (order.customer?.id) {
      updateCustomerInfo(order.customer.id, customerData);
      setIsCustomerDialogOpen(false);
    } else {
      // إذا لم يكن هناك معرف للعميل، عرض رسالة
      toast({
        variant: "destructive",
        title: "غير ممكن تحديث بيانات العميل",
        description: "لا يوجد عميل مرتبط بهذا الطلب"
      });
    }
  };
  
  // الاتصال بالعميل عبر الهاتف
  const handleCallCustomer = () => {
    if (order.customer?.phone) {
      window.open(`tel:${order.customer.phone}`, '_blank');
    }
  };
  
  // إرسال بريد إلكتروني للعميل
  const handleEmailCustomer = () => {
    if (order.customer?.email) {
      window.open(`mailto:${order.customer.email}`, '_blank');
    }
  };

  // ترجمة نوع الدفع
  const translatePaymentMethod = (method) => {
    const methods = {
      'cash': 'الدفع عند الاستلام',
      'credit_card': 'بطاقة ائتمان',
      'bank_transfer': 'تحويل بنكي',
      'paypal': 'باي بال',
    };
    return methods[method] || method;
  };

  // ترجمة حالة الطلب
  const translateOrderStatus = (status) => {
    const statuses = {
      'pending': 'قيد الانتظار',
      'processing': 'قيد المعالجة',
      'shipped': 'تم الشحن',
      'delivered': 'تم التسليم',
      'cancelled': 'ملغي',
    };
    return statuses[status] || status;
  };

  // ترجمة طريقة الشحن
  const translateShippingMethod = (method) => {
    const methods = {
      'standard': 'الشركة المحددة',
      'yalidine': 'ياليدين',
      'quick_delivery': 'توصيل سريع',
      'easy_delivery': 'توصيل سهل',
      'express': 'سريع',
      'premium': 'ممتاز',
      'dhl': 'دي إتش إل',
      'aramex': 'أرامكس',
      'fedex': 'فيديكس',
      'algerie_post': 'بريد الجزائر',
      '': 'غير محدد'
    };
    return methods[method] || method;
  };

  return (
    <div className="space-y-6">
      {/* معلومات أساسية عن الطلب */}
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center">
              <h3 className="text-lg font-bold">طلب #{order.customer_order_number || "---"}</h3>
              <OrderSourceBadge source={order.created_from || 'store'} />
            </div>
            <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
          </div>
          <Badge 
            className={`px-3 py-1 ${
              order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
              order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
              order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}
          >
            {translateOrderStatus(order.status)}
          </Badge>
        </div>
        
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">المبلغ الإجمالي</p>
                <p className="font-bold">{formatPrice(order.total)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">طريقة الدفع</p>
                <p className="flex items-center">
                  <CreditCard className="w-4 h-4 ml-1" />
                  {translatePaymentMethod(order.payment_method)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عدد المنتجات</p>
                <p>{order.order_items?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">رسوم التوصيل</p>
                <p>{formatPrice(order.shipping_cost || 0)}</p>
              </div>
              {order.created_from === 'landing_page' && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">المصدر</p>
                  <div className="flex items-center">
                    <Globe className="w-4 h-4 ml-1 text-emerald-600" />
                    <span>تم إنشاؤه من صفحة هبوط</span>
                    {order.notes && order.notes.includes("تم إنشاؤه من صفحة هبوط:") && (
                      <Badge variant="outline" className="mr-2">
                        {order.notes.replace("تم إنشاؤه من صفحة هبوط:", "").trim()}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* أزرار الإجراءات السريعة */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* عرض زر تغيير الحالة فقط إذا كان لدى المستخدم صلاحية */}
          {hasUpdatePermission && (
            <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center">
                  <RefreshCcw className="w-4 h-4 ml-1" />
                  تغيير الحالة
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] w-[95vw] md:w-full">
                <DialogHeader>
                  <DialogTitle className="text-base md:text-lg">تحديث حالة الطلب</DialogTitle>
                  <DialogDescription className="text-sm">
                    اختر الحالة الجديدة للطلب رقم #{order.customer_order_number}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Select
                    value={newStatus}
                    onValueChange={setNewStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحالة الجديدة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">قيد الانتظار</SelectItem>
                      <SelectItem value="processing">قيد المعالجة</SelectItem>
                      <SelectItem value="shipped">تم الشحن</SelectItem>
                      <SelectItem value="delivered">تم التسليم</SelectItem>
                      {/* عرض خيار الإلغاء فقط إذا كان لدى المستخدم صلاحية */}
                      {hasCancelPermission && (
                        <SelectItem value="cancelled">إلغاء الطلب</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={handleStatusUpdate}>
                    حفظ التغييرات
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          <Button variant="outline" size="sm" className="flex items-center"
            onClick={handleCallCustomer} disabled={!order.customer?.phone}>
            <Phone className="w-4 h-4 ml-1" />
            اتصال
          </Button>
          
          <Button variant="outline" size="sm" className="flex items-center"
            onClick={handleEmailCustomer} disabled={!order.customer?.email}>
            <Mail className="w-4 h-4 ml-1" />
            إرسال بريد
          </Button>
        </div>
      </div>

      {/* بيانات النموذج المخصص إذا كانت موجودة */}
      {order.form_data && (
        <section className="mt-6">
          <h3 className="text-lg font-semibold mb-2">معلومات إضافية</h3>
          {(() => {
            // استبعاد الحقول التي تم عرضها بالفعل في الأقسام الأخرى
            const excludedFields = ['fullName', 'phone', 'province', 'municipality', 'deliveryOption', 'address'];
            
            // إذا كان form_data نصي، نحوله إلى كائن
            let formDataObj = order.form_data;
            if (typeof order.form_data === 'string') {
              try {
                formDataObj = JSON.parse(order.form_data);
              } catch (e) {
                return <FormDataViewer formData={order.form_data} />;
              }
            }
            
            // إنشاء نسخة من البيانات بدون الحقول المستبعدة
            const filteredFormData = { ...formDataObj };
            excludedFields.forEach(field => {
              delete filteredFormData[field];
            });
            
            // التحقق من وجود بيانات إضافية بعد استبعاد الحقول المكررة
            if (Object.keys(filteredFormData).length === 0) {
              return <p className="text-sm text-muted-foreground">لا توجد معلومات إضافية للطلب</p>;
            }
            
            return <FormDataViewer formData={filteredFormData} title="معلومات أخرى" />;
          })()}
        </section>
      )}

      {/* تفاصيل الطلب في أقسام قابلة للطي - محسّن للهاتف */}
      <Accordion type="single" collapsible defaultValue="order-items">
        {/* قسم: المنتجات المطلوبة */}
        <AccordionItem value="order-items">
          <AccordionTrigger className="text-sm md:text-base font-medium py-4 hover:no-underline">
            <span className="flex items-center">
              <PackageCheck className="w-4 h-4 ml-2" />
              المنتجات المطلوبة
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex items-start border-b pb-3">
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center ml-3">
                    <ClipboardList className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{item.product_name}</h4>
                      <span className="text-sm font-mono">{formatPrice(item.total_price)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                      <span>{item.quantity} × {formatPrice(item.unit_price)}</span>
                      <span>معرف: {item.product_id}</span>
                    </div>
                    
                    {/* إضافة معلومات اللون والمقاس */}
                    {(item.color_name || item.size_name) && (
                      <div className="mt-2 bg-muted/40 p-1.5 rounded-md text-xs">
                        {item.color_name && (
                          <div className="flex items-center mb-1">
                            <div 
                              className="w-3 h-3 rounded-full ml-1" 
                              style={{ backgroundColor: item.color_code || '#ccc' }}
                            ></div>
                            <span>اللون: {item.color_name}</span>
                          </div>
                        )}
                        {item.size_name && (
                          <div className="flex items-center">
                            <span className="inline-block border border-muted-foreground/30 px-1 text-[10px] rounded ml-1">
                              {item.size_name}
                            </span>
                            <span>المقاس: {item.size_name}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* قسم: معلومات العميل */}
        <AccordionItem value="customer-info">
          <AccordionTrigger className="text-sm md:text-base font-medium py-4 hover:no-underline">
            <span className="flex items-center">
              <User className="w-4 h-4 ml-2" />
              معلومات العميل
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="space-y-1">
                  {/* عرض البيانات من معلومات العميل الأساسية */}
                  <div className="flex items-center text-sm">
                    <User className="w-4 h-4 ml-1 opacity-70" />
                    <span>
                      {order.form_data?.fullName || order.customer?.name || "غير محدد"}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Phone className="w-4 h-4 ml-1 opacity-70" />
                    <span>
                      {order.form_data?.phone || order.customer?.phone || "غير محدد"}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Mail className="w-4 h-4 ml-1 opacity-70" />
                    <span>{order.customer?.email || "غير محدد"}</span>
                  </div>

                  {/* إذا كان هناك بيانات form_data، عرض المزيد من التفاصيل */}
                  {order.form_data && typeof order.form_data === 'object' && (
                    <>
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-semibold opacity-70 mb-2">بيانات إضافية</div>
                        {order.form_data.province && (
                          <div className="flex items-center text-sm">
                            <Map className="w-4 h-4 ml-1 opacity-70" />
                            <span>المنطقة: {order.form_data.province}</span>
                          </div>
                        )}
                        {order.form_data.municipality && (
                          <div className="flex items-center text-sm">
                            <MapPin className="w-4 h-4 ml-1 opacity-70" />
                            <span>البلدية: {order.form_data.municipality}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      تعديل
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] w-[95vw] md:w-full">
                    <DialogHeader>
                      <DialogTitle className="text-base md:text-lg">تعديل معلومات العميل</DialogTitle>
                      <DialogDescription className="text-sm">
                        قم بتحديث معلومات العميل المرتبطة بهذا الطلب
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="customer-name">اسم العميل</Label>
                        <Input
                          id="customer-name"
                          value={customerData.name}
                          onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer-phone">رقم الهاتف</Label>
                        <Input
                          id="customer-phone"
                          value={customerData.phone}
                          onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer-email">البريد الإلكتروني</Label>
                        <Input
                          id="customer-email"
                          value={customerData.email}
                          onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
                        إلغاء
                      </Button>
                      <Button onClick={handleCustomerUpdate}>
                        حفظ التغييرات
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* قسم: معلومات الشحن والتوصيل */}
        <AccordionItem value="shipping-info">
          <AccordionTrigger className="text-sm md:text-base font-medium py-4 hover:no-underline">
            <span className="flex items-center">
              <Truck className="w-4 h-4 ml-2" />
              معلومات الشحن والتوصيل
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="space-y-1">
                  {/* شركة التوصيل */}
                  <div className="flex items-center text-sm">
                    <Truck className="w-4 h-4 ml-1 opacity-70" />
                    <span>
                      شركة التوصيل: {translateShippingMethod(order.shipping_method) || "غير محدد"}
                    </span>
                  </div>

                  {/* نوع التوصيل */}
                  <div className="flex items-center text-sm">
                    {isStopDesk ? (
                      <Building2 className="w-4 h-4 ml-1 opacity-70" />
                    ) : (
                      <Home className="w-4 h-4 ml-1 opacity-70" />
                    )}
                    <span>
                      نوع التوصيل: {isStopDesk ? 'توصيل للمكتب' : 'توصيل للمنزل'}
                    </span>
                  </div>

                  {/* رقم المكتب إذا كان توصيل للمكتب */}
                  {isStopDesk && shippingData.stopdeskId && (
                    <div className="flex items-center text-sm">
                      <Building2 className="w-4 h-4 ml-1 opacity-70" />
                      <span>
                        مكتب رقم: {shippingData.stopdeskId}
                      </span>
                    </div>
                  )}

                  {/* طريقة التوصيل (القديمة للتوافق) */}
                  {order.shipping_option && (
                    <div className="flex items-center text-sm">
                      <PackageCheck className="w-4 h-4 ml-1 opacity-70" />
                      <span>
                        طريقة التوصيل: {translateDeliveryOption(order.shipping_option || order.form_data?.deliveryOption)}
                      </span>
                    </div>
                  )}

                  {/* سعر التوصيل */}
                  <div className="flex items-center text-sm">
                    <CreditCard className="w-4 h-4 ml-1 opacity-70" />
                    <span>
                      سعر التوصيل: {formatPrice(order.shipping_cost || 0)} دج
                    </span>
                  </div>

                  {/* معلومات الولاية والبلدية */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold opacity-70 mb-2">معلومات العنوان</div>
                    
                    {/* الولاية */}
                    <div className="flex items-center text-sm">
                      <Map className="w-4 h-4 ml-1 opacity-70" />
                      <span>
                        الولاية: {
                          order.form_data?.province ? getProvinceName(order.form_data.province) :
                          order.shipping_address?.state ? getProvinceName(order.shipping_address.state) :
                          "غير محدد"
                        }
                      </span>
                    </div>
                    
                    {/* البلدية */}
                    <div className="flex items-center text-sm">
                      <Map className="w-4 h-4 ml-1 opacity-70" />
                      <span>
                        البلدية: {
                          order.form_data?.municipality ? getMunicipalityName(order.form_data.municipality, order.form_data.province) :
                          order.shipping_address?.municipality ? getMunicipalityName(order.shipping_address.municipality, order.shipping_address.state) :
                          (order.metadata?.shipping_details?.stop_desk_commune_name) ||
                          "غير محدد"
                        }
                      </span>
                    </div>
                    
                    {/* مكتب الاستلام */}
                    {(order.shipping_option === 'desk' || order.form_data?.deliveryOption === 'desk') && (
                      <div className="flex items-center text-sm">
                        <Building className="w-4 h-4 ml-1 opacity-70" />
                        <span>
                          مكتب الاستلام: {
                            order.stop_desk_id || 
                            order.metadata?.shipping_details?.stop_desk_name ||
                            order.metadata?.shipping_details?.stop_desk_id ||
                            "غير محدد"
                          }
                        </span>
                      </div>
                    )}
                    
                    {/* العنوان التفصيلي */}
                    <div className="flex items-start text-sm">
                      <MapPin className="w-4 h-4 ml-1 mt-0.5 opacity-70" />
                      <span>
                        العنوان: {
                          order.shipping_option === 'desk' ? 
                          `استلام من مكتب ${order.metadata?.shipping_details?.stop_desk_name || "ياليدين"}` :
                          order.form_data?.address || 
                          order.shipping_address?.street_address || 
                          "غير محدد"
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                <Dialog open={isShippingDialogOpen} onOpenChange={setIsShippingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      تعديل
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] w-[95vw] md:w-full">
                    <DialogHeader>
                      <DialogTitle className="text-base md:text-lg">تعديل معلومات الشحن</DialogTitle>
                      <DialogDescription className="text-sm">
                        قم بتحديث معلومات الشحن والتوصيل لهذا الطلب
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="shipping-method">شركة التوصيل</Label>
                        <Select
                          value={shippingData.shipping_method}
                          onValueChange={(value) => setShippingData({...shippingData, shipping_method: value})}
                        >
                          <SelectTrigger id="shipping-method">
                            <SelectValue placeholder="اختر شركة التوصيل" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yalidine">ياليدين</SelectItem>
                            <SelectItem value="quick_delivery">توصيل سريع</SelectItem>
                            <SelectItem value="easy_delivery">توصيل سهل</SelectItem>
                            <SelectItem value="dhl">دي إتش إل</SelectItem>
                            <SelectItem value="aramex">أرامكس</SelectItem>
                            <SelectItem value="algerie_post">بريد الجزائر</SelectItem>
                            <SelectItem value="other">شركة أخرى</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* نوع التوصيل الجديد */}
                      <div className="space-y-2">
                        <Label htmlFor="delivery-type">نوع التوصيل</Label>
                        <Select
                          value={shippingData.deliveryType}
                          onValueChange={(value) => {
                            const newData = {...shippingData, deliveryType: value};
                            // إذا تم التغيير للمنزل، حذف stopdeskId
                            if (value === 'home') {
                              newData.stopdeskId = null;
                            }
                            setShippingData(newData);
                          }}
                        >
                          <SelectTrigger id="delivery-type">
                            <SelectValue placeholder="اختر نوع التوصيل" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="home">
                              <div className="flex items-center gap-2">
                                <Home className="w-4 h-4" />
                                توصيل للمنزل
                              </div>
                            </SelectItem>
                            <SelectItem value="office">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                توصيل للمكتب
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* اختيار المكتب إذا كان التوصيل للمكتب */}
                      {shippingData.deliveryType === 'office' && (
                        <div className="space-y-2">
                          <Label>المكتب</Label>
                          <div className="flex items-center gap-2">
                            {shippingData.stopdeskId ? (
                              <div className="flex-1 p-2 bg-muted rounded-md text-sm">
                                مكتب رقم: {shippingData.stopdeskId}
                              </div>
                            ) : (
                              <div className="flex-1 p-2 bg-muted/50 rounded-md text-sm text-muted-foreground">
                                لم يتم اختيار مكتب
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setStopDeskDialogOpen(true)}
                            >
                              <Building2 className="w-4 h-4 ml-1" />
                              {shippingData.stopdeskId ? 'تغيير' : 'اختيار'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* خيار التوصيل القديم (للتوافق) */}
                      <div className="space-y-2">
                        <Label htmlFor="shipping-option">خيار التوصيل (قديم)</Label>
                        <Select
                          value={shippingData.shipping_option}
                          onValueChange={(value) => setShippingData({...shippingData, shipping_option: value})}
                        >
                          <SelectTrigger id="shipping-option">
                            <SelectValue placeholder="اختر خيار التوصيل" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="home">توصيل للمنزل</SelectItem>
                            <SelectItem value="desk">استلام من المكتب</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="shipping-cost">رسوم التوصيل (دج)</Label>
                        <Input
                          id="shipping-cost"
                          type="number"
                          value={shippingData.shipping_cost}
                          onChange={(e) => setShippingData({...shippingData, shipping_cost: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="order-notes">ملاحظات الطلب</Label>
                        <Textarea
                          id="order-notes"
                          value={shippingData.notes}
                          onChange={(e) => setShippingData({...shippingData, notes: e.target.value})}
                          placeholder="أي ملاحظات إضافية حول الطلب أو الشحن"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsShippingDialogOpen(false)}>
                        إلغاء
                      </Button>
                      <Button onClick={handleShippingUpdate}>
                        حفظ التغييرات
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* قسم: ملاحظات الطلب */}
        <AccordionItem value="order-notes">
          <AccordionTrigger className="text-sm md:text-base font-medium py-4 hover:no-underline">
            <span className="flex items-center">
              <ClipboardList className="w-4 h-4 ml-2" />
              ملاحظات الطلب
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {order.notes ? (
              <p className="py-2 px-3 bg-muted rounded-md text-sm">{order.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد ملاحظات لهذا الطلب</p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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
    </div>
  );
};

export default OrderDetails;
