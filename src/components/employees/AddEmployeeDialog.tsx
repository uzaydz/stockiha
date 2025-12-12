import { useState, useEffect, useMemo } from 'react';
import { Employee, EmployeePermissions } from '@/types/employee';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { createEmployeeWithAllPermissions } from '@/lib/api/employees';
import { useToast } from '@/components/ui/use-toast';
import {
  UserPlus,
  Box,
  ShoppingCart,
  Users,
  Settings,
  BarChart3,
  Truck,
  Wrench,
  UserCog,
  BanknoteIcon,
  CreditCard,
  AlertTriangle,
  Eye,
  EyeOff,
  Check,
  X,
  Shield,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  Lock,
  Search,
  CheckCircle2,
  Circle,
  Zap,
  Crown,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { limitChecker, LimitCheckResponse } from '@/lib/subscription/limitChecker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AddEmployeeDialogProps {
  onEmployeeAdded: (employee: Employee) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// الصلاحيات الافتراضية
// ═══════════════════════════════════════════════════════════════════════════

const defaultPermissions: EmployeePermissions = {
  accessPOS: true,
  manageOrders: false,
  processPayments: true,
  manageUsers: false,
  viewReports: false,
  manageProducts: false,
  manageServices: false,
  manageEmployees: false,
  viewProducts: true,
  addProducts: false,
  editProducts: false,
  deleteProducts: false,
  manageProductCategories: false,
  manageInventory: false,
  viewInventory: true,
  viewServices: true,
  addServices: false,
  editServices: false,
  deleteServices: false,
  trackServices: false,
  viewOrders: true,
  viewPOSOrders: false,
  updateOrderStatus: false,
  cancelOrders: false,
  viewCustomers: true,
  manageCustomers: false,
  viewDebts: false,
  recordDebtPayments: false,
  viewCustomerDebtHistory: false,
  viewSuppliers: false,
  manageSuppliers: false,
  managePurchases: false,
  viewEmployees: true,
  viewFinancialReports: false,
  viewSalesReports: false,
  viewInventoryReports: false,
  viewSettings: true,
  manageProfileSettings: true,
  manageAppearanceSettings: true,
  manageSecuritySettings: true,
  manageNotificationSettings: true,
  manageOrganizationSettings: false,
  manageBillingSettings: false,
  manageIntegrations: false,
  manageAdvancedSettings: false,
  manageFlexi: false,
  manageFlexiAndDigitalCurrency: false,
  sellFlexiAndDigitalCurrency: false,
  viewFlexiAndDigitalCurrencySales: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// قوالب الصلاحيات الجاهزة
// ═══════════════════════════════════════════════════════════════════════════

interface PermissionPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  permissions: Partial<EmployeePermissions>;
}

const permissionPresets: PermissionPreset[] = [
  {
    id: 'full',
    name: 'صلاحيات كاملة',
    description: 'جميع الصلاحيات بدون قيود',
    icon: <Crown className="h-5 w-5" />,
    color: 'from-amber-500 to-orange-600',
    permissions: Object.fromEntries(
      Object.keys(defaultPermissions).map(key => [key, true])
    ) as EmployeePermissions,
  },
  {
    id: 'manager',
    name: 'مدير',
    description: 'إدارة كاملة باستثناء إعدادات النظام',
    icon: <Building2 className="h-5 w-5" />,
    color: 'from-blue-500 to-indigo-600',
    permissions: {
      ...defaultPermissions,
      accessPOS: true,
      processPayments: true,
      manageOrders: true,
      viewReports: true,
      manageProducts: true,
      viewProducts: true,
      addProducts: true,
      editProducts: true,
      deleteProducts: true,
      manageProductCategories: true,
      manageInventory: true,
      viewInventory: true,
      viewServices: true,
      addServices: true,
      editServices: true,
      deleteServices: true,
      trackServices: true,
      viewOrders: true,
      viewPOSOrders: true,
      updateOrderStatus: true,
      cancelOrders: true,
      viewCustomers: true,
      manageCustomers: true,
      viewDebts: true,
      recordDebtPayments: true,
      viewCustomerDebtHistory: true,
      viewSuppliers: true,
      manageSuppliers: true,
      managePurchases: true,
      viewEmployees: true,
      viewFinancialReports: true,
      viewSalesReports: true,
      viewInventoryReports: true,
    },
  },
  {
    id: 'cashier',
    name: 'كاشير',
    description: 'نقطة البيع والمدفوعات فقط',
    icon: <Zap className="h-5 w-5" />,
    color: 'from-emerald-500 to-teal-600',
    permissions: {
      ...defaultPermissions,
      accessPOS: true,
      processPayments: true,
      viewProducts: true,
      viewInventory: true,
      viewCustomers: true,
      viewOrders: true,
      viewPOSOrders: true,
    },
  },
  {
    id: 'inventory',
    name: 'مسؤول مخزون',
    description: 'إدارة المنتجات والمخزون',
    icon: <Box className="h-5 w-5" />,
    color: 'from-purple-500 to-violet-600',
    permissions: {
      ...defaultPermissions,
      viewProducts: true,
      addProducts: true,
      editProducts: true,
      manageProductCategories: true,
      manageInventory: true,
      viewInventory: true,
      viewInventoryReports: true,
    },
  },
  {
    id: 'custom',
    name: 'تخصيص يدوي',
    description: 'اختر الصلاحيات بنفسك',
    icon: <Settings className="h-5 w-5" />,
    color: 'from-slate-500 to-slate-600',
    permissions: defaultPermissions,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// مجموعات الصلاحيات
// ═══════════════════════════════════════════════════════════════════════════

interface PermissionGroup {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  permissions: Array<{
    key: keyof EmployeePermissions;
    label: string;
    description?: string;
  }>;
}

const permissionGroups: PermissionGroup[] = [
  {
    id: 'pos',
    title: 'نقطة البيع',
    description: 'الوصول والعمليات في نقطة البيع',
    icon: <Zap className="h-5 w-5" />,
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    permissions: [
      { key: 'accessPOS', label: 'الوصول لنقطة البيع', description: 'فتح واستخدام نقطة البيع' },
      { key: 'processPayments', label: 'معالجة المدفوعات', description: 'استلام الدفعات من العملاء' },
      { key: 'viewPOSOrders', label: 'عرض طلبات نقطة البيع' },
    ],
  },
  {
    id: 'products',
    title: 'المنتجات والمخزون',
    description: 'إدارة المنتجات والفئات والمخزون',
    icon: <Box className="h-5 w-5" />,
    color: 'bg-blue-500/10 text-blue-600 border-blue-200',
    permissions: [
      { key: 'viewProducts', label: 'عرض المنتجات' },
      { key: 'addProducts', label: 'إضافة منتجات' },
      { key: 'editProducts', label: 'تعديل المنتجات' },
      { key: 'deleteProducts', label: 'حذف المنتجات' },
      { key: 'manageProductCategories', label: 'إدارة الفئات' },
      { key: 'viewInventory', label: 'عرض المخزون' },
      { key: 'manageInventory', label: 'إدارة المخزون' },
    ],
  },
  {
    id: 'services',
    title: 'الخدمات',
    description: 'خدمات الإصلاح والاشتراكات',
    icon: <Wrench className="h-5 w-5" />,
    color: 'bg-orange-500/10 text-orange-600 border-orange-200',
    permissions: [
      { key: 'viewServices', label: 'عرض الخدمات' },
      { key: 'addServices', label: 'إضافة خدمات' },
      { key: 'editServices', label: 'تعديل الخدمات' },
      { key: 'deleteServices', label: 'حذف الخدمات' },
      { key: 'trackServices', label: 'متابعة الحالة' },
    ],
  },
  {
    id: 'orders',
    title: 'الطلبات والمبيعات',
    description: 'إدارة الطلبات وتحديث الحالات',
    icon: <ShoppingCart className="h-5 w-5" />,
    color: 'bg-violet-500/10 text-violet-600 border-violet-200',
    permissions: [
      { key: 'viewOrders', label: 'عرض الطلبات' },
      { key: 'manageOrders', label: 'إدارة الطلبات' },
      { key: 'updateOrderStatus', label: 'تحديث حالة الطلب' },
      { key: 'cancelOrders', label: 'إلغاء الطلبات' },
    ],
  },
  {
    id: 'customers',
    title: 'العملاء',
    description: 'إدارة بيانات العملاء',
    icon: <Users className="h-5 w-5" />,
    color: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
    permissions: [
      { key: 'viewCustomers', label: 'عرض العملاء' },
      { key: 'manageCustomers', label: 'إدارة العملاء' },
    ],
  },
  {
    id: 'debts',
    title: 'الديون والدفعات',
    description: 'إدارة ديون العملاء والتحصيل',
    icon: <BanknoteIcon className="h-5 w-5" />,
    color: 'bg-red-500/10 text-red-600 border-red-200',
    permissions: [
      { key: 'viewDebts', label: 'عرض الديون' },
      { key: 'recordDebtPayments', label: 'تسجيل الدفعات' },
      { key: 'viewCustomerDebtHistory', label: 'سجل ديون العملاء' },
    ],
  },
  {
    id: 'suppliers',
    title: 'الموردين والمشتريات',
    description: 'إدارة الموردين وعمليات الشراء',
    icon: <Truck className="h-5 w-5" />,
    color: 'bg-amber-500/10 text-amber-600 border-amber-200',
    permissions: [
      { key: 'viewSuppliers', label: 'عرض الموردين' },
      { key: 'manageSuppliers', label: 'إدارة الموردين' },
      { key: 'managePurchases', label: 'إدارة المشتريات' },
    ],
  },
  {
    id: 'employees',
    title: 'الموظفين',
    description: 'إدارة الموظفين والصلاحيات',
    icon: <UserCog className="h-5 w-5" />,
    color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
    permissions: [
      { key: 'viewEmployees', label: 'عرض الموظفين' },
      { key: 'manageEmployees', label: 'إدارة الموظفين' },
      { key: 'manageUsers', label: 'إدارة المستخدمين' },
    ],
  },
  {
    id: 'reports',
    title: 'التقارير',
    description: 'الوصول للتقارير والتحليلات',
    icon: <BarChart3 className="h-5 w-5" />,
    color: 'bg-pink-500/10 text-pink-600 border-pink-200',
    permissions: [
      { key: 'viewReports', label: 'عرض التقارير' },
      { key: 'viewFinancialReports', label: 'التقارير المالية' },
      { key: 'viewSalesReports', label: 'تقارير المبيعات' },
      { key: 'viewInventoryReports', label: 'تقارير المخزون' },
    ],
  },
  {
    id: 'settings',
    title: 'الإعدادات',
    description: 'الوصول لإعدادات النظام',
    icon: <Settings className="h-5 w-5" />,
    color: 'bg-slate-500/10 text-slate-600 border-slate-200',
    permissions: [
      { key: 'viewSettings', label: 'عرض الإعدادات' },
      { key: 'manageProfileSettings', label: 'إعدادات الملف الشخصي' },
      { key: 'manageAppearanceSettings', label: 'إعدادات المظهر' },
      { key: 'manageSecuritySettings', label: 'إعدادات الأمان' },
      { key: 'manageNotificationSettings', label: 'إعدادات الإشعارات' },
      { key: 'manageOrganizationSettings', label: 'إعدادات المؤسسة' },
      { key: 'manageBillingSettings', label: 'إعدادات الفوترة' },
      { key: 'manageIntegrations', label: 'التكاملات' },
      { key: 'manageAdvancedSettings', label: 'الإعدادات المتقدمة' },
    ],
  },
  {
    id: 'flexi',
    title: 'الفليكسي والعملات الرقمية',
    description: 'خدمات الشحن والعملات',
    icon: <CreditCard className="h-5 w-5" />,
    color: 'bg-teal-500/10 text-teal-600 border-teal-200',
    permissions: [
      { key: 'manageFlexi', label: 'إدارة الفليكسي' },
      { key: 'manageFlexiAndDigitalCurrency', label: 'إدارة العملات الرقمية' },
      { key: 'sellFlexiAndDigitalCurrency', label: 'البيع' },
      { key: 'viewFlexiAndDigitalCurrencySales', label: 'عرض المبيعات' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// المكون الرئيسي
// ═══════════════════════════════════════════════════════════════════════════

const AddEmployeeDialog = ({ onEmployeeAdded }: AddEmployeeDialogProps) => {
  const { toast } = useToast();
  const { organization } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [searchPermission, setSearchPermission] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['pos']);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [permissions, setPermissions] = useState<EmployeePermissions>(defaultPermissions);

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [limitStatus, setLimitStatus] = useState<LimitCheckResponse | null>(null);
  const [isCheckingLimit, setIsCheckingLimit] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // Effects
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const checkLimit = async () => {
      if (!open || !organization?.id) return;
      setIsCheckingLimit(true);
      try {
        const result = await limitChecker.canAddStaff(organization.id);
        setLimitStatus(result);
      } catch (error) {
        console.error('[AddEmployeeDialog] Error checking limit:', error);
        setLimitStatus(null);
      } finally {
        setIsCheckingLimit(false);
      }
    };
    checkLimit();
  }, [open, organization?.id]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Computed Values
  // ═══════════════════════════════════════════════════════════════════════════

  const enabledPermissionsCount = useMemo(() => {
    return Object.values(permissions).filter(Boolean).length;
  }, [permissions]);

  const totalPermissionsCount = Object.keys(defaultPermissions).length;

  const permissionsProgress = (enabledPermissionsCount / totalPermissionsCount) * 100;

  const filteredGroups = useMemo(() => {
    if (!searchPermission.trim()) return permissionGroups;
    const search = searchPermission.toLowerCase();
    return permissionGroups.filter(group =>
      group.title.toLowerCase().includes(search) ||
      group.permissions.some(p => p.label.toLowerCase().includes(search))
    );
  }, [searchPermission]);

  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 25, label: 'ضعيفة', color: 'bg-red-500' };
    if (score <= 3) return { score: 50, label: 'متوسطة', color: 'bg-yellow-500' };
    if (score <= 4) return { score: 75, label: 'جيدة', color: 'bg-blue-500' };
    return { score: 100, label: 'قوية', color: 'bg-green-500' };
  }, [formData.password]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════════════════════════════════

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (name === 'password' || name === 'confirmPassword') {
      if (
        (name === 'password' && formData.confirmPassword && value !== formData.confirmPassword) ||
        (name === 'confirmPassword' && value !== formData.password)
      ) {
        setErrors(prev => ({ ...prev, confirmPassword: 'كلمات المرور غير متطابقة' }));
      } else {
        setErrors(prev => ({ ...prev, confirmPassword: '' }));
      }
    }
  };

  const handlePermissionChange = (key: keyof EmployeePermissions, checked: boolean) => {
    setPermissions(prev => ({ ...prev, [key]: checked }));
    setSelectedPreset('custom');
  };

  const handlePresetSelect = (preset: PermissionPreset) => {
    setSelectedPreset(preset.id);
    if (preset.id !== 'custom') {
      setPermissions(prev => ({ ...prev, ...preset.permissions }));
    }
  };

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleAllInGroup = (group: PermissionGroup, enable: boolean) => {
    const updates: Partial<EmployeePermissions> = {};
    group.permissions.forEach(p => {
      updates[p.key] = enable;
    });
    setPermissions(prev => ({ ...prev, ...updates }));
    setSelectedPreset('custom');
  };

  const getGroupEnabledCount = (group: PermissionGroup) => {
    return group.permissions.filter(p => permissions[p.key]).length;
  };

  const validateStep1 = () => {
    const newErrors = {
      name: formData.name.trim() === '' ? 'اسم الموظف مطلوب' : '',
      email: !/^\S+@\S+\.\S+$/.test(formData.email) ? 'البريد الإلكتروني غير صالح' : '',
      phone: formData.phone.trim() !== '' && !/^\d{10,15}$/.test(formData.phone.trim()) ? 'رقم الهاتف غير صالح' : '',
      password: formData.password.length < 8 ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : '',
      confirmPassword: formData.password !== formData.confirmPassword ? 'كلمات المرور غير متطابقة' : ''
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (limitStatus && !limitStatus.allowed) {
      toast({
        title: 'تم الوصول للحد الأقصى',
        description: limitStatus.message,
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const newEmployee = await createEmployeeWithAllPermissions(
        formData.email,
        formData.password,
        {
          name: formData.name,
          phone: formData.phone || null,
          job_title: undefined
        },
        permissions
      );

      toast({
        title: 'تمت الإضافة بنجاح',
        description: `تم إضافة الموظف ${formData.name} مع ${enabledPermissionsCount} صلاحية.`,
      });

      onEmployeeAdded(newEmployee);
      setOpen(false);
      resetForm();
    } catch (error: any) {
      let errorMessage = 'حدث خطأ أثناء إضافة الموظف. الرجاء المحاولة مرة أخرى.';

      if (error?.message) {
        if (error.message.includes('duplicate key') || error.message.includes('User already exists')) {
          errorMessage = 'البريد الإلكتروني مستخدم بالفعل.';
        } else if (error.message.includes('User not allowed') || error.message.includes('Unauthorized')) {
          errorMessage = 'ليس لديك الصلاحية لإنشاء مستخدمين جدد.';
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
    setPermissions(defaultPermissions);
    setErrors({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
    setCurrentStep(1);
    setSelectedPreset('custom');
    setSearchPermission('');
    setExpandedGroups(['pos']);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
          <UserPlus className="h-4 w-4" />
          إضافة موظف جديد
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header مع Progress */}
        <div className="relative">
          {/* خلفية متدرجة */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-10" />

          <DialogHeader className="relative p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl">إضافة موظف جديد</DialogTitle>
                  <DialogDescription>
                    {currentStep === 1 ? 'أدخل البيانات الأساسية للموظف' : 'حدد صلاحيات الموظف'}
                  </DialogDescription>
                </div>
              </div>

              {/* Steps Indicator */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-all",
                  currentStep >= 1
                    ? "bg-orange-500 text-white"
                    : "bg-slate-200 text-slate-500"
                )}>
                  {currentStep > 1 ? <Check className="h-4 w-4" /> : '1'}
                </div>
                <div className={cn(
                  "h-1 w-12 rounded-full transition-all",
                  currentStep >= 2 ? "bg-orange-500" : "bg-slate-200"
                )} />
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-all",
                  currentStep >= 2
                    ? "bg-orange-500 text-white"
                    : "bg-slate-200 text-slate-500"
                )}>
                  2
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* تحذير الحد الأقصى */}
          {limitStatus && !limitStatus.allowed && (
            <Alert variant="destructive" className="mx-6 mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{limitStatus.message}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    window.location.href = '/dashboard/subscription';
                  }}
                >
                  ترقية الخطة
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* معلومات الحد */}
          {limitStatus && limitStatus.allowed && !limitStatus.unlimited && (
            <div className="mx-6 mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>الموظفين: {limitStatus.currentCount} / {limitStatus.maxLimit}</span>
              <Badge variant="secondary" className="text-xs">
                متبقي: {limitStatus.remaining}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Step 1: البيانات الأساسية */}
          {currentStep === 1 && (
            <ScrollArea className="h-[400px] px-6">
              <div className="space-y-6 py-4">
                {/* الاسم */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    اسم الموظف <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="أدخل الاسم الكامل"
                    className={cn(
                      "h-11",
                      errors.name && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <X className="h-3 w-3" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* البريد والهاتف */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      البريد الإلكتروني <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="example@domain.com"
                      className={cn(
                        "h-11",
                        errors.email && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      رقم الهاتف <span className="text-muted-foreground text-xs">(اختياري)</span>
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="0XXXXXXXXX"
                      className={cn(
                        "h-11",
                        errors.phone && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* كلمة المرور */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      كلمة المرور <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="********"
                        className={cn(
                          "h-11 pl-10",
                          errors.password && "border-red-500 focus-visible:ring-red-500"
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {formData.password && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full transition-all", passwordStrength.color)}
                              style={{ width: `${passwordStrength.score}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{passwordStrength.label}</span>
                        </div>
                      </div>
                    )}
                    {errors.password && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      تأكيد كلمة المرور <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="********"
                        className={cn(
                          "h-11 pl-10",
                          errors.confirmPassword && "border-red-500 focus-visible:ring-red-500",
                          formData.confirmPassword && formData.password === formData.confirmPassword && "border-green-500"
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {formData.confirmPassword && formData.password === formData.confirmPassword && (
                      <p className="text-xs text-green-500 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        كلمات المرور متطابقة
                      </p>
                    )}
                    {errors.confirmPassword && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          {/* Step 2: الصلاحيات */}
          {currentStep === 2 && (
            <div className="h-[500px] flex flex-col">
              {/* قوالب الصلاحيات */}
              <div className="px-6 pt-4 pb-3 border-b">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-500" />
                    قوالب سريعة
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>{enabledPermissionsCount} / {totalPermissionsCount} صلاحية</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {permissionPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={cn(
                        "relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center",
                        selectedPreset === preset.id
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                          : "border-transparent bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                    >
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center bg-gradient-to-br text-white",
                        preset.color
                      )}>
                        {preset.icon}
                      </div>
                      <span className="text-xs font-medium">{preset.name}</span>
                      {selectedPreset === preset.id && (
                        <div className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* بحث */}
              <div className="px-6 py-3 border-b">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن صلاحية..."
                    value={searchPermission}
                    onChange={(e) => setSearchPermission(e.target.value)}
                    className="pr-10 h-9"
                  />
                </div>
              </div>

              {/* مجموعات الصلاحيات */}
              <ScrollArea className="flex-1 px-6">
                <div className="py-4 space-y-3">
                  {filteredGroups.map((group) => {
                    const enabledCount = getGroupEnabledCount(group);
                    const isExpanded = expandedGroups.includes(group.id);
                    const allEnabled = enabledCount === group.permissions.length;
                    const someEnabled = enabledCount > 0 && !allEnabled;

                    return (
                      <div
                        key={group.id}
                        className={cn(
                          "border rounded-xl overflow-hidden transition-all",
                          isExpanded && "ring-1 ring-orange-200"
                        )}
                      >
                        {/* Header */}
                        <button
                          type="button"
                          onClick={() => toggleGroupExpanded(group.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-4 text-right transition-colors",
                            isExpanded ? "bg-slate-50 dark:bg-slate-800/50" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          )}
                        >
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center border",
                            group.color
                          )}>
                            {group.icon}
                          </div>
                          <div className="flex-1 text-right">
                            <div className="font-medium">{group.title}</div>
                            <div className="text-xs text-muted-foreground">{group.description}</div>
                          </div>
                          <Badge variant={allEnabled ? "default" : someEnabled ? "secondary" : "outline"}>
                            {enabledCount} / {group.permissions.length}
                          </Badge>
                          <ChevronLeft className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isExpanded && "-rotate-90"
                          )} />
                        </button>

                        {/* Content */}
                        {isExpanded && (
                          <div className="border-t p-4 bg-white dark:bg-slate-900">
                            {/* Toggle All */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b">
                              <span className="text-sm text-muted-foreground">تفعيل/تعطيل الكل</span>
                              <Switch
                                checked={allEnabled}
                                onCheckedChange={(checked) => toggleAllInGroup(group, checked)}
                              />
                            </div>

                            {/* Permissions Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {group.permissions.map((permission) => (
                                <label
                                  key={permission.key}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                    permissions[permission.key]
                                      ? "bg-orange-50 dark:bg-orange-950/20 border border-orange-200"
                                      : "hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent"
                                  )}
                                >
                                  <Checkbox
                                    checked={!!permissions[permission.key]}
                                    onCheckedChange={(checked) =>
                                      handlePermissionChange(permission.key, !!checked)
                                    }
                                  />
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">{permission.label}</div>
                                    {permission.description && (
                                      <div className="text-xs text-muted-foreground">
                                        {permission.description}
                                      </div>
                                    )}
                                  </div>
                                  {permissions[permission.key] && (
                                    <CheckCircle2 className="h-4 w-4 text-orange-500" />
                                  )}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              إلغاء
            </Button>

            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                >
                  <ChevronRight className="h-4 w-4 ml-1" />
                  السابق
                </Button>
              )}

              {currentStep === 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                >
                  التالي
                  <ChevronLeft className="h-4 w-4 mr-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || isCheckingLimit || (limitStatus && !limitStatus.allowed)}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 min-w-[140px]"
                >
                  {isCheckingLimit ? (
                    'جاري التحقق...'
                  ) : isSubmitting ? (
                    'جاري الإضافة...'
                  ) : limitStatus && !limitStatus.allowed ? (
                    'تم الوصول للحد الأقصى'
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 ml-2" />
                      إضافة الموظف
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployeeDialog;
