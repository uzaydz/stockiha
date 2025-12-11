/**
 * 💰 Payroll Table Component - مكون جدول الرواتب
 */

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DollarSign,
  MoreVertical,
  Eye,
  Download,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Printer,
  FileText,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { PayrollRecordWithDetails, PaySlip } from '@/types/hr/payroll';

interface PayrollTableProps {
  data: PayrollRecordWithDetails[];
  isLoading?: boolean;
  onViewPayslip?: (record: PayrollRecordWithDetails) => void;
  onMarkAsPaid?: (id: string) => void;
  onExport?: () => void;
}

export function PayrollTable({
  data,
  isLoading,
  onViewPayslip,
  onMarkAsPaid,
  onExport,
}: PayrollTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecordWithDetails | null>(null);

  const filteredData = data.filter((record) => {
    const matchesSearch =
      record.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employee?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // حساب الإجماليات
  const totals = filteredData.reduce(
    (acc, record) => ({
      gross: acc.gross + (record.gross_salary || 0),
      net: acc.net + (record.net_salary || 0),
      deductions: acc.deductions + (record.total_deductions || 0),
      allowances: acc.allowances + (record.total_allowances || 0),
    }),
    { gross: 0, net: 0, deductions: 0, allowances: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="إجمالي الرواتب"
          value={totals.gross}
          icon={DollarSign}
          color="blue"
        />
        <SummaryCard
          title="صافي الرواتب"
          value={totals.net}
          icon={DollarSign}
          color="green"
        />
        <SummaryCard
          title="البدلات"
          value={totals.allowances}
          icon={TrendingUp}
          color="emerald"
        />
        <SummaryCard
          title="الخصومات"
          value={totals.deductions}
          icon={TrendingDown}
          color="red"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 ml-2" />
            <SelectValue placeholder="حالة الراتب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="pending">قيد المعالجة</SelectItem>
            <SelectItem value="approved">معتمد</SelectItem>
            <SelectItem value="paid">مصروف</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
          </SelectContent>
        </Select>
        {onExport && (
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الموظف</TableHead>
              <TableHead className="text-right">الشهر</TableHead>
              <TableHead className="text-right">الراتب الإجمالي</TableHead>
              <TableHead className="text-right">البدلات</TableHead>
              <TableHead className="text-right">الخصومات</TableHead>
              <TableHead className="text-right">الصافي</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows />
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-8 w-8" />
                    <p>لا توجد سجلات رواتب</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={record.employee?.avatar_url} />
                        <AvatarFallback>
                          {record.employee?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{record.employee?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.employee?.job_title}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatMonth(record.payroll_month)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{formatCurrency(record.gross_salary)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-green-600">+{formatCurrency(record.total_allowances)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-red-600">-{formatCurrency(record.total_deductions)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-primary">{formatCurrency(record.net_salary)}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={record.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedRecord(record)}>
                          <Eye className="h-4 w-4 ml-2" />
                          عرض كشف الراتب
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewPayslip?.(record)}>
                          <Printer className="h-4 w-4 ml-2" />
                          طباعة
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {record.status !== 'paid' && onMarkAsPaid && (
                          <DropdownMenuItem onClick={() => onMarkAsPaid(record.id)}>
                            <CheckCircle className="h-4 w-4 ml-2" />
                            تأكيد الصرف
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Payslip Dialog */}
      <PayslipDialog
        record={selectedRecord}
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'emerald' | 'red';
}

function SummaryCard({ title, value, icon: Icon, color }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(value)}</p>
          </div>
          <div className={`p-2 rounded-full ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'قيد المعالجة', variant: 'secondary' },
    approved: { label: 'معتمد', variant: 'outline' },
    paid: { label: 'مصروف', variant: 'default' },
    cancelled: { label: 'ملغي', variant: 'destructive' },
  };

  const config = statusConfig[status] || { label: status, variant: 'outline' as const };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface PayslipDialogProps {
  record: PayrollRecordWithDetails | null;
  open: boolean;
  onClose: () => void;
}

function PayslipDialog({ record, open, onClose }: PayslipDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            كشف راتب - {formatMonth(record.payroll_month)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-4 border rounded-lg">
          {/* معلومات الموظف */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <Avatar className="h-12 w-12">
              <AvatarImage src={record.employee?.avatar_url} />
              <AvatarFallback>{record.employee?.name?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-lg">{record.employee?.name}</p>
              <p className="text-sm text-muted-foreground">{record.employee?.job_title}</p>
            </div>
            <StatusBadge status={record.status} />
          </div>

          {/* تفاصيل الراتب */}
          <div className="grid grid-cols-2 gap-6">
            {/* الإيرادات */}
            <div className="space-y-3">
              <h3 className="font-medium text-green-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                الإيرادات
              </h3>
              <div className="space-y-2">
                <PayslipRow label="الراتب الأساسي" value={record.base_salary} />
                {record.housing_allowance > 0 && (
                  <PayslipRow label="بدل السكن" value={record.housing_allowance} />
                )}
                {record.transport_allowance > 0 && (
                  <PayslipRow label="بدل النقل" value={record.transport_allowance} />
                )}
                {record.other_allowances > 0 && (
                  <PayslipRow label="بدلات أخرى" value={record.other_allowances} />
                )}
                {record.overtime_amount > 0 && (
                  <PayslipRow label="ساعات إضافية" value={record.overtime_amount} />
                )}
                {record.bonus > 0 && (
                  <PayslipRow label="مكافآت" value={record.bonus} />
                )}
                <PayslipRow
                  label="إجمالي الإيرادات"
                  value={record.gross_salary}
                  bold
                  className="pt-2 border-t"
                />
              </div>
            </div>

            {/* الخصومات */}
            <div className="space-y-3">
              <h3 className="font-medium text-red-600 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                الخصومات
              </h3>
              <div className="space-y-2">
                {record.absence_deduction > 0 && (
                  <PayslipRow label="خصم الغياب" value={record.absence_deduction} negative />
                )}
                {record.late_deduction > 0 && (
                  <PayslipRow label="خصم التأخير" value={record.late_deduction} negative />
                )}
                {record.loan_deduction > 0 && (
                  <PayslipRow label="قسط السلفة" value={record.loan_deduction} negative />
                )}
                {record.insurance_deduction > 0 && (
                  <PayslipRow label="التأمينات" value={record.insurance_deduction} negative />
                )}
                {record.tax_deduction > 0 && (
                  <PayslipRow label="الضريبة" value={record.tax_deduction} negative />
                )}
                {record.other_deductions > 0 && (
                  <PayslipRow label="خصومات أخرى" value={record.other_deductions} negative />
                )}
                <PayslipRow
                  label="إجمالي الخصومات"
                  value={record.total_deductions}
                  bold
                  negative
                  className="pt-2 border-t"
                />
              </div>
            </div>
          </div>

          {/* الصافي */}
          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">صافي الراتب</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(record.net_salary)}
              </span>
            </div>
          </div>

          {/* ملاحظات */}
          {record.notes && (
            <div className="p-3 bg-muted/50 rounded text-sm">
              <span className="font-medium">ملاحظات: </span>
              {record.notes}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
          <Button>
            <Printer className="h-4 w-4 ml-2" />
            طباعة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayslipRow({
  label,
  value,
  bold,
  negative,
  className,
}: {
  label: string;
  value: number;
  bold?: boolean;
  negative?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex justify-between text-sm ${className || ''}`}>
      <span className={bold ? 'font-medium' : ''}>{label}</span>
      <span className={`${bold ? 'font-bold' : ''} ${negative ? 'text-red-600' : ''}`}>
        {negative ? '-' : ''}{formatCurrency(value)}
      </span>
    </div>
  );
}

function TableSkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i} className="animate-pulse">
          <TableCell>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="space-y-1">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            </div>
          </TableCell>
          <TableCell><div className="h-4 w-20 bg-muted rounded" /></TableCell>
          <TableCell><div className="h-4 w-16 bg-muted rounded" /></TableCell>
          <TableCell><div className="h-4 w-16 bg-muted rounded" /></TableCell>
          <TableCell><div className="h-4 w-16 bg-muted rounded" /></TableCell>
          <TableCell><div className="h-4 w-20 bg-muted rounded" /></TableCell>
          <TableCell><div className="h-6 w-16 bg-muted rounded" /></TableCell>
          <TableCell><div className="h-8 w-8 bg-muted rounded" /></TableCell>
        </TableRow>
      ))}
    </>
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

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('ar-SA', {
    month: 'long',
    year: 'numeric',
  });
}

export default PayrollTable;
