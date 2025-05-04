import { Employee, EmployeePermissions, EmployeeWithStats } from '@/types/employee';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Phone, Mail, Check, X, ShoppingBag, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface EmployeeDetailsDialogProps {
  employee: EmployeeWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'غير متوفر';
  try {
    return format(new Date(dateString), 'PPP', { locale: ar });
  } catch (error) {
    return 'تاريخ غير صالح';
  }
};

const EmployeeDetailsDialog = ({
  employee,
  open,
  onOpenChange,
}: EmployeeDetailsDialogProps) => {
  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تفاصيل الموظف: {employee.name}</DialogTitle>
          <DialogDescription>
            عرض معلومات الموظف وإحصائيات الأداء والصلاحيات
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="py-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">المعلومات الأساسية</TabsTrigger>
            <TabsTrigger value="permissions">الصلاحيات</TabsTrigger>
            <TabsTrigger value="performance">الأداء</TabsTrigger>
          </TabsList>

          {/* معلومات الموظف الأساسية */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>بيانات الموظف</CardTitle>
                <CardDescription>
                  المعلومات الشخصية والتواصل وبيانات الحساب
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">الاسم</p>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{employee.name}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{employee.email}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{employee.phone || 'غير متوفر'}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">الحالة</p>
                    <div className="flex items-center gap-2">
                      {employee.is_active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">
                          <Check className="h-3 w-3 mr-1" /> نشط
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 border-red-200">
                          <X className="h-3 w-3 mr-1" /> غير نشط
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">تاريخ الانضمام</p>
                      <p className="font-medium">
                        {formatDate(employee.created_at || '')}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">آخر تحديث</p>
                      <p className="font-medium">
                        {formatDate(employee.updated_at || '')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* صلاحيات الموظف */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>صلاحيات الموظف</CardTitle>
                <CardDescription>
                  الصلاحيات والأذونات المسندة للموظف في النظام
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(employee.permissions || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      {value ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                      <p>
                        {key === 'accessPOS' && 'الوصول لنقطة البيع'}
                        {key === 'manageUsers' && 'إدارة المستخدمين'}
                        {key === 'viewReports' && 'عرض التقارير'}
                        {key === 'manageOrders' && 'إدارة الطلبات'}
                        {key === 'manageProducts' && 'إدارة المنتجات'}
                        {key === 'manageServices' && 'إدارة الخدمات'}
                        {key === 'manageEmployees' && 'إدارة الموظفين'}
                        {key === 'processPayments' && 'معالجة المدفوعات'}
                        {key === 'manageFlexi' && 'إدارة نظام فليكسي'}
                        {key === 'manageFlexiAndDigitalCurrency' && 'إدارة الفليكسي والعملات الرقمية'}
                        {key === 'sellFlexiAndDigitalCurrency' && 'بيع خدمات الفليكسي والعملات الرقمية'}
                        {key === 'viewFlexiAndDigitalCurrencySales' && 'رؤية تحليل مبيعات الفليكسي والعملات الرقمية'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* أداء الموظف وإحصائيات */}
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>إحصائيات الأداء</CardTitle>
                <CardDescription>
                  إحصائيات وأرقام توضح أداء الموظف
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        عدد الطلبات المعالجة
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                        <span className="text-2xl font-bold">
                          {employee.ordersCount || 0}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        إجمالي المبيعات
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <div className="text-xs text-muted-foreground">إجمالي المبيعات</div>
                        <div className="text-base font-semibold">
                          {employee.salesTotal ? `${employee.salesTotal.toFixed(2)} د.ج` : '0.00 د.ج'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* يمكن إضافة مزيد من الإحصائيات هنا */}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDetailsDialog; 