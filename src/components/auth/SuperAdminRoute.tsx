import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { shouldBlockRouteInElectron } from '@/lib/utils/electronSecurity';

/**
 * Protected route component that ensures the user is a super admin
 * Redirects to login page if not authenticated
 * Redirects to dashboard if authenticated but not a super admin
 */
const CACHE_TTL_MS = 10 * 1000; // 10 seconds cache window - reduced for security
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity timeout
const SESSION_WARNING_MS = 25 * 60 * 1000; // Show warning 5 minutes before timeout

export default function SuperAdminRoute() {
  const { user, session, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const lastCheckedUserId = useRef<string | null>(null);
  const superAdminCache = useRef<{ [userId: string]: { status: boolean; timestamp: number } }>({});
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityTime = useRef<number>(Date.now());
  const sessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningShownRef = useRef<boolean>(false);

  const clearPendingTimeout = () => {
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
  };

  const clearSessionTimeout = () => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
  };

  const handleSessionExpiry = useCallback(async () => {
    clearSessionTimeout();

    toast({
      variant: 'destructive',
      title: 'انتهت الجلسة',
      description: 'تم تسجيل خروجك تلقائياً بسبب عدم النشاط لمدة 30 دقيقة',
    });

    // Sign out user
    await supabase.auth.signOut();

    // Redirect to login
    window.location.href = '/super-admin/login';
  }, [toast]);

  const resetSessionTimeout = useCallback(() => {
    clearSessionTimeout();
    warningShownRef.current = false;
    lastActivityTime.current = Date.now();

    // Set timeout for session expiry
    sessionTimeoutRef.current = setTimeout(() => {
      handleSessionExpiry();
    }, SESSION_TIMEOUT_MS);

    // Set timeout for warning
    setTimeout(() => {
      const timeSinceLastActivity = Date.now() - lastActivityTime.current;
      if (timeSinceLastActivity >= SESSION_WARNING_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        toast({
          variant: 'default',
          title: 'تحذير: الجلسة على وشك الانتهاء',
          description: 'ستنتهي جلستك خلال 5 دقائق بسبب عدم النشاط. قم بأي نشاط للحفاظ على جلستك نشطة.',
          duration: 10000,
        });
      }
    }, SESSION_WARNING_MS);
  }, [handleSessionExpiry, toast]);

  // Session timeout management - track user activity
  useEffect(() => {
    if (!user || !isSuperAdmin) {
      clearSessionTimeout();
      return;
    }

    // Initialize session timeout
    resetSessionTimeout();

    // Activity event handlers
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => {
      resetSessionTimeout();
    };

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      clearSessionTimeout();
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [user, isSuperAdmin, resetSessionTimeout]);

  // ===== Electron Security: Block Super Admin access in desktop app =====
  useEffect(() => {
    if (shouldBlockRouteInElectron(location.pathname)) {
      console.warn('[Electron Security] محاولة الوصول إلى لوحة السوبر أدمين من تطبيق سطح المكتب');

      toast({
        variant: 'destructive',
        title: 'وصول محظور',
        description: 'لوحة السوبر أدمين متاحة فقط عبر المتصفح الويب',
        duration: 5000,
      });

      // Redirect to home
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate, toast]);

  // إضافة logging للتشخيص
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
    }
  }, [user, session, userProfile, location]);

  const checkSuperAdminStatus = useCallback(async (force = false) => {
    clearPendingTimeout();
    setAuthError(false);

    if (!user) {
      setIsSuperAdmin(false);
      setDebugInfo('لا يوجد مستخدم نشط');
      pendingTimeoutRef.current = setTimeout(() => {
        if (!user) {
          setIsLoading(false);
          setAuthError(true);
        }
      }, 400);
      return;
    }

    const now = Date.now();
    const cached = superAdminCache.current[user.id];
    if (!force && cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      setIsSuperAdmin(cached.status);
      setIsLoading(false);
      setDebugInfo('تم استخدام الحالة المخزنة مؤقتاً');
      lastCheckedUserId.current = user.id;
      return;
    }

    // Avoid parallel fetches for the same user unless forced.
    if (!force && lastCheckedUserId.current === user.id && !cached) {
      return;
    }

    setIsLoading(true);
    lastCheckedUserId.current = user.id;

    try {
      setDebugInfo('جاري التحقق من الصلاحيات من الخادم...');

      const { data, error } = await supabase
        .rpc('get_user_basic_info' as any, { p_auth_user_id: user.id });

      if (error) {
        console.error('[SuperAdminRoute] خطأ في التحقق من الصلاحيات:', error);
        setIsSuperAdmin(false);
        setDebugInfo(`خطأ في التحقق: ${error.message}`);
        setAuthError(true);
        superAdminCache.current[user.id] = {
          status: false,
          timestamp: now,
        };
      } else if (data && data.length > 0) {
        const userData = data[0] as any;
        const isSuper = userData.is_super_admin === true;
        setIsSuperAdmin(isSuper);
        setAuthError(!isSuper);
        setDebugInfo('تم التأكد من الصلاحيات مباشرة من الخادم');

        superAdminCache.current[user.id] = {
          status: isSuper,
          timestamp: Date.now(),
        };

        if (process.env.NODE_ENV === 'development') {
          console.log('[SuperAdminRoute] صلاحيات المستخدم:', {
            isSuperAdmin: isSuper,
            userId: user.id,
            email: userData.email,
          });
        }
      } else {
        setIsSuperAdmin(false);
        setDebugInfo('لم يتم العثور على بيانات المستخدم');
        setAuthError(true);
        superAdminCache.current[user.id] = {
          status: false,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.error('[SuperAdminRoute] خطأ غير متوقع:', error);
      setIsSuperAdmin(false);
      setDebugInfo(`خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ مجهول'}`);
      setAuthError(true);
      superAdminCache.current[user.id] = {
        status: false,
        timestamp: Date.now(),
      };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkSuperAdminStatus();
    return () => clearPendingTimeout();
  }, [user?.id, checkSuperAdminStatus]);

  useEffect(() => {
    // Re-validate on route changes within the super admin area.
    if (location.pathname.startsWith('/super-admin')) {
      checkSuperAdminStatus(true);
    }
  }, [location.pathname, checkSuperAdminStatus]);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      superAdminCache.current = {};
      lastCheckedUserId.current = null;
      checkSuperAdminStatus(true);
    });

    return () => {
      clearPendingTimeout();
      clearSessionTimeout();
      subscription?.subscription.unsubscribe();
    };
  }, [checkSuperAdminStatus]);

  // تنظيف الكاش عند تغيير المستخدم
  useEffect(() => {
    if (!user) {
      superAdminCache.current = {};
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">التحقق من صلاحيات الوصول...</p>
          {debugInfo && (
            <p className="mt-2 text-sm text-gray-500">{debugInfo}</p>
          )}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-gray-400 text-center">
              <p>User: {user?.id || 'N/A'}</p>
              <p>Session: {session ? 'Yes' : 'No'}</p>
              <p>UserProfile: {userProfile ? 'Yes' : 'No'}</p>
              <p>AuthError: {authError ? 'Yes' : 'No'}</p>
              <p>isSuperAdmin: {isSuperAdmin ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    if (process.env.NODE_ENV === 'development') {
    }

    // ✅ تقليل وقت الانتظار - إذا لم يكن هناك user بعد isLoading = false، وجّه مباشرة
    if (!isLoading) {
      // Not logged in - redirect to super admin login immediately
      return <Navigate to="/super-admin/login" state={{ from: location }} replace />;
    }

    // If still loading, show loading state briefly
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">جاري تهيئة المصادقة...</p>
          <p className="mt-2 text-sm text-gray-500">يرجى الانتظار</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    // If logged in but not a super admin, show access denied message
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl text-red-500 mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ممنوع الوصول</h1>
          <p className="text-gray-600 mb-4">ليس لديك صلاحيات للوصول إلى لوحة Super Admin</p>
          {debugInfo && (
            <p className="text-sm text-gray-500 mb-4">{debugInfo}</p>
          )}
          <div className="space-x-2 space-x-reverse">
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 ml-2"
            >
              إعادة المحاولة
            </button>
            <button
              onClick={() => {
                try {
                  const isElectron = typeof window !== 'undefined' && window.navigator?.userAgent?.includes('Electron');
                  if (isElectron) {
                    window.location.hash = '#/dashboard';
                  } else {
                    window.location.href = '/dashboard';
                  }
                } catch {
                  window.location.href = '/dashboard';
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              العودة إلى لوحة التحكم
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-gray-400 text-left">
              <p>User ID: {user?.id}</p>
              <p>User Email: {user?.email}</p>
              <p>UserProfile: {userProfile ? 'Loaded' : 'Not Loaded'}</p>
              <p>Session: {session ? 'Active' : 'Inactive'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If super admin, render the protected routes
  return <Outlet />;
}
