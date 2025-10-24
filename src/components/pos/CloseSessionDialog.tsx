import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { StopCircle, DollarSign, FileText, Loader2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
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

interface CloseSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CloseSessionDialog: React.FC<CloseSessionDialogProps> = ({ open, onOpenChange }) => {
  const { currentStaff } = useStaffSession();
  const { activeSession, closeSession } = useWorkSession();
  const [manualAdjustment, setManualAdjustment] = useState('0');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // حساب المبلغ المتوقع والفعلي مع التعديل اليدوي
  const calculations = useMemo(() => {
    if (!activeSession) return null;

    const expectedCash = activeSession.opening_cash + activeSession.cash_sales;
    const adjustment = parseFloat(manualAdjustment) || 0;
    const actualCash = expectedCash + adjustment;
    const difference = adjustment; // الفرق هو التعديل اليدوي فقط

    return {
      expectedCash,
      actualCash,
      adjustment,
      difference,
      hasDeficit: adjustment < 0,
      hasSurplus: adjustment > 0,
      needsReason: adjustment !== 0 && !adjustmentReason.trim(),
    };
  }, [activeSession, manualAdjustment, adjustmentReason]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!calculations) {
      toast.error('خطأ في حساب المبالغ');
      return;
    }

    // التحقق من وجود سبب إذا كان هناك تعديل
    if (calculations.needsReason) {
      toast.error('الرجاء إدخال سبب التعديل');
      return;
    }

    setIsSubmitting(true);
    try {
      // إضافة سبب التعديل للملاحظات إذا وجد
      const finalNotes = calculations.adjustment !== 0
        ? `تعديل: ${calculations.adjustment > 0 ? '+' : ''}${calculations.adjustment.toFixed(2)} دج - السبب: ${adjustmentReason}\n${notes || ''}`
        : notes || undefined;

      await closeSession(calculations.actualCash, finalNotes);
      toast.success('تم إغلاق الجلسة بنجاح! ✅');
      onOpenChange(false);
      setManualAdjustment('0');
      setAdjustmentReason('');
      setNotes('');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء إغلاق الجلسة');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeSession) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StopCircle className="h-5 w-5 text-orange-600" />
            إغلاق جلسة العمل
          </DialogTitle>
          <DialogDescription>
            أدخل المبلغ النهائي في الصندوق لإغلاق الجلسة
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* معلومات الجلسة */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الموظف:</span>
              <span className="font-medium">{activeSession.staff_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">رأس المال الأولي:</span>
              <span className="font-medium">{activeSession.opening_cash.toFixed(2)} دج</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">المبيعات النقدية:</span>
              <span className="font-medium text-green-600">+{activeSession.cash_sales.toFixed(2)} دج</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">مبيعات البطاقة:</span>
              <span className="font-medium text-blue-600">{activeSession.card_sales.toFixed(2)} دج</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">عدد الطلبات:</span>
              <span className="font-medium">{activeSession.total_orders} طلب</span>
            </div>
          </div>

          {/* المبلغ المحسوب تلقائياً */}
          {calculations && (
            <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المبلغ المتوقع في الصندوق:</span>
                <span className="font-bold text-lg text-green-700 dark:text-green-400">
                  {calculations.expectedCash.toFixed(2)} دج
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                (رأس المال + المبيعات النقدية)
              </p>
            </div>
          )}

          {/* التعديل اليدوي */}
          <div className="space-y-2">
            <Label htmlFor="adjustment">تعديل المبلغ (إضافة أو إنقاص)</Label>
            <div className="relative">
              <DollarSign className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="adjustment"
                type="number"
                step="0.01"
                value={manualAdjustment}
                onChange={(e) => setManualAdjustment(e.target.value)}
                placeholder="0.00"
                className="pr-10"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              أدخل + للزيادة أو - للنقصان (مثال: +50 أو -30)
            </p>
          </div>

          {/* سبب التعديل */}
          {calculations && calculations.adjustment !== 0 && (
            <div className="space-y-2">
              <Label htmlFor="adjustment_reason" className="text-orange-600">
                سبب التعديل *
              </Label>
              <Input
                id="adjustment_reason"
                type="text"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="مثال: مصاريف، خطأ في العد، إلخ..."
                required={calculations.adjustment !== 0}
                className={calculations.needsReason ? 'border-orange-500' : ''}
              />
              {calculations.needsReason && (
                <p className="text-xs text-orange-600">
                  ⚠️ يجب إدخال سبب التعديل
                </p>
              )}
            </div>
          )}

          {/* عرض المبلغ النهائي */}
          {calculations && (
            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المبلغ النهائي في الصندوق:</span>
                <span className="font-bold text-xl text-blue-700 dark:text-blue-400">
                  {calculations.actualCash.toFixed(2)} دج
                </span>
              </div>
              {calculations.adjustment !== 0 && (
                <div className="flex justify-between text-sm pt-2 border-t border-blue-200 dark:border-blue-800">
                  <span className="font-medium">التعديل:</span>
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      calculations.hasDeficit
                        ? 'text-red-600'
                        : calculations.hasSurplus
                        ? 'text-green-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {calculations.hasDeficit ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : calculations.hasSurplus ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : null}
                    {calculations.adjustment >= 0 ? '+' : ''}
                    {calculations.adjustment.toFixed(2)} دج
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ملاحظات */}
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <div className="relative">
              <FileText className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات عند إغلاق الجلسة..."
                className="min-h-[80px] pr-10"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting} variant="destructive">
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الإغلاق...
                </>
              ) : (
                <>
                  <StopCircle className="ml-2 h-4 w-4" />
                  إغلاق الجلسة
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CloseSessionDialog;
