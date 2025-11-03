import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const SignupForm = () => {
  const { signUp, currentSubdomain } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }

    if (password.length < 6) {
      toast.error('يجب أن تكون كلمة المرور 6 أحرف على الأقل');
      return;
    }

    setIsLoading(true);

    try {
      const { success, error } = await signUp(email, password, name);
      
      if (success) {
        toast.success('🎉 تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول للوصول إلى لوحة التحكم');
        
        // 🚀 التوجيه المحسن: إلى تسجيل الدخول مع رسالة واضحة
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'تم إنشاء حسابك بنجاح! قم بتسجيل الدخول للوصول إلى لوحة التحكم',
              shouldRedirectToDashboard: true 
            } 
          });
        }, 1500);
      } else {
        // معالجة أخطاء محددة
        if (error?.message?.includes('User already registered')) {
          toast.error('هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد آخر');
        } else if (error?.message?.includes('Invalid email')) {
          toast.error('البريد الإلكتروني غير صالح');
        } else if (error?.message?.includes('Password should be at least')) {
          toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        } else {
          toast.error(`فشل إنشاء الحساب: ${error?.message || 'حدث خطأ غير متوقع'}`);
        }
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">إنشاء حساب جديد</CardTitle>
        <CardDescription className="text-center">
          {currentSubdomain 
            ? `قم بإدخال بياناتك لإنشاء حساب عميل في ${currentSubdomain}`
            : 'قم بإدخال بياناتك لإنشاء حساب جديد'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {currentSubdomain && (
          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md mb-4 text-sm border border-blue-200 dark:border-blue-800">
            <p className="font-medium text-blue-800 dark:text-blue-400">متجر: {currentSubdomain}</p>
            <p className="text-blue-700 dark:text-blue-300">
              سيتم إنشاء حسابك كعميل في هذا المتجر
            </p>
          </div>
        )}
        
        <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md mb-4 text-sm border border-amber-200 dark:border-amber-800">
          <p className="font-medium text-amber-800 dark:text-amber-400">ملاحظة هامة:</p>
          <p className="text-amber-700 dark:text-amber-300">
            هذا التسجيل مخصص للعملاء فقط. إذا كنت ترغب في الانضمام كموظف، يرجى التواصل مع مسؤول المؤسسة ليقوم بإضافتك.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">الاسم</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسمك الكامل"
              required
              className="text-right"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="أدخل بريدك الإلكتروني"
              required
              className="text-right"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                required
                className="text-right pl-20 pr-10"
                dir="rtl"
                autoComplete="new-password"
                minLength={6}
              />
              {/* أيقونة القفل */}
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              
              {/* زر إظهار/إخفاء كلمة المرور */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:text-blue-500"
                title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                required
                className="text-right pl-20 pr-10"
                dir="rtl"
                autoComplete="new-password"
                minLength={6}
              />
              {/* أيقونة التأكيد */}
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              
              {/* زر إظهار/إخفاء تأكيد كلمة المرور */}
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:text-blue-500"
                title={showConfirmPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showConfirmPassword ? (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="underline underline-offset-4 text-primary">
            تسجيل الدخول
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};

export default SignupForm;
