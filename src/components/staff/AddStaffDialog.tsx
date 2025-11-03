import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Save, Shield, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface AddStaffDialogProps {
  open: boolean;
  onClose: () => void;
  editingStaff?: POSStaffSession | null;
}

export const AddStaffDialog: React.FC<AddStaffDialogProps> = ({
  open,
  onClose,
  editingStaff,
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

    if (!staffName.trim()) {
      errors.push('اسم الموظف مطلوب');
    }

    // التحقق من الإيميل (مطلوب للموظفين الجدد فقط)
    if (!isEdit && !email.trim()) {
      errors.push('الإيميل مطلوب');
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('الإيميل غير صحيح');
    }

    // التحقق من كلمة السر (مطلوبة للموظفين الجدد فقط)
    if (!isEdit && !password) {
      errors.push('كلمة السر مطلوبة');
    }

    if (password && password.length < 6) {
      errors.push('كلمة السر يجب أن تكون 6 أحرف على الأقل');
    }

    if (password && password !== confirmPassword) {
      errors.push('كلمة السر وتأكيد كلمة السر غير متطابقين');
    }

    if (!isEdit && !pinCode) {
      errors.push('كود PIN مطلوب');
    }

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
        updated[perm as keyof StaffPermissions] = !allEnabled;
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEdit ? 'تعديل موظف' : 'إضافة موظف جديد'}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'تعديل بيانات وصلاحيات الموظف'
              : 'إضافة موظف جديد وتحديد صلاحياته'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">البيانات الأساسية</TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="h-4 w-4" />
              الصلاحيات
              {activePermissionsCount > 0 && (
                <Badge variant="secondary" className="mr-1">
                  {activePermissionsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 max-h-[55vh] overflow-y-auto pr-2">
            {/* البيانات الأساسية */}
            <TabsContent value="basic" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="staff-name">
                  اسم الموظف <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="staff-name"
                  placeholder="أدخل اسم الموظف"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                />
              </div>

              {/* حقل الإيميل */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  الإيميل {!isEdit && <span className="text-red-500">*</span>}
                </Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={isEdit ? 'اتركه فارغاً لعدم التغيير' : 'example@email.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10"
                    disabled={isEdit && !!editingStaff?.email}
                  />
                </div>
                {isEdit && editingStaff?.email && (
                  <p className="text-sm text-muted-foreground">
                    لا يمكن تغيير الإيميل بعد إنشاء الحساب
                  </p>
                )}
              </div>

              {/* حقل كلمة السر */}
              {!isEdit && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      كلمة السر <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="أدخل كلمة السر (6 أحرف على الأقل)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {password && password.length < 6 && (
                      <p className="text-sm text-yellow-600">
                        كلمة السر يجب أن تكون 6 أحرف على الأقل ({password.length}/6)
                      </p>
                    )}
                  </div>

                  {password && (
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">
                        تأكيد كلمة السر <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="أعد إدخال كلمة السر"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute left-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-sm text-red-600">كلمة السر غير متطابقة</p>
                      )}
                    </div>
                  )}
                </>
              )}

              <Separator className="my-4" />

              <div className="space-y-2">
                <Label htmlFor="pin-code">
                  كود PIN (أرقام فقط) {!isEdit && <span className="text-red-500">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="pin-code"
                    type={showPin ? 'text' : 'password'}
                    placeholder={isEdit ? 'اتركه فارغاً لعدم التغيير' : 'أدخل كود PIN (6 أرقام)'}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPin(!showPin)}
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {pinCode && pinCode.length !== 6 && (
                  <p className="text-sm text-yellow-600">كود PIN يجب أن يكون 6 أرقام بالضبط ({pinCode.length}/6)</p>
                )}
              </div>

              {pinCode && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-pin">
                    تأكيد كود PIN <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-pin"
                      type={showConfirmPin ? 'text' : 'password'}
                      placeholder="أعد إدخال كود PIN"
                      value={confirmPinCode}
                      onChange={(e) => setConfirmPinCode(e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowConfirmPin(!showConfirmPin)}
                    >
                      {showConfirmPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {confirmPinCode && pinCode !== confirmPinCode && (
                    <p className="text-sm text-red-600">كود PIN غير متطابق</p>
                  )}
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="is-active">حالة الموظف</Label>
                  <p className="text-sm text-muted-foreground">
                    {isActive ? 'الموظف نشط ويمكنه تسجيل الدخول' : 'الموظف معطل ولا يمكنه تسجيل الدخول'}
                  </p>
                </div>
                <Switch
                  id="is-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </TabsContent>

            {/* الصلاحيات */}
            <TabsContent value="permissions" className="space-y-4 mt-0">
              {/* Presets */}
              <div className="space-y-2">
                <Label>القوالب الجاهزة</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                    <Button
                      key={key}
                      variant={selectedPreset === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleApplyPreset(key)}
                      className="justify-start text-right"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{preset.label}</div>
                        <div className="text-xs text-muted-foreground">{preset.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* مصمم الصلاحيات الموحّد */}
              <PermissionsDesignerPanel
                perms={permissions as any}
                onChange={(next) => setPermissions(next as StaffPermissions)}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* أخطاء التحقق */}
        {validationErrors.length > 0 && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <ul className="list-disc space-y-1 pr-4">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* الأزرار */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!isValid || saveMutation.isPending}
            className="flex-1 gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة الموظف'}
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
