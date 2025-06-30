import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Key
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

const PasswordSettings: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [passwords, setPasswords] = useState({
    current: '',
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
           passwords.new === passwords.confirm &&
           passwords.current.length > 0;
  };

  // معالجة تغيير كلمة المرور
  const handlePasswordChange = async () => {
    if (!isPasswordValid()) {
      toast.error('يرجى التأكد من صحة جميع البيانات');
      return;
    }

    setIsLoading(true);
    try {
      // التحقق من كلمة المرور الحالية أولاً
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwords.current
      });

      if (signInError) {
        toast.error('كلمة المرور الحالية غير صحيحة');
        setIsLoading(false);
        return;
      }

      // تغيير كلمة المرور
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (updateError) {
        toast.error('فشل في تغيير كلمة المرور: ' + updateError.message);
        return;
      }

      // إعادة تعيين النموذج
      setPasswords({
        current: '',
        new: '',
        confirm: ''
      });
      setRequirements({
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false
      });

      toast.success('تم تغيير كلمة المرور بنجاح');
    } catch (error) {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  // إرسال رابط إعادة تعيين كلمة المرور
  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast.error('البريد الإلكتروني غير متوفر');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        toast.error('فشل في إرسال رابط إعادة التعيين: ' + error.message);
        return;
      }

      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
    } catch (error) {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  // تبديل إظهار كلمة المرور
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="space-y-6">
      {/* بطاقة تغيير كلمة المرور */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            تغيير كلمة المرور
          </CardTitle>
          <CardDescription>
            قم بتحديث كلمة المرور الخاصة بك لضمان أمان حسابك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* تحذير أمني */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              تأكد من استخدام كلمة مرور قوية تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز خاصة
            </AlertDescription>
          </Alert>

          {/* كلمة المرور الحالية */}
          <div className="space-y-2">
            <Label htmlFor="current-password">كلمة المرور الحالية</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showPasswords.current ? "text" : "password"}
                value={passwords.current}
                onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                placeholder="أدخل كلمة المرور الحالية"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePasswordVisibility('current')}
              >
                {showPasswords.current ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Separator />

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
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
            <Label htmlFor="confirm-password">تأكيد كلمة المرور الجديدة</Label>
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

          {/* أزرار العمل */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handlePasswordChange}
              disabled={!isPasswordValid() || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  تغيير كلمة المرور
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handlePasswordReset}
              disabled={isLoading}
              className="flex-1"
            >
              إرسال رابط إعادة التعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* نصائح الأمان */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            نصائح الأمان
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
              <span>استخدم كلمة مرور فريدة لا تستخدمها في مواقع أخرى</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
              <span>تجنب استخدام معلومات شخصية في كلمة المرور</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
              <span>قم بتغيير كلمة المرور بانتظام</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
              <span>لا تشارك كلمة المرور مع أي شخص آخر</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordSettings;
