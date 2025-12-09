import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { PlayCircle, DollarSign, FileText, Loader2, AlertCircle, User, Clock, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useWorkSession } from '@/context/WorkSessionContext';

interface StartSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** السماح بالإغلاق بدون بدء جلسة (للمدير فقط) */
  allowClose?: boolean;
}

const StartSessionDialog: React.FC<StartSessionDialogProps> = ({ open, onOpenChange, allowClose = false }) => {
  const { currentStaff, isAdminMode } = useStaffSession();
  const { startSession, isLoading: isSessionLoading } = useWorkSession();
  const [openingCash, setOpeningCash] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false); // منع الضغط المزدوج

  // التاريخ والوقت الحالي
  const currentDateTime = new Date();
  const formattedDate = currentDateTime.toLocaleDateString('ar-DZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = currentDateTime.toLocaleTimeString('ar-DZ', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // التحقق من وجود موظف
  const hasStaff = !!currentStaff?.id;
  const canStartSession = hasStaff || isAdminMode;

  // معالجة إرسال النموذج مع منع التكرار
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // منع الضغط المزدوج
    if (isSubmittingRef.current || isSubmitting) {
      console.log('[StartSession] ⚠️ منع الضغط المزدوج');
      return;
    }

    // التحقق من وجود موظف
    if (!canStartSession) {
      toast.error('يجب تسجيل دخول موظف أولاً');
      return;
    }

    if (!openingCash || parseFloat(openingCash) < 0) {
      toast.error('الرجاء إدخال رأس المال الأولي');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      console.log('[StartSession] 🚀 بدء جلسة جديدة...');
      await startSession(parseFloat(openingCash), notes || undefined);
      toast.success('تم بدء الجلسة بنجاح! 🎉');
      onOpenChange(false);
      setOpeningCash('');
      setNotes('');
    } catch (error: any) {
      console.error('[StartSession] ❌ خطأ:', error);
      toast.error(error.message || 'حدث خطأ أثناء بدء الجلسة');
    } finally {
      setIsSubmitting(false);
      // إعادة تفعيل الزر بعد فترة قصيرة
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 1000);
    }
  };

  // معالجة إغلاق النافذة
  const handleOpenChange = (newOpen: boolean) => {
    // السماح بالإغلاق فقط للمدير أو إذا كان allowClose = true
    if (!newOpen && (allowClose || isAdminMode)) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-green-600" />
            بدء جلسة عمل جديدة
          </DialogTitle>
          <DialogDescription>
            أدخل رأس المال الأولي الذي تبدأ به الجلسة
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* معلومات التاريخ والوقت */}
          <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-muted-foreground">التاريخ:</span>
              <span className="font-medium">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-muted-foreground">الوقت:</span>
              <span className="font-medium">{formattedTime}</span>
            </div>
          </div>

          {/* اسم الموظف */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              الموظف
            </Label>
            {hasStaff ? (
              <div className="rounded-md border bg-green-50 dark:bg-green-950/30 px-3 py-2 text-sm flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                  {currentStaff?.staff_name?.charAt(0) || '؟'}
                </div>
                <div>
                  <div className="font-medium">{currentStaff?.staff_name}</div>
                  <div className="text-xs text-muted-foreground">موظف نقطة البيع</div>
                </div>
              </div>
            ) : isAdminMode ? (
              <div className="rounded-md border bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold">
                  م
                </div>
                <div>
                  <div className="font-medium">المدير</div>
                  <div className="text-xs text-muted-foreground">وضع المدير</div>
                </div>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  لم يتم تسجيل دخول موظف. يرجى تسجيل الدخول أولاً.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* رأس المال الأولي */}
          <div className="space-y-2">
            <Label htmlFor="opening_cash">رأس المال الأولي (دج) *</Label>
            <div className="relative">
              <DollarSign className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="opening_cash"
                type="number"
                step="0.01"
                min="0"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="0.00"
                className="pr-10 text-lg font-semibold"
                required
                autoFocus
                disabled={!canStartSession}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              المبلغ الموجود في الصندوق عند بدء الجلسة
            </p>
          </div>

          {/* ملاحظات */}
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <div className="relative">
              <FileText className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات عند بدء الجلسة..."
                className="min-h-[80px] pr-10"
                rows={3}
                disabled={!canStartSession}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {(allowClose || isAdminMode) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || !canStartSession}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري البدء...
                </>
              ) : (
                <>
                  <PlayCircle className="ml-2 h-4 w-4" />
                  بدء الجلسة
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StartSessionDialog;
