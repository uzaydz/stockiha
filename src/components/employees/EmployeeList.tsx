import { useState } from 'react';
import { Employee, EmployeeWithStats } from '@/types/employee';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Edit, 
  Trash, 
  UserCheck, 
  UserMinus, 
  Lock, 
  DollarSign, 
  BarChart3, 
  Mail, 
  Phone 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

// مكونات الحوارات
import EmployeeDetailsDialog from './EmployeeDetailsDialog.tsx';
import EditEmployeeDialog from './EditEmployeeDialog.tsx';
import AddSalaryDialog from './AddSalaryDialog.tsx';
import ResetPasswordDialog from './ResetPasswordDialog.tsx';
import EmployeeActivityDialog from './EmployeeActivityDialog.tsx';
import EmployeePerformanceDialog from './EmployeePerformanceDialog.tsx';
import ConfirmDialog from '@/components/ui/confirm-dialog';

// API functions
import { toggleEmployeeStatus, deleteEmployee } from '@/lib/api/employees';

interface EmployeeListProps {
  employees: Employee[];
  isLoading: boolean;
  onDataChange: () => void;
}

const EmployeeList = ({ employees, isLoading, onDataChange }: EmployeeListProps) => {
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithStats | null>(null);

  // حالات فتح النوافذ الحوارية
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddSalaryOpen, setIsAddSalaryOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  const handleViewDetails = (employee: Employee) => {
    // Create an EmployeeWithStats object from the Employee object
    const employeeWithStats: EmployeeWithStats = {
      ...employee,
      ordersCount: 0,
      salesTotal: 0,
      servicesCount: 0
    };
    setSelectedEmployee(employeeWithStats);
    setIsDetailsOpen(true);
  };
  
  const handleEditEmployee = (employee: Employee) => {
    const employeeWithStats: EmployeeWithStats = {
      ...employee,
      ordersCount: 0,
      salesTotal: 0,
      servicesCount: 0
    };
    setSelectedEmployee(employeeWithStats);
    setIsEditOpen(true);
  };
  
  const handleAddSalary = (employee: Employee) => {
    const employeeWithStats: EmployeeWithStats = {
      ...employee,
      ordersCount: 0,
      salesTotal: 0,
      servicesCount: 0
    };
    setSelectedEmployee(employeeWithStats);
    setIsAddSalaryOpen(true);
  };
  
  const handleResetPassword = (employee: Employee) => {
    const employeeWithStats: EmployeeWithStats = {
      ...employee,
      ordersCount: 0,
      salesTotal: 0,
      servicesCount: 0
    };
    setSelectedEmployee(employeeWithStats);
    setIsResetPasswordOpen(true);
  };
  
  const handleViewActivity = (employee: Employee) => {
    const employeeWithStats: EmployeeWithStats = {
      ...employee,
      ordersCount: 0,
      salesTotal: 0,
      servicesCount: 0
    };
    setSelectedEmployee(employeeWithStats);
    setIsActivityOpen(true);
  };
  
  const handleViewPerformance = (employee: Employee) => {
    const employeeWithStats: EmployeeWithStats = {
      ...employee,
      ordersCount: 0,
      salesTotal: 0,
      servicesCount: 0
    };
    setSelectedEmployee(employeeWithStats);
    setIsPerformanceOpen(true);
  };
  
  const handleToggleStatus = (employee: Employee) => {
    const employeeWithStats: EmployeeWithStats = {
      ...employee,
      ordersCount: 0,
      salesTotal: 0,
      servicesCount: 0
    };
    setSelectedEmployee(employeeWithStats);
    setIsStatusDialogOpen(true);
  };
  
  const handleDeleteEmployee = (employee: Employee) => {
    const employeeWithStats: EmployeeWithStats = {
      ...employee,
      ordersCount: 0,
      salesTotal: 0,
      servicesCount: 0
    };
    setSelectedEmployee(employeeWithStats);
    setIsDeleteDialogOpen(true);
  };

  const confirmToggleStatus = async () => {
    if (!selectedEmployee) return;
    
    try {
      const updatedEmployee = await toggleEmployeeStatus(
        selectedEmployee.id, 
        !selectedEmployee.is_active
      );
      
      toast({
        title: 'تم تغيير الحالة',
        description: `تم تغيير حالة ${selectedEmployee.name} بنجاح`,
      });
      
      onDataChange(); // تحديث البيانات
    } catch (error) {
      console.error('Error toggling employee status:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تغيير حالة الموظف',
        variant: 'destructive'
      });
    } finally {
      setIsStatusDialogOpen(false);
    }
  };
  
  const confirmDeleteEmployee = async () => {
    if (!selectedEmployee) return;
    
    try {
      await deleteEmployee(selectedEmployee.id);
      toast({
        title: 'تم الحذف',
        description: `تم حذف ${selectedEmployee.name} بنجاح`,
      });
      
      onDataChange(); // تحديث البيانات
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف الموظف',
        variant: 'destructive'
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const sendEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };
  
  const callPhone = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2">جاري تحميل الموظفين...</p>
      </div>
    );
  }
  
  if (employees.length === 0) {
    return (
      <div className="bg-muted/20 rounded-lg p-8 text-center">
        <UserMinus className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <h3 className="font-semibold text-lg">لا يوجد موظفين</h3>
        <p className="text-muted-foreground mt-1">لم يتم العثور على موظفين مطابقين لمعايير البحث</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">الاسم</TableHead>
            <TableHead>البريد الإلكتروني</TableHead>
            <TableHead>رقم الهاتف</TableHead>
            <TableHead>تاريخ التعيين</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead className="text-left">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">{employee.name}</TableCell>
              <TableCell>{employee.email}</TableCell>
              <TableCell>{employee.phone || 'غير متوفر'}</TableCell>
              <TableCell>{formatDate(employee.created_at)}</TableCell>
              <TableCell>
                {employee.is_active ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                    نشط
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
                    غير نشط
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-left">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => sendEmail(employee.email)}
                    title="إرسال بريد إلكتروني"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  
                  {employee.phone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => callPhone(employee.phone || '')}
                      title="اتصال"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>خيارات</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleViewDetails(employee)}>
                        عرض التفاصيل
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                        <Edit className="h-4 w-4 ml-2" />
                        تعديل البيانات
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleAddSalary(employee)}>
                        <DollarSign className="h-4 w-4 ml-2" />
                        إضافة راتب
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleResetPassword(employee)}>
                        <Lock className="h-4 w-4 ml-2" />
                        تغيير كلمة المرور
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleViewActivity(employee)}>
                        سجل النشاطات
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewPerformance(employee)}>
                        <BarChart3 className="h-4 w-4 ml-2" />
                        تقرير الأداء
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleToggleStatus(employee)}
                      >
                        {employee.is_active ? (
                          <>
                            <UserMinus className="h-4 w-4 ml-2 text-orange-600" />
                            <span className="text-orange-600">تعطيل</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 ml-2 text-green-600" />
                            <span className="text-green-600">تفعيل</span>
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteEmployee(employee)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash className="h-4 w-4 ml-2" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* الحوارات المنبثقة */}
      {selectedEmployee && (
        <>
          <EmployeeDetailsDialog
            employee={selectedEmployee}
            open={isDetailsOpen}
            onOpenChange={setIsDetailsOpen}
          />
          
          <EditEmployeeDialog
            employee={selectedEmployee}
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            onEmployeeUpdated={onDataChange}
          />
          
          <AddSalaryDialog
            employee={selectedEmployee}
            open={isAddSalaryOpen}
            onOpenChange={setIsAddSalaryOpen}
            onSalaryAdded={() => {}}
          />
          
          <ResetPasswordDialog
            employee={selectedEmployee}
            open={isResetPasswordOpen}
            onOpenChange={setIsResetPasswordOpen}
          />
          
          <EmployeeActivityDialog
            employee={selectedEmployee}
            open={isActivityOpen}
            onClose={() => setIsActivityOpen(false)}
          />
          
          <EmployeePerformanceDialog
            employee={selectedEmployee}
            open={isPerformanceOpen}
            onClose={() => setIsPerformanceOpen(false)}
          />
          
          <ConfirmDialog
            open={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={confirmDeleteEmployee}
            title="حذف الموظف"
            description={`هل أنت متأكد أنك تريد حذف الموظف ${selectedEmployee.name}؟ هذا الإجراء لا يمكن التراجع عنه.`}
            confirmText="حذف"
            cancelText="إلغاء"
            variant="destructive"
          />
          
          <ConfirmDialog
            open={isStatusDialogOpen}
            onClose={() => setIsStatusDialogOpen(false)}
            onConfirm={confirmToggleStatus}
            title={selectedEmployee.is_active ? "تعطيل الموظف" : "تفعيل الموظف"}
            description={
              selectedEmployee.is_active 
                ? `هل أنت متأكد أنك تريد تعطيل حساب الموظف ${selectedEmployee.name}؟`
                : `هل أنت متأكد أنك تريد تفعيل حساب الموظف ${selectedEmployee.name}؟`
            }
            confirmText={selectedEmployee.is_active ? "تعطيل" : "تفعيل"}
            cancelText="إلغاء"
          />
        </>
      )}
    </div>
  );
};

export default EmployeeList; 