import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

const ResetPasswordPage: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });

  const [passwords, setPasswords] = useState({
    new: '',
    confirm: ''
  });

  const [requirements, setRequirements] = useState<PasswordRequirements>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  // التحقق من وجود session صالحة
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('رابط إعادة التعيين غير صالح أو منتهي الصلاحية');
        router.push('/login');
      }
    };

    checkSession();
  }, [router]);

  // التحقق من متطلبات كلمة المرور
  const checkPasswordRequirements = (password: string): PasswordRequirements => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  };

  // معالجة تغيير كلمة المرور الجديدة
  const handleNewPasswordChange = (value: string) => {
    setPasswords(prev => ({ ...prev, new: value }));
    setRequirements(checkPasswordRequirements(value));
  };

  // التحقق من صحة كلمة المرور
  const isPasswordValid = (): boolean => {
    return Object.values(requirements).every(req => req) && 
           passwords.new === passwords.confirm;
  };

  // معالجة إعادة تعيين كلمة المرور
  const handlePasswordReset = async () => {
    if (!isPasswordValid()) {
      toast.error('يرجى التأكد من صحة جميع البيانات');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) {
        toast.error('فشل في إعادة تعيين كلمة المرور: ' + error.message);
        return;
      }

      toast.success('تم إعادة تعيين كلمة المرور بنجاح');
      
      // إعادة توجيه إلى لوحة التحكم
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  // تبديل إظهار كلمة المرور
  const togglePasswordVisibility = (field: 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Lock className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            إعادة تعيين كلمة المرور
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            قم بإدخال كلمة المرور الجديدة لحسابك
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>كلمة المرور الجديدة</CardTitle>
            <CardDescription>
              اختر كلمة مرور قوية لحماية حسابك
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* تحذير أمني */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                تأكد من استخدام كلمة مرور قوية تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز خاصة
              </AlertDescription>
            </Alert>

            {/* كلمة المرور الجديدة */}
            <div className="space-y-2">
              <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwords.new}
                  onChange={(e) => handleNewPasswordChange(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('new')}
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* متطلبات كلمة المرور */}
            {passwords.new && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">متطلبات كلمة المرور:</Label>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className={`flex items-center gap-2 ${requirements.minLength ? 'text-green-600' : 'text-red-600'}`}>
                    {requirements.minLength ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    8 أحرف على الأقل
                  </div>
                  <div className={`flex items-center gap-2 ${requirements.hasUppercase ? 'text-green-600' : 'text-red-600'}`}>
                    {requirements.hasUppercase ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    حرف كبير واحد على الأقل
                  </div>
                  <div className={`flex items-center gap-2 ${requirements.hasLowercase ? 'text-green-600' : 'text-red-600'}`}>
                    {requirements.hasLowercase ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    حرف صغير واحد على الأقل
                  </div>
                  <div className={`flex items-center gap-2 ${requirements.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                    {requirements.hasNumber ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    رقم واحد على الأقل
                  </div>
                  <div className={`flex items-center gap-2 ${requirements.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
                    {requirements.hasSpecialChar ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    رمز خاص واحد على الأقل
                  </div>
                </div>
              </div>
            )}

            {/* تأكيد كلمة المرور */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwords.confirm}
                  onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('confirm')}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {passwords.confirm && passwords.new !== passwords.confirm && (
                <p className="text-sm text-red-600">كلمات المرور غير متطابقة</p>
              )}
            </div>

            {/* زر إعادة التعيين */}
            <Button
              onClick={handlePasswordReset}
              disabled={!isPasswordValid() || isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري إعادة التعيين...
                </>
              ) : (
                <>
                  إعادة تعيين كلمة المرور
                  <ArrowRight className="h-4 w-4 mr-2" />
                </>
              )}
            </Button>

            {/* رابط العودة */}
            <div className="text-center">
              <Button
                variant="link"
                onClick={() => router.push('/login')}
                className="text-sm"
              >
                العودة إلى تسجيل الدخول
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
