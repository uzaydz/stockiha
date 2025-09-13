import { useState, useEffect } from 'react';
import { Employee, EmployeePermissions } from '@/types/employee';
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
import { Checkbox } from '@/components/ui/checkbox';
import { updateEmployee } from '@/lib/api/employees';
import { useToast } from '@/components/ui/use-toast';
import { PencilIcon, Box, ShoppingCart, Users, Settings, BarChart3, Phone, Truck, Wrench as ServiceIcon, UserCog, BanknoteIcon, CreditCard } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface EditEmployeeDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeUpdated: (employee: Employee) => void;
}

const getPermissionDisplayName = (key: keyof EmployeePermissions): string => {
    const displayNames: Record<keyof EmployeePermissions, string> = {
        accessPOS: 'الوصول لنقطة البيع',
        manageOrders: 'إدارة الطلبات (عام - قديم)',
        processPayments: 'معالجة المدفوعات',
        manageUsers: 'إدارة المستخدمين (قديم)',
        viewReports: 'عرض التقارير (عام - قديم)',
        manageProducts: 'إدارة المنتجات (عام - قديم)',
        manageServices: 'إدارة الخدمات (عام - قديم)',
        manageEmployees: 'إدارة الموظفين (إضافة/تعديل/حذف/صلاحيات)',
        viewProducts: 'عرض المنتجات/الفئات/المخزون',
        addProducts: 'إضافة منتجات',
        editProducts: 'تعديل المنتجات',
        deleteProducts: 'حذف المنتجات',
        manageProductCategories: 'إدارة فئات المنتجات',
        manageInventory: 'إدارة المخزون (تعديل الكميات)',
        viewInventory: 'عرض المخزون فقط (دون تعديل)',
        viewServices: 'عرض الخدمات',
        addServices: 'إضافة خدمات',
        editServices: 'تعديل الخدمات',
        deleteServices: 'حذف الخدمات',
        trackServices: 'متابعة حالة الخدمات',
        viewOrders: 'عرض الطلبات',
        viewPOSOrders: 'عرض طلبات نقطة البيع',
        updateOrderStatus: 'تحديث حالة الطلب',
        cancelOrders: 'إلغاء الطلبات',
        viewCustomers: 'عرض العملاء',
        manageCustomers: 'إدارة العملاء (إضافة/تعديل/حذف)',
        viewDebts: 'مشاهدة صفحة الديون',
        recordDebtPayments: 'تسجيل دفع للديون',
        viewCustomerDebtHistory: 'مشاهدة سجل ديون العملاء',
        viewSuppliers: 'عرض الموردين',
        manageSuppliers: 'إدارة الموردين',
        managePurchases: 'إدارة المشتريات',
        viewEmployees: 'عرض الموظفين',
        viewFinancialReports: 'عرض التقارير المالية',
        viewSalesReports: 'عرض تقارير المبيعات',
        viewInventoryReports: 'عرض تقارير المخزون',
        viewSettings: 'عرض الإعدادات',
        manageProfileSettings: 'إدارة إعدادات الملف الشخصي',
        manageAppearanceSettings: 'إدارة إعدادات المظهر',
        manageSecuritySettings: 'إدارة إعدادات الأمان',
        manageNotificationSettings: 'إدارة إعدادات الإشعارات',
        manageOrganizationSettings: 'إدارة إعدادات المؤسسة',
        manageBillingSettings: 'إدارة إعدادات الفوترة',
        manageIntegrations: 'إدارة التكامل مع أنظمة أخرى',
        manageAdvancedSettings: 'إدارة الإعدادات المتقدمة',
        manageFlexi: 'إدارة نظام فليكسي',
        manageFlexiAndDigitalCurrency: 'إدارة الفليكسي والعملات الرقمية',
        sellFlexiAndDigitalCurrency: 'بيع خدمات الفليكسي والعملات الرقمية',
        viewFlexiAndDigitalCurrencySales: 'رؤية تحليل مبيعات الفليكسي والعملات الرقمية'
    };
    return displayNames[key] || key;
};

