import { ReactNode, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isCallCenterAgent } from '@/lib/api/permissions';

// Define a simple loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-lg text-foreground">جارٍ تحميل البيانات...</p>
      <p className="text-sm text-muted-foreground mt-2">
        الرجاء الانتظار...
      </p>
    </div>
  </div>
);

type ProtectedRouteProps = {
  children?: ReactNode;
  allowedRoles?: string[]; // الأدوار المسموحة
  redirectBasedOnRole?: boolean; // إعادة التوجيه حسب الدور
};

const ProtectedRoute = ({ 
  children, 
  allowedRoles, 
  redirectBasedOnRole = false 
}: ProtectedRouteProps) => {
  const { user, userProfile, isLoading } = useAuth();
  const location = useLocation();
  const [hasWaited, setHasWaited] = useState(false);
  
  // معرفة ما إذا كانت هذه زيارة مباشرة (refresh أو URL مباشر)
  const isDirectVisit = !location.state || performance.navigation.type === 1;

  // تشخيص شامل
  if (import.meta.env.DEV) {
    console.log('🔍 ProtectedRoute العام:', {
      currentPath: location.pathname,
      user: user ? 'موجود' : 'غير موجود',
      userProfile: userProfile ? { role: userProfile.role, id: userProfile.id } : 'غير موجود',
      isLoading,
      hasWaited,
      isDirectVisit,
      redirectBasedOnRole,
      allowedRoles,
      navigationState: location.state,
      navigationType: performance.navigation.type
    });
  }

  // إضافة timeout قصير لتجنب الفلاش السريع لشاشة التحميل
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasWaited(true);
    }, 300); // انتظار أطول قليلاً لضمان تحميل البيانات المحفوظة

    return () => clearTimeout(timer);
  }, []);

  // عرض شاشة التحميل فقط إذا كان isLoading صحيح وانتظرنا قليلاً
  if (isLoading && hasWaited) {
    return <LoadingSpinner />;
  }

  // إذا لم ننتظ بعد، لا نعرض شيئاً (تجنب الفلاش)
  if (isLoading && !hasWaited) {
    return null;
  }

  // إذا انتهى التحميل ولم يكن هناك مستخدم، إعادة توجيه لتسجيل الدخول
  if (!isLoading && (!user || !userProfile)) {
    if (import.meta.env.DEV) {
      console.log('🚨 ProtectedRoute: إعادة توجيه لتسجيل الدخول - لا يوجد مستخدم', {
        currentPath: location.pathname,
        user: user ? 'موجود' : 'غير موجود',
        userProfile: userProfile ? 'موجود' : 'غير موجود',
        isLoading
      });
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // التحقق من الأدوار المسموحة
  if (allowedRoles && allowedRoles.length > 0 && userProfile) {
    const userRole = userProfile.role;
    if (!allowedRoles.includes(userRole)) {
      if (import.meta.env.DEV) {
        console.log('🚨 ProtectedRoute: إعادة توجيه - دور غير مسموح', {
          currentPath: location.pathname,
          userRole,
          allowedRoles,
          targetPath: userRole === 'admin' || userRole === 'owner' ? '/dashboard' : 
                      userRole === 'call_center_agent' ? '/call-center' :
                      userRole === 'employee' ? '/pos' : 
                      userRole === 'customer' ? '/shop' : '/unauthorized'
        });
      }
      
      // إعادة توجيه حسب دور المستخدم
      switch (userRole) {
        case 'call_center_agent':
          return <Navigate to="/call-center" replace />;
        case 'admin':
        case 'owner':
          return <Navigate to="/dashboard" replace />;
        case 'employee':
          return <Navigate to="/pos" replace />;
        case 'customer':
          return <Navigate to="/shop" replace />;
        default:
          return <Navigate to="/unauthorized" replace />;
      }
    }
  }

  // إعادة التوجيه التلقائي حسب الدور إذا كان مطلوباً
  if (redirectBasedOnRole && userProfile) {
    console.log('🔄 ProtectedRoute: بدء فحص redirectBasedOnRole');
  } else if (import.meta.env.DEV) {
    console.log('🔄 ProtectedRoute: تخطي redirectBasedOnRole', { redirectBasedOnRole, userProfile: !!userProfile });
  }
  
  if (redirectBasedOnRole && userProfile) {
    const userRole = userProfile.role;
    const currentPath = location.pathname;

    // تجنب إعادة التوجيه اللانهائي - فقط من الصفحة الرئيسية أو صفحة تسجيل الدخول
    // ولا نعيد التوجيه إذا كان المستخدم في مسار صالح بالفعل
    const isRootOrLoginPath = currentPath === '/login' || currentPath === '/' || currentPath === '';
    const isAlreadyInCorrectPath = 
      (userRole === 'call_center_agent' && currentPath.startsWith('/call-center')) ||
      ((userRole === 'admin' || userRole === 'owner') && currentPath.startsWith('/dashboard')) ||
      (userRole === 'employee' && (currentPath.startsWith('/pos') || currentPath.startsWith('/dashboard'))) ||
      (userRole === 'customer' && currentPath.startsWith('/shop'));

    // لا نعيد التوجيه إذا كان المستخدم يحدث الصفحة في مكان صالح
    const shouldNotRedirectOnRefresh = isDirectVisit && isAlreadyInCorrectPath;

    if (import.meta.env.DEV) {
      console.log('🔍 ProtectedRoute Debug:', {
        userRole,
        currentPath,
        isRootOrLoginPath,
        isAlreadyInCorrectPath,
        shouldNotRedirectOnRefresh,
        isDirectVisit,
        redirectBasedOnRole
      });
    }

    if (isRootOrLoginPath && !isAlreadyInCorrectPath && !shouldNotRedirectOnRefresh) {
      if (import.meta.env.DEV) {
        console.log('📍 ProtectedRoute redirecting based on role:', userRole);
      }
      
      switch (userRole) {
        case 'call_center_agent':
          return <Navigate to="/call-center/dashboard" replace />;
        case 'admin':
        case 'owner':
          return <Navigate to="/dashboard" replace />;
        case 'employee':
          return <Navigate to="/pos" replace />;
        case 'customer':
          return <Navigate to="/shop" replace />;
        default:
          break;
      }
    }
  }

  // إعادة توجيه تلقائية لوكلاء مركز الاتصال إذا حاولوا الوصول لصفحات غير مخصصة لهم
  if (userProfile) {
    const userRole = userProfile.role;
    const currentPath = location.pathname;
    const isCallCenterAgent = Boolean(userProfile.call_center_agent_id) || userRole === 'call_center_agent';
    
    if (import.meta.env.DEV) {
      console.log('🔍 ProtectedRoute: فحص وكيل مركز الاتصال', {
        currentPath,
        userRole,
        isCallCenterAgent,
        call_center_agent_id: userProfile.call_center_agent_id
      });
    }
    
    if (isCallCenterAgent) {
      // إذا كان وكيل مركز اتصال يحاول الوصول لصفحات الأدمين أو POS
      // لكن استثناء: إذا كان موظف عادي في نقطة البيع، لا تعيد التوجيه
      const isEmployeeInPOS = userRole === 'employee' && currentPath.startsWith('/pos');
      
      if ((currentPath.startsWith('/dashboard') || currentPath.startsWith('/pos')) && !isEmployeeInPOS) {
        if (import.meta.env.DEV) {
          console.log('🚨 ProtectedRoute: إعادة توجيه وكيل مركز اتصال من صفحة غير مسموحة', {
            currentPath,
            userRole,
            isCallCenterAgent,
            call_center_agent_id: userProfile.call_center_agent_id,
            isEmployeeInPOS
          });
        }
        return <Navigate to="/call-center/dashboard" replace />;
      }
    }
  }

  // If children are provided, render them. Otherwise, render the nested routes.
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
