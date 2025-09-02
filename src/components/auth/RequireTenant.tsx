import { useEffect, useState, useRef } from 'react';
import { Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, AlertCircle, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type RequireTenantProps = {
  children?: React.ReactNode;
};

/**
 * مكون للتحقق من وجود مؤسسة وتوجيه المستخدم لإنشاء مؤسسة إذا لم تكن موجودة
 * أو التحقق من وجود النطاق الفرعي
 */
const RequireTenant = ({ children }: RequireTenantProps) => {
  const { currentOrganization, isLoading, error, refreshOrganizationData } = useTenant();
  const { currentSubdomain, organization, user, userProfile, isLoadingProfile, isLoadingOrganization } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [retryCount, setRetryCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [waitingForOrgData, setWaitingForOrgData] = useState(true);
  const [forceReload, setForceReload] = useState(0);
  const loginTimeRef = useRef(Date.now()); // تسجيل وقت بدء التحميل مرة واحدة فقط

  // انتظار مختصر في البداية للسماح لـ TenantContext بالتحميل - محسن لتسجيل الدخول الأول
  useEffect(() => {
    const timer = setTimeout(() => {
      setWaitingForOrgData(false);
    }, 300); // زيادة قليلاً لضمان التحميل الكامل

    return () => clearTimeout(timer);
  }, []);

  // فحص ما إذا كان المسار يتطلب مؤسسة
  const requiresOrganization = location.pathname.startsWith('/dashboard') ||
                              location.pathname.startsWith('/pos') ||
                              location.pathname.startsWith('/call-center');

  // حساب الوقت المنقضي منذ تسجيل الدخول
  const timeSinceLogin = Date.now() - loginTimeRef.current;
  const hasWaitedTooLong = timeSinceLogin > 3000; // 3 ثوانٍ
  const hasWaitedReasonably = timeSinceLogin > 1500; // 1.5 ثانية - وقت معقول للتحميل

  // ⚡ تحسين: مراقبة التزامن بين AuthContext و TenantContext - محسن لتسجيل الدخول الأول
  useEffect(() => {
    // إذا كانت المؤسسة متاحة في AuthContext لكن ليس في TenantContext
    if (organization && !currentOrganization && !isLoading && !waitingForOrgData && requiresOrganization) {
      if (import.meta.env.DEV) {
      }

      // إذا مر وقت طويل، نعطي TenantProvider فرصة أخيرة للتحديث
      if (hasWaitedTooLong && retryCount < 2) {
        setForceReload(prev => prev + 1);
        setRetryCount(prev => prev + 1);
      }
      // لا نحتاج لإرسال حدث إضافي - TenantProvider سيتعامل مع المؤسسة من AuthContext
    }
  }, [organization, currentOrganization, isLoading, waitingForOrgData, requiresOrganization, retryCount, timeSinceLogin, hasWaitedTooLong]);

  // ⚡ تحسين: إذا كانت المؤسسة متاحة من AuthContext، لا نحتاج لانتظار TenantContext
  const hasAuthOrganization = !!organization;
  const hasAuthUser = !!user;
  const hasAuthUserProfile = !!userProfile;
  const isAuthLoading = isLoadingProfile || isLoadingOrganization;

  // تسريع التحقق - إذا كان لدينا organization من AuthContext وننتظر TenantContext
  const canProceedEarly = (organization && !currentOrganization && (waitingForOrgData || hasWaitedReasonably)) ||
                         (hasAuthOrganization && hasAuthUser && hasAuthUserProfile && !isAuthLoading);

  const canSkipLoading = (hasAuthOrganization && hasAuthUser && hasAuthUserProfile && !isAuthLoading) && !requiresOrganization;

  // تحسين: السماح بالمتابعة إذا مر وقت طويل والمؤسسة متاحة في AuthContext أو إذا كان TenantProvider يحتاج وقت إضافي
  const shouldAllowProceed = canProceedEarly ||
                           (hasWaitedTooLong && organization && requiresOrganization) ||
                           (organization && !currentOrganization && hasWaitedReasonably && requiresOrganization);

  // التحقق من وجود مؤسسة في أي من السياقين - مع الأولوية لـ AuthContext
  const hasOrganization = organization || currentOrganization;

  // تشخيص شامل لـ RequireTenant - محسن لتسجيل الدخول الأول
  if (import.meta.env.DEV) {
  }

  // محاولة إعادة تحميل بيانات المؤسسة
  const handleRetryLoadOrganization = async () => {
    if (isRefreshing || retryCount >= 3) return;
    
    setIsRefreshing(true);
    try {
      await refreshOrganizationData();
      setRetryCount(prev => prev + 1);
    } catch (error) {
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // في حالة وجود خطأ في تحميل بيانات المؤسسة
    if (error && !isLoading && requiresOrganization && !waitingForOrgData) {
      
      // محاولة إعادة تحميل البيانات مرة واحدة فقط
      if (retryCount === 0) {
        handleRetryLoadOrganization();
      }
    }
  }, [error, isLoading, requiresOrganization, retryCount, waitingForOrgData]);

  // في حالة جاري تحميل بيانات المؤسسة أو فترة الانتظار (إلا إذا كان يمكن المتابعة مبكراً أو تخطي التحميل)
  if ((isLoading || isRefreshing || waitingForOrgData) && !shouldAllowProceed && !canSkipLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
        <p className="text-muted-foreground">
          {isRefreshing ? 'جاري إعادة تحميل بيانات المؤسسة...' :
           waitingForOrgData ? 'جاري تحميل البيانات...' :
           'جاري تحميل بيانات المؤسسة...'}
        </p>
      </div>
    );
  }

  // إذا كان هناك نطاق فرعي ولكن لا توجد مؤسسة مرتبطة به
  if (currentSubdomain && !currentOrganization) {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.endsWith('localhost');
    
    if (isLocalhost && requiresOrganization) {
      return <Navigate to="/organization/setup" replace />;
    }
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Card className="p-6 max-w-md">
          <CardHeader>
            <CardTitle className="text-center">نطاق فرعي غير صالح</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              النطاق الفرعي "{currentSubdomain}" غير مرتبط بأي مؤسسة أو غير متاح حالياً.
            </p>
            <a 
              href={`${window.location.protocol}//${window.location.hostname.split('.').slice(1).join('.')}`}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              العودة للصفحة الرئيسية
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  // إذا لم تكن هناك مؤسسة والمسار يتطلب مؤسسة (مع مراعاة shouldAllowProceed)
  if (!hasOrganization && requiresOrganization && !shouldAllowProceed) {
    // تحقق من وجود المستخدم وإذا كان مسجل حديثاً
    if (user && userProfile) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Building className="mx-auto h-12 w-12 text-primary mb-4" />
              <CardTitle>إعداد المؤسسة مطلوب</CardTitle>
              <CardDescription>
                مرحباً {userProfile.name || user.email}! لم نجد مؤسسة مرتبطة بحسابك.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                يبدو أن عملية إنشاء المؤسسة لم تكتمل أثناء التسجيل. 
                يمكنك إنشاء مؤسسة جديدة أو المحاولة مرة أخرى.
              </p>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => navigate('/organization/setup')}
                  className="w-full"
                >
                  إنشاء مؤسسة جديدة
                </Button>
                
                {retryCount < 3 && (
                  <Button 
                    variant="outline" 
                    onClick={handleRetryLoadOrganization}
                    disabled={isRefreshing}
                    className="w-full"
                  >
                    {isRefreshing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        جاري المحاولة...
                      </>
                    ) : (
                      <>
                        <AlertCircle className="mr-2 h-4 w-4" />
                        إعادة تحميل البيانات
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive text-center">
                    خطأ: {error.toString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // إذا لم يكن هناك مستخدم، توجيه لتسجيل الدخول
    return <Navigate to="/login" replace />;
  }

  // Render children if provided, otherwise render Outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
};

export default RequireTenant;
