import { useState } from "react";
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
  Download,
  Loader2,
  PackageCheck,
  Printer,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { OrderBulkActionsProps } from "./OrderTableTypes";

const OrderBulkActions = ({
  selectedOrders,
  onUpdateStatus,
  onReset,
  hasUpdatePermission,
  hasCancelPermission,
}: OrderBulkActionsProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState<{
    status: string;
    title: string;
    description: string;
  } | null>(null);

  const updateOrdersStatus = async (status: string) => {
    if (!onUpdateStatus) return;

    setIsUpdating(true);
    try {
      await onUpdateStatus(selectedOrders, status);
      onReset();
    } catch (error) {
      console.error("فشل تحديث حالة الطلبات:", error);
    } finally {
      setIsUpdating(false);
      setShowConfirmDialog(false);
    }
  };

  const handleStatusUpdate = (status: string) => {
    // لا حاجة لتأكيد على بعض الحالات
    if (status === "processing" || status === "shipped") {
      updateOrdersStatus(status);
      return;
    }

    // تأكيد للحالات المهمة
    const confirmationDetails = {
      delivered: {
        title: "تأكيد تسليم الطلبات",
        description: "هل أنت متأكد من تغيير حالة الطلبات المحددة إلى 'تم التسليم'؟",
      },
      cancelled: {
        title: "تأكيد إلغاء الطلبات",
        description: "هل أنت متأكد من إلغاء الطلبات المحددة؟ لا يمكن التراجع عن هذا الإجراء.",
      },
    };

    const details = confirmationDetails[status as keyof typeof confirmationDetails];
    if (details) {
      setActionToConfirm({
        status,
        title: details.title,
        description: details.description,
      });
      setShowConfirmDialog(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {selectedOrders.length} طلب محدد
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-8 px-2"
        >
          <X className="h-4 w-4 ml-1" />
          <span>إلغاء</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              {isUpdating ? (
                <Loader2 className="h-4 w-4 ml-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 ml-1" />
              )}
              <span>تحديث الحالة</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>تحديث حالة الطلبات</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hasUpdatePermission && (
              <>
                <DropdownMenuItem
                  onClick={() => handleStatusUpdate("processing")}
                  disabled={isUpdating}
                >
                  <PackageCheck className="h-4 w-4 ml-2 text-amber-500" />
                  <span>قيد المعالجة</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusUpdate("shipped")}
                  disabled={isUpdating}
                >
                  <PackageCheck className="h-4 w-4 ml-2 text-blue-500" />
                  <span>تم الشحن</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusUpdate("delivered")}
                  disabled={isUpdating}
                >
                  <PackageCheck className="h-4 w-4 ml-2 text-green-500" />
                  <span>تم التسليم</span>
                </DropdownMenuItem>
              </>
            )}
            {hasCancelPermission && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleStatusUpdate("cancelled")}
                  disabled={isUpdating}
                  className="text-red-500 focus:text-red-500"
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  <span>إلغاء الطلبات</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" className="h-8">
          <Printer className="h-4 w-4 ml-1" />
          <span>طباعة</span>
        </Button>

        <Button variant="outline" size="sm" className="h-8">
          <Download className="h-4 w-4 ml-1" />
          <span>تصدير</span>
        </Button>
      </div>

      {/* مربع حوار تأكيد العملية */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionToConfirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {actionToConfirm?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionToConfirm && updateOrdersStatus(actionToConfirm.status)}
              className={actionToConfirm?.status === "cancelled" ? "bg-red-500 hover:bg-red-600" : ""}
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrderBulkActions; 