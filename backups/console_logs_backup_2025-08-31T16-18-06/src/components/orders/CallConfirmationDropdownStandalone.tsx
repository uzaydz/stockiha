import React, { useState, useMemo } from "react";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  ChevronDown,
  Loader2,
  Phone,
  PhoneMissed,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { CallConfirmationStatus } from "./table/OrderTableTypes";

// نوع خصائص مكون القائمة المنسدلة
type CallConfirmationDropdownStandaloneProps = {
  currentStatusId?: number | null;
  currentNotes?: string | null;
  orderId: string;
  onUpdate: (orderId: string, statusId: number, notes?: string, userId?: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
  currentUserId?: string;
  // بيانات الحالات المُمررة مباشرة
  statuses?: CallConfirmationStatus[];
};

// حالات افتراضية إذا لم تُمرر
const defaultStatuses: CallConfirmationStatus[] = [
  {
    id: 1,
    name: "لم يتم الاتصال",
    color: "#6B7280",
    icon: "Clock",
    is_default: true
  },
  {
    id: 2,
    name: "تم الاتصال - مؤكد",
    color: "#10B981",
    icon: "CheckCircle2",
    is_default: false
  },
  {
    id: 3,
    name: "تم الاتصال - ملغي",
    color: "#EF4444",
    icon: "XCircle",
    is_default: false
  },
  {
    id: 4,
    name: "لا يرد",
    color: "#F59E0B",
    icon: "PhoneMissed",
    is_default: false
  }
];

const CallConfirmationDropdownStandalone = ({
  currentStatusId,
  currentNotes,
  orderId,
  onUpdate,
  disabled = false,
  className = "",
  currentUserId,
  statuses = defaultStatuses,
}: CallConfirmationDropdownStandaloneProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  
  const { toast } = useToast();

  // إيجاد الحالة الحالية
  const currentStatus = useMemo(() => 
    statuses.find(s => s.id === currentStatusId) || null,
    [statuses, currentStatusId]
  );

  // دالة الحصول على الأيقونة
  const getStatusIcon = (iconName: string | null, size = 4) => {
    const iconProps = { className: `h-${size} w-${size}` };
    
    switch (iconName) {
      case "Phone": return <Phone {...iconProps} />;
      case "PhoneMissed": return <PhoneMissed {...iconProps} />;
      case "Clock": return <Clock {...iconProps} />;
      case "CheckCircle2": return <CheckCircle2 {...iconProps} />;
      case "XCircle": return <XCircle {...iconProps} />;
      default: return <Phone {...iconProps} />;
    }
  };

  // معالجة تحديث الحالة
  const handleStatusUpdate = async (statusId: number, requiresNotes = false) => {
    if (requiresNotes) {
      setSelectedStatusId(statusId);
      setNotes(currentNotes || "");
      setShowNotesDialog(true);
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate(orderId, statusId, undefined, currentUserId);
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث حالة تأكيد الاتصال",
      });
    } catch (error) {
      toast({
        title: "فشل التحديث",
        description: "حدث خطأ أثناء تحديث حالة تأكيد الاتصال",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // معالجة حفظ الملاحظات
  const handleSaveNotes = async () => {
    if (selectedStatusId === null) return;

    setIsUpdating(true);
    try {
      await onUpdate(orderId, selectedStatusId, notes, currentUserId);
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث حالة تأكيد الاتصال والملاحظات",
      });
      setShowNotesDialog(false);
      setSelectedStatusId(null);
      setNotes("");
    } catch (error) {
      toast({
        title: "فشل التحديث",
        description: "حدث خطأ أثناء تحديث حالة تأكيد الاتصال",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (statuses.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Clock className="h-4 w-4 mr-2" />
        لا توجد حالات
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isUpdating}
            className={cn(
              "min-w-[140px] justify-between transition-all duration-200",
              currentStatus?.color && `border-[${currentStatus.color}] text-[${currentStatus.color}]`,
              className
            )}
          >
            <span className="flex items-center gap-2 truncate">
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                currentStatus ? getStatusIcon(currentStatus.icon) : <Clock className="h-4 w-4" />
              )}
              <span className="truncate">
                {currentStatus?.name || "لم يتم تحديد الحالة"}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56" style={{ willChange: 'transform', contain: 'layout paint', contentVisibility: 'auto' as any }}>
          {statuses.map((status) => (
            <DropdownMenuItem
              key={status.id}
              onClick={() => handleStatusUpdate(status.id)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-1">
                {getStatusIcon(status.icon)}
                <span style={{ color: status.color }} className="font-medium">
                  {status.name}
                </span>
              </div>
              {currentStatusId === status.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          
          {currentStatusId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleStatusUpdate(currentStatusId, true)}
                className="flex items-center gap-3 cursor-pointer text-muted-foreground"
              >
                <span>إضافة ملاحظات</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* حوار الملاحظات */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة ملاحظات لتأكيد الاتصال</DialogTitle>
            <DialogDescription>
              أضف أي ملاحظات إضافية حول حالة تأكيد الاتصال لهذا الطلب.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب ملاحظاتك هنا..."
              rows={4}
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNotesDialog(false)}
              disabled={isUpdating}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSaveNotes}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CallConfirmationDropdownStandalone;
