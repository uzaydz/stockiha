import { useState } from "react";
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
  Download,
  Loader2,
  PackageCheck,
  Printer,
  RefreshCw,
  Trash2,
  X,
  Package,
  Clock,
  CheckCircle,
  Truck,
  CheckCircle2,
  XCircle,
  Phone,
  ChevronDown,
} from "lucide-react";
import { OrderBulkActionsProps } from "./OrderTableTypes";
import { useOptimizedClickHandler } from "@/lib/performance-utils";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateOrdersStatus = async (status: string) => {
    if (!onUpdateStatus) return;

    setIsUpdating(true);
    try {
      await onUpdateStatus(selectedOrders, status);
      onReset();
    } catch (error) {
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

  const handleBulkStatusUpdate = (status: string) => {
    handleStatusUpdate(status);
  };

  const handleBulkCallConfirmationUpdate = (confirmed: boolean) => {
    // Implement call confirmation update logic here
  };

  const handleExportSelected = () => {
    // Implement export logic here
  };

  const handleDeleteSelected = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    // Implement the delete logic here
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground bg-primary/10 px-2 py-1 rounded border border-primary/20">
          {selectedOrders.length} طلب محدد
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-background border-border text-foreground hover:bg-accent"
            >
              <Package className="h-4 w-4 ml-1" />
              تحديث الحالة
              <ChevronDown className="h-4 w-4 mr-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-background border-border">
            <DropdownMenuItem 
              onClick={() => handleBulkStatusUpdate('pending')}
              className="text-foreground hover:bg-accent"
            >
              <Clock className="h-4 w-4 ml-2 text-amber-500" />
              قيد الانتظار
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleBulkStatusUpdate('confirmed')}
              className="text-foreground hover:bg-accent"
            >
              <CheckCircle className="h-4 w-4 ml-2 text-blue-500" />
              مؤكد
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleBulkStatusUpdate('shipped')}
              className="text-foreground hover:bg-accent"
            >
              <Truck className="h-4 w-4 ml-2 text-purple-500" />
              تم الشحن
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleBulkStatusUpdate('delivered')}
              className="text-foreground hover:bg-accent"
            >
              <CheckCircle2 className="h-4 w-4 ml-2 text-green-500" />
              تم التسليم
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleBulkStatusUpdate('cancelled')}
              className="text-foreground hover:bg-accent"
            >
              <XCircle className="h-4 w-4 ml-2 text-red-500" />
              ملغي
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-background border-border text-foreground hover:bg-accent"
            >
              <Phone className="h-4 w-4 ml-1" />
              تأكيد الاتصال
              <ChevronDown className="h-4 w-4 mr-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-background border-border">
            <DropdownMenuItem 
              onClick={() => handleBulkCallConfirmationUpdate(true)}
              className="text-foreground hover:bg-accent"
            >
              <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
              تم التأكيد
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleBulkCallConfirmationUpdate(false)}
              className="text-foreground hover:bg-accent"
            >
              <XCircle className="h-4 w-4 ml-2 text-red-500" />
              لم يتم التأكيد
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExportSelected}
          className="bg-background border-border text-foreground hover:bg-accent"
        >
          <Download className="h-4 w-4 ml-1" />
          تصدير المحدد
        </Button>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDeleteSelected}
          className="bg-background border-border text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 ml-1" />
          حذف المحدد
        </Button>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              هل أنت متأكد من أنك تريد حذف {selectedOrders.length} طلب؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background border-border text-foreground hover:bg-accent">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrderBulkActions;