const groupPermissions = (perms: EmployeePermissions | undefined) => {
  if (!perms) return [];

  const groups = {
    general: [] as Array<keyof EmployeePermissions>,
    products: [] as Array<keyof EmployeePermissions>,
    services: [] as Array<keyof EmployeePermissions>,
    orders: [] as Array<keyof EmployeePermissions>,
    customers: [] as Array<keyof EmployeePermissions>,
    debts: [] as Array<keyof EmployeePermissions>,
    suppliers: [] as Array<keyof EmployeePermissions>,
    employees: [] as Array<keyof EmployeePermissions>,
    reports: [] as Array<keyof EmployeePermissions>,
    settings: [] as Array<keyof EmployeePermissions>,
    flexi: [] as Array<keyof EmployeePermissions>,
    other: [] as Array<keyof EmployeePermissions>,
  };

  for (const key in perms) {
    const permKey = key as keyof EmployeePermissions;
    if (['accessPOS', 'processPayments'].includes(permKey)) groups.general.push(permKey);
    else if (permKey.includes('Product') || permKey.includes('Inventory')) groups.products.push(permKey);
    else if (permKey.includes('Service')) groups.services.push(permKey);
    else if (permKey.includes('Order')) groups.orders.push(permKey);
    else if (permKey.includes('Customer') && !permKey.includes('Debt')) groups.customers.push(permKey);
    else if (permKey.includes('Debt') || permKey === 'viewDebts' || permKey === 'recordDebtPayments') groups.debts.push(permKey);
    else if (permKey.includes('Supplier') || permKey.includes('Purchase')) groups.suppliers.push(permKey);
    else if (permKey.includes('Employee') || permKey.includes('User')) groups.employees.push(permKey);
    else if (permKey.includes('Report')) groups.reports.push(permKey);
    else if (permKey.includes('Setting') || permKey.includes('Billing') || permKey.includes('Integration') || permKey.includes('Advanced')) groups.settings.push(permKey);
    else if (permKey.includes('Flexi') || permKey.includes('DigitalCurrency')) groups.flexi.push(permKey);
    else groups.other.push(permKey);
  }

  const groupInfo = [
    { id: 'general', title: 'صلاحيات عامة ونقطة البيع', icon: <UserCog className="h-5 w-5 mr-2" />, permissions: groups.general },
    { id: 'products', title: 'المنتجات والمخزون', icon: <Box className="h-5 w-5 mr-2" />, permissions: groups.products },
    { id: 'services', title: 'الخدمات ومتابعتها', icon: <ServiceIcon className="h-5 w-5 mr-2" />, permissions: groups.services },
    { id: 'orders', title: 'الطلبات والمبيعات', icon: <ShoppingCart className="h-5 w-5 mr-2" />, permissions: groups.orders },
    { id: 'customers', title: 'العملاء', icon: <Users className="h-5 w-5 mr-2" />, permissions: groups.customers },
    { id: 'debts', title: 'الديون والدفعات', icon: <BanknoteIcon className="h-5 w-5 mr-2" />, permissions: groups.debts },
    { id: 'suppliers', title: 'الموردين والمشتريات', icon: <Truck className="h-5 w-5 mr-2" />, permissions: groups.suppliers },
    { id: 'employees', title: 'الموظفين والمستخدمين', icon: <Users className="h-5 w-5 mr-2" />, permissions: groups.employees },
    { id: 'reports', title: 'التقارير والتحليلات', icon: <BarChart3 className="h-5 w-5 mr-2" />, permissions: groups.reports },
    { id: 'settings', title: 'الإعدادات', icon: <Settings className="h-5 w-5 mr-2" />, permissions: groups.settings },
    { id: 'flexi', title: 'الفليكسي والعملات الرقمية', icon: <CreditCard className="h-5 w-5 mr-2" />, permissions: groups.flexi },
    { id: 'other', title: 'أخرى', icon: <Phone className="h-5 w-5 mr-2" />, permissions: groups.other },
  ];

  return groupInfo.filter(group => group.permissions.length > 0);
};

