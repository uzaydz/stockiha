import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { checkUserRequires2FA } from '@/lib/api/security';
import TwoFactorLoginForm from './TwoFactorLoginForm';

const LoginForm = () => {
  const { signIn, currentSubdomain } = useAuth();
  const navigate = useNavigate();
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
        if (!email) setEmail('admin@bazaar.com');
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
        const publicDomains = ['ktobi.online', 'stockiha.com', 'bazaar.com', 'bazaar.dev'];
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

      if (!twoFactorCheck.userExists) {
        // محاولة 2: إذا لم يجد المستخدم مع organizationId، جرب بدون organizationId
        if (organizationId) {
          localStorage.removeItem('bazaar_organization_id'); // امسح organizationId الخاطئ
          twoFactorCheck = await checkUserRequires2FA(email, undefined, domain, subdomain);
          
          if (!twoFactorCheck.userExists) {
            // محاولة 3: جرب كنطاق عام (بدون أي معاملات نطاق)
            twoFactorCheck = await checkUserRequires2FA(email, undefined, undefined, undefined);
          }
        } else {
          // محاولة 2 بديلة: جرب كنطاق عام إذا لم يكن هناك organizationId من الأساس
          twoFactorCheck = await checkUserRequires2FA(email, undefined, undefined, undefined);
        }
      }

      // إذا فشلت جميع المحاولات
      if (!twoFactorCheck.userExists) {
        if (twoFactorCheck.error) {
          toast.error(twoFactorCheck.error);
        } else {
          toast.error('المستخدم غير موجود');
        }
        setIsLoading(false);
        return;
      }

      // حفظ معرف المؤسسة الصحيح إذا وُجد
      if (twoFactorCheck.organizationId) {
        localStorage.setItem('bazaar_organization_id', twoFactorCheck.organizationId);
      }

      if (twoFactorCheck.requires2FA) {
        // المستخدم يحتاج للمصادقة الثنائية
        setTwoFactorData({
          userId: twoFactorCheck.userId!,
          userName: twoFactorCheck.userName || 'المستخدم',
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
      const { success, error } = await signIn(loginEmail, loginPassword);

      if (success) {
        // Add an even longer delay to ensure authentication state is properly updated in context
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // بعد تسجيل الدخول، نتحقق إذا كان المستخدم مسؤول متعدد النطاقات
        await handleSuccessfulLogin();
      } else {
        toast.error(`فشل تسجيل الدخول: ${error?.message || 'يرجى التحقق من بيانات الاعتماد الخاصة بك'}`);
        setIsLoading(false);
      }
    } catch (error) {
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
    
    if (user && user.user_metadata.isTenant) {
      
      // الحصول على المؤسسة المرتبطة بالمستخدم
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!userError && userData?.organization_id) {
        // الحصول على النطاق الفرعي للمؤسسة
        
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('subdomain')
          .eq('id', userData.organization_id)
          .single();

        if (!orgError && orgData?.subdomain) {
          // إعادة توجيه المستخدم إلى النطاق الفرعي الخاص به
          const hostname = window.location.hostname;

          // Check if we are already on the correct subdomain
          let currentSubdomain = null;

          // Detect subdomain in any format (works for both example.localhost and example.domain.com)
          if (hostname.includes('.')) {
            const parts = hostname.split('.');
            // For localhost (example.localhost)
            if (parts.length > 1 && parts[parts.length-1] === 'localhost') {
              currentSubdomain = parts[0];
            }
            // For production (example.domain.com)
            else if (parts.length > 2) {
              currentSubdomain = parts[0];
            }
          }

          // If already on the correct subdomain, just navigate to appropriate dashboard
          if (currentSubdomain === orgData.subdomain) {
            
            toast.success('تم تسجيل الدخول بنجاح');
            
            // استخدام RoleBasedRedirect لتحديد المسار المناسب
            let dashboardPath = '/redirect';
            
            if (redirectPath) {
              // Fix any typos in the path
              if (redirectPath.includes('/dashbord')) {
                dashboardPath = redirectPath.replace('/dashbord', '/dashboard');
              } else {
                // استخدام المسار المطلوب إذا كان صحيحاً
                dashboardPath = redirectPath;
              }
            }
            
            // Clear the redirect path from storage to prevent future issues
            try {
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem('redirectAfterLogin');
              }
            } catch (error) {
            }

            setTimeout(() => {
              setIsLoading(false);
              navigate(dashboardPath);
            }, 500);
            return;
          }
          
          // للتعامل مع عناوين محلية (localhost أو IP مثل 127.0.0.1)
          const isLocalhostDomain = hostname === 'localhost' || hostname.endsWith('.localhost');
          
          if (isLocalhostDomain && orgData.subdomain) {

              // الحصول على دور المستخدم لتحديد الصفحة المناسبة
              const { data: userProfile } = await supabase
                .from('users')
                .select('role')
                .eq('auth_user_id', user.id)
                .single();
              
              let targetPath = '/dashboard';
              if (userProfile?.role === 'call_center_agent') {
                targetPath = '/call-center/dashboard';
              }
              
              // التوجيه إلى النطاق الفرعي مع localhost مع نقل الجلسة
              const { redirectWithSession, generateSubdomainUrl } = await import('@/lib/cross-domain-auth');
              const targetUrl = generateSubdomainUrl(orgData.subdomain, targetPath);

              setTimeout(() => {
                setIsLoading(false);
                redirectWithSession(targetUrl, sessionData.session);
              }, 500);
              return;  // إضافة return هنا
          } else if (hostname.match(/^127\.\d+\.\d+\.\d+$/) || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {

            // الحصول على دور المستخدم لتحديد الصفحة المناسبة
            const { data: userProfile } = await supabase
              .from('users')
              .select('role')
              .eq('auth_user_id', user.id)
              .single();
            
            let targetPath = '/dashboard';
            if (userProfile?.role === 'call_center_agent') {
              targetPath = '/call-center/dashboard';
            }
            
            // استخدام localhost بدلاً من IP للتوجيه إلى النطاق الفرعي مع نقل الجلسة
            const { redirectWithSession, generateSubdomainUrl } = await import('@/lib/cross-domain-auth');
            const targetUrl = generateSubdomainUrl(orgData.subdomain, targetPath);

            setTimeout(() => {
              setIsLoading(false);
              redirectWithSession(targetUrl, sessionData.session);
            }, 500);
          } else {
            // للعناوين الأخرى، التحقق من النطاقات المدعومة للنطاقات الفرعية
            const supportedDomainsForSubdomains = ['ktobi.online', 'stockiha.com', 'bazaar.com', 'bazaar.dev'];
            let shouldRedirectToSubdomain = false;
            let baseDomain = '';
            
            // تحديد النطاق الأساسي
            for (const domain of supportedDomainsForSubdomains) {
              if (hostname === domain || hostname === `www.${domain}`) {
                shouldRedirectToSubdomain = true;
                baseDomain = domain;
                break;
              }
            }
            
            if (shouldRedirectToSubdomain && orgData.subdomain && baseDomain) {

              // الحصول على دور المستخدم لتحديد الصفحة المناسبة
              const { data: userProfile } = await supabase
                .from('users')
                .select('role')
                .eq('auth_user_id', user.id)
                .single();
              
              let targetPath = '/dashboard';
              if (userProfile?.role === 'call_center_agent') {
                targetPath = '/call-center/dashboard';
              }

              // التوجيه إلى النطاق الفرعي مع نقل الجلسة
              const { redirectWithSession, generateSubdomainUrl } = await import('@/lib/cross-domain-auth');
              const targetUrl = generateSubdomainUrl(orgData.subdomain, targetPath);

              setTimeout(() => {
                setIsLoading(false);
                redirectWithSession(targetUrl, sessionData.session);
              }, 500);
            } else {
              // للعناوين الأخرى، نوجه المستخدم مباشرة إلى لوحة التحكم في نفس العنوان

              // التوجيه مباشرة إلى لوحة التحكم في نفس العنوان
              setTimeout(() => {
                setIsLoading(false);
                navigate('/dashboard');
              }, 500);
            }
          }
          return;
        }
      }
    } else {
    }
    
    // إذا وصلنا إلى هنا، فإننا نتعامل مع مستخدم عادي، أو أننا بالفعل في النطاق الفرعي الصحيح
    
    toast.success('تم تسجيل الدخول بنجاح');
    
    // Clear any stored data before redirecting
    sessionStorage.removeItem('redirectAfterLogin');
    localStorage.removeItem('loginRedirectCount');
    
    // الحصول على دور المستخدم لتحديد الصفحة المناسبة
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();
    
    let defaultPath = '/dashboard';
    
    // تحديد المسار الافتراضي حسب دور المستخدم
    if (userProfile?.role) {
      switch (userProfile.role) {
        case 'call_center_agent':
          defaultPath = '/call-center/dashboard';
          break;
        case 'admin':
        case 'owner':
          defaultPath = '/dashboard';
          break;
        case 'employee':
          defaultPath = '/pos';
          break;
        case 'customer':
          defaultPath = '/shop';
          break;
        default:
          defaultPath = '/dashboard';
      }
    }
    
    // Check if we have a saved redirect path
    if (redirectPath) {

      // Fix any typos in the path
      let finalPath = redirectPath;
      if (redirectPath.includes('/dashbord')) {
        finalPath = redirectPath.replace('/dashbord', '/dashboard');
      }
      
      // التحقق من أن المسار آمن ومناسب لدور المستخدم
      if (userProfile?.role === 'call_center_agent') {
        // وكلاء مركز الاتصال يجب أن يذهبوا لواجهتهم فقط
        if (!finalPath.startsWith('/call-center')) {
          finalPath = defaultPath;
        }
      } else if (!finalPath.startsWith('/dashboard') && !finalPath.startsWith('/profile') && !finalPath.startsWith('/pos')) {
        finalPath = defaultPath;
      }
      
      setTimeout(() => {
        setIsLoading(false);
        navigate(finalPath);
      }, 500);
    } else {
      setTimeout(() => {
        setIsLoading(false);
        navigate(defaultPath);
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
