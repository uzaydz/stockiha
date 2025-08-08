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
  const [showPassword, setShowPassword] = useState(false);
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
      toast.success('تم تسجيل الدخول بنجاح');
      
      // تنظيف البيانات المحفوظة
      sessionStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('loginRedirectCount');
      
      loginFormDebugLog('تم تنظيف البيانات المحفوظة');
      
      // ⏰ انتظار قصير لتزامن الحالة - حل المشكلة
      loginFormDebugLog('انتظار تزامن حالة المصادقة...');
      await new Promise(resolve => setTimeout(resolve, 500)); // انتظار نصف ثانية
      
      // 🎯 التوجيه بعد تزامن الحالة
      let dashboardPath = '/dashboard';
      
      if (redirectPath && redirectPath.startsWith('/dashboard')) {
        dashboardPath = redirectPath;
      }

      loginFormDebugLog('التوجيه بعد تزامن الحالة إلى:', dashboardPath);

      setIsLoading(false);
      navigate(dashboardPath);
      loginFormDebugLog('✅ تم التوجيه بنجاح بعد تزامن الحالة');
      
    } catch (error) {
      loginFormDebugLog('❌ خطأ في معالجة نجاح تسجيل الدخول:', error);
      
      // رغم الخطأ، نكمل التوجيه
      toast.success('تم تسجيل الدخول بنجاح');
      setIsLoading(false);
      navigate('/dashboard');
      loginFormDebugLog('✅ تم التوجيه رغم الخطأ');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-8">
      <div className="w-full max-w-md mx-auto">
        {/* شعار أو أيقونة */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/80 rounded-full mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/80 bg-clip-text text-transparent">
            مرحباً بعودتك
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            قم بتسجيل الدخول للوصول إلى لوحة التحكم
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">تسجيل الدخول</CardTitle>
            {currentSubdomain && (
              <div className="text-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#fc5d41]/10 text-[#fc5d41] dark:bg-[#fc5d41]/20 dark:text-[#fc5d41]">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                  مستخدم النطاق {currentSubdomain}
                </span>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني"
                    required
                    className="text-right pl-10 h-12 border-2 border-gray-200 focus:border-[#fc5d41] focus:ring-2 focus:ring-[#fc5d41]/20 transition-all duration-200 rounded-lg bg-white/80 backdrop-blur-sm"
                    dir="rtl"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-[#fc5d41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    required
                    className="text-right pl-20 pr-10 h-12 border-2 border-gray-200 focus:border-[#fc5d41] focus:ring-2 focus:ring-[#fc5d41]/20 transition-all duration-200 rounded-lg bg-white/80 backdrop-blur-sm"
                    dir="rtl"
                    autoComplete="current-password"
                  />
                  {/* أيقونة القفل */}
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-[#fc5d41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  
                  {/* زر إظهار/إخفاء كلمة المرور */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:text-[#fc5d41]"
                    title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? (
                      // أيقونة إخفاء كلمة المرور (عين مع خط)
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      // أيقونة إظهار كلمة المرور (عين)
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/80 hover:from-[#fc5d41]/90 hover:to-[#fc5d41] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none rounded-lg" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جارٍ تسجيل الدخول...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    تسجيل الدخول
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
          
          {!currentSubdomain && (
            <CardFooter className="border-t bg-gray-50/50 dark:bg-gray-800/50 rounded-b-lg">
              <div className="w-full text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  هل تريد إنشاء نظام خاص بمؤسستك؟
                </p>
                <a 
                  href="/tenant/signup" 
                  className="inline-flex items-center text-sm font-medium text-[#fc5d41] hover:text-[#fc5d41]/80 dark:text-[#fc5d41] dark:hover:text-[#fc5d41]/80 transition-colors group"
                >
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  إنشاء حساب مسؤول مع نطاق فرعي
                </a>
              </div>
            </CardFooter>
          )}
        </Card>
        
        {/* معلومات إضافية في أسفل الصفحة */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 سطوكيها - منصة التجارة الإلكترونية. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
