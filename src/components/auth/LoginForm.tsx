import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const LoginForm = () => {
  const { signIn, currentSubdomain } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);

  // التحقق إذا كنا في بيئة Electron
  useEffect(() => {
    const checkElectron = () => {
      const isElectronApp = !!(window as any).electronAPI || !!(window as any).__ELECTRON_APP__;
      console.log('Executed in Electron environment:', isElectronApp);
      setIsElectron(isElectronApp);

      // في Electron، نضع قيم افتراضية للتطبيق
      if (isElectronApp) {
        if (!email) setEmail('admin@bazaar.com');
        if (!password) setPassword('password123');
      }
    };

    checkElectron();
  }, []);

  console.log('LoginForm init - currentSubdomain:', currentSubdomain);
  
  // Get redirect path on component mount
  useEffect(() => {
    const savedRedirectPath = sessionStorage.getItem('redirectAfterLogin');
    if (savedRedirectPath) {
      console.log('Found saved redirect path:', savedRedirectPath);
      setRedirectPath(savedRedirectPath);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log('Login attempt - Email:', email);
    
    // Clear any previous error states or redirect counts
    sessionStorage.removeItem('lastLoginRedirect');
    sessionStorage.setItem('loginRedirectCount', '0');

    try {
      console.log('Calling signIn function...');
      const { success, error } = await signIn(email, password);
      console.log('Login result - Success:', success, 'Error:', error);
      
      if (success) {
        // Add an even longer delay to ensure authentication state is properly updated in context
        console.log('Login successful, waiting for auth state to update');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // بعد تسجيل الدخول، نتحقق إذا كان المستخدم مسؤول متعدد النطاقات
        console.log('Login successful, checking user metadata');
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        console.log('User data after login:', user);
        
        // Double check session is valid
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('Session after login:', sessionData.session);
        
        if (!user) {
          console.error('User logged in but user object is missing');
          toast.error('حدث خطأ أثناء تسجيل الدخول - لم يتم العثور على بيانات المستخدم');
          setIsLoading(false);
          return;
        }
        
        if (user && user.user_metadata.isTenant) {
          console.log('User is a tenant, fetching organization info');
          // الحصول على المؤسسة المرتبطة بالمستخدم
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();
          
          console.log('User data fetch result:', userData, 'Error:', userError);
          
          if (!userError && userData?.organization_id) {
            // الحصول على النطاق الفرعي للمؤسسة
            console.log('Fetching organization subdomain for ID:', userData.organization_id);
            const { data: orgData, error: orgError } = await supabase
              .from('organizations')
              .select('subdomain')
              .eq('id', userData.organization_id)
              .single();
              
            console.log('Organization data:', orgData, 'Error:', orgError);
              
            if (!orgError && orgData?.subdomain) {
              // إعادة توجيه المستخدم إلى النطاق الفرعي الخاص به
              const hostname = window.location.hostname;
              console.log('Redirecting user to subdomain, hostname:', hostname);
              
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
              
              console.log('Current detected subdomain:', currentSubdomain, 'Target subdomain:', orgData.subdomain);
              
              // If already on the correct subdomain, just navigate to dashboard
              if (currentSubdomain === orgData.subdomain) {
                console.log('Already on the correct subdomain, redirecting to dashboard');
                toast.success('تم تسجيل الدخول بنجاح');
                
                // Explicitly check the dashboard path to avoid typos
                let dashboardPath = '/dashboard';
                if (redirectPath) {
                  // Fix any typos in the path
                  if (redirectPath.includes('/dashbord')) {
                    dashboardPath = redirectPath.replace('/dashbord', '/dashboard');
                    console.log('Correcting dashboard spelling in redirect path:', dashboardPath);
                  } else {
                    dashboardPath = redirectPath;
                  }
                }
                
                // Clear the redirect path from storage to prevent future issues
                sessionStorage.removeItem('redirectAfterLogin');
                
                console.log('Final navigation path:', dashboardPath);
                setTimeout(() => {
                  setIsLoading(false);
                  navigate(dashboardPath);
                }, 500);
                return;
              }
              
              // For any hostname that includes localhost
              if (hostname.includes('localhost')) {
                toast.success('تم تسجيل الدخول بنجاح، سيتم توجيهك للوحة التحكم');
                // Use subdomain.localhost format instead of query parameters
                console.log('Redirecting to subdomain URL:', `${window.location.protocol}//${orgData.subdomain}.localhost:${window.location.port}/dashboard`);
                
                // Clear any stored data before redirecting
                sessionStorage.removeItem('redirectAfterLogin');
                localStorage.removeItem('loginRedirectCount');
                
                // Try using window.location.replace instead of href for a cleaner transition
                setTimeout(() => {
                  setIsLoading(false);
                  window.location.replace(`${window.location.protocol}//${orgData.subdomain}.localhost:${window.location.port}/dashboard`);
                }, 500);
                return;
              }
              
              // في الإنتاج، قم بتوجيه المستخدم إلى النطاق الفرعي الخاص به
              const domainParts = hostname.split('.');
              const domain = domainParts.length > 2 ? domainParts.slice(1).join('.') : hostname;
              
              console.log('Redirecting to production subdomain URL:', `${window.location.protocol}//${orgData.subdomain}.${domain}/dashboard`);
              window.location.href = `${window.location.protocol}//${orgData.subdomain}.${domain}/dashboard`;
              return;
            }
          }
        }
        
        // إذا وصلنا إلى هنا، فإننا نتعامل مع مستخدم عادي، أو أننا بالفعل في النطاق الفرعي الصحيح
        console.log('Regular user or already in correct subdomain, redirecting to dashboard');
        toast.success('تم تسجيل الدخول بنجاح');
        
        // Clear any stored data before redirecting
        sessionStorage.removeItem('redirectAfterLogin');
        localStorage.removeItem('loginRedirectCount');
        
        // Check if we have a saved redirect path
        if (redirectPath) {
          console.log('Redirecting to saved path:', redirectPath);
          
          // Fix any typos in the path
          let finalPath = redirectPath;
          if (redirectPath.includes('/dashbord')) {
            finalPath = redirectPath.replace('/dashbord', '/dashboard');
            console.log('Correcting dashboard spelling in redirect path:', finalPath);
          }
          
          // Double check that we're redirecting to a safe path
          if (!finalPath.startsWith('/dashboard') && !finalPath.startsWith('/profile')) {
            finalPath = '/dashboard';
            console.log('Invalid redirect path, defaulting to dashboard');
          }
          
          setTimeout(() => {
            setIsLoading(false);
            navigate(finalPath);
          }, 500);
        } else {
          setTimeout(() => {
            setIsLoading(false);
            navigate('/dashboard');
          }, 500);
        }
      } else {
        console.error('Login failed:', error?.message);
        toast.error(`فشل تسجيل الدخول: ${error?.message || 'يرجى التحقق من بيانات الاعتماد الخاصة بك'}`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('حدث خطأ أثناء تسجيل الدخول');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">تسجيل الدخول</CardTitle>
        <CardDescription className="text-center">
          قم بتسجيل الدخول للوصول إلى حسابك
          {currentSubdomain && (
            <div className="mt-2 text-primary font-medium">
              مستخدم النطاق {currentSubdomain}
            </div>
          )}
          {isElectron && (
            <div className="mt-2 text-green-500 font-medium">
              تطبيق Electron - نسخة سطح المكتب
            </div>
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
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-center text-sm text-muted-foreground">
          <p>للانضمام كموظف، يرجى التواصل مع مسؤول المؤسسة ليقوم بإضافتك</p>
        </div>
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
