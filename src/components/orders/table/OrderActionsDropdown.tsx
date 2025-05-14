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
import { OrderActionsDropdownProps } from "./OrderTableTypes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const OrderActionsDropdown = ({
  order,
  onUpdateStatus,
  hasUpdatePermission,
  hasCancelPermission,
}: OrderActionsDropdownProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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

  // إعداد الإجراءات حسب حالة الطلب الحالية
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
      className: "text-indigo-600 hover:bg-indigo-50",
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

  // إضافة إجراءات عامة متاحة دائماً
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
      action: handlePrintInvoice, // نفس الإجراء مؤقتاً
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

  // إضافة خيار الإلغاء إذا كان الطلب ليس ملغياً أو مكتملاً
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
                  disabled={isUpdating}
                  className={`${action.className} rounded-md my-1 focus:bg-slate-100 gap-2 px-2 py-1.5`}
                >
                  <action.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{action.label}</span>
                </DropdownMenuItem>
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>

      {/* تأكيد إلغاء الطلب */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent dir="rtl" className="max-w-md bg-white p-6 rounded-xl shadow-2xl border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
              <XCircle className="text-rose-500 h-6 w-6" />
              تأكيد إلغاء الطلب
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base mt-2 text-center">
              هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟
              <br />
              <span className="text-rose-500 font-medium">لا يمكن التراجع عن هذا الإجراء.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 flex-row-reverse mt-6 justify-center">
            <AlertDialogCancel className="mt-0 border-rose-100 text-rose-600 hover:bg-rose-50">إلغاء العملية</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <AlertCircle className="h-4 w-4 ml-2" />
              )}
              <span>تأكيد إلغاء الطلب</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrderActionsDropdown; 