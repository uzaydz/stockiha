import { useMemo, useState } from 'react';
import { useConfirmation } from '@/context/ConfirmationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { toast } from 'sonner';
import { Loader2, Wallet, Coins, Receipt, Award } from 'lucide-react';
import type { ConfirmationAgentPayment, ConfirmationPaymentStatus, ConfirmationPaymentType } from '@/types/confirmation';

const statusMeta: Record<ConfirmationPaymentStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'قيد المراجعة', variant: 'outline' },
  approved: { label: 'موافق عليه', variant: 'secondary' },
  paid: { label: 'تم الدفع', variant: 'default' },
  cancelled: { label: 'ملغى', variant: 'destructive' },
};

const paymentTypeLabels: Record<ConfirmationPaymentType, string> = {
  salary: 'راتب شهري',
  per_order: 'لكل طلب مؤكد',
  bonus: 'مكافأة',
  adjustment: 'تعديل',
};

interface PaymentDraft {
  agent_id: string;
  payment_type: ConfirmationPaymentType;
  status: ConfirmationPaymentStatus;
  period_start: string;
  period_end: string;
  amount: number;
  notes?: string;
}

const initialDraft: PaymentDraft = {
  agent_id: '',
  payment_type: 'salary',
  status: 'pending',
  period_start: new Date().toISOString().slice(0, 10),
  period_end: new Date().toISOString().slice(0, 10),
  amount: 0,
  notes: '',
};

export const ConfirmationCompensationManager = () => {
  const { payments, agents, recordPayment, missingSchema } = useConfirmation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draft, setDraft] = useState<PaymentDraft>(initialDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totals = useMemo(() => {
    const pending = payments.filter((payment) => payment.status === 'pending').length;
    const approved = payments.filter((payment) => payment.status === 'approved').length;
    const paid = payments.filter((payment) => payment.status === 'paid').length;
    const totalAmount = payments.reduce((acc, payment) => acc + (payment.amount || 0), 0);
    return { pending, approved, paid, totalAmount };
  }, [payments]);

  const openDialog = () => {
    setDraft(initialDraft);
    setIsDialogOpen(true);
  };

  const handleSavePayment = async () => {
    if (!draft.agent_id) {
      toast.error('يرجى اختيار الموظف');
      return;
    }
    if (!draft.amount || draft.amount <= 0) {
      toast.error('يرجى تحديد المبلغ');
      return;
    }
    setIsSubmitting(true);
    const result = await recordPayment({
      agent_id: draft.agent_id,
      payment_type: draft.payment_type,
      status: draft.status,
      period_start: draft.period_start,
      period_end: draft.period_end,
      amount: draft.amount,
      notes: draft.notes,
      currency: 'DZD',
      breakdown: [],
      generated_from: 'manual',
    });
    setIsSubmitting(false);
    if (result) {
      toast.success('تم تسجيل الدفعة');
      setIsDialogOpen(false);
    }
  };

  if (missingSchema) {
    return (
      <Alert variant="destructive">
        <AlertTitle>نظام التعويضات غير جاهز</AlertTitle>
        <AlertDescription>قم بتهيئة نظام التأكيد لتفعيل إدارة الرواتب.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">إدارة التعويضات</h2>
          <p className="text-sm text-muted-foreground">تتبع الرواتب، الأجور حسب الطلب، والمكافآت الشهرية لفريق التأكيد.</p>
        </div>
        <Button onClick={openDialog} className="gap-2">
          <Wallet className="w-4 h-4" />
          تسجيل دفعة
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border/40">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="w-4 h-4" />
              إجمالي التعويضات
            </div>
            <div className="text-2xl font-semibold text-foreground">
              {totals.totalAmount.toLocaleString('ar-DZ')} <span className="text-base text-muted-foreground">د.ج</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/40">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Receipt className="w-4 h-4" />
              قيد المراجعة
            </div>
            <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{totals.pending}</div>
          </CardContent>
        </Card>
        <Card className="border border-border/40">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coins className="w-4 h-4" />
              تمت الموافقة
            </div>
            <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{totals.approved}</div>
          </CardContent>
        </Card>
        <Card className="border border-border/40">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Award className="w-4 h-4" />
              مدفوع
            </div>
            <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{totals.paid}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/40">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="text-lg">سجل الدفعات</CardTitle>
          <DateRangePicker
            onUpdate={({ range }) => {
              if (range?.from && range?.to) {
                // Placeholder: future filtering logic can be added via context/service call
              }
            }}
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>نوع الدفعة</TableHead>
                  <TableHead>الفترة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="text-center py-10 text-muted-foreground">لم يتم تسجيل أي دفعات بعد.</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => {
                    const agent = agents.find((agentItem) => agentItem.id === payment.agent_id);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{agent?.full_name || 'موظف غير معروف'}</span>
                            <span className="text-xs text-muted-foreground">{agent?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{paymentTypeLabels[payment.payment_type]}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {payment.period_start} - {payment.period_end}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">
                            {payment.amount.toLocaleString('ar-DZ')} <span className="text-xs text-muted-foreground">د.ج</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusMeta[payment.status].variant}>{statusMeta[payment.status].label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-xs truncate">{payment.notes || '-'}</div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة لفريق التأكيد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">الموظف</label>
              <Select value={draft.agent_id} onValueChange={(value) => setDraft((prev) => ({ ...prev, agent_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف التأكيد" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">نوع الدفعة</label>
                <Select
                  value={draft.payment_type}
                  onValueChange={(value: ConfirmationPaymentType) => setDraft((prev) => ({ ...prev, payment_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">الحالة</label>
                <Select
                  value={draft.status}
                  onValueChange={(value: ConfirmationPaymentStatus) => setDraft((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">قيد المراجعة</SelectItem>
                    <SelectItem value="approved">موافق عليه</SelectItem>
                    <SelectItem value="paid">تم الدفع</SelectItem>
                    <SelectItem value="cancelled">ملغى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">تاريخ البداية</label>
                <Input
                  type="date"
                  value={draft.period_start}
                  onChange={(event) => setDraft((prev) => ({ ...prev, period_start: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">تاريخ النهاية</label>
                <Input
                  type="date"
                  value={draft.period_end}
                  onChange={(event) => setDraft((prev) => ({ ...prev, period_end: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">المبلغ (د.ج)</label>
              <Input
                type="number"
                min={0}
                value={draft.amount}
                onChange={(event) => setDraft((prev) => ({ ...prev, amount: Number(event.target.value) }))}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">ملاحظات</label>
              <Input value={draft.notes} onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSavePayment} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConfirmationCompensationManager;
