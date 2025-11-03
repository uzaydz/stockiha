import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, Shield, Loader2, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useStaffSession } from '@/context/StaffSessionContext';
import { staffService } from '@/services/staffService';
import { useAuth } from '@/context/AuthContext';
import { saveStaffPinOffline, verifyStaffPinOffline } from '@/lib/offline/staffCredentials';

const StaffLogin: React.FC = () => {
  const navigate = useNavigate();
  const { setStaffSession, setAdminMode } = useStaffSession();
  const { signOut, organization } = useAuth();
  
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // التركيز على أول حقل عند التحميل
  useEffect(() => {
    if (!isAdminLogin) {
      inputRefs[0].current?.focus();
    }
  }, [isAdminLogin]);

  // معالجة إدخال PIN
  const handlePinChange = useCallback(
    (index: number, value: string) => {
      // السماح بالأرقام فقط
      if (value && !/^\d$/.test(value)) return;

      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);

      // الانتقال للحقل التالي تلقائياً
      if (value && index < 5) {
        inputRefs[index + 1].current?.focus();
      }

      // إذا تم إدخال 6 أرقام، تحقق تلقائياً
      if (index === 5 && value) {
        const fullPin = newPin.join('');
        if (fullPin.length === 6) {
          handleVerifyPin(fullPin);
        }
      }
    },
    [pin]
  );

  // معالجة حذف الرقم
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !pin[index] && index > 0) {
        inputRefs[index - 1].current?.focus();
      }
    },
    [pin]
  );

  // التحقق من PIN
  const handleVerifyPin = useCallback(
    async (pinCode: string) => {
      if (pinCode.length !== 6) {
        toast.error('الرجاء إدخال 6 أرقام');
        return;
      }

      setIsLoading(true);
      try {
        // إذا كنا أوفلاين، جرّب الأوفلاين مباشرة
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          if (!organization?.id) throw new Error('لا يمكن التحقق بدون معرف المؤسسة');
          const off = await verifyStaffPinOffline({ organizationId: organization.id, pin: pinCode });
          if (off.success && off.staff) {
            toast.success(`مرحباً ${off.staff.staff_name}! (أوفلاين)`);
            setStaffSession({
              id: off.staff.id,
              organization_id: off.staff.organization_id,
              staff_name: off.staff.staff_name,
              permissions: (off.staff.permissions || {}) as any,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              email: undefined,
              last_login: new Date().toISOString(),
            } as any);
            setAdminMode(false);
            navigate('/dashboard/pos-dashboard');
            return;
          } else {
            throw new Error('لا يمكن التحقق من كود PIN في وضع الأوفلاين');
          }
        }

        // أونلاين: تحقق من السيرفر
        const result = await staffService.verifyPin(pinCode);

        if (result.success && result.staff) {
          toast.success(`مرحباً ${result.staff.staff_name}!`);
          setStaffSession(result.staff);
          setAdminMode(false);
          // حفظ بيانات PIN للأوفلاين (بشكل مُشفّر)
          try {
            if (organization?.id && result.staff?.id) {
              await saveStaffPinOffline({
                staffId: result.staff.id,
                organizationId: organization.id,
                staffName: result.staff.staff_name,
                pin: pinCode,
                permissions: result.staff.permissions,
              });
            }
          } catch {}
          
          // التوجيه إلى لوحة التحكم
          navigate('/dashboard/pos-dashboard');
        } else {
          toast.error(result.error || 'كود PIN غير صحيح');
          // مسح الحقول
          setPin(['', '', '', '', '', '']);
          inputRefs[0].current?.focus();
        }
      } catch (error: any) {
        // فالباك: إذا كان الخطأ مرتبطاً بالشبكة، جرّب الأوفلاين إن أمكن
        const message = String(error?.message || '').toLowerCase();
        if ((message.includes('network') || message.includes('fetch') || message.includes('offline')) && organization?.id) {
          const off = await verifyStaffPinOffline({ organizationId: organization.id, pin: pinCode });
          if (off.success && off.staff) {
            toast.success(`مرحباً ${off.staff.staff_name}! (أوفلاين)`);
            setStaffSession({
              id: off.staff.id,
              organization_id: off.staff.organization_id,
              staff_name: off.staff.staff_name,
              permissions: (off.staff.permissions || {}) as any,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              email: undefined,
              last_login: new Date().toISOString(),
            } as any);
            setAdminMode(false);
            navigate('/dashboard/pos-dashboard');
          } else {
            toast.error('تعذر التحقق من كود PIN في وضع الأوفلاين');
          }
        } else {
          toast.error(error.message || 'حدث خطأ أثناء التحقق من كود PIN');
        }
        setPin(['', '', '', '', '', '']);
        inputRefs[0].current?.focus();
      } finally {
        setIsLoading(false);
      }
    },
    [setStaffSession, setAdminMode, navigate, organization?.id]
  );

  // تسجيل دخول كأدمن
  const handleAdminLogin = useCallback(async () => {
    if (!adminPassword) {
      toast.error('الرجاء إدخال كلمة المرور');
      return;
    }

    setIsLoading(true);
    try {
      // هنا نحتاج للتحقق من كلمة مرور الأدمن
      // في الوقت الحالي، نفترض أن المستخدم مسجل دخول بالفعل
      // لذا نعتبره أدمن مباشرة
      setAdminMode(true);
      toast.success('تم تسجيل الدخول كمدير بنجاح');
      navigate('/dashboard/pos-dashboard');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  }, [adminPassword, setAdminMode, navigate]);

  // تسجيل الخروج
  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    }
  }, [signOut, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {isAdminLogin ? (
              <Shield className="h-8 w-8 text-primary" />
            ) : (
              <Users className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isAdminLogin ? 'تسجيل دخول المدير' : 'تسجيل دخول الموظف'}
          </CardTitle>
          <CardDescription>
            {isAdminLogin
              ? 'أدخل كلمة المرور الخاصة بك للمتابعة'
              : 'أدخل كود PIN الخاص بك (4 أرقام)'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!isAdminLogin ? (
            <>
              {/* إدخال PIN */}
              <div className="flex justify-center gap-3">
                {pin.map((digit, index) => (
                  <Input
                    key={index}
                    ref={inputRefs[index]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading}
                    className="h-16 w-16 text-center text-2xl font-bold"
                  />
                ))}
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري التحقق...</span>
                </div>
              )}

              <Separator />

              {/* خيار تسجيل دخول كأدمن */}
              <Button
                variant="outline"
                onClick={() => setIsAdminLogin(true)}
                className="w-full gap-2"
                disabled={isLoading}
              >
                <Shield className="h-4 w-4" />
                تسجيل دخول كمدير
              </Button>
            </>
          ) : (
            <>
              {/* تسجيل دخول الأدمن */}
              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="كلمة المرور"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAdminLogin();
                      }
                    }}
                    disabled={isLoading}
                    className="pr-10"
                    autoFocus
                  />
                </div>

                <Button
                  onClick={handleAdminLogin}
                  disabled={isLoading || !adminPassword}
                  className="w-full gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      تسجيل الدخول
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              {/* العودة لخيار PIN */}
              <Button
                variant="ghost"
                onClick={() => {
                  setIsAdminLogin(false);
                  setAdminPassword('');
                }}
                className="w-full"
                disabled={isLoading}
              >
                العودة لتسجيل دخول الموظف
              </Button>
            </>
          )}

          <Separator />

          {/* تسجيل الخروج */}
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="w-full"
            disabled={isLoading}
          >
            تسجيل خروج من الحساب
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffLogin;
