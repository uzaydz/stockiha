import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isUserAdmin } from '@/lib/api/admin';
import { getCurrentUserProfile } from '@/lib/api/users';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabase';

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
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [checkingPermissions, setCheckingPermissions] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [authCheckAttempts, setAuthCheckAttempts] = useState(0);

  console.log(`ProtectedRoute initialization - Path: ${location.pathname}, Loading: ${loading}, User: ${!!user}, Session: ${!!session}, Subdomain: ${currentSubdomain}`);

  useEffect(() => {
    const checkUserPermissions = async () => {
      console.log(`Checking user permissions - User: ${!!user}, Loading: ${loading}, Attempts: ${authCheckAttempts}`);
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
            }
          }
          console.log("User permission check completed successfully");
        } catch (error) {
          console.error('Error checking user permissions:', error);
          setIsAdmin(false);
        } finally {
          setCheckingPermissions(false);
          setInitialCheckDone(true);
        }
      } else {
        // If there's no user, we can consider the check done
        if (!loading) {
          console.log("No user found and not loading, marking initial check as done");
          setInitialCheckDone(true);
        }
      }
    };

    // Only run the check if we're not in a loading state
    if (!loading) {
      checkUserPermissions();
    }
    
    // Add a safety check to prevent infinite loading
    const timeout = setTimeout(() => {
      if (!initialCheckDone && authCheckAttempts < 3) {
        console.log("Permission check timeout - forcing status update");
        setAuthCheckAttempts(prev => prev + 1);
        setInitialCheckDone(true);
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [user, requireAdmin, allowedRoles, loading, authCheckAttempts]);

  // Check if URL has a typo (dashbord instead of dashboard)
  useEffect(() => {
    const currentUrl = window.location.href;
    
    // This regex will match 'dashbord' when it's not part of another word
    if (/\/dashbord($|\/|\?)/.test(currentUrl)) {
      console.log("Detected incorrect dashboard URL path:", currentUrl);
      const correctedUrl = currentUrl.replace(/\/dashbord($|\/|\?)/, '/dashboard$1');
      console.log("Correcting to:", correctedUrl);
      window.location.replace(correctedUrl);
      return;
    }
  }, [location.pathname]);

  // Add additional check to verify authentication status directly from supabase
  useEffect(() => {
    const verifyAuthState = async () => {
      if (!user && !loading && initialCheckDone) {
        console.log("Verifying auth state directly with Supabase");
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            console.log("Session found in Supabase but not in context, forcing reload");
            window.location.reload();
          } else {
            console.log("No session found in direct Supabase check either");
          }
        } catch (error) {
          console.error("Error verifying auth state:", error);
        }
      }
    };
    
    // Only run this check after the initial authentication check is complete
    if (initialCheckDone) {
      verifyAuthState();
    }
  }, [user, loading, initialCheckDone]);

  // إذا كنا لا نزال نتحقق من حالة المصادقة، أظهر شاشة التحميل
  // Only show loading if we haven't completed the initial check or we're still checking permissions
  // تعديل: عرض التحميل فقط إذا كان التحميل الأولي جارياً أو فقد المستخدم
  if ((loading && !initialCheckDone) || (!user && loading)) {
    console.log("ProtectedRoute initial loading - loading:", loading, "initialCheckDone:", initialCheckDone, "user:", !!user);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Double check both user and session to confirm authentication
  if (!user || !session) {
    console.log("User not authenticated, redirecting to login - user:", !!user, "session:", !!session, "path:", location.pathname);
    
    // Don't redirect if we're already on the login page to prevent loops
    if (location.pathname === '/login') {
      console.log("Already on login page, not redirecting to prevent loop");
      return children ? <>{children}</> : <Outlet />;
    }
    
    // Force clear any existing authentication data if present
    if (localStorage.getItem('authSessionExists')) {
      console.log("Clearing stale authentication data");
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
      console.log("Multiple redirects detected in short time, preventing loop");
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
  console.log("User is authenticated and has permissions, rendering protected content for path:", location.pathname);
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute; 