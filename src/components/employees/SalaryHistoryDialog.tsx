import { useState, useEffect } from 'react';
import { Employee, EmployeeSalary } from '@/types/employee';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getEmployeeSalaries } from '@/lib/api/employees';
import { useToast } from '@/components/ui/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, PlusCircle, MinusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SalaryHistoryDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalaryAdded?: (salary: EmployeeSalary) => void;
}

const SalaryHistoryDialog = ({
  employee,
  open,
  onOpenChange,
}: SalaryHistoryDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [salaries, setSalaries] = useState<EmployeeSalary[]>([]);

  useEffect(() => {
    if (open && employee) {
      loadSalaries();
    }
  }, [open, employee]);

  const loadSalaries = async () => {
    if (!employee) return;
    
    setLoading(true);
    try {
      const data = await getEmployeeSalaries(employee.id);
      setSalaries(data);
    } catch (error) {
      console.error('Error loading salaries:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل سجل الرواتب',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير متوفر';
    try {
      return format(new Date(dateString), 'PPP', { locale: ar });
    } catch (error) {
      return 'تاريخ غير صالح';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'monthly':
        return 'راتب شهري';
      case 'commission':
        return 'عمولة';
      case 'bonus':
        return 'مكافأة';
      case 'other':
        return 'أخرى';
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string, amount: number) => {
    if (type === 'monthly') {
      return <PlusCircle className="h-4 w-4 text-blue-500" />;
    } else if (type === 'bonus' || amount > 0) {
      return <PlusCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <MinusCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const formatAmount = (amount: number) => {
    const absAmount = Math.abs(amount);
    return `${absAmount.toFixed(2)} د.ج`;
  };

  const renderSalaryHistory = () => {
    if (loading) {
      return Array(5).fill(0).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        </TableRow>
      ));
    }

    if (salaries.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="h-24 text-center">
            لا توجد سجلات رواتب لهذا الموظف
          </TableCell>
        </TableRow>
      );
    }

    return salaries.map((salary) => (
      <TableRow key={salary.id}>
        <TableCell>{formatDate(salary.start_date)}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {getTypeIcon(salary.type, salary.amount)}
            <span>{getTypeLabel(salary.type)}</span>
          </div>
        </TableCell>
        <TableCell className={salary.amount < 0 ? 'text-red-600' : 'text-green-600'}>
          {formatAmount(salary.amount)}
        </TableCell>
        <TableCell>
          {salary.status === 'paid' ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" /> تم الدفع
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200">
              <Clock className="h-3 w-3 mr-1" /> معلق
            </Badge>
          )}
        </TableCell>
        <TableCell>{salary.notes || '-'}</TableCell>
      </TableRow>
    ));
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>سجل الرواتب والمدفوعات</DialogTitle>
          <DialogDescription>
            عرض سجل الرواتب والمكافآت والخصومات للموظف {employee.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Alert className="mb-4">
            <AlertTitle>ملخص السجل المالي</AlertTitle>
            <AlertDescription>
              عدد السجلات: {salaries.length} | 
              إجمالي المبالغ المدفوعة: {salaries
                .filter(s => s.status === 'paid' && s.amount > 0)
                .reduce((sum, s) => sum + s.amount, 0)
                .toFixed(2)} د.ج | 
              إجمالي الخصومات: {Math.abs(salaries
                .filter(s => s.amount < 0)
                .reduce((sum, s) => sum + s.amount, 0))
                .toFixed(2)} د.ج
            </AlertDescription>
          </Alert>
          
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderSalaryHistory()}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalaryHistoryDialog; 