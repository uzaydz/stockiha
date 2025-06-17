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
      // الحصول على معلومات المؤسسة الحالية
      const hostname = window.location.hostname;
      let domain: string | undefined;
      let subdomain: string | undefined;
      let organizationId: string | undefined;

      // التعامل مع localhost ونطاقات الـ IP المحلية كنطاقات عامة
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.match(/^localhost:\d+$/) || hostname.match(/^127\.0\.0\.1:\d+$/);
      
      if (isLocalhost) {
        // إذا كان النطاق محلي، نستخدم domain='localhost' للإشارة إلى أنه نطاق عام
        domain = 'localhost';
        
        // نستخدم النطاق الفرعي فقط إذا كان محدد بشكل صريح في currentSubdomain
        if (currentSubdomain) {
          subdomain = currentSubdomain;
        }
      } else {
        // للنطاقات المخصصة والعامة
        const publicDomains = ['ktobi.online', 'stockiha.com'];
        const isPublicDomain = publicDomains.some(pd => hostname === pd || hostname === `www.${pd}`);
        
        if (!isPublicDomain) {
          // قد يكون نطاق مخصص أو نطاق فرعي
          const parts = hostname.split('.');
          if (parts.length > 2 && parts[0] !== 'www') {
            // نطاق فرعي (مثل: company.bazaar.com)
            subdomain = parts[0];
          } else {
            // نطاق مخصص (مثل: company.com)
            domain = hostname;
          }
        } else {
          // نطاق عام - لا نمرر domain أو subdomain إلا إذا كان هناك subdomain صريح
          if (currentSubdomain) {
            subdomain = currentSubdomain;
          }
          // domain يبقى undefined للنطاقات العامة
        }
      }

      // الحصول على معرف المؤسسة من التخزين المحلي إذا كان متوفراً
      organizationId = localStorage.getItem('bazaar_organization_id') || undefined;

      // محاولة 1: التحقق مع جميع المعاملات
      let twoFactorCheck = await checkUserRequires2FA(email, organizationId, domain, subdomain);

      if (!twoFactorCheck.exists) {
        // محاولة 2: إذا لم يجد المستخدم مع organizationId، جرب بدون organizationId
        if (organizationId) {
          localStorage.removeItem('bazaar_organization_id'); // امسح organizationId الخاطئ
          twoFactorCheck = await checkUserRequires2FA(email, undefined, domain, subdomain);
          
          if (!twoFactorCheck.exists) {
            // محاولة 3: جرب كنطاق عام (بدون أي معاملات نطاق)
            twoFactorCheck = await checkUserRequires2FA(email, undefined, undefined, undefined);
          }
        } else {
          // محاولة 2 بديلة: جرب كنطاق عام إذا لم يكن هناك organizationId من الأساس
          twoFactorCheck = await checkUserRequires2FA(email, undefined, undefined, undefined);
        }
      }

      // إذا فشلت جميع المحاولات
      if (!twoFactorCheck.exists) {
        if (twoFactorCheck.error) {
          // إذا كان هناك رسالة خطأ تتضمن "الوضع الآمن"، اعرضها كمعلومة وليس خطأ
          if (twoFactorCheck.error.includes('الوضع الآمن')) {
            toast.info(twoFactorCheck.error, { duration: 4000 });
            // متابعة تسجيل الدخول مع الوضع الآمن
            await proceedWithLogin(email, password);
            return;
          } else {
            toast.error(twoFactorCheck.error);
          }
        } else {
          toast.error('المستخدم غير موجود');
        }
        setIsLoading(false);
        return;
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
      toast.error('حدث خطأ أثناء التحقق من متطلبات تسجيل الدخول');
      setIsLoading(false);
    }
  };

  const proceedWithLogin = async (loginEmail: string, loginPassword: string) => {
    try {
      // 🔧 استخدام النظام المحسن لتسجيل الدخول
      const { signIn: improvedSignIn } = await import('@/lib/api/authHelpers');
      const result = await improvedSignIn(loginEmail, loginPassword);

      if (result.success) {
        console.log('✅ [LoginForm] Sign in successful, proceeding...');
        
        // تأخير أقل مع التحقق من الجلسة
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // التحقق من صحة الجلسة قبل المتابعة
        const client = await getSupabaseClient();
        const { data: sessionCheck } = await client.auth.getSession();
        
        if (!sessionCheck.session) {
          throw new Error('جلسة المصادقة غير صالحة');
        }
        
        // بعد تسجيل الدخول، نتحقق إذا كان المستخدم مسؤول متعدد النطاقات
        await handleSuccessfulLogin();
      } else {
        console.error('❌ [LoginForm] Sign in failed:', result.error);
        toast.error(result.error?.message || 'فشل تسجيل الدخول');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ [LoginForm] Login process failed:', error);
      toast.error('حدث خطأ أثناء تسجيل الدخول');
      setIsLoading(false);
    }
  };

  const handleSuccessfulLogin = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    // Double check session is valid
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData?.session) {
      toast.error('جلسة المصادقة غير صالحة');
      setIsLoading(false);
      return;
    }

    if (!user) {
      toast.error('حدث خطأ أثناء تسجيل الدخول - لم يتم العثور على بيانات المستخدم');
      setIsLoading(false);
      return;
    }
    
    // 🎯 التوجيه المحسن: /dashboard مباشرة لجميع المستخدمين
    console.log('🎯 [Auth] Direct dashboard redirect for all users');
    
    toast.success('تم تسجيل الدخول بنجاح');
    
    // Clear any stored data before redirecting
    sessionStorage.removeItem('redirectAfterLogin');
    localStorage.removeItem('loginRedirectCount');
    
    // التوجيه المباشر إلى /dashboard بدون أي تعقيدات
    let dashboardPath = '/dashboard';
    
    if (redirectPath) {
      if (redirectPath.includes('/dashbord')) {
        dashboardPath = redirectPath.replace('/dashbord', '/dashboard');
      } else {
        dashboardPath = redirectPath;
      }
    }
    
    // Clear redirect path
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('redirectAfterLogin');
      }
    } catch (error) {
      // Silent fail
    }

    setTimeout(() => {
      setIsLoading(false);
      navigate(dashboardPath);
    }, 500);
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
