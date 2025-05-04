import { useState } from 'react';
import { Employee, EmployeeSalary } from '@/types/employee';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { addEmployeeSalary } from '@/lib/api/employees';
import { format } from 'date-fns';
import { CalendarIcon, Coins } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ar } from 'date-fns/locale';

interface AddSalaryDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalaryAdded: (salary: EmployeeSalary) => void;
}

const AddSalaryDialog = ({
  employee,
  open,
  onOpenChange,
  onSalaryAdded
}: AddSalaryDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'monthly' | 'commission' | 'bonus' | 'other'>('monthly');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [status, setStatus] = useState<'paid' | 'pending'>('paid');
  const [note, setNote] = useState('');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // تحقق من صحة الرقم (يسمح بالعلامة العشرية)
    const value = e.target.value;
    if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
      setAmount(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee || !amount || !date) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال جميع البيانات المطلوبة',
        variant: 'destructive'
      });
      return;
    }
    
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال مبلغ صالح',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const newSalary = await addEmployeeSalary(employee.id, {
        amount: amountValue,
        type,
        date: format(date, 'yyyy-MM-dd'),
        status,
        note: note.trim() || null
      });
      
      toast({
        title: 'تمت العملية بنجاح',
        description: `تم ${type === 'monthly' ? 'الراتب الشهري' : type === 'commission' ? 'العمولة' : type === 'bonus' ? 'المكافأة' : 'المبلغ'} بقيمة ${Math.abs(amountValue)} د.ج`,
      });
      
      onSalaryAdded(newSalary);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding salary:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إضافة الراتب. الرجاء المحاولة مرة أخرى.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setType('monthly');
    setDate(new Date());
    setStatus('paid');
    setNote('');
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>إضافة راتب أو مكافأة للموظف</DialogTitle>
            <DialogDescription>
              إضافة راتب شهري أو مكافأة أو عمولة للموظف {employee.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="type">نوع المعاملة المالية</Label>
              <RadioGroup 
                value={type} 
                onValueChange={(value) => setType(value as 'monthly' | 'commission' | 'bonus' | 'other')}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="mr-2">راتب شهري</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="commission" id="commission" />
                  <Label htmlFor="commission" className="mr-2">عمولة</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="bonus" id="bonus" />
                  <Label htmlFor="bonus" className="mr-2">مكافأة</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="mr-2">أخرى</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">
                المبلغ <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Coins className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="أدخل المبلغ"
                  className="pl-12 pr-9"
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground">د.ج</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date">التاريخ</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={"w-full justify-start text-right font-normal"}
                    id="date"
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {date ? (
                      format(date, 'PPP', { locale: ar })
                    ) : (
                      <span>اختر التاريخ</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    captionLayout="dropdown-buttons"
                    fromYear={2020}
                    toYear={2030}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">حالة الدفع</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as 'paid' | 'pending')}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="اختر حالة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">تم الدفع</SelectItem>
                  <SelectItem value="pending">معلق</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="note">ملاحظات</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ملاحظات إضافية (اختياري)"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الإضافة...' : 'إضافة'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSalaryDialog; 