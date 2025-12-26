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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AddEmployeeDialogProps {
  onEmployeeAdded: (employee: Employee) => void;
  existingEmployees?: Employee[];
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  defaultPermissions,
  permissionPresets,
  permissionGroups,
  PermissionGroup,
  PermissionPreset
} from '@/constants/employeePermissions';
import { Copy } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// المكون الرئيسي
// ═══════════════════════════════════════════════════════════════════════════


const AddEmployeeDialog = ({ onEmployeeAdded, existingEmployees = [] }: AddEmployeeDialogProps) => {
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
            <div className="flex flex-col h-[600px] overflow-hidden">
              {/* Toolbar */}
              <div className="px-6 py-4 border-b space-y-4 bg-background/50 backdrop-blur-sm z-10 shrink-0">
                {/* Quick Actions Card */}
                <div className="bg-muted/30 p-4 rounded-xl border border-dashed flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-orange-500" />
                        أدوات سريعة
                      </h4>
                      <p className="text-xs text-muted-foreground">نسخ الصلاحيات أو استخدام قوالب جاهزة</p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <Select
                        onValueChange={(value) => {
                          const emp = existingEmployees.find(e => e.id === value);
                          if (emp && emp.permissions) {
                            setPermissions({ ...defaultPermissions, ...emp.permissions });
                            setSelectedPreset('custom');
                            toast({
                              title: 'تم النسخ',
                              description: `تم نسخ الصلاحيات من ${emp.name}`,
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="w-full md:w-[240px] h-9 bg-background">
                          <div className="flex items-center gap-2">
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            <SelectValue placeholder="نسخ من موظف..." />
                          </div>
                        </SelectTrigger>
                        <SelectContent align="end">
                          {existingEmployees.filter(e => e.permissions).map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {permissionPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                        className={cn(
                          "flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-all",
                          selectedPreset === preset.id
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background hover:bg-muted text-muted-foreground border-transparent shadow-sm"
                        )}
                      >
                        {preset.id !== 'custom' && <span className="opacity-70">{preset.icon}</span>}
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search & Stats */}
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن صلاحية محددة..."
                      value={searchPermission}
                      onChange={(e) => setSearchPermission(e.target.value)}
                      className="pr-10 h-10"
                    />
                  </div>
                  <div className="flex flex-col w-full md:w-1/3 gap-1.5">
                    <div className="flex justify-between text-xs px-1">
                      <span className="text-muted-foreground">قوة الصلاحيات</span>
                      <span className="font-medium text-orange-600">
                        {Math.round((enabledPermissionsCount / totalPermissionsCount) * 100)}%
                      </span>
                    </div>
                    <Progress value={(enabledPermissionsCount / totalPermissionsCount) * 100} className="h-2" />
                  </div>
                </div>
              </div>

              {/* List */}
              <ScrollArea className="flex-1 bg-muted/10">
                <div className="p-6 space-y-3">
                  <Accordion type="multiple" className="space-y-3" value={expandedGroups} onValueChange={setExpandedGroups}>
                    {filteredGroups.map((group) => {
                      const enabledCount = getGroupEnabledCount(group);
                      const allEnabled = enabledCount === group.permissions.length;
                      const someEnabled = enabledCount > 0 && !allEnabled;
                      const isFullyActive = allEnabled;

                      return (
                        <AccordionItem key={group.id} value={group.id} className="border rounded-xl bg-card overflow-hidden px-0">
                          <div className="flex items-center justify-between p-2 pr-4 relative">
                            <AccordionTrigger className="hover:no-underline py-2 flex-1 group">
                              <div className="flex items-center gap-4 text-right w-full">
                                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center border transition-colors",
                                  isFullyActive ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                  {group.icon}
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-base group-hover:text-primary transition-colors">{group.title}</div>
                                  <div className="text-xs text-muted-foreground">{group.description}</div>
                                </div>
                                <Badge variant={allEnabled ? "default" : someEnabled ? "secondary" : "outline"} className="ml-2">
                                  {enabledCount} / {group.permissions.length}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                          </div>

                          <AccordionContent className="px-4 pb-4 border-t pt-4 bg-muted/5">
                            <div className="flex items-center justify-between mb-4 bg-muted/50 p-2 rounded-lg border border-dashed">
                              <div className="text-sm font-medium text-muted-foreground px-2">خيارات سريعة</div>
                              <div className="flex items-center gap-2">
                                <span className={cn("text-xs transition-colors", allEnabled ? "text-primary font-medium" : "text-muted-foreground")}>
                                  {allEnabled ? 'المجموعة مفعلة بالكامل' : 'تفعيل الكل'}
                                </span>
                                <Switch checked={allEnabled} onCheckedChange={(c) => toggleAllInGroup(group, c)} />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {group.permissions.map((permission) => (
                                <div
                                  key={permission.key}
                                  onClick={() => handlePermissionChange(permission.key, !permissions[permission.key])}
                                  className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all relative group select-none",
                                    permissions[permission.key]
                                      ? "bg-primary/5 border-primary/30 shadow-sm"
                                      : "bg-background hover:bg-muted/50 hover:border-muted-foreground/30"
                                  )}
                                >
                                  <Checkbox
                                    checked={!!permissions[permission.key]}
                                    onCheckedChange={(c) => handlePermissionChange(permission.key, !!c)}
                                    className="mt-1"
                                  />
                                  <div className="flex-1 space-y-1">
                                    <div className="text-sm font-medium flex items-center gap-2">
                                      {permission.label}
                                      {permission.isSensitive && (
                                        <div className="text-orange-500 bg-orange-50 dark:bg-orange-950/30 p-0.5 rounded" title="صلاحية حساسة">
                                          <AlertTriangle className="h-3 w-3" />
                                        </div>
                                      )}
                                    </div>
                                    {permission.description && (
                                      <div className="text-[11px] text-muted-foreground leading-tight">{permission.description}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>

                  {filteredGroups.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>لا توجد نتائج بحث مطابقة للصلاحيات</p>
                    </div>
                  )}
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
