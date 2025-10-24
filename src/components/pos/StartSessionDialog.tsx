import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PlayCircle, DollarSign, FileText, Loader2, AlertCircle, LogIn } from 'lucide-react';
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
}

const StartSessionDialog: React.FC<StartSessionDialogProps> = ({ open, onOpenChange }) => {
  const { currentStaff } = useStaffSession();
  const { startSession } = useWorkSession();
  const [openingCash, setOpeningCash] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!openingCash || parseFloat(openingCash) < 0) {
      toast.error('الرجاء إدخال رأس المال الأولي');
      return;
    }

    setIsSubmitting(true);
    try {
      await startSession(parseFloat(openingCash), notes || undefined);
      toast.success('تم بدء الجلسة بنجاح! 🎉');
      onOpenChange(false);
      setOpeningCash('');
      setNotes('');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء بدء الجلسة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          {/* اسم الموظف */}
          <div className="space-y-2">
            <Label>الموظف</Label>
            <div className="rounded-md border bg-muted px-3 py-2 text-sm">
              {currentStaff?.staff_name || 'غير محدد'}
            </div>
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
                className="pr-10"
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              المبلغ الذي سلمه المدير لك لبدء اليوم
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
            <Button type="submit" disabled={isSubmitting}>
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
