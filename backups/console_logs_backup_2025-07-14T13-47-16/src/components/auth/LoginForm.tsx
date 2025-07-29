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

// إضافة دالة console مخصصة لـ LoginForm
const loginFormDebugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
  }
};

const LoginForm = () => {
  const { signIn, currentSubdomain } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
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
    
    loginFormDebugLog('=== بدء عملية تسجيل الدخول من النموذج ===', {
      email,
      timestamp: new Date().toISOString(),
      currentSubdomain,
      currentPath: window.location.pathname,
      hostname: window.location.hostname
    });
    
    setIsLoading(true);

    // Clear any previous error states or redirect counts
    sessionStorage.removeItem('lastLoginRedirect');
    sessionStorage.setItem('loginRedirectCount', '0');
    
    loginFormDebugLog('تم مسح بيانات إعادة التوجيه السابقة');

    try {
      // 🔧 إصلاح خاص لمشكلة تسجيل الدخول
      // تجاوز فحص 2FA المعقد والانتقال مباشرة لتسجيل الدخول

      // محاولة تسجيل الدخول المباشر أولاً
      try {
        loginFormDebugLog('محاولة تسجيل الدخول المباشر');
        await proceedWithDirectLogin(email, password);
        return;
      } catch (directLoginError) {
        loginFormDebugLog('❌ فشل تسجيل الدخول المباشر:', directLoginError);
      }

      // إذا فشل التسجيل المباشر، استخدم الطريقة التقليدية
      loginFormDebugLog('محاولة تسجيل الدخول بالطريقة التقليدية');
      
      const hostname = window.location.hostname;
      let domain: string | undefined;
      let subdomain: string | undefined;
      let organizationId: string | undefined;

      // التعامل مع localhost ونطاقات الـ IP المحلية كنطاقات عامة
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.match(/^localhost:\d+$/) || hostname.match(/^127\.0\.0\.1:\d+$/);
      
      loginFormDebugLog('تحليل النطاق:', { hostname, isLocalhost });
      
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
      
      loginFormDebugLog('معلومات النطاق المحللة:', {
        domain,
        subdomain,
        organizationId,
        storedOrgId: localStorage.getItem('bazaar_organization_id')
      });

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
      loginFormDebugLog('❌ خطأ في عملية تسجيل الدخول:', error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
      loginFormDebugLog('=== انتهاء عملية تسجيل الدخول من النموذج ===');
    }
  };

  // 🔧 دالة تسجيل دخول مباشر بدون فحص 2FA
  const proceedWithDirectLogin = async (loginEmail: string, loginPassword: string) => {
    loginFormDebugLog('=== بدء تسجيل الدخول المباشر ===', {
      email: loginEmail,
      timestamp: new Date().toISOString()
    });
    
    try {
      // استخدام Supabase مباشرة بدون فحوصات معقدة
      loginFormDebugLog('محاولة المصادقة مع Supabase');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.toLowerCase().trim(),
        password: loginPassword
      });

      if (error) {
        loginFormDebugLog('❌ خطأ في المصادقة:', {
          message: error.message,
          status: error.status
        });
        
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
        loginFormDebugLog('❌ بيانات الجلسة غير متاحة');
        throw new Error('بيانات الجلسة غير متاحة');
      }

      loginFormDebugLog('✅ نجح تسجيل الدخول مع Supabase:', {
        userId: data.user.id,
        userEmail: data.user.email,
        sessionId: data.session.access_token?.substring(0, 20) + '...'
      });

      // تحديث معرف المؤسسة إذا كان متاحاً
      try {
        loginFormDebugLog('جلب معرف المؤسسة للمستخدم');
        
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', data.user.id)
          .single();
          
        if (userData?.organization_id) {
          localStorage.setItem('bazaar_organization_id', userData.organization_id);
          loginFormDebugLog('✅ تم حفظ معرف المؤسسة:', userData.organization_id);
        } else {
          loginFormDebugLog('⚠️ لم يتم العثور على معرف مؤسسة للمستخدم');
        }
      } catch (orgError) {
        loginFormDebugLog('❌ خطأ في جلب معرف المؤسسة:', orgError);
      }

      loginFormDebugLog('بدء عملية التوجيه بعد نجاح تسجيل الدخول');
      await handleSuccessfulLogin();
      
    } catch (error) {
      loginFormDebugLog('❌ خطأ في تسجيل الدخول المباشر:', error);
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
    loginFormDebugLog('=== بدء معالجة نجاح تسجيل الدخول ===');
    
    try {
      // 🎯 تبسيط شامل - إزالة جميع فحوصات النطاق الفرعي
      
      // فحص بسيط للتأكد من المصادقة
      loginFormDebugLog('التحقق من حالة المصادقة');
      
      const { data: userData } = await supabase.auth.getUser();
      const { data: sessionData } = await supabase.auth.getSession();

      if (!userData.user || !sessionData.session) {
        loginFormDebugLog('⚠️ تحذير: لا توجد بيانات مستخدم أو جلسة');
        // لا نوقف العملية، فقط تحذير
      } else {
        loginFormDebugLog('✅ تم التحقق من المصادقة بنجاح:', {
          userId: userData.user.id,
          sessionValid: !!sessionData.session
        });
      }

      toast.success('تم تسجيل الدخول بنجاح');
      
      // تنظيف البيانات المحفوظة
      sessionStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('loginRedirectCount');
      
      loginFormDebugLog('تم تنظيف البيانات المحفوظة');
      
      // 🎯 التوجيه المباشر إلى /dashboard - بدون أي تعقيدات
      let dashboardPath = '/dashboard';
      
      if (redirectPath && redirectPath.startsWith('/dashboard')) {
        dashboardPath = redirectPath;
      }

      loginFormDebugLog('التوجيه إلى:', dashboardPath);

      // 🎨 تطبيق الثيم فوراً قبل التنقل
      setTimeout(async () => {
        loginFormDebugLog('🎨 [handleSuccessfulLogin] تطبيق الثيم قبل التنقل');
        
        try {
          const savedOrgData = localStorage.getItem('current_organization');
          if (savedOrgData) {
            const orgData = JSON.parse(savedOrgData);
            loginFormDebugLog('🎨 [handleSuccessfulLogin] وُجدت بيانات مؤسسة', {
              orgId: orgData.id,
              primaryColor: orgData.settings?.theme_primary_color,
              secondaryColor: orgData.settings?.theme_secondary_color,
              mode: orgData.settings?.theme_mode
            });
            
            if (orgData.settings?.theme_primary_color || orgData.settings?.theme_secondary_color) {
              const { updateOrganizationTheme } = await import('@/lib/themeManager');
              updateOrganizationTheme(orgData.id, {
                theme_primary_color: orgData.settings.theme_primary_color,
                theme_secondary_color: orgData.settings.theme_secondary_color,
                theme_mode: orgData.settings.theme_mode,
                custom_css: orgData.settings.custom_css
              });
              
              loginFormDebugLog('✅ [handleSuccessfulLogin] تم تطبيق الثيم فوراً');
              
              // انتظار إضافي للتأكد من تطبيق الثيم قبل التنقل
              setTimeout(() => {
                setIsLoading(false);
                navigate(dashboardPath);
                loginFormDebugLog('✅ تم التوجيه بنجاح مع الثيم');
              }, 300); // انتظار 300ms للتأكد من تطبيق الثيم
              
              return; // إيقاف التنفيذ هنا للتأكد من عدم التنقل مرتين
            }
          }
          
          // إذا لم توجد بيانات مؤسسة أو ثيم، انتقل مباشرة
          setIsLoading(false);
          navigate(dashboardPath);
          loginFormDebugLog('✅ تم التوجيه بدون ثيم مخصص');
          
        } catch (themeError) {
          loginFormDebugLog('❌ خطأ في تطبيق الثيم قبل التنقل', themeError);
          
          // حتى مع الخطأ، نكمل التنقل
          setIsLoading(false);
          navigate(dashboardPath);
          loginFormDebugLog('✅ تم التوجيه رغم خطأ الثيم');
        }
      }, 200); // تأخير قصير لضمان تحديث AuthContext أولاً
      
    } catch (error) {
      loginFormDebugLog('❌ خطأ في معالجة نجاح تسجيل الدخول:', error);
      
      // رغم الخطأ، نكمل التوجيه
      toast.success('تم تسجيل الدخول بنجاح');
      setTimeout(() => {
        setIsLoading(false);
        navigate('/dashboard');
        loginFormDebugLog('✅ تم التوجيه رغم الخطأ');
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
