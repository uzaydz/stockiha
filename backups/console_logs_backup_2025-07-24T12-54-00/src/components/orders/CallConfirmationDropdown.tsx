import React, { useState, useEffect } from "react";
import {
  DropdownMenu,
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
  DialogTrigger,
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
  Calendar,
  User2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrdersData } from "@/context/OrdersDataContext";
import type { CallConfirmationStatus } from "@/context/OrdersDataContext";

// نوع خصائص مكون القائمة المنسدلة
type CallConfirmationDropdownProps = {
  currentStatusId: number | null;
  orderId: string;
  onUpdateStatus: (orderId: string, statusId: number, notes?: string) => Promise<void>;
  disabled?: boolean;
  showAddNew?: boolean;
  className?: string;
  userId?: string;
};

const CallConfirmationDropdown = ({
  currentStatusId,
  orderId,
  onUpdateStatus,
  disabled = false,
  showAddNew = true,
  className = "",
  userId,
}: CallConfirmationDropdownProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // حالة جديدة
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#6366F1");
  
  const { data, loading, addCallConfirmationStatus } = useOrdersData();
  const { toast } = useToast();

  // الحصول على حالات تأكيد الإتصال من Context
  const statuses = data.callConfirmationStatuses;

  // تسجيل معلومات التشخيص
  useEffect(() => {
    if (statuses.length === 0 && !loading) {
    }
    
  }, [orderId, currentStatusId, statuses, disabled, loading]);

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
            disabled={disabled || isUpdating || statuses.length === 0}
            className={`h-8 px-2 py-0.5 border hover:opacity-90 transition-all rounded-md ${className}`}
            style={{ backgroundColor: currentStatus ? `${currentColor}20` : undefined, borderColor: currentStatus ? currentColor : undefined, color: currentStatus ? currentColor : undefined }}
            onClick={() => {
              // تسجيل عند النقر على القائمة المنسدلة
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
          className="min-w-[180px] p-1 rounded-lg border shadow-lg"
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

          {showAddNew && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowAddDialog(true)}
                className="cursor-pointer my-0.5 flex items-center gap-1.5 p-1.5 rounded-md text-xs font-medium text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>إضافة حالة جديدة</span>
              </DropdownMenuItem>
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
    </>
  );
};

export default CallConfirmationDropdown;
