import { useState, useEffect } from "react";
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
 } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  ChevronDown,
  Loader2,
  Phone,
  PhoneMissed,
  Clock,
  Plus,
  CheckCircle2,
  Trash2,
  Settings,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrdersData } from "@/context/OrdersDataContext";
import type { CallConfirmationStatus } from "@/components/orders/table/OrderTableTypes";

// نوع خصائص مكون القائمة المنسدلة
type CallConfirmationDropdownProps = {
  currentStatusId: number | null;
  orderId: string;
  onUpdateStatus: (orderId: string, statusId: number, notes?: string) => Promise<void>;
  disabled?: boolean;
  showAddNew?: boolean;
  className?: string;
  userId?: string;
  statuses?: CallConfirmationStatus[]; // اختياري: يمكن تمريره بدلاً من استخدام context
  onAddCallConfirmationStatus?: (name: string, color: string, icon?: string) => Promise<number>;
  onDeleteCallConfirmationStatus?: (id: number) => Promise<void>;
};

const CallConfirmationDropdown = ({
  currentStatusId,
  orderId,
  onUpdateStatus,
  disabled = false,
  showAddNew = true,
  className = "",
  statuses: statusesProp,
  onAddCallConfirmationStatus,
  onDeleteCallConfirmationStatus,
}: CallConfirmationDropdownProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [statusToDelete, setStatusToDelete] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // حالة جديدة
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#6366F1");
  
  const { toast } = useToast();

  // الحصول على حالات تأكيد الإتصال من Props أو Context (استخدام Props له الأولوية)
  let statuses: CallConfirmationStatus[];
  let loading: boolean;
  let addCallConfirmationStatus: ((name: string, color: string, icon?: string) => Promise<any>) | undefined;
  let deleteCallConfirmationStatus: ((id: number) => Promise<void>) | undefined;

  if (statusesProp) {
    // استخدام البيانات الممررة كprops
    statuses = statusesProp;
    loading = false;
    addCallConfirmationStatus = onAddCallConfirmationStatus; // يمكن توفيرها من props
    deleteCallConfirmationStatus = onDeleteCallConfirmationStatus;
  } else {
    // استخدام Context (fallback)
    try {
      const ordersContext = useOrdersData();
      statuses = ordersContext.data?.callConfirmationStatuses || [];
      loading = ordersContext.loading;
      addCallConfirmationStatus = ordersContext.addCallConfirmationStatus;
      deleteCallConfirmationStatus = ordersContext.deleteCallConfirmationStatus;
    } catch (e) {
      // Context غير متاح، استخدام قيم افتراضية
      statuses = [];
      loading = false;
      addCallConfirmationStatus = undefined;
      deleteCallConfirmationStatus = undefined;
    }
  }

  // تسجيل معلومات التشخيص
  useEffect(() => {
    if (statuses.length === 0 && !loading) {
      console.debug('CallConfirmationDropdown: لا توجد حالات متاحة', {
        orderId,
        currentStatusId,
        disabled,
        loading,
        statusesProp: !!statusesProp,
        addCallConfirmationStatus: !!addCallConfirmationStatus
      });
    }
  }, [orderId, currentStatusId, statuses.length, disabled, loading, statusesProp, addCallConfirmationStatus]);

  // الحصول على الأيقونة المناسبة لكل حالة
  const getIconForStatus = (iconName: string | null) => {
    switch (iconName) {
      case "check-circle":
        return CheckCircle2;
      case "phone":
        return Phone;
      case "phone-missed":
        return PhoneMissed;
      case "clock":
        return Clock;
      default:
        return Check;
    }
  };

  // الحصول على معلومات الحالة الحالية
  const currentStatus = statuses.find(s => s.id === currentStatusId) || null;
  
  // معالجة تغيير الحالة
  const handleStatusChange = async (statusId: number) => {
    setError(null);
    setSelectedStatusId(statusId);
    setShowNotesDialog(true);
  };
  
  // تأكيد تغيير الحالة مع الملاحظات
  const confirmStatusChange = async () => {
    if (!selectedStatusId) {
      setError('لم يتم اختيار حالة');
      return;
    }
    
    setIsUpdating(true);
    setError(null);
    
    try {
      
      await onUpdateStatus(orderId, selectedStatusId, notes);
      setShowNotesDialog(false);
      setNotes("");
      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة تأكيد الإتصال للطلب بنجاح",
      });
    } catch (error: any) {
      setError(error?.message || 'حدث خطأ أثناء تحديث الحالة');
      toast({
        variant: "destructive",
        title: "خطأ",
        description: error?.message || "فشل تحديث حالة تأكيد الإتصال، يرجى المحاولة مرة أخرى",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // إضافة حالة جديدة
  const handleAddNewStatus = async () => {
    if (!newStatusName.trim()) return;

    // التحقق من توفر الوظيفة
    if (!addCallConfirmationStatus) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "وظيفة إضافة حالة جديدة غير متوفرة",
      });
      return;
    }

    try {
      setIsUpdating(true);

      // استدعاء وظيفة إضافة حالة جديدة من Context
      const newStatusId = await addCallConfirmationStatus(
        newStatusName.trim(),
        newStatusColor
      );

      setNewStatusName("");
      setShowAddDialog(false);

      toast({
        title: "تمت الإضافة",
        description: "تمت إضافة حالة تأكيد الإتصال بنجاح",
      });

      // تعيين الحالة الجديدة للطلب
      await handleStatusChange(newStatusId);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل إضافة حالة تأكيد إتصال جديدة، يرجى المحاولة مرة أخرى",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // حذف حالة تأكيد اتصال
  const handleDeleteStatus = async (statusId: number) => {
    if (!deleteCallConfirmationStatus) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "وظيفة حذف الحالة غير متوفرة",
      });
      return;
    }

    try {
      setIsUpdating(true);
      await deleteCallConfirmationStatus(statusId);
      setStatusToDelete(null);
    } catch (error) {
      // الخطأ يتم معالجته في Context
    } finally {
      setIsUpdating(false);
    }
  };

  // عرض حالة التحميل
  if (loading) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="h-8 px-2 py-0.5 border hover:opacity-90 transition-all rounded-md"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" />
        <span className="text-xs font-medium">جاري التحميل...</span>
      </Button>
    );
  }

  // تحديد لون وأيقونة الحالة الحالية
  const currentColor = currentStatus ? currentStatus.color : "#6366F1";
  const CurrentIcon = currentStatus ? getIconForStatus(currentStatus.icon) : Phone;

  return (
    <>
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isUpdating}
            className={`h-8 px-2 py-0.5 border hover:opacity-90 transition-all rounded-md ${className}`}
            style={{ backgroundColor: currentStatus ? `${currentColor}20` : undefined, borderColor: currentStatus ? currentColor : undefined, color: currentStatus ? currentColor : undefined }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {isUpdating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" />
            ) : (
              <CurrentIcon className="h-3.5 w-3.5 ml-1.5" />
            )}
            <span className="text-xs font-medium">
              {currentStatus ? currentStatus.name : "تأكيد الإتصال"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 mr-0.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          alignOffset={0}
          className="min-w-[180px] p-1 rounded-lg border shadow-lg z-50"
          style={{ willChange: 'transform', contain: 'layout paint', contentVisibility: 'auto' as any }}
          sideOffset={5}
        >
          {statuses.length > 0 ? (
            statuses.map((status) => {
              const StatusIcon = getIconForStatus(status.icon);
              return (
                <DropdownMenuItem
                  key={status.id}
                  onClick={() => handleStatusChange(status.id)}
                  disabled={isUpdating || currentStatusId === status.id}
                  className="cursor-pointer my-0.5 flex items-center gap-1.5 p-1.5 rounded-md text-xs font-medium"
                  style={{ color: status.color }}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  <span>{status.name}</span>
                </DropdownMenuItem>
              );
            })
          ) : (
            <DropdownMenuItem disabled className="cursor-default my-0.5 flex items-center gap-1.5 p-1.5 rounded-md text-xs text-muted-foreground">
              لا توجد حالات متاحة
            </DropdownMenuItem>
          )}

          {showAddNew && (addCallConfirmationStatus || deleteCallConfirmationStatus) && (
            <>
              <DropdownMenuSeparator />
              {addCallConfirmationStatus && (
                <DropdownMenuItem
                  onClick={() => setShowAddDialog(true)}
                  className="cursor-pointer my-0.5 flex items-center gap-1.5 p-1.5 rounded-md text-xs font-medium text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>إضافة حالة جديدة</span>
                </DropdownMenuItem>
              )}
              {deleteCallConfirmationStatus && statuses.length > 0 && (
                <DropdownMenuItem
                  onClick={() => setShowManageDialog(true)}
                  className="cursor-pointer my-0.5 flex items-center gap-1.5 p-1.5 rounded-md text-xs font-medium text-orange-600"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>إدارة الحالات</span>
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* حوار إضافة حالة جديدة */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>إضافة حالة تأكيد اتصال جديدة</DialogTitle>
            <DialogDescription>
              أدخل اسم الحالة الجديدة واختر اللون المناسب لها.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status-name">اسم الحالة</Label>
              <Input
                id="status-name"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                placeholder="مثال: الرد في وقت لاحق"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status-color">لون الحالة</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="status-color"
                  type="color"
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  className="w-16 h-8 p-1"
                />
                <div 
                  className="h-8 flex-1 rounded-md border"
                  style={{ backgroundColor: `${newStatusColor}20`, borderColor: newStatusColor, color: newStatusColor }}
                >
                  <div className="flex items-center justify-center h-full text-xs font-medium">
                    {newStatusName || "معاينة الحالة"}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowAddDialog(false)}
            >
              إلغاء
            </Button>
            <Button 
              type="submit" 
              onClick={handleAddNewStatus}
              disabled={!newStatusName.trim() || isUpdating}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin ml-1.5" /> : null}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار إضافة ملاحظات */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>إضافة ملاحظات الإتصال</DialogTitle>
            <DialogDescription>
              يمكنك إضافة ملاحظات حول الإتصال بالعميل.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="call-notes">ملاحظات الإتصال</Label>
              <Textarea
                id="call-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أدخل ملاحظاتك حول الإتصال بالعميل..."
                rows={4}
              />
            </div>
            
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-2 rounded-md">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowNotesDialog(false)}
            >
              إلغاء
            </Button>
            <Button 
              type="submit" 
              onClick={confirmStatusChange}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin ml-1.5" /> : null}
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار إدارة الحالات */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>إدارة حالات تأكيد الاتصال</DialogTitle>
            <DialogDescription>
              يمكنك حذف الحالات التي لا تحتاجها. لا يمكن حذف الحالات الافتراضية أو المستخدمة في طلبات.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4 max-h-[400px] overflow-y-auto">
            {statuses.map((status) => {
              const StatusIcon = getIconForStatus(status.icon);
              return (
                <div
                  key={status.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <StatusIcon className="h-4 w-4" style={{ color: status.color }} />
                    <span className="font-medium text-sm" style={{ color: status.color }}>
                      {status.name}
                    </span>
                    {status.is_default && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        افتراضي
                      </span>
                    )}
                  </div>
                  {!status.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStatusToDelete(status.id)}
                      disabled={isUpdating}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setShowManageDialog(false)}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد الحذف */}
      <Dialog open={statusToDelete !== null} onOpenChange={(open) => !open && setStatusToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              تأكيد الحذف
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>هل أنت متأكد من حذف حالة "{statuses.find(s => s.id === statusToDelete)?.name}"؟</p>
              <p className="text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>لن يمكن حذف هذه الحالة إذا كانت مستخدمة في أي طلب. لن يمكنك التراجع عن هذا الإجراء.</span>
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusToDelete(null)}
              disabled={isUpdating}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="destructive"
              onClick={() => statusToDelete && handleDeleteStatus(statusToDelete)}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin ml-1.5" /> : null}
              حذف نهائياً
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CallConfirmationDropdown;
