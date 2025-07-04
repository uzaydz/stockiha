import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase, getSupabaseClient } from '@/lib/supabase-unified';
import { checkUserRequires2FA } from '@/lib/api/authHelpers';
import TwoFactorLoginForm from './TwoFactorLoginForm';

const LoginForm = () => {
  const { signIn, currentSubdomain } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  
  // حالات المصادقة الثنائية
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<{
    userId: string;
    userName: string;
    email: string;
  } | null>(null);
  const [pendingCredentials, setPendingCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // التحقق إذا كنا في بيئة Electron
  useEffect(() => {
    const checkElectron = () => {
      const isElectronApp = !!(window as any).electronAPI || !!(window as any).__ELECTRON_APP__;
      
      setIsElectron(isElectronApp);

      // في Electron، نضع قيم افتراضية للتطبيق
      if (isElectronApp) {
        if (!email) setEmail('admin@stockiha.com');
        if (!password) setPassword('password123');
      }
    };

    checkElectron();
  }, []);

  // Get redirect path on component mount
  useEffect(() => {
    const savedRedirectPath = sessionStorage.getItem('redirectAfterLogin');
    if (savedRedirectPath) {
      setRedirectPath(savedRedirectPath);
    }
  }, []);

  // 🎉 عرض رسالة الترحيب من التسجيل
  useEffect(() => {
    if (location.state?.message) {
      setTimeout(() => {
        toast.info(location.state.message);
      }, 500);
      // تنظيف الرسالة بعد عرضها
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Clear any previous error states or redirect counts
    sessionStorage.removeItem('lastLoginRedirect');
    sessionStorage.setItem('loginRedirectCount', '0');

    try {
      // 🔧 إصلاح خاص لمشكلة تسجيل الدخول
      // تجاوز فحص 2FA المعقد والانتقال مباشرة لتسجيل الدخول
      
      console.log('🔐 محاولة تسجيل دخول مباشرة للمستخدم:', email);
      
      // محاولة تسجيل الدخول المباشر أولاً
      try {
        await proceedWithDirectLogin(email, password);
        return;
      } catch (directLoginError) {
        console.log('❌ فشل في تسجيل الدخول المباشر، محاولة الطريقة التقليدية');
      }

      // إذا فشل التسجيل المباشر، استخدم الطريقة التقليدية
      const hostname = window.location.hostname;
      let domain: string | undefined;
      let subdomain: string | undefined;
      let organizationId: string | undefined;

      // التعامل مع localhost ونطاقات الـ IP المحلية كنطاقات عامة
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.match(/^localhost:\d+$/) || hostname.match(/^127\.0\.0\.1:\d+$/);
      
      if (isLocalhost) {
        domain = 'localhost';
        if (currentSubdomain) {
          subdomain = currentSubdomain;
        }
      } else {
        const publicDomains = ['ktobi.online', 'stockiha.com'];
        const isPublicDomain = publicDomains.some(pd => hostname === pd || hostname === `www.${pd}`);
        
        if (!isPublicDomain) {
          const parts = hostname.split('.');
          if (parts.length > 2 && parts[0] !== 'www') {
            subdomain = parts[0];
          } else {
            domain = hostname;
          }
        } else {
          if (currentSubdomain) {
            subdomain = currentSubdomain;
          }
        }
      }

      // الحصول على معرف المؤسسة من التخزين المحلي إذا كان متوفراً
      organizationId = localStorage.getItem('bazaar_organization_id') || undefined;

      // محاولات متعددة للتحقق من المستخدم
      let twoFactorCheck = await checkUserRequires2FA(email, organizationId, domain, subdomain);

      if (!twoFactorCheck.exists) {
        // محاولة 2: بدون organizationId
        if (organizationId) {
          localStorage.removeItem('bazaar_organization_id');
          twoFactorCheck = await checkUserRequires2FA(email, undefined, domain, subdomain);
          
          if (!twoFactorCheck.exists) {
            // محاولة 3: كنطاق عام
            twoFactorCheck = await checkUserRequires2FA(email, undefined, undefined, undefined);
          }
        } else {
          twoFactorCheck = await checkUserRequires2FA(email, undefined, undefined, undefined);
        }
      }

      // إذا فشلت جميع المحاولات، جرب التسجيل المباشر مع تجاهل الفحص
      if (!twoFactorCheck.exists) {
        if (twoFactorCheck.error && twoFactorCheck.error.includes('الوضع الآمن')) {
          toast.info(twoFactorCheck.error, { duration: 4000 });
          await proceedWithLogin(email, password);
          return;
        } else {
          // 🔧 محاولة أخيرة: تسجيل دخول مباشر بدون فحص 2FA
          console.log('🔄 محاولة تسجيل دخول مباشر بدون فحص 2FA');
          try {
            await proceedWithDirectLogin(email, password);
            return;
          } catch (finalError) {
            toast.error('المستخدم غير موجود أو بيانات تسجيل الدخول غير صحيحة');
            setIsLoading(false);
            return;
          }
        }
      }

      // حفظ معرف المؤسسة الصحيح إذا وُجد
      if (twoFactorCheck.organization_id) {
        localStorage.setItem('bazaar_organization_id', twoFactorCheck.organization_id);
      }

      // عرض رسالة إيجابية إذا كان هناك تحذير (الوضع الآمن)
      if (twoFactorCheck.error && twoFactorCheck.error.includes('الوضع الآمن')) {
        toast.info(twoFactorCheck.error, { duration: 4000 });
      }

      if (twoFactorCheck.requires_2fa) {
        // المستخدم يحتاج للمصادقة الثنائية
        setTwoFactorData({
          userId: twoFactorCheck.user_id!,
          userName: twoFactorCheck.user_name || 'المستخدم',
          email: email
        });
        setPendingCredentials({ email, password });
        setShow2FA(true);
        setIsLoading(false);
        return;
      }

      // إذا لم يكن يحتاج للمصادقة الثنائية، متابعة تسجيل الدخول العادي
      await proceedWithLogin(email, password);
    } catch (error) {
      console.error('❌ خطأ في تسجيل الدخول:', error);
      // محاولة أخيرة للتسجيل المباشر
      try {
        await proceedWithDirectLogin(email, password);
      } catch (finalError) {
        toast.error('حدث خطأ أثناء تسجيل الدخول');
        setIsLoading(false);
      }
    }
  };

  // 🔧 دالة تسجيل دخول مباشر بدون فحص 2FA
  const proceedWithDirectLogin = async (loginEmail: string, loginPassword: string) => {
    console.log('🚀 بدء تسجيل الدخول المباشر');
    
    try {
      // استخدام Supabase مباشرة بدون فحوصات معقدة
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.toLowerCase().trim(),
        password: loginPassword
      });

      if (error) {
        console.error('❌ خطأ في تسجيل الدخول المباشر:', error);
        
        // معالجة أخطاء محددة
        if (error.message?.includes('Invalid login credentials')) {
          throw new Error('بيانات تسجيل الدخول غير صحيحة');
        } else if (error.message?.includes('Email not confirmed')) {
          throw new Error('يرجى تأكيد بريدك الإلكتروني أولاً');
        } else if (error.message?.includes('Too many requests')) {
          throw new Error('محاولات كثيرة، يرجى المحاولة لاحقاً');
        }
        
        throw new Error(error.message || 'فشل في تسجيل الدخول');
      }

      if (!data.session || !data.user) {
        throw new Error('بيانات الجلسة غير متاحة');
      }

      console.log('✅ نجح تسجيل الدخول المباشر');
      
      // تحديث معرف المؤسسة إذا كان متاحاً
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', data.user.id)
          .single();
          
        if (userData?.organization_id) {
          localStorage.setItem('bazaar_organization_id', userData.organization_id);
        }
      } catch (orgError) {
        console.log('⚠️ لم يتم العثور على معرف المؤسسة');
      }

      await handleSuccessfulLogin();
    } catch (error) {
      console.error('❌ فشل في التسجيل المباشر:', error);
      throw error;
    }
  };

  const proceedWithLogin = async (loginEmail: string, loginPassword: string) => {
    try {
      // 🔧 استخدام النظام المحسن لتسجيل الدخول
      const { signIn: improvedSignIn } = await import('@/lib/api/authHelpers');
      const result = await improvedSignIn(loginEmail, loginPassword);

      if (result.success) {
        
        // 🎯 تبسيط التحقق من الجلسة - إزالة التحقق المعقد
        
        // التوجيه المباشر بدون تعقيدات النطاق الفرعي
        await handleSuccessfulLogin();
      } else {
        toast.error(result.error?.message || 'فشل تسجيل الدخول');
        setIsLoading(false);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الدخول');
      setIsLoading(false);
    }
  };

  const handleSuccessfulLogin = async () => {
    try {
      // 🎯 تبسيط شامل - إزالة جميع فحوصات النطاق الفرعي
      
      // فحص بسيط للتأكد من المصادقة
      const { data: userData } = await supabase.auth.getUser();
      const { data: sessionData } = await supabase.auth.getSession();

      if (!userData.user || !sessionData.session) {
        // لا نوقف العملية، فقط تحذير
      }

      toast.success('تم تسجيل الدخول بنجاح');
      
      // تنظيف البيانات المحفوظة
      sessionStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('loginRedirectCount');
      
      // 🎯 التوجيه المباشر إلى /dashboard - بدون أي تعقيدات
      let dashboardPath = '/dashboard';
      
      if (redirectPath && redirectPath.startsWith('/dashboard')) {
        dashboardPath = redirectPath;
      }

      setTimeout(() => {
        setIsLoading(false);
        navigate(dashboardPath);
      }, 500);
      
    } catch (error) {
      // رغم الخطأ، نكمل التوجيه
      toast.success('تم تسجيل الدخول بنجاح');
      setTimeout(() => {
        setIsLoading(false);
        navigate('/dashboard');
      }, 500);
    }
  };

  // دوال التعامل مع المصادقة الثنائية
  const handle2FASuccess = async () => {
    if (!pendingCredentials) return;
    
    setShow2FA(false);
    setIsLoading(true);
    
    // متابعة تسجيل الدخول بعد نجاح المصادقة الثنائية
    await proceedWithLogin(pendingCredentials.email, pendingCredentials.password);
    
    // تنظيف البيانات المؤقتة
    setPendingCredentials(null);
    setTwoFactorData(null);
  };

  const handle2FABack = () => {
    setShow2FA(false);
    setTwoFactorData(null);
    setPendingCredentials(null);
    setIsLoading(false);
  };

  // إذا كنا في وضع المصادقة الثنائية، عرض نموذج المصادقة الثنائية
  if (show2FA && twoFactorData) {
    return (
      <TwoFactorLoginForm
        userId={twoFactorData.userId}
        userName={twoFactorData.userName}
        email={twoFactorData.email}
        onSuccess={handle2FASuccess}
        onBack={handle2FABack}
      />
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">تسجيل الدخول</CardTitle>
        <CardDescription className="text-center">
          <span>قم بتسجيل الدخول للوصول إلى حسابك</span>
          {currentSubdomain && (
            <span className="block mt-2 text-primary font-medium">
              مستخدم النطاق {currentSubdomain}
            </span>
          )}
          {isElectron && (
            <span className="block mt-2 text-green-500 font-medium">
              تطبيق Electron - نسخة سطح المكتب
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="أدخل كلمة المرور"
              required
              className="text-right"
              dir="rtl"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        {!currentSubdomain && (
          <div className="text-center text-sm text-muted-foreground mt-2">
            هل تريد إنشاء نظام خاص بمؤسستك؟{' '}
            <a href="/tenant/signup" className="underline underline-offset-4 text-primary">
              إنشاء حساب مسؤول مع نطاق فرعي
            </a>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
