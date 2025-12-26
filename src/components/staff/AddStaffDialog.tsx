import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Save, Shield, Eye, EyeOff, Mail, Lock, Copy, Sparkles, UserPlus, Wrench, AlertTriangle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { staffService } from '@/services/staffService';
import type { POSStaffSession, StaffPermissions, SaveStaffSessionInput } from '@/types/staff';
import { PERMISSION_PRESETS } from '@/types/staff';
import { PermissionsDesignerPanel } from '@/components/staff/PermissionsDesignerDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddStaffDialogProps {
  open: boolean;
  onClose: () => void;
  editingStaff?: POSStaffSession | null;
  existingStaff?: POSStaffSession[];
}

export const AddStaffDialog: React.FC<AddStaffDialogProps> = ({
  open,
  onClose,
  editingStaff,
  existingStaff = [],
}) => {
  const queryClient = useQueryClient();
  const isEdit = !!editingStaff;

  // الحالة
  const [staffName, setStaffName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [confirmPinCode, setConfirmPinCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState<StaffPermissions>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  // تهيئة البيانات عند التعديل
  useEffect(() => {
    if (editingStaff && open) {
      setStaffName(editingStaff.staff_name);
      setEmail(editingStaff.email || '');
      setPassword('');
      setConfirmPassword('');
      setPinCode('');
      setConfirmPinCode('');
      setIsActive(editingStaff.is_active);

      // استخدم صلاحيات الموظف كما هي (لشمل جميع المفاتيح المتقدمة)
      setPermissions((editingStaff.permissions || {}) as StaffPermissions);
      setSelectedPreset('');
    } else if (!open) {
      // إعادة تعيين عند الإغلاق
      setStaffName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setPinCode('');
      setConfirmPinCode('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setShowPin(false);
      setShowConfirmPin(false);
      setIsActive(true);
      setPermissions({});
      setSelectedPreset('');
    }
  }, [editingStaff, open]);

  // حفظ الموظف (إنشاء مع Auth أو تحديث عادي)
  const saveMutation = useMutation({
    mutationFn: async (input: SaveStaffSessionInput) => {
      // إذا كان موظف جديد ولديه إيميل وكلمة سر، استخدم createStaffWithAuth
      if (!input.id && input.email && input.password) {
        return staffService.createStaffWithAuth({
          email: input.email,
          password: input.password,
          staff_name: input.staff_name,
          pin_code: input.pin_code!,
          permissions: input.permissions,
          is_active: input.is_active,
        });
      }
      // وإلا استخدم الطريقة العادية
      return staffService.save(input);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(
          data.action === 'created'
            ? 'تم إضافة الموظف بنجاح'
            : 'تم تحديث الموظف بنجاح'
        );
        queryClient.invalidateQueries({ queryKey: ['pos-staff-sessions'] });
        onClose();
      } else {
        toast.error(data.error || 'فشل حفظ الموظف');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء حفظ الموظف');
    },
  });

  // التحقق من الصحة
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    // if (!staffName.trim()) {
    //   errors.push('اسم الموظف مطلوب');
    // }

    // التحقق من الإيميل (مطلوب للموظفين الجدد فقط)
    // if (!isEdit && !email.trim()) {
    //   errors.push('الإيميل مطلوب');
    // }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('الإيميل غير صحيح');
    }

    // التحقق من كلمة السر (مطلوبة للموظفين الجدد فقط)
    // if (!isEdit && !password) {
    //   errors.push('كلمة السر مطلوبة');
    // }

    if (password && password.length < 6) {
      errors.push('كلمة السر يجب أن تكون 6 أحرف على الأقل');
    }

    if (password && password !== confirmPassword) {
      errors.push('كلمة السر وتأكيد كلمة السر غير متطابقين');
    }

    // if (!isEdit && !pinCode) {
    //   errors.push('كود PIN مطلوب');
    // }

    if (pinCode && pinCode.length !== 6) {
      errors.push('كود PIN يجب أن يكون 6 أرقام بالضبط');
    }

    if (pinCode && !/^\d+$/.test(pinCode)) {
      errors.push('كود PIN يجب أن يحتوي على أرقام فقط');
    }

    if (pinCode && pinCode !== confirmPinCode) {
      errors.push('كود PIN وتأكيد كود PIN غير متطابقين');
    }

    return errors;
  }, [staffName, email, password, confirmPassword, pinCode, confirmPinCode, isEdit]);

  const isValid = validationErrors.length === 0;

  // معالجة الحفظ
  const handleSave = useCallback(() => {
    if (!isValid) {
      toast.error(validationErrors[0]);
      return;
    }

    const input: SaveStaffSessionInput = {
      id: editingStaff?.id,
      staff_name: staffName.trim(),
      email: email.trim() || undefined,
      password: password || undefined,
      pin_code: pinCode || undefined,
      permissions,
      is_active: isActive,
    };

    saveMutation.mutate(input);
  }, [isValid, validationErrors, editingStaff, staffName, email, password, pinCode, permissions, isActive, saveMutation]);

  // تطبيق preset
  const handleApplyPreset = useCallback((presetKey: string) => {
    const preset = PERMISSION_PRESETS[presetKey as keyof typeof PERMISSION_PRESETS];
    if (preset) {
      setPermissions({ ...preset.permissions });
      setSelectedPreset(presetKey);
      toast.success(`تم تطبيق: ${preset.label}`);
    }
  }, []);

  // نسخ من موظف آخر
  const handleCopyFromStaff = useCallback((staffId: string) => {
    const staff = existingStaff.find(s => s.id === staffId);
    if (staff && staff.permissions) {
      setPermissions({ ...staff.permissions } as StaffPermissions);
      setSelectedPreset('');
      toast.success(`تم نسخ الصلاحيات من ${staff.staff_name}`);
    }
  }, [existingStaff]);

  // تبديل صلاحية واحدة
  const handleTogglePermission = useCallback((key: keyof StaffPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSelectedPreset(''); // إلغاء اختيار preset عند التعديل اليدوي
  }, []);

  // تبديل جميع الصلاحيات في مجموعة
  const handleToggleGroup = useCallback((groupPermissions: readonly string[]) => {
    const allEnabled = groupPermissions.every((perm) => permissions[perm as keyof StaffPermissions]);

    setPermissions((prev) => {
      const updated = { ...prev };
      groupPermissions.forEach((perm) => {
        (updated as any)[perm] = !allEnabled;
      });
      return updated;
    });
    setSelectedPreset('');
  }, [permissions]);

  // عدد الصلاحيات النشطة
  const activePermissionsCount = useMemo(() => {
    return Object.values(permissions).filter((v) => v === true).length;
  }, [permissions]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0" dir="rtl">
        {/* Header */}
        <DialogHeader className="p-6 py-4 border-b bg-muted/10 shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
            {isEdit ? <Wrench className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            {isEdit ? 'تعديل بيانات الموظف والصلاحيات' : 'إضافة موظف جديد'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80">
            {isEdit
              ? 'تحديث الملف الشخصي للموظف وإدارة صلاحيات النظام الخاصة به.'
              : 'قم بإنشاء حساب موظف جديد وتعيين مستوى الوصول المناسب.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/20 border">
              <TabsTrigger value="basic" className="h-9 gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-300">
                البيانات الأساسية
              </TabsTrigger>
              <TabsTrigger value="permissions" className="h-9 gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-300">
                <Shield className="h-3.5 w-3.5" />
                الصلاحيات والوصول
                {activePermissionsCount > 0 && (
                  <Badge variant="secondary" className="mr-1 h-5 px-1.5 min-w-[1.25rem] bg-orange-100 text-orange-700 hover:bg-orange-100">
                    {activePermissionsCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* البيانات الأساسية */}
            <TabsContent value="basic" className="space-y-6 mt-0 p-6 pt-4 animate-in fade-in-50 duration-300">

              {/* Personal Information & Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Personal Info */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">المعلومات الشخصية</h3>
                      <p className="text-[11px] text-muted-foreground">البيانات التعريفية للموظف في النظام</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="staff-name" className="text-xs font-medium text-foreground/80">
                        الاسم الكامل
                      </Label>
                      <div className="relative group">
                        <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="staff-name"
                          placeholder="مثال: محمد أحمد"
                          value={staffName}
                          onChange={(e) => setStaffName(e.target.value)}
                          className="pr-10 h-10 bg-background/50 border-input/60 hover:border-input focus:bg-background transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-medium text-foreground/80">
                        البريد الإلكتروني
                      </Label>
                      <div className="relative group">
                        <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={isEdit ? 'البريد المسجل' : 'name@company.com'}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pr-10 h-10 bg-background/50 border-input/60 hover:border-input focus:bg-background transition-all"
                          disabled={isEdit && !!editingStaff?.email}
                        />
                      </div>
                      {isEdit && editingStaff?.email && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-600/80 bg-amber-50 dark:bg-amber-900/10 p-1.5 rounded-md w-fit">
                          <Lock className="h-3 w-3" />
                          <span>لا يمكن تعديل البريد للحسابات النشطة</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Status */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">حالة الحساب</h3>
                      <p className="text-[11px] text-muted-foreground">صلاحية الدخول للنظام</p>
                    </div>
                  </div>

                  <div className={cn(
                    "border rounded-xl p-4 flex flex-col gap-3 transition-all duration-300",
                    isActive ? "bg-green-50/50 border-green-200 dark:bg-green-900/5 dark:border-green-900/30" : "bg-red-50/50 border-red-200 dark:bg-red-900/5 dark:border-red-900/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is-active" className="text-sm font-semibold cursor-pointer">
                        {isActive ? 'الحساب نشط' : 'الحساب معطل'}
                      </Label>
                      <Switch
                        id="is-active"
                        checked={isActive}
                        onCheckedChange={setIsActive}
                        className="data-[state=checked]:bg-green-600"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {isActive
                        ? 'يستطيع الموظف تسجيل الدخول والقيام بمهامه بشكل طبيعي.'
                        : 'لن يتمكن الموظف من الوصول للنظام تماماً حتى يتم تفعيل الحساب.'}
                    </p>
                  </div>
                </div>

              </div>

              {/* Separator with Text */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">بيانات الدخول والأمان</span>
                </div>
              </div>

              {/* Security Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Password Section - Only for New Users */}
                {!isEdit && (
                  <div className="space-y-3 bg-card border rounded-xl p-4 shadow-sm relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors" />
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                      <h4 className="font-medium text-sm">كلمة المرور</h4>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-[11px] text-muted-foreground">كلمة السر الجديدة</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="******"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-10 h-9 text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>

                      {password && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                          <Label htmlFor="confirm-password" className="text-[11px] text-muted-foreground">تأكيد كلمة المرور</Label>
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="******"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={cn("h-9 text-sm", confirmPassword && password !== confirmPassword ? "border-red-300 focus-visible:ring-red-300" : "")}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PIN Code Section */}
                <div className={cn(
                  "space-y-3 bg-card border rounded-xl p-4 shadow-sm relative group overflow-hidden transition-all duration-300",
                  !isEdit ? "" : "col-span-1 md:col-span-2 lg:col-span-1"
                )}>
                  {/* Visual accent if Edit mode and password hidden to fill space appropriately? No, just keep standard */}
                  <div className="absolute top-0 right-0 w-1 h-full bg-orange-500/50 group-hover:bg-orange-500 transition-colors" />
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-600">
                      <Shield className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <h4 className="font-medium text-sm">رمز المرور (PIN)</h4>
                      <span className="text-[10px] text-muted-foreground">للدخول السريع لنظام الكاشير</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="pin-code" className="text-[11px] text-muted-foreground">رمز الدخول (6 أرقام)</Label>
                      <div className="relative">
                        <Input
                          id="pin-code"
                          type={showPin ? 'text' : 'password'}
                          placeholder="000000"
                          value={pinCode}
                          onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                          maxLength={6}
                          className="pr-10 h-9 font-mono tracking-widest text-center text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPin(!showPin)}
                        >
                          {showPin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>

                    {pinCode && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                        <Label htmlFor="confirm-pin" className="text-[11px] text-muted-foreground">تأكيد الرمز</Label>
                        <Input
                          id="confirm-pin"
                          type={showConfirmPin ? 'text' : 'password'}
                          placeholder="000000"
                          value={confirmPinCode}
                          onChange={(e) => setConfirmPinCode(e.target.value.replace(/\D/g, ''))}
                          maxLength={6}
                          className={cn("h-9 font-mono tracking-widest text-center text-sm", confirmPinCode && pinCode !== confirmPinCode ? "border-red-300 focus-visible:ring-red-300" : "")}
                        />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </TabsContent>

            {/* الصلاحيات */}
            <TabsContent value="permissions" className="flex flex-col space-y-4 mt-0 p-6 pt-4">
              {/* أدوات سريعة */}
              <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-dashed flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-500" />
                    قوالب الصلاحيات
                  </h4>
                  <p className="text-xs text-muted-foreground">اختر نموذجاً جاهزاً للبدء بسرعة</p>
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <div className="relative group">
                    <Select onValueChange={handleCopyFromStaff}>
                      <SelectTrigger className="h-8 w-[140px] text-xs bg-background">
                        <SelectValue placeholder="نسخ من..." />
                      </SelectTrigger>
                      <SelectContent align="end">
                        {existingStaff.filter(s => s.id !== editingStaff?.id).map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.staff_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="h-8 w-px bg-border mx-1 hidden sm:block"></div>
                  {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                    <Button
                      key={key}
                      variant={selectedPreset === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleApplyPreset(key)}
                      className={cn(
                        "h-8 text-xs transition-all",
                        selectedPreset === key ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* مصمم الصلاحيات */}
              <div className="flex-1 min-h-[400px]">
                <PermissionsDesignerPanel
                  perms={permissions as any}
                  onChange={(next) => setPermissions(next as StaffPermissions)}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer actions */}
        <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-3">
          {validationErrors.length > 0 && (
            <div className="rounded-md bg-red-50/80 px-3 py-2 text-xs text-red-600 border border-red-100 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <ul className="list-disc pr-4 space-y-0.5">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="h-10 min-w-[100px] border-slate-300 data-[state=open]:bg-transparent">
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid || saveMutation.isPending}
              className={cn(
                "h-10 flex-1 shadow-sm transition-all text-base",
                isEdit ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              {saveMutation.isPending ? (
                <>
                  <span className="animate-spin ml-2">⏳</span> جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  {isEdit ? 'حفظ التغييرات' : 'إضافة الموظف الآن'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
