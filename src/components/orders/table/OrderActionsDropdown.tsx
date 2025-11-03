import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  Trash2,
  Ban as BanIcon
} from "lucide-react";
import { OrderActionsDropdownProps, Order } from "./OrderTableTypes";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  
  const ordersService = new OrdersService();


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
        description: error instanceof Error ? error.message : (typeof error === 'string' ? error : "حدث خطأ غير متوقع أثناء حذف الطلب"),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getCustomerPhone = (): string | null => {
    try {
      const formPhone = (order as any)?.form_data?.phone || (order as any)?.form_data?.customer_phone;
      const customerPhone = (order as any)?.customer?.phone;
      const shippingPhone = (order as any)?.shipping_address?.phone;
      return customerPhone || formPhone || shippingPhone || null;
    } catch { return null; }
  };

  const getCustomerName = (): string | null => {
    try {
      return (order as any)?.customer?.name || (order as any)?.form_data?.fullName || (order as any)?.form_data?.customer_name || null;
    } catch { return null; }
  };

  const handleBlockCustomer = async () => {
    const phone = getCustomerPhone();
    const name = getCustomerName();
    if (!currentOrganization || !phone) {
      toast({ title: "لا يمكن الحظر", description: "لا يوجد رقم هاتف صالح", variant: "destructive" });
      return;
    }
    setBlocking(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase misconfigured');
      // استخدم RPC عبر fetch مباشرةً غير ضروري هنا، سنستخدم client داخل الخدمة لاحقاً إن لزم
      const { blockCustomer } = await import('@/lib/api/blocked-customers');
      await blockCustomer(currentOrganization.id, phone, name || undefined, blockReason || undefined);
      toast({ title: "تم الحظر", description: `تم حظر ${name || phone}` });
      setShowBlockConfirm(false);
    } catch (e: any) {
      toast({ title: "فشل الحظر", description: e?.message || 'تعذر تنفيذ الحظر', variant: 'destructive' });
    } finally {
      setBlocking(false);
      setBlockReason('');
    }
  };


  return (
    <>
      {/* زر مخفي لفتح الحوارات من قائمة الإجراءات */}
      <div className="hidden">
        <Button
          data-delete-trigger
          onClick={() => setShowDeleteConfirm(true)}
          className="hidden"
        >
          حذف
        </Button>
        <Button
          data-block-trigger
          onClick={() => setShowBlockConfirm(true)}
          className="hidden"
        >
          حظر
        </Button>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent dir="rtl" className="max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Trash2 className="text-red-600 h-5 w-5" />
              حذف الطلب نهائياً
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground pt-2">
              <div className="space-y-2">
                <p className="text-red-600 font-semibold text-sm">⚠️ تحذير: لا يمكن التراجع عن هذا الإجراء!</p>
                <p>سيتم حذف الطلب نهائياً وإعادة المخزون للمنتجات.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 pt-4">
            <AlertDialogCancel className="px-4 py-2 text-sm rounded-lg">
              تراجع
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف نهائياً"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent dir="rtl" className="max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold flex items-center gap-2">
              <BanIcon className="h-5 w-5 text-red-600" />
              حظر العميل
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground pt-2">
              سيتم منع هذا العميل من إنشاء طلبات جديدة باستخدام نفس رقم الهاتف.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <label className="text-sm font-medium">سبب الحظر (اختياري)</label>
            <input
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="أدخل سبب الحظر..."
            />
          </div>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel disabled={blocking} className="px-4 py-2 text-sm rounded-lg">
              تراجع
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockCustomer}
              disabled={blocking}
              className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 gap-2"
            >
              {blocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <BanIcon className="h-4 w-4" />}
              تأكيد الحظر
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrderActionsDropdown;
