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
import { User, Phone, Mail, Check, X, ShoppingBag, DollarSign, Shield, PieChart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { permissionGroups, defaultPermissions } from '@/constants/employeePermissions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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

  // Calculate stats
  const totalPermissions = Object.keys(defaultPermissions).length;
  const activePermissions = Object.keys(employee.permissions || {}).filter(
    key => employee.permissions?.[key as keyof EmployeePermissions]
  ).length;
  const ratio = Math.round((activePermissions / totalPermissions) * 100);

  // Get active groups
  const activeGroups = permissionGroups.filter(group =>
    group.permissions.some(p => employee.permissions?.[p.key])
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl">
              {employee.name.charAt(0)}
            </div>
            <div>
              <DialogTitle className="text-xl">{employee.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {employee.email}
                </span>
                <span className="text-slate-300">|</span>
                <span className={cn(
                  "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                  employee.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {employee.is_active ? "نشط" : "غير نشط"}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b bg-slate-50/50">
            <TabsList className="bg-transparent h-12 p-0 w-full justify-start">
              <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none h-full px-6">المعلومات والأداء</TabsTrigger>
              <TabsTrigger value="permissions" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none h-full px-6">الصلاحيات ({activePermissions})</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <TabsContent value="details" className="mt-0 space-y-6">
                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">رقم الهاتف</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-lg font-medium">
                        <Phone className="h-4 w-4 text-orange-500" />
                        {employee.phone || 'غير متوفر'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">تاريخ الانضمام</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-medium">
                        {formatDate(employee.created_at || '')}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">آخر نشاط</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-medium">
                        {employee.lastActive ? formatDate(employee.lastActive) : 'غير متوفر'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-blue-700">
                        <ShoppingBag className="h-5 w-5" />
                        الطلبات المعالجة
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <span className="text-4xl font-bold text-blue-900">{employee.ordersCount || 0}</span>
                      <span className="text-blue-600 mr-2">طلب</span>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-emerald-700">
                        <DollarSign className="h-5 w-5" />
                        إجمالي المبيعات
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <span className="text-4xl font-bold text-emerald-900">
                        {employee.salesTotal ? employee.salesTotal.toLocaleString() : '0'}
                      </span>
                      <span className="text-emerald-600 mr-2">د.ج</span>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="mt-0 space-y-6">
                {/* Summary Card */}
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-orange-500" />
                        <span className="font-semibold">نسبة الصلاحيات الممنوحة</span>
                      </div>
                      <span className="font-bold text-lg">{ratio}%</span>
                    </div>
                    <Progress value={ratio} className="h-2 mb-4" />
                    <div className="flex flex-wrap gap-2">
                      {activeGroups.map(group => (
                        <Badge key={group.id} variant="secondary" className="bg-white border">
                          {group.title}
                        </Badge>
                      ))}
                      {activeGroups.length === 0 && (
                        <span className="text-sm text-muted-foreground">لا توجد صلاحيات ممنوحة</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Groups Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {permissionGroups.map(group => {
                    const groupPermissions = group.permissions;
                    const groupActive = groupPermissions.filter(p => employee.permissions?.[p.key]).length;
                    const totalGroup = groupPermissions.length;

                    if (totalGroup === 0) return null;

                    return (
                      <Card key={group.id} className={cn("overflow-hidden", groupActive === 0 && "opacity-60 bg-slate-50")}>
                        <CardHeader className="pb-3 bg-slate-50/50 border-b p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center border bg-white", group.color.replace('bg-', 'text-'))}>
                                {group.icon}
                              </div>
                              <CardTitle className="text-base">{group.title}</CardTitle>
                            </div>
                            <Badge variant={groupActive === totalGroup ? "default" : groupActive > 0 ? "secondary" : "outline"}>
                              {groupActive} / {totalGroup}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="divide-y">
                            {groupPermissions.map(perm => {
                              const isActive = employee.permissions?.[perm.key];
                              return (
                                <div key={perm.key} className="flex items-center justify-between p-3 hover:bg-slate-50">
                                  <span className="text-sm font-medium">{perm.label}</span>
                                  {isActive ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <X className="h-4 w-4 text-slate-300" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDetailsDialog;
