/**
 * 💰 Payroll Management Page - صفحة إدارة الرواتب
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DollarSign,
  Calculator,
  RefreshCw,
  Download,
  Plus,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { PayrollTable } from '@/components/hr/PayrollTable';
import {
  calculateBulkPayroll,
  getPayrollRecords,
  markPayrollAsPaid,
  createSalaryStructure,
  getSalaryStructures,
  requestLoan,
  getEmployeeLoans,
  generatePaySlip,
} from '@/lib/api/hr/payrollService';
import type { PayrollRecordWithDetails, SalaryStructure, EmployeeLoan } from '@/types/hr/payroll';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

export default function PayrollManagement() {
  const { userProfile } = useAuth();
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedTab, setSelectedTab] = useState('payroll');
  const [isCalculateDialogOpen, setIsCalculateDialogOpen] = useState(false);
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [isSalaryStructureDialogOpen, setIsSalaryStructureDialogOpen] = useState(false);

  const organizationId = currentOrganization?.id || '';
  const isAdmin = userProfile?.role === 'admin';

  // استعلامات البيانات
  const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);

  const { data: payrollRecordsData, isLoading: isLoadingPayroll } = useQuery({
    queryKey: ['payroll-records', organizationId, selectedMonth],
    queryFn: () => getPayrollRecords(organizationId, { month: selectedMonthNum, year: selectedYear }),
    enabled: !!organizationId,
  });
  const payrollRecords = payrollRecordsData?.data || [];

  const { data: salaryStructures = [] } = useQuery({
    queryKey: ['salary-structures', organizationId],
    queryFn: () => getSalaryStructures(organizationId),
    enabled: !!organizationId && isAdmin,
  });

  const { data: myLoans = [] } = useQuery({
    queryKey: ['my-loans', userProfile?.id],
    queryFn: () => getEmployeeLoans(userProfile?.id || ''),
    enabled: !!userProfile?.id,
  });

  // حساب الرواتب
  const calculateMutation = useMutation({
    mutationFn: (data: { organization_id: string; month: number; year: number }) =>
      calculateBulkPayroll(data.organization_id, data.month, data.year),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`تم حساب رواتب ${result.processed} موظف بنجاح`);
        setIsCalculateDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      } else {
        toast.error(result.errors?.[0] || 'فشل حساب الرواتب');
      }
    },
  });

  // تأكيد صرف الراتب
  const markPaidMutation = useMutation({
    mutationFn: markPayrollAsPaid,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تم تأكيد صرف الراتب');
        queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      } else {
        toast.error(result.error || 'فشل تأكيد الصرف');
      }
    },
  });

  // طلب سلفة
  const loanMutation = useMutation({
    mutationFn: requestLoan,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تم تقديم طلب السلفة بنجاح');
        setIsLoanDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['my-loans'] });
      } else {
        toast.error(result.error || 'فشل تقديم الطلب');
      }
    },
  });

  // إنشاء هيكل راتب
  const salaryStructureMutation = useMutation({
    mutationFn: createSalaryStructure,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('تم إنشاء هيكل الراتب بنجاح');
        setIsSalaryStructureDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['salary-structures'] });
      } else {
        toast.error(result.error || 'فشل إنشاء هيكل الراتب');
      }
    },
  });

  // حساب الإجماليات
  const totals = payrollRecords.reduce(
    (acc, record) => ({
      gross: acc.gross + (record.gross_salary || 0),
      net: acc.net + (record.net_salary || 0),
      paid: acc.paid + (record.status === 'paid' ? 1 : 0),
      unpaid: acc.unpaid + (record.status !== 'paid' ? 1 : 0),
    }),
    { gross: 0, net: 0, paid: 0, unpaid: 0 }
  );

  // توليد قائمة الأشهر
  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
      months.push({ value, label });
    }
    return months;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الرواتب</h1>
          <p className="text-muted-foreground">
            حساب وصرف رواتب الموظفين وإدارة السلف
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getMonthOptions().map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          {isAdmin && (
            <Dialog open={isCalculateDialogOpen} onOpenChange={setIsCalculateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Calculator className="h-4 w-4 ml-2" />
                  حساب الرواتب
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>حساب رواتب الشهر</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-muted-foreground">
                    سيتم حساب رواتب جميع الموظفين لشهر{' '}
                    <span className="font-medium text-foreground">
                      {new Date(selectedMonth + '-01').toLocaleDateString('ar-SA', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </p>
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-orange-700 dark:text-orange-400">
                        تنبيه مهم
                      </p>
                      <p className="text-orange-600 dark:text-orange-300 mt-1">
                        سيتم احتساب الخصومات بناءً على سجلات الحضور والغياب والسلف.
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCalculateDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={() =>
                      calculateMutation.mutate({
                        organization_id: organizationId,
                        month: selectedMonthNum,
                        year: selectedYear,
                      })
                    }
                    disabled={calculateMutation.isPending}
                  >
                    {calculateMutation.isPending ? 'جاري الحساب...' : 'حساب الرواتب'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="إجمالي الرواتب"
          value={formatCurrency(totals.gross)}
          icon={DollarSign}
          color="blue"
        />
        <StatsCard
          title="صافي الرواتب"
          value={formatCurrency(totals.net)}
          icon={Wallet}
          color="green"
        />
        <StatsCard
          title="مصروف"
          value={`${totals.paid} راتب`}
          icon={CheckCircle}
          color="emerald"
        />
        <StatsCard
          title="غير مصروف"
          value={`${totals.unpaid} راتب`}
          icon={Clock}
          color="orange"
        />
      </div>

      {/* التبويبات */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="payroll">كشف الرواتب</TabsTrigger>
          <TabsTrigger value="loans">السلف</TabsTrigger>
          {isAdmin && <TabsTrigger value="structures">هياكل الرواتب</TabsTrigger>}
        </TabsList>

        <TabsContent value="payroll" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                كشف رواتب {new Date(selectedMonth + '-01').toLocaleDateString('ar-SA', {
                  month: 'long',
                  year: 'numeric',
                })}
              </CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 ml-2" />
                تصدير
              </Button>
            </CardHeader>
            <CardContent>
              <PayrollTable
                data={payrollRecords}
                isLoading={isLoadingPayroll}
                onMarkAsPaid={isAdmin ? (id) => markPaidMutation.mutate(id) : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                السلف والقروض
              </CardTitle>
              <Dialog open={isLoanDialogOpen} onOpenChange={setIsLoanDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 ml-2" />
                    طلب سلفة
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>طلب سلفة جديدة</DialogTitle>
                  </DialogHeader>
                  <LoanRequestForm
                    onSubmit={(data) =>
                      loanMutation.mutate({
                        ...data,
                        employee_id: userProfile?.id || '',
                        organization_id: organizationId,
                      })
                    }
                    isLoading={loanMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <LoansTable loans={myLoans} />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="structures" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  هياكل الرواتب
                </CardTitle>
                <Dialog
                  open={isSalaryStructureDialogOpen}
                  onOpenChange={setIsSalaryStructureDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة هيكل
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>إنشاء هيكل راتب جديد</DialogTitle>
                    </DialogHeader>
                    <SalaryStructureForm
                      onSubmit={(data) =>
                        salaryStructureMutation.mutate({
                          ...data,
                          organization_id: organizationId,
                        })
                      }
                      isLoading={salaryStructureMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <SalaryStructuresTable structures={salaryStructures} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'emerald' | 'orange';
}

function StatsCard({ title, value, icon: Icon, color }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30',
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface LoanRequestFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function LoanRequestForm({ onSubmit, isLoading }: LoanRequestFormProps) {
  const [formData, setFormData] = useState({
    amount: '',
    installment_amount: '',
    reason: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      amount: parseFloat(formData.amount),
      installment_amount: parseFloat(formData.installment_amount),
      reason: formData.reason,
    });
  };

  const estimatedMonths =
    formData.amount && formData.installment_amount
      ? Math.ceil(parseFloat(formData.amount) / parseFloat(formData.installment_amount))
      : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>مبلغ السلفة (ريال)</Label>
        <Input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          placeholder="مثال: 5000"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>قيمة القسط الشهري (ريال)</Label>
        <Input
          type="number"
          value={formData.installment_amount}
          onChange={(e) => setFormData({ ...formData, installment_amount: e.target.value })}
          placeholder="مثال: 500"
          required
        />
      </div>

      {estimatedMonths > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm">
            سيتم السداد خلال{' '}
            <span className="font-bold text-primary">{estimatedMonths} شهر</span>
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>سبب السلفة</Label>
        <Textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="اشرح سبب حاجتك للسلفة..."
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'جاري التقديم...' : 'تقديم الطلب'}
      </Button>
    </form>
  );
}

interface SalaryStructureFormProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function SalaryStructureForm({ onSubmit, isLoading }: SalaryStructureFormProps) {
  const [formData, setFormData] = useState({
    employee_id: '',
    base_salary: '',
    housing_allowance: '',
    transport_allowance: '',
    other_allowances: '',
    insurance_deduction_percentage: '9',
    effective_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      employee_id: formData.employee_id,
      base_salary: parseFloat(formData.base_salary),
      housing_allowance: parseFloat(formData.housing_allowance) || 0,
      transport_allowance: parseFloat(formData.transport_allowance) || 0,
      other_allowances: parseFloat(formData.other_allowances) || 0,
      insurance_deduction_percentage: parseFloat(formData.insurance_deduction_percentage),
      effective_date: formData.effective_date,
    });
  };

  const totalSalary =
    (parseFloat(formData.base_salary) || 0) +
    (parseFloat(formData.housing_allowance) || 0) +
    (parseFloat(formData.transport_allowance) || 0) +
    (parseFloat(formData.other_allowances) || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>معرف الموظف</Label>
        <Input
          value={formData.employee_id}
          onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
          placeholder="أدخل معرف الموظف"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>الراتب الأساسي</Label>
          <Input
            type="number"
            value={formData.base_salary}
            onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
            placeholder="0"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>بدل السكن</Label>
          <Input
            type="number"
            value={formData.housing_allowance}
            onChange={(e) => setFormData({ ...formData, housing_allowance: e.target.value })}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label>بدل النقل</Label>
          <Input
            type="number"
            value={formData.transport_allowance}
            onChange={(e) => setFormData({ ...formData, transport_allowance: e.target.value })}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label>بدلات أخرى</Label>
          <Input
            type="number"
            value={formData.other_allowances}
            onChange={(e) => setFormData({ ...formData, other_allowances: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>نسبة التأمينات %</Label>
          <Input
            type="number"
            value={formData.insurance_deduction_percentage}
            onChange={(e) =>
              setFormData({ ...formData, insurance_deduction_percentage: e.target.value })
            }
            placeholder="9"
          />
        </div>
        <div className="space-y-2">
          <Label>تاريخ السريان</Label>
          <Input
            type="date"
            value={formData.effective_date}
            onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="p-4 bg-primary/10 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium">إجمالي الراتب</span>
          <span className="text-xl font-bold text-primary">{formatCurrency(totalSalary)}</span>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'جاري الحفظ...' : 'حفظ هيكل الراتب'}
      </Button>
    </form>
  );
}

interface LoansTableProps {
  loans: EmployeeLoan[];
}

function LoansTable({ loans }: LoansTableProps) {
  if (loans.length === 0) {
    return (
      <div className="text-center py-12">
        <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">لا توجد سلف</p>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    pending: 'قيد المراجعة',
    approved: 'موافق عليها',
    active: 'جارية',
    completed: 'مسددة',
    rejected: 'مرفوضة',
  };

  return (
    <div className="space-y-4">
      {loans.map((loan) => (
        <Card key={loan.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">{formatCurrency(loan.amount)}</p>
                <p className="text-sm text-muted-foreground">
                  قسط شهري: {formatCurrency(loan.installment_amount)}
                </p>
              </div>
              <Badge
                variant={
                  loan.status === 'completed'
                    ? 'default'
                    : loan.status === 'rejected'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {statusLabels[loan.status] || loan.status}
              </Badge>
            </div>
            {loan.status === 'active' && (
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>المسدد</span>
                  <span>
                    {formatCurrency(loan.paid_amount)} / {formatCurrency(loan.amount)}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(loan.paid_amount / loan.amount) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  الأقساط المتبقية: {loan.remaining_installments}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface SalaryStructuresTableProps {
  structures: SalaryStructure[];
}

function SalaryStructuresTable({ structures }: SalaryStructuresTableProps) {
  if (structures.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">لا توجد هياكل رواتب</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {structures.map((structure) => (
        <Card key={structure.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{structure.employee?.name}</p>
                <p className="text-sm text-muted-foreground">{structure.employee?.job_title}</p>
              </div>
              <Badge variant={structure.is_active ? 'default' : 'secondary'}>
                {structure.is_active ? 'نشط' : 'غير نشط'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">الأساسي:</span>{' '}
                <span className="font-medium">{formatCurrency(structure.base_salary)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">السكن:</span>{' '}
                <span className="font-medium">{formatCurrency(structure.housing_allowance)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">النقل:</span>{' '}
                <span className="font-medium">{formatCurrency(structure.transport_allowance)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">أخرى:</span>{' '}
                <span className="font-medium">{formatCurrency(structure.other_allowances)}</span>
              </div>
            </div>
            <div className="pt-2 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">الإجمالي</span>
              <span className="font-bold text-primary">
                {formatCurrency(
                  structure.base_salary +
                    structure.housing_allowance +
                    structure.transport_allowance +
                    structure.other_allowances
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// Utility Functions
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
