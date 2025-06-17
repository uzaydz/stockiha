import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
        toast.success('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول الآن');
        
        // التوجيه بناءً على النطاق الفرعي
        if (currentSubdomain) {
          // إذا كنا في نطاق فرعي، نوجه إلى تسجيل الدخول مع الاحتفاظ بالنطاق
          navigate('/login');
        } else {
          // إذا كنا في النطاق الرئيسي، نوجه إلى تسجيل الدخول
          navigate('/login');
        }
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
      console.error('Signup error:', error);
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
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
              required
              className="text-right"
              dir="rtl"
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="أعد إدخال كلمة المرور"
              required
              className="text-right"
              dir="rtl"
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{' '}
          <a href="/login" className="underline underline-offset-4 text-primary">
            تسجيل الدخول
          </a>
        </div>
      </CardFooter>
    </Card>
  );
};

export default SignupForm;
