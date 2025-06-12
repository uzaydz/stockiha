import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAuthPersistence } from '@/hooks/useAuthPersistence';
import { isUserAdmin } from '@/lib/api/admin';
import { getCurrentUserProfile } from '@/lib/api/users';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import { 
  refreshCache, 
  getCachedPermissions, 
  hasCachedPermissions,
  cachePermissions
} from '@/lib/PermissionsCache';

type ProtectedRouteProps = {
  children?: ReactNode;
  requireAdmin?: boolean;
  allowedRoles?: UserRole[];
};

const ProtectedRoute = ({ 
  children, 
  requireAdmin = false,
  allowedRoles = []
}: ProtectedRouteProps) => {
  const { user, loading, session, currentSubdomain } = useAuth();
  const { wasRecentlyAuthenticated, isAuthenticated, isLoading } = useAuthPersistence();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [checkingPermissions, setCheckingPermissions] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [authCheckAttempts, setAuthCheckAttempts] = useState(0);
  const [permissionsCached, setPermissionsCached] = useState(false);
  const [hasDelayedCheck, setHasDelayedCheck] = useState(false);

  console.log('🔍 [ProtectedRoute] حالة المصادقة:', {
    hasUser: !!user,
    hasSession: !!session,
    loading,
    isAuthenticated,
    wasRecentlyAuthenticated,
    pathname: location.pathname,
    hasDelayedCheck
  });

  useEffect(() => {
    // عند تغيير المسار، تحقق من وجود تخزين مؤقت للتحقق السابق
    if (hasCachedPermissions()) {
      refreshCache(); // تحديث وقت انتهاء الصلاحية
      setPermissionsCached(true);
      setInitialCheckDone(true);
      
      // استخراج المعلومات من التخزين المؤقت
      const cachedData = getCachedPermissions();
      if (cachedData) {
        // تعيين حالة المسؤول من التخزين المؤقت
        const isAdminFromCache = 
          cachedData.is_super_admin === true || 
          cachedData.user_metadata?.is_super_admin === true ||
          cachedData.app_metadata?.is_super_admin === true ||
          cachedData.role === 'admin';
          
        if (isAdminFromCache) {
          setIsAdmin(true);
        }
        
        // تعيين دور المستخدم من التخزين المؤقت
        const roleFromCache = 
          cachedData.role || 
          cachedData.user_metadata?.role || 
          cachedData.app_metadata?.role;
          
        if (roleFromCache) {
          setUserRole(roleFromCache as UserRole);
        }
      }
    } else {
      setPermissionsCached(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const checkUserPermissions = async () => {
      // تخطي التحقق إذا كانت المعلومات مخزنة مؤقتًا
      if (permissionsCached) {
        
        return;
      }

      if (user) {
        setCheckingPermissions(true);
        try {
          // التحقق من حالة المسؤول إذا كان مطلوباً
          if (requireAdmin) {
            const admin = await isUserAdmin(user.id);
            setIsAdmin(admin);
          }
          
          // جلب معلومات المستخدم للتحقق من الدور إذا كانت هناك أدوار محددة
          if (allowedRoles.length > 0) {
            const userProfile = await getCurrentUserProfile();
            if (userProfile) {
              setUserRole(userProfile.role as UserRole);
              
              // تخزين معلومات المستخدم في التخزين المؤقت
              cachePermissions({
                ...user,
                role: userProfile.role,
                permissions: userProfile.permissions
              });
            }
          }
          
        } catch (error) {
          setIsAdmin(false);
        } finally {
          setCheckingPermissions(false);
          setInitialCheckDone(true);
        }
      } else {
        // If there's no user, we can consider the check done
        if (!loading) {
          
          setInitialCheckDone(true);
        }
      }
    };

    // Only run the check if we're not in a loading state and don't have cached permissions
    if (!loading && !permissionsCached) {
      checkUserPermissions();
    } else if (permissionsCached) {
      // إذا كانت المعلومات مخزنة مؤقتًا، اعتبر التحقق منتهيًا
      setInitialCheckDone(true);
    }
    
    // Add a safety check to prevent infinite loading
    const timeout = setTimeout(() => {
      if (!initialCheckDone && authCheckAttempts < 3) {
        
        setAuthCheckAttempts(prev => prev + 1);
        setInitialCheckDone(true);
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [user, requireAdmin, allowedRoles, loading, authCheckAttempts, permissionsCached]);

  // Check if URL has a typo (dashbord instead of dashboard)
  useEffect(() => {
    const currentUrl = window.location.href;
    
    // This regex will match 'dashbord' when it's not part of another word
    if (/\/dashbord($|\/|\?)/.test(currentUrl)) {
      
      const correctedUrl = currentUrl.replace(/\/dashbord($|\/|\?)/, '/dashboard$1');
      
      window.location.replace(correctedUrl);
      return;
    }
  }, [location.pathname]);

  // Add additional check to verify authentication status directly from supabase
  useEffect(() => {
    const verifyAuthState = async () => {
      if (!user && !loading && initialCheckDone) {
        
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            
            window.location.reload();
          } else {
            
          }
        } catch (error) {
        }
      }
    };
    
    // Only run this check after the initial authentication check is complete
    if (initialCheckDone) {
      verifyAuthState();
    }
  }, [user, loading, initialCheckDone]);

  // إضافة تأخير قصير قبل إعادة التوجيه لإعطاء فرصة لاستعادة الجلسة
  useEffect(() => {
    if (!hasDelayedCheck && !loading && !isLoading) {
      // فحص وجود بيانات محفوظة في localStorage
      const hasSavedAuthState = (() => {
        try {
          const savedState = localStorage.getItem('bazaar_auth_state');
          if (!savedState) return false;
          
          const authState = JSON.parse(savedState);
          const expiresAt = authState.session?.expires_at;
          
          // التحقق من انتهاء صلاحية التوكن
          if (expiresAt) {
            const expirationTime = expiresAt * 1000;
            const now = Date.now();
            const bufferTime = 5 * 60 * 1000; // 5 دقائق buffer
            
            if (now >= (expirationTime - bufferTime)) {
              return false; // منتهي الصلاحية
            }
          }
          
          return true; // البيانات صالحة
        } catch {
          return false;
        }
      })();
      
      // تحديد وقت التأخير بناءً على الحالة
      let delayTime = 500; // افتراضي
      
      if (hasSavedAuthState) {
        delayTime = 4000; // 4 ثوانِ للبيانات المحفوظة الصالحة
      } else if (wasRecentlyAuthenticated) {
        delayTime = 2500; // 2.5 ثانية إذا كان مصادقاً مؤخراً
      }
      
      console.log('⏰ [ProtectedRoute] تعيين تأخير:', {
        delayTime,
        hasSavedAuthState,
        wasRecentlyAuthenticated
      });
      
      const timer = setTimeout(() => {
        setHasDelayedCheck(true);
      }, delayTime);
      
      return () => clearTimeout(timer);
    }
  }, [loading, isLoading, hasDelayedCheck, wasRecentlyAuthenticated]);

  // إذا كنا لا نزال نتحقق من حالة المصادقة، أظهر شاشة التحميل
  // تحسين: فقط عرض التحميل للحالات الضرورية وتجنب التعليق عند تحميل بيانات المستخدم
  if ((loading && !user) || (isLoading && !isAuthenticated) || (!hasDelayedCheck && !isAuthenticated && !user)) {
    console.log('🔄 [ProtectedRoute] عرض شاشة التحميل محسّنة');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">
            {user ? 'جاري إعداد بيانات المستخدم...' : 
             wasRecentlyAuthenticated ? 'استعادة جلسة المصادقة...' : 'جاري التحقق من تسجيل الدخول...'}
          </p>
          {user && (
            <p className="text-sm text-muted-foreground mt-2">
              المستخدم: {user.email}
            </p>
          )}
        </div>
      </div>
    );
  }

  // التحقق من المصادقة بعد انتهاء فترة التأخير
  if (hasDelayedCheck && !isAuthenticated) {
    console.log('❌ [ProtectedRoute] المستخدم غير مصادق بعد التأخير - إعادة توجيه لتسجيل الدخول');

    // Don't redirect if we're already on the login page to prevent loops
    if (location.pathname === '/login') {
      console.log('📍 [ProtectedRoute] المستخدم على صفحة تسجيل الدخول بالفعل');
      return children ? <>{children}</> : <Outlet />;
    }
    
    // Force clear any existing authentication data if present
    if (localStorage.getItem('authSessionExists')) {
      
      localStorage.removeItem('authSessionExists');
      localStorage.removeItem('authSessionLastUpdated');
      // Force reload to clear any invalid session data
      if (location.pathname.includes('/dashboard')) {
        window.location.href = '/login?force=true';
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg">إعادة توجيه إلى صفحة تسجيل الدخول...</p>
            </div>
          </div>
        );
      }
    }
    
    // Add a check to make sure we're not stuck in a loop
    const lastRedirectTime = sessionStorage.getItem('lastLoginRedirect');
    const currentTime = new Date().getTime();
    const redirectCount = parseInt(sessionStorage.getItem('loginRedirectCount') || '0');
    
    if (lastRedirectTime && (currentTime - parseInt(lastRedirectTime)) < 3000 && redirectCount > 3) {
      
      sessionStorage.removeItem('lastLoginRedirect');
      sessionStorage.setItem('loginRedirectCount', '0');
      
      // Show error instead of redirecting again
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md p-8 bg-destructive/10 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-destructive">خطأ في المصادقة</h2>
            <p className="mb-4">حدثت مشكلة أثناء المصادقة. يرجى محاولة تسجيل الخروج وتسجيل الدخول مرة أخرى.</p>
            <a href="/login?force=true" className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
              العودة إلى صفحة تسجيل الدخول
            </a>
          </div>
        </div>
      );
    }
    
    // Store the current time to detect loops
    sessionStorage.setItem('lastLoginRedirect', currentTime.toString());
    sessionStorage.setItem('loginRedirectCount', (redirectCount + 1).toString());
    
    // Store the current location to redirect back after login
    const currentPath = location.pathname + location.search + location.hash;
    sessionStorage.setItem('redirectAfterLogin', currentPath);
    
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // إذا كان المسار يتطلب أن يكون المستخدم مسؤولاً ولكنه ليس كذلك
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }
  
  // إذا كان هناك أدوار محددة وليس لدى المستخدم الدور المطلوب
  if (allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  // المستخدم مسجل دخوله ولديه الصلاحيات المطلوبة
  
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
