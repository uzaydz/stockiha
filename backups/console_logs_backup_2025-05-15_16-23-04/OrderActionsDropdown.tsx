import { useState, Fragment } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  MoreHorizontal,
  Package,
  PackageCheck,
  Printer,
  Truck,
  X,
  ClipboardList,
  XCircle
} from "lucide-react";
import { OrderActionsDropdownProps, Order } from "./OrderTableTypes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTenant } from "@/context/TenantContext";
import { getYalidineApiClient } from "@/api/yalidine/api";
import { useToast } from "@/hooks/use-toast";
import { AxiosInstance } from "axios";

const OrderActionsDropdown = ({
  order,
  onUpdateStatus,
  hasUpdatePermission,
  hasCancelPermission,
}: OrderActionsDropdownProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isSendingToYalidine, setIsSendingToYalidine] = useState(false);

  const { currentOrganization } = useTenant();
  const { toast } = useToast();

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === "cancelled") {
      setShowCancelConfirm(true);
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateStatus(order.id, newStatus);
    } catch (error) {
      console.error("فشل تحديث حالة الطلب:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(order.id, "cancelled");
      setShowCancelConfirm(false);
    } catch (error) {
      console.error("فشل إلغاء الطلب:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewOrderDetails = () => {
    // سيتم ربط ذلك بصفحة تفاصيل الطلب لاحقاً
    window.open(`/dashboard/orders/${order.id}`, "_blank");
  };

  const handlePrintInvoice = () => {
    // سيتم تنفيذ طباعة الفاتورة لاحقاً
    console.log("طباعة فاتورة الطلب:", order.id);
  };

  const handleSendToYalidine = async () => {
    if (!currentOrganization?.id) {
      toast({
        variant: "destructive",
        title: "خطأ في تحديد المؤسسة",
        description: "لم يتم العثور على معرّف المؤسسة الحالي.",
      });
      return;
    }

    setIsSendingToYalidine(true);
    let apiClient: AxiosInstance | null = null;

    try {
      apiClient = await getYalidineApiClient(currentOrganization.id, true);
    } catch (error) {
      console.error("Failed to get Yalidine API client:", error);
      toast({
        variant: "destructive",
        title: "خطأ في الاتصال بـ Yalidine",
        description: "فشل إعداد الاتصال مع Yalidine. يرجى مراجعة إعدادات الربط أو بيانات الاعتماد.",
      });
      setIsSendingToYalidine(false);
      return;
    }

    if (!apiClient) {
      toast({
        variant: "destructive",
        title: "خطأ في الاتصال بـ Yalidine",
        description: "لم يتمكن من تهيئة عميل Yalidine. تحقق من بيانات الاعتماد.",
      });
      setIsSendingToYalidine(false);
      return;
    }

    const fromWilayaName = currentOrganization?.settings?.yalidine_origin_wilaya_name || "Alger";

    const parcelData = {
      order_id: order.customer_order_number || order.id,
      from_wilaya_name: fromWilayaName,
      firstname: order.customer?.name?.split(' ')[0] || "N/A",
      familyname: order.customer?.name?.split(' ').slice(1).join(' ') || "N/A",
      contact_phone: order.customer?.phone || "012345678",
      address: order.shipping_address?.address_line1 || order.shipping_address?.street_address || "N/A Address",
      to_commune_name: order.shipping_address?.city || order.shipping_address?.municipality || "N/A Commune",
      to_wilaya_name: order.shipping_address?.state || "N/A Wilaya",
      product_list: order.order_items?.map(item => item.product_name || item.name).join(', ') || "N/A Products",
      price: order.total || 0,
      do_insurance: false,
      declared_value: order.total || 0,
      freeshipping: order.shipping_cost === 0,
      is_stopdesk: false,
      length: order.metadata?.length || 10,
      width: order.metadata?.width ||  10,
      height: order.metadata?.height || 10,
      weight: order.metadata?.weight || 1,
      has_exchange: false,
    };

    const requiredFields: (keyof typeof parcelData)[] = [
      'from_wilaya_name', 'firstname', 'familyname', 'contact_phone', 
      'address', 'to_commune_name', 'to_wilaya_name', 'product_list', 
      'price', 'length', 'width', 'height', 'weight'
    ];

    for (const field of requiredFields) {
      const value = parcelData[field];
      if (value === undefined || value === null || value === "" || (typeof value === 'number' && isNaN(value)) || (typeof value === 'string' && value.startsWith("N/A"))) {
        toast({
            variant: "destructive",
            title: "بيانات الطلب غير كاملة",
            description: `الحقل المطلوب "${field}" مفقود أو غير صحيح (${value}) لإرسال الشحنة إلى Yalidine.`,
        });
        setIsSendingToYalidine(false);
        return;
      }
    }

    if (!/^0[2-7][0-9]{7,8}$/.test(parcelData.contact_phone)) {
        toast({
            variant: "destructive",
            title: "رقم الهاتف غير صحيح",
            description: `صيغة رقم هاتف المستلم (${parcelData.contact_phone}) غير صحيحة. يجب أن يبدأ بـ 0 ويكون مكون من 9 أرقام (جوال) أو 8 أرقام (ثابت).`,
        });
        setIsSendingToYalidine(false);
        return;
    }

    try {
      const response = await apiClient.post("/parcels", [parcelData]);
      console.log("Yalidine API Response:", response.data);

      const trackingKey = parcelData.order_id;
      if (response.data && response.data[trackingKey] && response.data[trackingKey].success) {
        const yalidineTrackingId = response.data[trackingKey].tracking;
        const labelUrl = response.data[trackingKey].label;
        
        toast({
          variant: "default",
          title: "تم إرسال الطلب إلى Yalidine بنجاح!",
          description: (
            <div>
              تم إنشاء الشحنة برقم تتبع: {yalidineTrackingId}.
              {labelUrl && (
                <a href={labelUrl} target="_blank" rel="noopener noreferrer" className="underline ml-2">
                  عرض البوليصة
                </a>
              )}
            </div>
          ),
          className: "bg-green-500 text-white",
          duration: 10000,
        });
      } else {
        const errorMessage = response.data && response.data[trackingKey] && response.data[trackingKey].message 
          ? response.data[trackingKey].message 
          : "فشل إرسال الطلب إلى Yalidine. يرجى مراجعة البيانات.";
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("Error sending to Yalidine:", error);
      let detailedMessage = "حدث خطأ غير متوقع أثناء الاتصال بخدمة Yalidine.";

      if (error.response?.data) {
        const responseData = error.response.data;
        const orderErrorKey = parcelData.order_id;
        if (responseData[orderErrorKey] && responseData[orderErrorKey].message) {
          detailedMessage = responseData[orderErrorKey].message;
        } else if (responseData.message) {
          detailedMessage = responseData.message;
        } else if (responseData.errors) {
          const errors = responseData.errors;
          const fieldErrors = Object.keys(errors).map(key => `${key}: ${errors[key].join(', ')}`).join('; ');
          detailedMessage = `خطأ في الحقول: ${fieldErrors}`;
        } else if (typeof responseData === 'string') {
            detailedMessage = responseData;
        }
      } else if (error.message) {
        detailedMessage = error.message;
      }
      
      toast({
        variant: "destructive",
        title: "فشل إرسال الطلب إلى Yalidine",
        description: detailedMessage,
        duration: 10000,
      });
    } finally {
      setIsSendingToYalidine(false);
    }
  };

  const availableActions = [];

  if (order.status === "pending") {
    hasUpdatePermission && availableActions.push({
      id: "process",
      label: "بدء المعالجة",
      icon: Package,
      action: () => handleStatusUpdate("processing"),
      className: "text-blue-600 hover:bg-blue-50",
    });
  }

  if (order.status === "processing") {
    hasUpdatePermission && availableActions.push({
      id: "ship",
      label: "تم الشحن",
      icon: Truck,
      action: () => handleStatusUpdate("shipped"),
      className: "text-indigo-600 focus:bg-indigo-50 hover:bg-indigo-50",
      disabled: false,
    });
  }

  if (order.status === "shipped") {
    hasUpdatePermission && availableActions.push({
      id: "deliver",
      label: "تم التسليم",
      icon: CheckCircle2,
      action: () => handleStatusUpdate("delivered"),
      className: "text-green-600 hover:bg-green-50",
    });
  }

  availableActions.push(
    {
      id: "view",
      label: "عرض التفاصيل",
      icon: Eye,
      action: handleViewOrderDetails,
      className: "hover:bg-slate-50",
    },
    {
      id: "print",
      label: "طباعة الفاتورة",
      icon: Printer,
      action: handlePrintInvoice,
      className: "hover:bg-slate-50",
    },
    {
      id: "download",
      label: "تنزيل الفاتورة",
      icon: Download,
      action: handlePrintInvoice,
      className: "hover:bg-slate-50",
    },
    {
      id: "track",
      label: "تتبع الشحنة",
      icon: ClipboardList,
      action: () => console.log("تتبع الشحنة:", order.id),
      className: "hover:bg-slate-50",
    }
  );

  if (
    hasCancelPermission &&
    order.status !== "cancelled" &&
    order.status !== "delivered"
  ) {
    availableActions.push({
      id: "cancel",
      label: "إلغاء الطلب",
      icon: X,
      action: () => handleStatusUpdate("cancelled"),
      className: "text-rose-600 hover:bg-rose-50",
      separator: true,
    });
  }

  const canSendToYalidine = (order.status === 'processing' || order.status === 'pending');

  if (hasUpdatePermission && canSendToYalidine) {
    availableActions.unshift({
      id: "send_to_yalidine",
      label: "إرسال إلى Yalidine",
      icon: Truck,
      action: handleSendToYalidine,
      className: "text-green-700 focus:bg-green-100 hover:bg-green-50",
      disabled: isSendingToYalidine,
    });
  }

  return (
    <>
      <TooltipProvider>
        <DropdownMenu dir="rtl">
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100">
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                  <span className="sr-only">فتح القائمة</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>إجراءات الطلب</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent 
            align="start" 
            className="w-52 p-1 rounded-lg border border-muted shadow-lg"
          >
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              إجراءات الطلب
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            {availableActions.map((action, index) => (
              <Fragment key={action.id}>
                {action.separator && index > 0 && <DropdownMenuSeparator className="my-1" />}
                <DropdownMenuItem
                  onClick={action.action}
                  disabled={action.disabled || isUpdating }
                  className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${action.className} ${
                    (action.disabled || isUpdating) ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {(isSendingToYalidine && action.id === "send_to_yalidine") || (isUpdating && (action.id === 'process' || action.id === 'ship' || action.id === 'deliver' || action.id === 'cancel')) ? (
                    <Loader2 className={`ml-2 h-4 w-4 animate-spin`} />
                  ) : (
                    <action.icon className={`ml-2 h-4 w-4`} />
                  )}
                  <span>{action.label}</span>
                </DropdownMenuItem>
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent dir="rtl" className="max-w-md bg-white p-6 rounded-xl shadow-2xl border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
              <XCircle className="text-rose-500 h-6 w-6" />
              تأكيد إلغاء الطلب
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base mt-2 text-center">
              هل أنت متأكد من إلغاء هذا الطلب؟
              <br />
              <span className="text-rose-500 font-medium">لا يمكن التراجع عن هذا الإجراء.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => setShowCancelConfirm(false)}>تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isUpdating}
            >
              {isUpdating && showCancelConfirm ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="ml-2 h-4 w-4" />
              )}
              تأكيد الإلغاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrderActionsDropdown; 