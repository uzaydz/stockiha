import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Shield, Eye, EyeOff, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { loginRateLimiter, formatRemainingTime } from '@/lib/utils/rateLimit';
import { isElectron } from '@/lib/utils/electronSecurity';

// Define form validation schema with stronger password requirements
const formSchema = z.object({
  email: z.string().email({ message: 'يرجى إدخال بريد إلكتروني صحيح' }),
  password: z.string()
    .min(12, { message: 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل' })
    .regex(/[a-z]/, { message: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل' })
    .regex(/[A-Z]/, { message: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل' })
    .regex(/[0-9]/, { message: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل' })
    .regex(/[@$!%*?&#]/, { message: 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (@$!%*?&#)' })
});

export default function SuperAdminLogin() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ isBlocked: boolean; remainingTime?: number; attemptsLeft?: number } | null>(null);

  // ===== Electron Security: Block Super Admin login in desktop app =====
  useEffect(() => {
    if (isElectron()) {
      toast({
        variant: 'destructive',
        title: 'وصول محظور',
        description: 'تسجيل الدخول كسوبر أدمين غير متاح في تطبيق سطح المكتب',
        duration: 5000,
      });

      // Redirect to home
      navigate('/', { replace: true });
    }
  }, [navigate, toast]);

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // تحقق من صلاحيات المسؤول الرئيسي باستخدام RPC آمن
  const checkSuperAdminStatus = async (userId: string) => {
    try {
      // استخدام RPC function للتحقق الآمن
      const { data, error } = await supabase
        .rpc('get_user_basic_info', { p_auth_user_id: userId });

      if (error) {
        console.error('[SuperAdminLogin] خطأ في التحقق من الصلاحيات:', error);
        return false;
      }

      if (data && data.length > 0) {
        const userData = data[0];
        const isSuper = userData.is_super_admin === true;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[SuperAdminLogin] نتيجة التحقق:', {
            userId,
            isSuperAdmin: isSuper,
            email: userData.email
          });
        }
        
        return isSuper;
      }

      return false;
    } catch (error) {
      console.error('[SuperAdminLogin] خطأ غير متوقع:', error);
      return false;
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setLoginError(null);

    try {
      // Check rate limit before attempting login
      const rateLimitCheck = loginRateLimiter.check(values.email);
      setRateLimitInfo(rateLimitCheck);

      if (rateLimitCheck.isBlocked) {
        const timeRemaining = formatRemainingTime(rateLimitCheck.remainingTime || 0);
        throw new Error(`تم حظر محاولات تسجيل الدخول بشكل مؤقت. يرجى المحاولة بعد ${timeRemaining}`);
      }

      // محاولة تسجيل الدخول مباشرة باستخدام Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        // Record failed attempt
        const rateLimitStatus = loginRateLimiter.recordAttempt(values.email);
        setRateLimitInfo(rateLimitStatus);

        if (rateLimitStatus.isBlocked) {
          const timeRemaining = formatRemainingTime(rateLimitStatus.remainingTime || 0);
          throw new Error(`تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول. تم حظر الحساب لمدة ${timeRemaining}`);
        }

        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('فشل تسجيل الدخول لسبب غير معروف');
      }

      // التحقق من صلاحيات المسؤول الرئيسي باستخدام RPC آمن
      const isSuperAdmin = await checkSuperAdminStatus(data.user.id);

      if (!isSuperAdmin) {
        // Record failed attempt for authorization failure
        const rateLimitStatus = loginRateLimiter.recordAttempt(values.email);
        setRateLimitInfo(rateLimitStatus);

        // تسجيل الخروج إذا لم يكن مسؤول رئيسي
        await supabase.auth.signOut();
        throw new Error('ليس لديك صلاحيات للوصول إلى لوحة المسؤول الرئيسي');
      }

      // Reset rate limit on successful login
      loginRateLimiter.reset(values.email);
      setRateLimitInfo(null);

      if (process.env.NODE_ENV === 'development') {
        console.log('[SuperAdminLogin] تم تسجيل دخول Super Admin بنجاح');
      }

      // إنتظار قصير للتأكد من تحديث AuthContext
      await new Promise(resolve => setTimeout(resolve, 300));

      // توجيه المستخدم إلى لوحة المسؤول الرئيسي
      toast({
        title: 'تم تسجيل الدخول بنجاح',
        description: 'مرحباً بك في لوحة المسؤول الرئيسي',
      });

      // استخدام navigate بدلاً من window.location لتجنب إعادة التحميل
      navigate('/super-admin');
    } catch (err: any) {

      // تحسين رسائل الخطأ - don't expose system details
      let errorMessage: string;

      if (err.message.includes('حظر') || err.message.includes('تجاوز الحد')) {
        errorMessage = err.message;
      } else if (err.message.includes('Invalid login credentials')) {
        errorMessage = 'بيانات تسجيل الدخول غير صحيحة. يرجى التحقق من البريد الإلكتروني وكلمة المرور.';
      } else if (err.message.includes('صلاحيات')) {
        errorMessage = 'ليس لديك صلاحيات للوصول إلى هذه الصفحة.';
      } else {
        errorMessage = 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
        // Only log detailed error in development
        if (process.env.NODE_ENV === 'development') {
          console.error('[SuperAdminLogin] خطأ في تسجيل الدخول:', err);
        }
      }

      setLoginError(errorMessage);

      toast({
        variant: 'destructive',
        title: 'فشل تسجيل الدخول',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 to-background">
      <div className="relative w-full max-w-md space-y-6 rounded-xl border border-border/40 bg-card p-6 shadow-xl">
        {/* Super admin logo */}
        <div className="flex flex-col items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">لوحة المسؤول الرئيسي</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            يرجى تسجيل الدخول للوصول إلى لوحة التحكم الرئيسية
          </p>
        </div>
        
        {/* Rate limit warning */}
        {rateLimitInfo && !rateLimitInfo.isBlocked && rateLimitInfo.attemptsLeft !== undefined && rateLimitInfo.attemptsLeft < 3 && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-500">
            <Clock className="h-4 w-4" />
            <p>تحذير: تبقى لديك {rateLimitInfo.attemptsLeft} محاولة فقط قبل الحظر المؤقت</p>
          </div>
        )}

        {/* Login error alert */}
        {loginError && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p>{loginError}</p>
          </div>
        )}
        
        {/* Login form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <Input
                      dir="ltr"
                      type="email"
                      placeholder="admin@example.com"
                      {...field}
                      disabled={isLoading}
                      className="bg-card"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>كلمة المرور</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        dir="ltr"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...field}
                        disabled={isLoading}
                        className="bg-card"
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>
        </Form>
        
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary underline underline-offset-4">
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
      
      {/* Background pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
    </div>
  );
}