const EditEmployeeDialog = ({ 
  employee, 
  open, 
  onOpenChange,
  onEmployeeUpdated 
}: EditEmployeeDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [permissions, setPermissions] = useState<EmployeePermissions>({} as EmployeePermissions);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (employee && open) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || ''
      });

      const initialPermissions = { ...employee.permissions } as Partial<EmployeePermissions>;
      const allPossibleKeys: Array<keyof EmployeePermissions> = [
        'accessPOS', 'manageOrders', 'processPayments', 'manageUsers', 'viewReports', 'manageProducts', 'manageServices', 'manageEmployees',
        'viewProducts', 'addProducts', 'editProducts', 'deleteProducts', 'manageProductCategories', 'manageInventory', 'viewInventory',
        'viewServices', 'addServices', 'editServices', 'deleteServices', 'trackServices',
        'viewOrders', 'viewPOSOrders', 'updateOrderStatus', 'cancelOrders',
        'viewCustomers', 'manageCustomers',
        'viewDebts', 'recordDebtPayments', 'viewCustomerDebtHistory',
        'viewSuppliers', 'manageSuppliers', 'managePurchases',
        'viewEmployees', 
        'viewFinancialReports', 'viewSalesReports', 'viewInventoryReports',
        'viewSettings', 'manageProfileSettings', 'manageAppearanceSettings', 'manageSecuritySettings', 'manageNotificationSettings', 'manageOrganizationSettings', 'manageBillingSettings', 'manageIntegrations', 'manageAdvancedSettings',
        'manageFlexi', 'manageFlexiAndDigitalCurrency', 'sellFlexiAndDigitalCurrency', 'viewFlexiAndDigitalCurrencySales'
      ];

      allPossibleKeys.forEach(key => {
        if (!(key in initialPermissions)) {
          initialPermissions[key] = false;
        }
      });

      setPermissions(initialPermissions as EmployeePermissions);
    }
  }, [employee, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePermissionChange = (key: keyof EmployeePermissions, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [key]: checked
    }));
  };

  const validateForm = () => {
    const newErrors = {
      name: formData.name.trim() === '' ? 'اسم الموظف مطلوب' : '',
      email: !/^\S+@\S+\.\S+$/.test(formData.email) 
        ? 'البريد الإلكتروني غير صالح' 
        : '',
      phone: formData.phone.trim() !== '' && !/^\d{10,15}$/.test(formData.phone.trim()) 
        ? 'رقم الهاتف غير صالح' 
        : ''
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !employee) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const updatedEmployee = await updateEmployee(employee.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        permissions
      });
      
      toast({
        title: 'تمت العملية بنجاح',
        description: `تم تحديث بيانات الموظف ${formData.name} بنجاح`,
      });
      
      onEmployeeUpdated(updatedEmployee);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث بيانات الموظف. الرجاء المحاولة مرة أخرى.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const permissionGroups = groupPermissions(permissions);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>تعديل بيانات الموظف</DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات الموظف وصلاحياته في النظام. كلمة المرور لا يمكن تعديلها من هنا.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4 flex-grow overflow-y-auto pr-2 scrollbar-thin">
            <Card>
              <CardHeader>
                <CardTitle>المعلومات الأساسية</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">
                    الاسم <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="اسم الموظف الكامل"
                    required
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">
                    البريد الإلكتروني <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@domain.com"
                    required
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">رقم الهاتف (اختياري)</Label>
                  <Input
                    id="edit-phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0XXXXXXXXX"
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>صلاحيات الموظف</CardTitle>
                <CardDescription>
                  قم بتحديث الأذونات التي سيحصل عليها هذا الموظف.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {permissionGroups.map((group) => (
                  <div key={group.id}>
                    <div className="flex items-center mb-3">
                      {group.icon}
                      <h4 className="text-md font-semibold">{group.title}</h4>
                    </div>
                    <Separator className="mb-4" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                      {(group.permissions as Array<keyof EmployeePermissions>).map((key) => (
                        <div key={key} className="flex items-center space-x-2 space-x-reverse">
                          <Checkbox
                            id={`edit-${key}`}
                            checked={!!permissions[key]}
                            onCheckedChange={(checked) => handlePermissionChange(key, !!checked)}
                          />
                          <Label htmlFor={`edit-${key}`} className="text-sm font-normal leading-none">
                            {getPermissionDisplayName(key)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEmployeeDialog;
