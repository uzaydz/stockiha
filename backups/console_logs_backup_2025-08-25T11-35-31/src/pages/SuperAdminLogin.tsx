import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
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

// Define form validation schema
const formSchema = z.object({
  email: z.string().email({ message: 'يرجى إدخال بريد إلكتروني صحيح' }),
  password: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
});

export default function SuperAdminLogin() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // تحقق من صلاحيات المسؤول الرئيسي
  const checkSuperAdminStatus = async (userId: string) => {
    try {
      console.log('🔍 [SuperAdminLogin] Checking super admin status for user:', userId);
      
      // طريقة 1: استخدام supabase للتحقق مباشرة
      const { data, error } = await supabase
        .from('users')
        .select('is_super_admin, role')
        .eq('id', userId)
        .single();
      
      console.log('🔍 [SuperAdminLogin] Database response:', { data, error });
      
      if (error) {
        console.error('🔍 [SuperAdminLogin] Database error:', error);
        return false;
      }
      
      console.log('🔍 [SuperAdminLogin] User data:', data);
      console.log('🔍 [SuperAdminLogin] is_super_admin value:', data?.is_super_admin);
      console.log('🔍 [SuperAdminLogin] role value:', data?.role);
      
      // العودة true إذا كان is_super_admin صحيح 
      const isSuper = data?.is_super_admin === true;
      console.log('🔍 [SuperAdminLogin] Final result:', isSuper);
      
      return isSuper;
    } catch (error) {
      console.error('🔍 [SuperAdminLogin] Unexpected error in checkSuperAdminStatus:', error);
      return false;
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('🔍 [SuperAdminLogin] Starting login process...');
    setIsLoading(true);
    setLoginError(null);
    
    try {
      // محاولة تسجيل الدخول مباشرة باستخدام Supabase
      console.log('🔍 [SuperAdminLogin] Attempting to sign in with Supabase...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      
      console.log('🔍 [SuperAdminLogin] Sign in response:', { data, error });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data.user) {
        throw new Error('فشل تسجيل الدخول لسبب غير معروف');
      }
      
      console.log('🔍 [SuperAdminLogin] User signed in successfully:', data.user.id);
      
      // التحقق من صلاحيات المسؤول الرئيسي
      console.log('🔍 [SuperAdminLogin] Checking super admin status...');
      const isSuperAdmin = await checkSuperAdminStatus(data.user.id);
      
      console.log('🔍 [SuperAdminLogin] Super admin check result:', isSuperAdmin);
      
      if (!isSuperAdmin) {
        console.log('🔍 [SuperAdminLogin] User is not super admin, signing out...');
        // تسجيل الخروج إذا لم يكن مسؤول رئيسي
        await supabase.auth.signOut();
        throw new Error('ليس لديك صلاحيات للوصول إلى لوحة المسؤول الرئيسي');
      }
      
      console.log('🔍 [SuperAdminLogin] User is super admin');
      
      // إنتظار للتأكد من تحديث AuthContext وإشعار Supabase listeners
      console.log('🔍 [SuperAdminLogin] Waiting for AuthContext to update...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // التأكد من أن الجلسة تم تحديثها
      const { data: updatedSession } = await supabase.auth.getSession();
      console.log('🔍 [SuperAdminLogin] Updated session check:', !!updatedSession.session);
      
      // توجيه المستخدم إلى لوحة المسؤول الرئيسي
      toast({
        title: 'تم تسجيل الدخول بنجاح',
        description: 'مرحباً بك في لوحة المسؤول الرئيسي',
      });
      
      console.log('🔍 [SuperAdminLogin] Navigating to /super-admin...');
      
      // استخدام window.location بدلاً من navigate للتأكد من التحديث الكامل
      window.location.href = '/super-admin';
    } catch (err: any) {
      console.error('🔍 [SuperAdminLogin] Error during login:', err);
      
      // تحسين رسائل الخطأ
      let errorMessage: string;
      
      if (err.message.includes('Invalid login credentials')) {
        errorMessage = 'بيانات تسجيل الدخول غير صحيحة. يرجى التحقق من البريد الإلكتروني وكلمة المرور.';
      } else if (err.message.includes('صلاحيات')) {
        errorMessage = err.message;
      } else {
        errorMessage = 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
      }
      
      setLoginError(errorMessage);
      
      toast({
        variant: 'destructive',
        title: 'فشل تسجيل الدخول',
        description: errorMessage,
      });
    } finally {
      console.log('🔍 [SuperAdminLogin] Login process completed, setting loading to false');
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
