import { useState, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu,
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
  Loader2,
  MoreHorizontal,
  X,
  XCircle,
  Trash2,
  Package as PackageIcon,
  Truck as TruckIcon,
  CheckCircle2 as CheckCircle2Icon,
  Eye as EyeIcon,
  Printer as PrinterIcon,
  Download as DownloadIcon,
  ClipboardList as ClipboardListIcon,
  Send as SendIcon,
} from "lucide-react";
import { OrderActionsDropdownProps, Order } from "./OrderTableTypes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTenant } from "@/context/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { OrdersService } from "@/api/ordersService";

const OrderActionsDropdown = ({
  order,
  onUpdateStatus,
  hasUpdatePermission = true,
  hasCancelPermission = true,
}: OrderActionsDropdownProps) => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingToYalidine, setIsSendingToYalidine] = useState(false);
  const [isSendingToZRExpress, setIsSendingToZRExpress] = useState(false);
  
  const ordersService = new OrdersService();

  const handleSendToYalidine = async () => {
    if (!currentOrganization || !order.id) {
      toast({
        title: "خطأ",
        description: "لم يتم العثور على معلومات المؤسسة أو معرّف الطلب.",
        variant: "destructive",
      });
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      toast({
        title: "خطأ في الإعداد",
        description: "بيانات Supabase (URL أو Anon Key) غير مهيأة في متغيرات البيئة.",
        variant: "destructive",
      });
      return;
    }
    const functionUrl = `${supabaseUrl}/functions/v1/send-order-to-yalidine`;

    setIsSendingToYalidine(true);
    toast({ title: "جاري إرسال الطلب إلى Yalidine...", description: `الطلب رقم ${order.id}` });

    try {
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorData = result;
        const errorMessage = errorData?.message || errorData?.error?.message || "فشل إرسال الطلب إلى Yalidine.";
        throw new Error(errorMessage);
      }
      
      if(!result.success) {
         throw new Error(result.message || "فشل إرسال الطلب إلى Yalidine (حسب استجابة الدالة).");
      }

      toast({
        title: "تم الإرسال بنجاح!",
        description: `تم إرسال الطلب ${order.id} إلى Yalidine. رقم التتبع: ${result.tracking_id}`,
        variant: "default",
        className: "bg-green-100 border-green-400 text-green-700",
      });
      if (onUpdateStatus) {
        onUpdateStatus(order.id, "processing");
      }

    } catch (error: any) {
      toast({
        title: "فشل إرسال الطلب",
        description: error.message || "حدث خطأ غير متوقع.",
        variant: "destructive",
      });
    } finally {
      setIsSendingToYalidine(false);
    }
  };

  const handleSendToZRExpress = async () => {
    if (!currentOrganization || !order.id) {
      toast({
        title: "خطأ",
        description: "لم يتم العثور على معلومات المؤسسة أو معرّف الطلب.",
        variant: "destructive",
      });
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      toast({
        title: "خطأ في الإعداد",
        description: "بيانات Supabase (URL أو Anon Key) غير مهيأة في متغيرات البيئة.",
        variant: "destructive",
      });
      return;
    }
    const functionUrl = `${supabaseUrl}/functions/v1/send-order-to-zrexpress`;

    setIsSendingToZRExpress(true);
    toast({ title: "جاري إرسال الطلب إلى ZR Express...", description: `الطلب رقم ${order.id}` });

    try {
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorData = result;
        const errorMessage = errorData?.message || errorData?.error?.message || "فشل إرسال الطلب إلى ZR Express.";
        throw new Error(errorMessage);
      }
      
      if(!result.success) {
         throw new Error(result.message || "فشل إرسال الطلب إلى ZR Express (حسب استجابة الدالة).");
      }

      toast({
        title: "تم الإرسال بنجاح!",
        description: `تم إرسال الطلب ${order.id} إلى ZR Express. رقم التتبع: ${result.tracking_id}`,
        variant: "default",
        className: "bg-blue-100 border-blue-400 text-blue-700",
      });
      if (onUpdateStatus) {
        onUpdateStatus(order.id, "processing");
      }

    } catch (error: any) {
      toast({
        title: "فشل إرسال الطلب",
        description: error.message || "حدث خطأ غير متوقع.",
        variant: "destructive",
      });
    } finally {
      setIsSendingToZRExpress(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === "cancelled") {
      setShowCancelConfirm(true);
      return;
    }
    setIsUpdating(true);
    try {
      if (onUpdateStatus) await onUpdateStatus(order.id, newStatus);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحديث حالة الطلب.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsUpdating(true);
    try {
      if (onUpdateStatus) await onUpdateStatus(order.id, "cancelled");
      setShowCancelConfirm(false);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل إلغاء الطلب.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteOrder = async () => {
    setIsDeleting(true);
    try {
      const success = await ordersService.deleteOrder(order.id);
      if (success) {
        toast({
          title: "تم حذف الطلب بنجاح",
          description: `تم حذف الطلب ${order.id} نهائياً مع إعادة المخزون`,
          variant: "default",
          className: "bg-green-100 border-green-400 text-green-700",
        });
        setShowDeleteConfirm(false);
        // Trigger a page refresh to update the orders list
        window.location.reload();
      } else {
        throw new Error("فشل في حذف الطلب");
      }
    } catch (error) {
      toast({
        title: "فشل حذف الطلب",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع أثناء حذف الطلب",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewOrderDetails = () => {
    window.open(`/dashboard/orders/${order.id}`, "_blank");
  };

  const handlePrintInvoice = () => {
    toast({ title: "ميزة قيد التطوير", description: "طباعة الفاتورة ستكون متاحة قريباً."});
  };

  const handleDownloadInvoice = () => {
    toast({ title: "ميزة قيد التطوير", description: "تنزيل الفاتورة سيكون متاحاً قريباً."});
  };

  const handleTrackShipment = () => {
    toast({ title: "ميزة قيد التطوير", description: "تتبع الشحنة سيكون متاحاً قريباً."});
  };

  const actionsMap: {[key: string]: {id: string, label: string, icon: React.ElementType, action: () => void, className?: string, disabled?: boolean, separator?: boolean}} = {
    process: { id: "process", label: "بدء المعالجة", icon: PackageIcon, action: () => handleStatusUpdate("processing"), className: "text-blue-600 hover:bg-blue-50" },
    ship: { id: "ship", label: "تم الشحن", icon: TruckIcon, action: () => handleStatusUpdate("shipped"), className: "text-indigo-600 hover:bg-indigo-50" },
    deliver: { id: "deliver", label: "تم التسليم", icon: CheckCircle2Icon, action: () => handleStatusUpdate("delivered"), className: "text-green-600 hover:bg-green-50" },
    view_details: { id: "view_details", label: "عرض التفاصيل", icon: EyeIcon, action: handleViewOrderDetails, className: "hover:bg-slate-50" },
    print_invoice: { id: "print_invoice", label: "طباعة الفاتورة", icon: PrinterIcon, action: handlePrintInvoice, className: "hover:bg-slate-50" },
    download_invoice: { id: "download_invoice", label: "تنزيل الفاتورة", icon: DownloadIcon, action: handleDownloadInvoice, className: "hover:bg-slate-50" },
    track_shipment: { id: "track_shipment", label: "تتبع الشحنة", icon: ClipboardListIcon, action: handleTrackShipment, className: "hover:bg-slate-50" },
    send_to_yalidine: { id: "send_to_yalidine", label: "إرسال إلى Yalidine", icon: SendIcon, action: handleSendToYalidine, className: "text-green-700 hover:bg-green-50", disabled: isSendingToYalidine },
    send_to_zrexpress: { id: "send_to_zrexpress", label: "إرسال إلى ZR Express", icon: TruckIcon, action: handleSendToZRExpress, className: "text-blue-700 hover:bg-blue-50", disabled: isSendingToZRExpress },
    cancel: { id: "cancel", label: "إلغاء الطلب", icon: X, action: () => setShowCancelConfirm(true), className: "text-rose-600 hover:bg-rose-50", separator: true },
    delete: { id: "delete", label: "حذف الطلب نهائياً", icon: Trash2, action: () => setShowDeleteConfirm(true), className: "text-red-700 hover:bg-red-50", disabled: isDeleting },
  };

  const getAvailableActions = () => {
    const actionKeys: string[] = [];
    if (hasUpdatePermission) {
      if (order.status === "pending") actionKeys.push("process");
      if (order.status === "processing") actionKeys.push("ship");
      if (order.status === "shipped") actionKeys.push("deliver");
    }
    
    actionKeys.push("view_details", "print_invoice", "download_invoice", "track_shipment");

    if (hasCancelPermission && order.status !== "cancelled" && order.status !== "delivered") {
      actionKeys.push("cancel");
    }

    // Allow delete for admins (we assume hasCancelPermission means admin rights)
    if (hasCancelPermission) {
      actionKeys.push("delete");
    }

    // التحقق من حالة إرسال الشحنات
    const hasYalidineTracking = order['yalidine_tracking_id'] !== undefined && order['yalidine_tracking_id'] !== null && order['yalidine_tracking_id'] !== '';
    const hasZRExpressTracking = order['zrexpress_tracking_id'] !== undefined && order['zrexpress_tracking_id'] !== null && order['zrexpress_tracking_id'] !== '';
    const canSendToShipping = ['pending', 'processing'].includes(order.status) && 
                             !['cancelled', 'delivered'].includes(order.status) && 
                             !hasYalidineTracking && !hasZRExpressTracking;
    
    if (hasUpdatePermission && canSendToShipping) {
      actionKeys.unshift("send_to_yalidine");
      actionKeys.unshift("send_to_zrexpress");
    }
    return actionKeys.map(key => actionsMap[key]).filter(Boolean);
  };

  const currentRenderableActions = getAvailableActions();

  return (
    <>
      <TooltipProvider>
        <DropdownMenu dir="rtl">
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-slate-100 transform-gpu"
                  style={{ contain: 'layout', willChange: 'auto' }}
                >
                  {isUpdating || isSendingToYalidine || isSendingToZRExpress || isDeleting ? (
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
            align="end" 
            className="w-56 p-1 rounded-lg border border-muted shadow-lg transform-gpu"
            style={{ 
              contain: 'layout', 
              willChange: 'transform',
              zIndex: 9999 
            }}
            sideOffset={4}
            avoidCollisions={true}
          >
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              إجراءات الطلب
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            {currentRenderableActions.map((actionItem, index) => (
              <Fragment key={actionItem.id}>
                {actionItem.separator && index > 0 && <DropdownMenuSeparator className="my-1" />}
                <DropdownMenuItem
                  onClick={actionItem.action}
                  disabled={actionItem.disabled || isUpdating || (actionItem.id === 'send_to_yalidine' && isSendingToYalidine) || (actionItem.id === 'send_to_zrexpress' && isSendingToZRExpress) || (actionItem.id === 'delete' && isDeleting)}
                  className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors transform-gpu ${actionItem.className || ''} ${
                    (actionItem.disabled || isUpdating || (actionItem.id === 'send_to_yalidine' && isSendingToYalidine) || (actionItem.id === 'send_to_zrexpress' && isSendingToZRExpress) || (actionItem.id === 'delete' && isDeleting)) ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  style={{ contain: 'layout' }}
                >
                  { ((actionItem.id === "send_to_yalidine" && isSendingToYalidine) || (actionItem.id === "send_to_zrexpress" && isSendingToZRExpress) || (actionItem.id === "delete" && isDeleting) || (isUpdating && (actionItem.id === 'process' || actionItem.id === 'ship' || actionItem.id === 'deliver' || actionItem.id === 'cancel'))) ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    actionItem.icon && <actionItem.icon className="ml-2 h-4 w-4" />
                  )}
                  <span>{actionItem.label}</span>
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
            <AlertDialogDescription className="text-center text-gray-600 pt-2">
              هل أنت متأكد أنك تريد إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-center gap-3 pt-4">
            <AlertDialogCancel className="px-6 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100 transition-colors">
              تراجع
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelOrder} 
              className="px-6 py-2 text-sm rounded-md bg-rose-500 text-white hover:bg-rose-600 transition-colors"
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "نعم، قم بالإلغاء"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent dir="rtl" className="max-w-md bg-white p-6 rounded-xl shadow-2xl border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
              <Trash2 className="text-red-600 h-6 w-6" />
              تأكيد حذف الطلب نهائياً
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-gray-600 pt-2">
              <div className="space-y-2">
                <p className="text-red-600 font-semibold">تحذير: هذا إجراء لا رجعة فيه!</p>
                <p>سيتم حذف الطلب نهائياً من قاعدة البيانات وإعادة المخزون للمنتجات.</p>
                <p>هل أنت متأكد من أنك تريد المتابعة؟</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-center gap-3 pt-4">
            <AlertDialogCancel className="px-6 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100 transition-colors">
              تراجع
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteOrder} 
              className="px-6 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "نعم، احذف نهائياً"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrderActionsDropdown;
